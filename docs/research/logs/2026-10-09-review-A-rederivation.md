# Review A — independent re-derivation from the raw files

**Date:** 2026-10-09. Reviewer did not build the data layer. Every value below was recomputed
directly from `research/raw/` or `research/cache/` (own scripts, `python -I`), then compared to
`data/` and to `docs/research/RATIONALIZATION.md`. Nothing under `data/`, `scripts/`, `research/`
or `src/` was edited.

Conventions: "my value" is what the raw file gives; "data/ value" is what the built file says.
Units as stated per row. Verdict: match / mismatch / cannot verify.

## 1. Destatis 71211-0001 (tax receipts before distribution, EUR thousand)

| What | Source coordinates | My value | data/ value (`taxes/by-tax.json`) | Verdict |
|---|---|---:|---:|---|
| Total 2024 (STEUERNVINS10) | `71211-0001.json` dim START1×JAHR, status `e` | 947,706,848 | 947,706,848,000 EUR, final | match |
| Total 2025 | same | 989,826,850 | 989,826,850,000 EUR, final | match |
| Wage tax 2024 (STEUERARTG10) | same | 248,920,397 → 26.27 % | 248,920,397,000; RATIONALIZATION §3: 26.3 | match |
| VAT domestic 2024 (STEUERARTG60) | same | 228,650,545 → 24.13 % | 228,650,545,000; §3: 24.1 | match |
| Corporation tax 2024 (STEUERARTG50) | same | 39,757,560 → 4.20 % | 39,757,560,000; §3: 4.2 | match |
| Per resident per day (§3) | total / 83,577,140 / 366 | €11,339 / yr, €30.98 / day | §3: €11,339, €30.98 | match |

GENESIS status for every 2024/2025 cell used is `e` (final); `by-tax.json` labels them `final`. Correct.

## 2. Destatis 71211-0002 (after distribution, EUR thousand)

| What | Coordinates | My value | data/ value (`taxes/by-recipient.json`) | Verdict |
|---|---|---:|---:|---|
| EU own resources 2024 (STEUERNVEU10) | `71211-0002.json` STAT10×JAHR | 32,010,995 → 3.38 % | 32,010,995,000; §4: 3.4 | match |
| Bund 2024 (STEUERNVB10) | same | 374,948,728 → 39.58 % | 374,948,728,000; §4: 39.6 | match |
| Länder 2024 (STEUERNVL10) | same | 394,836,075 → 41.68 % | 394,836,075,000; §4: 41.7 | match |
| Gemeinden 2024 (STEUERNVK10) | same | 145,518,657 → 15.36 % | 145,518,657,000; §4: 15.4 | match |
| Sum of the four vs STEUERNVINS10 (0002) | same | 947,314,455 = 947,314,455 (diff 0; 2025 diff −1) | 947,314,455,000 | match |
| 0002 total vs 0001 total | both files | 947,314,455 vs 947,706,848 → −392,393 | hierarchy_note states both; §4 calls it "a Destatis timing feature" | cannot verify (see F4) |

## 3. Eurostat (JSON-stat 2.0, MIO_EUR)

| What | Coordinates | My value | data/ value | Verdict |
|---|---|---:|---:|---|
| S13 TE TOTAL 2024 | `gov_10a_exp_DE.json`, status | 2,139,717 **p** | `cofog.json` 2,139,717 provisional | match |
| GF10 / GF07 / GF01 / GF09 2024 | same, all `p` | 883,179 / 329,254 / 277,890 / 194,584 | same in `cofog.json`; §1 shares 41.3 / 15.4 / 13.0 / 9.1 | match |
| Sum GF01..GF10 vs TOTAL | same | 2,139,717 = 2,139,717 | — | match |
| € per resident per day (§1) | TOTAL×1e6 / 83,577,140 / 366 | 69.95 (social 28.87, health 10.76, GPS 9.08, econ 7.67, edu 6.36, order 2.31, defence 1.92, culture 1.50, env 0.80, housing 0.67) | §1 identical | match |
| TR / TE / B9 / D61REC 2024 | `gov_10a_main_DE.json`, **no status flag** | 2,024,422 / 2,139,717 / −115,295 / 756,551 | `aggregates.json` identical but labelled **final** | match (value) / mismatch (status, see F2) |
| Taxes = D2REC+D5REC+D91REC | same | 443,779+552,833+9,991 = 1,006,603 → 49.7 % of TR | §2: 49.7 | match |
| Other revenue | TR − taxes − D61REC | 261,268 → 12.9 % | §2: 261,268, 12.9 | match |
| GD 2024 | `gov_10dd_edpt1_DE.json` | 2,693,827.2 → €32,232 / resident | §2 identical | match |
| D41PAY 2024 | both files | 45,828 → €548 / resident | §2 identical | match |
| Population 2024-12-31 | `12411-0001.json` STAG, status `e` | 83,577,140 | `population.json` 83,577,140 | match |

## 4. Federal budget XML (`rechnung_2024.xml`, EUR)

Parsing note: 5,573 expenditure `titel` elements (`ein-aus-art` = ausgaben / flex-ausgaben), keyed by
epl/kap/nr; **no duplicate keys** (so dedup is a no-op; titelgruppe nesting does not double count);
4 empty `titel` elements (no `nr`, no `ist`); trailing-minus values (`16.43-`) handled.

| What | Coordinates | My value (Mio EUR) | data/ value (`federal/budget-2024.json`) | Verdict |
|---|---|---:|---:|---|
| Gross sum of all expenditure Ist | all expenditure titel | 474,753.7276 | xml_gross_total 474,753,727,609.58 | match |
| Kap 3201 Tit 595 01 | epl 32 kap 01 nr 59501, fkt 830 | 8,493.7739 | bridge OG59 8,493,773,869.71 | match |
| Obergruppe 98x sum | nr starts with 98 | 590.2966 | bridge OG98 590.3 | match |
| Gross − 595 01 − 98x | — | 465,669.657 → residual **−0.343** vs 465,670 (BMF Tab. 1 "465,7 Mrd") | bridge_result −342,824 EUR, ok | match (within 0.5) |
| Hauptfunktion 2 (official basis) | fkt first digit 2 | 222,749.5 → 47.8 % | 222,749.5; §5 222.7 / 47.8 | match |
| HF 0 / 8 / 7 / 1 / 6 / 3 / 4 / 5 | same | 113,647.0 / 42,952.0 / 36,379.9 / 29,842.2 / 8,447.0 / 6,120.7 / 4,084.1 / 1,447.3 | identical; §5 identical | match |
| Interest OG 57 | nr starts with 57 | 34,223.0 | key_items.interest 34,223.0; §5 "€34.2bn" | match |
| Epl 11 Kap 1102 **Tit 636 8x** | nr 63681–63685 | **107,420.46** (44,849.3 + 12,097.9 + 30,835.4 + 18,143.4 + 1,494.4) | key_items.pension 107,518.68, label "Tit. 636 8x" | **mismatch (label)** |
| Epl 11 Kap 1102 **Funktion 221** | fkt 221 in 1102 | 107,518.68 (adds 636 14, 636 02, 636 06, 636 04, 636 03 = 98.2) | 107,518.68 | match |
| BMF Steuerfinanzierungsquote / NKA | cached HTML, text | "80,5 Prozent"; NKA "33,3 Mrd. Euro" | §5: 80.5 %, €33.3bn | match |

## 5. BMF Abrechnung Ausgleichsjahr 2024 (PDF, EUR thousand, pdfplumber)

| What | Coordinates | My value | data/ value (`equalisation/2024.json`) | Verdict |
|---|---|---:|---:|---|
| Berlin row 10.3 (VAT share total) | Anlage 1 p. 2, row 10.3, col BE | 6,526,007 | vat_share.total 6,526,007,000; §6 €6,526m | match |
| Berlin row 15.10 (FKA) | p. 3, row 15.10, col BE | +3,942,990 | fka.adjustment 3,942,990,000; §6 +€3,943m | match |
| Bayern row 15.10 | p. 3, col BY | −9,773,933 | −9,773,933,000; §6 −€9,774m | match |
| Länder total row 10.3 | p. 2, row 10.3, Insgesamt | 148,378,868 | totals.vat.laender 148,378,868,000 | match |
| Berlin "63 % of the gap" (§6) | rows 15.3, 15.8: (27,679,477 − 21,420,763) × 0.63 | 3,942,990 (exact) | — | match |
| Berlin 77.4 % before FKA | row 15.4 (via data file) | 21,420,763 / 27,679,477 = 77.39 % | 77.4 | match |
| Per resident (§6) | 3,942,990 / 3,672,983; 1,856,000 / 3,672,983 | €1,073.5 and €505.3 | §6 €1,073 / €505 | match |
| Footnote 4 VAT totals | p. 3 fn 4 | 302,143,338,590.25 = 228,650,545,343.06 + 73,492,793,247.19 | totals.vat identical; agrees with 71211-0001 G60 + G70 | match |

## 6. Berlin tax receipts CSV (`steuereinnahmen_12_2024.csv`, latin-1, T EUR)

| What | Coordinates | My value (T EUR) | data/ value (`berlin/tax-receipts.json`) | Verdict |
|---|---|---:|---:|---|
| Landesanteil an den Gemeinschaftsteuern | col 4 rows 2–9 | 19,308,385 | 19,308,385,000 | match |
| Landessteuern | rows 10–15 | 1,445,364 | 1,445,364,000 | match |
| Gemeindesteuern (incl. −262,074 levy) | rows 16–22 | 3,770,265 | 3,770,265,000 | match |
| Gemeindeanteile an Gemeinschaftsteuern | rows 23–25 | 2,778,314 | 2,778,314,000 | match |
| Grand total | sum | 27,302,328 | 27,302,328,000; §6 €27,302m | match |

## 7. EU budget workbook, sheet `2024`, column DE (Mio EUR)

| What | Coordinates | My value | §7 / `eu/round-trip.json` | Verdict |
|---|---|---:|---:|---|
| TOTAL EXPENDITURE | row 142 (1-based), col DE | 12,619.81 | 12,620 | match |
| TOTAL NGEU | row 159 | 15,221.67 | 15,222 | match |
| TOTAL Own resources | row 171 | 31,381.23 (customs 4,021.79; VAT 5,439.90; GNI 22,619.55; reduction −2,077.58; plastics 1,377.58) | 31,381 and components | match |
| Per resident | / 83,577,140 | pays €375.5, receives €151.0 (+€182.1) | §7 375 / 151 / 182 | match |

Note: the sheet also carries "TOTAL Balances and adjustments" DE = +33.4 (not in the 31,381);
Destatis cash EU own resources 2024 = 32,011 (check 2). Both are in the data file's notes; §7 shows only the Commission figure. Fine, as long as the two are never mixed in one sum.

## 8. Destatis 71717 municipalities 2024 (xlsx, sheet `csv-71717-b01`, Mio EUR)

| What | Coordinates | My value | data/ value (`municipal/functions-2024.json`) | Verdict |
|---|---|---:|---:|---|
| 2024 Insgesamt (bereinigte Ausgaben) | row 2 | 365,315 (layout sheet 71717-b01: 365,314.9; table 38 in T EUR: 365,314,838) | 365,315 | match |
| Six product areas 2024 | rows 16, 30, 44, 58, 72, 86 | 76,399 + 40,294 + 154,718 + 12,616 + 67,678 + 13,668 = **365,373** | identical items; residual stored as 58.0 | match (residual present) |
| Residual explanation | whole workbook | **Not explained anywhere.** CSV sheets carry no footnotes ("Fußnoten … sind in den CSV-Tabellen nicht enthalten"); the layout sheet 71717-b01 has no footnote; `Informationen_zur_Statistik` only says the Bereinigung of same-level payments is done "global bei den Ausgabe- und Einnahmesummen", not per product area (§ 5.2), which would explain a total below the sum of areas. Product 10500 "Steuerausgleiche" (6,070.7 Mio) is included in the total (table 38 header "Einschl. Steuerausgleiche"), so it is not the residual. | — | cannot verify (document the §5.2 explanation as a hypothesis, marked `*`) |

Label note: the layout table 71717-01 header calls the second area "Kultur und Wissenschaft" while the CSV sheet and the data file call it "Schule und Kultur". Same column, same numbers; the CSV wording is the one the file uses.

## 9. Statutes and purchase-tax arithmetic

| What | Coordinates | My finding | data/ value | Verdict |
|---|---|---|---|---|
| Quote Art. 106 (3) GG "Am Aufkommen der Einkommensteuer und der Körperschaftsteuer sind der Bund und die Länder je zur Hälfte beteiligt" | `gg_art_106.html` | present verbatim | `legal-allocation.json` G10/G50 | match |
| Quote § 6 (3) GemFinRefG "Der Bundesvervielfältiger beträgt 14,5 Prozent. Der Landesvervielfältiger beträgt 20,5 Prozent." | `gemfinrefg_6.html` | present verbatim | K30 | match |
| Quote § 1 (1) FAG "52,81398351 45,19007254 1,99594395" | `finausglg_1.html` | present verbatim (plus § 1 (2) 2024 fixed amounts −12,480,407,683 / +10,080,407,683 / +2,400,000,000) | G60 | match |
| § 1 GemFinRefG "15 Prozent" / "12 Prozent" | `gemfinrefg_1.html` | present; 12 % refers to Kapitalertragsteuer § 43 (1) 1 Nr. 5–7 | G10 / G40 | match |
| Energy tax petrol 654.50 €/1000 l (≤10 mg/kg S), diesel 470.40 | `energiestg_2.html` § 2 (1) 1b, 4b | present | 0.6545 / 0.4704 per l | match |
| Electricity tax 20.50 €/MWh | `stromstg_3.html` | present | 0.0205 per kWh | match |
| Tobacco 2026: 12.28 ct + 19.84 %, minimum 25.106 ct − VAT (1.1.2026–14.2.2027) | `tabstg_2.html` § 2 (1) 1e | present | basis string | match |
| Beer 0.787 €/hl per °Plato; insurance 19 %; VAT 19 % / 7 %; coffee 2.19 €/kg | `bierstg_2`, `versstg_6`, `ustg_12`, `kaffeestg_2` | present | file rates | match |
| Cigarette arithmetic (€9.00, 2026) | — | 20 × 0.1228 = 2.456; 0.1984 × 9.00 = 1.7856; sum 4.2416. Minimum = 20 × 0.25106 − 9.00 × 19/119 = 5.0212 − 1.4370 = 3.5842 < 4.2416, so not binding. VAT 1.4370. Total 5.6786 = 63.1 % | 4.2416 / 1.437 / 0.631 | match |
| Petrol arithmetic (€1.75) | — | VAT on the full gross price incl. energy tax (§ 10 UStG Entgelt): 1.75 × 19/119 = 0.2794; + 0.6545 = 0.9339 = 53.4 % | 0.2794 / 0.9339 / 0.5337 | match |
| Beer / electricity / insurance / coffee arithmetic | — | 0.787×12×0.5/100 = 0.0472; 0.38×19/119 = 0.0607; 600×19/119 = 95.80; 2.19×0.5 = 1.095, 7×7/107 = 0.4579 | identical | match |

## 10. Section 8 payslip (spot check, not in the brief)

| What | Coordinates | My value | data/ / §8 | Verdict |
|---|---|---:|---:|---|
| Wage tax class I, €45,000, 2026 | `extracts/bmf_programmablaufplan/prueftabelle_stkl1.csv` (PAP 2026 Anlage 1 p. 39, row 45.000) | 5,570 → 12.38 % | 5,570; §8 12.38 | match (against the extract; PDF not re-read) |
| Contributions €45,000 | rates 18.6/2.6/14.6+2.9/3.6+0.6 halves | RV 4,185; ALV 585; KV 3,937.5; PV 1,080; employer 9,517.5 = 21.15 % | identical | match |
| €100,000: KV/PV ceiling 69,750; Soli 11.9 % × (23,248 − 20,350) | — | KV 6,103.13; PV 1,674; Soli 344.86 | identical | match |
| Job cost / kept (§8) | 45,000 × 1.2115; net | 54,517.5; 29,642.5 = 54.4 % | §8 54,518 / 29,643 / 54.4 % | match |

## Framing challenges (RATIONALIZATION.md)

F1. **§1 label "General public services (administration, interest, transfers between levels)" is wrong for S13.** In the consolidated sector GF0108 "Transfers of a general character between different levels of government" is **0** in 2024 (that is what consolidation does). GF01 = 277,890 is executive/legislative/fiscal affairs 89,380 + foreign aid 21,877 + general services 66,299 + basic research 43,152 + **public debt transactions 49,280** + other 7,902. Replace "transfers between levels" with "foreign aid, basic research"; keep "interest".

F2. **Same Eurostat number carries two status labels.** TE 2024 = 2,139,717 is `provisional` in `cofog.json` (gov_10a_exp flag `p`) and `final` in `aggregates.json` (gov_10a_main has no flag; the build inferred "final" from the absence). §1 says "provisional", §2 says nothing. The 2024 ESA figures should carry one label; "provisional" is the defensible one until Eurostat flags are reconciled.

F3. **§1 social-protection parenthesis "health insurance benefits" is misleading.** GF10 "Sickness and disability" (143,927) is cash sick pay/disability/long-term care; health-insurance benefits in kind are GF07 Health (329,254: hospitals 123,652, outpatient 98,458, medical products 76,510). Write "sickness and disability benefits, long-term care" instead.

F4. **§4 "the 392m difference … is a Destatis timing feature" is an assumption presented as fact.** Nothing in `71211-0001/0002.json`, `variables-START1/STAT10.json` or `statistic-71211-tables.json` explains the 947,706,848 − 947,314,455 = 392,393 T EUR gap; the metadata only labels the tables "vor" / "nach der Steuerverteilung". Mark `*` or replace by "difference not explained in the source; both totals kept as published".

F5. **§5 "€107.5bn federal payments to pension insurance … Tit. 636 8x" — the figure is Funktion 221, not Titel 636 8x.** Titel 636 81–85 sum to 107,420.5 Mio; the stored 107,518.7 adds five Funktion-221 titles (636 14, 636 02, 636 06, 636 04, 636 03 = 98.2 Mio: Invalidenrenten refunds, Gutachtenkosten, Digitale Rentenübersicht, Nachversicherung). The "one euro in four" construct (23.07 % vs 23.09 %) is unaffected; the label in `budget-2024.json` key_items and in §5 should say "Funktion 221 (Kap. 1102)" or the amount should be 107.4.

F6. **§3 "Who receives it by law" column silently mixes statute and outcome.** "VAT: annual formula 2024 48.1 / 49.1 / 2.8" is the realised 2024 split from 71211-0002 (145,334 / 148,379 / 8,431 of 302,143), not the statutory percentages (§ 1 (1) FAG 52.81 / 45.19 / 2.00 before the § 1 (2) fixed amounts). Say "2024 outcome of § 1 FAG" and show the statutory base, or the reader will take 48.1 % for law. Also "Trade tax … minus levy (35 % of base)": 35 % is of the Steuermessbetrag; in cash terms the levy was 6,642 / 75,294 = 8.8 % of gross trade tax. Say "levy ≈ 9 % of receipts (35 % of the Messbetrag)".

F7. **§3 "income taxes on people" vs "everything a company pays directly" is a contestable partition.** Non-assessed taxes on yields (34.0) is Kapitalertragsteuer withheld on dividends and largely borne by shareholders (persons, funds, foreigners); assessed income tax (74.8) includes sole traders and partnerships. The "≈ 36 % people / ≈ 16 % companies" split should be marked `*` or re-labelled "withheld on wages and savings" vs "profit-based".

F8. **§1/§2 vs §3–§6: ESA accrual and cash figures sit side by side without a bridge.** §1–2 use ESA (taxes 1,006.6bn incl. imputed items, capital taxes and EU-collected customs treated as EU revenue), §3–4 cash 947.7bn / 947.3bn, §5 cash Ist, §6 cash. No section mixes them inside one sum (good), but §2 "Taxes 49.7 of every €100 of revenue" and §3 "of every €100 of tax" are on different bases (1,006.6 vs 947.7bn) with no one-line note. Add "ESA accrual, not the cash total of §3 (difference ≈ €59bn: timing, EU customs, imputed taxes)".

F9. **§6 Berlin's VAT in its own books vs BMF.** Berlin's cash account shows Umsatzsteuer (Landesanteil) 9,105,159 + Einfuhrumsatzsteuer 1,488,726 = 10,593,885 T EUR; BMF rows 10.3 + 15.10 give 6,526,007 + 3,942,990 = 10,468,997. The 125m difference (cash timing / Abrechnung provisional) is not mentioned; §6 presents the BMF decomposition as if it were inside the 27,302 account. Say "BMF decomposition; Berlin's cash book shows 10,594".

F10. **§6 "federal grants (€1,856m)" vintage.** BEZ are Mio-rounded Monatsbericht values; the sub-items (1,797 + 59) are from a different BMF table than the Abrechnung rows and are labelled provisional. Fine, but the per-resident "+€505" is then a rounded-to-the-million input; show as €505 not €505.3.

F11. **§7 vintage/basis.** Commission "spending and revenue" is by year of booking (data file says "accrual-free"); Destatis cash own resources 2024 = 32,011 vs Commission 31,381. §7 should say which one §4 uses (32,011) so the two "EU" numbers on the page differ visibly for a stated reason.

F12. **§9 "VAT → the annual formula"** again refers to the realised split; and the petrol row should say "VAT on the energy tax too" in the table (it is in the file's basis string but not in §9's "Tax inside" column, which reads as two independent layers).

F13. **§8 label "Health 7.3 + 1.45"**: the 1.45 is half of the statutory *average* additional contribution (2.9 % for 2026, Bundesanzeiger); real payslips vary by fund (2026 range ≈ 1.9–4.4 %). Mark the 1.45 `*` or say "average".

F14. Labels checked (de/en) in `by-tax.json`, `by-recipient.json`, `equalisation/2024.json`, `berlin/tax-receipts.json`, `eu/round-trip.json`, `purchase-taxes.json`: none wrong. Minor: GENESIS "Turnover tax" is kept as the English label for Umsatzsteuer while §3/§9 say "VAT"; pick one.

## Verdict

All 2024 headline numbers re-derive from the raw files: tax totals and shares (checks 1–2), COFOG and ESA aggregates with per-resident figures (3), the federal 465,670 reconciliation within 0.34 Mio and all Hauptfunktionen (4), Berlin/Bayern equalisation rows (5), Berlin cash receipts (6), the EU round trip (7), the municipal total (8) and the statute quotes and excise arithmetic (9, incl. the cigarette minimum-tax rule and VAT-on-energy-tax). Two concrete mismatches: the pension figure 107.5bn is Funktion 221, not "Titel 636 8x" (636 8x = 107.42bn), and the 2024 ESA figures are labelled both final and provisional. Two claims are presented as fact but are unsourced: the "Destatis timing feature" for the 392m gap and (implicitly) the 58 Mio municipal residual. The framing corrections above (F1 GF0108 = 0 in S13, F3, F6, F7, F8) are wording, not numbers. **Numbers: pass. Framings: fix F1–F8 before publishing.**
