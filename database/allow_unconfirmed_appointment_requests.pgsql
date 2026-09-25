-- Pending owner requests are proposals, not occupied veterinary slots.
BEGIN;

DROP INDEX IF EXISTS tb_appointment_active_vet_slot_idx;
CREATE UNIQUE INDEX tb_appointment_active_vet_slot_idx
    ON tb_appointment (vet_id, appt_date, appt_time)
    WHERE appt_status IN ('รอ', 'ยืนยัน');

COMMIT;
