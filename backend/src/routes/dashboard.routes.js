const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const auth = require('./auth.middleware');

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const isPaidReceiptStatus = (status) => {
  const text = normalizeText(status);
  return (
    text === 'ชำระเสร็จสิ้น' ||
    text.includes('เสร็จ') ||
    text.includes('à¹€à¸ªà¸£à¹‡à¸ˆ') ||
    text.includes('à¸Šà¸³à¸£à¸°à¹à¸¥à¹‰à¸§')
  );
};

const isCanceledAppointmentStatus = (status) => {
  const text = normalizeText(status);
  return text.includes('ยกเลิก') || text.includes('à¸¢à¸à¹€à¸¥à¸´à¸');
};

const formatDateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const formatDayNumber = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.getDate();
};

const sumGroupedItems = (rows, keyName, valueName) =>
  Object.entries(
    rows.reduce((acc, row) => {
      const key = row[keyName];
      if (key === null || key === undefined || key === '') return acc;
      acc[key] = (acc[key] || 0) + Number(row[valueName] || 0);
      return acc;
    }, {})
  )
    .map(([key, total]) => ({ day: Number(key), total }))
    .sort((a, b) => a.day - b.day);

router.get('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึง' });
    }

    const month = parseInt(req.query.month, 10) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();

    const appointmentsResult = await pool.query(
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
        ORDER BY a.appt_date DESC, a.appt_time DESC
      `,
      [month, year]
    );

    const receiptsResult = await pool.query(
      `
        SELECT receipt_id, pay_date, issue_date, total_amount, payment_status, owner_id
        FROM tb_receipt
        WHERE EXTRACT(MONTH FROM COALESCE(pay_date, issue_date)) = $1
          AND EXTRACT(YEAR FROM COALESCE(pay_date, issue_date)) = $2
        ORDER BY COALESCE(pay_date, issue_date) DESC
      `,
      [month, year]
    );

    const expensesResult = await pool.query(
      `
        SELECT e.exp_date, e.exp_title, e.exp_amount, c.category_name
        FROM tb_expense e
        LEFT JOIN tb_category c ON e.category_id = c.category_id
        WHERE EXTRACT(MONTH FROM e.exp_date) = $1
          AND EXTRACT(YEAR FROM e.exp_date) = $2
        ORDER BY e.exp_date DESC
      `,
      [month, year]
    );

    const activeAppointments = appointmentsResult.rows.filter(
      (row) => !isCanceledAppointmentStatus(row.appt_status)
    );

    const paidReceipts = receiptsResult.rows.filter((row) =>
      isPaidReceiptStatus(row.payment_status)
    );

    const appointmentBuckets = activeAppointments.reduce((acc, row) => {
      const key = formatDateKey(row.appt_date);
      if (!key) return acc;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const apptMonthly = Object.entries(appointmentBuckets)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));

    const revenueDaily = sumGroupedItems(
      paidReceipts.map((row) => ({
        day: formatDayNumber(row.pay_date || row.issue_date),
        total_amount: row.total_amount
      })),
      'day',
      'total_amount'
    );

    const expenseDaily = sumGroupedItems(
      expensesResult.rows.map((row) => ({
        day: formatDayNumber(row.exp_date),
        exp_amount: row.exp_amount
      })),
      'day',
      'exp_amount'
    );

    const totalRevenue = revenueDaily.reduce((sum, item) => sum + Number(item.total || 0), 0);
    const totalExpense = expenseDaily.reduce((sum, item) => sum + Number(item.total || 0), 0);
    const totalAppointments = activeAppointments.length;

    res.json({
      summary: {
        totalRevenue,
        totalExpense,
        netProfit: totalRevenue - totalExpense,
        totalAppointments
      },
      charts: {
        appointments: apptMonthly,
        revenue: revenueDaily,
        expense: expenseDaily
      },
      details: {
        appointments: activeAppointments,
        revenue: paidReceipts,
        expense: expensesResult.rows
      }
    });
  } catch (err) {
    console.error('Dashboard API Error:', err.message);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูล Dashboard' });
  }
});

module.exports = router;
