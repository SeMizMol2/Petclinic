const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const auth = require('./auth.middleware');

// 1. ดึงข้อมูลบริการทั้งหมด
router.get('/', auth, async (req, res) => {
    try {
        const services = await pool.query('SELECT * FROM tb_service ORDER BY service_id ASC');
        res.json(services.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูลบริการ" });
    }
});

// 2. เพิ่มข้อมูลบริการใหม่
router.post('/', auth, async (req, res) => {
    try {
        const { service_name, service_desc, service_price } = req.body;

        // สร้างรหัสบริการอัตโนมัติ (เช่น SV001, SV002)
        const lastService = await pool.query('SELECT service_id FROM tb_service ORDER BY service_id DESC LIMIT 1');
        let newId = 'SV001';
        if (lastService.rows.length > 0) {
            const lastId = lastService.rows[0].service_id;
            const num = parseInt(lastId.substring(2)) + 1;
            newId = 'SV' + num.toString().padStart(3, '0');
        }

        await pool.query(
            'INSERT INTO tb_service (service_id, service_name, service_desc, service_price) VALUES ($1, $2, $3, $4)',
            [newId, service_name, service_desc, service_price]
        );
        res.status(201).json({ message: 'เพิ่มบริการใหม่สำเร็จ', service_id: newId });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการเพิ่มบริการ" });
    }
});

// 3. แก้ไขข้อมูลบริการ
router.put('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { service_name, service_desc, service_price } = req.body;

        await pool.query(
            'UPDATE tb_service SET service_name = $1, service_desc = $2, service_price = $3, update_datetime = CURRENT_TIMESTAMP WHERE service_id = $4',
            [service_name, service_desc, service_price, id]
        );
        res.json({ message: 'แก้ไขข้อมูลสำเร็จ' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการแก้ไขข้อมูล" });
    }
});

// 4. ลบข้อมูลบริการ
router.delete('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM tb_service WHERE service_id = $1', [id]);
        res.json({ message: 'ลบข้อมูลสำเร็จ' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการลบข้อมูล" });
    }
});

module.exports = router;