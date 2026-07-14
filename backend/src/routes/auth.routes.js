const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../database/db');
const jwt = require('jsonwebtoken');

const adminUsername = process.env.ADMIN_USERNAME;
const adminPassword = process.env.ADMIN_PASSWORD;
const adminUserId = process.env.ADMIN_USER_ID || 'admin_001';
const adminDisplayName = process.env.ADMIN_DISPLAY_NAME || 'Administrator';
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ================= REGISTER =================
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!username || !normalizedEmail || !password) {
      return res.status(400).json({ message: 'กรอกข้อมูลไม่ครบ' });
    }

    if (!emailPattern.test(normalizedEmail)) {
      return res.status(400).json({ message: 'รูปแบบอีเมลไม่ถูกต้อง' });
    }

    const checkUser = await pool.query(
      `SELECT username, email
       FROM tb_user
       WHERE username = $1 OR LOWER(email) = $2
       LIMIT 1`,
      [username, normalizedEmail]
    );

    if (checkUser.rows.length > 0) {
      if (checkUser.rows[0].username === username) {
        return res.status(400).json({ message: 'Username ซ้ำ' });
      }

      return res.status(400).json({ message: 'อีเมลนี้ถูกใช้งานแล้ว' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const time = Date.now();
    const userId = 'U' + time;
    const ownerId = 'O' + time;

    await pool.query(
      `INSERT INTO tb_user (user_id, username, email, password, user_role)
       VALUES ($1,$2,$3,$4,$5)`,
      [userId, username, normalizedEmail, hashedPassword, 'user']
    );

    await pool.query(
      `INSERT INTO tb_owner (owner_id, user_id, owner_name, owner_email)
       VALUES ($1,$2,$3,$4)`,
      [ownerId, userId, username, normalizedEmail]
    );

    res.json({ message: 'สมัครสมาชิกสำเร็จ' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'สมัครไม่สำเร็จ' });
  }
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
         WHERE username = $1 AND user_role = 'admin'
         ORDER BY user_id ASC
         LIMIT 1`,
        [adminUsername]
      );

      const adminUser = adminResult.rows[0] || null;
      const resolvedAdminUserId = adminUser?.user_id || adminUserId;
      const resolvedAdminDisplayName = adminUser?.username || adminDisplayName;

      const token = jwt.sign(
        { user_id: resolvedAdminUserId, role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );

      return res.json({
        message: 'เข้าสู่ระบบผู้ดูแลระบบสำเร็จ',
        token,
        user: {
          user_id: resolvedAdminUserId,
          username: resolvedAdminDisplayName,
          role: 'admin'
        }
      });
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
