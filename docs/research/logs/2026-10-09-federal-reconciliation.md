# Federal core budget: reconciling the Haushaltsrechnung XML to BMF's official Ist (2024, 2025)

## 2026-10-09 — bridge built, both years reconcile

**Build:** `.venv/bin/python -I scripts/research/build_federal.py` →
`data/de/federal/budget-2024.json`, `budget-2025.json`, `overview.json`;
extracts `research/extracts/bmf_monatsbericht/abschluss-2024-tabellen.csv`, `abschluss-2025-tabellen.csv`.

**Sources:** `research/raw/bundeshaushalt_rechnung/rechnung_2024.xml`, `rechnung_2025.xml` (Titel-level Ist;
attributes: `nr` = 5-digit Titelnummer whose first three digits are the Gruppierung, `fkt` = 3-digit Funktion,
`flexibilisiert`, `seite`; values as `wert="1.088.350,00"`, negatives with a trailing minus `16,43-`).
BMF Monatsbericht Jan 2025 (vorläufiger Abschluss 2024) and Jan 2026 (Abschluss Bundeshaushalt, KTF, SVIK 2025), cached.

### The 9.08 bn gap (2024)

The naive sum of all unique expenditure Titel is 474,753.73 Mio EUR; BMF's Ist is 465,670 Mio EUR. The gap is
exactly the footnote of every BMF expenditure table, read through the Gruppierungsplan:

| Mio EUR | 2024 | 2025 |
|---|---:|---:|
| XML, all expenditure Titel (deduplicated by Einzelplan/Kapitel/Titel; titelgruppe and flexibilised blocks included) | 474,753.728 | 626,215.519 |
| − annexed Wirtschaftspläne, Kapitel numbered `xx9y` (2025 only, 16 Kapitel) | 0 | 130,678.793 |
| = core budget gross | 474,753.728 | 495,536.726 |
| − Obergruppe 59 Tilgung (only Tit. 595 01 Kap. 3201, non-structural refunds of emergency credits) | 8,493.774 | 1,656.818 |
| − Obergruppe 91 Zuführungen an Rücklagen | 0 | 0 |
| − Obergruppe 96 Deckung eines kassenmäßigen Fehlbetrags | 0 | 0 |
| − Obergruppe 98 haushaltstechnische Verrechnungen (Tit. 981 § 61 BHO settlements, 982 pass-through) | 590.297 | 601.784 |
| = reconciled | 465,669.657 | 493,278.124 |
| BMF official Ist | 465,670 | 493,278 |
| residual | −0.343 | +0.124 |

Both residuals are inside BMF's rounding to Mio EUR (tolerance 0.5). The 2024 Tit. 595 01 figure (8,493.77) is the
8,494 Mio EUR that BMF's Tabelle 1 and Schuldenbremse row 8a cite.

### Hauptfunktionen vs BMF "Ausgaben nach Aufgabenbereichen" (Tabelle 6 for 2024, Tabelle 7 for 2025)

All nine Hauptfunktionen 0–8 match within rounding in both years (the federal Funktionenplan has no HF 9). Beyond
that, 41 two- and three-digit codes correspond one-to-one to a BMF sub-row (e.g. 021 Auslandsvertretungen 1,146;
221 Allgemeine Rentenversicherung 107,519; 251 Bürgergeld 29,151; 721 Bundesautobahnen 6,705) and match within
1 Mio EUR; two BMF rows are sums of codes (75+77+79, 81+82) and match too. Interest (Obergruppe 57) equals BMF's
Zinsausgaben row: 34,223 (2024) and 29,873 (2025). The build fails on any mismatch.

### Surprises

- **2025 XML contains the annexed Wirtschaftspläne.** `rechnung_2025.xml` carries Kapitel 1491 Sondervermögen
  Bundeswehr (19,498 Mio), 6092 KTF (37,417), 6093 SVIK (23,992), 6090 EU own resources as a gross pass-through
  (33,410; in the core budget they are a deduction from tax revenue), 0690/0691 Versorgungsrücklage/-fonds,
  1090 EGFL agricultural payments, 1790/1791, 6091, 6095, 6096, 6098. 14 of the 16 are self-balancing
  (Ausgaben = Einnahmen). Kapitel 1091 and 1092 (BMEL agencies, 163 and 181 Mio) are not self-balancing but
  follow the same numbering rule; the data settles it: HF 5 only matches BMF (1,258) when they are excluded
  (1,602 otherwise), and the total would miss by 344 Mio. `rechnung_2024.xml` has no such Kapitel.
- **Kapitel have no `<text>`** in either file; only Einzelpläne and Titel are labelled.
- **Negative Ist values:** 27 Titel in 2024 (−323 Mio in total, largest −15.9 Mio "Zuschussprogramm für
  energieintensive Unternehmen") and 31 in 2025 (−171 Mio); refunds booked against the Titel, kept as published.
- **Four empty `<titel/>` elements** without number or values in the 2024 file; skipped.
- **Every Titel has a 3-digit `fkt`**; no Titel without function code.
- The Jan 2026 article restates four 2024 figures by a few Mio (Einnahmen 440,642 vs 440,634; Steuern 374,989
  vs 374,981; Finanzierungssaldo −25,028 vs −25,035; NKA 33,320 vs 33,328). The Jan 2025 values are kept as
  primary with the revision recorded next to them in `overview.json`.
- Sondervermögen Bundeswehr: no Ist figure in either article; `overview.json` carries the XML Kapitel 1491 sum for
  2025 (labelled as such) and null for 2023/2024. KTF 2023 values are derived from 2024 minus the stated change.

### Open issues

- Funktionenplan labels exist only for codes that have a BMF table row (19 of 52 two-digit, 22 of 138
  three-digit codes); the rest carry `label: null`. A Funktionenplan source (BMF Haushaltssystematik) would
  complete them; no machine-readable file was found on bundeshaushalt.de (probed, 404).
- Figures are the provisional closing (vorläufiger Abschluss); the final Haushaltsrechnung may differ slightly.
