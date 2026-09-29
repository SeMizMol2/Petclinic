const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Users/stamp/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  let puts = 0, failSave = false, passwordPuts = 0;
  await page.addInitScript(() => {
    localStorage.setItem('token', 'mock-token');
    localStorage.setItem('user', JSON.stringify({ role: 'user', username: 'owner', owner_name: 'คุณเจ้าของ' }));
  });
  await page.route('**/api/user/**', async route => {
    const method = route.request().method();
    const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS' };
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (method === 'PUT' && route.request().url().endsWith('/me/password')) {
      passwordPuts++;
      const body = route.request().postDataJSON();
      const valid = body.current_password === 'OldPass123!' && body.new_password === 'NewPass123!';
      return route.fulfill({ status: valid ? 200 : 400, headers, json: { message: valid ? 'เปลี่ยนรหัสผ่านสำเร็จ' : 'รหัสผ่านปัจจุบันไม่ถูกต้อง' } });
    }
    if (method === 'PUT') {
      puts++;
      return route.fulfill({ status: failSave ? 400 : 200, headers, json: { message: failSave ? 'อีเมลนี้ถูกใช้งานแล้ว' : 'บันทึกสำเร็จ' } });
    }
    return route.fulfill({ headers, json: { username: 'owner', owner_name: 'คุณเจ้าของ', owner_email: 'owner@example.com', tel: '0812345678' } });
  });
  try {
    await page.goto('http://127.0.0.1:5173/user/profile');
    await page.getByRole('button', { name: 'แก้ไขข้อมูล', exact: true }).waitFor();
    fs.mkdirSync('.impeccable/review', { recursive: true });
    await page.screenshot({ path: '.impeccable/review/owner-profile-desktop.png' });
    await page.getByRole('button', { name: 'แก้ไขข้อมูล', exact: true }).click();
    await page.getByLabel('ชื่อ-นามสกุล', { exact: true }).fill('ชื่อที่ยังไม่บันทึก');
    await page.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
    assert.equal(puts, 0);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('user')).owner_name), 'คุณเจ้าของ');
    await page.getByRole('button', { name: 'แก้ไขข้อมูล', exact: true }).click();
    assert.equal(await page.getByLabel('ชื่อ-นามสกุล', { exact: true }).inputValue(), 'คุณเจ้าของ');
    await page.getByLabel('ชื่อ-นามสกุล', { exact: true }).fill('เจ้าของชื่อใหม่');
    failSave = true;
    await page.getByRole('button', { name: 'บันทึกข้อมูล', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'อีเมลนี้ถูกใช้งานแล้ว' }).waitFor();
    assert.equal(await page.getByLabel('ชื่อ-นามสกุล', { exact: true }).inputValue(), 'เจ้าของชื่อใหม่');
    failSave = false;
    await page.getByRole('button', { name: 'บันทึกข้อมูล', exact: true }).click();
    await page.getByText('บันทึกข้อมูลเรียบร้อยแล้ว', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('user')).role), 'user');
    assert.match(await page.locator('.workspace-user').innerText(), /เจ้าของชื่อใหม่/);
    await page.getByRole('button', { name: 'เปลี่ยนรหัสผ่าน' }).click();
    await page.getByLabel('รหัสผ่านปัจจุบัน').fill('wrong-password');
    await page.getByLabel('รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)').fill('NewPass123!');
    await page.getByLabel('ยืนยันรหัสผ่านใหม่').fill('Mismatch123!');
    await page.getByRole('button', { name: 'บันทึกรหัสผ่านใหม่' }).click();
    await page.getByText('รหัสผ่านใหม่กับช่องยืนยันไม่ตรงกัน').waitFor();
    assert.equal(passwordPuts, 0);
    await page.getByLabel('ยืนยันรหัสผ่านใหม่').fill('NewPass123!');
    await page.getByRole('button', { name: 'บันทึกรหัสผ่านใหม่' }).click();
    await page.getByText('รหัสผ่านปัจจุบันไม่ถูกต้อง').waitFor();
    assert.equal(passwordPuts, 1);
    await page.getByLabel('รหัสผ่านปัจจุบัน').fill('OldPass123!');
    await page.getByRole('button', { name: 'บันทึกรหัสผ่านใหม่' }).click();
    await page.getByText('เปลี่ยนรหัสผ่านเรียบร้อยแล้ว ใช้รหัสใหม่ในการเข้าสู่ระบบครั้งถัดไป').waitFor();
    assert.equal(passwordPuts, 2);
    await page.getByRole('button', { name: 'เปลี่ยนรหัสผ่าน' }).click();
    await page.screenshot({ path: '.impeccable/review/owner-password-desktop.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('.password-section').scrollIntoViewIfNeeded();
    await page.screenshot({ path: '.impeccable/review/owner-password-mobile.png', fullPage: true });
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    }
    await page.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
    await page.getByRole('button', { name: 'แก้ไขข้อมูล', exact: true }).click();
    await page.locator('.profile-panel').scrollIntoViewIfNeeded();
    await page.screenshot({ path: '.impeccable/review/owner-profile-mobile.png' });
    const adminPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await adminPage.addInitScript(() => {
      localStorage.setItem('token', 'mock-admin-token');
      localStorage.setItem('user', JSON.stringify({ user_id: 'A1', role: 'admin', username: 'qa-admin' }));
    });
    let ownerCreates = 0, createdBody = null, credentialNotice = '';
    adminPage.on('dialog', async dialog => { credentialNotice = dialog.message(); await dialog.accept(); });
    await adminPage.route('**/api/admin/owners', route => {
      const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      if (route.request().method() === 'POST') {
        ownerCreates++;
        createdBody = route.request().postDataJSON();
        return route.fulfill({ status: 201, headers, json: { username: 'owner-test', initial_password: 'RandomPassword123456789' } });
      }
      return route.fulfill({ headers, json: [] });
    });
    await adminPage.goto('http://127.0.0.1:5173/admin/owners');
    await adminPage.getByRole('button', { name: 'เพิ่มเจ้าของสัตว์' }).click();
    await adminPage.locator('.modal-actions').scrollIntoViewIfNeeded();
    await adminPage.screenshot({ path: '.impeccable/review/admin-owner-password-mobile.png', fullPage: true });
    await adminPage.getByLabel('ชื่อ-นามสกุล').fill('เจ้าของทดสอบ');
    await adminPage.getByLabel('รหัสผ่านเริ่มต้น (ไม่บังคับ)').fill('123456');
    await adminPage.getByRole('button', { name: 'บันทึกข้อมูล' }).click();
    await adminPage.getByText('รหัสผ่านที่กำหนดเองต้องมีอย่างน้อย 8 ตัวอักษร หรือเว้นว่างให้ระบบสร้าง').waitFor();
    assert.equal(ownerCreates, 0);
    await adminPage.getByLabel('รหัสผ่านเริ่มต้น (ไม่บังคับ)').fill('');
    await adminPage.getByRole('button', { name: 'บันทึกข้อมูล' }).click();
    await adminPage.waitForFunction(() => !document.querySelector('.modal-overlay'));
    assert.equal(ownerCreates, 1);
    assert.equal(createdBody.password, '');
    assert.match(credentialNotice, /RandomPassword123456789/);
    assert.equal(await adminPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    console.log('PASS: profile edits, password mismatch/error/success, admin generated password, mobile widths 390/320');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
