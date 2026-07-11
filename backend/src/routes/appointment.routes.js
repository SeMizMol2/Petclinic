const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const auth = require('./auth.middleware');

const APPT_STATUS_CONFIRMED = '\u0e22\u0e37\u0e19\u0e22\u0e31\u0e19';
const APPT_STATUS_CANCELED = '\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01';

const ensureAdmin = (req, res) => {
    if (req.user.role !== 'admin') {
        res.status(403).json({ message: '\u0e44\u0e21\u0e48\u0e21\u0e35\u0e2a\u0e34\u0e17\u0e18\u0e34\u0e4c\u0e40\u0e02\u0e49\u0e32\u0e16\u0e36\u0e07' });
        return false;
    }
    return true;
};

const normalizeStatus = (apptStatus) => {
    return String(apptStatus || '').trim() === APPT_STATUS_CANCELED
        ? APPT_STATUS_CANCELED
        : APPT_STATUS_CONFIRMED;
};

const normalizeAppointmentDate = (value) => {
    const raw = String(value || '').trim();
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const currentYear = new Date().getFullYear();

    if (year < currentYear - 1 || year > currentYear + 5) {
        return null;
    }

    const date = new Date(Date.UTC(year, month - 1, day));
    if (
        Number.isNaN(date.getTime()) ||
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
    ) {
        return null;
    }

    return `${match[1]}-${match[2]}-${match[3]}`;
};

const normalizeAppointmentTime = (value) => {
    const raw = String(value || '').trim();
    return /^\d{2}:\d{2}(:\d{2})?$/.test(raw) ? raw : null;
};

router.get('/pets-list', auth, async (req, res) => {
    try {
        if (!ensureAdmin(req, res)) return;

        const pets = await pool.query(`
            SELECT p.pet_id, p.pet_name, o.owner_name
            FROM tb_pet p
            LEFT JOIN tb_owner o ON p.owner_id = o.owner_id
            ORDER BY p.pet_id DESC
        `);

        res.json(pets.rows);
    } catch (err) {
        console.error('Error Get Pets List:', err);
        res.status(500).json({
            message: '\u0e40\u0e01\u0e34\u0e14\u0e02\u0e49\u0e2d\u0e1c\u0e34\u0e14\u0e1e\u0e25\u0e32\u0e14\u0e43\u0e19\u0e01\u0e32\u0e23\u0e14\u0e36\u0e07\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e2a\u0e31\u0e15\u0e27\u0e4c\u0e40\u0e25\u0e35\u0e49\u0e22\u0e07'
        });
    }
});

router.get('/', auth, async (req, res) => {
    try {
        if (!ensureAdmin(req, res)) return;

        const appointments = await pool.query(`
            SELECT
                a.appt_id,
                a.appt_date,
                a.appt_time,
                a.appt_reason,
                a.appt_status,
                a.cancel_reason,
                a.pet_id,
                p.pet_name,
                o.owner_name
            FROM tb_appointment a
            LEFT JOIN tb_pet p ON a.pet_id = p.pet_id
            LEFT JOIN tb_owner o ON p.owner_id = o.owner_id
            ORDER BY a.appt_date ASC, a.appt_time ASC
        `);

        res.json(appointments.rows);
    } catch (err) {
        console.error('Error Get Appointments:', err);
        res.status(500).json({
            message: '\u0e40\u0e01\u0e34\u0e14\u0e02\u0e49\u0e2d\u0e1c\u0e34\u0e14\u0e1e\u0e25\u0e32\u0e14\u0e43\u0e19\u0e01\u0e32\u0e23\u0e14\u0e36\u0e07\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e19\u0e31\u0e14\u0e2b\u0e21\u0e32\u0e22'
        });
    }
});

router.post('/', auth, async (req, res) => {
    try {
        if (!ensureAdmin(req, res)) return;

        const { pet_id, appt_date, appt_time, appt_reason, appt_status } = req.body;
        const normalizedDate = normalizeAppointmentDate(appt_date);
        const normalizedTime = normalizeAppointmentTime(appt_time);

        if (!pet_id || !normalizedDate || !normalizedTime) {
            return res.status(400).json({
                message: 'กรุณากรอกวันและเวลานัดหมายให้ถูกต้อง'
            });
        }

        const randomNum = Math.floor(Math.random() * 100000000)
            .toString()
            .padStart(8, '0');
        const apptId = `AP${randomNum}`;
        const normalizedStatus = normalizeStatus(appt_status);

        const newAppointment = await pool.query(
            `
            INSERT INTO tb_appointment (
                appt_id,
                pet_id,
                appt_date,
                appt_time,
                appt_reason,
                appt_status,
                create_datetime
            )
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            RETURNING *
            `,
            [apptId, pet_id, normalizedDate, normalizedTime, appt_reason || null, normalizedStatus]
        );

        res.status(201).json({
            message: '\u0e2a\u0e23\u0e49\u0e32\u0e07\u0e01\u0e32\u0e23\u0e19\u0e31\u0e14\u0e2b\u0e21\u0e32\u0e22\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08',
            appointment: newAppointment.rows[0]
        });
    } catch (err) {
        console.error('Error Add Appointment:', err);
        if (err.code === '23503') {
            return res.status(400).json({
                message: '\u0e44\u0e21\u0e48\u0e1e\u0e1a pet_id \u0e2b\u0e23\u0e37\u0e2d\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e2d\u0e49\u0e32\u0e07\u0e2d\u0e34\u0e07\u0e17\u0e35\u0e48\u0e40\u0e01\u0e35\u0e48\u0e22\u0e27\u0e02\u0e49\u0e2d\u0e07'
            });
        }
        res.status(500).json({
            message: '\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e01\u0e32\u0e23\u0e19\u0e31\u0e14\u0e2b\u0e21\u0e32\u0e22\u0e44\u0e21\u0e48\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08'
        });
    }
});

router.put('/:id', auth, async (req, res) => {
    try {
        if (!ensureAdmin(req, res)) return;

        const { id } = req.params;
        const { appt_date, appt_time, appt_status, cancel_reason } = req.body;
        const normalizedDate = normalizeAppointmentDate(appt_date);
        const normalizedTime = normalizeAppointmentTime(appt_time);
        const normalizedStatus = normalizeStatus(appt_status);

        if (!normalizedDate || !normalizedTime) {
            return res.status(400).json({
                message: 'กรุณากรอกวันและเวลานัดหมายให้ถูกต้อง'
            });
        }

        const result = await pool.query(
            `
            UPDATE tb_appointment
            SET appt_date = $1,
                appt_time = $2,
                appt_status = $3,
                cancel_reason = $4,
                update_datetime = NOW()
            WHERE appt_id = $5
            `,
            [normalizedDate, normalizedTime, normalizedStatus, cancel_reason || null, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                message: '\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e01\u0e32\u0e23\u0e19\u0e31\u0e14\u0e2b\u0e21\u0e32\u0e22'
            });
        }

        res.json({ message: '\u0e2d\u0e31\u0e1b\u0e40\u0e14\u0e15\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08' });
    } catch (err) {
        console.error('Error Update Appointment:', err);
        res.status(500).json({
            message: '\u0e2d\u0e31\u0e1b\u0e40\u0e14\u0e15\u0e44\u0e21\u0e48\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08'
        });
    }
});

router.put('/:id/status', auth, async (req, res) => {
    try {
        if (!ensureAdmin(req, res)) return;

        const { id } = req.params;
        const { appt_status } = req.body;
        if (!appt_status) {
            return res.status(400).json({
                message: '\u0e01\u0e23\u0e38\u0e13\u0e32\u0e23\u0e30\u0e1a\u0e38\u0e2a\u0e16\u0e32\u0e19\u0e30\u0e17\u0e35\u0e48\u0e15\u0e49\u0e2d\u0e07\u0e01\u0e32\u0e23\u0e40\u0e1b\u0e25\u0e35\u0e48\u0e22\u0e19'
            });
        }

        const result = await pool.query(
            `
            UPDATE tb_appointment
            SET appt_status = $1, update_datetime = NOW()
            WHERE appt_id = $2
            `,
            [normalizeStatus(appt_status), id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                message: '\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e01\u0e32\u0e23\u0e19\u0e31\u0e14\u0e2b\u0e21\u0e32\u0e22'
            });
        }

        res.json({ message: '\u0e2d\u0e31\u0e1b\u0e40\u0e14\u0e15\u0e2a\u0e16\u0e32\u0e19\u0e30\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08' });
    } catch (err) {
        console.error('Error Update Status:', err);
        res.status(500).json({
            message: '\u0e2d\u0e31\u0e1b\u0e40\u0e14\u0e15\u0e2a\u0e16\u0e32\u0e19\u0e30\u0e44\u0e21\u0e48\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08'
        });
    }
});

router.delete('/:id', auth, async (req, res) => {
    try {
        if (!ensureAdmin(req, res)) return;

        const result = await pool.query(
            'DELETE FROM tb_appointment WHERE appt_id = $1',
            [req.params.id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                message: '\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e01\u0e32\u0e23\u0e19\u0e31\u0e14\u0e2b\u0e21\u0e32\u0e22'
            });
        }

        res.json({ message: '\u0e25\u0e1a\u0e01\u0e32\u0e23\u0e19\u0e31\u0e14\u0e2b\u0e21\u0e32\u0e22\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08' });
    } catch (err) {
        console.error('Error Delete Appointment:', err);
        res.status(500).json({
            message: '\u0e25\u0e1a\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e44\u0e21\u0e48\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08'
        });
    }
});

router.get('/my-appointments/:user_id', auth, async (req, res) => {
    try {
        const { user_id } = req.params;

        const appointments = await pool.query(
            `
            SELECT a.appt_id, a.appt_date, a.appt_time, a.appt_reason, a.appt_status, p.pet_name
            FROM tb_appointment a
            JOIN tb_pet p ON a.pet_id = p.pet_id
            JOIN tb_owner o ON p.owner_id = o.owner_id
            WHERE o.user_id = $1
            ORDER BY a.appt_date ASC, a.appt_time ASC
            `,
            [user_id]
        );

        res.json({ success: true, data: appointments.rows });
    } catch (err) {
        console.error('Error Get My Appointments:', err);
        res.status(500).json({
            success: false,
            message: '\u0e14\u0e36\u0e07\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e19\u0e31\u0e14\u0e2b\u0e21\u0e32\u0e22\u0e44\u0e21\u0e48\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08'
        });
    }
});

module.exports = router;
