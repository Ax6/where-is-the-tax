# Rationalization: the constructs a visitor should grasp in seconds

**Date:** 2026-10-09. Every figure below is computed from files in `data/` (built from
`research/raw/`); the arithmetic is shown so a reviewer can redo it. Constructs marked `*` rest on
an assumption or a secondary source and must be shown with that marker.

Reference year: **2024** (the newest year in which the whole-state view, tax receipts, federal and
Berlin accounts, equalisation and social insurance all exist). 2025 is used where it adds freshness
and is labelled.

Population used for per-resident framings: **83,577,140** (31.12.2024, `data/de/population.json`);
2024 has 366 days.

---

## 1. The whole state in one line: "of every €100 the state spends"

Source: `data/de/government/cofog.json`, sector S13 (consolidated, so no double counting), 2024,
provisional. Total €2,139,717m.

| COFOG | Of every €100 | € per resident per day | Computation |
|---|---:|---:|---|
| Social protection (old age, sickness/disability cash benefits, survivors, families, unemployment, housing) | **41.3** | 28.87 | 883,179 / 2,139,717 |
| Health | **15.4** | 10.76 | 329,254 / 2,139,717 |
| General public services (administration, **interest on debt** GF0107, basic research) | **13.0** | 9.08 | 277,890 / 2,139,717 |
| Economic affairs (transport, energy, subsidies) | **11.0** | 7.67 | 234,556 / 2,139,717 |
| Education | **9.1** | 6.36 | 194,584 / 2,139,717 |
| Public order and safety | 3.3 | 2.31 | 70,657 / 2,139,717 |
| Defence | 2.7 | 1.92 | 58,583 / 2,139,717 |
| Recreation, culture, religion | 2.1 | 1.50 | 45,985 / 2,139,717 |
| Environmental protection | 1.1 | 0.80 | 24,526 / 2,139,717 |
| Housing and community amenities | 1.0 | 0.67 | 20,503 / 2,139,717 |

Per resident: €2,139,717m / 83,577,140 = **€25,602 per year = €69.95 per day**.

Why this and not the federal budget: the federal core budget (€465.7bn Ist 2024) is 22 % of
general-government spending; Länder, municipalities and the social-insurance funds spend the rest.
COFOG S13 is the only official series where transfers between those levels are eliminated.

Bridge to the cash taxes of section 3: ESA taxes €1,006.6bn (accrual, incl. imputed items and
EU-collected customs/VAT own resources treated differently) vs Destatis cash tax receipts
€947.7bn — different bases, both official; the page shows one at a time.

Contestable framing to avoid: "your taxes pay for X" per COFOG line. Taxes (€1,006.6bn ESA) and
social contributions (€756.6bn) and other revenue (€261.3bn) all finance all spending (§ 8 BHO);
the state also borrowed: deficit −€115.3bn (B9).

## 2. Where the money comes from: "of every €100 of public revenue"

Source: `data/de/government/aggregates.json`, 2024, TR = €2,024,422m.

| Revenue | Of every €100 | Computation |
|---|---:|---|
| Taxes (production/import taxes 443,779 + income/wealth taxes 552,833 + capital taxes 9,991) | **49.7** | 1,006,603 / 2,024,422 |
| Social contributions | **37.4** | 756,551 / 2,024,422 |
| Other (sales, fees, property income, transfers) | 12.9 | 261,268 / 2,024,422 |

And spending exceeded revenue: €2,139,717m − €2,024,422m = **−€115,295m** (= −€1,380 per resident),
covered by borrowing. Maastricht debt end-2024: €2,693,827m = **€32,232 per resident**; interest
paid 2024: €45,828m = €548 per resident.

## 3. Which taxes: "of every €100 of tax collected in Germany"

Source: `data/de/taxes/by-tax.json`, cash receipts 2024, total €947,706.8m (final).
Per resident: €11,339 per year = **€30.98 per day**.

| Tax | €bn | Of every €100 | Who receives it by law (`legal-allocation.json`) |
|---|---:|---:|---|
| Wage tax | 248.9 | **26.3** | 42.5 Bund / 42.5 Länder / 15 municipalities |
| VAT (domestic) | 228.7 | **24.1** | statute base shares 52.81 / 45.19 / 2.00 (§ 1 (1) FAG) shifted by fixed amounts; realised 2024: 48.1 / 49.1 / 2.8 |
| Import VAT | 73.5 | 7.8 | same formula |
| Trade tax (gross) | 75.3 | 7.9 | municipalities, minus a levy of 35 % of the Messbetrag (≈ 8.8 % of receipts in 2024) to Bund/Land |
| Assessed income tax | 74.8 | 7.9 | 42.5 / 42.5 / 15 |
| Corporation tax | 39.8 | 4.2 | 50 / 50 |
| Energy tax | 35.1 | 3.7 | Bund |
| Non-assessed taxes on yields | 34.0 | 3.6 | 50 / 50 |
| Final withholding tax | 19.3 | 2.0 | 44 / 44 / 12 |
| Insurance tax | 18.2 | 1.9 | Bund |
| Tobacco tax | 15.6 | 1.7 | Bund |
| Property tax B | 15.6 | 1.7 | municipalities |
| Real-estate transfer tax | 12.7 | 1.3 | Länder |
| Solidarity surcharge | 12.6 | 1.3 | Bund |
| Inheritance tax | 10.0 | 1.1 | Länder |
| Motor-vehicle tax | 9.7 | 1.0 | Bund |
| Customs | 5.5 | 0.6 | EU |
| Electricity tax | 5.2 | 0.5 | Bund |
| everything else (≈ 30 taxes) | ≈ 32 | ≈ 3.4 | see file |

Neat construct `*`: **income taxes on people (wage + assessed + withholding ≈ 36 %) and VAT (≈ 32 %)
are two thirds of all tax**; taxes assessed on companies (corporation + trade + yields ≈ 16 %)
are a sixth. Marked `*`: withholding tax and non-assessed yield taxes are paid by both people and
firms, and trade tax is also paid by partnerships (people).

## 4. Who ends up with it: "of every €100 of tax, after the legal split"

Source: `data/de/taxes/by-recipient.json`, 2024 (total after distribution €947,314m; the 392m
difference to the pre-distribution total is a Destatis timing feature, kept as published).

| Recipient | Of every €100 | Computation |
|---|---:|---|
| Federation (after paying EU own resources, supplementary grants, ÖPNV and Kfz compensation to the Länder) | **39.6** | 374,949 / 947,314 |
| Länder (after VAT equalisation and federal grants) | **41.7** | 394,836 / 947,314 |
| Municipalities (after the trade-tax levy) | **15.4** | 145,519 / 947,314 |
| EU own resources (customs, VAT- and GNI-based, plastics) | **3.4** | 32,011 / 947,314 |

## 5. The federal budget: "of every €100 the Bund spends"

Source: `data/de/federal/budget-2024.json`, official basis €465,670m (Ist 2024, provisional
closing), reconciled from the Titel-level XML: gross €474,753.7m − €8,493.8m repayment of
emergency-credit inflows (Kap. 3201 Tit. 595 01) − €590.3m internal settlements (Obergruppe 98) =
€465,669.7m (residual −0.3m = BMF rounding).

| Hauptfunktion | €bn | Of every €100 |
|---|---:|---:|
| 2 Social security (of which €107.5bn federal payments to pension insurance, Bürgergeld, families) | 222.7 | **47.8** |
| 0 General services incl. defence (Epl 14), foreign affairs, police | 113.6 | **24.4** |
| 8 Financial management (interest €34.2bn, guarantees, assets) | 43.0 | 9.2 |
| 7 Transport and communications | 36.4 | 7.8 |
| 1 Education, science, research | 29.8 | 6.4 |
| 6 Energy, business, services | 8.4 | 1.8 |
| 3 Health, environment, sport | 6.1 | 1.3 |
| 4 Housing, urban development | 4.1 | 0.9 |
| 5 Food, agriculture, forestry | 1.4 | 0.3 |

Neat construct: **almost one federal euro in four goes to the pension insurance** (107.5 / 465.7 =
23.1 %) before any other spending. Taxes covered 80.5 % of federal spending (BMF
Steuerfinanzierungsquote); the rest was other revenue and net borrowing (€33.3bn).

Beyond the core budget (not in the €465.7bn): KTF investment €17.8bn (2024), and in 2025 the new
SVIK (€24.0bn drawn, of which €10bn passed to the KTF) and the Bundeswehr special fund (XML
Kapitel 1491: €19.5bn 2025). These are separate accounts; see `overview.json`.

## 6. A Land: Berlin as Land and municipality

Source: `data/de/berlin/tax-receipts.json` (own account), `data/de/equalisation/2024.json`,
`data/de/taxes/by-land.json`.

- Berlin's own tax account 2024: **€27,302m** = Land share of joint taxes 19,308 + Land taxes
  1,445 + municipal taxes 3,770 + municipal share of joint taxes 2,778. (Berlin's own VAT lines,
  9,105 + 1,489 = €10,594m, exceed the BMF calculation's €10,469m for Berlin by €125m: cash
  received in the year vs the Ausgleichsjahr attribution; both kept.)
- Inside that: Berlin's VAT share is not "Berlin's VAT" — it is a population-based share of the
  Länder pool (€6,526m) **plus** the equalisation addition (+€3,943m, 63 % of the gap between
  Berlin's fiscal strength of 77.4 % and the average) plus federal grants (€1,856m: 1,797 general +
  59 for political leadership). Per resident: +€1,073 from equalisation and +€505 from grants.
- 2025: VAT share €6,701m, FKA +€4,223m, BEZ €1,989m (both years labelled provisional by BMF).
- Spending 2024 (`functions-2024.json`, €40,464m): social 30 %, education/culture 28 %, general
  services 20 %, transport 6 %.

Contestable construct `*`: "Bavaria pays for Berlin". The post-2020 system is a pooled VAT
calculation (Bayern −€9,774m, Baden-Württemberg −€5,038m, Hessen −€3,736m, Hamburg −€106m in
2024); no bilateral wire exists in law.

## 7. The EU round trip

Source: `data/de/eu/round-trip.json`, Commission data, 2024: Germany's own resources
**€31,381m** (customs 4,022; VAT-based 5,440; GNI-based 22,620 − lump-sum reduction 2,078;
plastics 1,378) versus EU spending allocated to Germany **€12,620m** (agriculture and environment
6,103; single market/innovation 2,823; cohesion 2,493; …) plus **€15,222m** NextGenerationEU
grants in 2024. Per resident: pays €375, receives €151 (+€182 NGEU) in 2024. (Destatis books
€32,011m of EU own resources in the German cash statistics for 2024, section 4; the Commission's
€31,381m is by year of budget entry and nets the lump-sum reduction differently; both are shown
with their source, never averaged.)

Contestable construct `*`: a "net contribution" (31,381 − 12,620 = 18,761). The Commission stopped
publishing operating balances; EU-wide goods (single market, external action) are not allocated to
any member state. If shown, mark `*` and show both gross sides.

## 8. The citizen: "my payslip" (statute, exact)

Source: `data/de/citizen/payslip-parameters.json`, `payslip-examples.json`. Statutory tariff
(§ 32a EStG), wage-tax procedure (§ 39b EStG incl. Vorsorgepauschale), Solidaritätszuschlag
(§§ 3-4 SolzG) and contribution rates/ceilings (SGB III/V/VI/XI, SV-Rechengrößenverordnung).
Tax class I, no children (PV childless surcharge), no church tax, statutory average additional
health-insurance rate. **Validated against all 121 class-I rows of the BMF Prüftabellen for
2024, 2025 and 2026 (exact match).**

Of every €100 gross wage, 2026:

| Gross/year | Wage tax | Soli | Pension 9.3 | Unemployment 1.3 | Health 7.3 + 1.45`*` | Care 1.8 + 0.6 | **Net** | Employer adds |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| €30,000 | 7.49 | 0 | 9.3 | 1.3 | 8.75 | 2.4 | **70.76** | 21.15 |
| €45,000 | 12.38 | 0 | 9.3 | 1.3 | 8.75 | 2.4 | **65.87** | 21.15 |
| €60,000 | 15.65 | 0 | 9.3 | 1.3 | 8.75 | 2.4 | **62.60** | 21.15 |
| €100,000 | 23.25 | 0.34 | 9.3 | 1.3 | 6.10 | 1.67 | **58.03** | 17.96 |

Neat constructs:

- At a median-like €45,000, **social contributions (21.75) take more of the payslip than wage tax
  (12.38)**; the employer pays another 21.15 on top, so of the €54,518 the job costs, the employee
  keeps €29,643 = 54.4 % (the OECD "tax wedge" idea, computed here from statute).
- The Solidaritätszuschlag is 0 for most employees (Freigrenze); for a single childless employee
  the first Soli euro appears at €92,396 gross in 2026 (0.34 per €100 at €100,000).
- Health and care contributions stop growing above the ceiling (€69,750 in 2026), pension and
  unemployment above €101,400; that is why the shares fall at €100,000.

`*` 1.45 = half of the statutory *average* additional rate (2.9 % for 2026, § 242a SGB V); a
person's own insurer charges its own rate (the BMG reports 3.13 % actually levied on 1 April
2026), so the health line varies by insurer.

Caveats shown with the construct: annual withholding, not the final assessment; one person, one
tax class; church tax and children change the picture; the wage-tax share of the €100 goes
42.5/42.5/15 to Bund/Länder/municipalities, the contributions go to the four insurance systems
(not to the state budget).

## 9. The citizen: "taxes in my shopping basket" (statute, exact per unit; price assumed `*`)

Source: `data/de/citizen/purchase-taxes.json`.

| Purchase (price assumed `*`) | Tax inside | Share of price |
|---|---|---:|
| 1 l petrol at €1.75 | energy tax 0.6545 + VAT 0.2794 | 53 % |
| 1 l diesel at €1.65 | energy tax 0.4704 + VAT 0.2634 | 44 % |
| 1 kWh electricity at €0.38 | electricity tax 0.0205 + VAT 0.0607 | 21 % |
| Pack of 20 cigarettes at €9.00 (2026) | tobacco tax 4.24 + VAT 1.44 | 63 % |
| 0.5 l beer (12° Plato) at €4.00 | beer tax 0.047 + VAT 0.64 | 17 % |
| €50 groceries at 7 % | VAT 3.27 | 6.5 % |
| €800 smartphone | VAT 127.73 | 16 % |
| €600 car-insurance premium | insurance tax 95.80 | 16 % |

The per-unit taxes are exact law; only the price is an assumption. Recipients: energy, electricity,
tobacco, insurance → Bund; beer → Länder; VAT → the annual formula.

## 10. Social insurance: contributions and taxes are different pools — and taxes pay a quarter of pensions

Source: `data/de/social-insurance/accounts.json` (DRV Frühjahrsfinanzschätzung 2026 p. 3; BMG
KJ1 2024/2025; BMG SPV Finanzentwicklung; BA Finanzentwicklung), 2024 final.

| System | Revenue | of which contributions | Federal grants | Expenditure |
|---|---:|---:|---:|---:|
| Pension (allgemeine RV) | 396.6 | 305.3 | 87.8 | 397.4 |
| Health (GKV, fund + insurers consolidated) | 318.2 | 298.2 | 16.1 | 328.7 |
| Long-term care (SPV) | 66.7 | 65.4 | none in source (loan 0 / 0.5 in 2025) | 68.2 |
| Unemployment (BA) | 44.6 | 38.1 | 0 (4.0 SGB II admin reimbursement) | 45.2 |

The four "contributions" lines sum to **€706.9bn**, but that is *all payers*: it regroups as

| Who pays the contributions (2024, €bn) | Amount |
|---|---:|
| **Contributions of compulsorily insured employees, employee + employer share (the "payroll view", a proxy`*`)** | **529.3** = DRV 272.0 + GKV 180.4 + SPV 38.8 + BA 38.1 |
| Members themselves (self-employed, voluntary, others) | 68.7 |
| Pensioners' own share and the pension insurers (KVdR/PVdR) | 64.9 |
| Federal budget (child-raising periods 18.1, Bürgergeld recipients 5.8, SPV 1.3) | 25.3 |
| Bundesagentur for benefit recipients | 10.1 |
| Health/care insurance for benefit recipients | 8.6 |

**At least €46.0bn of the €706.9bn is money one of the four systems pays to another** (BA →
DRV/GKV/SPV 10.1; GKV/SPV → DRV 8.6; DRV's "Beiträge und Zuschüsse zur KVdR" 27.3, an upper
bound for the DRV → GKV flow because it includes § 106 SGB VI subsidies to pensioners outside the
GKV): expenditure of the payer, revenue of the receiver, counted once in a consolidated view.
Flows the sources do not itemise (GKV/SPV contributions on sickness benefit and for carers to the
BA) make 46.0 a lower bound. The old "€706bn payroll deductions" label was therefore wrong by
about a quarter (reviewer lead B2 confirmed).

`*` The payroll proxy excludes employees insured voluntarily above the Versicherungspflichtgrenze
(their contributions sit in other GKV/SPV accounts) and includes compulsorily insured
self-employed in the DRV figure; the sources do not allow a cleaner cut.

Neat constructs:

- Per resident, the four systems' gross spending (397.4 + 328.7 + 68.2 + 45.2 =) €839.5bn is
  **€27.44 per resident per day** (2024) *before* eliminating the money they pay each other;
  net of the at-least-€46bn inter-system flows it is about €790bn ≈ **€25.9 per day**`*`
  (approximate: the full inter-system matrix is not itemised in the sources). Shown *next to* the
  €30.98 per day of cash taxes, never added: the two pools are financed differently and the
  state's grants to the systems are already inside the tax-financed budgets.
- The Federation's €87.8bn grants plus €18.1bn child-raising contributions to the pension
  insurance (= €107.5bn in `federal/budget-2024.json`) are **the single largest use of federal
  tax money**: 23 % of the federal budget.
- The payroll view (€529.3bn) is 1.6 × the wage tax (€248.9bn) and 56 % of all tax revenue.

Why "contributions are not taxes": § 3 (1) AO defines taxes as levies without an individual
consideration; contributions buy an entitlement (pension points, insurance cover). The pools
still mix: federal tax money is 27 % of pension-insurance revenue (87.8 grants + 18.1
contributions of 396.6) and 5 % of GKV revenue.

Caveats: DRV's 272.0 includes compulsorily insured self-employed (not separable in the source);
GKV wage contributions include employer flat rates for mini-jobs; employer-only levies (BA
Umlagen 1.3bn, AAG U1/U2 levies collected by the insurers) are outside the payroll view. ESA
"net social contributions" (€756.6bn) is not comparable line by line: accrual, imputed
contributions (civil servants), accident/miners'/farmers' schemes, rerouted government-paid
contributions.

## 11. Review status

- Review A (re-derivation from raw files, all main layers) and review B (payslip) and review C
  (social insurance) are logged under `docs/research/logs/2026-10-09-review-*.md`; corrections
  from those logs are applied to the files and noted there.
