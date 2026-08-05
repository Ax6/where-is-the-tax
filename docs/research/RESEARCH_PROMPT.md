# Provider-neutral research prompt

Use this prompt with a capable research system only after the project owner authorizes the long
run. Replace bracketed fields; do not remove constraints.

```text
You are collecting a publication-grade German general-government dataset for where-is-the-tax.
Read PLAN.md, docs/DATA_SCHEMA.md, docs/METHODOLOGY.md,
docs/research/COLLECTION_PLAYBOOK.md, docs/research/RESEARCH_LEARNINGS.md, and
docs/research/SOURCE_CATALOG.md before collecting anything.

Objective: determine the newest reference year whose revenue and COFOG expenditure form a
coherent consolidated ESA 2010 S.13 bundle, then collect the deepest compatible official detail.

Non-negotiable constraints:
- Use current first-party official sources. Provide direct links and exact table/API coordinates.
- Record source identity, release/vintage, retrieval time, filters, sector, accounting basis,
  unit, consolidation, status flags, raw value, rounding, sign, licence, and attribution.
- Never use cash-tax, ministry-budget, or social-budget amounts as children of ESA accrual totals.
- Never convert missing/unavailable to zero or suppress meaningful negative observations.
- Use only structured reproducible derivations. Do not invent a value or category.
- Treat Germany 2024 and all source leads as hypotheses to verify, not facts.
- If a material fact, licence, status, or reconciliation is unresolved, fail closed and list it.

Produce: proposed sources/extractions/provenance records, revenue/expenditure rows, metadata,
evidence manifest entries, updates for the source catalog and dated log, and a discrepancy list.
Separate directly observed facts from inferences. Cite every external claim near the claim.

Do not mark your own output independently verified. A separate reviewer will reproduce it from
the raw evidence.
```

The independent verifier receives the same repository contract plus the evidence and proposed
records, but not a request to defend the collector's narrative. It reports pass/fail per source,
observation, mapping, derivation, licence, and omission.
