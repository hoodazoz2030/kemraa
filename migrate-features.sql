ALTER TABLE users ADD COLUMN IF NOT EXISTS features JSONB NOT NULL DEFAULT '[]';
UPDATE users SET features = '["dashboard","analytics","services","trips","bookings","payments","refunds","commissions","users","map","notifications","support","flags","audit","staff"]'
WHERE username = 'owner';
SELECT username, features FROM users WHERE username = 'owner';