const path = require('path');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const { createHash } = require('node:crypto');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

process.env.PORT = process.env.QA_PORT || '3010';
process.env.SMTP_HOST = '';
process.env.SMTP_USER = '';
process.env.SMTP_PASS = '';

require('../src/app');
const pool = require('../src/database/db');

const baseUrl = `http://127.0.0.1:${process.env.PORT}/api`;
const runId = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const qa = {
  username: `qa_${runId}`,
  email: `qa_${runId}@example.com`,
  password: 'QaPass123!',
  adminUsername: `qa_admin_${runId}`,
  adminPassword: 'QaAdmin123!',
  adminUserId: null,
  credentialOwnerId: null,
  credentialUserId: null,
  credentialMemberId: null,
  credentialMemberOwnerId: null,
  userId: null,
  ownerId: null,
  petId: null,
  serviceId: null,
  scheduleIds: [],
  appointmentId: null,
  ownerRequestIds: [],
  treatmentId: null,
  deletableTreatmentId: null,
  receiptId: null,
  surgeryId: null,
  vaccineId: null,
  categoryId: null,
  expenseId: null
};

const checks = [];

const record = (name) => {
  checks.push(name);
  console.log(`PASS ${name}`);
};

const request = async (method, url, { token, body } = {}) => {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload = body;
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const response = await fetch(`${baseUrl}${url}`, { method, headers, body: payload });
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json()
    : await response.text();
  return { status: response.status, data };
};

const expectStatus = async (name, expected, promise) => {
  const result = await promise;
  assert.equal(
    result.status,
    expected,
    `${name}: expected ${expected}, received ${result.status} ${JSON.stringify(result.data)}`
  );
  record(name);
  return result.data;
};

const isoDateAfter = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const waitForServer = async () => {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${process.env.PORT}/`);
      if (response.ok) return;
    } catch (_error) {
      // Server startup can take a moment while PostgreSQL establishes a connection.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('QA server did not start');
};

const cleanup = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (qa.receiptId) {
      await client.query('DELETE FROM tb_receipt_detail WHERE receipt_id = $1', [qa.receiptId]);
      await client.query('DELETE FROM tb_receipt_payment_event WHERE receipt_id = $1', [qa.receiptId]);
      await client.query('DELETE FROM tb_receipt WHERE receipt_id = $1', [qa.receiptId]);
    }
    if (qa.treatmentId) {
      await client.query('DELETE FROM tb_treatment_detail WHERE treatment_id = $1', [qa.treatmentId]);
      await client.query('DELETE FROM tb_treatment WHERE treatment_id = $1', [qa.treatmentId]);
    }
    if (qa.deletableTreatmentId) {
      await client.query('DELETE FROM tb_treatment_detail WHERE treatment_id = $1', [qa.deletableTreatmentId]);
      await client.query('DELETE FROM tb_treatment WHERE treatment_id = $1', [qa.deletableTreatmentId]);
    }
    if (qa.vaccineId) await client.query('DELETE FROM tb_vaccine_rec WHERE vac_rec_id = $1', [qa.vaccineId]);
    if (qa.surgeryId) await client.query('DELETE FROM tb_surgery WHERE surg_id = $1', [qa.surgeryId]);
    if (qa.appointmentId) await client.query('DELETE FROM tb_appointment WHERE appt_id = $1', [qa.appointmentId]);
    for (const appointmentId of qa.ownerRequestIds) {
      await client.query('DELETE FROM tb_appointment WHERE appt_id = $1', [appointmentId]);
    }
    for (const scheduleId of qa.scheduleIds) {
      await client.query('DELETE FROM tb_vet_schedule WHERE schedule_id = $1', [scheduleId]);
    }
    if (qa.expenseId) await client.query('DELETE FROM tb_expense WHERE exp_id = $1', [qa.expenseId]);
    if (qa.categoryId) await client.query('DELETE FROM tb_category WHERE category_id = $1', [qa.categoryId]);
    if (qa.petId) await client.query('DELETE FROM tb_pet WHERE pet_id = $1', [qa.petId]);
    if (qa.credentialOwnerId) await client.query('DELETE FROM tb_owner WHERE owner_id = $1', [qa.credentialOwnerId]);
    if (qa.credentialUserId) await client.query('DELETE FROM tb_user WHERE user_id = $1', [qa.credentialUserId]);
    if (qa.credentialMemberOwnerId) await client.query('DELETE FROM tb_owner WHERE owner_id = $1', [qa.credentialMemberOwnerId]);
    if (qa.credentialMemberId) await client.query('DELETE FROM tb_user WHERE user_id = $1', [qa.credentialMemberId]);
    if (qa.ownerId) await client.query('DELETE FROM tb_owner WHERE owner_id = $1', [qa.ownerId]);
    if (qa.userId) await client.query('DELETE FROM tb_user WHERE user_id = $1', [qa.userId]);
    if (qa.adminUserId) await client.query('DELETE FROM tb_user WHERE user_id = $1', [qa.adminUserId]);
    if (qa.serviceId) await client.query('DELETE FROM tb_service WHERE service_id = $1', [qa.serviceId]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};

const createSchedule = async (adminToken, vetId, dayOffset, startTime = '13:00', endTime = '15:00') => {
  for (let offset = dayOffset; offset < dayOffset + 20; offset += 1) {
    const workDate = isoDateAfter(offset);
    const result = await request('POST', '/appointments/vet-schedules', {
      token: adminToken,
      body: {
        vet_id: vetId,
        work_date: workDate,
        start_time: startTime,
        end_time: endTime,
        schedule_note: `QA ${runId}`
      }
    });

    if (result.status === 201) {
      qa.scheduleIds.push(result.data.schedule.schedule_id);
      return { workDate, time: '13:30' };
    }
    if (result.status !== 409) {
      assert.fail(`create schedule failed: ${result.status} ${JSON.stringify(result.data)}`);
    }
  }
  assert.fail('could not find an available QA schedule date');
};

const main = async () => {
  await waitForServer();

  const health = await fetch(`http://127.0.0.1:${process.env.PORT}/`);
  assert.equal(health.status, 200);
  record('backend health');

  const requiredColumns = await pool.query(
    `SELECT table_name, column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name IN ('tb_receipt_detail', 'tb_service', 'tb_vet_schedule', 'tb_appointment')`
  );
  const schema = new Set(requiredColumns.rows.map((row) => `${row.table_name}.${row.column_name}`));
  for (const column of [
    'tb_receipt_detail.detail_id',
    'tb_receipt_detail.t_detail_id',
    'tb_service.service_image',
    'tb_service.applicable_pet_type',
    'tb_service.applicable_pet_gender',
    'tb_vet_schedule.schedule_id',
    'tb_appointment.request_source'
  ]) {
    assert.ok(schema.has(column), `missing database column ${column}`);
  }
  record('database schema compatibility');

  await expectStatus(
    'register rejects invalid email',
    400,
    request('POST', '/auth/register', {
      body: { username: `bad_${runId}`, email: 'invalid-email', password: qa.password }
    })
  );

  await expectStatus(
    'register user and owner atomically',
    201,
    request('POST', '/auth/register', {
      body: { username: qa.username, email: qa.email, password: qa.password }
    })
  );

  const account = await pool.query(
    `SELECT u.user_id, o.owner_id
     FROM tb_user u
     JOIN tb_owner o ON o.user_id = u.user_id
     WHERE u.username = $1`,
    [qa.username]
  );
  assert.equal(account.rows.length, 1);
  qa.userId = account.rows[0].user_id;
  qa.ownerId = account.rows[0].owner_id;

  await expectStatus('new account cannot log in before email verification', 403,
    request('POST', '/auth/login', { body: { username: qa.username, password: qa.password } }));
  await expectStatus('resend does not reveal nonexistent email', 200,
    request('POST', '/auth/resend-verification', { body: { email: `missing_${qa.email}` } }));
  await expectStatus('invalid email verification token rejected', 400,
    request('POST', '/auth/verify-email', { body: { token: 'a'.repeat(64) } }));
  const expiredToken = 'c'.repeat(64);
  await pool.query(
    `UPDATE tb_user SET email_verification_token_hash = $1,
       email_verification_expires_at = CURRENT_TIMESTAMP - INTERVAL '1 minute'
     WHERE user_id = $2`,
    [createHash('sha256').update(expiredToken).digest('hex'), qa.userId]
  );
  await expectStatus('expired email verification token rejected', 400,
    request('POST', '/auth/verify-email', { body: { token: expiredToken } }));
  const verificationToken = 'b'.repeat(64);
  await pool.query(
    `UPDATE tb_user SET email_verification_token_hash = $1,
       email_verification_expires_at = CURRENT_TIMESTAMP + INTERVAL '1 hour'
     WHERE user_id = $2`,
    [createHash('sha256').update(verificationToken).digest('hex'), qa.userId]
  );
  await expectStatus('verify email with valid single-use token', 200,
    request('POST', '/auth/verify-email', { body: { token: verificationToken } }));
  await expectStatus('email verification token cannot be reused', 400,
    request('POST', '/auth/verify-email', { body: { token: verificationToken } }));

  const userLogin = await expectStatus(
    'user login',
    200,
    request('POST', '/auth/login', { body: { username: qa.username, password: qa.password } })
  );
  const userToken = userLogin.token;

  qa.adminUserId = `A${runId}`.slice(0, 20);
  const adminPasswordHash = await bcrypt.hash(qa.adminPassword, 10);
  await pool.query(
    `INSERT INTO tb_user (user_id, username, email, password, user_role)
     VALUES ($1, $2, $3, $4, 'admin')`,
    [qa.adminUserId, qa.adminUsername, `admin_${qa.email}`, adminPasswordHash]
  );

  const adminLogin = await expectStatus(
    'admin login',
    200,
    request('POST', '/auth/login', {
      body: { username: qa.adminUsername, password: qa.adminPassword }
    })
  );
  const adminToken = adminLogin.token;

  await expectStatus('admin rejects weak owner password', 400, request('POST', '/admin/owners', {
    token: adminToken,
    body: { owner_name: 'เจ้าของรหัสสั้น', username: `short_${runId}`, password: '123456' }
  }));
  const credentialOwner = await expectStatus('admin creates owner with unique random password', 201, request('POST', '/admin/owners', {
    token: adminToken,
    body: { owner_name: 'เจ้าของทดสอบรหัสผ่าน', username: `credential_${runId}`, owner_email: `credential_${qa.email}` }
  }));
  qa.credentialOwnerId = credentialOwner.owner_id;
  const credentialRow = (await pool.query(
    'SELECT u.user_id, u.password FROM tb_owner o JOIN tb_user u ON u.user_id = o.user_id WHERE o.owner_id = $1',
    [qa.credentialOwnerId]
  )).rows[0];
  qa.credentialUserId = credentialRow.user_id;
  assert.ok(credentialOwner.initial_password.length >= 8);
  assert.equal(await bcrypt.compare('123456', credentialRow.password), false);
  const credentialLogin = await expectStatus('new owner logs in with issued password', 200, request('POST', '/auth/login', {
    body: { username: credentialOwner.username, password: credentialOwner.initial_password }
  }));
  await expectStatus('owner password change rejects incorrect current password', 400, request('PUT', '/user/me/password', {
    token: credentialLogin.token, body: { current_password: 'wrong-password', new_password: 'NewPass123!' }
  }));
  await expectStatus('owner password change rejects short new password', 400, request('PUT', '/user/me/password', {
    token: credentialLogin.token, body: { current_password: credentialOwner.initial_password, new_password: '123456' }
  }));
  await expectStatus('owner password change rejects reused password', 400, request('PUT', '/user/me/password', {
    token: credentialLogin.token, body: { current_password: credentialOwner.initial_password, new_password: credentialOwner.initial_password }
  }));
  await expectStatus('owner changes password with correct current password', 200, request('PUT', '/user/me/password', {
    token: credentialLogin.token, body: { current_password: credentialOwner.initial_password, new_password: 'NewPass123!' }
  }));
  await expectStatus('old owner password no longer logs in', 401, request('POST', '/auth/login', {
    body: { username: credentialOwner.username, password: credentialOwner.initial_password }
  }));
  await expectStatus('new owner password logs in', 200, request('POST', '/auth/login', {
    body: { username: credentialOwner.username, password: 'NewPass123!' }
  }));

  const credentialMember = await expectStatus('hidden admin member route also issues unique password', 200, request('POST', '/admin/users', {
    token: adminToken, body: { owner_name: 'สมาชิกทดสอบรหัสผ่าน', email: `member_${qa.email}` }
  }));
  assert.ok(credentialMember.initial_password.length >= 8);
  const memberRow = (await pool.query('SELECT u.user_id, o.owner_id FROM tb_user u JOIN tb_owner o ON o.user_id = u.user_id WHERE u.username = $1', [credentialMember.username])).rows[0];
  qa.credentialMemberId = memberRow.user_id;
  qa.credentialMemberOwnerId = memberRow.owner_id;
  await expectStatus('member issued password logs in', 200, request('POST', '/auth/login', {
    body: { username: credentialMember.username, password: credentialMember.initial_password }
  }));

  const ownerBeforeFailedEdit = (await pool.query(
    `SELECT o.owner_name, o.owner_email, o.owner_tel, u.username, u.email
     FROM tb_owner o JOIN tb_user u ON u.user_id = o.user_id
     WHERE o.owner_id = $1`,
    [qa.ownerId]
  )).rows[0];
  await expectStatus(
    'duplicate owner email rejects entire edit',
    400,
    request('PUT', `/admin/owners/${qa.ownerId}`, {
      token: adminToken,
      body: {
        owner_name: 'ไม่ควรถูกบันทึก',
        owner_email: `admin_${qa.email}`,
        owner_tel: '0999999999',
        username: `${qa.username}_changed`
      }
    })
  );
  const ownerAfterFailedEdit = (await pool.query(
    `SELECT o.owner_name, o.owner_email, o.owner_tel, u.username, u.email
     FROM tb_owner o JOIN tb_user u ON u.user_id = o.user_id
     WHERE o.owner_id = $1`,
    [qa.ownerId]
  )).rows[0];
  assert.deepEqual(ownerAfterFailedEdit, ownerBeforeFailedEdit);
  record('failed owner edit leaves both tables unchanged');

  await expectStatus(
    'owner edit updates both tables together',
    200,
    request('PUT', `/admin/owners/${qa.ownerId}`, {
      token: adminToken,
      body: {
        owner_name: 'เจ้าของสัตว์ QA',
        owner_email: qa.email,
        owner_tel: '0811111111',
        username: qa.username
      }
    })
  );
  const ownerAfterSuccessfulEdit = (await pool.query(
    `SELECT o.owner_name, o.owner_email, o.owner_tel, u.username, u.email
     FROM tb_owner o JOIN tb_user u ON u.user_id = o.user_id
     WHERE o.owner_id = $1`,
    [qa.ownerId]
  )).rows[0];
  assert.equal(ownerAfterSuccessfulEdit.owner_name, 'เจ้าของสัตว์ QA');
  assert.equal(ownerAfterSuccessfulEdit.owner_tel, '0811111111');
  assert.equal(ownerAfterSuccessfulEdit.owner_email, qa.email);
  assert.equal(ownerAfterSuccessfulEdit.email, qa.email);
  record('successful owner edit keeps both tables in sync');
  if (process.env.QA_ONLY_OWNER_EDIT === '1') {
    console.log(`FLOW_TEST_SUMMARY ${checks.length} checks passed`);
    return;
  }

  const duplicateOwnerCountBefore = (await pool.query(
    'SELECT COUNT(*)::int AS count FROM tb_user WHERE username = $1',
    [qa.username]
  )).rows[0].count;
  await expectStatus(
    'admin cannot add owner with an existing username',
    400,
    request('POST', '/admin/owners', {
      token: adminToken,
      body: { owner_name: 'ชื่อซ้ำ', owner_email: `duplicate_${qa.email}`, username: qa.username }
    })
  );
  assert.equal((await pool.query(
    'SELECT COUNT(*)::int AS count FROM tb_user WHERE username = $1',
    [qa.username]
  )).rows[0].count, duplicateOwnerCountBefore);
  record('duplicate owner create leaves account count unchanged');

  await expectStatus(
    'admin cannot rename owner to an existing username',
    400,
    request('PUT', `/admin/owners/${qa.ownerId}`, {
      token: adminToken,
      body: { owner_name: 'ไม่ควรถูกบันทึก', owner_email: qa.email, owner_tel: '0999999999', username: qa.adminUsername }
    })
  );
  const ownerAfterDuplicateUsername = (await pool.query(
    'SELECT o.owner_name, o.owner_tel, u.username FROM tb_owner o JOIN tb_user u ON u.user_id = o.user_id WHERE o.owner_id = $1',
    [qa.ownerId]
  )).rows[0];
  assert.equal(ownerAfterDuplicateUsername.owner_name, 'เจ้าของสัตว์ QA');
  assert.equal(ownerAfterDuplicateUsername.username, qa.username);
  record('duplicate owner edit leaves both tables unchanged');

  await expectStatus(
    'admin member edit cannot bypass username check',
    400,
    request('PUT', `/admin/users/${qa.userId}`, {
      token: adminToken,
      body: { username: qa.adminUsername, owner_name: 'ไม่ควรถูกบันทึก', email: qa.email, tel: '0999999999' }
    })
  );
  const memberAfterDuplicateUsername = (await pool.query(
    'SELECT username FROM tb_user WHERE user_id = $1', [qa.userId]
  )).rows[0];
  assert.equal(memberAfterDuplicateUsername.username, qa.username);
  record('duplicate member edit leaves username unchanged');

  await expectStatus(
    'admin rejects invalid owner username format',
    400,
    request('POST', '/admin/owners', {
      token: adminToken,
      body: { owner_name: 'ชื่อผิดรูปแบบ', owner_email: `invalid_${qa.email}`, username: 'bad name' }
    })
  );

  const raceUsername = `qa_race_${runId}`.slice(0, 50);
  const raceResults = await Promise.all([1, 2].map((n) => request('POST', '/admin/owners', {
    token: adminToken,
    body: { owner_name: `แข่งเพิ่ม ${n}`, owner_email: `race${n}_${qa.email}`, username: raceUsername }
  })));
  assert.deepEqual(raceResults.map((item) => item.status).sort(), [201, 400]);
  record('concurrent owner creation allows only one username');
  const raceOwnerId = raceResults.find((item) => item.status === 201).data.owner_id;
  await expectStatus('remove QA concurrent owner', 200, request('DELETE', `/admin/owners/${raceOwnerId}`, { token: adminToken }));

  if (process.env.QA_ONLY_USERNAME === '1') {
    console.log(`FLOW_TEST_SUMMARY ${checks.length} checks passed`);
    return;
  }

  await expectStatus('user profile', 200, request('GET', '/user/me', { token: userToken }));
  const invalidProfileImage = new FormData();
  invalidProfileImage.append('profileImage', new Blob(['not an image'], { type: 'text/plain' }), 'profile.txt');
  await expectStatus(
    'profile upload rejects non-image files',
    400,
    request('POST', '/user/upload-profile', { token: userToken, body: invalidProfileImage })
  );
  await expectStatus(
    'update user profile with Thai text',
    200,
    request('PUT', '/user/me', {
      token: userToken,
      body: { owner_name: 'ผู้ใช้ทดสอบระบบ', owner_email: qa.email, tel: '0800000000' }
    })
  );
  const changedEmail = `changed_${qa.email}`;
  const changedProfile = await expectStatus('changing profile email requires verification', 200,
    request('PUT', '/user/me', {
      token: userToken,
      body: { owner_name: 'ผู้ใช้ทดสอบระบบ', owner_email: changedEmail, tel: '0800000000' }
    }));
  assert.equal(changedProfile.email_verification_required, true);
  await expectStatus('changed email blocks next login until verified', 403,
    request('POST', '/auth/login', { body: { username: qa.username, password: qa.password } }));
  const restoredProfile = await expectStatus('restoring profile email also requires verification', 200,
    request('PUT', '/user/me', {
      token: userToken,
      body: { owner_name: 'ผู้ใช้ทดสอบระบบ', owner_email: qa.email, tel: '0800000000' }
    }));
  assert.equal(restoredProfile.email_verification_required, true);
  const restoredToken = 'd'.repeat(64);
  await pool.query(
    `UPDATE tb_user SET email_verification_token_hash = $1,
       email_verification_expires_at = CURRENT_TIMESTAMP + INTERVAL '1 hour'
     WHERE user_id = $2`,
    [createHash('sha256').update(restoredToken).digest('hex'), qa.userId]
  );
  await expectStatus('restored profile email can be verified', 200,
    request('POST', '/auth/verify-email', { body: { token: restoredToken } }));

  const petForm = new FormData();
  petForm.append('pet_name', 'สัตว์เลี้ยงทดสอบ');
  petForm.append('pet_type', 'สุนัข');
  petForm.append('pet_breed', 'พันธุ์ผสม');
  petForm.append('pet_gender', 'ผู้');
  petForm.append('sterile_status', 'ยังไม่ได้ทำหมัน');
  petForm.append('pet_color', 'น้ำตาล');
  petForm.append('drug_allergy', 'ไม่มี');
  const createdPet = await expectStatus(
    'create pet without known birthdate',
    201,
    request('POST', '/pets', { token: userToken, body: petForm })
  );
  qa.petId = createdPet.pet_id;

  const futurePetForm = new FormData();
  for (const [key, value] of petForm.entries()) futurePetForm.append(key, value);
  futurePetForm.append('pet_birthdate', isoDateAfter(10));
  await expectStatus('reject future pet birthdate', 400, request('POST', '/pets', { token: userToken, body: futurePetForm }));
  await expectStatus('admin rejects future pet birthdate', 400, request('POST', '/admin/pets', {
    token: adminToken,
    body: { owner_id: qa.ownerId, pet_name: 'Future QA', pet_type: 'สุนัข', pet_gender: 'ผู้', sterile_status: 'ยังไม่ได้ทำหมัน', pet_birthdate: isoDateAfter(10) }
  }));

  const editPetForm = new FormData();
  editPetForm.append('pet_name', 'สัตว์เลี้ยงทดสอบแก้ไข');
  editPetForm.append('pet_type', 'สุนัข');
  editPetForm.append('pet_breed', 'พันธุ์ผสม');
  editPetForm.append('pet_gender', 'ผู้');
  editPetForm.append('sterile_status', 'ยังไม่ได้ทำหมัน');
  editPetForm.append('pet_color', 'ดำ');
  editPetForm.append('drug_allergy', 'ไม่มี');
  await expectStatus('update own pet', 200, request('PUT', `/pets/${qa.petId}`, { token: userToken, body: editPetForm }));
  await expectStatus('list own pets', 200, request('GET', '/pets', { token: userToken }));

  await expectStatus(
    'user cannot create services',
    403,
    request('POST', '/services', {
      token: userToken,
      body: {
        service_name: 'unauthorized',
        service_price: 1,
        applicable_pet_type: 'all',
        applicable_pet_gender: 'all'
      }
    })
  );
  await expectStatus('user cannot list admin services', 403, request('GET', '/services', { token: userToken }));
  await expectStatus('user cannot list all treatments', 403, request('GET', '/treatments', { token: userToken }));
  await expectStatus('user cannot access admin owners', 403, request('GET', '/admin/owners', { token: userToken }));
  await expectStatus(
    'user cannot access another account appointments',
    403,
    request('GET', `/appointments/my-appointments/${adminLogin.user.user_id}`, { token: userToken })
  );

  await expectStatus(
    'service rejects negative price',
    400,
    request('POST', '/services', {
      token: adminToken,
      body: {
        service_name: 'invalid price',
        service_price: -1,
        applicable_pet_type: 'all',
        applicable_pet_gender: 'all'
      }
    })
  );

  const service = await expectStatus(
    'admin creates applicable service',
    201,
    request('POST', '/services', {
      token: adminToken,
      body: {
        service_name: `QA service ${runId}`,
        service_desc: 'บริการทดสอบระบบ',
        service_price: 700,
        applicable_pet_type: 'dog',
        applicable_pet_gender: 'male'
      }
    })
  );
  qa.serviceId = service.service_id;

  const vets = await expectStatus('load veterinarians', 200, request('GET', '/admin/veterinarians', { token: adminToken }));
  assert.ok(vets.length > 0, 'at least one veterinarian is required for appointment flow');
  const vetId = vets[0].vet_id;

  const firstSlot = await createSchedule(adminToken, vetId, 15);
  const scheduleResponse = await expectStatus(
    'load schedule date without timezone shift',
    200,
    request('GET', `/appointments/vet-schedules?from=${firstSlot.workDate}&to=${firstSlot.workDate}`, { token: adminToken })
  );
  const savedSchedule = scheduleResponse.find((item) => qa.scheduleIds.includes(item.schedule_id));
  assert.equal(savedSchedule?.work_date, firstSlot.workDate, 'schedule date must match the date entered by staff');

  const edgeShift = await createSchedule(adminToken, vetId, 60, '09:00', '17:00');
  const edgeRequest = await expectStatus(
    'owner can request an exact-minute time near shift end',
    201,
    request('POST', '/appointments/request', {
      token: userToken,
      body: { pet_id: qa.petId, vet_id: vetId, appt_date: edgeShift.workDate, appt_time: '16:50', appt_reason: 'ตรวจท้ายเวร QA' }
    })
  );
  qa.ownerRequestIds.push(edgeRequest.appointment.appt_id);
  await expectStatus(
    'clinic may approve an out-of-shift request after checking the doctor',
    200,
    request('PATCH', `/appointments/requests/${edgeRequest.appointment.appt_id}/review`, {
      token: adminToken, body: { action: 'approve' }
    })
  );
  await expectStatus(
    'clinic cannot double-book an approved out-of-shift appointment',
    409,
    request('POST', '/appointments', {
      token: adminToken,
      body: { pet_id: qa.petId, vet_id: vetId, appt_date: edgeShift.workDate, appt_time: '16:50', appt_reason: 'นัดท้ายเวร QA' }
    })
  );
  await expectStatus(
    'clinic rejects a time overlapping that appointment',
    409,
    request('POST', '/appointments', {
      token: adminToken,
      body: { pet_id: qa.petId, vet_id: vetId, appt_date: edgeShift.workDate, appt_time: '16:31', appt_reason: 'นัดท้ายเวร QA' }
    })
  );
  await expectStatus(
    'remove approved QA request before checking free out-of-shift booking',
    200,
    request('DELETE', `/appointments/${edgeRequest.appointment.appt_id}`, { token: adminToken })
  );
  const edgeAppointment = await expectStatus(
    'clinic creates an out-of-shift appointment',
    201,
    request('POST', '/appointments', {
      token: adminToken,
      body: { pet_id: qa.petId, vet_id: vetId, appt_date: edgeShift.workDate, appt_time: '16:50', appt_reason: 'นัดท้ายเวร QA' }
    })
  );
  qa.ownerRequestIds.push(edgeAppointment.appointment.appt_id);
  await expectStatus(
    'clinic moves an active appointment outside the shift',
    200,
    request('PUT', `/appointments/${edgeAppointment.appointment.appt_id}`, {
      token: adminToken,
      body: { vet_id: vetId, appt_date: edgeShift.workDate, appt_time: '16:31', appt_reason: 'เลื่อนนัดท้ายเวร QA', appt_status: 'รอ' }
    })
  );
  await expectStatus(
    'remove QA shift-end appointment',
    200,
    request('DELETE', `/appointments/${edgeAppointment.appointment.appt_id}`, { token: adminToken })
  );
  if (process.env.QA_ONLY_SHIFT_END === '1') {
    console.log(`FLOW_TEST_SUMMARY ${checks.length} checks passed`);
    return;
  }

  const appointment = await expectStatus(
    'admin creates pending appointment',
    201,
    request('POST', '/appointments', {
      token: adminToken,
      body: {
        pet_id: qa.petId,
        vet_id: vetId,
        appt_date: firstSlot.workDate,
        appt_time: firstSlot.time,
        appt_reason: 'ติดตามอาการ QA'
      }
    })
  );
  qa.appointmentId = appointment.appointment.appt_id;
  assert.equal(appointment.appointment.appt_date, firstSlot.workDate, 'created appointment date must match the date entered by staff');

  const adminAppointments = await expectStatus(
    'admin appointment list preserves the selected date',
    200,
    request('GET', '/appointments', { token: adminToken })
  );
  assert.equal(adminAppointments.find((item) => item.appt_id === qa.appointmentId)?.appt_date, firstSlot.workDate);

  const ownerAppointments = await expectStatus(
    'owner appointment list preserves the selected date',
    200,
    request('GET', `/appointments/my-appointments/${qa.userId}`, { token: userToken })
  );
  assert.equal(ownerAppointments.data.find((item) => item.appt_id === qa.appointmentId)?.appt_date, firstSlot.workDate);

  const availableSlots = await expectStatus(
    'owner sees only available appointment slots',
    200,
    request('GET', `/appointments/available-slots?date=${firstSlot.workDate}`, { token: userToken })
  );
  assert.ok(availableSlots.slots.some((slot) => slot.time === '13:00'));
  assert.ok(!availableSlots.slots.some((slot) => slot.time === firstSlot.time));

  await expectStatus('owner cannot request another owner pet', 403, request('POST', '/appointments/request', {
    token: userToken,
    body: { pet_id: 'PET_NOT_OWNED', appt_date: firstSlot.workDate, appt_time: '13:00', appt_reason: 'ทดสอบสิทธิ์' }
  }));

  const ownerRequest = await expectStatus(
    'owner requests appointment at an exact-minute time',
    201,
    request('POST', '/appointments/request', {
      token: userToken,
      body: { pet_id: qa.petId, appt_date: firstSlot.workDate, appt_time: '14:13', appt_reason: 'ตรวจอาการ QA' }
    })
  );
  qa.ownerRequestIds.push(ownerRequest.appointment.appt_id);
  assert.equal(ownerRequest.appointment.appt_status, 'รอคลินิกยืนยัน');
  assert.equal(ownerRequest.appointment.appt_date, firstSlot.workDate);
  assert.equal(ownerRequest.appointment.request_source, 'owner');
  assert.equal(ownerRequest.appointment.vet_id, null);
  assert.equal(ownerRequest.clinic_email_notification?.skipped, true);
  if (process.env.QA_ONLY_CLINIC_MAIL === '1') {
    const savedRequest = await pool.query('SELECT appt_status FROM tb_appointment WHERE appt_id = $1', [ownerRequest.appointment.appt_id]);
    assert.equal(savedRequest.rows[0]?.appt_status, 'รอคลินิกยืนยัน');
    record('owner request remains saved when SMTP is disabled');
    console.log(`FLOW_TEST_SUMMARY ${checks.length} checks passed`);
    return;
  }

  const slotsWhilePending = await expectStatus('pending request does not occupy slots', 200, request(
    'GET', `/appointments/available-slots?date=${firstSlot.workDate}`, { token: userToken }
  ));
  assert.ok(slotsWhilePending.slots.some((slot) => slot.time === '14:00'));

  const [reportYear, reportMonth] = firstSlot.workDate.split('-');
  const pendingReport = await expectStatus(
    'report does not count clinic-pending request as confirmed',
    200,
    request('GET', `/reports?month=${Number(reportMonth)}&year=${reportYear}`, { token: adminToken })
  );
  assert.equal(
    pendingReport.appointmentReport.items.find((item) => item.appt_id === ownerRequest.appointment.appt_id)?.appt_status,
    'รอคลินิกยืนยัน'
  );
  assert.equal(
    pendingReport.appointmentReport.confirmedAppointments,
    pendingReport.appointmentReport.items.filter((item) => item.appt_status === 'ยืนยัน').length
  );

  const competingRequest = await expectStatus('another pending request can propose the same time', 201, request('POST', '/appointments/request', {
    token: userToken,
    body: { pet_id: qa.petId, vet_id: vetId, appt_date: firstSlot.workDate, appt_time: '14:13', appt_reason: 'ตรวจซ้ำ QA' }
  }));
  qa.ownerRequestIds.push(competingRequest.appointment.appt_id);
  await expectStatus('owner cannot approve own request', 409, request('PATCH', `/appointments/${ownerRequest.appointment.appt_id}/respond`, {
    token: userToken, body: { action: 'accept' }
  }));
  await expectStatus('owner cannot approve request as clinic', 403, request('PATCH', `/appointments/requests/${ownerRequest.appointment.appt_id}/review`, {
    token: userToken, body: { action: 'approve' }
  }));
  await expectStatus('clinic cannot bypass request review with generic status change', 409, request('PUT', `/appointments/${ownerRequest.appointment.appt_id}/status`, {
    token: adminToken, body: { appt_status: 'ยืนยัน' }
  }));
  await expectStatus('clinic must choose a doctor for an any-doctor request', 400, request('PATCH', `/appointments/requests/${ownerRequest.appointment.appt_id}/review`, {
    token: adminToken, body: { action: 'approve' }
  }));
  await expectStatus('clinic approves owner appointment request', 200, request('PATCH', `/appointments/requests/${ownerRequest.appointment.appt_id}/review`, {
    token: adminToken, body: { action: 'approve', vet_id: vetId }
  }));
  await expectStatus('clinic cannot approve overlapping request', 409, request('PATCH', `/appointments/requests/${competingRequest.appointment.appt_id}/review`, {
    token: adminToken, body: { action: 'approve' }
  }));
  await expectStatus('clinic can reject overlapping request', 200, request('PATCH', `/appointments/requests/${competingRequest.appointment.appt_id}/review`, {
    token: adminToken, body: { action: 'reject', reason: 'เวลานี้ไม่ว่างแล้ว' }
  }));
  const approvedList = await expectStatus('owner sees approved request', 200, request('GET', `/appointments/my-appointments/${qa.userId}`, { token: userToken }));
  assert.equal(approvedList.data.find((item) => item.appt_id === ownerRequest.appointment.appt_id)?.appt_status, 'ยืนยัน');

  await expectStatus(
    'user cancels appointment with reason',
    200,
    request('PATCH', `/appointments/${qa.appointmentId}/respond`, {
      token: userToken,
      body: { action: 'cancel', cancel_reason: 'ไม่สะดวกในวันดังกล่าว' }
    })
  );

  const secondSlot = await createSchedule(adminToken, vetId, 40);
  const rejectedRequest = await expectStatus('owner sends another request', 201, request('POST', '/appointments/request', {
    token: userToken,
    body: { pet_id: qa.petId, appt_date: secondSlot.workDate, appt_time: '13:00', appt_reason: 'ติดตามอาการ QA' }
  }));
  qa.ownerRequestIds.push(rejectedRequest.appointment.appt_id);
  await expectStatus('clinic rejects request with reason', 200, request('PATCH', `/appointments/requests/${rejectedRequest.appointment.appt_id}/review`, {
    token: adminToken, body: { action: 'reject', reason: 'วันนั้นรับนัดเพิ่มไม่ได้' }
  }));
  const rejectedList = await expectStatus('owner sees rejection reason', 200, request('GET', `/appointments/my-appointments/${qa.userId}`, { token: userToken }));
  assert.equal(rejectedList.data.find((item) => item.appt_id === rejectedRequest.appointment.appt_id)?.cancel_reason, 'วันนั้นรับนัดเพิ่มไม่ได้');
  const canceledRequest = await expectStatus('owner reuses released slot', 201, request('POST', '/appointments/request', {
    token: userToken,
    body: { pet_id: qa.petId, appt_date: secondSlot.workDate, appt_time: '13:00', appt_reason: 'ขอนัดใหม่ QA' }
  }));
  qa.ownerRequestIds.push(canceledRequest.appointment.appt_id);
  await expectStatus('owner cancels pending clinic request', 200, request('PATCH', `/appointments/${canceledRequest.appointment.appt_id}/respond`, {
    token: userToken, body: { action: 'cancel', cancel_reason: 'เปลี่ยนใจ' }
  }));
  await expectStatus(
    'admin reschedules canceled appointment to pending',
    200,
    request('PUT', `/appointments/${qa.appointmentId}`, {
      token: adminToken,
      body: {
        vet_id: vetId,
        appt_date: secondSlot.workDate,
        appt_time: secondSlot.time,
        appt_reason: 'เลื่อนนัดตามวันที่ลูกค้าสะดวก',
        appt_status: 'ยกเลิก',
        cancel_reason: 'ไม่สะดวกในวันดังกล่าว',
        reschedule: true
      }
    })
  );
  await expectStatus(
    'user accepts rescheduled appointment',
    200,
    request('PATCH', `/appointments/${qa.appointmentId}/respond`, {
      token: userToken,
      body: { action: 'accept' }
    })
  );

  await expectStatus('reject negative treatment price', 400, request('POST', '/treatments', {
    token: adminToken,
    body: { pet_id: qa.petId, vet_id: vetId, services: [{ service_id: qa.serviceId, quantity: 1, price: -1 }] }
  }));
  await expectStatus('reject zero treatment quantity', 400, request('POST', '/treatments', {
    token: adminToken,
    body: { pet_id: qa.petId, vet_id: vetId, services: [{ service_id: qa.serviceId, quantity: 0, price: 100 }] }
  }));

  const treatment = await expectStatus(
    'create treatment with calculated service total',
    201,
    request('POST', '/treatments', {
      token: adminToken,
      body: {
        pet_id: qa.petId,
        vet_id: vetId,
        symptom: 'ตรวจสุขภาพ QA',
        diagnosis: 'สุขภาพปกติ',
        services: [{ service_id: qa.serviceId, quantity: 2, price: 700 }]
      }
    })
  );
  qa.treatmentId = treatment.treatment_id;

  const receipt = await expectStatus(
    'create receipt from treatment',
    201,
    request('POST', '/receipts', {
      token: adminToken,
      body: { treatment_id: qa.treatmentId, pay_method: 'เงินสด' }
    })
  );
  qa.receiptId = receipt.data.receipt_id;

  const protectedDelete = await expectStatus(
    'treatment with receipt cannot be deleted and explains why',
    409,
    request('DELETE', `/treatments/${qa.treatmentId}`, { token: adminToken })
  );
  assert.match(protectedDelete.message, /มีใบเสร็จแล้ว/);

  const deletableTreatment = await expectStatus(
    'create treatment without receipt for deletion check',
    201,
    request('POST', '/treatments', {
      token: adminToken,
      body: { pet_id: qa.petId, vet_id: vetId, symptom: 'บันทึกทดสอบการลบ', diagnosis: 'ไม่มีใบเสร็จ', services: [] }
    })
  );
  qa.deletableTreatmentId = deletableTreatment.treatment_id;
  await expectStatus(
    'treatment without receipt can be deleted',
    200,
    request('DELETE', `/treatments/${qa.deletableTreatmentId}`, { token: adminToken })
  );
  qa.deletableTreatmentId = null;

  let treatmentDetail = await expectStatus(
    'load treatment detail',
    200,
    request('GET', `/treatments/${qa.treatmentId}`, { token: adminToken })
  );
  assert.equal(Number(treatmentDetail.total_amount), 1400);
  assert.equal(treatmentDetail.services.length, 1);

  await expectStatus(
    'unpaid receipt follows treatment price edits',
    200,
    request('PUT', `/treatments/${qa.treatmentId}`, {
      token: adminToken,
      body: {
        pet_id: qa.petId,
        vet_id: vetId,
        symptom: 'ตรวจสุขภาพ QA',
        diagnosis: 'สุขภาพปกติ',
        services: [{
          detail_id: treatmentDetail.services[0].detail_id,
          service_id: qa.serviceId,
          quantity: 2,
          price: 800
        }]
      }
    })
  );

  let receiptDetail = await expectStatus(
    'load receipt detail with treatment link',
    200,
    request('GET', `/receipts/detail/${qa.receiptId}`, { token: adminToken })
  );
  assert.equal(Number(receiptDetail.data.receipt.total_amount), 1600);
  assert.equal(Number(receiptDetail.data.items[0].amount), 1600);

  await expectStatus(
    'mark receipt as paid',
    200,
    request('PUT', `/receipts/${qa.receiptId}/status`, {
      token: adminToken,
      body: { payment_status: 'ชำระเสร็จสิ้น', pay_method: 'เงินสด' }
    })
  );
  await expectStatus('invalid receipt status returns validation error', 400, request('PUT', `/receipts/${qa.receiptId}/status`, {
    token: adminToken, body: { payment_status: 'invalid' }
  }));
  await expectStatus('ambiguous receipt status is rejected', 400, request('PUT', `/receipts/${qa.receiptId}/status`, {
    token: adminToken, body: { payment_status: 'ไม่เสร็จ' }
  }));
  await expectStatus('reversal needs a reason', 400, request('PUT', `/receipts/${qa.receiptId}/status`, {
    token: adminToken, body: { payment_status: 'ยังไม่ได้ชำระ' }
  }));
  await expectStatus('reverse paid receipt with reason', 200, request('PUT', `/receipts/${qa.receiptId}/status`, {
    token: adminToken, body: { payment_status: 'ยังไม่ได้ชำระ', reason: 'รับชำระผิดใบเสร็จ' }
  }));
  const paymentEvents = await expectStatus('payment audit history', 200, request('GET', `/receipts/${qa.receiptId}/payment-events`, { token: adminToken }));
  assert.equal(paymentEvents.data.length, 2);
  assert.equal(paymentEvents.data[0].reason, 'รับชำระผิดใบเสร็จ');
  assert.equal(paymentEvents.data[0].changed_by_username, qa.adminUsername);
  await expectStatus('pay corrected receipt again', 200, request('PUT', `/receipts/${qa.receiptId}/status`, {
    token: adminToken, body: { payment_status: 'ชำระเสร็จสิ้น', pay_method: 'เงินสด' }
  }));
  await expectStatus(
    'missing receipt status update returns not found',
    404,
    request('PUT', '/receipts/RC_NOT_FOUND/status', {
      token: adminToken,
      body: { payment_status: 'ชำระเสร็จสิ้น', pay_method: 'เงินสด' }
    })
  );

  treatmentDetail = await expectStatus(
    'reload paid treatment detail',
    200,
    request('GET', `/treatments/${qa.treatmentId}`, { token: adminToken })
  );

  await expectStatus(
    'paid receipt blocks financial edits',
    409,
    request('PUT', `/treatments/${qa.treatmentId}`, {
      token: adminToken,
      body: {
        pet_id: qa.petId,
        vet_id: vetId,
        symptom: 'ตรวจสุขภาพ QA',
        diagnosis: 'สุขภาพปกติ',
        services: [{
          detail_id: treatmentDetail.services[0].detail_id,
          service_id: qa.serviceId,
          quantity: 2,
          price: 900
        }]
      }
    })
  );

  await expectStatus(
    'paid receipt allows non-financial treatment notes',
    200,
    request('PUT', `/treatments/${qa.treatmentId}`, {
      token: adminToken,
      body: {
        pet_id: qa.petId,
        vet_id: vetId,
        symptom: 'ติดตามอาการแล้ว',
        diagnosis: 'สุขภาพปกติ',
        services: treatmentDetail.services
      }
    })
  );

  const surgery = await expectStatus(
    'create surgery record',
    201,
    request('POST', '/admin/surgeries', {
      token: adminToken,
      body: {
        surg_type: 'ผ่าตัดทดสอบ QA',
        anesthesia: 'ดมยาสลบ',
        result: 'สำเร็จ',
        service_id: qa.serviceId,
        pet_id: qa.petId,
        vet_id: vetId
      }
    })
  );
  qa.surgeryId = surgery.surg_id;

  const vaccineDate = isoDateAfter(0);
  const vaccine = await expectStatus(
    'create vaccine record',
    201,
    request('POST', '/admin/vaccines', {
      token: adminToken,
      body: {
        vaccine_name: 'วัคซีนทดสอบ QA',
        lot_number: `LOT-${runId}`,
        vac_date: vaccineDate,
        service_id: qa.serviceId,
        pet_id: qa.petId,
        vet_id: vetId
      }
    })
  );
  qa.vaccineId = vaccine.vac_rec_id;
  const vaccineRows = await expectStatus(
    'vaccine edit receives date input value',
    200,
    request('GET', '/admin/vaccines', { token: adminToken })
  );
  assert.equal(vaccineRows.find((item) => item.vac_rec_id === qa.vaccineId)?.vac_date, vaccineDate);

  await expectStatus(
    'vaccine edit keeps injection date',
    200,
    request('PUT', `/admin/vaccines/${qa.vaccineId}`, {
      token: adminToken,
      body: {
        vaccine_name: 'วัคซีนทดสอบ QA',
        lot_number: `LOT-${runId}`,
        vac_date: vaccineDate,
        service_id: qa.serviceId,
        pet_id: qa.petId,
        vet_id: vetId
      }
    })
  );
  const editedVaccineRows = await expectStatus(
    'vaccine date remains unchanged after edit',
    200,
    request('GET', '/admin/vaccines', { token: adminToken })
  );
  assert.equal(editedVaccineRows.find((item) => item.vac_rec_id === qa.vaccineId)?.vac_date, vaccineDate);

  await expectStatus('user pet history', 200, request('GET', `/history/pet-history/${qa.petId}`, { token: userToken }));
  await expectStatus('user pet summary', 200, request('GET', `/history/pet-summary/${qa.petId}`, { token: userToken }));
  await expectStatus('user receipt list', 200, request('GET', `/receipts/my-receipts/${qa.userId}`, { token: userToken }));
  await expectStatus('user own receipt detail', 200, request('GET', `/receipts/detail/${qa.receiptId}`, { token: userToken }));
  await expectStatus('user appointment list', 200, request('GET', `/appointments/my-appointments/${qa.userId}`, { token: userToken }));
  await expectStatus(
    'future appointment cannot be completed early',
    409,
    request('PUT', `/appointments/${qa.appointmentId}/status`, {
      token: adminToken,
      body: { appt_status: 'เสร็จสิ้น' }
    })
  );
  await pool.query(
    `UPDATE tb_appointment
     SET appt_date = CURRENT_DATE - INTERVAL '1 day', appt_time = '09:00:00'
     WHERE appt_id = $1`,
    [qa.appointmentId]
  );
  await expectStatus(
    'admin completes past appointment',
    200,
    request('PUT', `/appointments/${qa.appointmentId}`, {
      token: adminToken,
      body: {
        vet_id: vetId,
        appt_date: isoDateAfter(-1),
        appt_time: '09:00',
        appt_reason: 'ปิดงานนัดหมาย QA',
        appt_status: 'เสร็จสิ้น'
      }
    })
  );
  const completedAppointments = await expectStatus(
    'user sees completed appointment status',
    200,
    request('GET', `/appointments/my-appointments/${qa.userId}`, { token: userToken })
  );
  assert.equal(
    completedAppointments.data.find((item) => item.appt_id === qa.appointmentId)?.appt_status,
    'เสร็จสิ้น'
  );

  await expectStatus(
    'expense rejects zero amount',
    400,
    request('POST', '/expenses', {
      token: adminToken,
      body: { exp_title: 'invalid amount', exp_amount: 0, exp_date: isoDateAfter(0) }
    })
  );
  await expectStatus(
    'missing expense update returns not found',
    404,
    request('PUT', '/expenses/EX_NOT_FOUND', {
      token: adminToken,
      body: { exp_title: 'missing', exp_amount: 1, exp_date: isoDateAfter(0) }
    })
  );

  const category = await expectStatus(
    'create expense category',
    201,
    request('POST', '/expenses/categories', {
      token: adminToken,
      body: { category_name: `QA category ${runId}`, type: 'รายจ่าย' }
    })
  );
  qa.categoryId = category.category_id;
  const expenseDate = isoDateAfter(0);
  const expense = await expectStatus(
    'create clinic expense',
    201,
    request('POST', '/expenses', {
      token: adminToken,
      body: {
        exp_title: `QA expense ${runId}`,
        exp_amount: 123,
        exp_date: expenseDate,
        category_id: qa.categoryId
      }
    })
  );
  qa.expenseId = expense.exp_id;

  const expenseMonth = Number(expenseDate.slice(5, 7));
  const expenseYear = Number(expenseDate.slice(0, 4));
  const expenseQuery = `month=${expenseMonth}&year=${expenseYear}`;
  const listedExpenses = await expectStatus(
    'expense date returned without timezone shift',
    200,
    request('GET', `/expenses?${expenseQuery}`, { token: adminToken })
  );
  assert.equal(listedExpenses.find((item) => item.exp_id === qa.expenseId)?.exp_date, expenseDate);

  await expectStatus(
    'expense edit keeps selected date',
    200,
    request('PUT', `/expenses/${qa.expenseId}`, {
      token: adminToken,
      body: {
        exp_title: `QA expense ${runId}`,
        exp_amount: 123,
        exp_date: expenseDate,
        category_id: qa.categoryId
      }
    })
  );
  const editedExpenses = await expectStatus(
    'expense date remains unchanged after edit',
    200,
    request('GET', `/expenses?${expenseQuery}`, { token: adminToken })
  );
  assert.equal(editedExpenses.find((item) => item.exp_id === qa.expenseId)?.exp_date, expenseDate);

  const dashboardExpenses = await expectStatus(
    'dashboard expense date returned without timezone shift',
    200,
    request('GET', `/dashboard?${expenseQuery}`, { token: adminToken })
  );
  assert.equal(dashboardExpenses.details.expense.find((item) => item.exp_title === `QA expense ${runId}`)?.exp_date, expenseDate);

  const reportExpenses = await expectStatus(
    'report expense date returned without timezone shift',
    200,
    request('GET', `/reports?${expenseQuery}`, { token: adminToken })
  );
  assert.equal(reportExpenses.financialReport.expenses.find((item) => item.exp_id === qa.expenseId)?.exp_date, expenseDate);

  const smokeEndpoints = [
    '/admin/dashboard',
    '/admin/users',
    '/admin/owners',
    '/admin/pets',
    '/admin/clinic',
    '/admin/veterinarians',
    '/admin/surgeries',
    '/admin/vaccines',
    '/appointments',
    '/appointments/pets-list',
    '/appointments/veterinarians-list',
    '/appointments/vet-schedules',
    '/services',
    '/treatments',
    '/receipts',
    '/expenses/categories',
    '/expenses',
    '/dashboard',
    '/reports'
  ];
  for (const endpoint of smokeEndpoints) {
    await expectStatus(`admin smoke ${endpoint}`, 200, request('GET', endpoint, { token: adminToken }));
  }

  await expectStatus('public clinic information', 200, request('GET', '/clinic'));
  await expectStatus('public services', 200, request('GET', '/services/public'));
  await pool.query("UPDATE tb_user SET user_role = 'user' WHERE user_id = $1", [qa.adminUserId]);
  await expectStatus('demoted admin token cannot access admin data', 401, request('GET', '/admin/owners', { token: adminToken }));
  console.log(`FLOW_TEST_SUMMARY ${checks.length} checks passed`);
};

(async () => {
  let exitCode = 0;
  try {
    await main();
  } catch (error) {
    exitCode = 1;
    console.error('FLOW_TEST_FAILED', error.stack || error.message);
  } finally {
    try {
      await cleanup();
      console.log('QA cleanup complete');
    } catch (cleanupError) {
      exitCode = 1;
      console.error('QA cleanup failed', cleanupError.stack || cleanupError.message);
    }
    await pool.end().catch(() => {});
    process.exit(exitCode);
  }
})();
