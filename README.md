# KEMRAA - The Land of the Sun
Powered by THOTH. Database-first, admin-first build (see docs/adr/0003).

## Build Status
- Phase 1 DB Foundation: DONE (monorepo, docker, prisma 29 models, seed, money, domain, mock adapters)
- Phase 2 API Core+Auth: Next
- Phase 3 Admin Dashboard: Planned
- Phase 4+ THOTH/Payments/App/Ride: Planned

Providers are Mock (AI/Payment/Travel/Maps/Notification) behind typed adapters.
Swap to Claude/Paymob/Fawry later, zero logic changes.

## Quick Start
pnpm install
cp .env.example .env
pnpm infra:up            # Postgres + Redis + Typesense + Mailhog
pnpm db:generate && pnpm db:migrate && pnpm db:seed
pnpm --filter @kemraa/api dev         # :4000/api/v1  docs at /docs
pnpm --filter @kemraa/admin-web dev   # :3001 RTL ar-EG

Mailhog UI: http://localhost:8025

## Rules
- Postgres = source of truth for money and bookings
- Money = integer minor units, no floats
- Idempotent payment and booking mutations
- State machines only, no direct status jumps
- No raw card data
- THOTH uses allow-listed typed tools plus policy engine plus approval gate
- Server-side permissions, MFA for privileged roles
- Audit every sensitive action
- ar-EG plus en, RTL, UTC storage from day one