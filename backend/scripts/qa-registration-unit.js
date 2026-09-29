const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
process.env.SMTP_HOST = '';
process.env.SMTP_USER = '';
process.env.SMTP_PASS = '';
const dbPath = require.resolve('../src/database/db');
let calls = [], duplicate = false, failOwner = false;
const client = {
 async query(sql, values) {
  calls.push({ sql, values });
  if (sql.includes('SELECT username')) return { rows: duplicate ? [{ username: 'owner', email: 'owner@example.com' }] : [] };
  if (failOwner && sql.includes('INSERT INTO tb_owner')) throw new Error('mock owner failure');
  return { rows: [] };
 }, release() { calls.push({ sql: 'RELEASE' }); }
};
require.cache[dbPath] = { id:dbPath,filename:dbPath,loaded:true,exports:{connect:async()=>client,query:async(sql,values)=>{calls.push({sql,values});return {rows:[]}}} };
const router = require('../src/routes/auth.routes');
const handler = router.stack.find(layer => layer.route?.path === '/register').route.stack[0].handle;
async function request(body) {
 calls = [];
 const res = { code:200,status(code){this.code=code;return this},json(data){this.data=data;return this} };
 await handler({body},res); return res;
}
(async()=>{
 const good = {username:'owner',email:'owner@example.com',password:'SafePass123!'};
 for(const change of [{username:'  '},{username:'a b'},{username:[]},{email:'bad'},{email:'a'.repeat(101)+'@x.com'},{password:'123'},{password:'ก'.repeat(25)}]) {
  const res=await request({...good,...change}); assert.equal(res.code,400); assert.equal(calls.length,0);
 }
 let res=await request({...good,username:' owner ',email:' OWNER@EXAMPLE.COM ',user_role:'admin'});
 assert.equal(res.code,201);
 const insert=calls.find(c=>c.sql.includes('INSERT INTO tb_user'));
 assert.equal(insert.values[0].length,10); assert.equal(insert.values[1],'owner'); assert.equal(insert.values[2],'owner@example.com'); assert.equal(insert.values[4],'user');
 assert.equal(await bcrypt.compare(good.password,insert.values[3]),true);
 assert.ok(calls.findIndex(c=>c.sql.startsWith('LOCK TABLE'))<calls.findIndex(c=>c.sql.includes('SELECT username')));
 assert.ok(calls.some(c=>c.sql==='COMMIT')); assert.ok(calls.some(c=>c.sql==='RELEASE'));
 duplicate=true; res=await request(good); assert.equal(res.code,400); assert.ok(calls.some(c=>c.sql==='ROLLBACK')); assert.equal(calls.some(c=>c.sql.includes('INSERT')),false); duplicate=false;
 failOwner=true; const oldError=console.error;console.error=()=>{};
 try {res=await request(good)} finally {console.error=oldError}
 assert.equal(res.code,500); assert.ok(calls.some(c=>c.sql==='ROLLBACK')); assert.equal(calls.some(c=>c.sql==='COMMIT'),false);
 console.log('PASS: invalid types/lengths/email/password, normalized fields, bcrypt, 10-char IDs, fixed user role, lock-before-check, duplicate rollback, owner-failure rollback; mocked DB only');
})().catch(e=>{console.error(e);process.exit(1)});
