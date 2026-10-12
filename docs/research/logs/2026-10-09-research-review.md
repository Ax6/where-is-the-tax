# Research review — 2026-10-09

A review of the research and data as of commit `83ae8f9`, against the goals in `CLAUDE.md`. These
are leads to check, not conclusions. Verify each one before acting on it.

## A. Integrity and infrastructure

| # | Problem | Evidence |
|---|---|---|
| A1 | **No raw material stored locally.** `research/evidence/` holds only a README. Exactly one source checksum exists (federal XML). No number can be reproduced offline. | `find research` · `grep -r sha256 data` |
| A2 | **Data lives inside code.** `src/routes/data.ts` (81 KB) and `src/routes/equalisation.ts` hard-code figures, narrative and sources. The front end should read rationalized data files, not own them. | `src/routes/*.ts` |
| A3 | **The validator checks an obsolete schema.** `validator.ts`/`DATA_SCHEMA.md` describe the old ESA `revenue.csv`/`expenditure.csv` bundle. `npm run validate:data` fails on the real data (`de/2021`, `de/2024` unindexed), so CI is red. `data/index.json` still says no dataset exists. | `npm run validate:data` |
| A4 | **Docs contradict each other.** README says "awaiting independent verification" while the banner says the figures were reproduced. `RESEARCH_LEARNINGS` §16 says GENESIS needs auth, but the verification log found a public JSON endpoint. `METHODOLOGY.md` is superseded. `PLAN.md` lists a German UI as a non-goal, but `CLAUDE.md` requires it for German speakers. `PRIOR_ART.md` is empty. | the files named |

## B. Correctness flags

| # | Problem | Evidence |
|---|---|---|
| B1 | **The federal total doesn't reconcile.** The page shows federal spending of €474.75bn (sum of XML Titel). BMF's official 2024 Ist-Ausgaben are about **€465.7bn** (Monatsbericht Jan 2025, "Vorläufiger Abschluss Bundeshaushalt 2024"). That leaves a ~€9bn gap, likely double counting from flexibilised or Titelgruppe nesting, or internal settlements. | `data/de/2024/accounts/federal-functions.json` |
| B2 | **The social route probably double counts.** It sums €706bn of contributions (305.3+297.0+65.4+38.1) and labels it "Payroll deductions". GKV contributions include contributions paid by other public bodies: DRV for pensioners (KVdR ~€27bn), BA for the unemployed, and the federal budget for Bürgergeld recipients. Separate payroll deductions from contributions paid by public bodies. | `social-insurance.json`, social route |
| B3 | **`land_total_tax_meur` is undefined.** Berlin shows €23,383m. Berlin's own tax account gives €27,302m in total (Land part €20,754m). Neither matches, and nothing defines the field. | `taxes-by-land.json` |
| B4 | **Supplementary grants are incomplete.** Only the allgemeine BEZ are captured per Land. GStK-BEZ (€1,411m), doF-BEZ (€300m) and both SoBEZ are missing, so the per-Land receipts are understated. | verification log |
| B5 | **Federal grants of 0 need sources.** LTC and unemployment show 0. That is plausible for 2024, but no source is cited for it. | `social-insurance.json` |

## C. Missing pieces for the goal ("where do a German citizen's taxes go, at a glance")

Today's research answers *who legally receives a tax*. It barely answers *where the money ends up*
or *what it means for me*.

| # | Missing | Why it matters |
|---|---|---|
| C1 | **A whole-state picture.** Total public revenue (taxes, social contributions, other) against consolidated general-government spending by function (COFOG, Destatis/Eurostat `gov_10a_exp`, 2024 and ideally 2025). It is consolidated, so it avoids double counting. | This is the only honest "Germany" answer to "where does it go". The "Germany (all)" view currently shows only the federal core budget (~¼ of the state). |
| C2 | **National amount per named tax** (71211-0001, every tax) and amounts per recipient after distribution (71211-0002: EU, Bund, Länder, Gemeinden). | The "All taxes" list has legal shares but no euros. |
| C3 | **The citizen's own bill.** A payslip at a given gross wage using statutory formulas (§32a EStG tariff, Soli thresholds, contribution rates and ceilings for the year), plus the indirect taxes a typical household pays (Destatis EVS/LWR spending × tax rates, or an official estimate). Add per-resident and per-day framings. | This is the "ah-ha" entry point. The formulas are law, so the results are exact and need no sample. |
| C4 | **Time.** Revenue and spending over years (e.g. 1991→2025). It is 2026-10 now, so 2025 is probably coherent: 71211 2025, `rechnung_2025.xml`, BMF equalisation 2025 (provisional), possibly the Berlin 2025 account. Re-decide the reference year. | Context and freshness |
| C5 | **Debt, deficit, interest and special funds.** Net borrowing, interest cost, and the Sondervermögen (Bundeswehr, KTF, Infrastruktur 2025…), which sit outside the core budget. | Taxes don't pay for everything. Large sums are invisible today. |
| C6 | **2024 spending for Länder and municipalities** (Destatis quarterly/annual cash statistics 71137 / 71147 or similar). Only 2021 is comparable today. | The "your Land" panel mixes 2021 with 2024 |
| C7 | **The EU round trip.** Germany's payments, EU spending in Germany, and the operating balance (EU financial report). | Completes the EU route |
| C8 | **German labels for everything** shown to users. | `CLAUDE.md` audience |
| C9 | **Rationalized constructs.** No document yet turns the numbers into simple, verified framings ("of every €100…", per person per day, per payslip). | `CLAUDE.md` rationalization step |
| C10 | **Prior art** (bundeshaushalt.de visualisation, OffenerHaushalt, Where Does My Money Go, USAFacts, OECD Taxing Wages). Contestable sources (e.g. Bund der Steuerzahler "Steuerzahlergedenktag") must be marked as such if used. | Avoid reinventing; mark contestable claims |
