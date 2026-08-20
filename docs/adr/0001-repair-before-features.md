# ADR-0001: Repair before features
Decision: freeze new business features; fix P0 (build/typecheck/verification env) first, then baseline tests.
Context: Master Spec §50-§59 mandates audit-first; local verification broken.
Alternatives: continue feature work (rejected: unverifiable).
Reason: RULE 22 - claims must be evidence-based.
Impact: short-term slowdown, long-term convergence.