// Read-only receipt API verification: no inserts, updates, deletes, or migrations.
const path = require('node:path');
const assert = require('node:assert/strict');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../src/database/db');
const app = express();
app.use('/api/receipts', require('../src/routes/receipt.routes'));
let server;

(async () => {
  try {
    const baseline = await pool.query(
      `SELECT r.receipt_id, r.total_amount, r.treatment_id, o.user_id,
              p.pet_id, p.pet_name, p.pet_image, t.treatment_date
       FROM tb_receipt r JOIN tb_owner o ON o.owner_id = r.owner_id
       LEFT JOIN tb_treatment t ON t.treatment_id = r.treatment_id
       LEFT JOIN tb_pet p ON p.pet_id = t.pet_id
       WHERE o.user_id IS NOT NULL
       ORDER BY (r.treatment_id IS NOT NULL) DESC, r.issue_date DESC LIMIT 1`
    );
    assert.ok(baseline.rowCount, 'An existing receipt is needed for this read-only test');
    const expected = baseline.rows[0];
    server = await new Promise((resolve) => {
      const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
    });
    const base = 'http://127.0.0.1:' + server.address().port + '/api/receipts';
    const token = jwt.sign({ user_id: expected.user_id, role: 'user' }, process.env.JWT_SECRET, { expiresIn: '5m' });
    const get = (url) => fetch(base + url, { headers: { Authorization: 'Bearer ' + token } });
    const response = await get('/my-receipts/' + encodeURIComponent(expected.user_id));
    assert.equal(response.status, 200);
    const payload = await response.json();
    const item = payload.data.find((row) => row.receipt_id === expected.receipt_id);
    assert.ok(item);
    assert.equal(item.pet_name, expected.pet_name);
    assert.equal(item.pet_id, expected.pet_id);
    assert.equal(item.pet_image, expected.pet_image);
    assert.equal(Number(item.total_amount), Number(expected.total_amount));
    assert.ok(Object.hasOwn(item, 'treatment_date'));
    console.log('PASS receipt list includes existing pet fields and unchanged amount');
    const detailResponse = await get('/detail/' + encodeURIComponent(expected.receipt_id));
    assert.equal(detailResponse.status, 200);
    const detail = await detailResponse.json();
    assert.equal(detail.data.receipt.receipt_id, expected.receipt_id);
    assert.ok(Array.isArray(detail.data.items));
    console.log('PASS existing detail endpoint remains readable by the owner');
    assert.equal((await get('/my-receipts/NOT_THIS_OWNER')).status, 403);
    assert.equal((await fetch(base + '/my-receipts/' + expected.user_id)).status, 401);
    const otherToken = jwt.sign({ user_id: 'READONLY_OTHER_OWNER', role: 'user' }, process.env.JWT_SECRET, { expiresIn: '5m' });
    const other = await fetch(base + '/detail/' + expected.receipt_id, { headers: { Authorization: 'Bearer ' + otherToken } });
    assert.equal(other.status, 403);
    console.log('PASS receipt ownership and authentication checks');
    console.log('READONLY_RECEIPT_API_SUMMARY 3 checks passed; no database writes');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    await pool.end();
  }
})();
