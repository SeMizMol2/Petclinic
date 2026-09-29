BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tb_user' AND column_name = 'email_verified_at'
  ) THEN
    ALTER TABLE tb_user ADD COLUMN email_verified_at TIMESTAMP;
    -- Preserve access for accounts created before verification was introduced.
    UPDATE tb_user SET email_verified_at = CURRENT_TIMESTAMP;
  END IF;
END $$;

ALTER TABLE tb_user
  ADD COLUMN IF NOT EXISTS email_verification_token_hash VARCHAR(64),
  ADD COLUMN IF NOT EXISTS email_verification_expires_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS email_verification_sent_at TIMESTAMP;

ALTER TABLE tb_user ALTER COLUMN email_verified_at SET DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS uq_tb_user_email_verification_token
  ON tb_user (email_verification_token_hash)
  WHERE email_verification_token_hash IS NOT NULL;

COMMIT;
