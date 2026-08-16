DO $$
DECLARE
  b_confirmed UUID;
  b_payment UUID;
  b_confirming UUID;
  partner_id UUID;
  pay1 UUID;
  pay2 UUID;
  pay3 UUID;
  rule1 UUID;
BEGIN
  SELECT id INTO b_confirmed FROM bookings WHERE external_ref = 'seed-confirmed' LIMIT 1;
  SELECT id INTO b_payment FROM bookings WHERE external_ref = 'seed-payment' LIMIT 1;
  SELECT id INTO b_confirming FROM bookings WHERE external_ref = 'seed-confirming' LIMIT 1;
  SELECT p.organization_id INTO partner_id FROM partners p JOIN organizations o ON o.id = p.organization_id WHERE o.legal_name = 'Kemraa' LIMIT 1;

  DELETE FROM commission_entries;
  DELETE FROM commission_rules;
  DELETE FROM refunds;
  DELETE FROM payments;

  -- Payments
  INSERT INTO payments (id, booking_id, provider, status, amount_minor, currency, method_type, idempotency_key, updated_at)
  VALUES (gen_random_uuid(), b_confirmed, 'fawry', 'CAPTURED', 130000, 'EGP', 'WALLET', 'pay-' || gen_random_uuid()::text, NOW()) RETURNING id INTO pay1;

  INSERT INTO payments (id, booking_id, provider, status, amount_minor, currency, method_type, idempotency_key, updated_at)
  VALUES (gen_random_uuid(), b_confirming, 'stripe', 'AUTHORIZED', 35000, 'EGP', 'CARD', 'pay-' || gen_random_uuid()::text, NOW()) RETURNING id INTO pay2;

  INSERT INTO payments (id, booking_id, provider, status, amount_minor, currency, method_type, idempotency_key, updated_at)
  VALUES (gen_random_uuid(), b_payment, 'fawry', 'REFUND_PENDING', 450000, 'EGP', 'WALLET', 'pay-' || gen_random_uuid()::text, NOW()) RETURNING id INTO pay3;

  -- Refunds (one PENDING on pay3)
  INSERT INTO refunds (id, payment_id, amount_minor, reason, status, idempotency_key)
  VALUES (gen_random_uuid(), pay3, 450000, 'Customer cancelled hotel booking', 'PENDING', 'ref-' || gen_random_uuid()::text);

  -- Commission rule: 10% global
  INSERT INTO commission_rules (id, scope_type, basis, rate_bps, fixed_minor, currency, active_from)
  VALUES (gen_random_uuid(), 'GLOBAL', 'NET', 1000, 0, 'EGP', NOW()) RETURNING id INTO rule1;

  -- Commission entries
  INSERT INTO commission_entries (id, rule_id, booking_id, beneficiary_type, beneficiary_id, amount_minor, currency, status, rule_snapshot)
  VALUES
    (gen_random_uuid(), rule1, b_confirmed, 'PLATFORM', partner_id, 13000, 'EGP', 'ELIGIBLE', '{"rateBps":1000}'::jsonb),
    (gen_random_uuid(), rule1, b_confirming, 'PLATFORM', partner_id, 3500, 'EGP', 'PENDING', '{"rateBps":1000}'::jsonb);

  RAISE NOTICE 'Seeded finance data';
END $$;

SELECT '=== Payments ===' AS s; SELECT status, amount_minor/100 AS amt, provider, method_type FROM payments;
SELECT '=== Refunds ===' AS s; SELECT status, amount_minor/100 AS amt, reason FROM refunds;
SELECT '=== Commission entries ===' AS s; SELECT status, amount_minor/100 AS amt FROM commission_entries;