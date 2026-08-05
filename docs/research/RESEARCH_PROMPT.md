# Provider-neutral research prompt

Use this prompt for a future annual collection or independent reproduction. Replace bracketed
fields. Do not remove the honesty constraints.

```text
You are researching the German fiscal graph for where-is-the-tax.

Read these repository files completely before collecting anything:
- PLAN.md
- docs/DATA_SCHEMA.md
- docs/METHODOLOGY.md
- docs/research/GERMANY_FISCAL_GRAPH_2026-08-05.md
- docs/research/COLLECTION_PLAYBOOK.md
- docs/research/RESEARCH_LEARNINGS.md
- docs/research/SOURCE_CATALOG.md

Objective
Build or verify an official-source graph for [REFERENCE YEAR / MODE]:

taxable event or contribution
  → named tax/system
  → constitutional/statutory allocation
  → geographical decomposition and annual clearing
  → equalisation/transfer where applicable
  → recipient account
  → explicit budget boundary
  → separately sourced contextual spending

Primary scenario: a person in Berlin. Product language: English, retaining official German terms
where translation would remove accounting precision.

Non-negotiable constraints
- Use first-party official sources. Link directly and record exact API/table/sheet/page coordinates.
- Treat every prior value, endpoint, current-year claim, and licence as a hypothesis to re-check.
- Record release/vintage, retrieval time, unit, year, geography, accounting basis, consolidation,
  classification, status flag, raw value, rounding, sign, licence, and attribution.
- Preserve actual/planned/provisional distinctions, negative values, source flags, and missingness.
- Never convert missing, unavailable, or logically impossible observations to zero.
- Never claim VAT from a purchase remains in the purchase Land.
- Never model current Länder equalisation as invented bilateral donor-to-recipient wires.
- Never model Berlin boroughs as tax recipients.
- End a tax path at the recipient's general-budget boundary unless an explicit legal earmark exists.
- Label post-boundary spending as whole-account context, not traced tax money.
- Keep contributions separate from taxes and grants as inter-account transfers.
- Do not add government or social-system accounts without eliminating transfers.
- Do not add organizational, functional, and economic classifications of the same expenditure.
- Do not add gross, adjusted, and net expenditure measures.
- Do not combine different years into one total; expose every vintage transition.
- Do not equate a financing deficit with debt change.
- Use structured reproducible derivations and source-rounding bounds; do not invent values.
- If a material source, licence, status, route, or reconciliation remains unresolved, fail closed.

Research order
1. Inventory availability across all intended nodes and justify the reference-year/mode choice.
2. Collect Destatis 71211 before- and after-distribution tax observations.
3. Collect the official Berlin tax detail for Berlin's Land and municipal roles.
4. Encode tax-specific law, effective dates, decomposition, VAT, and trade-tax rules.
5. Reproduce the official annual VAT/equalisation calculation and preserve provisional status.
6. Collect complete financing bridges and actual expenditure for each recipient account.
7. Build a transfer ledger and consolidation decisions.
8. Verify geodata, API behavior, release status, licence, and required attribution.
9. Run an independent reproduction from raw evidence.

Required outputs
- a dated research log;
- updated source catalog and licence register;
- extraction records shared across rows where one retrieval supports many observations;
- exact observation coordinates and evidence checksums;
- typed graph nodes and edges with legal bases and evidence status;
- recipient-account reconciliation and transfer-elimination records;
- a discrepancy and unavailable-data list;
- a list of what the interface can and cannot claim;
- proposed updates to stable research learnings;
- an independent-verification report.

Separate direct observations, statutory facts, calculated official aggregates, and interpretation.
Cite every external claim near the claim. Do not mark your own collection independently verified.
```

The independent verifier receives the repository contract, source catalog, extraction recipes,
and evidence, but not an instruction to defend the collector's narrative. It reports pass/fail per
source, observation, legal edge, derivation, transfer, reconciliation, licence, and omission.
