# ADR-0003: Database + Admin-First Build Order

Status: Accepted | 2026-08-11

Decision: (1) DB schema + seed -> (2) API core + CRUD + auth -> (3) Admin dashboard -> (4+) THOTH, payments logic, customer app, ride.

Why: Validate full schema visually via Admin before building THOTH/payments; live debug visibility into riskiest data.