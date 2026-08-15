-- Add ADMIN to Role enum (if not exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'Role' AND e.enumlabel = 'ADMIN') THEN
    ALTER TYPE "Role" ADD VALUE 'ADMIN';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'Role' AND e.enumlabel = 'SUPER_ADMIN') THEN
    ALTER TYPE "Role" ADD VALUE 'SUPER_ADMIN';
  END IF;
END $$;

-- Ensure organization exists
INSERT INTO organizations (id, legal_name, display_name, type, country, metadata_json, updated_at)
VALUES (gen_random_uuid(), 'Kemraa', 'Kemraa Platform', 'PLATFORM', 'EG', '{}'::jsonb, NOW())
ON CONFLICT DO NOTHING;

-- Ensure user exists and is ACTIVE
UPDATE users SET status = 'ACTIVE' WHERE email = 'customer.ar@kemraa.local';

-- Create ADMIN membership
INSERT INTO organization_members (organization_id, user_id, role)
SELECT o.id, u.id, 'ADMIN'::"Role"
FROM organizations o, users u
WHERE o.legal_name = 'Kemraa' AND u.email = 'customer.ar@kemraa.local'
ON CONFLICT (organization_id, user_id) DO UPDATE SET role = 'ADMIN'::"Role";

-- Verify
SELECT u.email, u.status, om.role::text as org_role, o.legal_name as organization
FROM users u
LEFT JOIN organization_members om ON om.user_id = u.id
LEFT JOIN organizations o ON o.id = om.organization_id
WHERE u.email = 'customer.ar@kemraa.local';