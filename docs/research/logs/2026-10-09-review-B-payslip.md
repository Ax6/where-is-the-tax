# Review B: citizen payslip engine (independent re-derivation)

Date: 2026-10-09. Reviewer did not build the engine and did not run `scripts/research/build_payslip.py`.
Everything below was recomputed with a separate ~60-line implementation (Decimal arithmetic) written from
`research/raw/gesetze_im_internet/estg_32a.html`, `estg_39b.html` and the PAP pages cited, then compared
to `data/de/citizen/payslip-parameters.json`, `payslip-examples.json`,
`research/extracts/bmf_programmablaufplan/prueftabelle_stkl1.csv` and `docs/research/RATIONALIZATION.md` § 8.

## 1. § 32a EStG 2026 tariff (own implementation from the statute text)

Statute text used (estg_32a.html, Abs. 1): S. 1 "nach dem auf volle Euro abgerundeten zu versteuernden
Einkommen"; S. 2 Nr. 1–5 (12 348 / 12 349–17 799: (914,51·y+1 400)·y / 17 800–69 878:
(173,10·z+2 397)·z+1 034,87 / 69 879–277 825: 0,42·x−11 135,63 / ab 277 826: 0,45·x−19 470,38);
S. 3–5 (y, z = Zehntausendstel, x = abgerundetes zvE); S. 6 "auf den nächsten vollen Euro-Betrag abzurunden".

| Check | My value | Data value | Verdict |
|---|---|---|---|
| Constants Nr. 1–5 | as above | identical in `years.2026.tariff.zones` | match |
| Tax at zvE 15 000 | 435 (exact 435.5984) | n/a (not stored) | floor rule applied |
| Tax at zvE 40 000 | 7 209 (7 209.6326) | n/a | |
| Tax at zvE 70 000 | 18 264 (18 264.37) | n/a | |
| Tax at zvE 150 000 | 51 864 (51 864.37) | n/a | |
| Tax at zvE 300 000 | 115 529 (115 529.62) | n/a | |
| zvE = Grundfreibetrag → 0 | 0 | `grundfreibetrag_gives_zero: true` | match |
| Flooring of x (40 000.99 → 40 000) | 7 209 = tax(40 000) | rounding text in JSON | match |
| Formula-vs-formula gap at 17 799 / 69 878–69 879 / 277 825 | 0.002 / 0.067 / 0.000 EUR | `boundary_gaps_eur` 0.87 / 0.13 / 0.87 | **definition differs** (see challenge C1) |
| Marginal rate top of zone 3 / zone 4 | 0.42 / 0.42→0.45 | 0.42 / 0.45 | match |
| PAP UPTAB26 (XML) truncates y,z to 6 decimals | irrelevant for integer x (≤4 decimals) | not mentioned | fine |

## 2. Annual Lohnsteuer 2026, class I, childless, gross 45 000 and 60 000

Sentences relied on (estg_39b.html, Abs. 2 S. 5): Nr. 1 Arbeitnehmer-Pauschbetrag (§ 9a S. 1 Nr. 1a: "1 230 Euro");
Nr. 2 Sonderausgaben-Pauschbetrag (§ 10c S. 1: "36 Euro"); Nr. 3a "50 Prozent des Beitrags in der allgemeinen
Rentenversicherung unter Berücksichtigung der jeweiligen Beitragsbemessungsgrenzen"; Nr. 3b "den ermäßigten
Beitragssatz (§ 243 SGB V) und den Zusatzbeitragssatz der Krankenkasse (§ 242 SGB V) dem Arbeitnehmeranteil
eines pflichtversicherten Arbeitnehmers entspricht" (§ 243 S. 3: "14,0 Prozent" → employee half 7,0 % +
half Zusatzbeitrag); Nr. 3c "bundeseinheitlichen Beitragssatz dem Arbeitnehmeranteil ... erhöht um den
Beitragszuschlag" (§ 55 Abs. 1 S. 1 SGB XI i.V.m. PBAV 2025 § 1: 3,6 % → 1,8 %; § 55 Abs. 3 S. 1: "0,6
Beitragssatzpunkte"); Nr. 3e ALV part "nur anzusetzen, soweit er zusammen mit den Teilbeträgen nach den
Buchstaben b bis d einen Betrag in Höhe von 1 900 Euro nicht übersteigt". Rounding (cent truncation of the
parts, total rounded up to full euros) is not in the statute; taken from PAP 2026 XML `UPEVP`/`MVSPKVPV`/`MVSPHB`
(`setScale(2, ROUND_DOWN)` / `setScale(0, ROUND_UP)`).

| Step | 45 000 | 60 000 |
|---|---:|---:|
| RV part 9,3 % | 4 185.00 | 5 580.00 |
| KV+PV part (7,0 + 1,45 + 1,8 + 0,6 = 10,85 %) | 4 882.50 | 6 510.00 |
| ALV alternative: RV + min(KV/PV + 1,3 %, 1 900) | 6 085 | 7 480 |
| Vorsorgepauschale (max, rounded up) | 9 068 | 12 090 |
| zu versteuernder Jahresbetrag = gross − 1 230 − 36 − VP | 34 666 | 46 644 |
| **Jahreslohnsteuer (§ 32a)** | **5 570** | **9 389** |
| Soli (LSt ≤ 20 350) | 0 | 0 |
| `payslip-examples.json` | 5 570 / VP 9 068 / zvJB 34 666 | 9 389 / VP 12 090 / zvJB 46 644 |
| Verdict | match | match |

Sensitivity (confirms the reduced rate is the right reading): with 7,3 % instead of 7,0 % the result would be
5 530 / 9 328, which does not reproduce the PAP Prüftabelle.

## 3. Prüftabelle extract: 6 random rows (seed 20261009) opened in the cached PDFs

| Row (year, gross) | CSV says | Line found on the cited page | My LSt | Verdict |
|---|---|---|---:|---|
| 2026, 22 500 | lst_I 782, "page 39, row '22.500'" | `22.500 782 32 0 782 3.073 3.604` on p. 39 of 2025-11-12-PAP-2026-anlage-1.pdf | 782 | match |
| 2026, 107 500 | 26 343, p. 39 | `107.500 26.343 24.729 17.416 26.343 33.252 33.784` | 26 343 | match |
| 2026, 60 000 | 9 389, p. 39 | `60.000 9.389 8.091 4.822 9.389 15.364 15.895` | 9 389 | match |
| 2024, 67 500 | 12 209, p. 44 of 2024-10-18-PAP-Dez-2024-anl-1.pdf | `67.500 12.209 10.788 7.040 12.209 18.496 19.028` | 12 209 | match |
| 2026, 77 500 | 14 799, p. 39 | `77.500 14.799 13.323 8.846 14.799 21.585 22.117` | 14 799 | match |
| 2025, 55 000 | 8 216, p. 39 of 2025-01-22-geaenderte-PAP-2025-anlage-1.pdf | `55.000 8.216 6.949 3.972 8.216 13.816 14.348` | 8 216 | match |

Page headers confirm the table identity ("Allgemeine maschinelle Jahreslohnsteuer 2026 (Prüftabelle)",
footnote "KVZ = 2,90", "PVZ = 1" outside class II). Coordinates are honest. Bonus: all 121 rows of the CSV
reproduce with my implementation (2024/2025 with the old 12 %-minimum rule from the 2025 XML `UPEVP`).

## 4. Contribution rates and ceilings 2026 vs the cited text

| Parameter | Data (status) | Literal in the cited file? | Verdict |
|---|---|---|---|
| RV 18,6 % | statute, rvbeitrsbek_2026.html | "Der Beitragssatz für das Jahr 2026 beträgt weiterhin in der allgemeinen Rentenversicherung 18,6 Prozent" | yes |
| RV split 9,3/9,3 | § 168 Abs. 1 Nr. 1 SGB VI | "je zur Hälfte" | yes |
| BBG RV/ALV 101 400 | statute, sgb6_anlage_2.html | row "1.1.2026 - 31.12.2026 101 400 124 800" | yes |
| ALV 2,6 % | statute, sgb3_341.html | "(2) Der Beitragssatz beträgt 2,6 Prozent." ; Abs. 4 ceiling = RV | yes |
| ALV split | § 346 Abs. 1 S. 1 SGB III | "je zur Hälfte" | yes |
| KV 14,6 % | statute, sgb5_241.html | "14,6 Prozent" | yes |
| KV reduced 14,0 % (VP) | statute, sgb5_243.html | "Der ermäßigte Beitragssatz beträgt 14,0 Prozent" | yes |
| Average Zusatzbeitrag 2,9 % | statute, BAnz AT 10.11.2025 B7 | "für das Jahr 2026 beträgt 2,9 Prozent" | yes, but see C3 |
| `zusatzbeitrag_used` 2,9 % in the Vorsorgepauschale | **statute** | § 39b says "Zusatzbeitragssatz der Krankenkasse (§ 242)"; the JSON's own `legal_basis` admits the average is substituted | **mislabelled: assumption, not statute** |
| KV split incl. Zusatzbeitrag | § 249 Abs. 1 S. 1 SGB V | "je zur Hälfte" (Zusatzbeitrag not named in S. 1; it is covered because the Zusatzbeitrag is part of "die Beiträge") | acceptable |
| KV/PV ceiling 69 750 | statute, svbezgrv_2026_2.html | "§ 2 (2) ... 69 750 Euro ... 5 812,50 Euro" | yes |
| PV 3,6 % | statute, pbav_2025_1.html | "wird zum 1. Januar 2025 auf 3,6 Prozent ... festgesetzt"; § 55 Abs. 1 S. 1 still prints 3,4 % | yes for 2025; **2026 continuation is an inference** (no 2026 text; corroborated only by PAP 2026 MPARA PVSATZAN = 0,018) |
| PV childless +0,6 | statute, sgb11_55.html | Abs. 3 S. 1 "0,6 Beitragssatzpunkten" | yes |
| PV child abatement 0,25 | statute | Abs. 3 S. 4 "0,25 Beitragssatzpunkten" | yes |
| PV split, surcharge employee-only, Saxony +1 | § 58 Abs. 1 S. 1, S. 3, Abs. 3 SGB XI | all literal | yes |
| Bezugsgröße 47 460 | statute, svbezgrv_2026_1.html | "47 460 Euro" | yes |
| BMAS cross-check table | cross_check | 5.812,50 / 69.750, 8.450 / 101.400, 3.955 / 47.460 present | yes |
| PAP 2026 MPARA (p. 14) | cross_check | BBGRVALV 101400, BBGKVPV 69750, RVSATZAN 0,0930, AVSATZAN 0,0130, KVSATZAN = KVZ/2/100+0,07, PVSATZAN 0,018 (+0,006), GFB 12348, SOLZFREI 20350 | yes |
| Soli 5,5 % / 11,9 % / 20 350 | statute, solzg_4 / solzg_3 | all literal (§ 3 Abs. 3 Nr. 2 "20 350 Euro") | yes |
| Arbeitnehmer-Pauschbetrag 1 230 / Sonderausgaben 36 | statute | § 9a S. 1 Nr. 1a "1 230 Euro"; § 10c S. 1 "36 Euro" | yes |

Items marked `secondary` (2025 only): average Zusatzbeitrag 2,5 % (GKV-Spitzenverband page; corroborated by the
PAP 2025 Prüftabelle footnote KVZ = 2,50) and RV 18,6 % continuation 2025 (DRV table; corroborated by PAP 2025
MPARA RVSATZAN = 0,093). Both are consistent with official PAP constants; labelling is honest.

Items marked `statute` that are **not** in a statute text: Soli Freigrenze 2024 (18 130) and 2025 (19 950)
come from PAP constants; the 2024 and 2025 § 32a constants come from the BMF Tarifhistorie/PAP, not BGBl. The
build log admits both; the JSON status does not.

## 5. RATIONALIZATION.md § 8

| Claim | Check | Verdict |
|---|---|---|
| "of every €100" rows 30k/45k/60k/100k | every cell equals `per_100_gross` of the 2026 childless examples; rows sum to 100.00 (99.99/100.01 at 100k/150k from rounding) | consistent |
| Health "7.3 + 1.45", Care "1.8 + 0.6" | 8.75 and 2.4 = employee shares used | consistent |
| Employer adds 21.15 / 17.96 | 9.3+1.3+7.3+1.45+1.8 = 21.15; 17 958.63/100 000 = 17.96 | consistent |
| Tax wedge: €54,518 labour cost, €29,643 net, 54.4 % | 54 517.50 / 29 642.50 / 29 642.5÷54 517.5 = 54.37 % (wedge 45.63 %) | correct (rounded) |
| "social contributions (21.75) take more than wage tax (12.38)" | matches `effective_rates` at 45k | correct |
| Soli "appears only above roughly €100,000" | first euro of Soli at gross **92 396** (LSt 20 351 > 20 350) in class I childless | **off by ~8 %**; say "above about €92,000" or "from ~€92,400" |
| "0.34 at €100,000" | 344.86 / 100 000 = 0.34 | correct |
| Ceilings 69 750 / 101 400 explanation | correct | |
| "validated against all 121 rows (exact match)" | reproduced independently | confirmed |

## Challenges

- **C1 – `tariff_checks.boundary_gaps_eur` is not a continuity measure.** The stored 0.87/0.13/0.87 equal
  (next-zone formula at the boundary) − floor(current-zone value), i.e. mostly the fractional part of the tax.
  Formula-vs-formula differences at the boundaries are 0.002 / 0.067 / 0.000 EUR. Harmless, but the log's "< 1 EUR
  gap between adjacent formulas" describes a different number than what is stored. Rename or recompute.
- **C2 – "statute, exact" overstates two assumptions.** (a) § 39b Abs. 2 S. 5 Nr. 3b prescribes the
  Krankenkasse's own Zusatzbeitrag; the engine substitutes the § 242a average (2,9 %) because the PAP Prüftabelle
  does. The BAnz notice itself says the average is "maßgebend" only for Bürgergeld recipients and the § 242 Abs. 3
  groups. With the BMG-quoted actually-levied average of 3,13 % the 45k row becomes LSt 5 554 (−16), KV employee
  3 989.25 (+51.75), net 29 606.75 (−35.75). `zusatzbeitrag_used.status` should be "assumption" (or a new status),
  and § 8 should carry a `*` on the health column. (b) The "3.13 % as of 1 April 2026" note in the JSON has no
  `source_ref`; either fetch the BMG/GKV page or drop the number.
- **C3 – PV 3,6 % for 2026 is inferred.** The cited PBAV 2025 fixes the rate "zum 1. Januar 2025"; nothing fetched
  states it for 2026. The PAP 2026 constant (0,018) corroborates. Either cite the PAP as the primary evidence for
  2026 or mark the continuation explicitly.
- **C4 – 2024 rows are the whole-year (December-PAP) tariff.** The examples' `basis` says "what the employer
  withholds over a year"; for 2024 the January–November payroll used Grundfreibetrag 11 604 and the December PAP
  nets the difference in the December run. The year total is right for an employee with one employer all year,
  but not "per month". Fine for an annual view; the caveat is in the JSON note and the log, not in § 8 (which
  only shows 2026, so no visible error).
- **C5 – Soli onset.** "roughly €100,000" should read "from about €92,400 gross (class I, childless)". At
  €100,000 the Milderungszone formula applies (344.86 = 11,9 % × (23 248 − 20 350)), which § 8 could say to
  explain why the Soli share is so small there.
- **C6 – Status labels for 2024/2025 Soli Freigrenzen and tariff constants.** Marked `statute`, sourced from PAP /
  Tarifhistorie (official, but not the statute text). Add a third status ("official_notice"/"pap") or cite the
  BGBl. pages.
- **C7 – Wording.** "West ceilings" (examples `basis`) is meaningless for 2025/2026 (single RV ceiling since
  2025); "statutory average Zusatzbeitrag" should say "§ 242a average, not your insurer's rate".
- Nothing else contestable: § 32a constants, all 2026 rates/ceilings, the §39b reading (reduced rate 7,0 %,
  childless surcharge in the Vorsorgepauschale, 1 900 cap with the ALV part), the Prüftabelle extract and the
  example arithmetic all reproduce exactly.

## Verdict

Engine and 2026 numbers are correct and reproduce the official Prüftabellen exactly; the only defects are
labelling (average Zusatzbeitrag and two PAP-sourced constants marked "statute"), an unsourced 3,13 % note, a
mis-defined boundary-gap metric, and the Soli threshold stated ~€8k too high in § 8.
