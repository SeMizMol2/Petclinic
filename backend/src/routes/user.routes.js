const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const auth = require('./auth.middleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { passwordValidationMessage } = require('../services/password-policy');
const { makeVerificationToken, deliverVerification } = require('../services/email-verification.service');

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

router.get('/me', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        u.user_id,
        u.username,
        u.email_verified_at,
        o.owner_name,
        COALESCE(o.owner_email, u.email) AS owner_email,
        o.owner_tel AS tel,
        o.profile_pic
      FROM tb_user u
      LEFT JOIN tb_owner o ON u.user_id = o.user_id
      WHERE u.user_id = $1
      `,
      [req.user.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลผู้ใช้' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ message: 'โหลดข้อมูลไม่สำเร็จ' });
  }
});

router.put('/me', auth, async (req, res) => {
  let client;
  try {
    const { owner_name, owner_email, tel } = req.body;
    const normalizedEmail = normalizeEmail(owner_email);

    if (!normalizedEmail || normalizedEmail.length > 100 || !emailPattern.test(normalizedEmail)) {
      return res.status(400).json({ message: 'รูปแบบอีเมลไม่ถูกต้อง' });
    }

    client = await pool.connect();
    await client.query('BEGIN');
    const current = await client.query('SELECT username, email FROM tb_user WHERE user_id = $1 FOR UPDATE', [req.user.user_id]);
    if (!current.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'ไม่พบบัญชีผู้ใช้' });
    }
    const emailChanged = normalizeEmail(current.rows[0].email) !== normalizedEmail;

    if (emailChanged) {
      const duplicateEmail = await client.query(
        'SELECT user_id FROM tb_user WHERE LOWER(email) = $1 AND user_id <> $2 LIMIT 1',
        [normalizedEmail, req.user.user_id]
      );

      if (duplicateEmail.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'อีเมลนี้ถูกใช้งานแล้ว' });
      }
    }

    const verification = emailChanged ? makeVerificationToken() : null;
    await client.query(
      `UPDATE tb_user SET email = $1,
          email_verified_at = CASE WHEN $3::boolean THEN NULL ELSE email_verified_at END,
          email_verification_token_hash = CASE WHEN $3::boolean THEN $4 ELSE email_verification_token_hash END,
          email_verification_expires_at = CASE WHEN $3::boolean THEN CURRENT_TIMESTAMP + INTERVAL '24 hours' ELSE email_verification_expires_at END,
          email_verification_sent_at = CASE WHEN $3::boolean THEN CURRENT_TIMESTAMP ELSE email_verification_sent_at END
       WHERE user_id = $2`,
      [normalizedEmail, req.user.user_id, emailChanged, verification?.hash || null]
    );

    await client.query(
      `
      UPDATE tb_owner
      SET owner_name = $1,
          owner_email = $2,
          owner_tel = $3
      WHERE user_id = $4
      `,
      [owner_name || null, normalizedEmail || null, tel || null, req.user.user_id]
    );

    await client.query('COMMIT');
    client.release(); client = null;
    const emailSent = emailChanged
      ? await deliverVerification({ email: normalizedEmail, username: current.rows[0].username, token: verification.token }).catch((error) => {
          console.error('Deliver profile verification failed:', error);
          return false;
        })
      : null;
    if (emailChanged && !emailSent) {
      await pool.query('UPDATE tb_user SET email_verification_sent_at = NULL WHERE user_id = $1 AND email_verification_token_hash = $2', [req.user.user_id, verification.hash]).catch((error) => console.error('Release verification retry failed:', error));
    }
    res.json({ message: 'บันทึกสำเร็จ', email_verification_required: emailChanged, verification_email_sent: emailSent });
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('Update user profile error:', err);
    if (err.code === '23505') {
      return res.status(400).json({ message: 'อีเมลนี้ถูกใช้งานแล้ว' });
    }
    res.status(500).json({ message: 'บันทึกข้อมูลไม่สำเร็จ' });
  } finally {
    if (client) client.release();
  }
});

router.put('/me/password', auth, async (req, res) => {
  const { current_password: currentPassword, new_password: newPassword } = req.body || {};
  if (typeof currentPassword !== 'string' || !currentPassword) {
    return res.status(400).json({ message: 'กรุณากรอกรหัสผ่านปัจจุบัน' });
  }
  const passwordError = passwordValidationMessage(newPassword);
  if (passwordError) return res.status(400).json({ message: passwordError });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query('SELECT password FROM tb_user WHERE user_id = $1 FOR UPDATE', [req.user.user_id]);
    if (!result.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'ไม่พบบัญชีผู้ใช้' });
    }
    const oldHash = result.rows[0].password;
    if (!await bcrypt.compare(currentPassword, oldHash)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });
    }
    if (await bcrypt.compare(newPassword, oldHash)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'รหัสผ่านใหม่ต้องต่างจากรหัสผ่านปัจจุบัน' });
    }
    const newHash = await bcrypt.hash(newPassword, 10);
    await client.query('UPDATE tb_user SET password = $1 WHERE user_id = $2', [newHash, req.user.user_id]);
    await client.query('COMMIT');
    return res.json({ message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Change password failed:', err);
    return res.status(500).json({ message: 'เปลี่ยนรหัสผ่านไม่สำเร็จ กรุณาลองอีกครั้ง' });
  } finally {
    client.release();
  }
});
const uploadDir = path.join(__dirname, '../../../uploads/profiles');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'profile-' + req.user.user_id + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const imageFileFilter = (_req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith('image/')) {
    cb(null, true);
    return;
  }
  cb(new Error('Only image files are allowed'));
};

const upload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

router.post('/upload-profile', auth, upload.single('profileImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'ไม่พบไฟล์' });
    }

    const imageUrl = `/uploads/profiles/${req.file.filename}`;

    await pool.query(
      'UPDATE tb_owner SET profile_pic = $1 WHERE user_id = $2',
      [imageUrl, req.user.user_id]
    );

    res.json({
      success: true,
      imageUrl,
      message: 'อัปโหลดรูปเรียบร้อย'
    });
  } catch (err) {
    console.error('Error uploading profile image:', err);
    res.status(500).json({ message: 'อัปโหลดรูปไม่สำเร็จ' });
  }
});

router.get('/all', auth, async (req, res) => {
  try {
    const myRole = req.user.user_role || req.user.role;
    if (myRole !== 'admin') {
      return res.status(403).json({ message: 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้' });
    }

    const result = await pool.query(
      `
      SELECT
        u.user_id,
        u.username,
        u.user_role,
        CASE WHEN u.user_role = 'admin' THEN NULL ELSE o.owner_name END AS owner_name,
        CASE WHEN u.user_role = 'admin' THEN NULL ELSE o.owner_tel END AS owner_tel
      FROM tb_user u
      LEFT JOIN tb_owner o ON u.user_id = o.user_id
      ORDER BY u.username ASC
      `
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching all users:', err);
    res.status(500).json({ message: 'โหลดข้อมูลไม่สำเร็จ' });
  }
});

router.put('/role/:id', auth, async (req, res) => {
  try {
    const myRole = req.user.user_role || req.user.role;
    if (myRole !== 'admin') {
      return res.status(403).json({ message: 'คุณไม่มีสิทธิ์แก้ไขข้อมูลนี้' });
    }

    const targetUserId = req.params.id;
    const { user_role } = req.body;

    if (!['admin', 'user'].includes(user_role)) {
      return res.status(400).json({ message: 'สิทธิ์ผู้ใช้ไม่ถูกต้อง' });
    }

    if (targetUserId === req.user.user_id || targetUserId === req.user.id) {
      return res.status(400).json({ message: 'ไม่สามารถเปลี่ยนสิทธิ์ของตัวเองได้' });
    }

    await pool.query(
      'UPDATE tb_user SET user_role = $1 WHERE user_id = $2',
      [user_role, targetUserId]
    );

    res.json({ message: 'อัปเดตสิทธิ์สำเร็จ' });
  } catch (err) {
    console.error('Error updating role:', err);
    res.status(500).json({ message: 'อัปเดตสิทธิ์ไม่สำเร็จ' });
  }
});

module.exports = router;
