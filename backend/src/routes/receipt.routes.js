const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const auth = require('./auth.middleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ================= ตั้งค่าที่เก็บไฟล์หลักฐานการโอนเงิน =================
const proofUploadDir = path.join(__dirname, '../../../uploads/proofs');
if (!fs.existsSync(proofUploadDir)) { fs.mkdirSync(proofUploadDir, { recursive: true }); }

const proofStorage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, proofUploadDir); },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'proof-' + req.user.user_id + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const uploadProof = multer({ storage: proofStorage });

// 🧾 API: ดึงใบเสร็จทั้งหมดของ User ที่กำลังล็อคอิน
// ⭐ แก้ไข: ใส่ auth ป้องกันคนอื่นสวมรอยดูใบเสร็จของ user_id คนอื่น
// ⭐ แก้ไข: tb_receipt.user_id คือ "พนักงานที่ออกบิล" ไม่ใช่เจ้าของสัตว์เลี้ยง
//           จึงต้อง join ผ่าน tb_owner เพื่อหาบิลของเจ้าของที่ล็อกอินอยู่จริง
router.get('/my-receipts/:user_id', auth, async (req, res) => {
    try {
        const { user_id } = req.params;

        // ป้องกันไม่ให้ user คนอื่นสวมรอยดูใบเสร็จ (ยกเว้น admin)
        if (req.user.role !== 'admin' && req.user.user_id !== user_id) {
            return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึงข้อมูลนี้' });
        }

        const sql = `
            SELECT 
                r.receipt_id, 
                r.issue_date, 
                r.total_amount, 
                r.payment_status, 
                r.pay_method,
                r.pay_date,
                r.proof_image,
                r.treatment_id
            FROM tb_receipt r
            JOIN tb_owner o ON r.owner_id = o.owner_id
            WHERE o.user_id = $1 
            ORDER BY r.issue_date DESC
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

// ================= สร้างใบเสร็จจากการรักษา (Admin/สัตวแพทย์) =================
router.post('/', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์ทำรายการ' });
        }

        const { treatment_id, pay_method } = req.body;
        if (!treatment_id) {
            return res.status(400).json({ success: false, message: 'กรุณาระบุรหัสการรักษา' });
        }

        // หา pet -> owner และยอดรวมจาก treatment ที่ระบุ
        const treatmentResult = await pool.query(
            `SELECT t.total_amount, p.owner_id
             FROM tb_treatment t
             JOIN tb_pet p ON t.pet_id = p.pet_id
             WHERE t.treatment_id = $1`,
            [treatment_id]
        );

        if (treatmentResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลการรักษานี้' });
        }

        const { total_amount, owner_id } = treatmentResult.rows[0];
        const receipt_id = 'RC' + Date.now();

        const newReceipt = await pool.query(
            `INSERT INTO tb_receipt (receipt_id, total_amount, owner_id, user_id, treatment_id, pay_method)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [receipt_id, total_amount, owner_id, req.user.user_id, treatment_id, pay_method || null]
        );

        res.status(201).json({ success: true, message: 'สร้างใบเสร็จสำเร็จ', data: newReceipt.rows[0] });
    } catch (err) {
        console.error("Error Create Receipt:", err);
        res.status(500).json({ success: false, message: 'สร้างใบเสร็จไม่สำเร็จ' });
    }
});

// ================= อัปเดตสถานะการชำระเงิน (Admin) =================
router.put('/:id/status', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์ทำรายการ' });
        }

        const { id } = req.params;
        const { payment_status, pay_method } = req.body;

        if (!['ยังไม่ได้ชำระ', 'ชำระเสร็จสิ้น'].includes(payment_status)) {
            return res.status(400).json({ success: false, message: 'สถานะไม่ถูกต้อง' });
        }

        const payDate = payment_status === 'ชำระเสร็จสิ้น' ? new Date() : null;

        await pool.query(
            `UPDATE tb_receipt 
             SET payment_status = $1, pay_method = COALESCE($2, pay_method), pay_date = $3, update_datetime = NOW()
             WHERE receipt_id = $4`,
            [payment_status, pay_method || null, payDate, id]
        );

        res.json({ success: true, message: 'อัปเดตสถานะการชำระเงินสำเร็จ' });
    } catch (err) {
        console.error("Error Update Receipt Status:", err);
        res.status(500).json({ success: false, message: 'อัปเดตสถานะไม่สำเร็จ' });
    }
});

// ================= อัปโหลดหลักฐานการโอนเงิน (User) =================
router.post('/:id/proof', auth, uploadProof.single('proofImage'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'ไม่พบไฟล์' });

        const { id } = req.params;
        const imageUrl = `http://localhost:3000/uploads/proofs/${req.file.filename}`;

        await pool.query(
            `UPDATE tb_receipt SET proof_image = $1, update_datetime = NOW() WHERE receipt_id = $2`,
            [imageUrl, id]
        );

        res.json({ success: true, imageUrl, message: 'อัปโหลดหลักฐานการโอนเงินสำเร็จ กรุณารอแอดมินตรวจสอบ' });
    } catch (err) {
        console.error("Error Upload Proof:", err);
        res.status(500).json({ success: false, message: 'อัปโหลดหลักฐานไม่สำเร็จ' });
    }
});

module.exports = router;