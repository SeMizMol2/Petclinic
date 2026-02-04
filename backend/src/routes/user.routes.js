const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const auth = require('./auth.middleware');

// ================= GET USER INFO =================
router.get('/me', auth, async (req, res) => {
  try {
    const userId = req.user.user_id;

    // ⭐ แก้ไข SQL: เปลี่ยนชื่อคอลัมน์ให้ตรงกับ DB (owner_email, owner_tel)
    // และใช้ AS เพื่อเปลี่ยนชื่อตอนส่งไป Frontend ให้เป็น email, tel เหมือนเดิม (จะได้ไม่ต้องแก้หน้าเว็บ)
    const result = await pool.query(
      `SELECT 
          u.user_id, 
          u.username, 
          o.owner_name, 
          o.owner_email AS email, 
          o.owner_tel AS tel
       FROM tb_user u
       LEFT JOIN tb_owner o ON u.user_id = o.user_id
       WHERE u.user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลผู้ใช้' });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({ message: 'โหลดข้อมูลไม่สำเร็จ' });
  }
});

// ================= UPDATE USER INFO =================
router.put('/me', auth, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { owner_name, email, tel } = req.body; // รับค่าจากหน้าเว็บ (หน้าเว็บส่งมาเป็น email, tel)

    // ⭐ แก้ไข SQL: อัปเดตลงคอลัมน์ owner_email และ owner_tel
    await pool.query(
      `UPDATE tb_owner 
       SET owner_name = $1, 
           owner_email = $2, 
           owner_tel = $3
       WHERE user_id = $4`,
      [owner_name, email, tel, userId]
    );

    res.json({ message: 'บันทึกข้อมูลสำเร็จ' });

  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).json({ message: 'บันทึกข้อมูลไม่สำเร็จ' });
  }
});

module.exports = router;