const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const auth = require('./auth.middleware');

const getPetWithOwner = async (petId) => {
  const result = await pool.query(
    `
    SELECT
      p.pet_id,
      p.owner_id,
      p.pet_name,
      p.pet_type,
      p.pet_breed,
      p.pet_gender,
      p.sterile_status,
      p.pet_color,
      p.pet_birthdate,
      p.drug_allergy,
      o.owner_name,
      o.owner_email,
      o.owner_tel,
      o.user_id
    FROM tb_pet p
    LEFT JOIN tb_owner o ON p.owner_id = o.owner_id
    WHERE p.pet_id = $1
    LIMIT 1
    `,
    [petId]
  );

  return result.rows[0] || null;
};

const canAccessPet = (req, pet) => {
  if (!pet) return false;
  return req.user?.role === 'admin' || req.user?.user_id === pet.user_id;
};

const loadTreatmentHistory = async (petId) => {
  const treatments = await pool.query(
    `
    SELECT
      t.treatment_id,
      t.treatment_date,
      t.symptom,
      t.diagnosis,
      t.total_amount,
      COALESCE(v.vet_name, u.username) AS doctor_name
    FROM tb_treatment t
    LEFT JOIN tb_user u ON t.user_id = u.user_id
    LEFT JOIN tb_veterinarian v ON t.vet_id = v.vet_id
    WHERE t.pet_id = $1
    ORDER BY t.treatment_date DESC
    `,
    [petId]
  );

  const treatmentIds = treatments.rows.map((row) => row.treatment_id);
  const detailsByTreatment = {};

  if (treatmentIds.length > 0) {
    const details = await pool.query(
      `
      SELECT
        d.treatment_id,
        d.detail_id,
        d.service_id,
        d.quantity,
        d.price,
        s.service_name
      FROM tb_treatment_detail d
      LEFT JOIN tb_service s ON d.service_id = s.service_id
      WHERE d.treatment_id = ANY($1::varchar[])
      ORDER BY d.detail_id ASC
      `,
      [treatmentIds]
    );

    for (const row of details.rows) {
      if (!detailsByTreatment[row.treatment_id]) detailsByTreatment[row.treatment_id] = [];
      detailsByTreatment[row.treatment_id].push(row);
    }
  }

  return treatments.rows.map((row) => ({
    ...row,
    details: detailsByTreatment[row.treatment_id] || []
  }));
};

router.get('/pet-history/:pet_id', auth, async (req, res) => {
  try {
    const pet = await getPetWithOwner(req.params.pet_id);
    if (!pet) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลสัตว์เลี้ยง' });
    }

    if (!canAccessPet(req, pet)) {
      return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึงข้อมูลนี้' });
    }

    const data = await loadTreatmentHistory(req.params.pet_id);

    res.json({
      success: true,
      message: 'ดึงข้อมูลประวัติการรักษาสำเร็จ',
      data
    });
  } catch (err) {
    console.error('Error loading pet history:', err);
    res.status(500).json({ success: false, message: 'เซิร์ฟเวอร์มีปัญหา' });
  }
});

router.get('/pet-summary/:pet_id', auth, async (req, res) => {
  try {
    const petId = req.params.pet_id;
    const pet = await getPetWithOwner(petId);

    if (!pet) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลสัตว์เลี้ยง' });
    }

    if (!canAccessPet(req, pet)) {
      return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึงข้อมูลนี้' });
    }

    const [appointmentsResult, treatments, vaccinesResult, surgeriesResult, receiptsResult] = await Promise.all([
      pool.query(
        `
        SELECT appt_id, appt_date, appt_time, appt_reason, appt_status, cancel_reason, create_datetime
        FROM tb_appointment
        WHERE pet_id = $1
        ORDER BY appt_date DESC, appt_time DESC
        `,
        [petId]
      ),
      loadTreatmentHistory(petId),
      pool.query(
        `
        SELECT
          v.vac_rec_id,
          v.vaccine_name,
          v.lot_number,
          v.vac_date,
          v.service_id,
          svc.service_name,
          v.vet_id,
          vet.vet_name
        FROM tb_vaccine_rec v
        LEFT JOIN tb_service svc ON v.service_id = svc.service_id
        LEFT JOIN tb_veterinarian vet ON v.vet_id = vet.vet_id
        WHERE v.pet_id = $1
        ORDER BY v.vac_date DESC NULLS LAST, v.vac_rec_id DESC
        `,
        [petId]
      ),
      pool.query(
        `
        SELECT
          s.surg_id,
          s.surg_type,
          s.anesthesia,
          s.result,
          s.service_id,
          svc.service_name,
          s.vet_id,
          vet.vet_name,
          s.create_datetime
        FROM tb_surgery s
        LEFT JOIN tb_service svc ON s.service_id = svc.service_id
        LEFT JOIN tb_veterinarian vet ON s.vet_id = vet.vet_id
        WHERE s.pet_id = $1
        ORDER BY s.create_datetime DESC NULLS LAST, s.surg_id DESC
        `,
        [petId]
      ),
      pool.query(
        `
        SELECT
          r.receipt_id,
          r.issue_date,
          r.total_amount,
          r.payment_status,
          r.pay_method,
          r.pay_date,
          r.treatment_id
        FROM tb_receipt r
        JOIN tb_treatment t ON r.treatment_id = t.treatment_id
        WHERE t.pet_id = $1
        ORDER BY r.issue_date DESC NULLS LAST, r.receipt_id DESC
        `,
        [petId]
      )
    ]);

    const latestAppointment = appointmentsResult.rows[0] || null;
    const latestTreatment = treatments[0] || null;
    const latestVaccine = vaccinesResult.rows[0] || null;
    const latestSurgery = surgeriesResult.rows[0] || null;
    const latestReceipt = receiptsResult.rows[0] || null;

    res.json({
      success: true,
      data: {
        pet,
        owner: {
          owner_id: pet.owner_id,
          owner_name: pet.owner_name,
          owner_email: pet.owner_email,
          owner_tel: pet.owner_tel,
          user_id: pet.user_id
        },
        overview: {
          appointment_count: appointmentsResult.rows.length,
          treatment_count: treatments.length,
          vaccine_count: vaccinesResult.rows.length,
          surgery_count: surgeriesResult.rows.length,
          receipt_count: receiptsResult.rows.length,
          latest_appointment: latestAppointment,
          latest_treatment: latestTreatment,
          latest_vaccine: latestVaccine,
          latest_surgery: latestSurgery,
          latest_receipt: latestReceipt
        },
        appointments: appointmentsResult.rows,
        treatments,
        vaccines: vaccinesResult.rows,
        surgeries: surgeriesResult.rows,
        receipts: receiptsResult.rows
      }
    });
  } catch (err) {
    console.error('Error loading pet summary:', err);
    res.status(500).json({ success: false, message: 'ดึงข้อมูลสรุปสัตว์เลี้ยงไม่สำเร็จ' });
  }
});

module.exports = router;
