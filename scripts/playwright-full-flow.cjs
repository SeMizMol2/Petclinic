const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

require(path.join(__dirname, '..', 'backend', 'node_modules', 'dotenv')).config({
  path: path.join(__dirname, '..', 'backend', '.env')
});
const pool = require('../backend/src/database/db');
const bcrypt = require('../backend/node_modules/bcryptjs');

const APP_URL = process.env.E2E_APP_URL || 'http://127.0.0.1:5173';
const API_URL = process.env.E2E_API_URL || 'http://127.0.0.1:3000/api';
const BROWSER_PATH = process.env.PLAYWRIGHT_CHROMIUM_PATH
  || 'C:\\Users\\stamp\\AppData\\Local\\ms-playwright\\chromium-1228\\chrome-win64\\chrome.exe';

const runId = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const qa = {
  username: `e2e_${runId}`,
  email: `e2e_${runId}@example.com`,
  password: 'E2ePass123!',
  ownerName: `เจ้าของ E2E ${runId}`,
  petName: `แมว E2E ${runId}`,
  vetName: `สัตวแพทย์ E2E ${runId}`,
  serviceName: `ตรวจสุขภาพ E2E ${runId}`,
  expenseTitle: `ค่าใช้จ่าย E2E ${runId}`,
  categoryName: `หมวด E2E ${runId}`,
  vaccineName: `วัคซีน E2E ${runId}`,
  surgeryName: `ผ่าตัด E2E ${runId}`,
  scheduleNote: `ตารางเวร E2E ${runId}`,
  userId: null,
  ownerId: null,
  petId: null,
  vetId: null,
  serviceId: null,
  scheduleId: null,
  appointmentId: null,
  treatmentId: null,
  receiptId: null,
  vaccineId: null,
  surgeryId: null,
  categoryId: null,
  expenseId: null
};
qa.adminUsername = `e2e_admin_${runId}`;
qa.adminPassword = 'E2eAdmin123!';
qa.adminUserId = `EA${String(Date.now()).slice(-11)}`;

const results = [];
const browserIssues = [];
const captureDir = path.join(__dirname, '..', '.impeccable', 'review');
const capture = async (name, fullPage = true) => {
  if (process.env.E2E_CAPTURE_UI !== '1') return;
  fs.mkdirSync(captureDir, { recursive: true });
  await page.screenshot({ path: path.join(captureDir, name), fullPage });
};
let page;

const formatDateAfter = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
};

const record = (name, startedAt) => {
  const durationMs = Date.now() - startedAt;
  results.push({ name, status: 'PASS', durationMs });
  console.log(`PASS ${name} (${durationMs} ms)`);
};

const step = async (name, action) => {
  const startedAt = Date.now();
  try {
    await action();
    record(name, startedAt);
  } catch (error) {
    results.push({ name, status: 'FAIL', error: error.message });
    if (page) {
      await page.screenshot({
        path: path.join(__dirname, '..', 'tmp', 'playwright-full-flow-failure.png'),
        fullPage: true
      }).catch(() => {});
    }
    throw error;
  }
};

const api = async (method, endpoint, { token, body } = {}) => {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) {
    throw new Error(`${method} ${endpoint} returned ${response.status}: ${JSON.stringify(data)}`);
  }
  return data;
};

const expectBodyText = async (text) => {
  await page.getByText(text, { exact: false }).filter({ visible: true }).first().waitFor({ state: 'visible', timeout: 10000 });
};

const gotoAndExpect = async (route, marker) => {
  await page.goto(`${APP_URL}${route}`, { waitUntil: 'networkidle' });
  await expectBodyText(marker);
};

const clearSession = async () => {
  await page.goto(`${APP_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
};

const login = async (username, password, expectedPath) => {
  await clearSession();
  await page.getByLabel('ชื่อผู้ใช้').fill(username);
  await page.getByLabel('รหัสผ่าน').fill(password);
  await page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();
  await page.waitForURL((url) => url.pathname.startsWith(expectedPath), { timeout: 10000 });
  await page.waitForLoadState('networkidle').catch(() => {});
  return page.evaluate(() => localStorage.getItem('token'));
};

const cleanup = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userResult = await client.query(
      'SELECT user_id FROM tb_user WHERE username = $1 LIMIT 1',
      [qa.username]
    );
    qa.userId ||= userResult.rows[0]?.user_id || null;

    if (qa.userId) {
      const ownerResult = await client.query(
        'SELECT owner_id FROM tb_owner WHERE user_id = $1 LIMIT 1',
        [qa.userId]
      );
      qa.ownerId ||= ownerResult.rows[0]?.owner_id || null;
    }

    if (qa.ownerId) {
      const petResult = await client.query(
        'SELECT pet_id FROM tb_pet WHERE owner_id = $1 AND pet_name = $2 LIMIT 1',
        [qa.ownerId, qa.petName]
      );
      qa.petId ||= petResult.rows[0]?.pet_id || null;
    }

    if (qa.petId) {
      const receiptRows = await client.query(
        `SELECT r.receipt_id
         FROM tb_receipt r
         LEFT JOIN tb_treatment t ON r.treatment_id = t.treatment_id
         WHERE t.pet_id = $1 OR r.owner_id = $2`,
        [qa.petId, qa.ownerId]
      );
      const receiptIds = receiptRows.rows.map((row) => row.receipt_id);
      if (receiptIds.length > 0) {
        await client.query('DELETE FROM tb_receipt_detail WHERE receipt_id = ANY($1::varchar[])', [receiptIds]);
        await client.query('DELETE FROM tb_receipt WHERE receipt_id = ANY($1::varchar[])', [receiptIds]);
      }
      await client.query(
        'DELETE FROM tb_treatment_detail WHERE treatment_id IN (SELECT treatment_id FROM tb_treatment WHERE pet_id = $1)',
        [qa.petId]
      );
      await client.query('DELETE FROM tb_treatment WHERE pet_id = $1', [qa.petId]);
      await client.query('DELETE FROM tb_vaccine_rec WHERE pet_id = $1', [qa.petId]);
      await client.query('DELETE FROM tb_surgery WHERE pet_id = $1', [qa.petId]);
      await client.query('DELETE FROM tb_appointment WHERE pet_id = $1', [qa.petId]);
      await client.query('DELETE FROM tb_pet WHERE pet_id = $1', [qa.petId]);
    }

    if (qa.scheduleId) {
      await client.query('DELETE FROM tb_vet_schedule WHERE schedule_id = $1', [qa.scheduleId]);
    } else {
      await client.query('DELETE FROM tb_vet_schedule WHERE schedule_note = $1', [qa.scheduleNote]);
    }
    if (qa.vetId) await client.query('DELETE FROM tb_veterinarian WHERE vet_id = $1', [qa.vetId]);
    else await client.query('DELETE FROM tb_veterinarian WHERE vet_name = $1', [qa.vetName]);

    if (qa.expenseId) await client.query('DELETE FROM tb_expense WHERE exp_id = $1', [qa.expenseId]);
    else await client.query('DELETE FROM tb_expense WHERE exp_title = $1', [qa.expenseTitle]);
    if (qa.categoryId) await client.query('DELETE FROM tb_category WHERE category_id = $1', [qa.categoryId]);
    else await client.query('DELETE FROM tb_category WHERE category_name = $1', [qa.categoryName]);

    if (qa.serviceId) await client.query('DELETE FROM tb_service WHERE service_id = $1', [qa.serviceId]);
    else await client.query('DELETE FROM tb_service WHERE service_name = $1', [qa.serviceName]);

    if (qa.ownerId) await client.query('DELETE FROM tb_owner WHERE owner_id = $1', [qa.ownerId]);
    if (qa.userId) await client.query('DELETE FROM tb_user WHERE user_id = $1', [qa.userId]);
    await client.query('DELETE FROM tb_user WHERE user_id = $1 OR username = $2', [qa.adminUserId, qa.adminUsername]);

    await client.query('COMMIT');
    console.log('QA cleanup complete');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};

const main = async () => {
  const adminPasswordHash = await bcrypt.hash(qa.adminPassword, 10);
  await pool.query(
    `INSERT INTO tb_user (user_id, username, email, password, user_role)
     VALUES ($1, $2, $3, $4, 'admin')`,
    [qa.adminUserId, qa.adminUsername, `admin_${qa.email}`, adminPasswordHash]
  );

  const browser = await chromium.launch({ headless: true, executablePath: BROWSER_PATH });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  page = await context.newPage();
  page.on('dialog', (dialog) => dialog.accept().catch(() => {}));
  page.on('pageerror', (error) => browserIssues.push(`pageerror ${page.url()} :: ${error.message}`));
  page.on('requestfailed', (request) => {
    const reason = request.failure()?.errorText || 'failed';
    if (!reason.includes('ERR_ABORTED')) browserIssues.push(`requestfailed ${request.method()} ${request.url()} :: ${reason}`);
  });

  try {
    await step('public home page', async () => gotoAndExpect('/', 'โรงพยาบาลสัตว์เมืองเลย'));
    await step('unauthenticated admin route redirects to login', async () => {
      await clearSession();
      await page.goto(`${APP_URL}/admin/dashboard`);
      await page.waitForURL((url) => url.pathname === '/login');
    });

    await step('register new owner account', async () => {
      await page.goto(`${APP_URL}/register`, { waitUntil: 'networkidle' });
      await page.getByLabel('ชื่อผู้ใช้').fill(qa.username);
      await page.getByLabel('อีเมล').fill(qa.email);
      await page.getByLabel('รหัสผ่าน').fill(qa.password);
      await page.getByRole('button', { name: 'ลงทะเบียน' }).click();
      await page.waitForURL((url) => url.pathname === '/login');
    });

    await step('user login and role redirect', async () => {
      await login(qa.username, qa.password, '/user');
      assert.ok(page.url().includes('/user/profile'));
    });

    await step('user updates own profile', async () => {
      await gotoAndExpect('/user/profile', 'ข้อมูลส่วนตัว');
      await page.getByRole('button', { name: 'แก้ไขข้อมูล' }).click();
      const inputs = page.locator('.profile-details input');
      await inputs.nth(0).fill(qa.ownerName);
      await inputs.nth(1).fill(qa.email);
      await inputs.nth(2).fill('0812345678');
      await page.getByRole('button', { name: 'บันทึกข้อมูล' }).click();
      await expectBodyText(qa.ownerName);
    });

    await step('user creates pet', async () => {
      await gotoAndExpect('/user/pets/add', 'เพิ่มสัตว์เลี้ยงใหม่');
      await page.getByLabel('ชื่อสัตว์เลี้ยง').fill(qa.petName);
      await page.getByLabel('ประเภท').fill('แมว');
      await page.getByLabel('สายพันธุ์').fill('ไทย');
      await page.getByLabel('ลักษณะ/สี').fill('ขาวดำ');
      await page.getByLabel('เพศ').selectOption('เมีย');
      await page.getByLabel('สถานะการทำหมัน').selectOption('ยังไม่ทำ');
      await page.getByLabel('วันเกิด').fill('2024-01-15');
      await page.getByLabel('ประวัติแพ้ยา').fill('ไม่มี');
      await page.getByRole('button', { name: 'บันทึกข้อมูลสัตว์เลี้ยง' }).click();
      await page.waitForURL((url) => url.pathname === '/user/pets');
      await expectBodyText(qa.petName);
    });

    const identity = await pool.query(
      `SELECT u.user_id, o.owner_id, p.pet_id
       FROM tb_user u
       JOIN tb_owner o ON o.user_id = u.user_id
       JOIN tb_pet p ON p.owner_id = o.owner_id
       WHERE u.username = $1 AND p.pet_name = $2
       LIMIT 1`,
      [qa.username, qa.petName]
    );
    assert.equal(identity.rows.length, 1, 'UI-created user and pet were not persisted');
    qa.userId = identity.rows[0].user_id;
    qa.ownerId = identity.rows[0].owner_id;
    qa.petId = identity.rows[0].pet_id;

    await step('user pages load before clinic activity', async () => {
      await gotoAndExpect('/user/pets', qa.petName);
      await gotoAndExpect('/user/appointments', 'การนัดหมายของฉัน');
      await gotoAndExpect('/user/receipts', 'ประวัติการชำระเงิน');
    });

    let adminToken;
    await step('admin login and role redirect', async () => {
      adminToken = await login(qa.adminUsername, qa.adminPassword, '/admin');
      assert.ok(adminToken, 'Admin token was not stored after login');
      assert.ok(page.url().includes('/admin/dashboard'));
    });

    await step('admin creates veterinarian', async () => {
      await gotoAndExpect('/admin/veterinarians', 'จัดการสัตวแพทย์');
      await page.getByRole('button', { name: 'เพิ่มสัตวแพทย์' }).click();
      const modal = page.locator('.modal');
      await modal.getByLabel('ชื่อ-นามสกุล').fill(qa.vetName);
      await modal.getByLabel('เลขใบประกอบวิชาชีพ').fill(`LIC-${runId}`);
      await modal.getByLabel('เบอร์โทร').fill('0899999999');
      await modal.getByRole('button', { name: 'บันทึกข้อมูล' }).click();
      await expectBodyText(qa.vetName);
    });

    const vetResult = await pool.query('SELECT vet_id FROM tb_veterinarian WHERE vet_name = $1 LIMIT 1', [qa.vetName]);
    qa.vetId = vetResult.rows[0]?.vet_id;
    assert.ok(qa.vetId, 'Veterinarian created through UI was not found');

    await step('admin creates service', async () => {
      await gotoAndExpect('/admin/services', 'จัดการข้อมูลบริการและค่ารักษา');
      await page.getByRole('button', { name: /เพิ่มบริการใหม่/ }).click();
      const modal = page.locator('.custom-modal-box');
      await modal.getByPlaceholder(/ค่าตรวจสุขภาพเบื้องต้น/).fill(qa.serviceName);
      await modal.getByPlaceholder('0.00').fill('450');
      await modal.locator('select').nth(0).selectOption('แมว');
      await modal.locator('select').nth(1).selectOption('เมีย');
      await modal.getByPlaceholder(/เงื่อนไขหรือรายละเอียดเพิ่มเติม/).fill('บริการทดสอบ E2E');
      await modal.getByRole('button', { name: 'บันทึกข้อมูล' }).click();
      await expectBodyText(qa.serviceName);
    });

    const serviceResult = await pool.query('SELECT service_id FROM tb_service WHERE service_name = $1 LIMIT 1', [qa.serviceName]);
    qa.serviceId = serviceResult.rows[0]?.service_id;
    assert.ok(qa.serviceId, 'Service created through UI was not found');

    const appointmentDate = formatDateAfter(7);
    const schedule = await api('POST', '/appointments/vet-schedules', {
      token: adminToken,
      body: {
        vet_id: qa.vetId,
        work_date: appointmentDate,
        start_time: '09:00',
        end_time: '12:00',
        schedule_note: qa.scheduleNote
      }
    });
    qa.scheduleId = schedule.schedule?.schedule_id || schedule.schedule_id;

    await step('admin creates appointment for owner pet', async () => {
      await gotoAndExpect('/admin/appointments', 'จัดการตารางนัดหมาย');
      await page.getByRole('button', { name: 'เพิ่มการนัดหมาย' }).click();
      const modal = page.locator('.appointment-modal');
      await modal.getByLabel(/ค้นหาสัตว์เลี้ยง/).fill(qa.petName);
      await modal.locator('.dropdown-item').filter({ hasText: qa.petName }).click();
      await modal.getByLabel(/สัตวแพทย์/).selectOption(qa.vetId);
      await modal.getByLabel(/วันที่นัดหมาย/).fill(appointmentDate);
      await modal.getByLabel(/เวลานัดหมาย/).fill('10:00');
      await modal.getByLabel(/เหตุผล/).fill(`ติดตามอาการ E2E ${runId}`);
      await modal.getByRole('button', { name: 'บันทึกนัดหมาย' }).click();
      await modal.waitFor({ state: 'hidden' });
      await expectBodyText(qa.petName);
    });

    const appointmentResult = await pool.query(
      'SELECT appt_id FROM tb_appointment WHERE pet_id = $1 ORDER BY create_datetime DESC NULLS LAST, appt_id DESC LIMIT 1',
      [qa.petId]
    );
    qa.appointmentId = appointmentResult.rows[0]?.appt_id;
    assert.ok(qa.appointmentId, 'Appointment created through UI was not found');

    await step('user sees and accepts appointment', async () => {
      await login(qa.username, qa.password, '/user');
      await gotoAndExpect('/user/appointments', qa.petName);
      const card = page.locator('.appointment-card').filter({ hasText: qa.appointmentId });
      await card.getByRole('button', { name: 'ยืนยันนัดหมาย' }).click();
      await card.getByText('ยืนยัน', { exact: true }).waitFor({ state: 'visible' });
    });

    await step('owner requests an exact-minute appointment', async () => {
      const booking = page.locator('.booking-form');
      await booking.getByLabel(/สัตว์เลี้ยง/).selectOption(qa.petId);
      if (appointmentDate.slice(0, 7) !== formatDateAfter(0).slice(0, 7)) {
        await page.getByRole('button', { name: 'เดือนถัดไป' }).click();
      }
      await page.locator('.calendar-day:not(.muted)').nth(Number(appointmentDate.slice(8)) - 1).click();
      await page.getByLabel(/เวลาที่ต้องการนัด/).fill('09:17');
      await booking.getByLabel(/อาการหรือเหตุผล/).fill('ขอนัดตรวจอาการ E2E');
      await booking.getByRole('button', { name: 'ส่งคำขอนัดหมาย' }).click();
      await page.locator('.appointment-card').filter({ hasText: 'ขอนัดตรวจอาการ E2E' }).getByText('รอคลินิกยืนยัน').waitFor({ state: 'visible' });
      await capture('owner-appointment-desktop.png');
      if (process.env.E2E_CAPTURE_UI === '1') {
        await page.setViewportSize({ width: 390, height: 844 });
        await capture('owner-appointment-mobile.png', false);
        await page.setViewportSize({ width: 1440, height: 1000 });
      }
      if (process.env.E2E_CAPTURE_UI === '1') {
        await page.locator('.appointment-list').scrollIntoViewIfNeeded();
        await capture('owner-appointment-list.png', false);
      }
    });

    await step('clinic confirms owner request in admin queue', async () => {
      await login(qa.adminUsername, qa.adminPassword, '/admin');
      await gotoAndExpect('/admin/appointments', 'คำขอนัดจากเจ้าของสัตว์เลี้ยง');
      const requestRow = page.locator('.request-row').filter({ hasText: 'ขอนัดตรวจอาการ E2E' });
      await capture('admin-appointment-queue.png');
      if (process.env.E2E_CAPTURE_UI === '1') {
        await page.locator('.table-panel').scrollIntoViewIfNeeded();
        await capture('admin-appointment-table.png', false);
      }
      await requestRow.getByRole('button', { name: 'ยืนยันนัด' }).click();
      await requestRow.waitFor({ state: 'hidden' });
      await login(qa.username, qa.password, '/user');
      await gotoAndExpect('/user/appointments', 'การนัดหมายของฉัน');
      await page.locator('.appointment-card').filter({ hasText: 'ขอนัดตรวจอาการ E2E' }).getByText('ยืนยัน', { exact: true }).waitFor({ state: 'visible' });
    });

    await step('admin records treatment and issues receipt', async () => {
      await login(qa.adminUsername, qa.adminPassword, '/admin');
      await gotoAndExpect('/admin/treatments', 'บันทึกการรักษา');
      await page.getByRole('button', { name: 'เพิ่มการรักษาใหม่' }).click();
      const modal = page.locator('.treatment-modal');
      const petSearch = modal.getByRole('combobox', { name: 'เลือกสัตว์เลี้ยง' });
      await petSearch.fill(`ไม่พบสัตว์ ${runId}`);
      await modal.getByText('ไม่พบสัตว์เลี้ยงที่ตรงกับคำค้น').waitFor({ state: 'visible' });
      assert.equal(await modal.locator('.pet-suggestions').getByRole('option').count(), 0);
      await petSearch.fill(qa.ownerName);
      assert.equal(await modal.locator('.pet-suggestions').getByRole('option').count(), 1);
      await petSearch.fill(qa.petId);
      assert.equal(await modal.locator('.pet-suggestions').getByRole('option').count(), 1);
      await petSearch.fill(qa.petName);
      assert.equal(await modal.locator('.pet-suggestions').getByRole('option').count(), 1);
      await capture('admin-treatment-search-desktop.png', false);
      if (process.env.E2E_CAPTURE_UI === '1') {
        await page.setViewportSize({ width: 390, height: 844 });
        await petSearch.scrollIntoViewIfNeeded();
        await capture('admin-treatment-search-mobile.png', false);
        await page.setViewportSize({ width: 1440, height: 1000 });
      }
      await modal.locator('.pet-suggestions').getByRole('option').filter({ hasText: qa.petId }).click();
      assert.equal(await petSearch.inputValue(), qa.petName);
      await modal.getByText(`เลือกแล้ว: ${qa.petName}`, { exact: false }).waitFor({ state: 'visible' });
      await modal.getByLabel('สัตวแพทย์').selectOption(qa.vetId);
      await modal.getByLabel('อาการเบื้องต้น').fill('ตรวจสุขภาพ E2E');
      await modal.getByLabel('การวินิจฉัยโรค').fill('สุขภาพปกติ');
      await modal.locator('.service-select').selectOption(qa.serviceId);
      await modal.getByRole('button', { name: 'เพิ่ม', exact: true }).click();
      await modal.getByLabel('ช่องทางชำระ').selectOption({ label: 'เงินสด' });
      await modal.getByLabel('สถานะการชำระ').selectOption({ label: 'ค้างชำระ' });
      await modal.getByRole('button', { name: 'บันทึกการรักษาและออกใบเสร็จ' }).click();
      await modal.waitFor({ state: 'hidden', timeout: 15000 });
      await expectBodyText(qa.petName);
    });

    const treatmentResult = await pool.query(
      `SELECT t.treatment_id, r.receipt_id
       FROM tb_treatment t
       LEFT JOIN tb_receipt r ON r.treatment_id = t.treatment_id
       WHERE t.pet_id = $1
       ORDER BY t.treatment_date DESC NULLS LAST, t.treatment_id DESC
       LIMIT 1`,
      [qa.petId]
    );
    qa.treatmentId = treatmentResult.rows[0]?.treatment_id;
    qa.receiptId = treatmentResult.rows[0]?.receipt_id;
    assert.ok(qa.treatmentId && qa.receiptId, 'Treatment and receipt created through UI were not found');

    await step('admin hides delete action for treatment with document', async () => {
      const followUpDialog = page.locator('.followup-appointment-modal');
      if (await followUpDialog.isVisible()) {
        await followUpDialog.getByRole('button', { name: 'ไม่ต้องติดตามผล' }).click();
      }
      await gotoAndExpect('/admin/treatments', 'บันทึกการรักษา');
      const row = page.locator('tbody tr').filter({ hasText: qa.treatmentId });
      await row.getByRole('button', { name: 'นัดติดตาม' }).waitFor({ state: 'visible' });
      assert.equal(await row.getByText('มีใบเสร็จแล้ว').count(), 0);
      assert.equal(await row.getByRole('button', { name: 'ลบ', exact: true }).count(), 0);
      await capture('admin-treatment-protected-desktop.png', false);
      if (process.env.E2E_CAPTURE_UI === '1') {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.evaluate(() => {
          document.querySelector('.table-panel')?.scrollIntoView();
          const table = document.querySelector('.table-wrap');
          if (table) table.scrollLeft = table.scrollWidth;
        });
        await capture('admin-treatment-protected-mobile.png', false);
        await page.setViewportSize({ width: 1440, height: 1000 });
      }
      await row.getByRole('button', { name: 'แก้ไข' }).click();
      const editModal = page.locator('.treatment-modal');
      const editSearch = editModal.getByRole('combobox', { name: 'เลือกสัตว์เลี้ยง' });
      assert.equal(await editSearch.inputValue(), qa.petName);
      await editSearch.fill(`ไม่พบสัตว์ ${runId}`);
      await editModal.getByText('ไม่พบสัตว์เลี้ยงที่ตรงกับคำค้น').waitFor({ state: 'visible' });
      await editSearch.fill(qa.petId);
      await editModal.locator('.pet-suggestions').getByRole('option').filter({ hasText: qa.petId }).waitFor({ state: 'visible' });
      await editSearch.press('ArrowDown');
      await editSearch.press('Enter');
      assert.equal(await editSearch.inputValue(), qa.petName);
      await editModal.getByRole('button', { name: 'ปิด' }).click();
    });

    await step('admin receives payment and opens receipt', async () => {
      await gotoAndExpect('/admin/receipts', 'ใบเสร็จชำระเงิน');
      await page.getByPlaceholder(/ค้นหาเลขที่ใบเสร็จ/).fill(qa.receiptId);
      const row = page.locator('tbody tr').filter({ hasText: qa.receiptId });
      await row.getByRole('button', { name: 'รับชำระ' }).click();
      await row.getByText('ชำระแล้ว', { exact: true }).waitFor({ state: 'visible' });
      await row.getByRole('button', { name: 'ดู/พิมพ์' }).click();
      await expectBodyText(qa.receiptId);
      await page.locator('.modal-overlay').getByRole('button', { name: 'ปิด' }).click();
    });

    await step('admin records surgery', async () => {
      await gotoAndExpect('/admin/surgeries', 'จัดการการผ่าตัด');
      await page.getByRole('button', { name: 'เพิ่มการผ่าตัด' }).click();
      const modal = page.locator('.modal');
      await modal.getByLabel('ประเภทการผ่าตัด').fill(qa.surgeryName);
      await modal.getByLabel('ยาสลบ / วิธีวางยา').fill('ดมยาสลบ');
      await modal.getByLabel('บริการ').selectOption(qa.serviceId);
      await modal.getByLabel('สัตว์เลี้ยง').selectOption(qa.petId);
      await modal.getByLabel('สัตวแพทย์').selectOption(qa.vetId);
      await modal.getByLabel('ผลการผ่าตัด').fill('สำเร็จ');
      await modal.getByRole('button', { name: 'บันทึกข้อมูล' }).click();
      await expectBodyText(qa.surgeryName);
    });

    await step('admin records vaccine', async () => {
      await gotoAndExpect('/admin/vaccines', 'จัดการวัคซีน');
      await page.getByRole('button', { name: 'เพิ่มวัคซีน' }).click();
      const modal = page.locator('.modal');
      await modal.getByLabel('ชื่อวัคซีน').fill(qa.vaccineName);
      await modal.getByLabel('Lot number').fill(`LOT-${runId}`);
      await modal.getByLabel('วันที่ฉีด').fill(formatDateAfter(0));
      await modal.getByLabel('บริการ').selectOption(qa.serviceId);
      await modal.getByLabel('สัตว์เลี้ยง').selectOption(qa.petId);
      await modal.getByLabel('สัตวแพทย์').selectOption(qa.vetId);
      await modal.getByRole('button', { name: 'บันทึกข้อมูล' }).click();
      await expectBodyText(qa.vaccineName);
    });

    await step('admin creates expense category and expense', async () => {
      await gotoAndExpect('/admin/expenses', 'จัดการรายจ่ายของคลินิก');
      await page.getByRole('button', { name: 'จัดการหมวดหมู่' }).click();
      const categoryModal = page.locator('.modal').filter({ hasText: 'จัดการหมวดหมู่' });
      await categoryModal.getByPlaceholder('ชื่อหมวดหมู่ใหม่').fill(qa.categoryName);
      await categoryModal.getByRole('button', { name: 'เพิ่ม', exact: true }).click();
      await categoryModal.getByText(qa.categoryName, { exact: false }).waitFor({ state: 'visible' });
      await categoryModal.getByRole('button', { name: 'ปิด' }).click();

      await page.getByRole('button', { name: 'เพิ่มรายจ่าย' }).click();
      const expenseModal = page.locator('.modal').filter({ hasText: 'เพิ่มรายจ่ายใหม่' });
      await expenseModal.getByLabel(/ชื่อรายการ/).fill(qa.expenseTitle);
      await expenseModal.getByLabel(/จำนวนเงิน/).fill('321');
      await expenseModal.getByLabel(/วันที่/).fill(formatDateAfter(0));
      await expenseModal.getByLabel('หมวดหมู่').selectOption({ label: qa.categoryName });
      await expenseModal.getByRole('button', { name: 'บันทึกข้อมูล' }).click();
      await expectBodyText(qa.expenseTitle);
    });

    const expenseData = await pool.query(
      `SELECT e.exp_id, c.category_id
       FROM tb_expense e
       LEFT JOIN tb_category c ON c.category_id = e.category_id
       WHERE e.exp_title = $1
       LIMIT 1`,
      [qa.expenseTitle]
    );
    qa.expenseId = expenseData.rows[0]?.exp_id;
    qa.categoryId = expenseData.rows[0]?.category_id;

    const adminPages = [
      ['/admin/dashboard', 'ภาพรวมของคลินิก'],
      ['/admin/users', 'จัดการบทบาทผู้ใช้'],
      ['/admin/owners', 'จัดการเจ้าของสัตว์เลี้ยง'],
      ['/admin/pets', 'จัดการสัตว์เลี้ยง'],
      ['/admin/veterinarians', 'จัดการสัตวแพทย์'],
      ['/admin/clinic', 'ตั้งค่าคลินิก'],
      ['/admin/appointments', 'จัดการตารางนัดหมาย'],
      ['/admin/services', 'จัดการข้อมูลบริการและค่ารักษา'],
      ['/admin/treatments', 'บันทึกการรักษา'],
      ['/admin/surgeries', 'จัดการการผ่าตัด'],
      ['/admin/vaccines', 'จัดการวัคซีน'],
      ['/admin/receipts', 'ใบเสร็จชำระเงิน'],
      ['/admin/expenses', 'จัดการรายจ่ายของคลินิก'],
      ['/admin/reports', 'รายงานสรุประบบ']
    ];
    for (const [route, marker] of adminPages) {
      await step(`admin page ${route}`, async () => gotoAndExpect(route, marker));
    }

    await step('admin report tabs', async () => {
      await gotoAndExpect('/admin/reports', 'รายงานสรุประบบ');
      for (const label of ['การรักษา', 'การเงิน', 'นัดหมาย']) {
        await page.getByRole('button', { name: label }).click();
      }
    });

    await step('user sees treatment history and paid receipt', async () => {
      await login(qa.username, qa.password, '/user');
      await gotoAndExpect(`/user/history/${qa.petId}`, 'แฟ้มสุขภาพ');
      await expectBodyText('สุขภาพปกติ');
      await gotoAndExpect('/user/receipts', qa.receiptId);
      await expectBodyText('ชำระแล้ว');
    });

    await step('user cannot open admin pages', async () => {
      await page.goto(`${APP_URL}/admin/dashboard`);
      await page.waitForURL((url) => url.pathname.startsWith('/user'));
    });

    await step('mobile user appointments responsive smoke', async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await gotoAndExpect('/user/appointments', 'การนัดหมายของฉัน');
      await capture('owner-appointment-mobile.png', false);
      if (process.env.E2E_CAPTURE_UI === '1') {
        await page.locator('.booking-footer').scrollIntoViewIfNeeded();
        await capture('owner-appointment-mobile-form.png', false);
        await page.locator('.appointment-card').first().scrollIntoViewIfNeeded();
        await capture('owner-appointment-mobile-list.png', false);
      }
      assert.equal(await page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth + 1), true);
      await page.setViewportSize({ width: 1440, height: 1000 });
    });

    assert.deepEqual(browserIssues, [], `Browser issues detected:\n${browserIssues.join('\n')}`);
    console.log(`PLAYWRIGHT_FLOW_SUMMARY ${results.length} checks passed`);
  } finally {
    await browser.close().catch(() => {});
  }
};

(async () => {
  let exitCode = 0;
  try {
    await main();
  } catch (error) {
    exitCode = 1;
    console.error('PLAYWRIGHT_FLOW_FAILED', error.stack || error.message);
  } finally {
    try {
      await cleanup();
    } catch (cleanupError) {
      exitCode = 1;
      console.error('PLAYWRIGHT_CLEANUP_FAILED', cleanupError.stack || cleanupError.message);
    }
    await pool.end().catch(() => {});
    console.log(JSON.stringify({ results, browserIssues }, null, 2));
    process.exit(exitCode);
  }
})();
