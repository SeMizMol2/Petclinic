const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../database/db');
const jwt = require('jsonwebtoken');
const { randomBytes } = require('node:crypto');
const { usernameValidationMessage, lockUsernameWrites } = require('../services/username-guard');
const { passwordValidationMessage } = require('../services/password-policy');
const { makeVerificationToken, hashVerificationToken, deliverVerification } = require('../services/email-verification.service');

const adminUsername = process.env.ADMIN_USERNAME;
const adminPassword = process.env.ADMIN_PASSWORD;
const adminUserId = process.env.ADMIN_USER_ID || 'admin_001';
const adminDisplayName = process.env.ADMIN_DISPLAY_NAME || 'Administrator';
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ================= REGISTER =================
router.post('/register', async (req, res) => {
  let client;
  try {
    const { username: rawUsername, email, password } = req.body || {};
    if (typeof rawUsername !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'กรุณากรอกชื่อผู้ใช้ อีเมล และรหัสผ่านเป็นข้อความ' });
    }
    const username = rawUsername.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!username || !normalizedEmail || !password) {
      return res.status(400).json({ message: 'กรอกข้อมูลไม่ครบ' });
    }

    const usernameError = usernameValidationMessage(username);
    if (usernameError) {
      return res.status(400).json({ message: usernameError });
    }
    if (normalizedEmail.length > 100 || !emailPattern.test(normalizedEmail)) {
      return res.status(400).json({ message: 'รูปแบบอีเมลไม่ถูกต้อง' });
    }

    const passwordError = passwordValidationMessage(password);
    if (passwordError) return res.status(400).json({ message: passwordError });
    const hashedPassword = await bcrypt.hash(password, 10);
    client = await pool.connect();
    await client.query('BEGIN');
    await lockUsernameWrites(client);
    const checkUser = await client.query(
      `SELECT username, email
       FROM tb_user
       WHERE username = $1 OR LOWER(email) = $2
       LIMIT 1`,
      [username, normalizedEmail]
    );

    if (checkUser.rows.length > 0) {
      await client.query('ROLLBACK');
      if (checkUser.rows[0].username === username) {
        return res.status(400).json({ message: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว' });
      }

      return res.status(400).json({ message: 'อีเมลนี้ถูกใช้งานแล้ว' });
    }

    let userId, ownerId;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const suffix = randomBytes(5).toString('hex').slice(0, 9);
      userId = 'U' + suffix;
      ownerId = 'O' + suffix;
      const existing = await client.query(
        'SELECT user_id AS id FROM tb_user WHERE user_id = $1 UNION ALL SELECT owner_id AS id FROM tb_owner WHERE owner_id = $2',
        [userId, ownerId]
      );
      if (!existing.rows.length) break;
      if (attempt === 4) throw new Error('Unable to allocate account identifier');
    }

    const verification = makeVerificationToken();
    await client.query(
      `INSERT INTO tb_user (user_id, username, email, password, user_role,
                            email_verified_at, email_verification_token_hash, email_verification_expires_at, email_verification_sent_at)
       VALUES ($1,$2,$3,$4,$5,NULL,$6,CURRENT_TIMESTAMP + INTERVAL '24 hours',CURRENT_TIMESTAMP)`,
      [userId, username, normalizedEmail, hashedPassword, 'user', verification.hash]
    );

    await client.query(
      `INSERT INTO tb_owner (owner_id, user_id, owner_name, owner_email)
       VALUES ($1,$2,$3,$4)`,
      [ownerId, userId, username, normalizedEmail]
    );

    await client.query('COMMIT');
    client.release(); client = null;
    const emailSent = await deliverVerification({ email: normalizedEmail, username, token: verification.token }).catch((error) => {
      console.error('Deliver registration verification failed:', error);
      return false;
    });
    if (!emailSent) {
      await pool.query('UPDATE tb_user SET email_verification_sent_at = NULL WHERE user_id = $1 AND email_verification_token_hash = $2', [userId, verification.hash]).catch((error) => console.error('Release verification retry failed:', error));
    }
    res.status(201).json({ message: 'สมัครสมาชิกแล้ว กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ', verification_email_sent: emailSent });
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error(err);
    if (err.code === '23505') {
      return res.status(400).json({ message: 'ชื่อผู้ใช้หรืออีเมลนี้ถูกใช้งานแล้ว' });
    }
    res.status(500).json({ message: 'สมัครไม่สำเร็จ' });
  } finally {
    if (client) client.release();
  }
});

router.post('/verify-email', async (req, res) => {
  const token = req.body?.token;
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
    return res.status(400).json({ message: 'ลิงก์ยืนยันไม่ถูกต้องหรือหมดอายุ' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE tb_user SET email_verified_at = CURRENT_TIMESTAMP,
          email_verification_token_hash = NULL, email_verification_expires_at = NULL, email_verification_sent_at = NULL
       WHERE email_verification_token_hash = $1 AND email_verification_expires_at > CURRENT_TIMESTAMP
         AND email_verified_at IS NULL
       RETURNING user_id`,
      [hashVerificationToken(token)]
    );
    await client.query('COMMIT');
    if (!result.rowCount) return res.status(400).json({ message: 'ลิงก์ยืนยันไม่ถูกต้อง หมดอายุ หรือถูกใช้ไปแล้ว' });
    return res.json({ message: 'ยืนยันอีเมลสำเร็จ เข้าสู่ระบบได้แล้ว' });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Verify email failed:', error);
    return res.status(500).json({ message: 'ยืนยันอีเมลไม่สำเร็จ กรุณาลองใหม่' });
  } finally { client.release(); }
});

router.post('/resend-verification', async (req, res) => {
  const normalizedEmail = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!normalizedEmail || normalizedEmail.length > 100 || !emailPattern.test(normalizedEmail)) {
    return res.status(400).json({ message: 'กรุณากรอกอีเมลให้ถูกต้อง' });
  }
  const generic = { message: 'หากอีเมลนี้ยังรอยืนยัน ระบบจะส่งลิงก์ใหม่ให้' };
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const found = await client.query(
      'SELECT user_id, username, email_verified_at, email_verification_sent_at FROM tb_user WHERE LOWER(email) = $1 FOR UPDATE',
      [normalizedEmail]
    );
    const user = found.rows[0];
    if (!user || user.email_verified_at) {
      await client.query('COMMIT');
      return res.json(generic);
    }
    if (user.email_verification_sent_at && Date.now() - new Date(user.email_verification_sent_at).getTime() < 60_000) {
      await client.query('COMMIT');
      return res.status(429).json({ message: 'เพิ่งส่งลิงก์ไป กรุณารอ 1 นาทีแล้วลองอีกครั้ง' });
    }
    const verification = makeVerificationToken();
    await client.query(
      `UPDATE tb_user SET email_verification_token_hash = $1,
          email_verification_expires_at = CURRENT_TIMESTAMP + INTERVAL '24 hours',
          email_verification_sent_at = CURRENT_TIMESTAMP WHERE user_id = $2`,
      [verification.hash, user.user_id]
    );
    await client.query('COMMIT');
    const sent = await deliverVerification({ email: normalizedEmail, username: user.username, token: verification.token }).catch((error) => {
      console.error('Deliver resent verification failed:', error);
      return false;
    });
    if (!sent) {
      await pool.query('UPDATE tb_user SET email_verification_sent_at = NULL WHERE user_id = $1 AND email_verification_token_hash = $2', [user.user_id, verification.hash]).catch((error) => console.error('Release verification retry failed:', error));
      return res.status(503).json({ message: 'ส่งอีเมลไม่สำเร็จ กรุณาตรวจการตั้งค่าอีเมลหรือลองใหม่' });
    }
    return res.json(generic);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Resend verification failed:', error);
    return res.status(500).json({ message: 'ส่งลิงก์ใหม่ไม่สำเร็จ กรุณาลองใหม่' });
  } finally { client.release(); }
});

// ================= LOGIN =================
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'กรอกข้อมูลไม่ครบ' });
    }

    if (adminUsername && adminPassword && username === adminUsername && password === adminPassword) {
      const adminResult = await pool.query(
        `SELECT user_id, username, user_role
         FROM tb_user
         WHERE username = $1
         ORDER BY user_id ASC
         LIMIT 1`,
        [adminUsername]
      );

      const matchingUser = adminResult.rows[0] || null;
      const fallbackIdTaken = !matchingUser && (await pool.query(
        'SELECT 1 FROM tb_user WHERE user_id = $1', [adminUserId]
      )).rowCount > 0;
      if (matchingUser?.user_role === 'admin' || (!matchingUser && !fallbackIdTaken)) {
        const resolvedAdminUserId = matchingUser?.user_id || adminUserId;
        const resolvedAdminDisplayName = matchingUser?.username || adminDisplayName;
        const token = jwt.sign(
          { user_id: resolvedAdminUserId, role: 'admin', ...(matchingUser ? {} : { system_admin: true }) },
          process.env.JWT_SECRET,
          { expiresIn: '1d' }
        );

        return res.json({
          message: 'เข้าสู่ระบบผู้ดูแลระบบสำเร็จ', token,
          user: { user_id: resolvedAdminUserId, username: resolvedAdminDisplayName, role: 'admin' }
        });
      }
    }

    const result = await pool.query(
      'SELECT * FROM tb_user WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'ไม่พบผู้ใช้' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'รหัสผ่านไม่ถูกต้อง' });
    }

    if (user.email_verified_at === null) {
      return res.status(403).json({ code: 'EMAIL_NOT_VERIFIED', message: 'กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ', email: user.email });
    }

    const token = jwt.sign(
      {
        user_id: user.user_id,
        role: user.user_role
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      message: 'เข้าสู่ระบบสำเร็จ',
      token,
      user: {
        user_id: user.user_id,
        username: user.username,
        role: user.user_role
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'เข้าสู่ระบบไม่สำเร็จ' });
  }
});

module.exports = router;
