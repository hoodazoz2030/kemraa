# ADR-0002: Money as Integer Minor Units

Status: Accepted | 2026-08-11

Decision: All money stored/computed as integer minor units. Floats forbidden. Rates in bps. Commission rules snapshotted at eligibility.

Enforcement: @kemraa/money only module for money math; 100% coverage.