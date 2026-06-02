const express = require('express');
const router = express.Router();
// ดึงสะพานเชื่อมฐานข้อมูลที่เราทำไว้ตอนแรกมาใช้
const pool = require('../database/db'); 

// 🏥 API: ดึงประวัติการรักษาของสัตว์เลี้ยง (ตาม ID)
router.get('/pet-history/:pet_id', async (req, res) => {
    try {
        // 1. รับค่ารหัสสัตว์เลี้ยง (pet_id) ที่หน้าเว็บส่งมาให้
        const { pet_id } = req.params;

        // 2. เขียนคำสั่ง SQL ไปค้นหาประวัติในฐานข้อมูล (เรียงจากวันที่ล่าสุดลงมา)
        // **พี่ต้องเปลี่ยนชื่อตาราง tb_history ให้ตรงกับใน pgAdmin ของพี่นะครับ**
        const sql = `
            SELECT * FROM tb_history 
            WHERE pet_id = $1 
            ORDER BY created_at DESC; 
        `;
        
        const result = await pool.query(sql, [pet_id]);

        // 3. ส่งผลลัพธ์กลับไปให้หน้าเว็บ (นี่คือ "ผลการดูประวัติ" ในแผนผังพี่ครับ)
        res.json({
            success: true,
            message: "ดึงข้อมูลประวัติการรักษาสำเร็จ",
            data: result.rows // ส่งก้อนข้อมูลประวัติกลับไป
        });

    } catch (err) {
        console.error("เกิดข้อผิดพลาด:", err.message);
        res.status(500).json({ success: false, message: "เซิร์ฟเวอร์มีปัญหา" });
    }
});

module.exports = router;