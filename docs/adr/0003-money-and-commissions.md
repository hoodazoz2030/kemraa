# ADR-0003: Minor units + configurable commissions
Decision: all money as integer minor units; commission percentages only via CommissionRule rows; never hard-coded.
Context: §26/§27/§57 and RULE 14.
Alternatives: floats (rejected), hard-coded rates (rejected).
Reason: financial consistency, auditability.
Impact: UI formats from minor units; settlement math tested in P1.