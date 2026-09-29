const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Users/stamp/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe'});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 let requests=0, fail=true, payload;
 await page.route('**/api/auth/register',async route=>{
  const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'*'};
  if(route.request().method()==='OPTIONS') return route.fulfill({status:204,headers});
  requests++;payload=route.request().postDataJSON();
  await new Promise(resolve=>setTimeout(resolve,300));
  await route.fulfill({headers,status:fail?400:201,json:{message:fail?'อีเมลนี้ถูกใช้งานแล้ว':'สมัครสมาชิกแล้ว',verification_email_sent:true}});
 });
 try{
  await page.goto('http://127.0.0.1:5173/register');
  await page.getByRole('button',{name:'ลงทะเบียน',exact:true}).click();
  assert.equal(requests,0);assert.equal(await page.locator('.field-error').count(),4);
  await page.getByLabel('ชื่อผู้ใช้',{exact:true}).fill(' owner ');
  await page.getByLabel('อีเมล',{exact:true}).fill(' OWNER@EXAMPLE.COM ');
  await page.getByLabel('รหัสผ่าน',{exact:true}).fill('SafePass123!');
  await page.getByLabel('ยืนยันรหัสผ่าน',{exact:true}).fill('different');
  await page.getByRole('button',{name:'ลงทะเบียน',exact:true}).click();
  assert.equal(requests,0);
  await page.getByLabel('ยืนยันรหัสผ่าน',{exact:true}).fill('SafePass123!');
  await page.getByRole('button',{name:'แสดงรหัสผ่าน',exact:true}).click();
  assert.equal(await page.getByLabel('รหัสผ่าน',{exact:true}).getAttribute('type'),'text');
  await page.getByRole('button',{name:'ซ่อนรหัสผ่าน',exact:true}).click();
  await page.getByRole('button',{name:'ลงทะเบียน',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'กำลังสมัครสมาชิก…',exact:true}).isDisabled(),true);
  await page.getByRole('alert').waitFor();
  assert.equal(requests,1);assert.equal(payload.username,'owner');assert.equal(payload.email,'owner@example.com');
  fs.mkdirSync('.impeccable/review',{recursive:true});
  await page.screenshot({path:'.impeccable/review/register-desktop.png'});
  for(const width of [390,320]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'.impeccable/review/register-mobile.png'});
  fail=false;await page.getByRole('button',{name:'ลงทะเบียน',exact:true}).click();
  await page.getByRole('heading',{name:'ตรวจอีเมลเพื่อยืนยันบัญชี',exact:true}).waitFor();
  assert.equal(requests,2);
  await page.getByText('owner@example.com').waitFor();
  await page.screenshot({path:'.impeccable/review/register-verification.png'});
  await page.getByRole('link',{name:'ไปหน้าเข้าสู่ระบบ',exact:true}).click();await page.waitForURL('**/login');
  await page.route('**/api/auth/login',async route=>{
    const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'*'};
    if(route.request().method()==='OPTIONS') return route.fulfill({status:204,headers});
    await route.fulfill({status:403,headers,json:{code:'EMAIL_NOT_VERIFIED',message:'กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ',email:'owner@example.com'}});
  });
  await page.getByPlaceholder('Username').fill('owner');
  await page.getByPlaceholder('กรอกรหัสผ่าน').fill('SafePass123!');
  await page.getByRole('button',{name:'เข้าสู่ระบบ',exact:true}).click();
  await page.getByRole('link',{name:'ส่งลิงก์ยืนยันอีเมลใหม่'}).click();
  await page.waitForURL('**/verify-email*');
  await page.getByRole('heading',{name:'ยืนยันอีเมลของคุณ'}).waitFor();
  assert.equal(await page.locator('#verify-email').inputValue(),'owner@example.com');
  for(const width of [390,320]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
  await page.screenshot({path:'.impeccable/review/verify-email-mobile.png'});
  await page.route('**/api/auth/verify-email',async route=>{
    const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'*'};
    if(route.request().method()==='OPTIONS') return route.fulfill({status:204,headers});
    await route.fulfill({status:200,headers,json:{message:'ยืนยันอีเมลสำเร็จ'}});
  });
  await page.goto('http://127.0.0.1:5173/verify-email?token='+'b'.repeat(64));
  await page.getByRole('heading',{name:'ยืนยันอีเมลสำเร็จ'}).waitFor();
  assert.equal(new URL(page.url()).searchParams.has('token'),false);
  console.log('PASS: validation, confirmation, password visibility, loading guard, server error/retry, normalization, verification step, mobile 390/320');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
