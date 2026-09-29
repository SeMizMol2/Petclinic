BEGIN;

CREATE TABLE IF NOT EXISTS tb_receipt_payment_event (
    event_id BIGSERIAL PRIMARY KEY,
    receipt_id VARCHAR(15) NOT NULL REFERENCES tb_receipt(receipt_id) ON DELETE RESTRICT,
    previous_status VARCHAR(20) NOT NULL,
    new_status VARCHAR(20) NOT NULL,
    reason TEXT,
    changed_by_user_id VARCHAR(20) NOT NULL,
    changed_by_username VARCHAR(100) NOT NULL,
    previous_pay_date TIMESTAMP,
    event_datetime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT tb_receipt_payment_event_reason_check
      CHECK (new_status <> 'ยังไม่ได้ชำระ' OR char_length(btrim(coalesce(reason, ''))) >= 5)
);

CREATE INDEX IF NOT EXISTS idx_receipt_payment_event_receipt_time
    ON tb_receipt_payment_event(receipt_id, event_datetime DESC, event_id DESC);

COMMIT;
