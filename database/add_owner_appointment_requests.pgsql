-- Run once on an existing database before enabling owner appointment requests.
BEGIN;

ALTER TABLE tb_appointment
    ADD COLUMN IF NOT EXISTS request_source VARCHAR(10) NOT NULL DEFAULT 'clinic';

ALTER TABLE tb_appointment
    DROP CONSTRAINT IF EXISTS tb_appointment_request_source_check;
ALTER TABLE tb_appointment
    ADD CONSTRAINT tb_appointment_request_source_check
    CHECK (request_source IN ('clinic', 'owner'));

ALTER TABLE tb_appointment
    DROP CONSTRAINT IF EXISTS tb_appointment_appt_status_check;
ALTER TABLE tb_appointment
    ADD CONSTRAINT tb_appointment_appt_status_check
    CHECK (appt_status IN ('รอ', 'รอคลินิกยืนยัน', 'ยืนยัน', 'ยกเลิก', 'เสร็จสิ้น', 'ไม่มาตามนัด'));

CREATE UNIQUE INDEX IF NOT EXISTS tb_appointment_active_vet_slot_idx
    ON tb_appointment (vet_id, appt_date, appt_time)
    WHERE appt_status IN ('รอ', 'รอคลินิกยืนยัน', 'ยืนยัน');

COMMIT;
