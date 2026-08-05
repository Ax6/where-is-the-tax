# Methodology

> Status: foundation only. No Germany dataset has been researched or approved yet.

`where-is-the-tax` explains consolidated general-government finances in plain English. Its
accounting frame is ESA 2010 sector S.13: central, state, and local government plus social-security
funds, with transfers inside that perimeter consolidated.

## What the two sides mean

Revenue is grouped by compatible ESA transactions. Expenditure is grouped by the ten COFOG
functions. These are two classifications of the same public-finance system; the visualization does
not claim that any named tax is earmarked for any named service.

The balance is `total revenue - total expenditure`. A negative result is net borrowing and a
positive result is net lending. It is not the change in gross debt, which can also reflect
financial transactions, valuation effects, and other stock-flow adjustments.

## Compatibility before detail

An additive hierarchy uses one reference period, sector, accounting basis, unit, consolidation
scope, and compatible source vintage. Cash-tax reports, ministry budgets, and social-budget
publications may provide context, but they cannot be children of ESA accrual totals. A reported
official parent stays authoritative.

Missing is not zero. Negative observations remain signed. Provisional, estimated, or forecast
observations remain labelled. The newest publishable year is the newest year for which both sides
form a coherent bundle, not necessarily the newest figure mentioned in a press release.

## Reproducibility

Each displayed value points to provenance. Reported provenance selects exact coordinates from a
documented extraction; derived provenance lists structured inputs and coefficients. Sources carry
their own licence and attribution. Evidence is stored when permitted, otherwise the retrieval
recipe, checksum, and non-redistribution reason are retained.

Deterministic validation checks structure and arithmetic. It cannot prove that a source was read
correctly, so a separate reviewer must reproduce mappings and calculations from the evidence
before a publication bundle is accepted.

See [the data schema](DATA_SCHEMA.md) for the file contract and
[the collection playbook](research/COLLECTION_PLAYBOOK.md) for the controlled research sequence.
