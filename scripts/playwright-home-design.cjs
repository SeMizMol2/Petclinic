const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Users/stamp/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe'});
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 await page.route('**/api/**',route=>route.fulfill({headers:{'Access-Control-Allow-Origin':'*'},json:route.request().url().includes('/clinic')?{clinic_name:'โรงพยาบาลสัตว์เมืองเลย',tel:'042-000-000',open_hours:'09:00–17:00 น.',address:'จังหวัดเลย'}:['ตรวจรักษาทั่วไป','วัคซีน','ผ่าตัด'].map((name,i)=>({service_id:`S${i}`,service_name:name,service_price:300,service_desc:'รายละเอียดบริการตัวอย่างสำหรับทดสอบ',service_image:'/images/clinic-gallery/clinic-01.png'}))}));
 try{
  await page.goto('http://127.0.0.1:5173/');
  await page.getByText('042-000-000',{exact:true}).waitFor();
  assert.equal(await page.locator('.service-card').count(),3);
  assert.equal(await page.getByRole('link',{name:'เข้าสู่ระบบเพื่อขอนัดหมาย',exact:true}).getAttribute('href'),'/login');
  await page.getByRole('link',{name:'ดูบริการของเรา',exact:true}).click();
  assert.match(page.url(),/#services$/);
  await page.getByRole('button',{name:'หยุดภาพอัตโนมัติ',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'เล่นภาพอัตโนมัติ',exact:true}).getAttribute('aria-pressed'),'true');
  await page.getByRole('button',{name:'ดูภาพถัดไป',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'ดูภาพที่ 2',exact:true}).getAttribute('aria-current'),'true');
  await page.getByRole('button',{name:'ดูภาพก่อนหน้า',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'ดูภาพที่ 1',exact:true}).getAttribute('aria-current'),'true');
  fs.mkdirSync('.impeccable/review',{recursive:true});
  await page.locator('.top-nav').scrollIntoViewIfNeeded();
  await page.screenshot({path:'.impeccable/review/home-desktop.png'});
  for(const width of [390,320]){
   await page.setViewportSize({width,height:844});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  }
  await page.setViewportSize({width:390,height:844});
  await page.locator('.top-nav').scrollIntoViewIfNeeded();
  await page.screenshot({path:'.impeccable/review/home-mobile.png'});
  await page.getByRole('link',{name:'เข้าสู่ระบบเพื่อขอนัดหมาย',exact:true}).click();
  await page.waitForURL('**/login');
  console.log('PASS: clinic/services data, login CTA, service anchor, gallery controls/pause, mobile 390/320');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
