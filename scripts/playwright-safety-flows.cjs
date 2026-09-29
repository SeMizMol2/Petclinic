// Read-only browser verification: all API calls are mocked and no database is changed.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const appUrl = process.env.E2E_APP_URL || 'http://127.0.0.1:5173';
const browserPath = process.env.PLAYWRIGHT_CHROMIUM_PATH || 'C:\\Users\\stamp\\AppData\\Local\\ms-playwright\\chromium-1228\\chrome-win64\\chrome.exe';
const paid = 'ชำระเสร็จสิ้น';
const unpaid = 'ยังไม่ได้ชำระ';

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: browserPath });
  try {
    const errors = [];
    const adminContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await adminContext.addInitScript(() => {
      localStorage.setItem('token', 'mock-admin-token');
      localStorage.setItem('user', JSON.stringify({ user_id: 'A1', role: 'admin', username: 'qa-admin' }));
    });
    const page = await adminContext.newPage();
    page.on('pageerror', (err) => errors.push(err.message));
    const receipt = { receipt_id: 'RC_TEST', payment_status: paid, pay_method: 'เงินสด', owner_name: 'คุณทดสอบ', pet_name: 'มะลิ', total_amount: 500, issue_date: '2026-09-29T09:00:00' };
    const statusUpdates = [];
    await page.route('**/api/receipts**', async (route) => {
      const url = new URL(route.request().url());
      const method = route.request().method();
      const reply = (status, json) => route.fulfill({ status, json, headers: { 'Access-Control-Allow-Origin': '*' } });
      if (method === 'PUT' && url.pathname.endsWith('/status')) {
        const body = route.request().postDataJSON();
        statusUpdates.push(body);
        receipt.payment_status = body.payment_status;
        return reply(200, { success: true });
      }
      if (url.pathname.endsWith('/payment-events')) return reply(200, { success: true, data: [] });
      if (url.pathname.includes('/detail/')) return reply(200, { success: true, data: { receipt, items: [] } });
      return reply(200, { success: true, data: [receipt] });
    });
    await page.goto(`${appUrl}/admin/receipts`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'ยกเลิกชำระ' }).click();
    await page.getByRole('dialog', { name: 'ยกเลิกการชำระเงิน' }).waitFor();
    await page.getByRole('button', { name: 'ยืนยันยกเลิกชำระ' }).click();
    assert.equal(statusUpdates.length, 0, 'Empty reason must not call API');
    await page.locator('#reversal-reason').fill('รับชำระผิดใบเสร็จ');
    await page.getByRole('button', { name: 'ยืนยันยกเลิกชำระ' }).click();
    await page.getByRole('dialog', { name: 'ยกเลิกการชำระเงิน' }).waitFor({ state: 'hidden' });
    assert.equal(statusUpdates.length, 1);
    assert.equal(statusUpdates[0].reason, 'รับชำระผิดใบเสร็จ');
    console.log('PASS admin reversal requires reason and confirms once');

    const userContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await userContext.addInitScript(() => {
      localStorage.setItem('token', 'expired-token');
      localStorage.setItem('user', JSON.stringify({ user_id: 'U1', role: 'user' }));
    });
    const petsPage = await userContext.newPage();
    petsPage.on('pageerror', (err) => errors.push(err.message));
    await petsPage.route('**/api/pets', (route) => route.fulfill({ status: 401, json: { message: 'token หมดอายุ' }, headers: { 'Access-Control-Allow-Origin': '*' } }));
    await petsPage.goto(`${appUrl}/user/pets`, { waitUntil: 'networkidle' });
    await petsPage.waitForURL('**/login?reason=session-expired');
    assert.equal(await petsPage.getByText('เพื่อความปลอดภัย กรุณาเข้าสู่ระบบอีกครั้ง ข้อมูลของคุณยังอยู่ครบ').count(), 1);
    assert.equal(await petsPage.evaluate(() => localStorage.getItem('token')), null);
    console.log('PASS expired pet session redirects to login instead of showing empty pets');

    const retryContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await retryContext.addInitScript(() => {
      localStorage.setItem('token', 'valid-mock-token');
      localStorage.setItem('user', JSON.stringify({ user_id: 'U1', role: 'user' }));
    });
    const retryPage = await retryContext.newPage();
    retryPage.on('pageerror', (err) => errors.push(err.message));
    await retryPage.route('**/api/pets', (route) => route.fulfill({ status: 503, json: { message: 'ระบบขัดข้องชั่วคราว' }, headers: { 'Access-Control-Allow-Origin': '*' } }));
    await retryPage.goto(`${appUrl}/user/pets`, { waitUntil: 'networkidle' });
    await retryPage.getByRole('heading', { name: 'โหลดข้อมูลสัตว์เลี้ยงไม่สำเร็จ' }).waitFor();
    assert.equal(await retryPage.getByRole('heading', { name: 'ยังไม่มีข้อมูลสัตว์เลี้ยง' }).count(), 0);
    assert.equal(await retryPage.getByRole('button', { name: 'ลองอีกครั้ง' }).count(), 1);
    console.log('PASS pet API failure shows retry state, not false empty state');
    assert.deepEqual(errors, []);
    console.log('SAFETY_UI_SUMMARY 3 checks passed');
  } finally {
    await browser.close();
  }
})().catch((err) => { console.error(err); process.exitCode = 1; });
