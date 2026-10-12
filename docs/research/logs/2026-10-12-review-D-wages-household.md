# Review D: wages, household indirect taxes, trade-tax levy, Funktionenplan, Berlin/Länder labels

- **Status:** verified with challenges (see bottom)
- **Reviewer:** independent agent (did not build the files; edited nothing under data/, scripts/, research/, src/)
- **Date:** 2026-10-12
- **Method:** every number re-derived from `research/raw/…` and `research/cache/…` with my own
  parsers (`.venv/bin/python -I`, scratch scripts in /tmp, raw files treated as data), then compared
  with `data/`. Legend: OK = identical; OK~ = within source rounding; MISMATCH = differs; CHALLENGE =
  value reproduces but the assumption, label or framing is contestable.

## 1. `data/de/citizen/wage-reference.json`

| Check | Source coordinates | My value | Data value | Verdict |
|---|---|---|---|---|
| Minimum wage 2024 | `milov4_1.html` § 1 Nr. 1 "ab 1. Januar 2024 12,41 Euro brutto je Zeitstunde" | 12.41 | 12.41 | OK |
| Minimum wage 2025 | `milov4_1.html` § 1 Nr. 2 | 12.82 | 12.82 | OK |
| Minimum wage 2026 | `milov5_1.html` § 1 Nr. 1 | 13.90 | 13.90 | OK |
| Minimum wage 2027 | `milov5_1.html` § 1 Nr. 2 | 14.60 | 14.60 | OK |
| Annual FTE 2024–2027 (h × 2080) | derived | 25,812.80 / 26,665.60 / 28,912.00 / 30,368.00 | same | OK, marked `annual_status: derived*` + `annual_assumption` text + file-level `assumptions` |
| Monthly FTE (÷ 12) | derived | 2,151.07 / 2,222.13 / 2,409.33 / 2,530.67 | same | OK (carries no own status flag; inherits the annual one only by position) |
| Median monthly April 2024 (VST052, GES/ALT035 = total) | `62361-0031.json` SMONAT=2024-04P1M | 3,978 (flag e) | 3,978 final | OK |
| Average monthly April 2024 (VST047) | same | 4,634 | 4,634 | OK |
| Median hourly April 2024 (VST051) | same | 23.49 | 23.49 | OK |
| Median / average / hourly April 2025 | SMONAT=2025-04P1M | 4,123 / 4,784 / 24.38 | same | OK |
| Median annual 2024 (VST053) / average (VST050) | `62361-0035.json` JAHR=2024 | 52,159 / 62,235 | same | OK |
| Median annual 2025 / average | JAHR=2025 | 54,066 / 64,441 | same | OK |
| median_x12 2024 / 2025 | derived | 47,736 / 49,476 | same | OK |
| Full-time claim, annual table | `verdienste-2025-q4.xlsx` sheet `62361-05` ("… Vollzeitbeschäftigte, 2025"), all 10 age rows, median and mean | bis 24: 40,800/42,708 … 65+: 58,179/71,408 | GENESIS 0035 ALT035 rows 2025 identical for all 10 × 2 cells | OK: 0035 = full-time |
| Full-time claim, monthly table | `62361-03` is by KldB (no overlap with 0031); used `csv-62361-04_1/_2` instead ("… Vollzeitbeschäftigte", April 2025): Gesamtwirtschaft VST045 28.19, male 29.16 | 28.19 / 29.16 | GENESIS 0031 VST045 2025-04 total 28.19, GESM 29.16 | OK: 0031 = full-time. The file's note cites "-03/-05"; -03 cannot be compared cell-for-cell (different dimension), -04 can |
| Durchschnittsentgelt 2024 / 2025 / 2026 | `sgb6_anlage_1.html` rows "24 47 085", "25 50 493*)", "26 51 944*)"; footnote "*) vorläufiges Durchschnittsentgelt i. S. des § 69 Abs. 2 Satz 1 Nr. 2" | 47,085 final; 50,493 prov.; 51,944 prov. | same, status strings match | OK |

Note: the GENESIS table list (`statistic-62361-tables.json`) titles 0031/0035 without "Vollzeit"; the
Bericht tables with identical cell values are titled Vollzeitbeschäftigte, so the data's
`definition` wording is justified. The Bericht also gives the average paid weekly hours of full-time
employees as **39.1 h** (`csv-62361-04_1`, Gesamtwirtschaft, April 2025) — see challenges.

## 2. `data/de/citizen/household-indirect-taxes.json`

Recomputed all six classes from `lwr-2024.xlsx` sheet `csv-63111-03` (78 items, 65 leaves) with the
file's own `vat_rate_assumptions` (longest-prefix match) and `excise_assumptions`.

| Check | Source coordinates | My value | Data value | Verdict |
|---|---|---|---|---|
| Leaves sum to "Private Konsumausgaben", Haushalte insgesamt | csv-63111-03 | 3,258 vs 3,257 | 3,258 / 3,257 | OK~ (source rounding) |
| Same, other classes | | 1,331/1,332; 1,948/1,948; 2,744/2,754; 3,436/3,436; 5,073/5,075 | same | OK~; class 2,600–3,600 is 10 EUR (0.4 %) short because small cells are "/" |
| VAT per year, Haushalte insgesamt | Σ spend·r/(1+r) × 12 | 3,359 | 3,359 | OK |
| VAT other classes | | 1,237 / 1,916 / 2,793 / 3,537 / 5,362 | same | OK |
| Excises, Haushalte insgesamt | | tobacco 95, alcohol 29, electricity 75, heating 38, fuel 414 | same | OK |
| Indirect total / share of consumption | | 4,009 / 10.26 % | 4,009 / 0.1026 | OK |
| Recipients sum = total | | 2,260+1,655+94 = 4,009 | 4,009 | OK (±1 EUR rounding in 3 other classes: 2,315/2,316; 4,271/4,270; 6,340/6,339) |
| VAT split 48.10/49.11/2.79 | `data/de/equalisation/2024.json` effective_shares_pct | 48.1 / 49.11 / 2.79 | same | OK |
| EVS tobacco share | `evs-2023-feinanschreibung.xlsx` csv-63231-04: 19.36/(34.64+19.36) | 0.3585 | 0.3585 | OK (cited, not re-opened) |
| § 12 (1)/(2) UStG 19 % / 7 % | `ustg_12.html` | 19 / 7 | | OK |
| Accommodation 7 % (Nr. 11) | ustg_12 | yes | 0.07 | OK |
| Culture 7 % (Nr. 7) | ustg_12: theatre, concerts, museums, film, circus, zoos | yes | 0.07 | OK for those; see challenge (Rundfunkbeitrag) |
| Passenger transport 7 % (Nr. 10) | ustg_12: rail; buses/taxis/ferries only within a municipality or ≤ 50 km | long-distance **bus** is 19 % | reason says "7 % local and long-distance rail/bus" | CHALLENGE (wording wrong, amount small) |
| Restaurant 19 % in 2024 (Nr. 15 says 7 % today) | ustg_12 current text is the 2026 law; 2024 = 19 % is correct history | 19 % | 0.19 with note | OK |
| Petrol 654.50 / diesel 470.40 EUR per 1,000 l | `energiestg_2.html` § 2 (1) Nr. 1b, Nr. 4b | 654.50 / 470.40 | same | OK |
| Heating oil 61.35 EUR/1,000 l; gas 5.50 EUR/MWh | § 2 (3) Nr. 1b, Nr. 4 (Verheizen) | 61.35 / 5.50 | same | OK (the 18.38 EUR/MWh in § 2 (2) is CNG motor fuel, correctly not used) |
| Electricity 20.50 EUR/MWh | `stromstg_3.html` § 3 | 20.50 | 20.50 | OK |
| Cigarette tax 2024 | `tabstg_2.html` § 2 (1) Nr. 1c: 1 Jan 2023–31 Dec 2024 **11.15 ct** + 19.84 % | at 9.00 EUR/20: (2.23+1.786)/9 = **44.6 %** | file uses 2026 rate 12.28 ct → 47 %, says "2024: ≈ 46 %" | MISMATCH (vintage; 95 → ≈ 90 EUR/yr) |
| Insurance tax 19 % of premium excl. tax = 19/119 of gross | `versstg_6.html` § 6 (1) | 15.97 % of gross; × 50 % = 8.0 % | 0.08 | OK arithmetically, but **never applied**: the LWR item "Versicherungsdienstleistungen" is "/" in all six classes, so `excises_year_eur` has no `insurance_tax` key in any class while `basis`, `method.excises` and `excise_assumptions` announce it | CHALLENGE |
| Macro order of magnitude | `by-tax.json` G60+G70 2024 = 228.65 + 73.49 = **302.14 bn**; LWR grossed-up households (`csv-63111-b01`) = **38.713 m**, not 41.9 m | 3,359 × 38.713 m = 130 bn = 43 % of VAT revenue (46.6 % with 41.9 m) | | plausible, see challenges |
| Marking | `status: estimate*`, title "(Schätzung ≈)", basis "ESTIMATE*", 4 caveats, every assumption with reason | | | OK, clearly marked |

Assumptions that move the result most (Haushalte insgesamt, EUR per year):

| Assumption | Effect |
|---|---|
| Rent exempt (944 EUR/month at 0 %) | −1,809 vs. 19 %; legally certain, not contestable |
| Car purchase 177 EUR/month at full 19 % | 339/yr; private used-car sales carry no VAT and dealer used cars only margin VAT → plausibly −100 … −170 |
| Pauschalreisen 107 EUR/month at 0 % | +205 if 19 % were applied; margin scheme makes 0 defensible but it is the largest "set to 0*" |
| Restaurants 19 % (2024) vs 7 % (2026 rule) | 285 vs 117 → −168 for a 2026 reading |
| Fuel excise share 33.8 % (prices 1.75/1.65) | 414; ±5 % per ±0.10 EUR/l |
| Food 7 % incl. soft drinks (19 %) | ≈ +55 if ~12 % of the item is beverages; "small*" understates it slightly |
| Kulturdienstleistungen 7 % incl. Rundfunkbeitrag (no VAT, ≈ 18.36/month of the 32) | −14 |
| Tobacco/alcohol survey under-reporting (see challenges) | tobacco 95 vs macro ≈ 400 per household |

## 3. `data/de/taxes/legal-allocation.json` → `trade_tax_levy`

| Check | Source coordinates | My value | Data value | Verdict |
|---|---|---|---|---|
| Bundesvervielfältiger / Landesvervielfältiger | `gemfinrefg_6.html` § 6 (3): "Der Bundesvervielfältiger beträgt 14,5 Prozent. Der Landesvervielfältiger beträgt 20,5 Prozent." | 14.5 / 20.5 / 35.0 | same | OK |
| Formula | § 6 (2): Istaufkommen ÷ Hebesatz × Vervielfältiger | | same | OK |
| split_of_levy | 14.5/35, 20.5/35 | 0.4143 / 0.5857 | same | OK |
| § 7 Berlin/Hamburg remit only federal part | `gemfinrefg_7.html`: "Die Länder Berlin und Hamburg führen den Bundesanteil an der Umlage nach § 6 an den Bund ab." | yes | same | OK; the Bremen sentence ("zahlt die volle Umlage") is an inference from § 7's silence, not statute text |
| levy_share_of_gross 2024 | `by-recipient.json` STEUERNVK30 −6,642,096,000 / STEUERARTK30 75,293,525,000 | 0.08821 | 0.0882 | OK |
| federation_share_of_levy 2024 | 2,753,363,000 / (2,753,363,000 + 3,892,030,000) | **0.41433 → 0.4143**; only 0.4142 if the 1,789,000 "erhöhte Umlage" is in the denominator | 0.4142 | OK~ (denominator not stated in the note; statutory 0.4143) |
| 2025 same | 2,719,837 / (2,719,837+3,845,534[+108]) | 0.4143 | 0.4143 | OK |

## 4. `data/de/federal/funktionenplan.json` and `budget-2024.json` labels

12 random codes across levels, German name checked on the cited PDF page (pypdf text):

| Code | Page | PDF | Data de | Verdict |
|---|---|---|---|---|
| 0 | 3 | Allgemeine Dienste | same | OK |
| 1 | 10 | "Bildungswesen, Wissenschaft, Forschung, kulturelle" + next line "Angelegenheiten" | ends at "kulturelle" | MISMATCH (truncated) |
| 04, 06, 13, 22, 25 | 8/10/13/20/23 | match | | OK |
| 42 | 29 | wrapped after "Landesplanung," | joined correctly | OK |
| 64 | 32 | Energie- und Wasserversorgung, Entsorgung | de OK; en "Energy and water supply" drops Entsorgung | CHALLENGE (en) |
| 73 | 35 | Wasserstraßen und Häfen, Förderung der Schifffahrt | same | OK |
| 033 | 7 | "… mit dem Aufenthalt" + "ausländischer Streitkräfte" | ends at "Aufenthalt" | MISMATCH (truncated) |
| 142, 287, 312, 523, 623, 742, 812 | | match | | OK |
| 165 | 17 | Forschung und experimentelle Entwicklung | de OK; en "Research funding" | CHALLENGE (en loose; budget-2024 uses its own better en) |
| 253 | 23 | Aktive Arbeitsmarktpolitik | de OK; **en "Basic income support for job seekers (SGB II)"** | MISMATCH (en wrong) |

Wrapped names and joint headings:

| Check | PDF | Data | Verdict |
|---|---|---|---|
| 018 (p5, 3-line wrap) | Versorgung einschließlich Beihilfen für Versorgungsempfängerinnen und Versorgungsempfänger, soweit nicht unter Funktionen 038, 039, 048, 058, 068, 118 **oder 138** | stops before "oder 138" | OK~ (last fragment dropped) |
| 038 (p7) | … im Bereich der Bundeswehrverwaltung | same | OK |
| 249 (p23) | … Krieg und politischen Ereignissen | same | OK |
| 28 (p25, 3 lines) | … Eingliederungshilfe für Menschen mit Behinderungen nach dem SGB IX | same | OK |
| "11/12 Allgemeinbildende und berufliche Schulen Oberfunktion 11/12" (p10) | one joint heading | de for 11 and 12 both = joint name; **en 11 "General and vocational schools", 12 "Other school tasks"** | CHALLENGE: en for 12 is invented, not a translation of the de it sits next to, and not marked editorial |
| "18/19 Kultur und Religion Oberfunktionen 18/19" (p17) | one joint heading | de both "Kultur und Religion"; en 18 "Cultural institutions", 19 "Heritage protection and church affairs" | same CHALLENGE |
| x0 derived codes (290, 610, 680, 750, 790, 820, 830, 840, 860, 880) | plan lists no 3-digit code ending in 0 | `derived: true`, de = Oberfunktion name + " (Oberfunktion insgesamt)" | OK, except 830 inherits the wrong 83 name |
| 83 (p37) | "83 Schulden Oberfunktion 83" then explanation "Ausgaben und Einnahmen im Zusammenhang mit der Schuldenaufnahme" | de = "Schulden Ausgaben und Einnahmen im Zusammenhang mit der Schuldenaufnahme" | MISMATCH (explanation merged into the name; also in 830) |
| 236 "absent from the PDF"? | p21: "236 Förderung der Wohlfahrtspflege Funktion **235**" — present, trailer code is a BMF typo, parser rejects it | not in data; budget-2024 label null with note "not contained in the sources" | MISMATCH: it is in the source; en dict's "Other family assistance and welfare" is also not the PDF name |
| 412 "absent from the PDF"? | p29: "412 Wohnungsbauprämie/Vermögensbildung (nur Bund)" — present, without trailer | not in data; budget-2024 null | MISMATCH: it is in the source (amount 218.0 m EUR in 2024) |

Systematic scan of every heading that wraps (double space before the trailer in pypdf output) found
**13 further truncated German names** beyond 1 and 033: 024 (+"im Ausland"), 114 and 115 (+"(ohne
Sonderschulen/Förderschulen)"), 118 (+"im Bereich der Schulen (nur Länder)"), 16 (ends mid-bracket
"… wehrtechnische", missing "Entwicklung, siehe Funktion 036)"), 164 (+"(ohne Deutsche
Forschungsgemeinschaft)"), 167 (+"und zwischenstaatliche Forschungseinrichtungen"), 23 (ends "(ohne
Leistungen", missing "nach dem SGB VIII)"), 241 (page break, missing "Leistungen der Sozialen
Entschädigung"), 259 (+"nach dem SGB II"), 26 (+"(ohne Kindertagesbetreuung)"), 43 (ends "(ohne",
missing "Straßenbeleuchtung, Abwasserentsorgung und Abfallwirtschaft)"), 51 (+"(ohne
Betriebsverwaltung)"), 61 (+"und Dienstleistungen"). Cause: `CONT` in the build script only
continues when the first line ends in a connector word.

Vintage: the PDF carries two versions of 24, 039, 235 with markers "-- gültig bis Haushaltsjahr
2023 --" / "-- neu gültig ab Haushaltsjahr 2024 --" placed **before** the entry they govern (p7 and
p21 layout). The parser keeps the first occurrence, so Oberfunktion 24 carries the pre-2024 name
"Soziale Leistungen für Folgen von Krieg und politischen Ereignissen"; the name valid from 2024 is
"Leistungen nach dem Sozialen Entschädigungsrecht und für Folgen von politischen Ereignissen"
(SGB XIV). The file records no validity.

English translations (15 codes): 0, 04, 06, 13, 22, 25, 42, 73, 142, 287, 312, 523, 742, 812,
038 are accurate. Wrong or loose: **251** (de Arbeitslosengeld II → en "Labour-market
administration"), **252** (de Leistungen für Unterkunft und Heizung → en "Job promotion"), **253**
(see above) — the en dict for 25x describes an older code layout; 12/18/19 invented; 165 loose; 64
drops Entsorgung; 236 not the PDF name.

`budget-2024.json`: sub-function labels are now filled (147 from the Funktionenplan, ~50 from BMF
Tabelle 6 rows, 2 null). The BMF-row labels override the Funktionenplan for 1, 16, 23, 24, 64, 83,
165, 251–259, so the biggest rows are clean; the Funktionenplan-derived rows inherit the truncations
(024, 033, 114, 167, 241, 26, 51, 61) and the invented en for 12/18/19, and 830 the wrong 83 name.
Only 236 and 412 are null — but both codes **are** in the PDF (above), so their `label_source`
text "not contained in the sources" is false. `hauptfunktionen_note` still says "all other codes
carry label null", which is stale.

## 5. Berlin and Länder

| Check | Source coordinates | My value | Data value | Verdict |
|---|---|---|---|---|
| Children sums, groups 2, 1, 0 | extract csv | 12,237,400,330.87; 11,486,353,907.68; 8,184,947,117.33 | identical, cent-exact | OK |
| Groups 3–8 | | no Oberfunktion children in extract (only 9 + 23 rows) | `children` absent | OK as built; coverage is partial by design |
| Total | Σ 9 groups | 40,463,642,070.51 | 40,463,642,070.51 | OK |
| PDF re-derivation (pdfplumber, pages 79–88) | text comes out reversed (rotated table); reversing word order and characters yields the table. 31 of 33 amounts found verbatim, e.g. p79 "8.184.947.117,33" (0), p86 "2.366.087.450,50" (7), p85 "2.298.456.893,90" (6), p87 "1.817.608.671,90" (8), p88 total "40.463.642.070,51" with "Summe der Ausgaben" | | | OK |
| The 2 not found verbatim: 05 and 4 | p79 "1,433.347 .657,67" (glitched token) and p84 "126.239.037 ,23" (glyph glitch); in both rows Rechnungssoll − Reste reproduces the extract to the cent (1,433,348,745.89 − 1,088.22; 748,448,534.91 − 22,209,497.68 = 726,239,037.23) | 1,433,347,657.67; 726,239,037.23 | same | OK (indirect) |
| Column identity | row 0: Ist 8,184,947,117.33 + Reste 15,426,403.29 = Rechnungssoll 8,200,373,520.62; Gesamtsoll − Rechnungssoll = 320,554,903.13 | extract uses the **Ist** column | | OK |
| Berlin German names | the PDF Funktionenübersicht prints codes and amounts only (no names extractable) | names incl. the bracketed glosses on 11 "(öffentlich)", 12 "(Sonder-, Privat-, Berufsschulen)", 18 "(Kultureinrichtungen)", 19 "(Denkmalschutz, kirchliche Angelegenheiten)" are editorial | extract column `name_de` suggests source text | CHALLENGE (mark as editorial) |
| Berlin en labels (10) | 0, 01, 04, 05, 06, 13, 22, 25, 27, 28 | accurate | | OK; 12/18/19 inherit the Funktionenplan en issue |
| Länder `function_labels` en (10) | Rechtsschutz → "Legal protection (courts, prisons)"; Versorgung → "Civil-servant pensions"; Finanzwirtschaft, Schulden; Kultur und Religion → "Culture and religion"; Hochschulen; Öffentliche Sicherheit und Ordnung, Polizei; Verkehrs…, Bundesautobahnen; Energie…, Abfallwirtschaft; Soziale…, Kindertagesbetreuung; Wohnungswesen…, Kommunale Gemeinschaftsdienste | all accurate | | OK; cosmetic: "Finanzwirtschaft" = "Financial management" here vs "General financial management" in Berlin/Funktionenplan, "Kultur und Religion" translated three different ways across files |

## README / manifest

| Check | Result |
|---|---|
| `data/README.md` references to removed legacy files (`data/de/2024/accounts/berlin-functions.json`, git status D) | none; line 14 explains the removal and points to the extract |
| README lists the new files | wage-reference, household-indirect-taxes, funktionenplan, berlin/functions-2024, laender/functions-2022, legal-allocation all present |
| `data/manifest.json` | lists all 5 new files; every manifest path exists on disk; every `data/de/**/*.json` on disk is in the manifest; legacy path absent |

## Challenges

1. **Funktionenplan parser quality (item 4).** 15 truncated German names, 83/830 with the explanation
   merged into the name, 236 and 412 wrongly reported as absent from the PDF, en labels for 251/252/253
   belonging to another code layout, invented en for 12/18/19 without an "editorial" marker, and the
   pre-2024 name kept for 24 although the 2024 budget is the hero year. The build's assertions
   (counts ≥ 9/50/170) cannot catch any of this; a check comparing each name's last word with the
   next PDF line, and a validity marker per entry, would.
2. **Insurance tax is announced but never computed (item 2).** `basis`, `method.excises` and
   `excise_assumptions` list `insurance_tax`; no class has it, because LWR records insurance premiums
   outside consumption ("/"). Either drop the claim or add the premium item from a source that has it.
3. **Tobacco/alcohol under-coverage (item 2).** With 15.6 bn tobacco tax and 38.7 m LWR
   households the macro figure is ≈ 400 EUR per household; the estimate gives 95 because LWR/EVS
   tobacco spend (≈ 17 EUR/month) is a fraction of market sales. Same for alcohol (29 vs ≈ 75).
   Worth a caveat line; the per-class ordering is still meaningful.
4. **Tobacco vintage (item 2).** The 47 % share uses the 2026 tariff (12.28 ct); 2024's tariff is
   11.15 ct (§ 2 (1) Nr. 1c TabStG) → ≈ 44.6 % at 9.00 EUR/pack. Small, but the file labels itself 2024.
5. **Household count for macro framing (item 2).** The LWR universe is 38.713 m households
   (`csv-63111-b01`), not 41.9 m; it excludes net incomes > 18,000 EUR/month and institutional
   households. 3,359 EUR × 38.7 m ≈ 130 bn ≈ 43 % of 302 bn VAT. That is a plausible order of
   magnitude for the share of VAT borne by the surveyed average household (the rest falls on
   government, non-deductible sectors, housing investment and uncovered households), but I could not
   verify a precise household share from any source in the repo — treat 43 % as a reviewer's
   sanity bound, not a sourced figure. The file does not state a grossed-up total, which is right.
6. **Passenger transport wording (item 2).** § 12 (2) Nr. 10 UStG gives 7 % to rail at any
   distance but to bus/taxi/ferry only within a municipality or ≤ 50 km; "long-distance … bus" in the
   reason is wrong (amount small).
7. **40 h × 52 (item 1).** Clearly marked derived*, but the Destatis full-time average is 39.1 paid
   hours/week (same workbook, `csv-62361-04_1`, April 2025) — a sourced alternative to the round
   assumption, and the `monthly_full_time_eur` carries no own status flag.
8. **Berlin names are editorial (item 5).** The PDF table carries codes only; the extract's
   `name_de` column (with bracketed glosses for 11/12/18/19) should say so, and the source note
   "independent re-derivation from the PDF still open" can now be closed: all 33 amounts reproduce.
9. **federation_share_of_levy (item 3).** 0.4142 only if the 1.789 m "erhöhte Umlage" is in the
   denominator; state it or use 0.4143 (= 14.5/35 exactly, as in 2025).

## Verdict

All numbers reproduce from the raw files (wages, GENESIS, SGB VI, LWR recomputation, trade-tax
levy, Berlin 33/33 amounts incl. PDF re-derivation, README/manifest clean); the Funktionenplan label
layer is not release-quality (15 truncated names, 236/412 wrongly declared absent, 3 wrong and 3
invented English labels, stale 24), and the household file promises an insurance-tax component it
never computes.
