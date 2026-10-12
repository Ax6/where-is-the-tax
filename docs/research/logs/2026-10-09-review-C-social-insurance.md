# Review C — social insurance accounts and the payroll view (2026-10-09)

Independent re-derivation of `data/de/social-insurance/accounts.json` from the cached PDFs, not from
`research/extracts/` or `scripts/research/build_social.py`. KJ1 columns were re-parsed from word
x-positions (own parser, `pdfplumber`), then compared with the data file. Scope: items 1–6 of the
brief, reviewer lead B2, and the framing in `RATIONALIZATION.md` §10.

Verdict column: **match** = identical to source rounding; **note** = correct but something to say;
**mismatch** = differs or mis-cited.

## 1. DRV, allgemeine RV (Finanzbericht Frühjahr 2026, p. 3; Mrd EUR, 1 decimal)

| Row (as printed) | 2024 PDF | 2024 data | 2025 PDF | 2025 data | Verdict |
|---|---:|---:|---:|---:|---|
| Beitragseinnahmen gesamt | 305,3 | 305.3 | 321,0 | 321.0 | match |
| Pflichtbeiträge aus Erwerbstätigkeit¹⁾ | 272,0 | 272.0 | 284,9 | 284.9 | match |
| Kindererziehungszeiten (Bund) | 18,1 | 18.1 | 19,2 | 19.2 | match |
| Bundesagentur für Arbeit | 5,0 | 5.0 | 5,8 | 5.8 | match |
| Krankenversicherung | 4,4 | 4.4 | 4,6 | 4.6 | match |
| Pflegeversicherung | 4,2 | 4.2 | 4,9 | 4.9 | match |
| Freiwillig gezahlte Beiträge | 1,6 | 1.6 | 1,5 | 1.5 | match |
| Bundeszuschüsse gesamt (56,9+15,7+15,1 / 61,1+15,7+16,4) | 87,8 | 87.8 | 93,2 | 93.2 | match |
| Erstattungen öffentlicher Stellen / Vermögenserträge / Übrige | 1,3 / 1,9 / 0,4 | same | 1,4 / 1,5 / 0,4 | same | match |
| Einnahmen gesamt³⁾ (ohne Finanzausgleich) | 396,6 | 396.6 | 417,4 | 417.4 | match |
| Rentenausgaben | 344,5 | 344.5 | 363,5 | 363.5 | match |
| KVdR | 27,3 | 27.3 | 30,6 | 30.6 | match |
| Übrige Ausgaben (8,9+3,3+8,0+5,2 + residual 0,2) | 25,6 | 25.6 | 27,2 | 27.2 | match; 0.2 residual is labelled as such |
| Ausgaben gesamt | 397,4 | 397.4 | 421,3 | 421.3 | match |
| Nachhaltigkeitsrücklage | 44,4 | 44.4 | 41,3 | 41.3 | match |
| p. 5 Bundesmittel 2025: 93,2 + 19,2 + 6,3 (AAÜG) + 4,8 (KnRV) = 123,4 | | | 123,4 | 123.4 | match |

Footnotes as printed: ¹⁾ employees incl. mini-jobs **and compulsorily insured self-employed and other
directly paid compulsory contributions**; ⁵⁾ (attached to "KVdR") "inkl. PV- und KV-Beiträge der
Rentenbeziehenden auf Zuschläge nach dem EM-Rentenbestandsverbesserungsauszahlungsgesetz". The
footnote shift the extraction log mentions is real (⁴⁾ "KVdR = …" sits on Rentenausgaben).

## 2. GKV, KJ1 2024 (EUR, cents). Columns: BAS = Gesundheitsfonds, BUND = all Krankenkassen (incl. LKK)

| Konto, name as printed | Page | BAS (fund) | BUND (insurers) | Data | Verdict |
|---|---|---:|---:|---|---|
| 02000 Beiträge für versicherungspflichtige Beschäftigte | 6 | 157,485,087,535.57 | 669,421,583.88 (= LKK) | 158,154,509,119.45 | match |
| 02011 Beiträge der BA für versicherte Empfänger von Arbeitslosengeld … | 6 | 3,800,381,186.37 | 1,001,186.53 | 3,801,382,372.90 | match |
| 02013 Beiträge für versicherte Bürgergeld-Beziehende | 6 | 5,192,052,226.75 | 1,088,714.75 | 5,193,140,941.50 | match |
| 02020 Beiträge aus Renten für Pflichtversicherte (ohne 2026) / … Altenteiler | 6 | 47,727,929,332.13 | 165,269,237.41 | 47,893,198,569.54 | match |
| 02600 Sonstige Beiträge (Gesundheitsfonds) | 7 | 48,031,199,234.78 | – | 48,031,199,234.78 | match; = Σ 9202–9231 exactly |
| 02700 Beiträge nach § 249b SGB V (Minijob-Pauschalbeiträge) | 7 | 3,867,995,823.04 | 16,396,428.50 | 3,884,392,251.54 | match |
| 02702 … -Altenteiler- (LKK) | 7 | – | 10,075,004.55 | 10,075,004.55 | match |
| 02900 Zusatzbeiträge für versicherungspflichtige Beschäftigte | 7 | 18,377,532,164.34 | – | same | match |
| 02903 Zusatzbeiträge aus Renten | 7 | 5,687,541,941.97 | – | same | match |
| 02907 Sonstige Zusatzbeiträge | 7 | 5,292,475,143.77 | – | inside members_other | match |
| 02999 Beitragseinnahmen insgesamt (KG 20-28) | 7 | 296,998,897,660.51 | 1,187,469,198.65 | 298,186,366,859.16 | match |
| 03260 Beteiligung des Bundes an Aufwendungen nach § 221 SGB V | 7 | 14,494,778,292.11 | 101,022,133.27 (LKK) | 14.49 + 0.10 | match |
| 03222 Zuschüsse für Leistungsaufwendungen nach § 37 Abs. 2 KVLG 1989 (LKK) | 7 | – | 1,526,515,785.27 | 1.53 | match |
| 03264 Bundesmittel … Energiekostensteigerungen / 03263 Erstattungen des Bundes | 8 | 934,520,514.32 / −33,196,717.80 | – | pass-through 0.93 / −0.03 | match |
| 03770–03798 + 03730 + 03760–03762 (allocations received) | 8–9 | – | Σ = 315,100,762,458.97 | 315,100,762,458.97 | match (own sum) |
| 03999 sonstige Einnahmen insgesamt | 9 | 15,475,905,541.44 | 319,651,954,774.00 | same | match |
| Einnahmen insgesamt | 10 | 312,474,803,201.95 | 320,839,423,972.65 | same | match |
| 04780/4781/4782 Beiträge aus Krankengeld | 12 | – | 3,457,725,638.25 / 105,178,427.58 / 20,328.99 | 3,562,924,394.82 | match |
| 05999 Kontenklasse 4/5 insgesamt | 15 | – | 312,287,000,268.51 | same | match |
| 06760–06762 Einkommensausgleich, 06776/77/87/88/89 Zuweisungen, 06730 (paid to insurers) | 16–17 | Σ = 314,874,224,628.89 | – | 314,874,224,628.89 | match (own sum) |
| 06999 Kontenklasse 6 insgesamt | 18 | 316,152,358,077.25 | 2,491,754,624.69 | same | match |
| 07999 Netto-Verwaltungskosten | 20 | 56,189,768.41 | 12,630,437,227.70 | same | match |
| 07620 / 07630 / 07640 / 07660 Erstattungen von DRV / PV / BA / Bund | 20 | – | 131,836,591.14 / 1,761,139,364.29 / 477,031,150.75 / 7,398,601.73 | same | match |
| "Ausgaben insgesant" (typo in PDF) | 20 | – | 327,409,192,120.90 | 327,409,192,120.90 | match |
| 09960 Ausgaben (KK 6/7 + 9411/9419/9431/9439) | 23 | 316,208,547,845.66 | 15,718,227,765.77 | fund expenditure 316.21 | match |
| 09971 Rücklage-Ist / 09980 Saldo / 09990 Liquiditätsreserve | 23 | – / −3,733,744,643.71 / 5,712,765,283.64 | 4,090,456,735.23 / −6,569,768,148.25 / – | same | match |

**Consolidation check.** Revenue 312,474,803,201.95 + 320,839,423,972.65 − 315,100,762,458.97 =
318,213,464,715.63 (data: same). Expenditure 316,208,547,845.66 + 327,409,192,120.90 −
314,874,224,628.89 = 328,743,515,337.67 (data: same). Residual between the two eliminations
226,537,830.08 (data: same). The consolidation is defensible: the eliminated rows are exactly the
fund→insurer allocation and Einkommensausgleich accounts on both books; the 0.23 bn gap is a
timing difference between the fund's cash book and the insurers' accrual of allocations, and the
file states it. **318.2 / 328.7 bn hold.**

**180.43 bn "contributions on wages"** = 02000 (fund + LKK) + 02900 (fund) + 02700 (fund + LKK) +
02702 (LKK) = 180,426,508,539.88. Reproduced to the cent. The Konto names are as in the table
above; 02700/02702 are the employer-only 13 % flat-rate contributions on mini-jobs (§ 249b SGB V).

KJ1 2025 (pp. 5–19): 02000 166,267,320,040.04 + LKK 741,999,792.71; 02900 32,889,235,619.64; 02700
3,999,851,492.28 + LKK 16,338,208.40; 02702 10,039,231.68 → payroll 203,924,784,384.75 (data: same).
02999 334,635,108,753.31 / 1,291,100,852.88; 03260 15,889,033,366.46 / 110,966,633.54; 03222
1,562,405,664.25; 03999 BAS 15,715,128,529.47; the "Einnahmen insgesamt" row on p. 8 has **seven**
cells (no BAS) — insurers 355,838,406,751.92; fund revenue derived 350,350,237,282.78 and confirmed
by 09980 BAS −605,889,767.28 against "Ausgaben insgesamt" BAS 350,956,127,050.06 (p. 16). Insurers'
"Ausgaben insgesamt" 352,661,539,065.37; 09971 4,839,900,326.19; 09990 7,182,562,706.77. Eliminations
350,166,606,860.67 (received) vs 350,727,704,877.58 (paid), residual −561,098,016.91 — the data file
says −651,217,212.74. See mismatch M1 below. All other 2025 values match.

## 3. SPV (BMG Finanzentwicklung, p. 3 of each edition; Mrd EUR, 2 decimals)

| Row (as printed) | 2024 (both editions) | data | 2025 | data | Verdict |
|---|---:|---:|---:|---:|---|
| Beitragseinnahmen | 65,37 | 65.37 | 72,45 | 72.45 | match |
| Beiträge für abhängig Beschäftigte | 38,81 | 38.81 | 43,21 | 43.21 | match |
| Beiträge für freiwillig in der KV Versicherte | 10,00 | 10.00 | 10,87 | 10.87 | match |
| Beiträge aus Renten | 11,30 | 11.30 | 12,53 | 12.53 | match |
| Beiträge für versicherte ALG I- / ALG II-Empfänger | 0,87 / 1,33 | same | 1,08 / 1,45 | same | match |
| sonstige Beiträge | 3,06 | 3.06 | 3,32 | 3.32 | match |
| Sonstige Einnahmen | 1,29 | 1.29 | 0,88 | 0.88 | match |
| Einnahmen insgesamt | 66,66 | 66.66 | 73,33 | 73.33 | match |
| Bundeszuschuss line | **none exists** | null | none | null | match; the only federal line is "Darlehen des Bundes" (2025 edition: 2022 1,00 / 2023 −0,50 / 2024 — / 2025 0,50; 2024 edition prints the row as "Investitionsdarlehen an den Bund", all nil) |
| Leistungsausgaben (15 items) | 63,26 | 63.26 | 70,42 | 70.42 | match, all 15 items match |
| Verwaltungsausgaben | 1,80 | 1.80 | 1,95 | 1.95 | match |
| Zuführung zum Pflegevorsorgefonds | 2,42 | 2.42 | 0,70 | 0.70 | match |
| Ausgaben insgesamt | 68,20 | 68.20 | 73,82 | 73.82 | match |
| Überschuss der Ausgaben | 1,54 | −1.54 | 0,49 | −0.49 | match |
| Mittelbestand am Jahresende / Pflegevorsorgefonds | 5,34 / 14,81 | same | 5,35 / 16,24 | same | match |

## 4. BA (Finanzentwicklung ALV; narrative Mrd 2 decimals, FEBA table Mio 1 decimal)

| Item | 2024 source (page) | data | 2025 source (page) | data | Verdict |
|---|---|---:|---|---:|---|
| Beitragseinnahmen | 38,09 (p. 3) | 38.09 | 39,91 (p. 1) | 39.91 | match |
| Verwaltungskostenerstattungen SGB II (Bund) | 4,03 (p. 3) | 4.03 | 4,19 (p. 2) | 4.19 | match; text says "hat der Bund … an Verwaltungskosten erstattet" — a reimbursement, not a grant |
| Erstattungen und Verwaltungseinnahmen | 1,18 (p. 3) | 1.18 | 1,17 (p. 2) | 1.17 | match |
| Insolvenzgeldumlage / Winterbeschäftigungsumlage | 0,78 / 0,52 (p. 4) | same | 2,02 / 0,51 (p. 2) | same | match |
| Einnahmen (narrative / FEBA) | 44,61 / 44.608,9 (pp. 3, 6) | 44.61 | 47,81 / 47.806,0 (pp. 1, 4) | 47.81 | match; five parts sum to 44.60 / 47.80 → no unexplained residual, so **grant = 0 is derived, not assumed** |
| Ausgaben (FEBA) | 45.214,4 (p. 6) | 45.2144 | 52.038,2 (p. 4) | 52.0382 | match |
| Arbeitslosengeld (Alg I) | 22.155,9 | 22.1559 | 26.469,4 | 26.4694 | match |
| Verwaltungsausgaben (Kapitel 5 und 6) | 10.897,6 | 10.8976 | 11.424,2 | 11.4242 | match |
| Insolvenzgeld | 1.612,8 | 1.6128 | 1.686,8 | 1.6868 | match |
| Erst. an Renten- und Pflegeversicherung | 148,7 | 0.1487 | 158,9 | 0.1589 | match |
| Aufwendungsersatz Übergang FbW/Reha an den Bund | – | – | 361,0 | 0.361 | match |
| Federal loan | none | – | "Liquiditätshilfen des Bundes in Form eines Darlehens in Höhe von 1,44 Milliarden Euro" (p. 1) | 1.44 | match; correctly outside Einnahmen |
| Balance / reserve | Defizit 0,61; Rücklage +0,14 saldiert (p. 3) | −0.61 / 0.14 | Defizit 4,23 (4,62 after Umlage reserves); Rücklage 3,18 fully dissolved (p. 1) | −4.23 / −3.18 | match |

## 5. Payroll view 2024 and the 46.0 bn double count

| Component | Source row | Value | Verdict |
|---|---|---:|---|
| DRV Pflichtbeiträge aus Erwerbstätigkeit | FB p. 3 | 272.0 | match |
| GKV 02000+02900+02700+02702 (fund + LKK) | KJ1 pp. 6–7 | 180.43 | match |
| SPV Beiträge für abhängig Beschäftigte | SPV p. 3 | 38.81 | match |
| BA Beitragseinnahmen | BA p. 3 | 38.09 | match |
| **Total** | | **529.33** | arithmetic holds (529,326,508,539.88) |

Inter-system flows counted in the 46.0 bn:

| Flow | Source | Amount | Arithmetic |
|---|---|---:|---|
| BA → DRV | FB p. 3 "Bundesagentur für Arbeit" | 5.0 | |
| BA → GKV (02011 + 02901, fund + LKK) | KJ1 pp. 6–7 | 4.247 | |
| BA → SPV "Beiträge für versicherte ALG I-Empfänger" | SPV p. 3 | 0.87 | subtotal 10.117 |
| GKV → DRV "Krankenversicherung" (receiving side) | FB p. 3 | 4.4 | |
| SPV → DRV "Pflegeversicherung" (receiving side) | FB p. 3 | 4.2 | subtotal 8.6 |
| DRV → GKV "KVdR" | FB p. 3 | 27.3 | |
| **Sum** | | **46.018** | = 46,018,459,181.85, holds |

Is 529.3 bn honestly "withheld from wages and paid by employers"? Partly. Still inside: compulsorily
insured self-employed and KSK artists inside DRV 272.0 (footnote 1, not quantified); employer-only
mini-job flat rates (DRV, and GKV 02700/02702 = 3.88 bn); inter-system money inside BA 38.09 (GKV
pays unemployment contributions on sickness benefit, SPV for carers — paying sides 3.56 / 4.10 are
multi-system and cannot be split). Missing although payroll: contributions and employer subsidies
(§ 257 SGB V) of employees above the Versicherungspflichtgrenze, which sit in GKV Konto 9210
(41.6 bn, mixed with the self-employed) and in SPV "freiwillig in der KV Versicherte" (10.00). The
file states all of this in `not_separable_note` and the component caveats. The direction of the net
error is unknown; the GKV/SPV omission is probably the larger term. See challenge C2.

## 6. Transfers ledger, 8 of 61 at random (seed 20261009: indices 8, 12, 21, 29, 42, 50, 53, 59)

| # | Transfer | Source (page, row) | PDF value | Ledger | Verdict |
|---|---|---|---:|---:|---|
| 8 | 2025 BA → DRV | FB p. 3 "Bundesagentur für Arbeit 5,0 5,8" | 5.8 | 5.8 | match |
| 12 | 2025 Bund → DRV AAÜG | FB p. 5 "Erstattungen nach AAÜG, §§ 290a, 291a SGB VI 6,3" | 6.3 | 6.3 | match |
| 21 | 2024 BA → fund, 02011 BAS+BUND | KJ1 p. 6: 3,800,381,186.37 + 1,001,186.53 | 3,801,382,372.90 | 3,801,382,372.90 | match |
| 29 | 2024 GKV → DRV/BA/SPV, "Konto 04780, Spalte BUND" | KJ1 p. 12: 04780 3,457,725,638.25 | 3,457,725,638.25 | 3,562,924,394.82 | **coordinate mismatch**: the amount is 04780+04781+04782; the coordinate names only 04780 |
| 42 | 2025 DRV → GKV, 07620 BUND | KJ1 2025 p. 16 | 131,492,311.99 | 131,492,311.99 | match |
| 50 | 2025 Bund → SPV ALG II | SPV 2025 p. 3 | 1.45 | 1.45 | match |
| 53 | 2025 SPV → DRV/BA/UV | SPV 2025 p. 3 "Soziale Sicherung der Pflegepersonen" | 4.80 | 4.80 | match |
| 59 | 2025 Bund → BA loan | BA 2025 p. 1 | 1.44 | 1.44 | match |

## Mismatches

| # | What | Detail |
|---|---|---|
| M1 | KJ1 2025 elimination residual | Data: −651,217,212.74. My sums over the same Konto ranges: received 350,166,606,860.67, paid 350,727,704,877.58, residual −561,098,016.91 (Δ 90.1 m). Consolidated 2025 revenue 356,112,156,369.86 and expenditure 352,889,961,237.85 should be re-checked against the build's row list for pp. 7–8 / 14–15 of KJ1 2025 (one 2025 row is probably assigned to a different column by the build or by me; 2024 agrees to the cent). Not visible to users at 0.1 bn, but the file prints cents. |
| M2 | Ledger #29 (and #45, same construction) | Amount = Konto 4780+4781+4782, coordinate says "Konto 04780" only. Fix the coordinate string. |
| M3 | False precision in the cross-system block | `inter_system_double_count_eur` 46,018,459,181.85 and `sum_of_system_contribution_totals_eur` 706,946,366,859.16 carry cents although 305.3, 27.3, 5.0, 4.4, 4.2 and the SPV lines are rounded to 0.1 / 0.01 bn. No `precision_eur` is given there (the payroll view has one). |

## Challenges

| # | Challenge |
|---|---|
| C1 | **The per-day construct in §10 repeats the double count it criticises.** "€839.5bn / 83.58 m = €27.44 per day" sums the four systems' gross expenditure (397.4+328.7+68.2+45.2). That gross contains the same inter-system money: DRV's 27.3 KVdR is spent again by GKV, BA's Alg I contains the 10.1 bn that DRV/GKV/SPV spend again, GKV/SPV's 8.6 bn reappears as DRV pensions, plus admin reimbursements (SPV→GKV 1.76, BA→GKV 0.48, DRV→GKV 0.13, BA→DRV/SPV 0.15). Consolidated spending is about €791 bn ≈ €25.9 per resident-day, not €27.44. |
| C2 | **"Payroll view" is a proxy, not a measurement.** The GKV and SPV components exclude every employee above the Versicherungspflichtgrenze (their own share and the employer subsidy are payroll money, hidden in Konto 9210 / "freiwillig in der KV Versicherte"), while the DRV and BA components include self-employed and inter-system money. The file's notes say so, but the EN label "Contributions withheld from wages and paid by employers" and §10's "**Withheld from wages + paid by employers**" read as exact. Suggest: "contributions of compulsorily insured employees (employee + employer share)", with the exclusion of voluntarily insured employees stated next to the number, not only in a note. |
| C3 | **DRV "KVdR" 27.3 is not purely a DRV → GKV flow.** The DRV's own Mio table calls the line "Beiträge **und Zuschüsse** zur KVdR": it includes the § 106 SGB VI subsidy paid to pensioners who are voluntarily or privately insured (never reaches GKV) and, per footnote 5, pensioner-borne PV/KV contributions on EM supplements. Conversely it covers the allgemeine RV only, while GKV's 53.6 "Beiträge aus Renten" includes miners' pensions. The ledger entry `drv -> gkv 27.3` and the 46.0 bn should say "upper bound for the allgemeine RV share; not quantifiable in the cached sources". |
| C4 | **The 46.0 bn is a lower bound and is presented as a figure.** Not included: GKV → BA and GKV → SPV contributions on sickness benefit (inside the 3.56 paying side), SPV → BA for carers (inside 4.10), DRV → SPV nil (pensioners bear SPV alone — correct). The paying-side 3.56 is 0.84 bn below what DRV alone books as received from KV (4.4); the sources cannot be reconciled and the file says so, but §10 states "€46.0bn … is money one of the four systems pays to another" without the "at least". |
| C5 | **"Contributions are not taxes" is asserted, not sourced.** §10's heading rests on no cited definition (§ 3 AO: taxes are levies without individual Gegenleistung; contributions buy an entitlement) and the section then shows that 27 % of DRV revenue (105.9 of 396.6) and 5 % of consolidated GKV revenue is federal tax money. Either cite the legal distinction or soften the heading to "contributions and taxes are different pools, but taxes pay a quarter of pensions". |
| C6 | **ESA D61 comparison is one clause and only half right.** D61 756.6 = D611 302.3 + D613 406.1 + imputed/other 48.2 (2024, `aggregates.json`). "Larger because it imputes contributions for civil servants" explains the 48.2, but the actual-contribution part (708.4) also differs in scope from the all-payer 706.9: ESA includes accident insurance, miners', farmers' and KSK schemes, is accrual not cash, and reroutes government-paid contributions. Say "not comparable line by line" rather than giving one reason. |
| C7 | **Employer-only levies are incomplete.** The file lists BA Umlagen 1.30 bn but not the AAG U1/U2 levies collected by the Krankenkassen (KJ1 09400 + 09420 = 12.3 bn, mostly refunded to employers, 09410 + 09430 = 11.5 bn). Either list them with the same "not in total" status or say why they are out of scope. |
| C8 | **About 60 GKV labels have `en` = `de`** (all Konto-level component labels: "Zuweisungen - monatliche Zuweisungen -", "Beiträge aus Krankengeld (ohne 4781 und 4782)", …). CLAUDE.md requires both languages for anything shown. Also "Wanderungsausgleich → Migration settlement" is literal to the point of being opaque; it is the § 223 SGB VI settlement for insured persons who migrate out of the miners' scheme. Other labels check out (KVdR, Geldleistung, Eigenanteilsbegrenzung, SPV "Beiträge aus Renten" borne fully by pensioners, GKV half/half under § 249a SGB V). |
| C9 | **Minor source oddities to carry forward:** KJ1 2024 memo Konto 09997 "Summe der Beiträge aus geringfügiger Beschäftigung nach § 249b" = 5.76 bn while Konto 02700 = 3.87 bn — the build uses 02700; the gap is undocumented. The Aktuelle Daten label for KVdR differs from the Finanzbericht ("Beiträge und Zuschüsse" vs "KVdR"), which is the root of C3. |

## One-line verdict

Every number re-derived from the seven PDFs matches the file (DRV, SPV, BA to the printed digit; KJ1
2024 to the cent, KJ1 2025 except a 90 m residual), the consolidation and the 180.43 / 529.3 / 46.0
arithmetic hold; what does not hold is the framing — the payroll view is a labelled proxy sold as
"withheld from wages", the 46.0 bn is a lower bound built on an impure KVdR line, and §10's per-day
figure reintroduces the double count the section exists to remove.
