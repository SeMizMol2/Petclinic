const assert = require('node:assert/strict');
const nodemailer = require('nodemailer');

const sent = [];
nodemailer.createTransport = () => ({
  sendMail: async (message) => { sent.push(message); }
});

process.env.SMTP_HOST = 'smtp.example.test';
process.env.SMTP_PORT = '587';
process.env.SMTP_USER = 'sender@example.test';
process.env.SMTP_PASS = 'test-only-password';
process.env.MAIL_FROM = 'Pet Clinic <sender@example.test>';
process.env.CLINIC_NOTIFICATION_EMAIL = 'staff@example.test';

const { sendClinicRequestNotification, queueClinicRequestNotification } = require('../src/services/mail.service');

const appointment = {
  appt_id: 'AP12345678',
  appt_date: '2026-09-30',
  appt_time: '13:34:00',
  appt_reason: '<script>ตรวจอาการ</script>',
  owner_name: 'คุณทดสอบ',
  owner_tel: '0812345678',
  owner_email: 'owner@example.test',
  pet_name: 'มี้ดง์',
  vet_name: null,
  clinic_name: 'โรงพยาบาลสัตว์เมืองเลย'
};

(async () => {
  const result = await sendClinicRequestNotification({ appointment });
  assert.equal(result.sent, true);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, 'staff@example.test');
  assert.match(sent[0].subject, /รอคลินิกยืนยัน/);
  assert.match(sent[0].text, /AP12345678/);
  assert.match(sent[0].text, /13:34/);
  assert.match(sent[0].text, /30 กันยายน 2569/);
  assert.match(sent[0].text, /ยังไม่ยืนยัน/);
  assert.match(sent[0].text, /0812345678/);
  assert.match(sent[0].text, /ให้คลินิกเลือกสัตวแพทย์ที่ว่าง/);
  assert.ok(!sent[0].html.includes('<script>'));
  assert.match(sent[0].html, /&lt;script&gt;/);

  delete process.env.CLINIC_NOTIFICATION_EMAIL;
  await sendClinicRequestNotification({ appointment });
  assert.equal(sent[1].to, 'sender@example.test');

  process.env.CLINIC_NOTIFICATION_EMAIL = 'staff@example.test';
  const queued = queueClinicRequestNotification({ appointment });
  assert.equal(queued.queued, true);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(sent.length, 3);

  process.env.SMTP_HOST = '';
  const skipped = queueClinicRequestNotification({ appointment });
  assert.equal(skipped.skipped, true);
  assert.equal(skipped.reason, 'mail-not-configured');
  console.log('PASS clinic request email recipient, contents, HTML escaping, fallback, queue, SMTP-disabled behavior');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
