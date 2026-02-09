const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const auth = require('./auth.middleware');
const bcrypt = require('bcryptjs');

// ================= DASHBOARD STATS =================
router.get('/dashboard', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึง' });
    }

    const userCount = await pool.query(
      "SELECT COUNT(*) FROM tb_user WHERE user_role = 'user'"
    );

    const petCount = await pool.query(
      "SELECT COUNT(*) FROM tb_pet"
    );

    // ⭐ เพิ่ม pet_count ให้รายการล่าสุดด้วย
    const recentUsers = await pool.query(
      `SELECT u.user_id, u.username, u.user_role, o.owner_name, o.owner_tel,
              (SELECT COUNT(*) FROM tb_pet p WHERE p.owner_id = o.owner_id) AS pet_count
       FROM tb_user u
       LEFT JOIN tb_owner o ON u.user_id = o.user_id
       WHERE u.user_role = 'user'
       ORDER BY u.user_id DESC 
       LIMIT 5`
    );

    res.json({
      totalUsers: userCount.rows[0].count,
      totalPets: petCount.rows[0].count,
      recentUsers: recentUsers.rows
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาด Server' });
  }
});

// ================= GET ALL USERS =================
router.get('/users', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึง' });
    }

    // ⭐ แก้ไข SQL: เพิ่มการนับจำนวนสัตว์เลี้ยง (pet_count)
    const users = await pool.query(
      `SELECT u.user_id, u.username, u.user_role, 
              o.owner_name, o.owner_email, o.owner_tel,
              (SELECT COUNT(*) FROM tb_pet p WHERE p.owner_id = o.owner_id) AS pet_count
       FROM tb_user u
       LEFT JOIN tb_owner o ON u.user_id = o.user_id
       WHERE u.user_role = 'user'
       ORDER BY u.user_id DESC`
    );

    res.json(users.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาด Server' });
  }
});

// ================= ADD USER (Walk-in / Offline) =================
router.post('/users', auth, async (req, res) => {
  try {
    const { owner_name, email, tel } = req.body; 

    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์ทำรายการ' });
    }

    // 1. สร้าง ID และ Mock Data
    const time = Date.now();
    const userId = 'U' + time;
    const ownerId = 'O' + time;
    
    // สร้าง Username อัตโนมัติ
    const mockUsername = `guest_${time}`;
    // ตั้งรหัสผ่านเริ่มต้น
    const mockPassword = await bcrypt.hash('123456', 10); 

    // 2. Insert ลง tb_user
    await pool.query(
      `INSERT INTO tb_user (user_id, username, password, user_role)
       VALUES ($1, $2, $3, $4)`,
      [userId, mockUsername, mockPassword, 'user']
    );

    // 3. Insert ลง tb_owner
    await pool.query(
      `INSERT INTO tb_owner (owner_id, user_id, owner_name, owner_email, owner_tel)
       VALUES ($1, $2, $3, $4, $5)`,
      [ownerId, userId, owner_name, email, tel]
    );

    res.json({ message: 'เพิ่มสมาชิกสำเร็จ', username: mockUsername });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'เพิ่มสมาชิกไม่สำเร็จ' });
  }
});

// ================= DELETE USER =================
router.delete('/users/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์ทำรายการ' });
    }

    await pool.query('DELETE FROM tb_user WHERE user_id = $1', [id]);

    res.json({ message: 'ลบผู้ใช้งานสำเร็จ' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'ลบไม่สำเร็จ (อาจมีข้อมูลสัตว์เลี้ยงค้างอยู่)' });
  }
});

// ================= EDIT USER =================
router.put('/users/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, owner_name, email, tel } = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์ทำรายการ' });
    }

    // 1. อัปเดต Username (ถ้ามีการส่งมา)
    if (username) {
        await pool.query(
        'UPDATE tb_user SET username = $1 WHERE user_id = $2',
        [username, id]
        );
    }

    // 2. อัปเดตข้อมูลส่วนตัว
    await pool.query(
      'UPDATE tb_owner SET owner_name = $1, owner_email = $2, owner_tel = $3 WHERE user_id = $4',
      [owner_name, email, tel, id]
    );

    res.json({ message: 'แก้ไขข้อมูลสำเร็จ' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'แก้ไขไม่สำเร็จ' });
  }
});

module.exports = router;