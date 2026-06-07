const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const auth = require('./auth.middleware');

// ================= GET ALL APPOINTMENTS (Admin) =================
router.get('/', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึง' });
        }

        const appointments = await pool.query(
            `SELECT a.appt_id, a.appt_date, a.appt_time, a.appt_reason, a.appt_status, a.cancel_reason,
                    a.pet_id, p.pet_name, o.owner_name
             FROM tb_appointment a
             LEFT JOIN tb_pet p ON a.pet_id = p.pet_id
             LEFT JOIN tb_owner o ON p.owner_id = o.owner_id
             ORDER BY a.appt_date ASC, a.appt_time ASC`
        );

        res.json(appointments.rows);
    } catch (err) {
        console.error("❌ Error Get Appointments ❌:", err.message);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลนัดหมาย' });
    }
});

// ================= UPDATE APPOINTMENT (Edit Mode) =================
router.put('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { appt_date, appt_time, appt_status, cancel_reason } = req.body;

        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'ไม่มีสิทธิ์ทำรายการ' });
        }

        await pool.query(
            `UPDATE tb_appointment 
             SET appt_date = $1, appt_time = $2, appt_status = $3, cancel_reason = $4, update_datetime = NOW() 
             WHERE appt_id = $5`,
            [appt_date, appt_time, appt_status, cancel_reason, id]
        );

        res.json({ message: 'อัปเดตข้อมูลสำเร็จ' });
    } catch (err) {
        console.error("Error Update Appointment:", err);
        res.status(500).json({ message: 'อัปเดตไม่สำเร็จ' });
    }
});

// ================= GET PETS LIST FOR DROPDOWN =================
router.get('/pets-list', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึง' });
        }

        // ดึงรหัสสัตว์เลี้ยง, ชื่อสัตว์เลี้ยง และชื่อเจ้าของ สำหรับใส่ใน Dropdown
        const pets = await pool.query(
            `SELECT p.pet_id, p.pet_name, o.owner_name 
             FROM tb_pet p
             LEFT JOIN tb_owner o ON p.owner_id = o.owner_id
             ORDER BY p.pet_id DESC`
        );

        res.json(pets.rows);
    } catch (err) {
        console.error("Error Get Pets List:", err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสัตว์เลี้ยง' });
    }
});

// ================= ADD APPOINTMENT (Admin) =================
router.post('/', auth, async (req, res) => {
    try {
        const { pet_id, appt_date, appt_time, appt_reason, appt_status } = req.body;

        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'ไม่มีสิทธิ์ทำรายการ' });
        }

        // ⭐ เพิ่ม Validation: ดักจับกรณีส่งข้อมูลมาไม่ครบ เพื่อป้องกัน Database Error
        if (!pet_id || !appt_date || !appt_time) {
            return res.status(400).json({ message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน (รหัสสัตว์เลี้ยง, วันที่, เวลา)' });
        }

        // สร้างรหัส appt_id ความยาว 10 ตัวอักษร (AP + ตัวเลขสุ่ม 8 หลัก)
        const randomNum = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
        const appt_id = 'AP' + randomNum;

        const newAppointment = await pool.query(
            `INSERT INTO tb_appointment (appt_id, pet_id, appt_date, appt_time, appt_reason, appt_status, create_datetime)
             VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *`,
            [appt_id, pet_id, appt_date, appt_time, appt_reason, appt_status || 'ยืนยัน']
        );

        res.status(201).json({ message: 'สร้างการนัดหมายสำเร็จ', appointment: newAppointment.rows[0] });
    } catch (err) {
        console.error("Error Add Appointment:", err);
        res.status(500).json({ message: 'เพิ่มการนัดหมายไม่สำเร็จ (โปรดตรวจสอบ pet_id)' });
    }
});

// ================= UPDATE APPOINTMENT STATUS =================
router.put('/:id/status', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { appt_status } = req.body;

        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'ไม่มีสิทธิ์ทำรายการ' });
        }

        if (!appt_status) {
             return res.status(400).json({ message: 'กรุณาระบุสถานะที่ต้องการเปลี่ยน' });
        }

        await pool.query(
            `UPDATE tb_appointment 
             SET appt_status = $1, update_datetime = NOW() 
             WHERE appt_id = $2`,
            [appt_status, id]
        );

        res.json({ message: 'อัปเดตสถานะสำเร็จ' });
    } catch (err) {
        console.error("Error Update Status:", err);
        res.status(500).json({ message: 'อัปเดตสถานะไม่สำเร็จ' });
    }
});

// ================= DELETE APPOINTMENT =================
router.delete('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;

        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'ไม่มีสิทธิ์ทำรายการ' });
        }

        await pool.query('DELETE FROM tb_appointment WHERE appt_id = $1', [id]);
        res.json({ message: 'ลบการนัดหมายสำเร็จ' });
    } catch (err) {
        console.error("Error Delete Appointment:", err);
        res.status(500).json({ message: 'ลบข้อมูลไม่สำเร็จ' });
    }
});


// ================= GET MY APPOINTMENTS (User) =================
router.get('/my-appointments/:user_id', auth, async (req, res) => {
    try {
        const { user_id } = req.params;

        // ดึงข้อมูลนัดหมาย โดยเชื่อมจาก User -> Owner -> Pet -> Appointment
        const sql = `
            SELECT a.appt_id, a.appt_date, a.appt_time, a.appt_reason, a.appt_status, p.pet_name
            FROM tb_appointment a
            JOIN tb_pet p ON a.pet_id = p.pet_id
            JOIN tb_owner o ON p.owner_id = o.owner_id
            WHERE o.user_id = $1
            ORDER BY a.appt_date ASC, a.appt_time ASC
        `;
        const appointments = await pool.query(sql, [user_id]);
        
        res.json({ success: true, data: appointments.rows });
    } catch (err) {
        console.error("Error Get My Appointments:", err);
        res.status(500).json({ success: false, message: 'ดึงข้อมูลนัดหมายไม่สำเร็จ' });
    }
});
module.exports = router;