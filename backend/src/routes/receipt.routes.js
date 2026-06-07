const express = require('express');
const router = express.Router();
const pool = require('../database/db'); 

// 🧾 API: ดึงใบเสร็จทั้งหมดของ User ที่กำลังล็อคอิน
router.get('/my-receipts/:user_id', async (req, res) => {
    try {
        const { user_id } = req.params;

        // ดึงข้อมูลจากตาราง tb_receipt เรียงจากบิลล่าสุดไปเก่า
        const sql = `
            SELECT 
                receipt_id, 
                issue_date, 
                total_amount, 
                payment_status, 
                pay_method 
            FROM tb_receipt 
            WHERE user_id = $1 
            ORDER BY issue_date DESC
        `;
        
        const result = await pool.query(sql, [user_id]);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (err) {
        console.error("เกิดข้อผิดพลาดในการดึงใบเสร็จ:", err);
        res.status(500).json({ success: false, message: "ดึงข้อมูลใบเสร็จไม่สำเร็จ" });
    }
});

module.exports = router;