# Equalisation extraction — 2026-10-09

Topic: Umsatzsteuerverteilung, Finanzkraftausgleich (FKA) and Bundesergänzungszuweisungen (BEZ),
Ausgleichsjahre 2024 and 2025, all 16 Länder.

Script: `scripts/research/build_equalisation.py` (run with `.venv/bin/python -I`).
Outputs: `research/extracts/bmf_abrechnung_finanzausgleich/anlage1-{2024,2025}.csv`,
`research/extracts/bmf_monatsbericht/bez-{2024,2025}.csv`, `data/de/equalisation/{2024,2025}.json`,
`data/de/equalisation/laender-meta.json`.

## What was parsed

**BMF Abrechnung, Anlage 1** (`research/cache/bmf_abrechnung_finanzausgleich/abrechnung-ausgleichsjahr-*.pdf`).
Both files are 3 landscape pages with one wide table (16 Länder in the order NW BY BW NI HE SN RP ST
SH TH BB MV SL BE HH HB + Insgesamt, unit 1.000 Euro). The text layer is intact; no OCR. Words are
taken with `pdfplumber` and assigned to columns by their right edge (numbers are right-aligned; the
17 column anchors are taken from row 1 and every value must sit within 6 pt of an anchor, otherwise
the build stops). Row numbers are read from the first token (`10.3.`, `6a.`), multi-line labels are
joined, dash sub-rows of 12.1 become `12.1a`/`12.1b`, and the `nachrichtlich` rows are kept with
`kind=memo` and the parent row number. Every numbered row of Anlage 1 was parsed: 64 value rows in
2024, 65 in 2025 (plus section headers without values, 11 memo rows and the 3 amounts of footnote 4).
Rows with fewer than 17 values are genuine: 12.3 has no Insgesamt, the memo rows `Aufkommen
Grundsteuer A/B, Gewerbesteuer` only have an Insgesamt, `Einwohnerwertung` has no Insgesamt.
The `±` prefix of the Insgesamt cell (rows 2.2, 4.2, 6.2, 15.9, 15.10) is recorded in
`insgesamt_sign`; the value is the absolute volume.

Only Anlage 1 is in the files: despite the source title ("Anlage 1 and following") neither PDF
contains an Anlage 2 (the BEZ calculation), which is why the BEZ come from the Monatsbericht.

**BMF Monatsbericht** (`research/cache/bmf_monatsbericht/2025-04-…-2024.html`, `2026-04-…-2025.html`).
All three HTML tables are extracted cell by cell (Tabelle 1 UStV/FKA, Tabelle 2 BEZ, Tabelle 3 SoBEZ),
each split in two half-tables (NW…SH / TH…HB + Insgesamt). Values are in Mio EUR (rounded) or percent.

## Checks that run in the build (all pass, 328 assertions)

- Within Anlage 1, per Land: 10.1 + 10.2 = 10.3; 15.1 + 15.2 = 15.3; 15.6 + 15.7 = 15.8;
  15.3 − 15.8 = 15.9; 15.10 = −63 % × 15.9; 15.4 = 15.3 / 15.8; row 13 = row 15.1 (±1 thousand EUR).
- Länder VAT shares (10.3) sum to the pool total; FKA (15.10) sums to zero (2024: 0; 2025: 0) and
  its positive and negative halves both equal the printed ± volume; population sums exactly.
- Footnote 4: domestic + import VAT = total VAT; Bund share derived as total − Länder − Gemeinden
  equals Destatis 71211-0002 `STEUERNVB40` to the thousand (2024: 145,333,858,590 vs
  145,333,859,000; 2025: 149,845,852,943 vs 149,845,853,000).
- Monatsbericht Tabelle 1 FKA (Mio) equals Anlage 1 row 15.10 rounded, for all Länder and years;
  "nach FKA" percentage re-derived from rows 15.3/15.8/15.10 agrees within 0.05 pp.
- Each BEZ column sums to its published Insgesamt within rounding (0.5 Mio per non-zero term).
- 2024 pins reproduce exactly: pool 148,378.868 Mio; Berlin VAT 6,526.007; Berlin FKA +3,942.990;
  Bayern FKA −9,773.933; NW VAT 32,022.578; FKA volume ±18,653.957; Berlin population 3,672,983;
  VAT total 302,143,338,590.25 EUR with Bund 145,334 / Länder 148,379 / Gemeinden 8,431 Mio;
  BEZ totals 8,178 / 1,411 / 300 / 82 / 642 Mio. The hard-coded table in
  `src/routes/equalisation.ts` matches the extract cell for cell.

## Headline numbers

| | 2024 | 2025 |
|---|---|---|
| VAT incl. import VAT (EUR) | 302,143,338,590.25 | 310,205,837,943.42 |
| Länder share (row 10.3) | 148,378.868 Mio | 151,520.450 Mio |
| Gemeinden share (row 14.5) | 8,430.612 Mio | 8,839.535 Mio |
| Bund share (derived) | 145,333.859 Mio | 149,845.853 Mio |
| Effective split Bund / Länder / Gemeinden | 48.1 / 49.1 / 2.8 % | 48.3 / 48.8 / 2.8 % |
| FKA volume (row 15.10 ±) | 18,653.957 Mio | 19,999.767 Mio |
| allg. BEZ / GStK / doF | 8,178 / 1,411 / 300 Mio | 8,784 / 1,415 / 327 Mio |
| SoBEZ unemployment / political leadership | 82 / 642 Mio | 82 / 689 Mio |
| All BEZ | 10,613 Mio | 11,297 Mio |
| Population 30.06. | 83,510,950 | 83,491,249 |

Berlin 2025: VAT share 6,700.746 Mio (6,199.332 population part + 501.414 Festbetrag), FKA
+4,223.160 Mio, allg. BEZ 1,926 Mio + SoBEZ politische Führung 63 Mio = 1,989 Mio; fiscal strength
77.0 % before FKA, 91.5 % after FKA, 98.1 % after BEZ, 98.3 % after SoBEZ.

## 2025 vs 2024 layout differences

Anlage 1:
- Same table template and column positions; the 2025 PDF is smaller (124 KB vs 274 KB) only
  because of its font embedding, not because of content.
- New row `6a. Mindeststeuer` (global minimum tax), all zeros in 2025.
- Page breaks moved: 2024 p1 rows 1–9, p2 10–14.10, p3 15; 2025 p1 rows 1–7, p2 8–13, p3 14–15.
- Printing quirks kept as printed: 2025 row 2.5 reads "Erstatttung"; the 12.1 sub-rows are
  "-im aktuellen Jahr" (no space) in 2025 vs "- im aktuellen Jahr" in 2024.
- 2025 row 3.3 "abzügl. Erstattungen des BZSt" carries positive values (33, 33, 25 …) and row 3.4
  equals 3.1 + 3.2 + 3.3 with that sign. Stored as printed; not interpreted.
- Footnote 2 (Zerlegung window) shifts to 01.10.2024–30.09.2025.

Monatsbericht tables:
- 2024 prints "-" for Länder without a grant; 2025 prints "0". Both are stored as 0 with the raw
  text in the `raw` column.
- 2025 Tabelle 1 prints the FKA total as "±20.000" (2024: "18.654"); the ± is kept in `value`.
- 2024 second half-table hyphenates "Finanzkraft-ausgleich"; 2025 Tabelle 3 second half-table has
  "überdurchschnittlicher hoher". Both labels are normalised to the first-half spelling so the row
  can be addressed by one key (the HTML itself is unchanged in the cache).
- The 2025 captions carry a trailing "Tabelle N" cell inside the table; ignored.

## Destatis (71211-0102, cash after distribution) vs BMF (attribution to the Ausgleichsjahr)

| Item | Destatis position | 2024 | 2025 |
|---|---|---|---|
| Land share of VAT (row 10.3) | STEUERNVL40 | identical for all 16 Länder and the total | identical |
| Finanzkraftausgleich (row 15.10) | STEUERNVL71 | identical for all 16 Länder (Destatis sum −1 thousand = rounding) | identical |
| All BEZ incl. SoBEZ | STEUERNVL66 | Destatis 10,570.6 vs BMF 10,613 Mio (−42.4) | Destatis 11,781.4 vs BMF 11,297 Mio (+484.4) |
| Municipal VAT | STEUERNVG40 | Destatis 8,328.2 vs BMF row 14.5 8,430.6 Mio (−102.4) | 8,668.3 vs 8,839.5 Mio (−171.2) |

Per-Land BEZ differences (Destatis − BMF, Mio EUR): 2024 NI +268.7, NW −184.1, BB −119.3, RP −68.1,
HB +47.8, ST +34.9, SL −20.9, SN +15.9, TH +15.4, MV −13.4, SH −11.5, BE −7.9; 2025 NW +227.5,
NI −139.7, SN +87.7, RP +81.8, BB +76.3, TH +55.4, SL +45.6, ST +26.2, SH +16.3, BE −16.3, HB +14.1,
MV +9.4. Länder that receive no BEZ (BW, BY, HE, HH) are 0 in both.

Explanation (documented, not forced): Destatis books what was paid in cash during the calendar year,
which includes the final settlement of the previous Ausgleichsjahr and the monthly advance payments
for the current one; BMF's tables state the amount attributed to the Ausgleichsjahr on the basis of
the vorläufige Jahresrechnung, rounded to Mio EUR. The signs partly reverse between 2024 and 2025
(NW, NI, BB), which is what a timing difference looks like. VAT share and FKA agree to the EUR
thousand because Destatis takes those two positions from the same BMF Abrechnung. For municipal VAT,
Anlage 1 row 14.5 is the Gemeindeanteil as computed in the FKA (§ 1 FAG percentage + Festbetrag on
the settlement basis), whereas Destatis reports cash received by the municipalities; they are
different measures of the same share. The data files carry both numbers in `destatis_comparison`.

## Not parsed / open

- The prose of the Monatsbericht articles (e.g. "Umverteilungsvolumen 18,7 Mrd.", the 48.1/49.1/2.8 %
  split) was used only as a manual cross-check; all values in the data files come from the tables and
  Anlage 1. The effective split derived in the build (48.10/49.11/2.79 % for 2024, 48.31/48.85/2.85 %
  for 2025) matches the article's rounded figures.
- `laender-meta.json`: the "municipal shares flow into the Land budget" flag (Berlin, Hamburg yes;
  Bremen no) rests on § 7 GemFinRefG, which is not among the retrieved statutes (only § 6 is). The
  flag is marked `unverified_in_repo` until the section is fetched.
- The equalisation files are not yet listed in `data/index.json` and there is no `build_all.py` /
  `check.py` yet to call `build_equalisation.py`; both are outside this topic's paths.
- BEZ are only available rounded to Mio EUR (no Anlage 2 in the PDFs); per-resident BEZ values
  inherit that rounding.
