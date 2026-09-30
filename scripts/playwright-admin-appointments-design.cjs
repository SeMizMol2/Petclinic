const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Users/stamp/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  let records = [
    { appt_id: 'A1', pet_name: 'มีตังค์', owner_name: 'กัส', vet_id: 'V1', vet_name: 'ภัครินทร์ วงษ์ลา', appt_date: today, appt_time: '13:34', appt_reason: 'ติดตามอาการหลังการรักษา', appt_status: 'รอคลินิกยืนยัน' },
    { appt_id: 'A2', pet_name: 'มุกดำ', owner_name: 'กัส', appt_date: today, appt_time: '10:15', appt_reason: 'ตรวจสุขภาพ', appt_status: 'รอคลินิกยืนยัน' },
    { appt_id: 'A3', pet_name: 'โมจิ', owner_name: 'แอน', vet_id: 'V1', vet_name: 'ภัครินทร์ วงษ์ลา', appt_date: today, appt_time: '09:00', appt_reason: 'ตรวจสุขภาพ', appt_status: 'ยืนยัน' }
  ];
  let reviews = [];
  await page.addInitScript(() => { localStorage.setItem('token', 'mock'); localStorage.setItem('user', JSON.stringify({ role: 'admin', username: 'admin' })); });
  page.on('dialog', dialog => dialog.accept());
  await page.route('**/api/**', async route => {
    const req = route.request(), path = new URL(req.url()).pathname;
    const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (req.method() === 'PATCH') {
      const body = req.postDataJSON(); reviews.push(body);
      const id = path.split('/').at(-2);
      records = records.map(r => r.appt_id === id ? { ...r, appt_status: body.action === 'approve' ? 'ยืนยัน' : 'ยกเลิก' } : r);
      return route.fulfill({ headers, json: { success: true } });
    }
    let json = [];
    if (path.endsWith('/appointments')) json = records;
    if (path.endsWith('/pets-list')) json = [
      { pet_id: 'P1', pet_name: 'มีตังค์', owner_name: 'กัส' },
      { pet_id: 'P2', pet_name: 'มุกดำ', owner_name: 'กัส' }
    ];
    if (path.endsWith('/veterinarians-list')) json = [{ vet_id: 'V1', vet_name: 'ภัครินทร์ วงษ์ลา' }];
    if (path.endsWith('/vet-schedules')) json = [{ schedule_id: 'S1', vet_id: 'V1', vet_name: 'ภัครินทร์ วงษ์ลา', work_date: today, start_time: '09:00', end_time: '17:00' }];
    return route.fulfill({ headers, json });
  });
  try {
    await page.goto('http://127.0.0.1:5173/admin/appointments');
    await page.locator('.request-row').first().waitFor();
    assert.equal(await page.locator('.request-row').count(), 2);
    await page.locator('.compare-button').first().click();
    assert.equal(await page.locator('.schedule-date-picker input').inputValue(), today);
    assert.equal(await page.locator('.shift-item').count(), 1);
    fs.mkdirSync('.impeccable/review', { recursive: true });
    await page.screenshot({ path: '.impeccable/review/admin-appointments-desktop.png' });
    await page.locator('.request-row').first().getByRole('button', { name: 'ยืนยันนัด', exact: true }).click();
    await page.getByText('ยืนยันคำขอนัดหมายแล้ว', { exact: true }).waitFor();
    assert.equal(reviews[0].action, 'approve');
    await page.getByRole('button', { name: 'ไม่รับคำขอ', exact: true }).click();
    await page.locator('.rejection-form input').fill('คลินิกไม่สะดวกช่วงนี้');
    await page.getByRole('button', { name: 'ยืนยันไม่รับนัด', exact: true }).click();
    await page.locator('.quiet-empty').first().waitFor();
    assert.equal(reviews[1].reason, 'คลินิกไม่สะดวกช่วงนี้');
    await page.getByRole('button', { name: /^นัดวันนี้/ }).click();
    assert.equal(await page.locator('.table-panel tbody tr').count(), 2);
    await page.getByRole('button', { name: /^รายการทั้งหมด/ }).click();
    assert.equal(await page.locator('.table-panel tbody tr').count(), 3);
    await page.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
    assert.equal(await page.locator('.table-panel tbody tr').count(), 1);
    await page.getByRole('button', { name: 'เพิ่มการนัดหมาย', exact: true }).click();
    await page.getByRole('heading', { name: 'เพิ่มการนัดหมายใหม่' }).waitFor();
    const petSearch = page.locator('#appointment-pet-search');
    await petSearch.fill('มี');
    const petDropdown = page.locator('#appointment-pet-options');
    await petDropdown.waitFor();
    const searchBox = await petSearch.boundingBox();
    const dropdownBox = await petDropdown.boundingBox();
    const modalBox = await page.locator('.appointment-modal').boundingBox();
    assert.ok(searchBox && dropdownBox && modalBox);
    assert.ok(dropdownBox.x >= modalBox.x && dropdownBox.x + dropdownBox.width <= modalBox.x + modalBox.width);
    assert.ok(Math.abs(dropdownBox.width - searchBox.width) <= 2);
    assert.ok(dropdownBox.y >= searchBox.y + searchBox.height);
    assert.equal(await petDropdown.getByRole('option').count(), 1);
    fs.mkdirSync('tmp', { recursive: true });
    await page.screenshot({ path: 'tmp/admin-appointment-pet-search-desktop.png' });
    await petDropdown.getByRole('option').click();
    assert.match(await petSearch.inputValue(), /มีตังค์/);
    await page.getByRole('button', { name: 'ปิด', exact: true }).click();
    await page.locator('.schedule-manager summary').click();
    assert.equal(await page.locator('.shift-form').isVisible(), true);
    await page.locator('.schedule-manager summary').click();
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('.table-panel').scrollIntoViewIfNeeded();
    await page.screenshot({ path: '.impeccable/review/admin-appointments-mobile.png' });
    await page.getByRole('button', { name: 'เพิ่มการนัดหมาย', exact: true }).click();
    await page.locator('#appointment-pet-search').fill('มี');
    await page.locator('#appointment-pet-options').waitFor();
    const mobileDropdownBox = await page.locator('#appointment-pet-options').boundingBox();
    const mobileModalBox = await page.locator('.appointment-modal').boundingBox();
    assert.ok(mobileDropdownBox && mobileModalBox);
    assert.ok(mobileDropdownBox.x >= mobileModalBox.x && mobileDropdownBox.x + mobileDropdownBox.width <= mobileModalBox.x + mobileModalBox.width);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: 'tmp/admin-appointment-pet-search-mobile.png' });
    console.log('PASS: request review/rejection payloads, date comparison, tabs, status filter, add modal, schedule form, responsive 390/320');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
