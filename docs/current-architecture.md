# Current Architecture
Modular monolith (§49). Monorepo pnpm+Turbo.
apps: api (NestJS, 35+ modules), admin (Next), partner-web (Next, 26 pages), agency-web (scaffold), customer/driver mobile (Flutter scaffolds), thoth-worker (minimal).
packages: adapters, api-client, auth, config, domain, events, localization, money, types, ui, validation (mostly thin).
Data: PostgreSQL+Prisma (~50 models, minor-unit money, tenant relations), Redis, TypeSense.
Auth: JWT+refresh, RBAC roles, MFA TOTP (pure crypto), trusted devices.
Finance: CommissionRule/Entry, Settlement, LedgerEntry, PaymentStateHistory.
Mobility: Driver/Vehicle/Ride/RideEvent/RideIncident state machines.
AI: THOTH typed-tool registry + policy engine + risk levels (no live provider).
Local infra: postgres:15432, redis:6380, typesense:8108, API docker :4001.
Ownership rules honored: dashboards call API only (§65); Admin = source of control (§66).