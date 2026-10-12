# Research learnings

> Research status: **CORE ROUTE CLAIMS INDEPENDENTLY VERIFIED** (2026-08-05). Later all-Länder,
> account, and social-insurance additions are cross-checked but still await an independent pass;
> observation-level provenance and evidence snapshots also remain. The complete analysis is in
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

Public browser access does not imply an unauthenticated API or unrestricted redistribution.
*Corrected 2026-10-09:* the documented GENESIS web service (`genesisWS/rest/2020`) requires a
token, but the GENESIS web application itself serves an unauthenticated JSON endpoint
(`https://genesis.destatis.de/genesis/api/rest/tables/<table>/data`, labels from
`/variables/<code>/values`, table lists from `/statistics/<code>/tables`). It is unversioned, so
the retrieved responses are committed under `research/raw/` with checksums and the fetch is
reproducible. Record the exact licence for each source family and use `unverified` when reuse
rights are unclear.

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

## Bundesergänzungszuweisungen are not federal expenditure Titel (2026-08-06)

The core-budget XML (rechnung_2024.xml) contains no BEZ expenditure Titel: supplementary
grants reach the Länder through the tax-distribution sphere, not the expenditure side. So a
combined federal+Berlin spending view does NOT double-count BEZ. What does overlap are
programme transfers to the Länder (Gruppierung 632/882: €40.96bn Ist 2024 across all Länder;
transfers to municipalities 633/883: €0.50bn); the per-Land slice is not derivable from the
XML — a real transfer ledger needs recipient-side identification.

## 2026-10-09 — The federal XML sum is gross; BMF's Ist is net of four items

- **Claim:** summing every expenditure Titel in `rechnung_<year>.xml` overstates BMF's official
  Ist by exactly: Obergruppe 59 repayments from non-structural refunds (2024: Titel 595 01 in
  Kapitel 3201, €8,493.8m), Obergruppe 91 reserve allocations, Obergruppe 96 cash-shortfall cover
  and Obergruppe 98 haushaltstechnische Verrechnungen (€590.3m). 2024: 474,753.7 − 8,493.8 −
  590.3 = 465,669.7 vs 465,670 Mio EUR. From 2025 the XML also carries annexed Wirtschaftspläne
  (Kapitel `xx9y`: Sondervermögen Bundeswehr 1491, KTF 6092, SVIK 6093, EU pass-through 6090)
  that must be excluded from the core total.
- **Why it is stable:** it is the footnote BMF prints under every Gesamtübersicht table.
- **Authoritative source:** BMF Monatsbericht, vorläufiger Abschluss (Jan 2025, Jan 2026), Tabelle 1 footnote 1.
- **Consequence:** `data/de/federal/budget-<year>.json` carries the bridge; never show the gross XML sum as "federal spending".
- **Verified by:** build check (residual ≤ 0.5 Mio) and review log 2026-10-09.

## 2026-10-09 — "Contributions" of the social-insurance systems are partly paid by public bodies

- **Claim:** the pension insurance's €305.3bn "Beitragseinnahmen" (2024) contain €18.1bn paid by
  the federal budget for child-raising periods, €5.0bn by the Bundesagentur, €4.4bn by health and
  €4.2bn by care insurance; the health insurance's contributions contain those paid by the pension
  insurance for pensioners (€27.3bn KVdR). Summing the four systems' contributions is not
  "payroll deductions".
- **Source:** DRV Frühjahrsfinanzschätzung 2026 p. 3; BMG KJ1; see `data/de/social-insurance/accounts.json` payer split.
- **Consequence:** show contributions by payer; count public-body contributions as transfers.

## 2026-10-09 — After-distribution tax table: decomposable only from 2013, plastics deducted implicitly

- **Claim:** in Destatis 71211-0002 the deductions from the federal column (ÖPNV, BEZ, Kfz
  compensation, consolidation aid, EU VAT/GNI own resources) exist as positions only from 2013;
  the EU plastics own resource (from 2021) is deducted from the federal total without its own
  federal position. Before and after-distribution totals differ slightly (2024: 392 Mio) and both
  are kept as published.
- **Consequence:** hierarchy checks in `build_taxes.py` apply from 2013 and subtract STEUERNVEU50 for the Bund.

## 2026-10-09 — Reference-year pairing is now 2024 (hero) + 2025 (freshness) + 2022 (Länder functions)

- Eurostat COFOG for Germany reaches 2024 (provisional); Destatis Rechnungsergebnisse by Land
  reach 2022; municipal core-budget accounts reach 2024; everything else reaches 2025. The 2021
  comparable mode in learning 11 is superseded.
