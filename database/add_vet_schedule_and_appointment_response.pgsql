BEGIN;

ALTER TABLE tb_appointment
  ADD COLUMN IF NOT EXISTS vet_id VARCHAR(10);

ALTER TABLE tb_appointment
  DROP CONSTRAINT IF EXISTS fk_appointment_veterinarian;

ALTER TABLE tb_appointment
  ADD CONSTRAINT fk_appointment_veterinarian
  FOREIGN KEY (vet_id)
  REFERENCES tb_veterinarian(vet_id)
  ON DELETE SET NULL;

ALTER TABLE tb_appointment
  DROP CONSTRAINT IF EXISTS tb_appointment_appt_status_check;

ALTER TABLE tb_appointment
  ADD CONSTRAINT tb_appointment_appt_status_check
  CHECK (appt_status IN ('รอ', 'ยืนยัน', 'ยกเลิก'));

ALTER TABLE tb_appointment
  ALTER COLUMN appt_status SET DEFAULT 'รอ';

CREATE TABLE IF NOT EXISTS tb_vet_schedule (
  schedule_id VARCHAR(20) PRIMARY KEY,
  vet_id VARCHAR(10) NOT NULL,
  work_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  schedule_note VARCHAR(255),
  create_datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  update_datetime TIMESTAMP,

  CONSTRAINT fk_vet_schedule_veterinarian
    FOREIGN KEY (vet_id)
    REFERENCES tb_veterinarian(vet_id)
    ON DELETE CASCADE,

  CONSTRAINT chk_vet_schedule_time
    CHECK (end_time > start_time),

  CONSTRAINT uq_vet_schedule_slot
    UNIQUE (vet_id, work_date, start_time, end_time)
);

CREATE INDEX IF NOT EXISTS idx_vet_schedule_date
  ON tb_vet_schedule (work_date, start_time);

CREATE INDEX IF NOT EXISTS idx_appointment_vet_slot
  ON tb_appointment (vet_id, appt_date, appt_time);

COMMIT;
