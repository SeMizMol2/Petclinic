const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const auth = require('./auth.middleware');
const { sendAppointmentNotification } = require('../services/mail.service');

const APPT_STATUS_PENDING = '\u0e23\u0e2d';
const APPT_STATUS_CONFIRMED = '\u0e22\u0e37\u0e19\u0e22\u0e31\u0e19';
const APPT_STATUS_CANCELED = '\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01';

const ensureAdmin = (req, res) => {
    if (req.user.role !== 'admin') {
        res.status(403).json({ message: '\u0e44\u0e21\u0e48\u0e21\u0e35\u0e2a\u0e34\u0e17\u0e18\u0e34\u0e4c\u0e40\u0e02\u0e49\u0e32\u0e16\u0e36\u0e07' });
        return false;
    }
    return true;
};

const normalizeStatus = (apptStatus, fallback = APPT_STATUS_CONFIRMED) => {
    const text = String(apptStatus || '').trim();
    if (text === APPT_STATUS_CANCELED) return APPT_STATUS_CANCELED;
    if (text === APPT_STATUS_PENDING) return APPT_STATUS_PENDING;
    if (text === APPT_STATUS_CONFIRMED) return APPT_STATUS_CONFIRMED;
    return fallback;
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

const isAppointmentInPast = (apptDate, apptTime) => {
    const rawTime = String(apptTime || '').slice(0, 8);
    const normalizedTime = rawTime.length === 5 ? `${rawTime}:00` : rawTime;
    const appointmentDateTime = new Date(`${apptDate}T${normalizedTime}+07:00`);
    return Number.isNaN(appointmentDateTime.getTime()) || appointmentDateTime.getTime() < Date.now();
};

const findConflictingAppointment = async ({ apptDate, apptTime, excludeId = null }) => {
    const result = await pool.query(
        `
        SELECT
            a.appt_id,
            p.pet_name,
            o.owner_name
        FROM tb_appointment a
        LEFT JOIN tb_pet p ON a.pet_id = p.pet_id
        LEFT JOIN tb_owner o ON p.owner_id = o.owner_id
        WHERE a.appt_date = $1
          AND a.appt_time = $2
          AND COALESCE(TRIM(a.appt_status), '') NOT LIKE '%ยกเลิก%'
          AND ($3::varchar IS NULL OR a.appt_id <> $3)
        ORDER BY a.appt_id ASC
        LIMIT 1
        `,
        [apptDate, apptTime, excludeId]
    );

    return result.rows[0] || null;
};

const getAppointmentNotificationData = async (appointmentId) => {
    const result = await pool.query(
        `
        SELECT
            a.appt_id,
            a.appt_date,
            a.appt_time,
            a.appt_reason,
            a.appt_status,
            a.cancel_reason,
            p.pet_name,
            o.owner_name,
            COALESCE(o.owner_email, u.email) AS owner_email,
            c.clinic_name,
            c.tel AS clinic_tel,
            c.address AS clinic_address
        FROM tb_appointment a
        LEFT JOIN tb_pet p ON a.pet_id = p.pet_id
        LEFT JOIN tb_owner o ON p.owner_id = o.owner_id
        LEFT JOIN tb_user u ON o.user_id = u.user_id
        LEFT JOIN (
            SELECT clinic_name, tel, address
            FROM tb_clinic
            ORDER BY clinic_id ASC
            LIMIT 1
        ) c ON true
        WHERE a.appt_id = $1
        LIMIT 1
        `,
        [appointmentId]
    );

    return result.rows[0] || null;
};

const createAppointmentId = () => {
    const randomNum = Math.floor(Math.random() * 100000000)
        .toString()
        .padStart(8, '0');
    return `AP${randomNum}`;
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

        const apptId = createAppointmentId();
        const normalizedStatus = normalizeStatus(appt_status, APPT_STATUS_CONFIRMED);

        if (normalizedStatus !== APPT_STATUS_CANCELED && isAppointmentInPast(normalizedDate, normalizedTime)) {
            return res.status(400).json({
                message: 'วันและเวลานัดหมายต้องไม่เป็นเวลาที่ผ่านมาแล้ว'
            });
        }

        if (normalizedStatus !== APPT_STATUS_CANCELED) {
            const conflictingAppointment = await findConflictingAppointment({
                apptDate: normalizedDate,
                apptTime: normalizedTime
            });

            if (conflictingAppointment) {
                return res.status(409).json({
                    message: `ช่วงเวลานี้มีนัดหมายอยู่แล้ว (${conflictingAppointment.pet_name || '-'} / ${conflictingAppointment.owner_name || '-'})`
                });
            }
        }

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

        const appointmentForMail = await getAppointmentNotificationData(apptId);
        const emailNotification = await sendAppointmentNotification({
            type: 'created',
            appointment: appointmentForMail
        });

        res.status(201).json({
            message: '\u0e2a\u0e23\u0e49\u0e32\u0e07\u0e01\u0e32\u0e23\u0e19\u0e31\u0e14\u0e2b\u0e21\u0e32\u0e22\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08',
            appointment: newAppointment.rows[0],
            email_notification: emailNotification
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
        const { appt_date, appt_time, appt_reason, appt_status, cancel_reason } = req.body;
        const normalizedDate = normalizeAppointmentDate(appt_date);
        const normalizedTime = normalizeAppointmentTime(appt_time);
        const normalizedStatus = normalizeStatus(appt_status, APPT_STATUS_CONFIRMED);

        if (!normalizedDate || !normalizedTime) {
            return res.status(400).json({
                message: 'กรุณากรอกวันและเวลานัดหมายให้ถูกต้อง'
            });
        }

        const currentAppointment = await pool.query(
            `
            SELECT appt_date::text AS appt_date, appt_time::text AS appt_time
            FROM tb_appointment
            WHERE appt_id = $1
            LIMIT 1
            `,
            [id]
        );

        if (currentAppointment.rows.length === 0) {
            return res.status(404).json({
                message: 'ไม่พบข้อมูลการนัดหมาย'
            });
        }

        const currentDate = String(currentAppointment.rows[0].appt_date).slice(0, 10);
        const currentTime = String(currentAppointment.rows[0].appt_time || '').slice(0, 8);
        const requestedTimeValue = String(normalizedTime).slice(0, 8);
        const requestedTime = requestedTimeValue.length === 5
            ? `${requestedTimeValue}:00`
            : requestedTimeValue;
        const slotChanged = currentDate !== normalizedDate || currentTime !== requestedTime;

        if (
            normalizedStatus !== APPT_STATUS_CANCELED &&
            slotChanged &&
            isAppointmentInPast(normalizedDate, normalizedTime)
        ) {
            return res.status(400).json({
                message: 'ไม่สามารถเลื่อนนัดหมายไปยังวันหรือเวลาที่ผ่านมาแล้วได้'
            });
        }

        if (normalizedStatus !== APPT_STATUS_CANCELED) {
            const conflictingAppointment = await findConflictingAppointment({
                apptDate: normalizedDate,
                apptTime: normalizedTime,
                excludeId: id
            });

            if (conflictingAppointment) {
                return res.status(409).json({
                    message: `ช่วงเวลานี้มีนัดหมายอยู่แล้ว (${conflictingAppointment.pet_name || '-'} / ${conflictingAppointment.owner_name || '-'})`
                });
            }
        }

        const result = await pool.query(
            `
            UPDATE tb_appointment
            SET appt_date = $1,
                appt_time = $2,
                appt_reason = $3,
                appt_status = $4,
                cancel_reason = $5,
                update_datetime = NOW()
            WHERE appt_id = $6
            `,
            [normalizedDate, normalizedTime, appt_reason || null, normalizedStatus, cancel_reason || null, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                message: '\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e01\u0e32\u0e23\u0e19\u0e31\u0e14\u0e2b\u0e21\u0e32\u0e22'
            });
        }

        const appointmentForMail = await getAppointmentNotificationData(id);
        const emailNotification = await sendAppointmentNotification({
            type: normalizedStatus === APPT_STATUS_CANCELED ? 'canceled' : 'updated',
            appointment: appointmentForMail
        });

        res.json({
            message: '\u0e2d\u0e31\u0e1b\u0e40\u0e14\u0e15\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08',
            email_notification: emailNotification
        });
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

        const normalizedStatus = normalizeStatus(appt_status, APPT_STATUS_CONFIRMED);

        if (normalizedStatus !== APPT_STATUS_CANCELED) {
            const currentAppointment = await pool.query(
                `
                SELECT appt_date, appt_time
                FROM tb_appointment
                WHERE appt_id = $1
                LIMIT 1
                `,
                [id]
            );

            if (currentAppointment.rows.length === 0) {
                return res.status(404).json({
                    message: '\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e01\u0e32\u0e23\u0e19\u0e31\u0e14\u0e2b\u0e21\u0e32\u0e22'
                });
            }

            const conflictingAppointment = await findConflictingAppointment({
                apptDate: currentAppointment.rows[0].appt_date,
                apptTime: currentAppointment.rows[0].appt_time,
                excludeId: id
            });

            if (conflictingAppointment) {
                return res.status(409).json({
                    message: `ช่วงเวลานี้มีนัดหมายอยู่แล้ว (${conflictingAppointment.pet_name || '-'} / ${conflictingAppointment.owner_name || '-'})`
                });
            }
        }

        const result = await pool.query(
            `
            UPDATE tb_appointment
            SET appt_status = $1, update_datetime = NOW()
            WHERE appt_id = $2
            `,
            [normalizedStatus, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                message: '\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e01\u0e32\u0e23\u0e19\u0e31\u0e14\u0e2b\u0e21\u0e32\u0e22'
            });
        }

        const appointmentForMail = await getAppointmentNotificationData(id);
        const emailNotification = await sendAppointmentNotification({
            type: normalizedStatus === APPT_STATUS_CANCELED ? 'canceled' : 'updated',
            appointment: appointmentForMail
        });

        res.json({
            message: '\u0e2d\u0e31\u0e1b\u0e40\u0e14\u0e15\u0e2a\u0e16\u0e32\u0e19\u0e30\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08',
            email_notification: emailNotification
        });
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

        if (req.user.role !== 'admin' && req.user.user_id !== user_id) {
            return res.status(403).json({
                success: false,
                message: 'ไม่มีสิทธิ์เข้าถึงข้อมูลนี้'
            });
        }

        const appointments = await pool.query(
            `
            SELECT a.appt_id, a.appt_date, a.appt_time, a.appt_reason, a.appt_status, a.cancel_reason, p.pet_name
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
