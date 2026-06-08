const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const auth = require('./auth.middleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ================= GET USER INFO =================
router.get('/me', auth, async (req, res) => {
  try {
    const userId = req.user.user_id;
    // ผมแก้ comma ที่เกินมาออกให้แล้วครับ
    const result = await pool.query(
      `SELECT 
          u.user_id, 
          u.username, 
          o.owner_name, 
          o.owner_email,
          o.owner_tel AS tel,
          o.profile_pic,
          o.owner_address
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
    const { owner_name, owner_email, tel, owner_address } = req.body;

    // --- ตรงนี้คือจุดที่พัง ---
    // พี่ลองเช็คดูว่าชื่อใน SET กับ WHERE ตรงกับชื่อคอลัมน์จริงๆ ในตารางไหม
   // แก้บรรทัด const sql เป็นบรรทัดนี้ครับ (ใส่ double quotes ครอบชื่อทั้งหมด)
    const sql = `UPDATE "tb_owner" SET "owner_name" = $1, "owner_email" = $2, "owner_tel" = $3, "owner_address" = $4 WHERE "user_id" = $5`;
    
    // พิมพ์ SQL ออกมาดูใน Terminal
    console.log("SQL ที่จะรัน:", sql);
    console.log("Values:", [owner_name, owner_email, tel, owner_address, userId]);

    const result = await pool.query(sql, [owner_name, owner_email, tel, owner_address, userId]);
    
    res.json({ message: 'บันทึกสำเร็จ' });
  } catch (err) {
    // ให้มันฟ้องออกมาเลยว่าพังตรงไหน
    console.error("SQL Error:", err.message);
    res.status(500).json({ message: "พังตรงนี้: " + err.message });
  }
});

// ================= ระบบอัปโหลดรูปโปรไฟล์ =================
const uploadDir = path.join(__dirname, '../../../uploads/profiles');
if (!fs.existsSync(uploadDir)) { fs.mkdirSync(uploadDir, { recursive: true }); }

const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, uploadDir); },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'profile-' + req.user.user_id + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

router.post('/upload-profile', auth, upload.single('profileImage'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'ไม่พบไฟล์' });
        const imageUrl = `http://localhost:3000/uploads/profiles/${req.file.filename}`;
        
        await pool.query('UPDATE tb_owner SET profile_pic = $1 WHERE user_id = $2', [imageUrl, req.user.user_id]);
        
        res.json({ success: true, imageUrl: imageUrl, message: 'อัปโหลดรูปเรียบร้อย' });
    } catch (err) { 
        console.error("Error Upload:", err);
        res.status(500).json({ message: 'เซฟรูปไม่สำเร็จ' }); 
    }
});

module.exports = router;