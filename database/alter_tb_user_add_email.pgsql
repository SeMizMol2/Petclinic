ALTER TABLE tb_user
ADD COLUMN IF NOT EXISTS email VARCHAR(100);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tb_user_email_lower
ON tb_user (LOWER(email))
WHERE email IS NOT NULL AND TRIM(email) <> '';
