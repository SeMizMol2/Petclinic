const { chromium } = require('playwright');

async function loginAsUser(page) {
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });

  await page.locator('input').nth(0).fill('admin2');
  await page.locator('input').nth(1).fill('1234');
  await page.locator('button[type="submit"]').click();

  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1200);
}

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

  await loginAsUser(page);

  await page.goto('http://localhost:5173/user/profile', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const profilePreview = (await page.locator('body').innerText()).slice(0, 1500);

  await page.goto('http://localhost:5173/user/pets', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const petsPreview = (await page.locator('body').innerText()).slice(0, 1800);
  const firstHistoryHref = await page.locator('a[href^="/user/history/"]').first().getAttribute('href').catch(() => null);

  await page.goto('http://localhost:5173/user/pets/add', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const addPreview = (await page.locator('body').innerText()).slice(0, 1200);

  await page.goto('http://localhost:5173/user/appointments', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const appointmentsPreview = (await page.locator('body').innerText()).slice(0, 1400);

  await page.goto('http://localhost:5173/user/receipts', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const receiptsPreview = (await page.locator('body').innerText()).slice(0, 1800);

  let historyPreview = '';
  if (firstHistoryHref) {
    await page.goto(`http://localhost:5173${firstHistoryHref}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    historyPreview = (await page.locator('body').innerText()).slice(0, 1800);
  }

  const result = {
    finalUrl: page.url(),
    profilePreview,
    petsPreview,
    addPreview,
    appointmentsPreview,
    receiptsPreview,
    historyPreview,
    pageErrors,
    failedRequests
  };

  console.log(JSON.stringify(result, null, 2));
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
