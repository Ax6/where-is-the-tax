# Germany fiscal-graph collection playbook

This workflow collects a routed fiscal graph, not one consolidated revenue/expenditure hierarchy.
Read `GERMANY_FISCAL_GRAPH_2026-08-05.md`, `RESEARCH_LEARNINGS.md`, and `SOURCE_CATALOG.md` before a
new run.

## 1. Open the run

1. Copy `logs/TEMPLATE.md` to a dated run log.
2. Name the collector and a different independent verifier.
3. Choose the intended evidence mode:
   - route and recipient accounts;
   - standardized public-system comparison;
   - freshness preview.
4. Inventory availability for every intended node before selecting a common reference year.
5. Record any branch that must change year; the interface must expose that discontinuity.

Stop if the product label would imply a same-year or actual observation that the source does not
provide.

## 2. Collect tax receipts

1. Extract Destatis `71211` before-distribution named taxes for the chosen year.
2. Extract after-distribution recipient totals and sub-lines for Germany and the Länder.
3. Preserve every source status marker, sign, missing marker, and displayed rounding increment.
4. For Berlin, collect the official Berlin tax CSV/table to restore Land/municipal and tax detail
   collapsed in the national after-distribution table.
5. Do not call a geographically collected VAT observation the destination of that VAT.

One query may back many observations. Create one extraction record and give each observation exact
dimension coordinates.

## 3. Encode legal routing

For each tax family:

1. Record the exact law section and effective dates.
2. Choose an edge kind and evidence status.
3. Distinguish fixed vertical shares from geographical decomposition and annual formulas.
4. Store formulas as structured operations with observed inputs, not executable text.
5. Reproduce every calculated official amount within source-rounding bounds.

Never infer an edge merely because source and destination category names resemble each other.

## 4. Collect annual clearing and equalisation

1. Collect the official BMF annual VAT/equalisation calculation.
2. Record whether the publisher calls it provisional.
3. Treat Länder additions/deductions as changes around a common VAT pool.
4. Record federal supplementary grants as separate transfer edges.
5. Do not manufacture bilateral Land-to-Land flows.

## 5. Build recipient accounts

For each Federation, Berlin, EU, or social-system account:

1. collect its complete revenue/financing bridge;
2. collect the best final actual expenditure hierarchy;
3. declare core/extra-budget coverage;
4. identify transfers received and paid;
5. reconcile the account separately;
6. add an explicit `budget_boundary` edge before spending.

Taxes alone need not equal outlays. Borrowing, reserves, fees, contributions, grants, and financing
adjustments must retain their own meaning.

## 6. Maintain the transfer ledger

Every cross-account payment requires:

```text
from_entity
to_entity
amount
reference_year
accounting_basis
source_title_or_group
consolidation_scope
transfer_or_terminal_spend
```

When consolidating, eliminate the transfer inside the selected scope and retain only terminal
spending. Keep the edge visible when explaining institutional routing.

## 7. Handle classifications

- Treat functional, organizational, and economic classifications as switchable views.
- Treat gross, adjusted, and net expenditure as alternative consolidation measures.
- Never add two views of the same underlying rows.
- Record classification/version changes and failed longitudinal mappings.
- Declare each hierarchy as exhaustive, partial, or illustrative.

## 8. Preserve evidence and rights

1. Store raw evidence only when licence and size allow it.
2. Otherwise store the source URL, exact retrieval recipe, checksum, and non-redistribution reason.
3. Mark `licence_unverified` when terms are unclear and fail closed on raw redistribution.
4. Record translations, rounding, aggregation, reprojection, and geometry simplification as
   modifications.
5. Keep official German terms where they prevent an inaccurate English equivalence.

## 9. Validate claims

Reject publication when a row or edge implies any of the following without direct evidence:

- a local destination for an individual VAT purchase;
- a bilateral Länder equalisation transfer;
- a Berlin borough as a tax owner;
- a tax-to-programme causal path after a general-budget boundary;
- actual expenditure sourced from plan-only rows;
- a same-year total built from mixed vintages;
- a sum across alternative classifications or consolidation measures;
- terminal spending counted both before and after a transfer;
- missing/unavailable coerced to zero;
- deficit treated as debt change.

## 10. Verify independently

The verifier starts from sources, queries, and evidence—not the collector's narrative—and checks:

- source identity, coordinates, release, status, and licence;
- every directly observed value;
- each statutory share and formula input;
- annual equalisation reproduction;
- recipient-account reconciliation;
- transfer eliminations;
- classification and vintage labels;
- English explanation and prohibited-claim checks.

A disagreement stays pending. It is never averaged away or resolved by the collector reviewing
their own work.

## 11. Publish artifacts

- Update the source catalog, licence register, dated log, evidence manifest, extractions,
  observations, graph edges, and stable learnings.
- Run schema validation, reconciliation tests, type checking, production build, and rendered
  inspection.
- Inspect the graph in every tax route and recipient mode, including no-JavaScript evidence tables.

### Exit checklist

- [ ] Every mode and visible value shows its actual reference year.
- [ ] Every observation has exact provenance, status, accounting context, and licence decision.
- [ ] Every route has a legal or official-calculation basis.
- [ ] Budget boundaries visibly end tax identity.
- [ ] Recipient accounts reconcile within source-rounding bounds.
- [ ] Transfers are identified and eliminated inside consolidated totals.
- [ ] Alternative classifications and measures are not added.
- [ ] Missing, negative, unavailable, planned, and provisional values retain their meaning.
- [ ] All raw redistributed evidence has verified reuse terms and attribution.
- [ ] Independent review is complete and all material disagreements are resolved.
- [ ] Deterministic checks and rendered inspection pass.
