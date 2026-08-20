# ADR-0002: Pure-crypto TOTP instead of otplib
Decision: implement RFC-6238 TOTP with node crypto (window ±1).
Context: otplib packaging broke installs (preset-default resolution failure) during P0 environment fragility.
Alternatives: otplib (rejected: dependency risk), external MFA provider (future).
Reason: secure, conventional, zero-dependency, testable.
Impact: must keep server-side verification only; secret stored in userMfa; add automated TOTP vectors test in P1.