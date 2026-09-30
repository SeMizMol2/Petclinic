const { chromium } = require('playwright')
const assert = require('node:assert/strict')
const fs = require('node:fs')

const owner = {
  owner_id: 'O1',
  user_id: 'U1',
  owner_name: 'กัส',
  owner_email: 'gus@example.com',
  owner_tel: '0812345678',
  username: 'gus01',
  pet_count: 1,
  email_verified_at: '2026-09-30T00:00:00.000Z'
}

;(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Users/stamp/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe' })
  fs.mkdirSync('tmp', { recursive: true })
  try {
    for (const viewport of [{ width: 1365, height: 900 }, { width: 390, height: 844 }]) {
      const adminPage = await browser.newPage({ viewport })
      await adminPage.addInitScript(() => {
        localStorage.setItem('token', 'mock')
        localStorage.setItem('user', JSON.stringify({ role: 'admin', user_id: 'A1', username: 'admin' }))
      })
      await adminPage.route('**/api/**', async (route) => {
        const path = new URL(route.request().url()).pathname
        const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' }
        if (path.endsWith('/admin/owners')) return route.fulfill({ headers, json: [owner] })
        return route.fulfill({ headers, json: [] })
      })
      await adminPage.goto('http://127.0.0.1:4173/admin/owners')
      await adminPage.getByRole('button', { name: 'เพิ่มเจ้าของสัตว์' }).click()
      await adminPage.getByLabel('ชื่อเล่น', { exact: true }).waitFor()
      assert.equal(await adminPage.getByText('ชื่อ-นามสกุล', { exact: true }).count(), 0)
      assert.equal(await adminPage.getByPlaceholder('ค้นหาชื่อเล่น เบอร์โทร อีเมล หรือชื่อผู้ใช้').count(), 1)
      assert.equal(await adminPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
      await adminPage.locator('.modal').screenshot({ path: `tmp/admin-owner-nickname-${viewport.width}.png` })
      await adminPage.close()

      const userPage = await browser.newPage({ viewport })
      await userPage.addInitScript(() => {
        localStorage.setItem('token', 'mock')
        localStorage.setItem('user', JSON.stringify({ role: 'user', user_id: 'U1', username: 'gus01' }))
      })
      await userPage.route('**/api/**', async (route) => {
        const path = new URL(route.request().url()).pathname
        const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' }
        if (path.endsWith('/user/me')) return route.fulfill({ headers, json: owner })
        return route.fulfill({ headers, json: [] })
      })
      await userPage.goto('http://127.0.0.1:4173/user/profile')
      await userPage.getByRole('button', { name: 'แก้ไขข้อมูล' }).click()
      const nickname = userPage.getByLabel('ชื่อเล่น', { exact: true })
      await nickname.waitFor()
      assert.equal(await nickname.getAttribute('autocomplete'), 'nickname')
      assert.equal(await nickname.getAttribute('required'), '')
      assert.equal(await userPage.getByText('ชื่อ-นามสกุล', { exact: true }).count(), 0)
      assert.equal(await userPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
      await userPage.locator('.profile-panel').screenshot({ path: `tmp/user-profile-nickname-${viewport.width}.png` })
      await userPage.close()
    }
    console.log('PASS: owner nickname terminology and required fields render correctly on admin/user desktop and mobile')
  } finally {
    await browser.close()
  }
})().catch((error) => { console.error(error); process.exit(1) })
