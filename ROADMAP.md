# ROADMAP — honest state of where-is-the-tax

**As of 2026-10-12** (data layer; front end wired on branch `data-layer-and-slide`). Goal (CLAUDE.md): one interactive page, German and English, where anyone
sees at a glance where a German citizen's taxes go; data first, every figure true and sourced,
contestable items marked.

## Where the project is

The **data and research layer is built**: raw sources stored locally with checksums, rationalized
JSON in `data/` produced by reproducible scripts, arithmetic reconciled against official totals,
bilingual labels everywhere, independent re-derivation logged. The **front end now reads only
`data/`** (`docs/FRONTEND_PLAN.md` build order 1–6): payslip computed in the browser and tested
against every example row and the 121 BMF Prüftabelle rows, You and Germany zooms, drawer,
equalisation map, all-taxes table, time strip, DE/EN, mobile, static fallback and a Pages workflow;
light/dark themes with validated palettes, a texture mode for forced colours, an axe-core + keyboard
test (0 violations in 17 scenarios), wage-slider reference points and a household indirect-tax
estimate (≈*) next to the exact payslip. It has not been deployed or reviewed by a second person yet.

## Scoring rubric (data layer) and self-assessment

| Criterion | Weight | Score /10 | Why |
|---|---|---:|---|
| Coverage of the citizen question (whole state, per tax, per recipient, Länder/equalisation, federal, Berlin, social insurance, EU, own payslip, purchases, time, debt) | 20 % | 8 | All blocks exist; missing: household indirect-tax total (only per-product), per-municipality view beyond Berlin, 2025 Berlin account, Länder functions newer than 2022. |
| Traceability to raw files (every number → file + coordinates) | 20 % | 9 | 117 raw files in the manifest (plus the payslip registry); every data file carries `source_ref` with coordinates; cached PDFs/HTML have committed extracts with page/row. Berlin functions-2024 still rests on the August extraction (re-verification pending). |
| Reconciliation (parts sum to official totals, bases never mixed) | 15 % | 9 | Hard checks in every build + `check.py` (0 failures): federal XML → BMF Ist to ±0.3 Mio; COFOG hierarchy; FKA nets to 0; Länder VAT pool = Destatis to the thousand; tax hierarchies exact. |
| Independent verification | 15 % | 8 | Four independent review passes logged (D: wages, household estimate, Funktionenplan, Berlin PDF re-derivation); (A: re-derivation of all main layers from raw files, every 2024 number reproduced; B: payslip, independent implementation matches 121 official BMF Prüftabellen rows; C: social insurance, PDFs re-read, 3 data mismatches fixed, 8 framing challenges applied). Not yet: a second pass on the Berlin functions-2024 extraction. |
| Freshness / vintage honesty | 10 % | 8 | 2024 hero + 2025 freshness, labelled; COFOG 2024 provisional; Länder functions 2022 (newest edition). |
| Bilingual labels | 10 % | 8 | `label.de/en` on every row; COFOG/Funktionenplan English names are editorial translations (flagged); some 2-/3-digit federal function codes have no label. |
| Rationalized constructs (simple, verified, contestables marked) | 10 % | 8 | `docs/research/RATIONALIZATION.md`: of-every-€100 for state, revenue, taxes, recipients, federal budget; per resident per day; payslip; shopping basket; EU; Berlin. Contestables marked `*`. |
| **Weighted total** | | **8.35** | 0.2·8 + 0.2·9 + 0.15·9 + 0.15·8 + 0.1·8 + 0.1·8 + 0.1·8 |

## Done / missing

| Area | Item | State | Where |
|---|---|---|---|
| Research infra | Raw registry, fetch script, manifest with SHA-256, licence decisions, cache for non-redistributable files | **done** | `research/sources.json`, `scripts/research/fetch.py`, `research/raw/MANIFEST.json` |
| Research infra | Build scripts raw → data, orchestrator, cross-file checks, generated catalog/licence/index docs | **done** | `scripts/research/build_*.py`, `build_all.py`, `check.py`, `build_docs.py` |
| Data | Named taxes 1999–2025, after-distribution 1999–2025, by Land 2013–2025 (Destatis 71211) | **done** | `data/de/taxes/` |
| Data | Legal allocation per tax with statute quotes asserted in the build | **done** | `data/de/taxes/legal-allocation.json` |
| Data | Whole state: COFOG 1995–2024 (S13 + subsectors), aggregates/debt/GDP 1991–2025, revenue by subsector 2024 | **done** | `data/de/government/` |
| Data | Cash results by level 2024, 2025 (Bund/Länder/Gemeinden/SV) | **done** | `data/de/government/cash-by-level.json` |
| Data | Federal budget 2024, 2025: Titel-level, reconciled to BMF; overview incl. KTF/SVIK/Bundeswehr fund | **done** | `data/de/federal/` |
| Data | Equalisation 2024, 2025: all Länder, VAT shares, FKA, all five BEZ types | **done** | `data/de/equalisation/` |
| Data | Social insurance 2024, 2025 with payer split, 61-entry transfer ledger, AAG levies, all labels bilingual | **done (review C applied)** | `data/de/social-insurance/accounts.json` |
| Data | Berlin tax receipts 2024, 2025; Berlin functions 2024 | **done** / re-verify | `data/de/berlin/` |
| Data | Länder + municipalities by function 2022; municipalities by product area 2011–2024 | **done** | `data/de/laender/`, `data/de/municipal/` |
| Data | EU round trip 2021–2025 | **done** | `data/de/eu/round-trip.json` |
| Data | Payslip parameters 2024–2026 and examples, validated against BMF Prüftabellen | **done** | `data/de/citizen/payslip-*.json` |
| Data | Purchase taxes (statutory rates, worked examples) | **done** | `data/de/citizen/purchase-taxes.json` |
| Data | Population (Germany, Länder) | **done** | `data/de/population.json` |
| Data | Household indirect taxes by net-income class (LWR 2024 × statutory rates), estimate `*` | **done** | `data/de/citizen/household-indirect-taxes.json` |
| Data | Wage reference points: minimum wage 2024–2027, full-time median/average 2022–2025, Durchschnittsentgelt | **done** | `data/de/citizen/wage-reference.json` |
| Data | Berlin 2025 annual account; Länder functions 2023+ | **missing** (not published at retrieval) | — |
| Data | Per-municipality figures (Regionalstatistik 71231) | **missing** | — |
| Data | Federal Funktionenplan labels (BMF Funktionenplan 2024 parsed incl. 2024 vintage markers; all 199 budget nodes labelled de+en; review D corrections applied) | **done** | `data/de/federal/funktionenplan.json`, `budget-*.json` |
| Data | Trade-tax levy block (multipliers 14.5/20.5 %, § 7 city-state rule, 2024/2025 outcome: 8.8 % of gross) | **done** | `data/de/taxes/legal-allocation.json` |
| Data | English labels for Länder sub-functions and Berlin sub-functions; Berlin built from a committed extract (legacy tree deleted) | **done** | `data/de/laender/functions-2022.json`, `data/de/berlin/functions-2024.json` |
| Research docs | Rationalization, prior art, learnings, source catalog, licences, reference-year decision | **done** | `docs/research/`, `DATA_LICENSES.md`, `research/README.md` |
| Verification | Reviews A (re-derivation), B (payslip), C (social insurance) + corrections log; equalisation/federal/social/payslip extraction logs | **done** | `docs/research/logs/2026-10-09-*.md` |
| Verification | Review D (wages, household estimate, Funktionenplan, cleanup) | **done / see log** | `docs/research/logs/2026-10-12-review-D-wages-household.md` |
| Verification | Berlin functions-2024 PDF re-derivation (review D: 31 of 33 amounts verbatim, 2 via Rechnungssoll − Reste, total exact) | **done** | `docs/research/logs/2026-10-12-review-D-wages-household.md` |
| Front end | Read `data/` only (hard-coded figures deleted); German UI; whole-state view; payslip; purchases (per item and ≈* per household); time series; debt | **done** | `src/` |
| Front end | Data check of the v2 envelope + `check.py` in CI (`npm run check:data`) | **done** | `scripts/check-data.ts`, `.github/workflows/ci.yml` |
| Front end | Visual design per CLAUDE.md (one interactive slide, less text); GitHub Pages deploy | **done, not yet deployed or externally reviewed** | `src/`, `.github/workflows/pages.yml`, `docs/screenshots/` |
| Front end | Plan conformance (`docs/FRONTEND_PLAN.md` v3.1), reviewed 2026-10-12 against screenshots | **done**: You/Germany zooms, statutory payslip (42 examples + 121 BMF rows exact), pots at true size with % composition and pro rata* on hover, transfers removed, borrowing segment, drawer, equalisation map, all-taxes table, time strip, DE/EN, mobile, no-JS, URL state. Round-2 fixes applied (label collisions, Germany ribbon order, mobile employee/employer consistency, trade-tax levy, "(DE)" markers) | `docs/screenshots/` |
| Front end | Wage-slider ticks: minimum wage* (40 h × 52 weeks), full-time median, average, 2× average | **done** (2026 earnings not published yet: ticks use 2025 and say so) | `data/de/citizen/wage-reference.json`, `src/ui/page.ts` |
| Front end | Household indirect-tax estimate (≈*) in the You flow: class from net ÷ 12*, dashed ≈ ribbons from net pay to Federation / Länder / municipalities, never added to the exact payslip; Shopping chip toggles it | **done** (estimate by household class, LWR 2024; excise lines are lower bounds per the file's caveats) | `data/de/citizen/household-indirect-taxes.json`, `src/data/model.ts` |
| Front end | Dark mode (own validated steps), texture mode / forced colours, axe + keyboard audit with a regression test | **done** (`npm run test:a11y`, in CI) | `src/styles.css`, `tests/browser/` |
| Front end | Non-expert comprehension test (does a first-time visitor get the "ah-ha"?) | **not done** | — |
| Front end | Pages deploy actually run | **not done** (work is on branch `data-layer-and-slide`; rounds 3–4 uncommitted at the time of writing) | `.github/workflows/pages.yml` |
| Data | `legal-allocation.json` lacks a structured trade-tax levy share; `data/README.md` header text still mentions removed legacy files; `build_berlin.py` still reads the legacy Berlin file; German-only sub-function labels (Länder, Berlin); 149 null federal function labels | **open** | `data/`, `scripts/research/` |

## Contestable items (must be marked `*` on the page)

- Any "net contribution" to the EU (Commission no longer publishes balances).
- "Bavaria pays Berlin" — equalisation is a pooled VAT calculation.
- Shopping-basket shares (prices are assumptions; per-unit taxes are exact).
- Berlin's 6 % real-estate transfer rate (Land law not in the fetched statutes).
- Average Zusatzbeitrag 2025 (2.5 %) and the 2025 RV rate continuation: official notices not fetched, marked secondary.
- The municipal 2024 product-area sum exceeds the published total by 58 Mio (0.016 %), kept as published; the Destatis 71211 before/after-distribution totals differ by 392 Mio (2024), unexplained in the metadata.
- The social-insurance "payroll view" (€529.3bn) is a proxy; the inter-system double count (≥ €46.0bn) is a lower bound; the per-day social spending net of inter-system flows (≈ €25.9) is approximate.
- Household indirect taxes are an estimate (`≈`, `*`): per-purpose VAT rates and assumed prices; the minimum-wage annual figure assumes 40 h × 52 weeks.
- Payslip: the average Zusatzbeitrag is a modelling assumption (the law uses the insurer's own rate); 2024/2025 tariff constants come from BMF Programmablaufpläne rather than the BGBl. text.
