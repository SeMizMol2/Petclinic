const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const auth = require('./auth.middleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

router.get('/me', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        u.user_id,
        u.username,
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
  try {
    const { owner_name, owner_email, tel } = req.body;

    await pool.query(
      'UPDATE tb_user SET email = $1 WHERE user_id = $2',
      [owner_email || null, req.user.user_id]
    );

    await pool.query(
      `
      UPDATE tb_owner
      SET owner_name = $1,
          owner_email = $2,
          owner_tel = $3
      WHERE user_id = $4
      `,
      [owner_name || null, owner_email || null, tel || null, req.user.user_id]
    );

    res.json({ message: 'บันทึกสำเร็จ' });
  } catch (err) {
    console.error('Update user profile error:', err);
    res.status(500).json({ message: 'บันทึกข้อมูลไม่สำเร็จ' });
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

const upload = multer({ storage });

router.post('/upload-profile', auth, upload.single('profileImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'ไม่พบไฟล์' });
    }

    const imageUrl = `http://localhost:3000/uploads/profiles/${req.file.filename}`;

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
      SELECT u.user_id, u.username, u.user_role, o.owner_name, o.owner_tel
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
