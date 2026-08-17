-- 1) Add access_code fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS access_code TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS access_code_locked_until TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS access_code_attempts INTEGER NOT NULL DEFAULT 0;

-- 2) Set Owner's special code (unique format, unguessable)
UPDATE users SET 
  access_code = 'KRT-SUN-2026-KEMRAA',
  access_code_attempts = 0,
  account_type = 'STAFF',
  status = 'ACTIVE'
WHERE email = 'hoodazoz2030@gmail.com';

-- 3) Verify
SELECT username, email, access_code, account_type FROM users WHERE email = 'hoodazoz2030@gmail.com';