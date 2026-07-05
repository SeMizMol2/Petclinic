const express = require('express');
const router = express.Router();
// ดึงสะพานเชื่อมฐานข้อมูลที่เราทำไว้ตอนแรกมาใช้
const pool = require('../database/db'); 

// 🏥 API: ดึงประวัติการรักษาของสัตว์เลี้ยง (ตาม ID)
router.get('/pet-history/:pet_id', async (req, res) => {
    try {
        // 1. รับค่ารหัสสัตว์เลี้ยง (pet_id) ที่หน้าเว็บส่งมาให้
        const { pet_id } = req.params;

        // 2. ดึงประวัติการรักษาของสัตว์เลี้ยงตัวนี้ (หัวบิลทั้งหมด เรียงจากล่าสุดลงมา)
        const treatmentSql = `
            SELECT t.treatment_id, t.treatment_date, t.symptom, t.diagnosis, t.total_amount,
                   u.username AS doctor_name
            FROM tb_treatment t
            LEFT JOIN tb_user u ON t.user_id = u.user_id
            WHERE t.pet_id = $1
            ORDER BY t.treatment_date DESC
        `;
        const treatments = await pool.query(treatmentSql, [pet_id]);

        // 3. ดึงรายการรักษา/บริการย่อยของแต่ละบิล มาแปะให้ในแต่ละรายการ
        const treatmentIds = treatments.rows.map(t => t.treatment_id);
        let detailsByTreatment = {};

        if (treatmentIds.length > 0) {
            const detailSql = `
                SELECT d.treatment_id, d.service_id, d.quantity, d.price, s.service_name
                FROM tb_treatment_detail d
                LEFT JOIN tb_service s ON d.service_id = s.service_id
                WHERE d.treatment_id = ANY($1::varchar[])
            `;
            const details = await pool.query(detailSql, [treatmentIds]);

            detailsByTreatment = details.rows.reduce((acc, row) => {
                if (!acc[row.treatment_id]) acc[row.treatment_id] = [];
                acc[row.treatment_id].push(row);
                return acc;
            }, {});
        }

        const data = treatments.rows.map(t => ({
            ...t,
            details: detailsByTreatment[t.treatment_id] || []
        }));

        // 4. ส่งผลลัพธ์กลับไปให้หน้าเว็บ
        res.json({
            success: true,
            message: "ดึงข้อมูลประวัติการรักษาสำเร็จ",
            data
        });

    } catch (err) {
        console.error("เกิดข้อผิดพลาด:", err.message);
        res.status(500).json({ success: false, message: "เซิร์ฟเวอร์มีปัญหา" });
    }
});

module.exports = router;