# Research learnings

> Research status: **COLLECTED, AWAITING INDEPENDENT VERIFICATION** (2026-08-05). The complete
> evidence-backed analysis is in
> [`GERMANY_FISCAL_GRAPH_2026-08-05.md`](./GERMANY_FISCAL_GRAPH_2026-08-05.md).

This file carries stable conclusions into future research runs. Volatile availability, release
dates, API mechanics, and observation status belong in `SOURCE_CATALOG.md` or a dated run log.

## 1. Germany is a fiscal graph, not one pool

The durable product model is:

```text
tax event → legal allocation → clearing/equalisation → recipient account
          → budget boundary → contextual spending
```

Different taxes use different topology. Do not force all taxes through a universal Sankey or a
single consolidated-government node.

Authoritative basis: Basic Law [Article 106](https://www.gesetze-im-internet.de/gg/art_106.html)
and [Article 107](https://www.gesetze-im-internet.de/gg/art_107.html).

## 2. Tax identity stops at a general-budget boundary

Except for explicit earmarking, all revenues finance all expenditure. A recipient's expenditure
composition can be shown after the boundary, but must not be presented as a causal continuation
of one tax.

Authoritative basis: [§8 Bundeshaushaltsordnung](https://www.gesetze-im-internet.de/bho/__8.html)
and [§8 Berlin Landeshaushaltsordnung](https://gesetze.berlin.de/bsbe/?query=DOKNR%3Ajlr-HOBE2009pP8&source=PermaLink).

## 3. Berlin is Land and municipality

Both Land and municipal tax shares arrive at the Berlin entity. Berlin's boroughs are
administrative units, not municipal tax recipients. Boroughs appear only after the Berlin budget
boundary through global allocations, appropriations, or service delivery.

Authoritative basis: [Berlin borough administration](https://www.berlin.de/sen/inneres/buerger-und-staat/verfassungs-und-verwaltungsrecht/berliner-bezirke/bezirksorganisation-und-verwaltung/artikel.29993.php)
and [Berlin Constitution Article 85](https://www.berlin.de/rbmskzl/politik/senat/verfassung/artikel.41499.php).

## 4. VAT from a purchase is not geographically traceable

VAT from a Berlin purchase enters a national aggregate. It is then divided vertically among the
Federation, Länder, and municipalities; the Länder portion passes through the population and
equalisation system, while the municipal portion uses a separate statutory key.

The product may explain the legal aggregate route. It must not say that VAT from a particular
Berlin shop stayed in Berlin.

## 5. Post-2020 Länder equalisation is pooled

Fiscal-capacity additions and deductions are integrated into the Länder VAT distribution. A map
may show each Land's adjustment around the common pool. Do not draw invented bilateral
donor-to-recipient transfers.

Official annual calculations can remain provisional after publication; preserve their status.

## 6. Purchases may contain multiple taxes

Purchase explanations must model tax layers rather than only VAT. Examples include energy,
electricity, tobacco, beer, insurance, and real-estate transfer taxes. Their recipients differ.
Use event presets as explanatory entry points, not a questionnaire about the user.

## 7. Contributions are not taxes

Statutory social-insurance contributions flow into dedicated systems. Those systems also receive
public grants. Model contributions as a parallel source branch and public grants as transfers.
Eliminate those transfers before combining government and social-system expenditure.

## 8. Reconcile recipient accounts separately

Tax receipts alone do not equal expenditure. Each account needs a financing bridge containing its
taxes or contributions, transfers received, other revenue, financing items, spending, transfers
paid, and closing adjustments.

Never equate financing deficit with debt change.

## 9. Classifications are alternative views

Functional, organizational, and economic classifications may describe the same expenditure.
Switch between them; never add them. Similarly, gross, adjusted, and net expenditure are alternate
consolidation measures.

## 10. Transfers are edges, not terminal spending

Every cross-account payment requires a transfer ledger. This includes federal grants, special
funds, Berlin central-to-borough allocations, and social-insurance grants. Counting both a transfer
and the recipient's later programme outlay as terminal spending is double-counting.

## 11. One current deep actual tree does not exist

Source publication lags differ. The current defensible production pairing is:

- 2024 route and recipient-account mode;
- 2021 standardized Germany/Länder/public-function comparison mode.

Every visible value must carry its own year and status. Never conceal a vintage transition.

## 12. Cash, financial-statistics, and ESA observations are not interchangeable

Destatis tax-distribution cash data is the primary route layer. Recipient budgets provide
cash/cameral accounts. Destatis public-finance statistics provide standardized/consolidated views.
Eurostat ESA accrual data is useful for independent cross-checking and international comparison,
not as a child or parent of incompatible cash figures.

## 13. Availability is not zero

Preserve source flags, negative values, missing observations, planned/actual status, preliminary
or provisional status, and source rounding. Derive reconciliation bounds from source rounding; do
not use fixed percentage tolerances.

## 14. Evidence status belongs on graph edges

Use explicit evidence states:

```text
exact_statute
calculated_official
provisional_official
formula_dependent
not_individually_traceable
budget_boundary
contextual_spending
```

This prevents a statutory share, a derived aggregate, a provisional annual calculation, and an
illustrative spending context from appearing equally certain.

## 15. Collection provenance can be shared

One official API query or table download may support many rows. Store one extraction/provenance
entry for that retrieval and give each observation exact table coordinates. Per-row duplication of
the same 15-field provenance block adds work without adding auditability.

## 16. API and licence claims need their own verification

Public browser access does not imply an unauthenticated API or unrestricted redistribution. The
current GENESIS API requires authentication even though web tables are public. Record the exact
licence for each source family and use `licence_unverified` when reuse rights are unclear.

## Claims the product must reject

- “All taxes paid in Berlin go to Berlin.”
- “VAT from this Berlin purchase goes to Berlin.”
- “Bavaria directly transferred this amount to Berlin.”
- “Berlin boroughs receive tax revenue.”
- “This specific tax euro funded this specific programme,” absent an explicit earmark.
- “The EU receives this percentage of the VAT on this purchase.”
- “Berlin's open title CSV is actual expenditure.”
- “These 2021, 2024, and 2025 values form one same-year total.”

## Template for a future stable learning

### YYYY-MM-DD — Short title

- **Claim:**
- **Why it is stable:**
- **Authoritative source(s):**
- **Exact location or coordinates:**
- **Consequence for collection or presentation:**
- **Failed alternatives / traps:**
- **Verified by and date:**

Do not promote an unresolved discrepancy or volatile availability claim into this file.
