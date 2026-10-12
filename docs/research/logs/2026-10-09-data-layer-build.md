# Run log — data-layer build, 2026-10-09

**Collector:** lead researcher (this run). **Verifiers:** review A (re-derivation from raw files),
topic logs by the extraction agents (federal, equalisation, social insurance, payslip). Separate
logs under this folder with the same date.

## Reference-year decision

2024 is the hero year: Eurostat COFOG for Germany reaches 2024 (provisional, updated 2026-09-16);
Destatis taxes reach 2025; federal `rechnung_2025.xml`, BMF Abrechnung 2025, GKV KJ1 2025, SPV
2025, BA 2025 and Berlin tax receipts 2025 exist and form the 2025 freshness layer. Länder by
function: 2022 (newest Destatis edition); municipalities by product area: 2024. Payslip: statute
2024/2025/2026. Documented in `research/README.md`.

## Sources collected

116+ files from Destatis GENESIS (public JSON endpoint), Destatis Statistische Berichte (xlsx),
bundeshaushalt.de (XML 2023-2025), BMF Monatsbericht (8 articles) and Abrechnung PDFs (2024, 2025),
Eurostat (5 datasets), Berlin Senatsverwaltung für Finanzen (CSV, CC BY), Abgeordnetenhaus Berlin
(Drucksache 19/2681), DRV, BMG (KJ1 2024/2025, SPV 2024/2025), BA (2024/2025), BMAS, European
Commission (EU budget xlsx), gesetze-im-internet.de (30+ sections), BMF Programmablaufpläne and
Prüftabellen, Bundesanzeiger. All in `research/raw/MANIFEST.json` with SHA-256, licence and
redistribution decision; non-redistributable files in the git-ignored cache with committed extracts.

## Reviewer leads (2026-10-09 review) — verdicts

| Lead | Verdict | Corrected figure |
|---|---|---|
| A1 no raw material | fixed | manifest + raw/cache + extracts |
| A2 data inside code | fixed at the data layer | all figures of `src/routes/data.ts`/`equalisation.ts` exist in `data/` (equalisation cell-for-cell); the front end still has to switch |
| A3 validator obsolete | documented, not fixed | `npm run validate:data` still fails (v1 schema); replacement belongs to the front-end rewiring; `npm test` passes (50) |
| A4 contradictory docs | fixed | README, PLAN non-goal, METHODOLOGY/DATA_SCHEMA notes, RESEARCH_LEARNINGS §16, SOURCE_CATALOG and DATA_LICENSES regenerated, PRIOR_ART written |
| B1 federal total 474.75 vs 465.7 | **confirmed** | gross XML 474,753.7 − 8,493.8 (Tit. 595 01 Kap. 3201) − 590.3 (OGr 98) = 465,669.7 vs BMF 465,670 Mio |
| B2 social double counting | **confirmed** | DRV 2024 contributions 305.3 bn include 18.1 Bund (child-raising), 5.0 BA, 4.4 KV, 4.2 PV; GKV includes KVdR paid by DRV; payer split in `accounts.json` |
| B3 land_total_tax_meur undefined | **resolved** | = Destatis STEUERNVL10 (Land receipts after distribution), Berlin 2024 23,383.392 Mio; Berlin's own account 27,302 Mio adds the municipal role |
| B4 BEZ incomplete | **fixed** | all five BEZ types per Land, 2024 total 10,613 Mio (8,178 + 1,411 + 300 + 82 + 642), 2025 11,297 Mio |
| B5 federal grants 0 unsourced | addressed | sourced lines in the social extraction log |
| C1 whole state | done | COFOG S13 2024 2,139,717 Mio |
| C2 amount per tax | done | 56 positions × 27 years |
| C3 own bill | done | payslip engine validated against 121 BMF Prüftabellen rows; purchases per product |
| C4 time | done | 1991/1995/1999–2025 series |
| C5 debt, deficit, interest, special funds | done | debt 2,693.8 bn (2024), interest 45.8 bn, deficit −115.3 bn; KTF/SVIK/Bundeswehr fund in federal overview |
| C6 2024 Länder/municipal spending | partly | municipalities 2024 by product area; Länder by function 2022; cash by level 2024/2025 |
| C7 EU round trip | done | 2021-2025 |
| C8 German labels | done | every row |
| C9 rationalized constructs | done | `RATIONALIZATION.md` |
| C10 prior art | done | `PRIOR_ART.md` |

## Discrepancies kept as published (not forced)

- Destatis 71211 before vs after distribution totals differ (2024: 392 Mio).
- Destatis BEZ cash vs BMF Ausgleichsjahr attribution (2024: −42 Mio; 2025: +484 Mio).
- Municipal 2024 product areas sum 58 Mio above the published total.
- Berlin CSV total 27,302,328 vs HTML page total 27,302,326 T EUR (row rounding).
- Cash Bereinigte Ausgaben (2,082 bn) vs ESA TE (2,140 bn): different bases, never mixed.
