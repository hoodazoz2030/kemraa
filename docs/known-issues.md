# Known Issues (ranked)
## P0
- P0-1 Local verification environment broken: node_modules partial (EPERM locks) + npx fetched prisma@6.19.3 instead of workspace 5.22.0 => 716 phantom TS errors. Fix: taskkill + clean + pnpm install + pnpm exec prisma generate. Code itself proven sound via Docker build.
- P0-2 @kemraa/adapter-ai src/index.ts(7,245) TS1005 syntax error => monorepo typecheck/build blocker. Fix after inspection (smallest safe change).
- P0-3 partner-web production build unverified (earlier failure was EPERM trace lock, not code). Verify post-fix.
## P1
- No committed automated tests (unit/integration/E2E) - §55.
- Agency portal = scaffold; mobile apps = scaffolds; THOTH lacks provider + AI safety evals (§56).
- No CI/CD, no staging.
- Partner UI placeholders: documents upload button non-functional, settings toggles static; dead code genCode() in mfa/setup page; lists lack pagination/search (§22).
- E2E PowerShell script used PS7-only operator (??) on PS5.1.
## P2
- Monitoring/observability, email/SMS real channels, S3 storage, full i18n coverage, reconciliation reports.
## P3
- Repo hygiene: .turbo cache committed; add .gitignore entries and untrack.
## P4
- Vision: Arrival Mode, Egypt Pass, Travel Card, loyalty, AR (keep architecturally possible only - §74).