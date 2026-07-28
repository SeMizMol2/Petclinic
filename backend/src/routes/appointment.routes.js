const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const auth = require('./auth.middleware');
const { queueAppointmentNotification } = require('../services/mail.service');

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

const findConflictingAppointment = async ({ apptDate, apptTime, vetId, excludeId = null }) => {
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
          AND a.vet_id = $3
          AND COALESCE(TRIM(a.appt_status), '') NOT LIKE '%ยกเลิก%'
          AND ($4::varchar IS NULL OR a.appt_id <> $4)
        ORDER BY a.appt_id ASC
        LIMIT 1
        `,
        [apptDate, apptTime, vetId, excludeId]
    );

    return result.rows[0] || null;
};

const isWithinVetSchedule = async ({ vetId, apptDate, apptTime }) => {
    const result = await pool.query(
        `
        SELECT schedule_id
        FROM tb_vet_schedule
        WHERE vet_id = $1
          AND work_date = $2
          AND start_time <= $3::time
          AND end_time > $3::time
        LIMIT 1
        `,
        [vetId, apptDate, apptTime]
    );

    return result.rows.length > 0;
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
            a.vet_id,
            v.vet_name,
            p.pet_name,
            o.owner_name,
            COALESCE(o.owner_email, u.email) AS owner_email,
            c.clinic_name,
            c.tel AS clinic_tel,
            c.address AS clinic_address
        FROM tb_appointment a
        LEFT JOIN tb_pet p ON a.pet_id = p.pet_id
        LEFT JOIN tb_veterinarian v ON a.vet_id = v.vet_id
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

const createScheduleId = () => {
    const randomNum = Math.floor(Math.random() * 100000000)
        .toString()
        .padStart(8, '0');
    return `VS${randomNum}`;
};

router.get('/veterinarians-list', auth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT vet_id, vet_name, license_no
            FROM tb_veterinarian
            ORDER BY vet_name ASC, vet_id ASC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('Error Get Veterinarians List:', err);
        res.status(500).json({ message: 'ดึงข้อมูลสัตวแพทย์ไม่สำเร็จ' });
    }
});

router.get('/vet-schedules', auth, async (req, res) => {
    try {
        const today = new Date();
        const defaultFrom = today.toISOString().slice(0, 10);
        const defaultToDate = new Date(today.getFullYear(), today.getMonth() + 2, 0);
        const defaultTo = `${defaultToDate.getFullYear()}-${String(defaultToDate.getMonth() + 1).padStart(2, '0')}-${String(defaultToDate.getDate()).padStart(2, '0')}`;
        const from = normalizeAppointmentDate(req.query.from || defaultFrom);
        const to = normalizeAppointmentDate(req.query.to || defaultTo);

        if (!from || !to || from > to) {
            return res.status(400).json({ message: 'ช่วงวันที่ตารางเวรไม่ถูกต้อง' });
        }

        const result = await pool.query(
            `
            SELECT
                s.schedule_id,
                s.vet_id,
                v.vet_name,
                v.license_no,
                s.work_date,
                s.start_time,
                s.end_time,
                s.schedule_note
            FROM tb_vet_schedule s
            JOIN tb_veterinarian v ON s.vet_id = v.vet_id
            WHERE s.work_date BETWEEN $1 AND $2
            ORDER BY s.work_date ASC, s.start_time ASC, v.vet_name ASC
            `,
            [from, to]
        );

        res.json(result.rows);
    } catch (err) {
        console.error('Error Get Vet Schedules:', err);
        res.status(500).json({ message: 'ดึงข้อมูลตารางเวรสัตวแพทย์ไม่สำเร็จ' });
    }
});

router.post('/vet-schedules', auth, async (req, res) => {
    try {
        if (!ensureAdmin(req, res)) return;

        const { vet_id, work_date, start_time, end_time, schedule_note } = req.body;
        const normalizedDate = normalizeAppointmentDate(work_date);
        const normalizedStart = normalizeAppointmentTime(start_time);
        const normalizedEnd = normalizeAppointmentTime(end_time);

        if (!vet_id || !normalizedDate || !normalizedStart || !normalizedEnd || normalizedEnd <= normalizedStart) {
            return res.status(400).json({ message: 'กรุณาระบุสัตวแพทย์ วันที่ และช่วงเวลาให้ถูกต้อง' });
        }

        const overlap = await pool.query(
            `
            SELECT schedule_id
            FROM tb_vet_schedule
            WHERE vet_id = $1
              AND work_date = $2
              AND start_time < $4::time
              AND end_time > $3::time
            LIMIT 1
            `,
            [vet_id, normalizedDate, normalizedStart, normalizedEnd]
        );

        if (overlap.rows.length > 0) {
            return res.status(409).json({ message: 'สัตวแพทย์มีตารางเวรที่ทับซ้อนกับช่วงเวลานี้แล้ว' });
        }

        const scheduleId = createScheduleId();
        const result = await pool.query(
            `
            INSERT INTO tb_vet_schedule (
                schedule_id, vet_id, work_date, start_time, end_time, schedule_note, create_datetime
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
            RETURNING *
            `,
            [scheduleId, vet_id, normalizedDate, normalizedStart, normalizedEnd, schedule_note || null]
        );

        res.status(201).json({ message: 'บันทึกตารางเวรสัตวแพทย์สำเร็จ', schedule: result.rows[0] });
    } catch (err) {
        console.error('Error Add Vet Schedule:', err);
        if (err.code === '23503') {
            return res.status(400).json({ message: 'ไม่พบข้อมูลสัตวแพทย์ที่เลือก' });
        }
        res.status(500).json({ message: 'บันทึกตารางเวรสัตวแพทย์ไม่สำเร็จ' });
    }
});

router.delete('/vet-schedules/:id', auth, async (req, res) => {
    try {
        if (!ensureAdmin(req, res)) return;

        const activeAppointment = await pool.query(
            `
            SELECT a.appt_id
            FROM tb_vet_schedule s
            JOIN tb_appointment a
              ON a.vet_id = s.vet_id
             AND a.appt_date = s.work_date
             AND a.appt_time >= s.start_time
             AND a.appt_time < s.end_time
             AND COALESCE(TRIM(a.appt_status), '') NOT LIKE '%ยกเลิก%'
            WHERE s.schedule_id = $1
            LIMIT 1
            `,
            [req.params.id]
        );

        if (activeAppointment.rows.length > 0) {
            return res.status(409).json({
                message: 'ไม่สามารถลบตารางเวรที่มีนัดหมายใช้งานอยู่ได้ กรุณาเลื่อนหรือยกเลิกนัดหมายก่อน'
            });
        }

        const result = await pool.query('DELETE FROM tb_vet_schedule WHERE schedule_id = $1', [req.params.id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'ไม่พบตารางเวรที่ต้องการลบ' });
        }
        res.json({ message: 'ลบตารางเวรสัตวแพทย์สำเร็จ' });
    } catch (err) {
        console.error('Error Delete Vet Schedule:', err);
        res.status(500).json({ message: 'ลบตารางเวรสัตวแพทย์ไม่สำเร็จ' });
    }
});

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
                a.vet_id,
                v.vet_name,
                p.pet_name,
                o.owner_name
            FROM tb_appointment a
            LEFT JOIN tb_pet p ON a.pet_id = p.pet_id
            LEFT JOIN tb_owner o ON p.owner_id = o.owner_id
            LEFT JOIN tb_veterinarian v ON a.vet_id = v.vet_id
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

        const { pet_id, vet_id, appt_date, appt_time, appt_reason } = req.body;
        const normalizedDate = normalizeAppointmentDate(appt_date);
        const normalizedTime = normalizeAppointmentTime(appt_time);

        if (!pet_id || !vet_id || !normalizedDate || !normalizedTime) {
            return res.status(400).json({
                message: 'กรุณาเลือกสัตว์เลี้ยง สัตวแพทย์ วันและเวลานัดหมายให้ครบถ้วน'
            });
        }

        const apptId = createAppointmentId();
        const normalizedStatus = APPT_STATUS_PENDING;

        if (normalizedStatus !== APPT_STATUS_CANCELED && isAppointmentInPast(normalizedDate, normalizedTime)) {
            return res.status(400).json({
                message: 'วันและเวลานัดหมายต้องไม่เป็นเวลาที่ผ่านมาแล้ว'
            });
        }

        if (normalizedStatus !== APPT_STATUS_CANCELED) {
            const withinSchedule = await isWithinVetSchedule({
                vetId: vet_id,
                apptDate: normalizedDate,
                apptTime: normalizedTime
            });

            if (!withinSchedule) {
                return res.status(409).json({
                    message: 'เวลานัดหมายอยู่นอกตารางเวรของสัตวแพทย์ที่เลือก'
                });
            }

            const conflictingAppointment = await findConflictingAppointment({
                apptDate: normalizedDate,
                apptTime: normalizedTime,
                vetId: vet_id
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
                vet_id,
                appt_date,
                appt_time,
                appt_reason,
                appt_status,
                create_datetime
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            RETURNING *
            `,
            [apptId, pet_id, vet_id, normalizedDate, normalizedTime, appt_reason || null, normalizedStatus]
        );

        const appointmentForMail = await getAppointmentNotificationData(apptId);
        const emailNotification = queueAppointmentNotification({
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

router.patch('/:id/respond', auth, async (req, res) => {
    try {
        if (req.user.role === 'admin') {
            return res.status(403).json({ message: 'รายการนี้ต้องตอบรับด้วยบัญชีเจ้าของสัตว์เลี้ยง' });
        }

        const action = String(req.body.action || '').trim();
        const responseNote = String(req.body.cancel_reason || '').trim();
        if (!['accept', 'cancel'].includes(action)) {
            return res.status(400).json({ message: 'กรุณาเลือกยืนยันหรือยกเลิกนัดหมาย' });
        }
        if (action === 'cancel' && !responseNote) {
            return res.status(400).json({ message: 'กรุณาระบุเหตุผลที่ยกเลิกนัดหมาย' });
        }

        const appointment = await pool.query(
            `
            SELECT a.appt_id, a.appt_status, a.appt_date::text AS appt_date, a.appt_time::text AS appt_time
            FROM tb_appointment a
            JOIN tb_pet p ON a.pet_id = p.pet_id
            JOIN tb_owner o ON p.owner_id = o.owner_id
            WHERE a.appt_id = $1
              AND o.user_id = $2
            LIMIT 1
            `,
            [req.params.id, req.user.user_id]
        );

        if (appointment.rows.length === 0) {
            return res.status(404).json({ message: 'ไม่พบนัดหมายหรือไม่มีสิทธิ์ตอบรับรายการนี้' });
        }
        if (normalizeStatus(appointment.rows[0].appt_status, APPT_STATUS_PENDING) !== APPT_STATUS_PENDING) {
            return res.status(409).json({ message: 'นัดหมายนี้ได้รับการตอบกลับแล้ว' });
        }
        if (action === 'accept' && isAppointmentInPast(appointment.rows[0].appt_date, appointment.rows[0].appt_time)) {
            return res.status(409).json({ message: 'ไม่สามารถยืนยันนัดหมายที่ผ่านเวลาแล้วได้' });
        }

        const nextStatus = action === 'accept' ? APPT_STATUS_CONFIRMED : APPT_STATUS_CANCELED;
        await pool.query(
            `
            UPDATE tb_appointment
            SET appt_status = $1,
                cancel_reason = $2,
                update_datetime = NOW()
            WHERE appt_id = $3
            `,
            [nextStatus, action === 'cancel' ? responseNote : null, req.params.id]
        );

        const appointmentForMail = await getAppointmentNotificationData(req.params.id);
        const emailNotification = queueAppointmentNotification({
            type: action === 'cancel' ? 'canceled' : 'updated',
            appointment: appointmentForMail
        });

        res.json({
            message: action === 'accept' ? 'ยืนยันนัดหมายสำเร็จ' : 'ยกเลิกนัดหมายสำเร็จ',
            email_notification: emailNotification
        });
    } catch (err) {
        console.error('Error Respond Appointment:', err);
        res.status(500).json({ message: 'ตอบรับนัดหมายไม่สำเร็จ' });
    }
});

router.put('/:id', auth, async (req, res) => {
    try {
        if (!ensureAdmin(req, res)) return;

        const { id } = req.params;
        const { vet_id, appt_date, appt_time, appt_reason, appt_status, cancel_reason, reschedule } = req.body;
        const normalizedDate = normalizeAppointmentDate(appt_date);
        const normalizedTime = normalizeAppointmentTime(appt_time);
        const normalizedStatus = normalizeStatus(appt_status, APPT_STATUS_CONFIRMED);
        const wantsReschedule = reschedule === true;

        if (!vet_id || !normalizedDate || !normalizedTime) {
            return res.status(400).json({
                message: 'กรุณาเลือกสัตวแพทย์และกรอกวันเวลานัดหมายให้ถูกต้อง'
            });
        }

        const currentAppointment = await pool.query(
            `
            SELECT appt_date::text AS appt_date,
                   appt_time::text AS appt_time,
                   vet_id,
                   appt_status,
                   cancel_reason
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
        const slotChanged = currentDate !== normalizedDate || currentTime !== requestedTime || currentAppointment.rows[0].vet_id !== vet_id;
        const currentStatus = normalizeStatus(currentAppointment.rows[0].appt_status, APPT_STATUS_PENDING);
        const nextStatus = wantsReschedule
            ? APPT_STATUS_PENDING
            : normalizedStatus === APPT_STATUS_CANCELED
            ? APPT_STATUS_CANCELED
            : slotChanged
                ? APPT_STATUS_PENDING
                : currentStatus;

        if (wantsReschedule && currentStatus !== APPT_STATUS_CANCELED) {
            return res.status(409).json({
                message: 'จัดนัดหมายใหม่ได้เฉพาะรายการที่เจ้าของสัตว์เลี้ยงยกเลิกแล้ว'
            });
        }

        if (wantsReschedule && !slotChanged) {
            return res.status(400).json({
                message: 'กรุณาเลือกวัน เวลา หรือสัตวแพทย์ใหม่ก่อนส่งให้ลูกค้าตอบรับ'
            });
        }

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
            const withinSchedule = await isWithinVetSchedule({
                vetId: vet_id,
                apptDate: normalizedDate,
                apptTime: normalizedTime
            });

            if (!withinSchedule) {
                return res.status(409).json({
                    message: 'เวลานัดหมายอยู่นอกตารางเวรของสัตวแพทย์ที่เลือก'
                });
            }

            const conflictingAppointment = await findConflictingAppointment({
                apptDate: normalizedDate,
                apptTime: normalizedTime,
                vetId: vet_id,
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
            SET vet_id = $1,
                appt_date = $2,
                appt_time = $3,
                appt_reason = $4,
                appt_status = $5,
                cancel_reason = $6,
                update_datetime = NOW()
            WHERE appt_id = $7
            `,
            [
                vet_id,
                normalizedDate,
                normalizedTime,
                appt_reason || null,
                nextStatus,
                wantsReschedule
                    ? currentAppointment.rows[0].cancel_reason
                    : nextStatus === APPT_STATUS_CANCELED
                        ? cancel_reason || null
                        : null,
                id
            ]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                message: '\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e01\u0e32\u0e23\u0e19\u0e31\u0e14\u0e2b\u0e21\u0e32\u0e22'
            });
        }

        const appointmentForMail = await getAppointmentNotificationData(id);
        const emailNotification = queueAppointmentNotification({
            type: wantsReschedule
                ? 'rescheduled'
                : normalizedStatus === APPT_STATUS_CANCELED
                    ? 'canceled'
                    : 'updated',
            appointment: appointmentForMail
        });

        res.json({
            message: wantsReschedule
                ? 'ส่งวันนัดหมายใหม่ให้เจ้าของสัตว์เลี้ยงตอบรับแล้ว'
                : '\u0e2d\u0e31\u0e1b\u0e40\u0e14\u0e15\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08',
            appt_status: nextStatus,
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
                SELECT appt_date, appt_time, vet_id, appt_status
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

            if (
                normalizeStatus(currentAppointment.rows[0].appt_status, APPT_STATUS_PENDING) === APPT_STATUS_PENDING &&
                normalizedStatus === APPT_STATUS_CONFIRMED
            ) {
                return res.status(403).json({
                    message: 'นัดหมายนี้ต้องให้เจ้าของสัตว์เลี้ยงเป็นผู้ยืนยัน'
                });
            }

            const conflictingAppointment = await findConflictingAppointment({
                apptDate: currentAppointment.rows[0].appt_date,
                apptTime: currentAppointment.rows[0].appt_time,
                vetId: currentAppointment.rows[0].vet_id,
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
        const emailNotification = queueAppointmentNotification({
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
            SELECT
                a.appt_id,
                a.appt_date,
                a.appt_time,
                a.appt_reason,
                a.appt_status,
                a.cancel_reason,
                a.vet_id,
                v.vet_name,
                p.pet_name
            FROM tb_appointment a
            JOIN tb_pet p ON a.pet_id = p.pet_id
            JOIN tb_owner o ON p.owner_id = o.owner_id
            LEFT JOIN tb_veterinarian v ON a.vet_id = v.vet_id
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
