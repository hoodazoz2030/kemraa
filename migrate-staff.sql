-- 1) AccountType enum: فصل الحسابات
DO $$ BEGIN
  CREATE TYPE "AccountType" AS ENUM ('STAFF', 'TRAVELER', 'PARTNER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Staff fields على users
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_type "AccountType" NOT NULL DEFAULT 'TRAVELER';
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Unique username (nullable-safe)
DO $$ BEGIN
  ALTER TABLE users ADD CONSTRAINT users_username_key UNIQUE (username);
EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL; END $$;

-- 3) Trusted devices (OTP بس من جهاز جديد)
CREATE TABLE IF NOT EXISTS trusted_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  device_fingerprint TEXT NOT NULL,
  device_name TEXT,
  last_seen_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, device_fingerprint)
);
CREATE INDEX IF NOT EXISTS trusted_devices_user_idx ON trusted_devices(user_id);

-- 4) Owner = SUPER_ADMIN + STAFF
UPDATE organization_members SET role = 'SUPER_ADMIN'
WHERE user_id = (SELECT id FROM users WHERE email = 'hoodazoz2030@gmail.com');

UPDATE users SET account_type = 'STAFF' WHERE email = 'hoodazoz2030@gmail.com';

SELECT email, account_type FROM users WHERE email = 'hoodazoz2030@gmail.com';