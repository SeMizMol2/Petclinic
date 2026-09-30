const { chromium } = require('playwright')
const assert = require('node:assert/strict')
const fs = require('node:fs')

const dateKey = (offset) => {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

;(async () => {
  const workDate = dateKey(1)
  const noShiftDate = dateKey(2)
  const posted = []
  let reviewed = null
  let records = [{
    appt_id: 'A0', pet_id: 'P1', pet_name: 'มีตังค์', owner_name: 'กัส',
    vet_id: null, vet_name: null, appt_date: workDate, appt_time: '11:00',
    appt_reason: 'ตรวจอาการ', appt_status: 'รอคลินิกยืนยัน'
  }]
  const browser = await chromium.launch({ executablePath: 'C:/Users/stamp/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe' })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await page.addInitScript(() => {
    localStorage.setItem('token', 'mock')
    localStorage.setItem('user', JSON.stringify({ role: 'admin', username: 'admin' }))
  })
  page.on('dialog', (dialog) => dialog.accept())
  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' }
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    if (request.method() === 'PATCH' && path.includes('/requests/')) {
      reviewed = request.postDataJSON()
      records = records.map((record) => record.appt_id === 'A0'
        ? { ...record, vet_id: reviewed.vet_id, vet_name: 'หมอทดสอบ', appt_status: 'ยืนยัน' }
        : record)
      return route.fulfill({ headers, json: { success: true } })
    }
    if (request.method() === 'POST' && path.endsWith('/appointments')) {
      const payload = request.postDataJSON()
      if (payload.appt_time === '14:00') {
        return route.fulfill({ status: 409, headers, json: { message: 'ช่วงเวลานี้มีนัดหมายอยู่แล้ว' } })
      }
      posted.push(payload)
      records = [{
        appt_id: 'A1', pet_id: payload.pet_id, pet_name: 'มีตังค์', owner_name: 'กัส',
        vet_id: payload.vet_id, vet_name: 'หมอทดสอบ', appt_date: payload.appt_date,
        appt_time: payload.appt_time, appt_reason: payload.appt_reason, appt_status: 'รอ'
      }]
      return route.fulfill({ headers, json: { success: true } })
    }
    let json = []
    if (path.endsWith('/appointments')) json = records
    if (path.endsWith('/pets-list')) json = [{ pet_id: 'P1', pet_name: 'มีตังค์', owner_name: 'กัส' }]
    if (path.endsWith('/veterinarians-list')) json = [{ vet_id: 'V1', vet_name: 'หมอทดสอบ' }]
    if (path.endsWith('/vet-schedules')) json = [{ schedule_id: 'S1', vet_id: 'V1', vet_name: 'หมอทดสอบ', work_date: workDate, start_time: '09:00', end_time: '17:00' }]
    return route.fulfill({ headers, json })
  })

  try {
    await page.goto('http://127.0.0.1:5173/admin/appointments')
    await page.locator('.request-row').getByRole('button', { name: 'ยืนยันนัด' }).click()
    await page.getByText('กรุณาเลือกสัตวแพทย์ให้คำขอนี้ก่อนยืนยัน').waitFor()
    await page.locator('.request-vet-picker select').selectOption('V1')
    await page.locator('.request-row').getByRole('button', { name: 'ยืนยันนัด' }).click()
    await page.getByText('ยืนยันคำขอนัดหมายแล้ว').waitFor()
    assert.equal(reviewed?.vet_id, 'V1')
    await page.getByRole('button', { name: 'เพิ่มการนัดหมาย', exact: true }).click()
    const modal = page.locator('.modal')
    await modal.locator('.search-box input').fill('มีตังค์')
    await modal.locator('.dropdown-item').first().click()
    await modal.locator('select').first().selectOption('V1')
    await modal.locator('input[type="date"]').fill(workDate)
    await modal.getByText('เริ่มได้ถึง 16:30 น.', { exact: false }).waitFor()
    const time = modal.locator('.appointment-time-field input')

    await time.fill('0127')
    await time.blur()
    assert.equal(await time.inputValue(), '01:27')
    await modal.getByText('01:27 น. อยู่นอกตารางเวร', { exact: false }).waitFor()
    await modal.getByRole('button', { name: 'บันทึกนัดหมาย' }).click()
    await modal.waitFor({ state: 'hidden' })
    assert.equal(posted[0].appt_time, '01:27')

    await page.getByRole('button', { name: 'เพิ่มการนัดหมาย', exact: true }).click()
    await modal.locator('.search-box input').fill('มีตังค์')
    await modal.locator('.dropdown-item').first().click()
    await modal.locator('select').first().selectOption('V1')
    await modal.locator('input[type="date"]').fill(workDate)
    await time.fill('13:27')
    await time.blur()
    await modal.getByText('13:27 น. อยู่ในช่วงเข้าเวร', { exact: false }).waitFor()
    fs.mkdirSync('tmp', { recursive: true })
    await page.screenshot({ path: 'tmp/admin-appointment-time-desktop.png' })
    await page.setViewportSize({ width: 390, height: 844 })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    await page.screenshot({ path: 'tmp/admin-appointment-time-mobile.png' })
    await page.setViewportSize({ width: 1280, height: 900 })
    await modal.getByRole('button', { name: 'บันทึกนัดหมาย' }).click()
    await modal.waitFor({ state: 'hidden' })
    assert.equal(posted.length, 2)
    assert.equal(posted[1].appt_time, '13:27')

    await page.getByRole('button', { name: 'เพิ่มการนัดหมาย', exact: true }).click()
    await modal.locator('.search-box input').fill('มีตังค์')
    await modal.locator('.dropdown-item').first().click()
    await modal.locator('select').first().selectOption('V1')
    await modal.locator('input[type="date"]').fill(workDate)
    await time.fill('14:00')
    await time.blur()
    await modal.getByRole('button', { name: 'บันทึกนัดหมาย' }).click()
    await modal.locator('.field-error').getByText('ช่วงเวลานี้มีนัดหมายอยู่แล้ว').waitFor()
    await time.fill('16:31')
    await time.blur()
    await modal.getByText('16:31 น. อยู่นอกตารางเวร', { exact: false }).waitFor()
    await modal.getByRole('button', { name: 'บันทึกนัดหมาย' }).click()
    await modal.waitFor({ state: 'hidden' })
    assert.equal(posted.length, 3)

    await page.getByRole('button', { name: 'เพิ่มการนัดหมาย', exact: true }).click()
    await modal.locator('.search-box input').fill('มีตังค์')
    await modal.locator('.dropdown-item').first().click()
    await modal.locator('select').first().selectOption('V1')
    await modal.locator('input[type="date"]').fill(noShiftDate)
    await modal.getByText('ยังไม่มีตารางเวรในวันที่เลือก', { exact: false }).waitFor()
    await time.fill('13:27')
    await time.blur()
    await modal.getByRole('button', { name: 'บันทึกนัดหมาย' }).click()
    await modal.waitFor({ state: 'hidden' })
    assert.equal(posted.length, 4)

    console.log('PASS: admin assigns a doctor, books outside shifts, sees inline conflicts, responsive layout')
  } finally {
    await browser.close()
  }
})().catch((error) => { console.error(error); process.exit(1) })
