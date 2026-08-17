-- 1) App Settings (single-row JSON)
CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT single_row CHECK (id = 1)
);
INSERT INTO app_settings (id, data) VALUES (1, '{"brandName":"Kemraa","defaultCurrency":"EGP","taxBps":1400,"supportSlaHours":24,"otpTtlMinutes":10,"locale":"ar-EG"}')
ON CONFLICT (id) DO NOTHING;

-- 2) Promo Codes
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL DEFAULT 'PERCENT',
  value_bps INTEGER NOT NULL DEFAULT 0,
  amount_minor INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EGP',
  max_uses INTEGER NOT NULL DEFAULT 0,
  used_count INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  active_from TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  active_to TIMESTAMP(3),
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3) Owner features += settings + promos
UPDATE users SET features = features || '["settings","promos"]'::jsonb WHERE username = 'owner';
SELECT username, jsonb_array_length(features) AS features_count FROM users WHERE username = 'owner';