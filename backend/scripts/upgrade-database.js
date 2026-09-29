const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const databaseName = String(process.env.DB_NAME || '').trim();
const databasePort = Number(process.env.DB_PORT || 5432);

const assertConfiguration = () => {
  if (!databaseName || !process.env.DB_HOST || !process.env.DB_USER ||
      !Number.isInteger(databasePort) || databasePort < 1 || databasePort > 65535) {
    throw new Error('กรุณาตั้ง DB_HOST, DB_PORT, DB_USER และ DB_NAME ใน backend/.env ให้ถูกต้องก่อน');
  }
  if (['postgres', 'template0', 'template1'].includes(databaseName.toLowerCase())) {
    throw new Error('DB_NAME ต้องเป็นฐานข้อมูล Petclinic ไม่ใช่ฐานข้อมูลระบบของ PostgreSQL');
  }
};

const getSchemaState = async (client) => {
  const { rows } = await client.query(`
    SELECT
      to_regclass('public.tb_user') IS NOT NULL AS has_users,
      to_regclass('public.tb_receipt') IS NOT NULL AS has_receipts,
      to_regclass('public.tb_receipt_payment_event') IS NOT NULL AS has_payment_events,
      to_regclass('public.idx_receipt_payment_event_receipt_time') IS NOT NULL AS has_payment_event_index,
      to_regclass('public.uq_tb_user_email_verification_token') IS NOT NULL AS has_email_token_index,
      (SELECT COUNT(*)::int FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'tb_user'
         AND column_name IN ('email_verified_at', 'email_verification_token_hash',
                             'email_verification_expires_at', 'email_verification_sent_at')) AS email_column_count,
      (SELECT column_default IS NOT NULL FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'tb_user'
         AND column_name = 'email_verified_at') AS has_email_verified_default
  `);
  return rows[0];
};

const runMigration = async (client, fileName) => {
  const filePath = path.resolve(__dirname, '..', '..', 'database', fileName);
  const sql = fs.readFileSync(filePath, 'utf8');
  try {
    await client.query(sql);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw new Error(`${fileName}: ${error.message}`);
  }
};

const main = async () => {
  assertConfiguration();
  const client = new Client({
    host: process.env.DB_HOST,
    port: databasePort,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || undefined,
    database: databaseName,
    connectionTimeoutMillis: 5000,
    application_name: 'petclinic-db-upgrade'
  });

  await client.connect();
  let locked = false;
  try {
    const { rows } = await client.query('SELECT current_database() AS name');
    if (rows[0]?.name !== databaseName) throw new Error('ฐานข้อมูลที่เชื่อมต่อไม่ตรงกับ DB_NAME');
    console.log(`กำลังตรวจฐานข้อมูล: ${databaseName}`);

    await client.query("SELECT pg_advisory_lock(hashtext('petclinic-db-upgrade'))");
    locked = true;
    let state = await getSchemaState(client);
    if (!state.has_users || !state.has_receipts) {
      throw new Error('ไม่พบตารางหลัก tb_user หรือ tb_receipt ในฐานข้อมูลนี้ จึงไม่อัปเดตอัตโนมัติ');
    }

    if (!state.has_payment_events || !state.has_payment_event_index) {
      await runMigration(client, 'add_receipt_payment_events.pgsql');
      console.log('เพิ่มโครงสร้างประวัติการชำระเงินแล้ว');
    } else {
      console.log('ประวัติการชำระเงินพร้อมใช้งานแล้ว');
    }

    state = await getSchemaState(client);
    if (state.email_column_count !== 4 || !state.has_email_token_index || !state.has_email_verified_default) {
      await runMigration(client, 'add_email_verification.pgsql');
      console.log('เพิ่มโครงสร้างยืนยันอีเมลแล้ว');
    } else {
      console.log('โครงสร้างยืนยันอีเมลพร้อมใช้งานแล้ว');
    }

    state = await getSchemaState(client);
    if (!state.has_payment_events || !state.has_payment_event_index ||
        state.email_column_count !== 4 || !state.has_email_token_index || !state.has_email_verified_default) {
      throw new Error('ตรวจโครงสร้างหลังอัปเดตไม่ผ่าน กรุณาตรวจฐานข้อมูลก่อนเปิด backend');
    }
    console.log('อัปเดตฐานข้อมูลสำเร็จ เปิด backend ได้');
  } finally {
    if (locked) await client.query("SELECT pg_advisory_unlock(hashtext('petclinic-db-upgrade'))").catch(() => {});
    await client.end();
  }
};

main().catch((error) => {
  console.error(`อัปเดตฐานข้อมูลไม่สำเร็จ: ${error.message}`);
  process.exitCode = 1;
});
