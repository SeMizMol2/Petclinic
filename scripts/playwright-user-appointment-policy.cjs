const { chromium } = require('playwright')
const assert = require('node:assert/strict')
const fs = require('node:fs')

;(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Users/stamp/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe' })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const requestedDate = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`
  let submitted = null

  await page.addInitScript(() => {
    localStorage.setItem('token', 'mock')
    localStorage.setItem('user', JSON.stringify({ role: 'user', user_id: 'U1', username: 'owner' }))
  })
  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' }
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    if (request.method() === 'POST' && path.endsWith('/appointments/request')) {
      submitted = request.postDataJSON()
      return route.fulfill({ headers, json: { message: 'ส่งคำขอนัดหมายแล้ว รอคลินิกยืนยัน' } })
    }
    if (path.endsWith('/appointments/my-appointments/U1')) return route.fulfill({ headers, json: { success: true, data: [] } })
    if (path.endsWith('/appointments/vet-schedules')) return route.fulfill({ headers, json: [] })
    if (path.endsWith('/appointments/veterinarians-list')) return route.fulfill({ headers, json: [{ vet_id: 'V1', vet_name: 'หมอทดสอบ' }] })
    if (path.endsWith('/pets')) return route.fulfill({ headers, json: [{ pet_id: 'P1', pet_name: 'มีตังค์' }] })
    return route.fulfill({ headers, json: [] })
  })

  try {
    await page.goto('http://127.0.0.1:5173/user/appointments')
    await page.getByText('เดือนนี้ยังไม่มีตารางเข้าเวร', { exact: false }).waitFor()
    if (tomorrow.getMonth() !== new Date().getMonth()) await page.getByRole('button', { name: 'เดือนถัดไป' }).click()
    const day = String(tomorrow.getDate())
    await page.locator('.calendar-day:not(.muted)').filter({ has: page.locator('span', { hasText: new RegExp(`^${day}$`) }) }).first().click()
    await page.locator('.booking-vet select').selectOption('V1')
    await page.getByRole('textbox', { name: 'ชั่วโมง แบบ 24 ชั่วโมง' }).fill('13')
    await page.getByRole('textbox', { name: 'นาที' }).fill('27')
    await page.getByText('ยังไม่พบเวรในเวลาที่ขอ', { exact: false }).waitFor()
    await page.locator('.booking-reason textarea').fill('ติดตามอาการ')
    fs.mkdirSync('tmp', { recursive: true })
    await page.screenshot({ path: 'tmp/user-appointment-no-shift-mobile.png', fullPage: true })
    await page.getByRole('button', { name: 'ส่งคำขอนัดหมาย' }).click()
    await page.waitForFunction(() => document.body.innerText.includes('ส่งคำขอนัดหมายแล้ว'))
    assert.equal(submitted?.vet_id, 'V1')
    assert.equal(submitted?.appt_date, requestedDate)
    assert.equal(submitted?.appt_time, '13:27')
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    console.log('PASS: owner selects any doctor without a shift and submits an exact-minute request on mobile')
  } finally {
    await browser.close()
  }
})().catch((error) => { console.error(error); process.exit(1) })
