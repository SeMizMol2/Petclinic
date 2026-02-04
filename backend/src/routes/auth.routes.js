const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../database/db');
const jwt = require('jsonwebtoken');


// ================= REGISTER =================
router.post('/register', async (req, res) => {
  try {

    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'กรอกข้อมูลไม่ครบ' });
    }

    const checkUser = await pool.query(
      'SELECT * FROM tb_user WHERE username = $1',
      [username]
    );

    if (checkUser.rows.length > 0) {
      return res.status(400).json({ message: 'Username ซ้ำ' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // ⭐ ใช้ timestamp ตัวเดียว
    const time = Date.now();
    const userId = 'U' + time;
    const ownerId = 'O' + time;

    await pool.query(
      `INSERT INTO tb_user (user_id, username, password, user_role)
       VALUES ($1,$2,$3,$4)`,
      [userId, username, hashedPassword, 'user']
    );

    await pool.query(
      `INSERT INTO tb_owner (owner_id, user_id, owner_name)
       VALUES ($1,$2,$3)`,
      [ownerId, userId, username]
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

    // 🔎 หา user
    const result = await pool.query(
      'SELECT * FROM tb_user WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'ไม่พบผู้ใช้' });
    }

    const user = result.rows[0];

    // 🔐 เช็ครหัสผ่าน
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'รหัสผ่านไม่ถูกต้อง' });
    }

    // ⭐ สร้าง token
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
