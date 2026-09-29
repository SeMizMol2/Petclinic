const assert = require('node:assert/strict');
const path = require('node:path');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const pool = require('../src/database/db');

if (process.env.QA_ALLOW_MUTATION !== '1' || !/^petclinic_qa_\d+$/.test(process.env.DB_NAME || '')) {
  console.error('Run only against an isolated petclinic_qa_* database with QA_ALLOW_MUTATION=1');
  process.exit(1);
}

const base = `http://127.0.0.1:${process.env.QA_PORT || 3011}/api`;
const run = `integrity_${Date.now()}`;
let checks = 0;

const request = async (method, endpoint, token, body) => {
  const response = await fetch(base + endpoint, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json'
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  return { status: response.status, data: await response.json() };
};

const expect = async (label, expected, responsePromise) => {
  const result = await responsePromise;
  assert.equal(result.status, expected, `${label}: ${result.status} ${JSON.stringify(result.data)}`);
  checks += 1;
  console.log(`PASS ${label}`);
  return result.data;
};

const register = async (suffix) => {
  const username = `${run}_${suffix}`;
  const password = 'IntegrityPass123!';
  await expect(`register ${suffix}`, 200, request('POST', '/auth/register', null, {
    username, email: `${username}@example.com`, password
  }));
  const login = await expect(`login ${suffix}`, 200, request('POST', '/auth/login', null, { username, password }));
  const owner = await pool.query('SELECT owner_id FROM tb_owner WHERE user_id = $1', [login.user.user_id]);
  return { token: login.token, userId: login.user.user_id, ownerId: owner.rows[0].owner_id };
};

const main = async () => {
  const adminId = `Q${String(Date.now()).slice(-9)}`;
  const adminName = `${run}_admin`;
  const adminPassword = 'IntegrityAdmin123!';
  await pool.query(
    "INSERT INTO tb_user (user_id, username, email, password, user_role) VALUES ($1, $2, $3, $4, 'admin')",
    [adminId, adminName, `${adminName}@example.com`, await bcrypt.hash(adminPassword, 10)]
  );
  const admin = (await expect('admin login', 200, request('POST', '/auth/login', null, {
    username: adminName, password: adminPassword
  }))).token;
  const owner = await register('owner');
  const petInfo = { pet_name: `${run}_pet`, pet_type: 'แมว', pet_gender: 'เมีย', sterile_status: 'ยังไม่ทำ' };
  const petId = (await expect('create pet', 201, request('POST', '/pets', owner.token, petInfo))).pet_id;
  const vetId = (await expect('create veterinarian', 201, request('POST', '/admin/veterinarians', admin, {
    vet_name: run
  }))).vet_id;
  const serviceId = (await expect('create service', 201, request('POST', '/services', admin, {
    service_name: run, service_price: 100, applicable_pet_type: 'ทั้งหมด', applicable_pet_gender: 'ทั้งหมด'
  }))).service_id;
  const treatmentBody = {
    pet_id: petId, vet_id: vetId, symptom: run, services: [{ service_id: serviceId, price: 100, quantity: 1 }]
  };

  const created = await Promise.all(Array.from({ length: 8 }, () => request('POST', '/treatments', admin, treatmentBody)));
  assert.ok(created.every((item) => item.status === 201), `concurrent treatment statuses: ${created.map((item) => item.status)}`);
  assert.equal(new Set(created.map((item) => item.data.treatment_id)).size, 8);
  checks += 1;
  console.log('PASS eight concurrent treatments have different IDs');

  const treatmentId = created[0].data.treatment_id;
  const sameReceipt = await Promise.all(Array.from({ length: 6 }, () => request('POST', '/receipts', admin, {
    treatment_id: treatmentId, pay_method: 'เงินสด'
  })));
  assert.equal(sameReceipt.filter((item) => item.status === 201).length, 1);
  assert.ok(sameReceipt.every((item) => [200, 201].includes(item.status)));
  assert.equal(new Set(sameReceipt.map((item) => item.data.data?.receipt_id)).size, 1);
  const receiptId = sameReceipt[0].data.data.receipt_id;
  assert.equal(Number((await pool.query('SELECT COUNT(*) AS count FROM tb_receipt WHERE treatment_id = $1', [treatmentId])).rows[0].count), 1);
  checks += 1;
  console.log('PASS concurrent receipt requests return one document');

  const differentReceipts = await Promise.all(created.slice(1).map((item) => request('POST', '/receipts', admin, {
    treatment_id: item.data.treatment_id, pay_method: 'เงินสด'
  })));
  assert.ok(differentReceipts.every((item) => item.status === 201), `distinct receipt statuses: ${differentReceipts.map((item) => item.status)}`);
  assert.equal(new Set(differentReceipts.map((item) => item.data.data.receipt_id)).size, 7);
  const details = await pool.query(
    `SELECT COUNT(*) AS count, COUNT(DISTINCT detail_id) AS distinct_count
     FROM tb_receipt_detail WHERE receipt_id = ANY($1::varchar[])`,
    [[receiptId, ...differentReceipts.map((item) => item.data.data.receipt_id)]]
  );
  assert.equal(Number(details.rows[0].count), 8);
  assert.equal(details.rows[0].count, details.rows[0].distinct_count);
  checks += 1;
  console.log('PASS distinct receipts and detail IDs remain unique concurrently');

  await expect('mark receipt paid', 200, request('PUT', `/receipts/${receiptId}/status`, admin, {
    payment_status: 'paid'
  }));
  for (const [label, token, endpoint] of [
    ['owner cannot delete pet with treatment', owner.token, `/pets/${petId}`],
    ['admin cannot delete pet with treatment', admin, `/admin/pets/${petId}`],
    ['admin cannot delete owner with treatment', admin, `/admin/owners/${owner.ownerId}`],
    ['admin cannot delete user with treatment', admin, `/admin/users/${owner.userId}`]
  ]) {
    const data = await expect(label, 409, request('DELETE', endpoint, token));
    assert.match(data.message, /ประวัติ|เอกสาร/);
  }
  assert.equal(Number((await pool.query('SELECT COUNT(*) AS count FROM tb_receipt WHERE receipt_id = $1', [receiptId])).rows[0].count), 1);
  checks += 1;
  console.log('PASS paid receipt remains after every blocked deletion');

  const appointmentPet = (await expect('create second pet', 201, request('POST', '/pets', owner.token, {
    ...petInfo, pet_name: `${run}_appointment`
  }))).pet_id;
  const future = new Date();
  future.setDate(future.getDate() + 20);
  const day = [future.getFullYear(), String(future.getMonth() + 1).padStart(2, '0'), String(future.getDate()).padStart(2, '0')].join('-');
  await expect('create shift', 201, request('POST', '/appointments/vet-schedules', admin, {
    vet_id: vetId, work_date: day, start_time: '09:00', end_time: '17:00'
  }));
  await expect('create appointment', 201, request('POST', '/appointments', admin, {
    pet_id: appointmentPet, vet_id: vetId, appt_date: day, appt_time: '10:00', appt_reason: run
  }));
  await expect('appointment history prevents pet deletion', 409, request('DELETE', `/pets/${appointmentPet}`, owner.token));

  const specialtyPet = (await expect('create pet for specialty history', 201, request('POST', '/pets', owner.token, {
    ...petInfo, pet_name: `${run}_specialty`
  }))).pet_id;
  await expect('create vaccine history', 201, request('POST', '/admin/vaccines', admin, {
    vaccine_name: run, vac_date: day, pet_id: specialtyPet, vet_id: vetId, service_id: serviceId
  }));
  await expect('create surgery history', 201, request('POST', '/admin/surgeries', admin, {
    surg_type: run, pet_id: specialtyPet, vet_id: vetId, service_id: serviceId
  }));
  await expect('vaccine and surgery history prevent pet deletion', 409, request('DELETE', `/admin/pets/${specialtyPet}`, admin));

  const plainPet = (await expect('create pet without history', 201, request('POST', '/pets', owner.token, {
    ...petInfo, pet_name: `${run}_plain`
  }))).pet_id;
  await expect('plain pet can still be deleted', 200, request('DELETE', `/pets/${plainPet}`, owner.token));
  const plainOwner = await register('plain');
  await expect('owner without history can still be deleted', 200, request('DELETE', `/admin/owners/${plainOwner.ownerId}`, admin));
  const plainUser = await register('plain_user');
  await expect('user without history can still be deleted', 200, request('DELETE', `/admin/users/${plainUser.userId}`, admin));
  console.log(`INTEGRITY_TEST_SUMMARY ${checks} checks passed`);
};

main().catch((error) => {
  console.error('INTEGRITY_TEST_FAILED', error.stack || error.message);
  process.exitCode = 1;
}).finally(() => pool.end());
