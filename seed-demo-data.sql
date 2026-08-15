-- ===== Cleanup duplicate Kemraa orgs =====
WITH duplicates AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY legal_name ORDER BY created_at) AS rn
  FROM organizations WHERE legal_name = 'Kemraa'
)
DELETE FROM organizations WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- ===== Feature Flags =====
INSERT INTO feature_flags (key, enabled, updated_at) VALUES
  ('trips_enabled', true, NOW()),
  ('search_enabled', true, NOW()),
  ('payments_enabled', true, NOW()),
  ('notifications_enabled', true, NOW()),
  ('support_enabled', true, NOW())
ON CONFLICT (key) DO UPDATE SET enabled = true, updated_at = NOW();

-- ===== Create Kemraa as a Partner (no updated_at in partners table!) =====
INSERT INTO partners (organization_id, partner_type, contract_status, settlement_terms_json)
SELECT id, 'PLATFORM', 'ACTIVE'::"ContractStatus", '{}'::jsonb
FROM organizations WHERE legal_name = 'Kemraa'
ON CONFLICT (organization_id) DO UPDATE 
  SET partner_type = 'PLATFORM', contract_status = 'ACTIVE'::"ContractStatus";

DO $$
DECLARE
  org_id UUID;
  user_id UUID;
  trip1_id UUID;
  trip2_id UUID;
  trip3_id UUID;
  itin1_id UUID;
  itin2_id UUID;
BEGIN
  SELECT id INTO org_id FROM organizations WHERE legal_name = 'Kemraa' LIMIT 1;
  SELECT id INTO user_id FROM users WHERE email = 'customer.ar@kemraa.local' LIMIT 1;
  
  IF org_id IS NULL THEN RAISE EXCEPTION 'No Kemraa org'; END IF;
  IF user_id IS NULL THEN RAISE EXCEPTION 'No user'; END IF;
  
  -- ===== Services (provider_id = partners.organization_id = org_id) =====
  DELETE FROM services WHERE provider_id = org_id AND title IN (
    'Cairo Marriott Hotel', 'Pyramids Day Tour', 'Khan el-Khalili Dinner',
    'Airport Transfer', 'Egypt eSIM 10GB'
  );
  
  INSERT INTO services (id, provider_id, type, title, description, currency, price_minor, status, updated_at)
  VALUES
    (gen_random_uuid(), org_id, 'HOTEL', 'Cairo Marriott Hotel', '5-star hotel overlooking the Nile', 'EGP', 450000, 'ACTIVE', NOW()),
    (gen_random_uuid(), org_id, 'EXPERIENCE', 'Pyramids Day Tour', 'Guided tour of Giza Pyramids & Sphinx', 'EGP', 120000, 'ACTIVE', NOW()),
    (gen_random_uuid(), org_id, 'RESTAURANT', 'Khan el-Khalili Dinner', 'Traditional Egyptian dinner', 'EGP', 65000, 'ACTIVE', NOW()),
    (gen_random_uuid(), org_id, 'TRANSFER', 'Airport Transfer', 'Private CAI airport pickup', 'EGP', 35000, 'ACTIVE', NOW()),
    (gen_random_uuid(), org_id, 'ESIM', 'Egypt eSIM 10GB', '10GB data for 30 days', 'USD', 1500, 'ACTIVE', NOW());
  
  -- ===== Clean old trips for this user =====
  DELETE FROM itinerary_items WHERE itinerary_id IN (
    SELECT i.id FROM itineraries i 
    JOIN trips t ON t.id = i.trip_id 
    WHERE t.traveler_id = user_id AND t.title IN ('Egypt Discovery Week', 'Luxor Weekend Escape', 'Aswan Nile Cruise')
  );
  DELETE FROM itineraries WHERE trip_id IN (
    SELECT id FROM trips WHERE traveler_id = user_id AND title IN ('Egypt Discovery Week', 'Luxor Weekend Escape', 'Aswan Nile Cruise')
  );
  DELETE FROM trips WHERE traveler_id = user_id AND title IN ('Egypt Discovery Week', 'Luxor Weekend Escape', 'Aswan Nile Cruise');
  
  -- ===== Trip 1: ACTIVE =====
  INSERT INTO trips (id, traveler_id, title, destination_country, start_at, end_at, currency, budget_minor, status, updated_at)
  VALUES (gen_random_uuid(), user_id, 'Egypt Discovery Week', 'EG',
    NOW() + INTERVAL '15 days', NOW() + INTERVAL '22 days',
    'EGP', 1500000, 'ACTIVE', NOW()) RETURNING id INTO trip1_id;
  
  INSERT INTO itineraries (id, trip_id, version, status, total_estimated_minor)
  VALUES (gen_random_uuid(), trip1_id, 1, 'APPROVED', 670000) RETURNING id INTO itin1_id;
  
  INSERT INTO itinerary_items (id, itinerary_id, type, title, estimated_minor, location_json) VALUES
    (gen_random_uuid(), itin1_id, 'HOTEL', 'Check-in Cairo Marriott', 450000, '{}'::jsonb),
    (gen_random_uuid(), itin1_id, 'EXPERIENCE', 'Giza Pyramids & Sphinx', 120000, '{}'::jsonb),
    (gen_random_uuid(), itin1_id, 'RESTAURANT', 'Khan el-Khalili dinner', 65000, '{}'::jsonb),
    (gen_random_uuid(), itin1_id, 'TRANSFER', 'Airport pickup', 35000, '{}'::jsonb);
  
  -- ===== Trip 2: READY =====
  INSERT INTO trips (id, traveler_id, title, destination_country, start_at, end_at, currency, budget_minor, status, updated_at)
  VALUES (gen_random_uuid(), user_id, 'Luxor Weekend Escape', 'EG',
    NOW() + INTERVAL '30 days', NOW() + INTERVAL '33 days',
    'EGP', 600000, 'READY', NOW()) RETURNING id INTO trip2_id;
  
  INSERT INTO itineraries (id, trip_id, version, status, total_estimated_minor)
  VALUES (gen_random_uuid(), trip2_id, 1, 'PROPOSED', 500000) RETURNING id INTO itin2_id;
  
  INSERT INTO itinerary_items (id, itinerary_id, type, title, estimated_minor, location_json) VALUES
    (gen_random_uuid(), itin2_id, 'EXPERIENCE', 'Karnak Temple tour', 200000, '{}'::jsonb),
    (gen_random_uuid(), itin2_id, 'HOTEL', 'Luxor Nile hotel', 300000, '{}'::jsonb);
  
  -- ===== Trip 3: PLANNING =====
  INSERT INTO trips (id, traveler_id, title, destination_country, start_at, end_at, currency, budget_minor, status, updated_at)
  VALUES (gen_random_uuid(), user_id, 'Aswan Nile Cruise', 'EG',
    NOW() + INTERVAL '45 days', NOW() + INTERVAL '50 days',
    'EGP', 900000, 'PLANNING', NOW()) RETURNING id INTO trip3_id;
END $$;

-- ===== Verify =====
SELECT '=== Partners ===' AS section;
SELECT organization_id, partner_type, contract_status FROM partners;

SELECT '=== Services ===' AS section;
SELECT title, type, status, (price_minor/100.0)::numeric(10,2) AS price FROM services;

SELECT '=== Trips ===' AS section;
SELECT t.title, t.status, t.budget_minor/100 AS budget_egp, COUNT(i.id) AS items
FROM trips t
LEFT JOIN itineraries it ON it.trip_id = t.id
LEFT JOIN itinerary_items i ON i.itinerary_id = it.id
GROUP BY t.id, t.title, t.status, t.budget_minor, t.created_at
ORDER BY t.created_at DESC;