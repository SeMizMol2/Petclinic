const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Users\\stamp\\AppData\\Local\\ms-playwright\\chromium-1228\\chrome-win64\\chrome.exe'
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  const pageErrors = [];
  const failedRequests = [];

  page.on('pageerror', (err) => pageErrors.push(err.message));
  page.on('requestfailed', (req) => {
    failedRequests.push(`${req.method()} ${req.url()} :: ${req.failure()?.errorText || 'failed'}`);
  });

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  const homePreview = (await page.locator('body').innerText()).slice(0, 1400);

  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  const loginPreview = (await page.locator('body').innerText()).slice(0, 1200);

  await page.goto('http://localhost:5173/register', { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  const registerPreview = (await page.locator('body').innerText()).slice(0, 1200);

  console.log(JSON.stringify({
    finalUrl: page.url(),
    homePreview,
    loginPreview,
    registerPreview,
    pageErrors,
    failedRequests
  }, null, 2));

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
