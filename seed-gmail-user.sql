INSERT INTO users (id, email, status, locale, timezone, created_at, updated_at)
VALUES (gen_random_uuid(), 'hoodazoz2030@gmail.com', 'ACTIVE', 'ar-EG', 'Africa/Cairo', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

INSERT INTO organization_members (organization_id, user_id, role)
SELECT o.id, u.id, 'ADMIN'::"Role"
FROM organizations o, users u
WHERE o.legal_name = 'Kemraa' AND u.email = 'hoodazoz2030@gmail.com'
ON CONFLICT (organization_id, user_id) DO UPDATE SET role = 'ADMIN'::"Role";