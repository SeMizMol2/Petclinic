// UI verification with mocked read-only API responses; never touches the database.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const appUrl = process.env.E2E_APP_URL || 'http://127.0.0.1:5173';
const browserPath = process.env.PLAYWRIGHT_CHROMIUM_PATH || 'C:\\Users\\stamp\\AppData\\Local\\ms-playwright\\chromium-1228\\chrome-win64\\chrome.exe';
const captureDir = path.join(__dirname, '..', '.impeccable', 'review');
const rows = [
  { receipt_id: 'RC_PREVIEW_1', pet_id: 'P1', pet_name: 'มีตังค์', pet_image: null, treatment_id: 'TR018', treatment_date: '2026-09-26', issue_date: '2026-09-26', total_amount: '700.00', payment_status: 'ยังไม่ได้ชำระ', pay_method: 'เงินสด', pay_date: null },
  { receipt_id: 'RC_PREVIEW_2', pet_id: 'P2', pet_name: 'มุกดำ', pet_image: null, treatment_id: 'TR017', treatment_date: '2026-09-24', issue_date: '2026-09-24', total_amount: '500.00', payment_status: 'ยังไม่ได้ชำระ', pay_method: 'โอนเงิน', pay_date: null },
  { receipt_id: 'RC_PREVIEW_3', pet_id: 'P1', pet_name: 'มีตังค์', pet_image: null, treatment_id: 'TR016', treatment_date: '2026-09-20', issue_date: '2026-09-20', total_amount: '450.00', payment_status: 'ชำระเสร็จสิ้น', pay_method: 'เงินสด', pay_date: '2026-09-20' }
];
const items = [
  { detail_id: 'D1', description: 'ตรวจสุขภาพทั่วไป', amount: '300.00' },
  { detail_id: 'D2', description: 'ค่ายา', amount: '400.00' }
];
let scenario = 'normal';
let failSecondDetail = true;
const requests = [];
const issues = [];
let browser;
let checks = 0;
const pass = (name) => { checks++; console.log('PASS ' + name); };

(async () => {
  try {
    browser = await chromium.launch({ headless: true, executablePath: browserPath });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
    await context.addInitScript(() => {
      localStorage.setItem('token', 'receipt-ui-preview');
      localStorage.setItem('user', JSON.stringify({ user_id: 'PREVIEW', role: 'user', owner_name: 'คุณ Gus' }));
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => issues.push(error.message));
    await page.route('**/api/receipts/**', async (route) => {
      requests.push({ method: route.request().method(), url: route.request().url() });
      const url = new URL(route.request().url());
      const response = (status, json) => route.fulfill({ status, json, headers: { 'Access-Control-Allow-Origin': '*' } });
      if (url.pathname.includes('/my-receipts/')) {
        if (scenario === 'error') return response(500, { message: 'โหลดรายการไม่สำเร็จ กรุณาลองอีกครั้ง' });
        return response(200, { success: true, data: scenario === 'empty' ? [] : scenario === 'paid-only' ? [rows[2]] : rows });
      }
      const id = url.pathname.split('/').pop();
      if (id === 'RC_PREVIEW_2' && failSecondDetail) {
        failSecondDetail = false;
        return response(500, { message: 'โหลดรายละเอียดไม่สำเร็จ กรุณาลองอีกครั้ง' });
      }
      return response(200, { success: true, data: { receipt: rows.find((row) => row.receipt_id === id), items: id === 'RC_PREVIEW_2' ? [] : id === 'RC_PREVIEW_3' ? [{ detail_id: 'D3', description: 'ตรวจสุขภาพทั่วไป', amount: '450.00' }] : items } });
    });
    await page.goto(appUrl + '/user/receipts', { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'ค่าใช้จ่ายและการชำระเงิน' }).waitFor();
    assert.equal(await page.locator('.balance-amount').innerText(), '1,200.00 บาท');
    assert.equal(await page.locator('.receipt-row').count(), 2);
    pass('unpaid balance and default filter');
    const first = page.locator('.receipt-row').filter({ hasText: 'RC_PREVIEW_1' });
    await first.getByRole('button', { name: /ดูรายละเอียด/ }).click();
    await first.getByRole('heading', { name: 'รายละเอียดค่าใช้จ่าย' }).waitFor();
    await first.getByText('ค่ายา', { exact: true }).waitFor();
    assert.equal(await first.getByText('ใบเสร็จรับเงิน', { exact: true }).count(), 0);
    pass('unpaid cost details expand inline without receipt wording');
    fs.mkdirSync(captureDir, { recursive: true });
    await page.screenshot({ path: path.join(captureDir, 'owner-receipts-desktop.png'), fullPage: true });
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No horizontal overflow at ' + width);
      if (width === 390) {
        await page.screenshot({ path: path.join(captureDir, 'owner-receipts-mobile.png') });
        await first.locator('.cost-table').scrollIntoViewIfNeeded();
        assert.ok(await first.locator('.cost-table').isVisible());
        await page.screenshot({ path: path.join(captureDir, 'owner-receipts-mobile-detail.png') });
        await page.evaluate(() => window.scrollTo(0, 0));
      }
    }
    pass('mobile 390px and 320px layout without overflow');
    await page.setViewportSize({ width: 1440, height: 1050 });
    await first.getByRole('button', { name: /ซ่อนรายละเอียด/ }).click();
    await first.getByRole('button', { name: /ดูรายละเอียด/ }).click();
    assert.equal(requests.filter((request) => request.url.endsWith('/detail/RC_PREVIEW_1')).length, 1);
    pass('detail cache avoids duplicate requests');
    const second = page.locator('.receipt-row').filter({ hasText: 'RC_PREVIEW_2' });
    await second.getByRole('button', { name: /ดูรายละเอียด/ }).click();
    await second.getByRole('alert').waitFor();
    await second.getByRole('button', { name: 'ลองโหลดรายละเอียดอีกครั้ง' }).click();
    await second.getByText('ยังไม่มีรายละเอียดแยกรายการ กรุณาสอบถามคลินิก').waitFor();
    pass('detail error retry and missing item state');
    await page.getByRole('button', { name: /^ชำระแล้ว/ }).click();
    assert.equal(await page.locator('.receipt-row').count(), 1);
    const paid = page.locator('.receipt-row');
    await paid.getByRole('button', { name: /ดูรายละเอียด/ }).click();
    await paid.getByRole('heading', { name: 'ใบเสร็จรับเงิน' }).waitFor();
    await paid.getByText('วันที่ชำระ', { exact: true }).waitFor();
    pass('paid receipt and payment date');
    await page.getByRole('button', { name: /^ทั้งหมด/ }).click();
    assert.equal(await page.locator('.receipt-row').count(), 3);
    pass('all filter shows every record');
    scenario = 'error';
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'ยังโหลดรายการไม่ได้' }).waitFor();
    scenario = 'normal';
    await page.getByRole('button', { name: 'ลองอีกครั้ง', exact: true }).click();
    await page.locator('.receipt-row').first().waitFor();
    pass('list error retries without misleading empty state');
    scenario = 'empty';
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'ยังไม่มีรายการค่าใช้จ่าย' }).waitFor();
    pass('empty owner account guidance');
    scenario = 'paid-only';
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('.receipt-row').waitFor();
    assert.equal(await page.getByRole('button', { name: /^ชำระแล้ว/ }).getAttribute('aria-pressed'), 'true');
    await page.getByRole('button', { name: /^ค้างชำระ/ }).click();
    await page.getByRole('heading', { name: 'ไม่มีรายการค้างชำระ' }).waitFor();
    pass('paid-only default and empty unpaid filter');
    assert.ok(requests.every((request) => request.method === 'GET'), 'UI must not write data');
    assert.deepEqual(issues, []);
    pass('read-only API calls and no browser errors');
    console.log('RECEIPTS_UI_SUMMARY ' + checks + ' checks passed; mocked API only');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally { if (browser) await browser.close(); }
})();
