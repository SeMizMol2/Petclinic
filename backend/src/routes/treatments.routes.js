const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const auth = require('./auth.middleware');

// 1. ดึงข้อมูลสัตว์เลี้ยงทั้งหมด (เพื่อทำ Dropdown ให้หมอเลือก)
router.get('/pets', auth, async (req, res) => {
    try {
        const pets = await pool.query(`
            SELECT p.pet_id, p.pet_name, o.owner_name 
            FROM tb_pet p 
            LEFT JOIN tb_owner o ON p.owner_id = o.owner_id
        `);
        res.json(pets.rows);
    } catch (err) {
        res.status(500).json({ message: "Error fetching pets" });
    }
});

// 2. ดึงข้อมูลบริการ/ค่ารักษา (เพื่อทำ Dropdown ให้หมอเลือกจ่ายยา/บริการ)
router.get('/services', auth, async (req, res) => {
    try {
        const services = await pool.query('SELECT service_id, service_name, service_price FROM tb_service');
        res.json(services.rows);
    } catch (err) {
        res.status(500).json({ message: "Error fetching services" });
    }
});

// 3. บันทึกข้อมูลการรักษา (บันทึกลง 2 ตารางพร้อมกันด้วย Transaction)
router.post('/', auth, async (req, res) => {
    const client = await pool.connect(); // ใช้ client สำหรับ Transaction
    try {
        const { pet_id, vet_id, symptom, diagnosis, services, total_amount } = req.body;
        const user_id = req.user.user_id; // ดึงรหัสหมอจาก Token ที่ Login

        await client.query('BEGIN'); // เริ่มต้น Transaction

        // 3.1 สร้างรหัสบิลการรักษาอัตโนมัติ (เช่น TR2605001)
        const lastTr = await client.query('SELECT treatment_id FROM tb_treatment ORDER BY treatment_id DESC LIMIT 1');
        let newTrId = 'TR001';
        if (lastTr.rows.length > 0) {
            const lastNum = parseInt(lastTr.rows[0].treatment_id.substring(2)) + 1;
            newTrId = 'TR' + lastNum.toString().padStart(3, '0');
        }

        // 3.2 บันทึกหัวบิลลง tb_treatment
        await client.query(
            `INSERT INTO tb_treatment (treatment_id, pet_id, user_id, vet_id, symptom, diagnosis, total_amount) 
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [newTrId, pet_id, user_id, vet_id || null, symptom, diagnosis, total_amount]
        );

        // 3.3 วนลูปบันทึกรายการย่อยลง tb_treatment_detail
        for (const item of services) {
            await client.query(
                `INSERT INTO tb_treatment_detail (treatment_id, service_id, quantity, price) 
                 VALUES ($1, $2, $3, $4)`,
                [newTrId, item.service_id, item.quantity, item.price]
            );
        }

        await client.query('COMMIT'); // ยืนยันการบันทึกข้อมูลทั้งหมด
        res.status(201).json({ message: 'บันทึกการรักษาสำเร็จ', treatment_id: newTrId });

    } catch (err) {
        await client.query('ROLLBACK'); // ถ้ายกเลิก หรือพังกลางทาง ให้ย้อนกลับทั้งหมด
        console.error("Transaction Error:", err.message);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" });
    } finally {
        client.release(); // คืนการเชื่อมต่อให้ระบบ
    }
});

// 4. ดึงประวัติการรักษาทั้งหมด (เพื่อนำไปโชว์ในตาราง)
router.get('/', auth, async (req, res) => {
    try {
        const history = await pool.query(`
            SELECT t.treatment_id, t.treatment_date, t.symptom, t.diagnosis, t.total_amount, 
                   p.pet_name, o.owner_name, u.username as doctor_name, v.vet_name
            FROM tb_treatment t
            JOIN tb_pet p ON t.pet_id = p.pet_id
            JOIN tb_owner o ON p.owner_id = o.owner_id
            LEFT JOIN tb_user u ON t.user_id = u.user_id
            LEFT JOIN tb_veterinarian v ON t.vet_id = v.vet_id
            ORDER BY t.treatment_date DESC
        `);
        res.json(history.rows);
    } catch (err) {
        res.status(500).json({ message: "Error fetching history" });
    }
});

module.exports = router;
