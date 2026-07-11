const express = require('express')
const router = express.Router()
const pool = require('../database/db')
const auth = require('./auth.middleware')

router.get('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึง' })
    }

    const month = parseInt(req.query.month, 10) || new Date().getMonth() + 1
    const year = parseInt(req.query.year, 10) || new Date().getFullYear()

    // นับนัดหมายทุกสถานะที่ยังไม่ถูกยกเลิก เพื่อไม่ให้ dashboard หลุดข้อมูล
    // กรณีมีข้อมูลเก่าที่สะกดสถานะไม่เหมือนกันเป๊ะ แต่ยังไม่ใช่การยกเลิก
    const apptMonthly = await pool.query(
      `
        SELECT TO_CHAR(appt_date, 'YYYY-MM-DD') AS date, COUNT(*) AS count
        FROM tb_appointment
        WHERE EXTRACT(MONTH FROM appt_date) = $1
          AND EXTRACT(YEAR FROM appt_date) = $2
          AND COALESCE(TRIM(appt_status), '') <> ''
          AND COALESCE(TRIM(appt_status), '') NOT LIKE '%ยกเลิก%'
        GROUP BY appt_date
        ORDER BY appt_date ASC
      `,
      [month, year]
    )

    const revenueDaily = await pool.query(
      `
        SELECT EXTRACT(DAY FROM pay_date) AS day, SUM(total_amount) AS total
        FROM tb_receipt
        WHERE EXTRACT(MONTH FROM pay_date) = $1
          AND EXTRACT(YEAR FROM pay_date) = $2
          AND payment_status = 'ชำระเสร็จสิ้น'
        GROUP BY day
        ORDER BY day ASC
      `,
      [month, year]
    )

    const expenseDaily = await pool.query(
      `
        SELECT EXTRACT(DAY FROM exp_date) AS day, SUM(exp_amount) AS total
        FROM tb_expense
        WHERE EXTRACT(MONTH FROM exp_date) = $1
          AND EXTRACT(YEAR FROM exp_date) = $2
        GROUP BY day
        ORDER BY day ASC
      `,
      [month, year]
    )

    const detailAppt = await pool.query(
      `
        SELECT
          a.appt_date,
          a.appt_time,
          a.appt_reason,
          a.appt_status,
          p.pet_name,
          o.owner_name
        FROM tb_appointment a
        LEFT JOIN tb_pet p ON a.pet_id = p.pet_id
        LEFT JOIN tb_owner o ON p.owner_id = o.owner_id
        WHERE EXTRACT(MONTH FROM a.appt_date) = $1
          AND EXTRACT(YEAR FROM a.appt_date) = $2
          AND COALESCE(TRIM(a.appt_status), '') <> ''
          AND COALESCE(TRIM(a.appt_status), '') NOT LIKE '%ยกเลิก%'
        ORDER BY a.appt_date DESC, a.appt_time DESC
      `,
      [month, year]
    )

    const detailRev = await pool.query(
      `
        SELECT r.receipt_id, r.pay_date, r.total_amount, o.owner_name
        FROM tb_receipt r
        LEFT JOIN tb_owner o ON r.owner_id = o.owner_id
        WHERE EXTRACT(MONTH FROM r.pay_date) = $1
          AND EXTRACT(YEAR FROM r.pay_date) = $2
          AND r.payment_status = 'ชำระเสร็จสิ้น'
        ORDER BY r.pay_date DESC
      `,
      [month, year]
    )

    const detailExp = await pool.query(
      `
        SELECT e.exp_date, e.exp_title, e.exp_amount, c.category_name
        FROM tb_expense e
        LEFT JOIN tb_category c ON e.category_id = c.category_id
        WHERE EXTRACT(MONTH FROM e.exp_date) = $1
          AND EXTRACT(YEAR FROM e.exp_date) = $2
        ORDER BY e.exp_date DESC
      `,
      [month, year]
    )

    const totalRevenue = revenueDaily.rows.reduce((sum, item) => sum + parseFloat(item.total), 0)
    const totalExpense = expenseDaily.rows.reduce((sum, item) => sum + parseFloat(item.total), 0)
    const totalAppointments = apptMonthly.rows.reduce((sum, item) => sum + parseInt(item.count, 10), 0)

    res.json({
      summary: {
        totalRevenue,
        totalExpense,
        netProfit: totalRevenue - totalExpense,
        totalAppointments
      },
      charts: {
        appointments: apptMonthly.rows,
        revenue: revenueDaily.rows,
        expense: expenseDaily.rows
      },
      details: {
        appointments: detailAppt.rows,
        revenue: detailRev.rows,
        expense: detailExp.rows
      }
    })
  } catch (err) {
    console.error('Dashboard API Error:', err.message)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูล Dashboard' })
  }
})

module.exports = router
