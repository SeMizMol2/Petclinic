const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
 const browser = await chromium.launch({ executablePath: 'C:/Users/stamp/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe' });
 const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
 const records = ['ยังไม่ได้ชำระ', 'ชำระเสร็จสิ้น', ''].map((status, i) => ({ treatment_id: `TR00${i+1}`, treatment_date: '2026-09-27T10:00:00+07:00', pet_id: 'P1', pet_name: ['มีตังค์','มุกดำ','โมจิ'][i], owner_name: 'กัส', vet_name: 'ภัครินทร์ วงษ์ลา', total_amount: 500, diagnosis: 'ติดตามอาการ', receipt_id: i < 2 ? `RC${i+1}` : '', payment_status: status, services: [{ service_id:'S1',service_name:'ตรวจทั่วไป',price:500,quantity:1 }] }));
 await page.addInitScript(() => { localStorage.setItem('token','mock'); localStorage.setItem('user',JSON.stringify({role:'admin',username:'admin'})); });
 await page.route('**/api/**', async route => {
  const path = new URL(route.request().url()).pathname;
  const headers = { 'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'*' };
  if(route.request().method() === 'OPTIONS') return route.fulfill({ status:204,headers });
  assert.equal(route.request().method(),'GET','UI checks must not write data');
  let json = [];
  if(path === '/api/treatments') json = records;
  if(path === '/api/treatments/pets') json = [{pet_id:'P1',pet_name:'มีตังค์',owner_name:'กัส',pet_type:'สุนัข'}];
  if(path === '/api/treatments/services') json = [{service_id:'S1',service_name:'ตรวจทั่วไป',service_price:500}];
  if(path === '/api/admin/veterinarians') json = [{vet_id:'V1',vet_name:'ภัครินทร์ วงษ์ลา'}];
  if(path === '/api/treatments/TR002') json = records[1];
  if(path.includes('/pet-summary/')) json = {data:{pet:{pet_id:'P1',pet_name:'มีตังค์',pet_type:'สุนัข',drug_allergy:'Penicillin'},owner:{owner_name:'กัส'},overview:{},treatments:[]}};
  await route.fulfill({headers,json});
 });
 try {
  await page.goto('http://127.0.0.1:5173/admin/treatments');
  await page.getByText('TR001',{exact:true}).waitFor();
  const rows = page.locator('.table-panel tbody tr');
  assert.equal(await rows.count(),3);
  const search = page.getByLabel('ค้นหาประวัติการรักษา');
  await search.fill('มุก'); assert.equal(await rows.count(),1);
  await search.fill('TR001'); assert.equal(await rows.count(),1);
  await search.fill('กัส'); assert.equal(await rows.count(),3);
  await search.fill('');
  for(const label of ['ค้างชำระ','ชำระแล้ว','ยังไม่ออกเอกสาร']) {
   await page.locator('.payment-filters').getByRole('button',{name:label,exact:true}).click();
   assert.equal(await rows.count(),1);
  }
  await search.fill('ไม่พบ'); await page.getByText('ไม่พบรายการที่ตรงกับการค้นหา',{exact:true}).waitFor();
  await page.getByRole('button',{name:'ล้างตัวกรอง'}).click(); assert.equal(await rows.count(),3);
  fs.mkdirSync('.impeccable/review',{recursive:true});
  await page.screenshot({path:'.impeccable/review/admin-treatments-desktop.png'});
  await rows.filter({hasText:'TR002'}).getByRole('button',{name:'แก้ไข',exact:true}).click();
  await page.locator('.financial-notice.locked').waitFor();
  assert.equal(await page.getByLabel('ราคา ตรวจทั่วไป',{exact:true}).isDisabled(),true);
  assert.equal(await page.getByLabel('จำนวน ตรวจทั่วไป',{exact:true}).isDisabled(),true);
  await page.locator('.treatment-modal').getByRole('button',{name:'ปิด',exact:true}).click();
  await page.getByRole('button',{name:'เพิ่มการรักษาใหม่',exact:true}).click();
  await page.getByRole('combobox',{name:'เลือกสัตว์เลี้ยง *',exact:true}).fill('มีตังค์');
  await page.getByRole('option').filter({hasText:'มีตังค์'}).click();
  await page.getByText('Penicillin',{exact:true}).waitFor();
  await page.screenshot({path:'.impeccable/review/admin-treatment-form-desktop.png'});
  for(const width of [390,320]) {
   await page.setViewportSize({width,height:844});
   assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true);
   assert.equal(await page.locator('.treatment-modal').evaluate(el=>el.scrollWidth<=el.clientWidth),true);
  }
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'.impeccable/review/admin-treatment-form-mobile.png'});
  console.log('PASS: search/name/owner/id, payment filters, empty/reset, paid financial locks, pet picker/allergy, responsive 390/320; no writes');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
