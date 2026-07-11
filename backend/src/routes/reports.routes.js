const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const auth = require('./auth.middleware');

const requireAdmin = (req, res) => {
    if (req.user.role !== 'admin') {
        res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึงข้อมูลนี้' });
        return false;
    }
    return true;
};

router.get('/', auth, async (req, res) => {
    try {
        if (!requireAdmin(req, res)) return;

        const month = parseInt(req.query.month, 10) || (new Date().getMonth() + 1);
        const year = parseInt(req.query.year, 10) || new Date().getFullYear();

        const treatmentsResult = await pool.query(
            `
            SELECT
                t.treatment_id,
                t.treatment_date,
                t.symptom,
                t.diagnosis,
                t.total_amount,
                p.pet_name,
                o.owner_name,
                COALESCE(v.vet_name, u.username) AS vet_name
            FROM tb_treatment t
            JOIN tb_pet p ON t.pet_id = p.pet_id
            JOIN tb_owner o ON p.owner_id = o.owner_id
            LEFT JOIN tb_veterinarian v ON t.vet_id = v.vet_id
            LEFT JOIN tb_user u ON t.user_id = u.user_id
            WHERE EXTRACT(MONTH FROM t.treatment_date) = $1
              AND EXTRACT(YEAR FROM t.treatment_date) = $2
            ORDER BY t.treatment_date DESC
            `,
            [month, year]
        );

        const revenueResult = await pool.query(
            `
            SELECT
                r.receipt_id,
                r.pay_date,
                r.issue_date,
                r.total_amount,
                r.payment_status,
                r.pay_method,
                o.owner_name
            FROM tb_receipt r
            LEFT JOIN tb_owner o ON r.owner_id = o.owner_id
            WHERE EXTRACT(MONTH FROM COALESCE(r.pay_date, r.issue_date)) = $1
              AND EXTRACT(YEAR FROM COALESCE(r.pay_date, r.issue_date)) = $2
            ORDER BY COALESCE(r.pay_date, r.issue_date) DESC
            `,
            [month, year]
        );

        const expenseResult = await pool.query(
            `
            SELECT
                e.exp_id,
                e.exp_title,
                e.exp_amount,
                e.exp_date,
                c.category_name
            FROM tb_expense e
            LEFT JOIN tb_category c ON e.category_id = c.category_id
            WHERE EXTRACT(MONTH FROM e.exp_date) = $1
              AND EXTRACT(YEAR FROM e.exp_date) = $2
            ORDER BY e.exp_date DESC
            `,
            [month, year]
        );

        const appointmentsResult = await pool.query(
            `
            SELECT
                a.appt_id,
                a.appt_date,
                a.appt_time,
                a.appt_reason,
                a.appt_status,
                a.cancel_reason,
                p.pet_name,
                o.owner_name
            FROM tb_appointment a
            LEFT JOIN tb_pet p ON a.pet_id = p.pet_id
            LEFT JOIN tb_owner o ON p.owner_id = o.owner_id
            WHERE EXTRACT(MONTH FROM a.appt_date) = $1
              AND EXTRACT(YEAR FROM a.appt_date) = $2
            ORDER BY a.appt_date DESC, a.appt_time DESC
            `,
            [month, year]
        );

        const paidReceipts = revenueResult.rows.filter((row) => String(row.payment_status || '').trim() === 'ชำระเสร็จสิ้น');
        const totalTreatmentAmount = treatmentsResult.rows.reduce((sum, row) => sum + Number(row.total_amount || 0), 0);
        const totalRevenue = paidReceipts.reduce((sum, row) => sum + Number(row.total_amount || 0), 0);
        const totalExpense = expenseResult.rows.reduce((sum, row) => sum + Number(row.exp_amount || 0), 0);
        const confirmedAppointments = appointmentsResult.rows.filter((row) => String(row.appt_status || '').includes('ยืนยัน')).length;
        const canceledAppointments = appointmentsResult.rows.filter((row) => String(row.appt_status || '').includes('ยกเลิก')).length;

        res.json({
            success: true,
            filters: { month, year },
            treatmentReport: {
                totalCases: treatmentsResult.rows.length,
                totalAmount: totalTreatmentAmount,
                items: treatmentsResult.rows
            },
            financialReport: {
                totalRevenue,
                totalExpense,
                netProfit: totalRevenue - totalExpense,
                receipts: paidReceipts,
                expenses: expenseResult.rows
            },
            appointmentReport: {
                totalAppointments: appointmentsResult.rows.length,
                confirmedAppointments,
                canceledAppointments,
                items: appointmentsResult.rows
            }
        });
    } catch (err) {
        console.error('Error fetching reports:', err);
        res.status(500).json({ success: false, message: 'โหลดข้อมูลรายงานไม่สำเร็จ' });
    }
});

module.exports = router;
