-- Insert 5 sample drivers
INSERT INTO drivers (user_id, verification_status, license_ref, rating, status)
SELECT 
  u.id,
  CASE (ROW_NUMBER() OVER ()) % 3 
    WHEN 0 THEN 'VERIFIED'::"VerificationStatus" 
    WHEN 1 THEN 'PENDING'::"VerificationStatus" 
    ELSE 'UNVERIFIED'::"VerificationStatus" 
  END,
  'LIC-2026-' || ROW_NUMBER() OVER (),
  (3.5 + RANDOM() * 1.5)::numeric(3,2),
  CASE (ROW_NUMBER() OVER ()) % 3 
    WHEN 0 THEN 'ONLINE'::"DriverStatus" 
    WHEN 1 THEN 'OFFLINE'::"DriverStatus" 
    ELSE 'BUSY'::"DriverStatus" 
  END
FROM users u
WHERE u.account_type != 'STAFF'
LIMIT 5
ON CONFLICT (user_id) DO NOTHING;

SELECT COUNT(*) AS total_drivers FROM drivers;