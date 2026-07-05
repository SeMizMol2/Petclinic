const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const auth = require('./auth.middleware');

// ต้องเป็น admin เท่านั้นถึงจะจัดการรายจ่าย/หมวดหมู่ของคลินิกได้
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึง' });
  }
  next();
};

// ================= หมวดหมู่ (Category) =================

// ดึงหมวดหมู่ทั้งหมด (จะกรองด้วย ?type=รายจ่าย หรือ รายรับ ก็ได้)
router.get('/categories', auth, requireAdmin, async (req, res) => {
  try {
    const { type } = req.query;
    const sql = type
      ? 'SELECT * FROM tb_category WHERE type = $1 ORDER BY category_id ASC'
      : 'SELECT * FROM tb_category ORDER BY category_id ASC';
    const result = type ? await pool.query(sql, [type]) : await pool.query(sql);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลหมวดหมู่' });
  }
});

// เพิ่มหมวดหมู่ใหม่
router.post('/categories', auth, requireAdmin, async (req, res) => {
  try {
    const { category_name, type } = req.body;

    if (!category_name || !type) {
      return res.status(400).json({ message: 'กรุณากรอกชื่อหมวดหมู่และประเภทให้ครบ' });
    }
    if (!['รายรับ', 'รายจ่าย'].includes(type)) {
      return res.status(400).json({ message: 'ประเภทต้องเป็น "รายรับ" หรือ "รายจ่าย" เท่านั้น' });
    }

    const lastCat = await pool.query('SELECT category_id FROM tb_category ORDER BY category_id DESC LIMIT 1');
    let newId = 'C001';
    if (lastCat.rows.length > 0) {
      const num = parseInt(lastCat.rows[0].category_id.substring(1)) + 1;
      newId = 'C' + num.toString().padStart(3, '0');
    }

    await pool.query(
      'INSERT INTO tb_category (category_id, category_name, type) VALUES ($1, $2, $3)',
      [newId, category_name, type]
    );
    res.status(201).json({ message: 'เพิ่มหมวดหมู่สำเร็จ', category_id: newId });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'เพิ่มหมวดหมู่ไม่สำเร็จ' });
  }
});

// ลบหมวดหมู่
router.delete('/categories/:id', auth, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM tb_category WHERE category_id = $1', [req.params.id]);
    res.json({ message: 'ลบหมวดหมู่สำเร็จ' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'ลบไม่สำเร็จ (อาจมีรายจ่ายผูกอยู่)' });
  }
});

// ================= รายจ่าย (Expense) =================

// ดึงรายจ่ายทั้งหมด (กรองตามเดือน/ปีได้ ใช้ตรงกับ Dashboard)
router.get('/', auth, requireAdmin, async (req, res) => {
  try {
    const { month, year } = req.query;

    let sql = `
      SELECT e.exp_id, e.exp_title, e.exp_amount, e.exp_date, 
             c.category_id, c.category_name, u.username AS created_by
      FROM tb_expense e
      LEFT JOIN tb_category c ON e.category_id = c.category_id
      LEFT JOIN tb_user u ON e.user_id = u.user_id
    `;
    const params = [];

    if (month && year) {
      sql += ` WHERE EXTRACT(MONTH FROM e.exp_date) = $1 AND EXTRACT(YEAR FROM e.exp_date) = $2`;
      params.push(month, year);
    }
    sql += ' ORDER BY e.exp_date DESC';

    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลรายจ่าย' });
  }
});

// เพิ่มรายจ่ายใหม่
router.post('/', auth, requireAdmin, async (req, res) => {
  try {
    const { exp_title, exp_amount, exp_date, category_id } = req.body;

    if (!exp_title || !exp_amount || !exp_date) {
      return res.status(400).json({ message: 'กรุณากรอกชื่อรายจ่าย จำนวนเงิน และวันที่ให้ครบ' });
    }

    const exp_id = 'EX' + Date.now();

    await pool.query(
      `INSERT INTO tb_expense (exp_id, exp_title, exp_amount, exp_date, category_id, user_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [exp_id, exp_title, exp_amount, exp_date, category_id || null, req.user.user_id]
    );

    res.status(201).json({ message: 'เพิ่มรายจ่ายสำเร็จ', exp_id });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'เพิ่มรายจ่ายไม่สำเร็จ' });
  }
});

// แก้ไขรายจ่าย
router.put('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { exp_title, exp_amount, exp_date, category_id } = req.body;

    await pool.query(
      `UPDATE tb_expense 
       SET exp_title = $1, exp_amount = $2, exp_date = $3, category_id = $4, update_datetime = CURRENT_TIMESTAMP
       WHERE exp_id = $5`,
      [exp_title, exp_amount, exp_date, category_id || null, id]
    );

    res.json({ message: 'แก้ไขรายจ่ายสำเร็จ' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'แก้ไขไม่สำเร็จ' });
  }
});

// ลบรายจ่าย
router.delete('/:id', auth, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM tb_expense WHERE exp_id = $1', [req.params.id]);
    res.json({ message: 'ลบรายจ่ายสำเร็จ' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'ลบไม่สำเร็จ' });
  }
});

module.exports = router;
