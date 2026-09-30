const { chromium } = require('playwright')
const assert = require('node:assert/strict')
const fs = require('node:fs')

const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

;(async () => {
  const appointmentDate = new Date()
  appointmentDate.setDate(appointmentDate.getDate() + 1)
  const anotherDate = new Date(appointmentDate)
  anotherDate.setDate(anotherDate.getDate() + 1)
  const appointmentKey = dateKey(appointmentDate)
  const anotherKey = dateKey(anotherDate)
  const browser = await chromium.launch({ executablePath: 'C:/Users/stamp/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe' })

  try {
    for (const viewport of [{ width: 1365, height: 900 }, { width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport })
      await page.addInitScript(() => {
        localStorage.setItem('token', 'mock')
        localStorage.setItem('user', JSON.stringify({ role: 'user', user_id: 'U1', username: 'owner' }))
      })
      await page.route('**/api/**', async (route) => {
        const path = new URL(route.request().url()).pathname
        const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' }
        if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
        if (path.endsWith('/appointments/my-appointments/U1')) return route.fulfill({ headers, json: { success: true, data: [{ appt_id: 'AP1', appt_date: appointmentKey, appt_time: '14:45:00', appt_status: 'รอ', pet_name: 'ลูกชาย', vet_name: 'หมอทดสอบ' }] } })
        if (path.endsWith('/appointments/vet-schedules')) return route.fulfill({ headers, json: [{ schedule_id: 'S1', vet_id: 'V1', vet_name: 'หมอทดสอบ', work_date: appointmentKey, start_time: '09:00:00', end_time: '17:00:00' }] })
        if (path.endsWith('/appointments/veterinarians-list')) return route.fulfill({ headers, json: [{ vet_id: 'V1', vet_name: 'หมอทดสอบ' }] })
        if (path.endsWith('/pets')) return route.fulfill({ headers, json: [{ pet_id: 'P1', pet_name: 'ลูกชาย' }] })
        return route.fulfill({ headers, json: [] })
      })

      await page.goto('http://127.0.0.1:4173/user/appointments')
      if (appointmentDate.getMonth() !== new Date().getMonth()) await page.getByRole('button', { name: 'เดือนถัดไป' }).click()
      const ownDay = page.locator(`.calendar-day[aria-label*="${appointmentDate.getDate()} "]`).filter({ hasText: '1 นัด' }).first()
      await ownDay.waitFor()
      assert.match(await ownDay.innerText(), /1 นัด/)
      assert.match(await ownDay.innerText(), /1 เวร/)
      await ownDay.click()
      await page.getByText('นัดของฉันในวันนี้').waitFor()
      await page.getByText('14:45 น. · ลูกชาย').waitFor()
      await page.getByText('รอยืนยัน', { exact: true }).first().waitFor()
      fs.mkdirSync('tmp', { recursive: true })
      await page.locator('.booking-panel').screenshot({ path: `tmp/user-appointment-calendar-${viewport.width}.png` })

      const otherDay = page.getByRole('button', { name: new RegExp(`${anotherDate.getDate()} .*ยังไม่มีตารางเข้าเวร`) }).first()
      if (anotherDate.getMonth() === appointmentDate.getMonth()) {
        await otherDay.click()
        assert.equal(await page.locator('.selected-day-appointments').count(), 0)
        assert.equal(await page.locator('.booking-vet select').isEnabled(), true)
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
      await page.close()
    }
    console.log(`PASS: own appointment and vet shift are distinct on desktop/mobile; other days remain requestable (${appointmentKey}, ${anotherKey})`)
  } finally {
    await browser.close()
  }
})().catch((error) => { console.error(error); process.exit(1) })
