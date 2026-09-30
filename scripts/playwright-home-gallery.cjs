const { chromium } = require('playwright')
const assert = require('node:assert/strict')
const fs = require('node:fs')

;(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Users/stamp/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe' })
  try {
    for (const viewport of [{ width: 1365, height: 900 }, { width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport })
      await page.route('**/api/**', async (route) => {
        const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' }
        const path = new URL(route.request().url()).pathname
        if (path.endsWith('/clinic')) return route.fulfill({ headers, json: { clinic_name: 'โรงพยาบาลสัตว์เมืองเลย' } })
        return route.fulfill({ headers, json: [] })
      })
      await page.goto('http://127.0.0.1:4173/')
      await page.getByRole('button', { name: 'ดูภาพที่ 6' }).click()
      const gallery = page.locator('.gallery-showcase')
      await gallery.getByText('แมวปัสสาวะไม่ออก: ภาวะฉุกเฉิน').waitFor()
      const image = gallery.locator('img[src*="clinic-06-urinary-emergency"]').first()
      await image.scrollIntoViewIfNeeded()
      await image.evaluate((element) => element.decode())
      assert.equal(await image.evaluate((element) => element.complete && element.naturalWidth > 0), true)
      assert.match(await gallery.locator('.gallery-caption').innerText(), /24 ชั่วโมง/)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
      fs.mkdirSync('tmp', { recursive: true })
      await gallery.screenshot({ path: `tmp/home-gallery-emergency-${viewport.width}.png` })
      await page.close()
    }
    console.log('PASS: emergency case photo and caption render on desktop and mobile')
  } finally {
    await browser.close()
  }
})().catch((error) => { console.error(error); process.exit(1) })
