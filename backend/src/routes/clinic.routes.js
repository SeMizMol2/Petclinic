const express = require('express');
const router = express.Router();
const pool = require('../database/db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT clinic_id, clinic_name, address, tel, open_hours
      FROM tb_clinic
      ORDER BY clinic_id ASC
      LIMIT 1
    `);

    res.json(result.rows[0] || null);
  } catch (err) {
    console.error('Error fetching clinic info:', err);
    res.status(500).json({ message: 'โหลดข้อมูลคลินิกไม่สำเร็จ' });
  }
});

module.exports = router;
