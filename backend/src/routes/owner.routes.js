const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const auth = require('./auth.middleware');

// API สำหรับดึงข้อมูลหน้า Dashboard ของเจ้าของสัตว์เลี้ยง
router.get('/dashboard', auth, async (req, res) => {
    try {
        // 1. หา owner_id จาก user_id ที่ล็อกอินเข้ามา
        const user_id = req.user.id;
        const ownerQuery = await pool.query('SELECT owner_id, owner_name FROM tb_owner WHERE user_id = $1', [user_id]);
        
        if (ownerQuery.rows.length === 0) {
            return res.status(404).json({ message: 'ไม่พบข้อมูลเจ้าของสัตว์เลี้ยง' });
        }
        
        const owner = ownerQuery.rows[0];
        const owner_id = owner.owner_id;

        // 2. ดึงข้อมูลสัตว์เลี้ยงทั้งหมดของเจ้าของคนนี้
        const pets = await pool.query('SELECT * FROM tb_pet WHERE owner_id = $1', [owner_id]);

        // 3. ดึงรายการนัดหมายที่กำลังจะมาถึง
        const appointments = await pool.query(`
            SELECT a.appt_date, a.appt_time, a.appt_reason, a.appt_status, p.pet_name 
            FROM tb_appointment a
            JOIN tb_pet p ON a.pet_id = p.pet_id
            WHERE p.owner_id = $1 AND a.appt_date >= CURRENT_DATE AND a.appt_status = 'ยืนยัน'
            ORDER BY a.appt_date ASC, a.appt_time ASC LIMIT 5
        `, [owner_id]);

        // 4. ดึงประวัติการรักษาที่ผ่านมา
        const history = await pool.query(`
            SELECT t.treatment_id, t.treatment_date, t.diagnosis, t.total_amount, p.pet_name 
            FROM tb_treatment t
            JOIN tb_pet p ON t.pet_id = p.pet_id
            WHERE p.owner_id = $1
            ORDER BY t.treatment_date DESC LIMIT 5
        `, [owner_id]);

        res.json({
            owner_name: owner.owner_name,
            pets: pets.rows,
            appointments: appointments.rows,
            history: history.rows
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูล" });
    }
});

module.exports = router;