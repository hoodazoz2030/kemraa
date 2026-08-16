DO $$
DECLARE
  user_id UUID;
  svc_marriott UUID;
  svc_pyramids UUID;
  svc_khan UUID;
  svc_transfer UUID;
  trip_id UUID;
  b1_id UUID;
  b2_id UUID;
  b3_id UUID;
  b4_id UUID;
  partner_id UUID;
BEGIN
  SELECT id INTO user_id FROM users WHERE email = 'customer.ar@kemraa.local' LIMIT 1;
  SELECT id INTO svc_marriott FROM services WHERE title = 'Cairo Marriott Hotel' LIMIT 1;
  SELECT id INTO svc_pyramids FROM services WHERE title = 'Pyramids Day Tour' LIMIT 1;
  SELECT id INTO svc_khan FROM services WHERE title = 'Khan el-Khalili Dinner' LIMIT 1;
  SELECT id INTO svc_transfer FROM services WHERE title = 'Airport Transfer' LIMIT 1;
  SELECT id INTO trip_id FROM trips WHERE status = 'ACTIVE' LIMIT 1;
  
  -- Get the provider (partner) from Kemraa org
  SELECT p.organization_id INTO partner_id 
  FROM partners p 
  JOIN organizations o ON o.id = p.organization_id 
  WHERE o.legal_name = 'Kemraa' LIMIT 1;
  
  IF user_id IS NULL OR svc_marriott IS NULL THEN
    RAISE EXCEPTION 'Missing user or service';
  END IF;
  
  -- Clean old seeded bookings
  DELETE FROM booking_items WHERE booking_id IN (SELECT id FROM bookings WHERE traveler_id = user_id AND external_ref LIKE 'seed-%');
  DELETE FROM bookings WHERE traveler_id = user_id AND external_ref LIKE 'seed-%';
  
  -- Booking 1: PENDING_APPROVAL (Pyramids tour)
  INSERT INTO bookings (id, traveler_id, service_id, provider_id, trip_id, status, total_minor, currency, idempotency_key, external_ref, updated_at)
  VALUES (gen_random_uuid(), user_id, svc_pyramids, partner_id, trip_id, 'PENDING_APPROVAL'::"BookingStatus", 240000, 'EGP', 'idem-' || gen_random_uuid()::text, 'seed-pending', NOW())
  RETURNING id INTO b1_id;
  
  INSERT INTO booking_items (id, booking_id, description, quantity, unit_minor, tax_minor, fee_minor, total_minor)
  VALUES (gen_random_uuid(), b1_id, 'Pyramids Day Tour - 2 adults', 2, 120000, 0, 0, 240000);
  
  -- Booking 2: PAYMENT_PENDING (Marriott - approved, waiting for payment)
  INSERT INTO bookings (id, traveler_id, service_id, provider_id, trip_id, status, total_minor, currency, idempotency_key, external_ref, updated_at)
  VALUES (gen_random_uuid(), user_id, svc_marriott, partner_id, trip_id, 'PAYMENT_PENDING'::"BookingStatus", 450000, 'EGP', 'idem-' || gen_random_uuid()::text, 'seed-payment', NOW())
  RETURNING id INTO b2_id;
  
  INSERT INTO booking_items (id, booking_id, description, quantity, unit_minor, tax_minor, fee_minor, total_minor)
  VALUES (gen_random_uuid(), b2_id, 'Cairo Marriott - 3 nights deluxe room', 1, 450000, 0, 0, 450000);
  
  -- Booking 3: CONFIRMING (Airport transfer - paid, awaiting final confirm)
  INSERT INTO bookings (id, traveler_id, service_id, provider_id, trip_id, status, total_minor, currency, idempotency_key, external_ref, updated_at)
  VALUES (gen_random_uuid(), user_id, svc_transfer, partner_id, trip_id, 'CONFIRMING'::"BookingStatus", 35000, 'EGP', 'idem-' || gen_random_uuid()::text, 'seed-confirming', NOW())
  RETURNING id INTO b3_id;
  
  INSERT INTO booking_items (id, booking_id, description, quantity, unit_minor, tax_minor, fee_minor, total_minor)
  VALUES (gen_random_uuid(), b3_id, 'Airport Transfer VIP - Mercedes', 1, 35000, 0, 0, 35000);
  
  -- Booking 4: CONFIRMED (Khan dinner - fully confirmed)
  INSERT INTO bookings (id, traveler_id, service_id, provider_id, trip_id, status, total_minor, currency, idempotency_key, external_ref, updated_at)
  VALUES (gen_random_uuid(), user_id, svc_khan, partner_id, trip_id, 'CONFIRMED'::"BookingStatus", 130000, 'EGP', 'idem-' || gen_random_uuid()::text, 'seed-confirmed', NOW())
  RETURNING id INTO b4_id;
  
  INSERT INTO booking_items (id, booking_id, description, quantity, unit_minor, tax_minor, fee_minor, total_minor)
  VALUES (gen_random_uuid(), b4_id, 'Khan el-Khalili Dinner for 2', 2, 65000, 0, 0, 130000);
  
  RAISE NOTICE 'Seeded 4 bookings successfully';
END $$;

SELECT '=== Bookings ===' AS section;
SELECT b.status, b.total_minor/100 AS total_egp, bi.description, b.external_ref
FROM bookings b
LEFT JOIN booking_items bi ON bi.booking_id = b.id
WHERE b.external_ref LIKE 'seed-%'
ORDER BY b.created_at DESC;