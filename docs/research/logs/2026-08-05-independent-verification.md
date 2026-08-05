# Independent verification pass — 2026-08-05

Two independent AI verification runs reproduced the 2026-08-05 research claims directly from
official sources (fresh fetches, no reliance on the collector's narrative). This log records
verdicts, corrections, and the newly extracted all-Länder table now used by the interface.

## Numbers — all core claims CONFIRMED

- Destatis 71211-0001, total tax receipts before distribution 2024: **€947.706848bn** ✓
  (also read: 2023 €915.750389bn, 2025 €989.826850bn). The GENESIS SPA exposes a public,
  auth-free JSON endpoint: `https://genesis.destatis.de/genesis/api/rest/tables/{table}/data`
  — the "API needs auth" note applies only to the retired legacy `genesisWS/rest/2020` API.
- Effective 2024 VAT allocation, reproduced exactly from the BMF Abrechnung PDF (Anlage 1):
  Bund €145.334bn / 48.1010%; Länder €148.378868bn / 49.1088%; municipalities €8.430612bn /
  2.7903%; total incl. import VAT €302,143,338,590.25. (The December Monatsbericht table shows
  December only — the Abrechnung PDF is the authoritative annual source.)
- Berlin equalisation rows (Anlage 1): VAT base €6.526007bn (= €6.005256bn v.H. + €0.520751bn
  Festbetrag); FKA addition +€3.942990bn; fiscal strength 77.4%; municipal VAT €354.276m;
  135% city-state weighting (§9 (2)–(3) FAG) ✓.
- Berlin 2024 tax account: all rows and the €27.302326bn total reproduced exactly ✓.
- EU own resources 2024: €32.011bn = 5.463 + 5.448 + 19.722 + 1.378 ✓.
- Federal `rechnung_2024.xml`: exists (~2.2MB), `haushalt → einzelplan (25) → kapitel →
  titel (6,787)` with `fkt` codes and `ist` amounts; some Titel nest in `titelgruppe` and
  flexibilised blocks — parsers must recurse ✓.
- Berlin 2024 annual account PDF (Drucksache 19/2681, 88pp): function tables confirmed
  (Ausgaben nach Aufgabenbereichen from p. 79) — but the text layer is OCR-noisy; extraction
  needs table-aware parsing with cross-total validation.

## Corrections to the collection pass

1. **Trade-tax levy discrepancy RESOLVED — the premise was wrong.** Berlin's −€262.074m line is
   the FULL Gewerbesteuerumlage (multiplier 35 = 14.5 federal + 20.5 Land, **§6** GemFinRefG —
   the multipliers are not in §7). Official decomposition in the Abrechnung PDF: Land component
   +€153.501m is credited back to Berlin inside the FKA (line 7); federal component ≈€108.573m.
   14.5/410 = 3.5366% of gross ≈ €106.5m checks out; the ~2% residual vs 35% of same-year gross
   is quarterly-payment/prior-year settlement timing (§6 (6)–(7)). No city-state multiplier
   exists. The interface now draws the three-way split.
2. **Berlin supplementary grants:** not in the Abrechnung PDF. From the BMF April-2025
   Monatsbericht: allgemeine BEZ €1,797m; + SoBEZ politische Führung €59m = €1,856m. The
   earlier "≈€1.86bn" implicitly bundled both.
3. **"Provisional" marking** is stated in the accompanying BMF article ("Vorläufige
   Jahresrechnung 2024"), not printed in the Anlage-1 PDF itself.
4. **BKG attribution string** is "© BKG (Jahr des letzten Datenbezugs) dl-de/by-2-0" with the
   Datenquellen-PDF link — not "© GeoBasis-DE / BKG". Corrected in `data/geo/de-laender.json`.
5. **vg250_lan needs `gf=4`** (34 raw features incl. water bodies → 16 Länder).

## Licences (verified)

| Source | Licence | Redistribution |
|---|---|---|
| Destatis GENESIS | DL-DE-BY-2.0 ("Datenquelle: Statistisches Bundesamt (Destatis), Genesis-Online, [Datum]") | yes, with attribution |
| daten.berlin.de Doppelhaushalt | CC-BY (plan values only — "Soll") | yes, with attribution |
| berlin.de page content | all rights reserved | facts/figures only; no text/graphics reuse |
| BMF pages/PDFs | all rights reserved unless marked CC BY-ND 4.0; linking permitted | link, don't rehost |
| Berlin annual-account PDF | parliamentary Drucksache | cite "AGH Berlin, Drucksache 19/2681"; link, don't rehost |
| BKG VG250 | DL-DE-BY-2.0, attribution "© BKG (Jahr) dl-de/by-2-0" + Datenquellen link | yes, with attribution + change note |
| gesetze-im-internet.de | §5 UrhG amtliche Werke; deep links expressly permitted | yes (statute text) |

## New extraction — all-Länder 2024 equalisation table

Committed to `src/routes/equalisation.ts` (VAT base row 10.3, FKA row 15.10, allgemeine BEZ
from the April-2025 article; population shares available in the source if needed). Checksums:
VAT bases sum to €148,378.868m ✓; FKA nets to ±€18,653.957m ✓; allgemeine BEZ sum €8,178m ✓.
Not yet captured per Land: GStK-BEZ (€1,411m), doF-BEZ (€300m), SoBEZ Arbeitslosigkeit (€82m),
SoBEZ politische Führung (€642m).

## Remaining before publication-grade data

- Evidence snapshots + checksums for each observation (the fail-closed bundle format).
- Berlin function-actuals extraction from the OCR-noisy PDF, validated against totals.
- Federal XML ingestion with recursive Titel parsing.
- Per-Land municipal VAT keys and municipality-level figures (Regionalstatistik).
