# ADR-0001: Modular Monolith

Status: Accepted | 2026-08-11

Decision: Start as Modular Monolith (NestJS) with strict domain boundaries in packages/domain. Any module extractable later without changing domain interfaces.

Why: Faster launch, single source of truth (PostgreSQL), extraction path preserved.