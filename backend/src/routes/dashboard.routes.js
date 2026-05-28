const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const auth = require('./auth.middleware');

router.get('/', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึง' });
        }

        // ⭐ 1. บังคับแปลงค่าเดือนและปีให้เป็นตัวเลข (Integer) เสมอ ป้องกัน Error จาก String
        const month = parseInt(req.query.month) || (new Date().getMonth() + 1);
        const year = parseInt(req.query.year) || new Date().getFullYear();

        // 2. ดึงสถิติการนัดหมาย
        // ⭐ เพิ่ม TRIM() เพื่อตัดช่องว่างที่อาจจะติดมากับคำว่า 'ยืนยัน'
        const apptMonthly = await pool.query(`
            SELECT TO_CHAR(appt_date, 'YYYY-MM-DD') as date, COUNT(*) as count 
            FROM tb_appointment 
            WHERE EXTRACT(MONTH FROM appt_date) = $1 AND EXTRACT(YEAR FROM appt_date) = $2
            AND TRIM(appt_status) = 'ยืนยัน'
            GROUP BY appt_date 
            ORDER BY appt_date ASC
        `, [month, year]);

        // 3. ดึงสถิติรายรับรายวัน
        const revenueDaily = await pool.query(`
            SELECT EXTRACT(DAY FROM pay_date) as day, SUM(total_amount) as total
            FROM tb_receipt
            WHERE EXTRACT(MONTH FROM pay_date) = $1 AND EXTRACT(YEAR FROM pay_date) = $2
            AND payment_status = 'ชำระเสร็จสิ้น'
            GROUP BY day 
            ORDER BY day ASC
        `, [month, year]);

        // 4. ดึงสถิติรายจ่ายรายวัน
        const expenseDaily = await pool.query(`
            SELECT EXTRACT(DAY FROM exp_date) as day, SUM(exp_amount) as total
            FROM tb_expense
            WHERE EXTRACT(MONTH FROM exp_date) = $1 AND EXTRACT(YEAR FROM exp_date) = $2
            GROUP BY day 
            ORDER BY day ASC
        `, [month, year]);

        // 5. สรุปรวมยอดทั้งเดือน
        const totalRevenue = revenueDaily.rows.reduce((sum, item) => sum + parseFloat(item.total), 0);
        const totalExpense = expenseDaily.rows.reduce((sum, item) => sum + parseFloat(item.total), 0);
        const totalAppointments = apptMonthly.rows.reduce((sum, item) => sum + parseInt(item.count), 0);

        // ⭐ พิมพ์เช็คในหน้าจอดำ (Terminal) ว่านับได้เท่าไหร่
        console.log(`เดือน: ${month}/${year} | นับนัดหมายได้: ${totalAppointments} รายการ`);

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
            }
        });
    } catch (err) {
        console.error("❌ Dashboard API Error:", err.message);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูล Dashboard" });
    }
});

module.exports = router;