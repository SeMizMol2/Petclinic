const nodemailer = require('nodemailer');

let transporter = null;

const getMailConfig = () => {
    const port = Number(process.env.SMTP_PORT || 0);

    return {
        host: process.env.SMTP_HOST || '',
        port,
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
        from: process.env.MAIL_FROM || process.env.SMTP_USER || '',
        secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465
    };
};

const isMailConfigured = () => {
    const config = getMailConfig();
    return Boolean(config.host && config.port && config.user && config.pass && config.from);
};

const getTransporter = () => {
    if (!isMailConfigured()) return null;
    if (transporter) return transporter;

    const config = getMailConfig();
    transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 10000,
        auth: {
            user: config.user,
            pass: config.pass
        }
    });

    return transporter;
};

const formatThaiDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(date);
};

const formatTime = (value) => {
    if (!value) return '-';
    return String(value).slice(0, 5);
};

const getSubjectByType = (type, appointment) => {
    if (type === 'created' && appointment?.appt_status === 'รอ') {
        return 'แจ้งนัดหมายใหม่ รอการตอบรับ - โรงพยาบาลสัตว์เมืองเลย';
    }
    if (type === 'created') return 'แจ้งนัดหมายใหม่ - โรงพยาบาลสัตว์เมืองเลย';
    if (type === 'rescheduled') return 'กรุณาตอบรับวันนัดหมายใหม่ - โรงพยาบาลสัตว์เมืองเลย';
    if (type === 'canceled') return 'แจ้งยกเลิกการนัดหมาย - โรงพยาบาลสัตว์เมืองเลย';
    return 'แจ้งเปลี่ยนแปลงการนัดหมาย - โรงพยาบาลสัตว์เมืองเลย';
};

const getHeadingByType = (type, appointment) => {
    if (type === 'created' && appointment?.appt_status === 'รอ') {
        return 'คลินิกส่งนัดหมายใหม่ กรุณาตอบรับในระบบ';
    }
    if (type === 'created') return 'นัดหมายของคุณถูกบันทึกเรียบร้อยแล้ว';
    if (type === 'rescheduled') return 'คลินิกเสนอวันนัดหมายใหม่ กรุณาเข้าสู่ระบบเพื่อตอบรับ';
    if (type === 'canceled') return 'นัดหมายของคุณถูกยกเลิก';
    return 'มีการอัปเดตข้อมูลนัดหมายของคุณ';
};

const buildAppointmentMessage = (type, appointment) => {
    const clinicName = appointment.clinic_name || 'โรงพยาบาลสัตว์เมืองเลย';
    const heading = getHeadingByType(type, appointment);
    const dateText = formatThaiDate(appointment.appt_date);
    const timeText = formatTime(appointment.appt_time);
    const reasonText = appointment.appt_reason || 'ไม่ได้ระบุ';
    const cancelReasonText = appointment.cancel_reason || 'ไม่ได้ระบุ';
    const clinicTel = appointment.clinic_tel || '-';
    const clinicAddress = appointment.clinic_address || '-';

    const extraLabel = type === 'canceled'
        ? 'เหตุผลการยกเลิก'
        : type === 'rescheduled'
            ? 'คำขอเดิมของเจ้าของสัตว์เลี้ยง'
            : 'อาการหรือเหตุผลนัดหมาย';
    const extraValue = type === 'canceled' || type === 'rescheduled'
        ? cancelReasonText
        : reasonText;
    const extraLine = `${extraLabel}: ${extraValue}`;

    const text = [
        `เรียน คุณ${appointment.owner_name || 'ลูกค้า'}`,
        '',
        heading,
        `สัตว์เลี้ยง: ${appointment.pet_name || '-'}`,
        `วันที่นัดหมาย: ${dateText}`,
        `เวลา: ${timeText} น.`,
        `สัตวแพทย์: ${appointment.vet_name || '-'}`,
        extraLine,
        '',
        `คลินิก: ${clinicName}`,
        `โทร: ${clinicTel}`,
        `ที่อยู่: ${clinicAddress}`
    ].join('\n');

    const html = `
        <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
            <h2 style="margin-bottom: 12px;">${heading}</h2>
            <p>เรียน คุณ${appointment.owner_name || 'ลูกค้า'}</p>
            <div style="padding: 16px; border: 1px solid #e5e7eb; border-radius: 12px; background: #f9fafb;">
                <p style="margin: 0 0 8px;"><strong>สัตว์เลี้ยง:</strong> ${appointment.pet_name || '-'}</p>
                <p style="margin: 0 0 8px;"><strong>วันที่นัดหมาย:</strong> ${dateText}</p>
                <p style="margin: 0 0 8px;"><strong>เวลา:</strong> ${timeText} น.</p>
                <p style="margin: 0 0 8px;"><strong>สัตวแพทย์:</strong> ${appointment.vet_name || '-'}</p>
                <p style="margin: 0;"><strong>${extraLabel}:</strong> ${extraValue}</p>
            </div>
            <p style="margin-top: 16px;"><strong>คลินิก:</strong> ${clinicName}<br />
            <strong>โทร:</strong> ${clinicTel}<br />
            <strong>ที่อยู่:</strong> ${clinicAddress}</p>
        </div>
    `;

    return { text, html };
};

const sendAppointmentNotification = async ({ type, appointment }) => {
    if (!appointment?.owner_email) {
        return {
            sent: false,
            skipped: true,
            reason: 'missing-recipient'
        };
    }

    const mailer = getTransporter();
    if (!mailer) {
        return {
            sent: false,
            skipped: true,
            reason: 'mail-not-configured'
        };
    }

    const config = getMailConfig();
    const { text, html } = buildAppointmentMessage(type, appointment);

    try {
        await mailer.sendMail({
            from: config.from,
            to: appointment.owner_email,
            subject: getSubjectByType(type, appointment),
            text,
            html
        });

        return {
            sent: true,
            skipped: false
        };
    } catch (error) {
        console.error('Send appointment email failed:', error.message);
        return {
            sent: false,
            skipped: false,
            reason: 'send-failed'
        };
    }
};

const queueAppointmentNotification = ({ type, appointment }) => {
    if (!appointment?.owner_email) {
        return {
            sent: false,
            queued: false,
            skipped: true,
            reason: 'missing-recipient'
        };
    }

    if (!isMailConfigured()) {
        return {
            sent: false,
            queued: false,
            skipped: true,
            reason: 'mail-not-configured'
        };
    }

    setImmediate(() => {
        sendAppointmentNotification({ type, appointment }).catch((error) => {
            console.error('Queued appointment email failed:', error.message);
        });
    });

    return {
        sent: false,
        queued: true,
        skipped: false,
        message: 'บันทึกข้อมูลแล้ว ระบบกำลังส่งอีเมลแจ้งเตือน'
    };
};

module.exports = {
    isMailConfigured,
    sendAppointmentNotification,
    queueAppointmentNotification
};
