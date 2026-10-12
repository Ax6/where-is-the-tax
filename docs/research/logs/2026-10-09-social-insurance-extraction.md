# Research run: 2026-10-09 — social insurance 2024/2025 by payer

- **Status:** collected, build checks pass (65 checks), awaiting independent verification
- **Collector:** build agent (scripts/research/build_social.py)
- **Independent verifier:** —
- **Reference years:** 2024 (DRV endgültig, KJ1 endgültig, SPV Ist, BA Ist), 2025 (DRV vorläufig, KJ1 endgültig, SPV Ist, BA Ist)
- **Output:** `data/de/social-insurance/accounts.json` (replaces the numbers in `data/de/2024/accounts/social-insurance.json`, which is left untouched)

## Why this run

Review item B2: the old file summed €706.7 bn of "contributions" over the four systems and called it payroll
deductions; B5: federal grants of 0 for care and unemployment insurance had no source. This run splits every
contribution line by who pays it, records every inter-public payment in a ledger, and derives a payroll view.

## Sources and coordinates

All PDFs are cached (non-redistributable, `research/cache/`); extracted cells are committed under
`research/extracts/<source_id>/<file>.csv` with page and row/column coordinates.

| Source | File | What was taken | Where |
|---|---|---|---|
| DRV Frühjahrsfinanzschätzung 2026 | `drv_finanzen/finanzbericht-fruehjahr-2026.pdf` | Rechnungsergebnis allg. RV 2024 (endgültig) / 2025 (vorläufig): all 27 rows (contributions by payer, three federal grants, other revenue, expenditure items, reserve), Mrd EUR 1 decimal | p.3; rate 2025 p.4; Bundesmittel 2025 block p.5 |
| DRV Aktuelle Daten 2026 (Stand 22.12.2025) | `drv_finanzen/aktuelle_daten.pdf` | same account in Mio EUR (2024 Ist, 2025 = autumn estimate) as cross-check; rate 2025/2026, BBG 2026 | p.1, p.2 |
| BMG KJ1 2024 (endgültig) | `bmg_gkv_finanzergebnisse/KJ1_2024.pdf` | columns BAS (Gesundheitsfonds) and BUND (all Krankenkassen): every Konto 2xxx (contributions), 3010/3222/3223/3260/3263/3264 (federal), 3730/3760–3799 (allocations received), 3999, Einnahmen insgesamt, Summe-rows per benefit type, 4780–4782, 5999, every fund row of Kontenklasse 6, 6999, 7599/7620/7630/7640/7660/7899/7999, Ausgaben insgesamt, 9202–9231, 9870–9990 | pp. 2–24 (absolute part) |
| BMG KJ1 2025 (endgültig, Stand 29.7.2026) | `bmg_gkv_finanzergebnisse/KJ1_2025.pdf` | same | pp. 2–19 |
| BMG SPV Finanzentwicklung (edition to 2024 / to 2025) | `bmg_pflegeversicherung/finanzentwicklung-spv-2024.pdf`, `-2025.pdf` | all rows of the 2022–2024 / 2022–2025 table, Mrd EUR 2 decimals | p.3 of each |
| BA Finanzentwicklung ALV 2024 / 2025 | `ba_finanzentwicklung/finanzentwicklung-alv-2024.pdf`, `-2025.pdf` | narrative revenue/expenditure items (Mrd, 2 decimals) pp. 3–5 / pp. 1–3; FEBA table (Mio, 1 decimal) p.6 / p.4, column "Ist seit Jahresbeginn" and "Vorjahr" | as stated |
| gesetze-im-internet | `sgb6_158`, `sgb5_241`, `sgb5_242a`, `sgb11_55`, `sgb3_341`, `svbezgrv_*` | rates and legal basis | raw/ |

Column assignment in KJ1 and the BA table is done by x-position of the numbers against the header words
(empty cells are simply absent in the text layer, so counting tokens is unsafe). Multi-line labels are
re-joined; every kept Konto has a canonical label in the script.

## Checks (all in the build, fail loudly)

Tolerances are the source's rounding unit times the number of independently rounded parts:
DRV 0.1 bn; SPV 0.01 bn per part; BA narrative 0.005 bn per part, table 0.05–0.15 Mio; KJ1 0.01 EUR per part.

- DRV: contribution parts = total; grant parts = total; revenue parts = total; expenditure parts = total;
  Aktuelle Daten (Mio) vs Finanzbericht (Mrd) within 0.05 bn; 2025 Bundesmittel block sums.
- KJ1 (per year): contributions by Konto = Konto 2999 (fund + insurers); Konto 9202–9231 = Konto 2600;
  fund revenue = 2999 + 3999; fund expenditure = Kontenklasse 6 + net admin; fund Kontenklasse 6 =
  allocations + Einkommensausgleich + prevention + fund shares + remaining rows; fund balance = revenue −
  expenditure (Konto 9980); insurer revenue = 2999 + 3999; insurer balance; insurer expenditure =
  Kontenklasse 4/5 + 6 + net admin.
- SPV: contribution parts = total; revenue = contributions + other; 15 benefit items = Leistungsausgaben;
  expenditure parts = total; surplus/deficit line = revenue − expenditure; 2024 identical in both editions.
- BA: five narrative revenue items = Einnahmen; narrative = table totals; chapter 4 parts; chapters 2+3 =
  active; active + ch.4 + admin = Ausgaben; table balance; 2024 identical in the 2024 table and the 2025
  "Vorjahr" column.
- Cross-system payer table rows = sum of the four systems' contribution totals.

## Results, 2024 (EUR bn)

| | Pension (allg. RV) | Health (GKV consolidated) | Care (SPV) | Unemployment (BA) |
|---|---|---|---|---|
| Revenue | 396.6 | 318.2 (fund 312.5, insurers 320.8, allocations eliminated) | 66.66 | 44.61 |
| Contributions | 305.3 | 298.19 (fund 297.00 + LKK 1.19) | 65.37 | 38.09 (+1.30 employer levies) |
| of which on wages (payroll) | 272.0* | 180.43 | 38.81 | 38.09* |
| paid by Bund | 18.1 (child-raising) | 5.84 (Bürgergeld, Wehrdienst) | 1.33 (Bürgergeld) | 0 |
| paid by BA | 5.0 | 4.25 | 0.87 | — |
| on pensions (pensioner + pension insurer) | — | 53.60 | 11.30 | — |
| paid by GKV / SPV | 8.6 | — | — | (inside 38.09) |
| members: voluntary, self-employed, other | 1.6 | 53.62 (+0.52 KSK, −0.08 adj.) | 13.06 | — |
| Federal grants | 87.8 | 16.12 (14.49 fund §221 + 0.10 + 1.53 LKK) | null (no line; ≤ 1.29 "Sonstige Einnahmen") | 0 (revenue lines enumerated) |
| Expenditure | 397.4 | 328.7 | 68.20 | 45.21 |
| Balance | −0.8 | −10.3 (fund −3.7, insurers −6.6) | −1.54 | −0.61 |
| Reserve | 44.4 (1.57 months) | fund liquidity 5.71; insurers' Rücklage 4.09 | 5.34 (+14.81 Vorsorgefonds) | +0.14 flow |

\* includes compulsorily insured self-employed (DRV) / contributions other bodies pay for benefit recipients (BA); not separable.

**Payroll view 2024: 529.3 bn** (272.0 + 180.43 + 38.81 + 38.09); **2025: 571.9 bn** (284.9 + 203.92 + 43.21 + 39.91).
Employer-only levies (1.30 / 2.53 bn) are listed separately.

**Cross-system payer table 2024** (rows sum to the four systems' contribution totals, 706.95 bn):
payroll 529.33; employer levies 1.30; members/self-employed/voluntary/other 68.73; on pensions 64.90;
federal budget 25.27; BA for benefit recipients 10.12; GKV/SPV for benefit recipients 8.60.
Inter-system double count (money that is expenditure of one of the four and revenue of another):
46.0 bn (BA→DRV/GKV/SPV 10.1, GKV/SPV→DRV 8.6, DRV KVdR share→GKV 27.3).

## Transfer ledger (2024, EUR bn; 2025 analogous in the file)

Bund→DRV grants 87.8 (56.9 + 15.7 + 15.1); Bund→DRV child-raising 18.1; BA→DRV 5.0; GKV→DRV 4.4; SPV→DRV 4.2;
DRV→GKV KVdR 27.3; Bund→Gesundheitsfonds §221 14.49; Bund→LKK 0.10 + 1.53; Bund→fund energy-cost pass-through
0.93, KHG refund −0.03; Bund→fund Bürgergeld contributions 5.19 + 0.64; BA→fund ALG I contributions 3.80 + 0.45;
pensions→fund 47.89 + 5.69 (channel; half pensioner, half pension insurer); SPV→GKV admin reimbursement 1.76;
DRV→GKV 0.13, BA→GKV 0.48, Bund→GKV 0.01 (admin reimbursements); GKV→DRV/BA/SPV contributions on sickness
benefit 3.56 (paying side); Bund→SPV Bürgergeld 1.33; BA→SPV 0.87; pensions→SPV 11.30 (borne by pensioners);
SPV→DRV/BA/UV carers 4.10 (paying side); Bund→BA SGB II admin reimbursement 4.03; BA→DRV/SPV 0.15.
2025 additions: Bund→SPV loan 0.50; Bund→BA loan 1.44; BA→Bund 0.36; Bund→DRV AAÜG 6.3; Bund→Knappschaft 4.8.

## Corrections vs `data/de/2024/accounts/social-insurance.json`

| Item | Old | New | Why |
|---|---|---|---|
| "Payroll deductions" (sum of contributions) | 706.7 bn | 529.3 bn payroll; 706.95 bn is the sum of all payers across systems with 46.0 bn inter-system double count | contributions by public bodies, pensioners, voluntary members separated |
| GKV contributions | 296,999 (fund only) | 298.19 bn (fund 297.00 + LKK direct 1.19) | LKK sits outside the fund |
| GKV federal grants | 14,495 | 16.12 bn (fund §221 14.49 + LKK §221 0.10 + LKK §37 KVLG 1.53); pass-through energy 0.93 separate | LKK federal money was missing |
| GKV revenue / expenditure | 320,839 / 327,409 (insurers only) | consolidated 318.21 / 328.74; fund 312.47 / 316.21; insurers 320.84 / 327.41 | the old revenue was the insurer book (mostly allocations), not GKV money in |
| GKV balance | not given | −10.30 (fund −3.73, insurers −6.57) | |
| DRV Rentenausgaben | 344,351 Mio | 344.5 bn (Finanzbericht) with 344,351 Mio as cross-check | different item definition between the two DRV tables (footnotes 5/6), not a revision |
| DRV KVdR | 27,366 Mio | 27.3 bn (Finanzbericht; 27,366 Mio cross-check) | same |
| DRV contributions by payer | not split | 272.0 wages / 18.1 Bund / 5.0 BA / 4.4 GKV / 4.2 SPV / 1.6 voluntary | |
| SPV federal grants | 0 (unsourced) | null; table has no grant line, "Sonstige Einnahmen" 1.29 unitemised; "Darlehen des Bundes" 2024 nil, 2025 0.50 (loan) | B5 |
| SPV contributions by payer | not split | 38.81 employees / 10.00 voluntary / 11.30 pensions / 0.87 BA / 1.33 Bund / 3.06 other | |
| BA federal grants | 0 (unsourced) | 0, derived: five revenue lines (38.09 + 4.03 + 1.18 + 0.78 + 0.52) sum to 44.61 within rounding, none a grant; federal money = SGB II admin reimbursement 4.03 (payment for services) and, 2025, a 1.44 bn loan | B5 |
| BA expenditure split | 4 items | + chapter 4 detail (Alg I 22,155.9 Mio incl. the social contributions BA pays for recipients, reimbursements 148.7, foreign insurers 41.4), Umlagen 1.30 | |
| GKV average Zusatzbeitrag 2024 | 1.7 % | null (Bundesanzeiger announcement not cached); BMG page: 3.13 % as of 1 Apr 2026 | sourcing rule |
| SPV rate | 3.4 % | 3.4 % statute text (cached); 2025 +0.2 by ordinance not cached → not asserted | sourcing rule |
| DRV rate 2024 | 18.6 % | 18.6 % flagged "indirect" (cached sources print 2025/2026 only) | sourcing rule |

## What remains unseparable (stated in the file)

- DRV "Pflichtbeiträge aus Erwerbstätigkeit" (272.0) include compulsorily insured self-employed and other
  directly paid compulsory contributions (DRV footnote 1).
- GKV Konto 2600/2907 "Sonstige Beiträge" (53.6 bn): the Nachrichtlich split (9202–9231) separates voluntary
  members 41.6, company pensions 4.8, students 0.8, rehabilitation participants 0.5 (public), catch-all 0.2,
  rest 0.1, but not the Zusatzbeitrag part (5.3) and not employees above the threshold (whose employer
  subsidy is payroll money) from the self-employed.
- GKV contributions on pensions (53.6): KJ1 does not split the pensioner half from the pension insurers' half;
  the DRV's own share (27.3, allg. RV only) is taken from the DRV side.
- BA "Beitragseinnahmen" (38.09) include unemployment contributions paid by GKV (sickness benefit) and SPV
  (carers); BA's Alg I expenditure includes the pension/health/care contributions it pays for recipients
  (receiving sides: DRV 5.0, GKV 4.25, SPV 0.87) without a BA-side split.
- GKV "Beiträge aus Krankengeld" (3.56, paying side) covers pension + unemployment + care; the DRV books 4.4
  received from health insurance — the two cannot be reconciled from these sources.
- SPV "Soziale Sicherung der Pflegepersonen" (4.10) covers pension + unemployment + accident; DRV books 4.2.
- GKV fund-vs-insurer elimination residual: 0.23 bn (2024), −0.65 bn (2025) — accrual timing between the two
  books; consolidated balance therefore differs from the sum of the two balances by that amount.

## Discrepancies and oddities in the sources

- KJ1 2024 title page prints "Stand: 24. Juli 2024" for the 2024 results (presumably 2025). Kept as printed.
- KJ1 2024 p.20 prints "Ausgaben insgesant" (typo); mapped to "Ausgaben insgesamt", noted in the extract.
- KJ1 2025 p.8: the "Einnahmen insgesamt" row has no BAS cell; fund revenue is derived (2999 + 3999 BAS) and
  verified against the printed balance (9980) and expenditure (9960).
- KJ1 2025 p.13 prints "05999 0" (stray digit after the Konto).
- DRV Finanzbericht p.3 footnote numbering is shifted (footnote 4 "KVdR = ..." is attached to Rentenausgaben).
- DRV Aktuelle Daten vs Finanzbericht 2024: Rentenausgaben 344,351 Mio vs 344.5 bn; KVdR 27,366 Mio vs 27.3 bn —
  definitional (footnotes 5/6), totals agree within 0.04 bn.
- SPV 2024 edition shows "Investitionsdarlehen an den Bund" (all nil); the 2025 edition renames the line
  "Darlehen des Bundes" with 2022 +1.00, 2023 −0.50, 2024 nil, 2025 +0.50.

## Not cached (therefore null or flagged, never asserted)

Bundesanzeiger announcements of the average Zusatzbeitragssatz 2024/2025; SPV rate ordinance 2025;
Beitragssatzverordnung 2018 (DRV 18.6 %); § 168 SGB VI, § 58 SGB XI, § 346 SGB III (employer/employee split);
BBG 2024/2025 (only § 3 of the SV-Rechengrößenverordnungen 2024/2025 is cached); § 61a SGB XI (SPV federal
grant 2022–2023). Licences of DRV/BMG/BA PDFs are unverified (cache only, figures cited with coordinates).

## Files produced or changed

- [x] `scripts/research/build_social.py` (extract + build + checks)
- [x] `research/extracts/drv_finanzen/finanzbericht-fruehjahr-2026.csv`, `aktuelle_daten.csv`
- [x] `research/extracts/bmg_gkv_finanzergebnisse/KJ1_2024.csv`, `KJ1_2025.csv`
- [x] `research/extracts/bmg_pflegeversicherung/finanzentwicklung-spv-2024.csv`, `-2025.csv`
- [x] `research/extracts/ba_finanzentwicklung/finanzentwicklung-alv-2024.csv`, `-2025.csv`
- [x] `data/de/social-insurance/accounts.json`
- [ ] `data/de/2024/accounts/social-insurance.json` — not changed; should be retired or regenerated from the new file
- [ ] independent verification

## Corrections applied after review C (2026-10-09)

Review: `docs/research/logs/2026-10-09-review-C-social-insurance.md`. All items below are in
`scripts/research/build_social.py`; extracts and `accounts.json` regenerated, 65 checks pass.

| # | Finding | Fix |
|---|---|---|
| M1 | KJ1 2025 elimination residual −651.2 m vs reviewer −561.1 m | Cause found: KJ1 2025 p.8 starts its first data row (Konto 03785, 90,119,195.83 = the Δ) at y = 78, below the fixed 80-pt header cutoff, so the row was dropped. The cutoff now follows the header row's bottom edge. Residual is −561,098,016.91; consolidated 2025 revenue 356,022,037,173.95 (was 356.11 bn); 2024 unchanged. |
| M2 | Ledger #29/#45 coordinate named Konto 04780 only | Coordinate now "Konto 04780 + 04781 + 04782, Spalte BUND"; label says so too. |
| M3 | False precision in the cross-system block | `precision_eur` = 1e8 on every row and on the block; `sum_of_system_contribution_totals_eur` (706.9 bn) and `inter_system_double_count_eur` (46.0 bn) rounded to 0.1 bn; the double count is now an object with `bound: "lower"`, an "at least" label, and lists of what it includes and omits. |
| C2 | "Withheld from wages" read as exact | Labels renamed to "Beiträge der versicherungspflichtig Beschäftigten (Arbeitnehmer- und Arbeitgeberanteil)" / "Contributions of compulsorily insured employees (employee + employer share)"; a `scope` field next to the total lists the exclusions (voluntarily insured employees above the Versicherungspflichtgrenze in GKV/SPV), the non-payroll inclusions (self-employed in DRV, inter-system money in BA, mini-job flat rates) and the unknown net direction. |
| C3 | DRV "KVdR" 27.3 is not purely DRV → GKV | Label now "Contributions and subsidies to pensioners' health insurance (KVdR) … plus § 106 SGB VI subsidies to pensioners insured outside the GKV"; figure note and ledger entry state it is an upper bound for the allgemeine RV → GKV flow, not quantifiable in the cached sources. |
| C7 | AAG U1/U2 levies missing | Konto 09400/09420 (levies) and 09410/09430 (refunds) extracted; `health.years.*.krankenkassen.aag_employer_levies_special_funds` (2024: 12.29 bn received, 11.53 bn refunded; 2025: 12.16 / 11.76) and `payroll_view.*.employer_only_levies_not_in_total.aag_u1_u2_krankenkassen`, status "not in GKV contributions and not in payroll_view", with the reason (separate special funds, largely paid back to employers). |
| C8 | ~60 GKV labels with en = de; "Wanderungsausgleich" opaque | English label per Konto (`KJ1_EN`, 128 entries) used for every Konto-level component, fund pass-through rows and the received-from-fund rows; Wanderungsausgleich → "Settlement for insured persons migrating from the miners' scheme (§ 223 SGB VI)". No label with en = de remains (checked). |

Not changed here (outside this file): C1 (per-day figure in RATIONALIZATION.md §10 repeats the double
count; consolidated spending ≈ 791 bn), C4/C5/C6 wording in §10, C9 (KJ1 memo Konto 09997 5.76 bn vs
Konto 02700 3.87 bn — the build uses 02700; the gap is undocumented in the source).
