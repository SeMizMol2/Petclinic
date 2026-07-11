const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Users\\stamp\\AppData\\Local\\ms-playwright\\chromium-1228\\chrome-win64\\chrome.exe'
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const pageErrors = [];
  const failedRequests = [];

  page.on('pageerror', (err) => pageErrors.push(err.message));
  page.on('requestfailed', (req) => {
    failedRequests.push(`${req.method()} ${req.url()} :: ${req.failure()?.errorText || 'failed'}`);
  });

  await page.goto('http://localhost:5173/admin/receipts', { waitUntil: 'networkidle' });

  if (page.url().includes('/login')) {
    await page.locator('input').nth(0).fill('admin');
    await page.locator('input').nth(1).fill('admin1234');
    await page.locator('button[type="submit"]').click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1500);
  }

  await page.goto('http://localhost:5173/admin/receipts', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  let modalPreview = '';
  const bodyText = await page.locator('body').innerText();
  const hasViewButton = bodyText.includes('ดู/พิมพ์');

  if (hasViewButton) {
    await page.getByRole('button', { name: 'ดู/พิมพ์' }).first().click();
    await page.waitForTimeout(1000);
    modalPreview = (await page.locator('body').innerText()).slice(0, 2200);
  }

  const result = {
    url: page.url(),
    title: await page.title(),
    bodyPreview: bodyText.slice(0, 1500),
    hasViewButton,
    modalPreview,
    pageErrors,
    failedRequests
  };

  console.log(JSON.stringify(result, null, 2));
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
