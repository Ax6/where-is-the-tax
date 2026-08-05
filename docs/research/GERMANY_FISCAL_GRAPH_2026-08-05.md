# Germany fiscal graph: deep research report

**Research date:** 2026-08-05

**Product language:** English

**Primary scenario:** a person in Berlin

**Status:** collection complete; independent reproduction still required before publication

## Executive verdict

The project can answer “Where does the money go?” much more precisely than the prototype, but
not with one German tax pool and not with one uninterrupted tax-to-programme Sankey.

Germany's truthful topology is:

```text
taxable event
  → named tax
  → constitutional/statutory allocation
  → geographical decomposition and annual clearing
  → Land equalisation or other transfer, where applicable
  → recipient budget or social-insurance account
  → tax identity stops at the budget boundary
  → that recipient's contextual spending composition
```

The legal route into a recipient is often exact. After revenue enters a general budget, the claim
that a particular tax euro funded a particular service is generally false. The product must make
that transition visible rather than disguise it.

This changes the product's centre of gravity:

- The hero is a stateful D3 fiscal graph, not a landing page and not one universal Sankey.
- Taxes on purchases are first-class paths, including VAT and excises.
- Berlin is both a Land and a municipality; its twelve boroughs are not tax recipients.
- Länder equalisation is a pooled calculation, not a set of invented Bavaria-to-Berlin wires.
- Statutory social-insurance contributions are a parallel source branch, not taxes.
- Spending is shown per recipient account, with transfers eliminated when accounts are combined.
- Every number exposes its year, accounting basis, status, scope, and source.

## What “goes” means

The interface should distinguish three questions that ordinary language collapses:

1. **Who legally receives this tax?** Usually answerable from law and official cash statistics.
2. **How is that receipt cleared or redistributed geographically?** Answerable at aggregate level,
   sometimes only after an annual official calculation.
3. **What does the recipient spend its complete budget on?** Answerable from the recipient's
   accounts, but normally not causally attributable to that tax.

The first two stages are routing. The third is context after an accounting boundary. This is not a
minor caveat; it is the core explanatory insight.

## Reference-year decision

There is no single current year with equally deep, finalized, machine-readable data for every
German recipient. The product should use two visibly labelled evidence modes rather than silently
mixing vintages.

### Route and recipient-account mode: 2024

Use **2024** for the first production slice because it is the newest coherent year currently
verified for all of these:

- named German cash tax receipts;
- official vertical tax distribution and EU contributions;
- the official Berlin tax account;
- the official Länder equalisation calculation, marked provisional;
- machine-readable federal title-level actuals;
- Berlin's finalized annual account and function-level actual expenditure;
- finalized or sufficiently detailed 2024 accounts for the main social-insurance systems.

Berlin 2025 final actual expenditure was not available in the sources checked on 2026-08-05.
Although newer 2025 tax and equalisation results exist, using them as the common route year would
force the Berlin spending branch to change year at its most important boundary.

### Comparable public-system mode: 2021

Use **2021** for the deep, standardized Germany/Länder/public-function comparison. Destatis' latest
verified comprehensive core-plus-extra-budget publication remains 2021. Its lag must be shown in
the interface; it cannot be relabelled as current.

### Freshness previews

Newer 2025 observations may appear only as separately dated previews. They must never replace a
2024 value inside a supposedly reconciled 2024 route.

## The constitutional routing layer

[Basic Law Article 106](https://www.gesetze-im-internet.de/gg/art_106.html) assigns taxes to the
Federation, Länder, and municipalities. [Article 107](https://www.gesetze-im-internet.de/gg/art_107.html)
governs geographical allocation, the Länder VAT pool, fiscal-capacity adjustment, and federal
supplementary grants.

| Tax or tax family | Initial legal route |
|---|---|
| Wage and assessed income tax | Federation 42.5%; Länder 42.5%; municipalities 15% |
| Corporation tax | Federation 50%; Länder 50% |
| Flat withholding tax on interest/capital gains | Federation 44%; Länder 44%; municipalities 12% |
| VAT and import VAT | Federation, Länder, and municipalities under annual statutory rules |
| Customs; energy, electricity, tobacco, alcohol, coffee, insurance, motor-vehicle and aviation taxes; solidarity surcharge | Federation |
| Inheritance, real-estate transfer, beer, betting/lottery and several smaller taxes | Länder |
| Trade tax, property tax, and local consumption/expenditure taxes | Municipalities, with a trade-tax levy where applicable |

“Initial” matters. Several taxes are subsequently decomposed by residence or establishments,
pooled, equalised, or transferred.

### Income tax

The 42.5/42.5/15 split is exact. The destination is not always the collection office:

- wage tax is decomposed principally to the employee's Land of residence under
  [§7 Zerlegungsgesetz](https://www.gesetze-im-internet.de/zerlg_1998/__7.html);
- the municipal 15% is distributed using residence and a capped income-tax contribution under
  [Gemeindefinanzreformgesetz](https://www.gesetze-im-internet.de/gemfinrefg/BJNR015870969.html).

The product can show the exact vertical split and the official aggregate destination. It cannot
reproduce one individual's exact municipal allocation from public aggregate inputs.

### Corporation tax

Corporation tax is split 50/50 between Federation and Länder. For firms with establishments in
more than one Land, the Länder part is decomposed, principally using establishment payroll. A
head-office-only route would therefore be misleading.

### Trade tax in Berlin

Trade tax belongs initially to the municipality containing the establishment. A statutory levy is
then remitted to Federation and Land. Berlin is special: because it is Land and municipality, it
remits only the federal component under
[§7 Gemeindefinanzreformgesetz](https://www.gesetze-im-internet.de/gemfinrefg/__7.html).

With Berlin's 2024 assessment rate of 410% and the federal multiplier of 14.5, the federal share of
gross Berlin trade tax is `14.5 / 410 = 3.5366%`; Berlin retains approximately 96.4634%. Store this
as a statutory calculation linked to the official aggregate, not as a source observation.

### Property and real-estate transfer taxes

Property tax belongs to Berlin itself, not to the borough containing the property. Real-estate
transfer tax is a Land tax; Berlin's official rate is 6%. Neither tax creates a revenue edge to a
Bezirk.

## Taxes on purchases

A purchase may contain more than VAT. This needs to be a prominent exploration surface, because
the route differs by product:

| Illustrative event | Tax layers | Principal initial recipient(s) |
|---|---|---|
| General shop purchase | VAT, generally 19% or qualifying 7% | Federation, Länder, municipalities through the VAT system |
| Petrol or diesel | VAT plus energy tax | Shared VAT route; energy tax to Federation |
| Beer | VAT plus beer tax | Shared VAT route; beer tax to Länder |
| Tobacco | VAT plus tobacco tax | Shared VAT route; tobacco tax to Federation |
| Electricity | VAT plus electricity tax | Shared VAT route; electricity tax to Federation |
| Insurance premium | Insurance tax | Federation |
| Property purchase | Real-estate transfer tax | Land where the property is situated |

The VAT rates come from [§12 Umsatzsteuergesetz](https://www.gesetze-im-internet.de/ustg_1980/__12.html).
The interface should use event presets—supermarket, fuel, beer, insurance, property—rather than a
personal tax-return questionnaire.

### VAT is not local to the purchase

VAT paid at a Berlin shop does not stay in Berlin. The transaction enters the national aggregate,
then passes through:

```text
national VAT aggregate
  → annual vertical allocation
    → federal share
    → Länder pool
      → population allocation and fiscal equalisation
    → municipal share
      → statutory municipal distribution key
```

[§1 Finanzausgleichsgesetz](https://www.gesetze-im-internet.de/finausglg_2005/__1.html) sets base
shares, but annual fixed-euro adjustments change the effective result materially. The official
2024 totals imply:

| 2024 VAT allocation | Amount | Effective share |
|---|---:|---:|
| Federation | €145.334bn | 48.1010% |
| Länder | €148.379bn | 49.1088% |
| Municipalities | €8.431bn | 2.7903% |

Berlin's municipal VAT key for 2024–2026 is `0.042022533` under the
[official key regulation](https://www.gesetze-im-internet.de/ustschlfestv_2024/BJNR11D0A0023.html).
The Länder VAT branch and the municipal VAT branch are separate formula systems and should remain
separate in the graph.

## Länder equalisation and Berlin

The post-2020 system adjusts Länder fiscal capacity inside the distribution of the Länder VAT
share. The graph may show additions and deductions around a common pool, but should not claim that
Bavaria directly wires an identified amount to Berlin.

The official [2024 BMF calculation](https://www.bundesfinanzministerium.de/Content/DE/Downloads/Oeffentliche-Finanzen/Foederale-Finanzbeziehungen/Bundestaatlicher-Finanzausgleich/abrechnung-ausgleichsjahr-2024.pdf?__blob=publicationFile&v=3)
reports for Berlin:

| Berlin, 2024 | Official amount/status |
|---|---:|
| Population-based initial Länder VAT share | €6.526007bn |
| Equalisation addition | €3.942990bn |
| Initial fiscal strength | 77.4% |
| Municipal VAT component | €354.276m |
| Federal supplementary grants | about €1.860bn |

Berlin, Hamburg, and Bremen receive a 135% city-state population weighting in relevant parts of
the calculation. The adjustment generally closes 63% of the measured positive or negative gap.
The BMF still described the 2024 and 2025 calculations as provisional on 2026-06-24; the UI must
preserve that qualifier.

## Berlin's dual status

Berlin is simultaneously a Land and a municipality. Its tax node should visibly say
`Land + municipality`.

Berlin's twelve boroughs are administrative units, not independent municipalities or tax owners.
The official [Berlin description of borough administration](https://www.berlin.de/sen/inneres/buerger-und-staat/verfassungs-und-verwaltungsrecht/berliner-bezirke/bezirksorganisation-und-verwaltung/artikel.29993.php)
and [Article 85 of the Berlin Constitution](https://www.berlin.de/rbmskzl/politik/senat/verfassung/artikel.41499.php)
show that boroughs receive global allocations within the Berlin budget.

The route is therefore:

```text
tax allocation → Berlin budget → borough global allocation → borough service/programme
```

not:

```text
tax allocation → Mitte / Neukölln / Pankow / ...
```

A borough map is useful only after the Berlin budget boundary, as administrative spending or
service-delivery context.

## Berlin's 2024 tax account

The official [Berlin 2024 tax-revenue table](https://www.berlin.de/sen/finanzen/steuern/steuereinnahmen/2024/artikel.1653286.php)
records €27.302326bn for Berlin. Its structure is unusually valuable because it separates Berlin's
Land and municipal roles.

| Group | 2024 amount |
|---|---:|
| Land share of joint taxes | €19.308385bn |
| Land taxes | €1.445363bn |
| Municipal taxes | €3.770264bn |
| Municipal share of joint taxes | €2.778314bn |
| **Total** | **€27.302326bn** |

Selected rows include:

- Land VAT and import-VAT shares: €9.105159bn and €1.488726bn;
- municipal VAT share: €351.392m;
- Land wage-tax share: €5.182891bn;
- municipal wage/assessed-income share: €2.315487bn;
- gross trade tax: €3.011215bn, with a negative €262.074m trade-tax levy;
- property tax: €870.447m;
- real-estate transfer tax: €910.834m.

These values describe Berlin's legal receipts. They still do not explain total Berlin expenditure;
the complete budget also contains transfers, fees, borrowing/reserves, and other revenue.

## The budget boundary

[§8 Bundeshaushaltsordnung](https://www.gesetze-im-internet.de/bho/__8.html) and Berlin's
[§8 Landeshaushaltsordnung](https://gesetze.berlin.de/bsbe/?query=DOKNR%3Ajlr-HOBE2009pP8&source=PermaLink)
establish the general coverage principle: except for lawful earmarking, all revenue finances all
expenditure.

At this node, the visual language must change:

- tax-coloured routing lines end;
- the recipient account reconciles all financing sources;
- spending begins with a different colour/line treatment;
- the label says `whole-budget spending context`, not `your tax funded this`.

Documented earmarks may form explicit exceptions, but they require their own legal basis and
cannot be inferred from similar names.

## Spending evidence by recipient

### Comparable Germany-wide actuals

Destatis statistic [71141](https://genesis.destatis.de/datenbank/online/statistic/71141/details)
provides aggregate annual public-finance results. The richer machine-readable publication is the
[2021 Rechnungsergebnisse XLSX](https://www.destatis.de/DE/Themen/Staat/Oeffentliche-Finanzen/Ausgaben-Einnahmen/Publikationen/Downloads-Ausgaben-und-Einnahmen/statistischer-bericht-rechnungsergebnis-oeffentlicher-haushalt-2140310217015.xlsx?__blob=publicationFile&v=2),
especially sheet/table `71711-12`.

It supplies Germany and all Länder, including combined Land-and-municipal observations by state,
roughly sixty selected functions, multiple hierarchy levels, and alternative expenditure/revenue
measures. Use:

- `Bereinigte Ausgaben` for consolidated system spending;
- net expenditure for the amount financed by the displayed level itself;
- gross expenditure only when displaying transfer edges.

These measures are alternate views, not values to add together. Organizational, functional, and
economic classifications are also alternate views of the same underlying expenditure.

### Federal actuals

The [Bundeshaushalt download portal](https://www.bundeshaushalt.de/DE/Download-Portal/download-portal.html)
exposes the official 2024 actual account as machine-readable XML at
[`rechnung_2024.xml`](https://www.bundeshaushalt.de/static/daten/2024/ist/rechnung_2024.xml).
It contains `Einzelplan → Kapitel → Titel`, purpose text, functional codes, plan, and actual amounts.

Federal special funds remain separate accounts. A federal transfer to a fund and the fund's later
programme expenditure are not two terminal uses of money.

### Berlin actuals and plans

The official [Berlin 2024/25 open-budget dataset](https://daten.berlin.de/datensaetze/doppelhaushalt-2024-2025-1418812)
has rich title-level organization, function, and economic classification, but direct inspection
found only `Soll` rows. It is plan data, even though its metadata describes an amount-type field.

The authoritative [Berlin 2024 annual account](https://www.parlament-berlin.de/ados/19/IIIPlen/vorgang/d19-2681.pdf)
is an 88-page PDF. It supplies final cash/cameral reconciliation and actual expenditure by
three-digit function, but no official title-level actual CSV was found.

The plan CSV contains both central and borough titles. Raw summation may double-count a central
allocation and the borough's later spending. A Berlin transfer ledger is mandatory.

### Statutory social insurance

Social-insurance contributions are a separate source branch because they are assigned to
statutory systems. Those systems also receive public grants.

The cross-system integration source is BMAS' [Sozialbudget](https://www.bmas.de/DE/Service/Publikationen/Broschueren/a230-25-sozialbudget-2024.html).
Detailed recipient accounts are available from:

- [German statutory pension insurance](https://www.deutsche-rentenversicherung.de/DRV/DE/Experten/Zahlen-und-Fakten/Kennzahlen-zur-Finanzentwicklung/kennzahlen-zur-finanzentwicklung_node.html);
- [statutory health-insurance financial results](https://www.bundesgesundheitsministerium.de/themen/krankenversicherung/zahlen-und-fakten-zur-krankenversicherung/finanzergebnisse/);
- [long-term care financial statistics](https://www.bundesgesundheitsministerium.de/themen/pflege/pflegeversicherung-zahlen-und-fakten);
- [Federal Employment Agency annual reports](https://www.arbeitsagentur.de/ueber-uns/veroeffentlichungen/berichte-und-haushalt).

Federal grants to a social system are federal expenditure, social-system revenue, and eventually
benefit expenditure. A consolidated view must turn the grant into a transfer edge and count only
the final benefit as terminal spending.

## EU route

The official [BMF 2024 tax report](https://www.bundesfinanzministerium.de/Monatsberichte/Ausgabe/2025/01/Inhalte/Kapitel-4-Wirtschafts-und-Finanzlage/4-2-steuereinnahmen-dezember-2024.html)
reports €32.011bn of EU own resources including customs:

- customs: €5.463bn;
- VAT-based own resource: €5.448bn;
- GNI-based resource: €19.722bn;
- plastics resource: €1.378bn.

The VAT-based own resource is calculated from a harmonized assessment base. It is not an
identifiable percentage of VAT on a Berlin purchase.

## Primary statistical inputs and access

Destatis GENESIS statistic [71211](https://genesis.destatis.de/datenbank/online/statistic/71211/details)
is the primary national cash-tax series. Table `71211-0001` contains named taxes before
distribution; the statistic also offers after-distribution and Länder tables. In 2024 it records
€947.706848bn of total tax receipts before distribution.

The production table set is:

| Table | Geography | Meaning |
|---|---|---|
| `71211-0001` | Germany | annual named taxes before distribution |
| `71211-0002` | Germany | annual recipients after distribution |
| `71211-0101` | 16 Länder | annual named taxes before distribution |
| `71211-0102` | 16 Länder | annual recipients after distribution |

The relevant dimensions are `JAHR`, `DINSG` or `DLAND` (`11` for Berlin), `START1` before
distribution, `STAT10` after distribution, and measure/unit `STEU01$QMU`. Important
after-distribution positions include total `STEUERNVINS10`, EU `STEUERNVEU10`, Federation
`STEUERNVB10`, Länder `STEUERNVL10`, municipalities `STEUERNVK10`, Länder fiscal-capacity
equalisation `STEUERNVL71`, federal supplementary grants `STEUERNVB66`, municipal net trade tax
`STEUERARTK301`, municipal income-tax family `STEUERNVG601`, and municipal VAT share
`STEUERNVG40`.

The after-distribution table loses some named-tax resolution: corporation tax is combined with
non-assessed yield taxes, and domestic/import VAT are combined. The graph must use statutory
derivations or Berlin's more detailed recipient source instead of pretending the national table
contains separate observed destinations.

For individual municipalities, Regionalstatistik table `71231-01-03-5` supplies actual property
and trade-tax receipts, assessment rates, net trade tax, municipal income/VAT shares, and tax
capacity. The directly verified municipality flat file was 2023, while national/Land `71231`
tables reach 2024. A municipality layer must expose that older vintage; standardized
`Steuereinnahmekraft` is a capacity measure, not cash received.

GENESIS automated access currently uses authenticated REST/JSON POST requests. The official
[web-service guide](https://genesis.destatis.de/datenbank/online/docs/GENESIS-Webservices_Introduction.pdf)
states that the former GET/SOAP access was shut off in July 2025. Browser table access remains
public; a collector must not confuse public access with unauthenticated API access.

Destatis and BKG datasets checked here use Data Licence Germany – Attribution 2.0. Berlin's
open-budget CSV is CC BY. Where a publisher's page did not make reuse terms clear enough, this
research records `licence_unverified` and forbids redistributing the raw file until resolved.

For maps, BKG's [VG250 administrative-boundaries service](https://gdz.bkg.bund.de/index.php/default/open-data/wfs-verwaltungsgebiete-1-250-000-stand-01-01-wfs-vg250.html)
provides Länder boundaries through WFS, including browser-ready GeoJSON from layer `vg250_lan`.

## Required graph contract

### Edge kinds

```text
exclusive_assignment
fixed_share
decomposition_adjustment
annual_formula
equalisation_adjustment
supplementary_grant
interbudget_transfer
budget_boundary
contextual_spending
```

### Evidence status

```text
exact_statute
calculated_official
provisional_official
formula_dependent
not_individually_traceable
budget_boundary
contextual_spending
```

Every observation and edge also requires:

- reference year and effective dates;
- actual, planned, provisional, or forecast status;
- cash/cameral, financial-statistics, or ESA-accrual basis;
- entity, geography basis, scope, and consolidation level;
- classification/version and unit;
- direct source, extraction coordinates, retrieval date, and licence;
- calculation expression and inputs for derived edges.

### Transfer ledger

Every cross-account payment needs:

```text
from_entity
to_entity
amount
reference_year
accounting_basis
source_title_or_group
consolidation_scope
transfer_or_terminal_spend
```

Without this ledger, federal grants, Berlin borough allocations, special funds, and social-system
payments will be double-counted.

### Reconciliation

Reconcile each recipient account separately:

```text
taxes
+ contributions, where relevant
+ grants/transfers received
+ fees and other revenue
+ borrowing, reserves, and financing items
= expenditure
+ transfers paid
+ closing/financing adjustments
```

Do not force tax revenue alone to equal total outlays. Do not equate financing deficit with debt
change. Use source-rounding bounds rather than arbitrary percentage tolerances.

## Recommended D3 realization

One page can hold multiple coordinated views without becoming a scrolling landing page:

1. **Overview graph:** named tax families and contributions entering their legal recipients.
2. **Tax route:** an alluvial or directed-flow view, whose topology changes by selected tax/event.
3. **Equalisation:** a Länder map plus pooled additions/deductions—no fictitious bilateral wires.
4. **Recipient account:** rebase the graph on Federation, Berlin, EU, or a social system.
5. **Spending drill-down:** partition/treemap/sunburst for that account, after the boundary marker.
6. **Berlin service view:** borough map only after entering the Berlin account.

The same title or observation may be viewed by organization, function, or economic type, but
these modes must never appear as additive siblings.

## What can work

- Precise named-tax routing at constitutional and statutory stages.
- Exact aggregate cash receipts and many exact official allocation results.
- Purchase-event presets revealing VAT plus product-specific taxes.
- A distinctive Berlin path showing its Land-plus-municipality status.
- A truthful pooled map of Länder fiscal-capacity adjustments.
- Reconciled recipient accounts with visible transfers and financing bridges.
- Deep federal 2024 actual title drill-down.
- Berlin 2024 actual function drill-down and separately labelled title-level plans.
- Germany/Länder comparable 2021 actual functions.
- Separate social-insurance branches and spending accounts.

## What cannot work honestly

- One combined “Germany tax pool.”
- One seamless current-year actual Sankey from every tax to every programme.
- A claim that VAT from a Berlin purchase stays in Berlin.
- Direct Bavaria-to-Berlin equalisation wires under the post-2020 system.
- Berlin boroughs as tax recipients.
- An exact personal municipal income-tax allocation from public aggregate data.
- A claim that a named tax funded a named programme after entering a general budget.
- A claim that the EU receives a traceable slice of an individual VAT purchase.
- Calling Berlin's open title CSV actual spending.
- Adding functional, organizational, and economic views of the same expenditure.
- Adding government levels, special funds, or social insurers without eliminating transfers.
- Mixing 2021, 2024, and 2025 inside one total without visible vintage changes.
- Treating deficit as debt change.

## Recommended implementation order

1. Replace the old consolidated-ESA-first plan and schema with the fiscal-graph contract above.
2. Build a small 2024 route dataset for income tax, VAT, trade tax, property/real-estate transfer
   tax, and the most understandable purchase excises.
3. Add the official Berlin 2024 tax account and official 2024 equalisation calculation.
4. Add the budget-boundary interaction before any spending visualization.
5. Ingest federal 2024 XML and Berlin 2024 function actuals as separate recipient accounts.
6. Implement the transfer ledger and reconciliation validators.
7. Add social-insurance accounts and 2021 standardized comparison mode.
8. Only then broaden the tax taxonomy, Länder detail, borough service map, and additional years.

The smallest credible implementation is therefore not another generic overview. It is a vertical
slice demonstrating three materially different routes—wage income, a VAT-bearing purchase, and
Berlin trade/property tax—through Berlin's actual institutions and across the honest budget
boundary.
