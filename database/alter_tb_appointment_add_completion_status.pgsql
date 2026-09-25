DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appt_status_enum') THEN
    ALTER TYPE appt_status_enum ADD VALUE IF NOT EXISTS 'เสร็จสิ้น';
    ALTER TYPE appt_status_enum ADD VALUE IF NOT EXISTS 'ไม่มาตามนัด';
  END IF;
END $$;

ALTER TABLE tb_appointment
  DROP CONSTRAINT IF EXISTS tb_appointment_appt_status_check;

ALTER TABLE tb_appointment
  ADD CONSTRAINT tb_appointment_appt_status_check
  CHECK (appt_status IN ('รอ', 'ยืนยัน', 'ยกเลิก', 'เสร็จสิ้น', 'ไม่มาตามนัด'));
