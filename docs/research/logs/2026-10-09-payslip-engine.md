# Payslip engine: statutory parameters and the exact withholding computation, 2024–2026

Date: 2026-10-09. Build: `scripts/research/build_payslip.py` → `data/de/citizen/payslip-parameters.json`,
`data/de/citizen/payslip-examples.json`. Registry: `research/sources.d/payslip.json`.
Extract: `research/extracts/bmf_programmablaufplan/prueftabelle_stkl1.csv`.

## Scope

Annual wage-tax withholding (Jahreslohnsteuer) for Steuerklasse I (= IV without children), no church tax,
no children, no Freibeträge, employee compulsorily insured in all four social-insurance branches, West
contribution ceilings, statutory average Zusatzbeitrag, outside Saxony. This is what the employer withholds
over a year under the BMF Programmablaufplan; an income-tax assessment (Veranlagung) can differ.

## Sources (all official; licence decisions in the registry)

| What | Source | Where it is |
|---|---|---|
| § 32a tariff 2026 | gesetze-im-internet `estg_32a.html` (version in force) | raw |
| § 32a tariff 2024 (post Dec-2024 law) and 2025 | BMF Lohn- und Einkommensteuerrechner "Tarifhistorie" PDF, pages 32–34; cross-checked with PAP Dez-2024 p. 43 (UPTAB24N), PAP 2025 p. 38 (UPTAB25), `Lohnsteuer2025.xml` | cache `bmf_steuerrechner`, `bmf_programmablaufplan` |
| § 39b procedure (Pauschbeträge, Vorsorgepauschale, 1 900/3 000 caps, 12 % minimum until 2025, ALV part from 2026) | `estg_39b.html` (2026 version) + PAP 2024/2025/2026 flowcharts (UPEVP, MVSP, MVSPKVPV, MVSPHB) + XML pseudocode (rounding) | raw + cache |
| Arbeitnehmer-Pauschbetrag 1 230, Sonderausgaben-Pauschbetrag 36 | `estg_9a.html`, `estg_10c.html` | raw |
| Soli 5.5 %, Milderung 11.9 %, Freigrenze 20 350 (2026) | `solzg_3.html`, `solzg_4.html`; 2024: 18 130 and 2025: 19 950 from PAP constant SOLZFREI | raw + cache |
| RV 18.6 % | BSV 2018 § 1; RVBeitrSBek 2026 (BGBl. 2025 I Nr. 291); 2025 continuation: DRV "Aktuelle Daten" p. 2 (secondary) | raw + cache |
| RV ceilings 90 600 / 96 600 / 101 400 | SGB VI Anlage 2 (rows 2024–2026); 2024 East 89 400 from PAP MPARA | raw |
| KV 14.6 %, reduced 14.0 % | § 241, § 243 SGB V | raw |
| Average Zusatzbeitrag 1.7 / 2.5 / 2.9 % | Bundesanzeiger BAnz AT 31.10.2023 B3 (2024) and BAnz AT 10.11.2025 B7 (2026); 2025: GKV-Spitzenverband page (secondary; the 2025 BAnz PDF URL was not found; PAP 2025 Prüftabelle uses KVZ = 2,50) | cache |
| KV/PV ceilings 62 100 / 66 150 / 69 750 and Bezugsgröße 42 420 / 44 940 / 47 460 | SVBezGrV 2024/2025/2026 §§ 1–2; BMAS table 2026 cross-check | raw + cache |
| PV 3.4 % (2024) → 3.6 % (2025/26), childless +0.6, child abatement 0.25/child (2nd–5th) | § 55 SGB XI; PBAV 2025 § 1 | raw |
| Who bears what (halves; childless surcharge employee only; Saxony +1 point employee) | § 168 SGB VI, § 346 SGB III, § 249 SGB V, § 58 SGB XI | raw |
| ALV 2.6 % | § 341 SGB III | raw |

## Computation (as implemented)

1. `zu versteuernder Jahresbetrag` = wage − 1 230 − 36 − Vorsorgepauschale.
2. Vorsorgepauschale (cent truncation of parts, total rounded up to full euros, as in the PAP):
   - RV part: 9.3 % of wage up to the RV ceiling.
   - KV/PV part: (7.0 % + half the average Zusatzbeitrag + 1.8 % [1.7 % in 2024] + 0.6 % if childless) of wage up to the KV ceiling.
     Note: 7.0 % is the reduced rate (§ 243 SGB V), not the 7.3 % the employee actually pays. Using 7.3 % broke the
     Prüftabelle comparison by 12–37 EUR; the PAP constant `KVSATZAN = KVZ/2/100 + 0,07` settles it.
   - 2024/2025: compare with 12 % of wage capped at 1 900 (3 000 in class III); the larger KV/PV-or-minimum is used.
   - 2026: compare with KV/PV + ALV employee share (1.3 % up to the RV/ALV ceiling) capped at 1 900; larger wins.
     For wages above ~18 400 EUR the KV/PV share alone exceeds 1 900, so the ALV part adds nothing.
3. Tariff § 32a on the floored amount; result floored to full euros.
4. Soli: 0 if wage tax ≤ Freigrenze; else min(5.5 % of wage tax, 11.9 % of (wage tax − Freigrenze)), cents truncated.
5. Contributions: rate × base (base capped at the ceiling), rounded to the cent on the annual base. Payroll rounds
   per month, so cents can differ.

## Validation

- **Official reference values:** each PAP ends with a "Prüftabelle" of the annual wage tax by class for gross
  wages 5 000 … 100 000 (2024/2025) and … 110 000 (2026), computed with KRV = PKV = 0, PVZ = 1, ceilings West,
  KVZ = 1,70 / 2,50 / 2,90. The class-I column was extracted (121 rows, page coordinates in the CSV) and every row
  is recomputed by the build; it fails on any euro of difference. Result: 39 + 39 + 43 rows reproduced exactly.
  Class IV equals class I in the tables, as expected without children.
- **Tariff:** Grundfreibetrag → 0 EUR; continuity at the three zone boundaries (< 1 EUR gap between adjacent
  formulas; e.g. 2024: 0.21 / 0.89 / 0.19 EUR, recorded per year under `tariff_checks` in the JSON); marginal rate
  42 % at the top of zone 3 and 45 % above 277 825.
- **Constants:** the tariff constants appear identically in the Tarifhistorie, the PAP flowchart and (2025/2026) the
  XML pseudocode; the social parameters match the PAP MPARA block and (2026) the BMAS table.
- The BMF calculator's external interface was tried; its access code is time-limited and only shown behind a JSF
  consent dialog, so it was not used. The Prüftabellen are the same engine's published output.
- Not validated against an external table: Soli amounts (formula is literal), contribution cent rounding, Saxony split.

## Assumptions

- Average Zusatzbeitrag per § 242a SGB V instead of the Krankenkasse's own rate (the law uses the latter in § 39b
  Abs. 2 S. 5 Nr. 3 b; the PAP tables use KVZ = average). The average actually levied is higher (3.13 % at
  1 April 2026 per BMG), so real payslips show a slightly higher KV deduction and slightly lower wage tax.
- 2024 uses the tariff after the Gesetz zur steuerlichen Freistellung des Existenzminimums 2024 (Grundfreibetrag
  11 784), applied for the whole year as the assessment does; January–November payroll used 11 604 (noted in the JSON).
- 2024 uses the West RV ceiling (90 600); East was 89 400 (last year of the distinction).
- Childless surcharge variant: `childless` (PVZ = 1, matches the Prüftabelle) and `with_child` (one child, no abatement).

## Open issues

- 2025 average Zusatzbeitrag: Bundesanzeiger notice (published ~7 Nov 2024) not located by URL; value marked
  `secondary` (GKV-Spitzenverband page + PAP 2025 KVZ = 2,50). Fetch the BAnz PDF when the URL is known.
- 2025 RV rate continuation: Bekanntmachung (BGBl. 2024) not fetched; marked `secondary` via DRV table.
- 2024 Freigrenze (18 130) and 2025 (19 950) are taken from PAP constants, not from the historical statute text.
- The 2024 and 2025 § 32a texts are from the BMF Tarifhistorie/PAP, not from BGBl. pages (recht.bund.de not fetched).
- Monthly/weekly withholding, tax classes II–VI, church tax, Kinderfreibeträge, Faktorverfahren, Versorgungsbezüge
  and private health insurance are not implemented.
