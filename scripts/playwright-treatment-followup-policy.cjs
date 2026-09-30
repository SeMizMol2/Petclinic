const { chromium } = require('playwright')
const assert = require('node:assert/strict')
const fs = require('node:fs')

;(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Users/stamp/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe' })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const date = new Date()
  date.setDate(date.getDate() + 1)
  const workDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  let submitted = null
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
    if (request.method() === 'POST' && path === '/api/appointments') {
      submitted = request.postDataJSON()
      return route.fulfill({ headers, json: { email_notification: { queued: true } } })
    }
    let json = []
    if (path === '/api/treatments') json = [{
      treatment_id: 'TR1', treatment_date: '2026-09-27T10:00:00+07:00',
      pet_id: 'P1', pet_name: 'มีตังค์', owner_name: 'กัส', vet_id: 'V1', vet_name: 'หมอทดสอบ',
      total_amount: 500, diagnosis: 'ติดตามอาการ', services: []
    }]
    if (path === '/api/treatments/pets') json = [{ pet_id: 'P1', pet_name: 'มีตังค์', owner_name: 'กัส' }]
    if (path === '/api/admin/veterinarians') json = [{ vet_id: 'V1', vet_name: 'หมอทดสอบ' }]
    return route.fulfill({ headers, json })
  })

  try {
    await page.goto('http://127.0.0.1:5173/admin/treatments')
    await page.getByText('TR1', { exact: true }).waitFor()
    await page.getByRole('button', { name: 'นัดติดตาม' }).first().click()
    const modal = page.locator('.followup-appointment-modal')
    await modal.locator('input[type="date"]').fill(workDate)
    await modal.locator('input[placeholder="HH:mm เช่น 13:27"]').fill('13:27')
    await modal.locator('input[placeholder="HH:mm เช่น 13:27"]').blur()
    await modal.getByText('ยังไม่มีตารางเวรในวันที่เลือก', { exact: false }).waitFor()
    fs.mkdirSync('tmp', { recursive: true })
    await page.screenshot({ path: 'tmp/treatment-followup-no-shift-desktop.png' })
    const submit = modal.getByRole('button', { name: 'ส่งนัดให้เจ้าของยืนยัน' })
    assert.equal(await submit.isEnabled(), true)
    await submit.click()
    await modal.waitFor({ state: 'hidden' })
    assert.equal(submitted?.pet_id, 'P1')
    assert.equal(submitted?.vet_id, 'V1')
    assert.equal(submitted?.appt_date, workDate)
    assert.equal(submitted?.appt_time, '13:27')
    console.log('PASS: follow-up appointment can be sent without a veterinarian shift')
  } finally {
    await browser.close()
  }
})().catch((error) => { console.error(error); process.exit(1) })
