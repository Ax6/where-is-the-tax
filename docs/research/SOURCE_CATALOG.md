# Source catalog

**Last checked:** 2026-08-05

**State:** researched; individual observations still require extraction records and independent
verification before publication.

One source row may support many observations. Store one extraction per official query/download and
give every observation exact dimension or document coordinates.

## Production and verification sources

| Source ID | Institution / dataset | Product role | Access and coordinates | Basis, vintage, status | Licence / reuse state |
|---|---|---|---|---|---|
| `de_destatis_71211_pre` | Destatis GENESIS `71211-0001`, `-0101` | Named taxes before distribution, Germany/Länder | [Statistic](https://genesis.destatis.de/datenbank/online/statistic/71211/details); `JAHR`, `DINSG` or `DLAND`, `START1`, `STEU01$QMU`; Berlin `DLAND=11` | Cash receipts; annual through 2025; preserve cell flags | Data Licence Germany Attribution 2.0; attribution and modifications required |
| `de_destatis_71211_post` | Destatis GENESIS `71211-0002`, `-0102` | After-distribution recipients: EU, Bund, Länder, municipalities and sub-lines | Same statistic; recipient dimension `STAT10`; exact table code per extraction | Cash receipts; annual through 2025; some categories are combined after distribution | Data Licence Germany Attribution 2.0 |
| `de_destatis_71211_short_period` | Destatis GENESIS `71211-0003`–`0006`, `0103`–`0104` | Monthly/quarterly freshness, not coherent annual hero | Document exact table and time slice | Cash; incomplete municipal coverage at short frequency | Data Licence Germany Attribution 2.0 |
| `de_destatis_71231` | Destatis GENESIS/Regionalstatistik real-tax comparison | Property/trade tax, assessment rates, municipal shares and tax capacity | [Catalog](https://genesis.destatis.de/datenbank/online/statistic/71231/details); municipal flat file `71231-01-03-5_00.csv` | National/Land through 2024; verified municipality flat file 2023; tax capacity is not cash | Data Licence Germany Attribution 2.0 |
| `de_berlin_tax` | Berlin Senate Finance, tax receipts | Berlin's separate Land and municipal tax receipts | [2024 table](https://www.berlin.de/sen/finanzen/steuern/steuereinnahmen/2024/artikel.1653286.php); [open-data catalog](https://daten.berlin.de/datensaetze/0d0246b0-9cca-4696-928b-ed3e818a1995); prefer CSV over HTML | Monthly/cumulative cash actual; 2024 and 2025 verified | CC BY; attribution `Senatsverwaltung für Finanzen Berlin` |
| `de_law_gg_106_107` | Federal law, Basic Law Articles 106–107 | Constitutional assignment and equalisation frame | [Art. 106](https://www.gesetze-im-internet.de/gg/art_106.html); [Art. 107](https://www.gesetze-im-internet.de/gg/art_107.html) | Law; store effective dates for historical years | Federal legal text; cite/link, do not treat as numeric dataset |
| `de_law_tax_distribution` | FAG, Gemeindefinanzreformgesetz, Zerlegungsgesetz | Fixed shares, annual VAT formula, municipal formulas, decomposition, trade-tax levy | [FAG](https://www.gesetze-im-internet.de/finausglg_2005/); [GemFinRefG](https://www.gesetze-im-internet.de/gemfinrefg/); [Zerlegungsgesetz](https://www.gesetze-im-internet.de/zerlg_1998/) | Law; year-dependent parameters and keys | Federal legal text; cite exact section/effective year |
| `de_bmf_equalisation` | BMF annual VAT allocation and fiscal-capacity equalisation calculation | Official Land additions/deductions, Berlin values, supplementary grants | [2024 calculation](https://www.bundesfinanzministerium.de/Content/DE/Downloads/Oeffentliche-Finanzen/Foederale-Finanzbeziehungen/Bundestaatlicher-Finanzausgleich/abrechnung-ausgleichsjahr-2024.pdf?__blob=publicationFile&v=3); table/page coordinates required | 2024 and 2025 currently labelled provisional by publisher | `licence_unverified`; link evidence, do not redistribute snapshot yet |
| `de_bmf_tax_eu` | BMF annual cash-tax report | Official vertical allocation and EU own-resource totals | [December 2024 report](https://www.bundesfinanzministerium.de/Monatsberichte/Ausgabe/2025/01/Inhalte/Kapitel-4-Wirtschafts-und-Finanzlage/4-2-steuereinnahmen-dezember-2024.html) | Cash actual; annual report | `licence_unverified` |
| `de_budget_boundary` | BHO §8 / Berlin LHO §8 | Evidence that general-budget revenue is not tax-to-programme earmarking | [BHO §8](https://www.gesetze-im-internet.de/bho/__8.html); [Berlin LHO §8](https://gesetze.berlin.de/bsbe/?query=DOKNR%3Ajlr-HOBE2009pP8&source=PermaLink) | Legal rule | Cite/link exact section |
| `de_destatis_71141` | Destatis GENESIS statistic 71141 | Headline public expenditure/revenue and function aggregates | [Statistic](https://genesis.destatis.de/datenbank/online/statistic/71141/details) | Standardized annual public-finance statistics; inspect table metadata per extraction | Data Licence Germany Attribution 2.0 |
| `de_destatis_71711_2021` | Destatis Rechnungsergebnisse 2021, especially `71711-12` | Deep comparable Germany/Länder/core-plus-extra-budget functions | [Official XLSX](https://www.destatis.de/DE/Themen/Staat/Oeffentliche-Finanzen/Ausgaben-Einnahmen/Publikationen/Downloads-Ausgaben-und-Einnahmen/statistischer-bericht-rechnungsergebnis-oeffentlicher-haushalt-2140310217015.xlsx?__blob=publicationFile&v=2); sheet and row coordinates required | Final 2021; gross/adjusted/net semantics; newest deep comparable file verified | Data Licence Germany Attribution 2.0; confirm workbook notice in extraction |
| `de_federal_actual_2024` | Bundeshaushalt actual account XML | Federal `Einzelplan → Kapitel → Titel` actuals | [Download portal](https://www.bundeshaushalt.de/DE/Download-Portal/download-portal.html); [official XML](https://www.bundeshaushalt.de/static/daten/2024/ist/rechnung_2024.xml) | Federal core-budget cash/cameral actual 2024; special funds separate | Portal states public data may be reused/processed; record portal notice and attribution |
| `de_berlin_plan_2024_25` | Berlin double budget open data | Title-level planned organization/function/economic views | [Catalog](https://daten.berlin.de/datensaetze/doppelhaushalt-2024-2025-1418812); direct CSV recorded in extraction | Plan only: direct inspection found 2024/25 `Soll`, no `Ist` rows | CC BY; attribution `Senatsverwaltung für Finanzen` |
| `de_berlin_actual_2024` | Berlin Parliament annual and asset account, document 19/2681 | Final Berlin reconciliation and three-digit function actuals | [Official PDF](https://www.parlament-berlin.de/ados/19/IIIPlen/vorgang/d19-2681.pdf); function table PDF pages 79–88 | Cash/cameral final actual 2024; no official title-level actual CSV found | `licence_unverified`; store extraction/checksum, do not redistribute PDF |
| `de_berlin_borough_structure` | Berlin Senate / Constitution | Borough legal status and global allocations | [Administration](https://www.berlin.de/sen/inneres/buerger-und-staat/verfassungs-und-verwaltungsrecht/berliner-bezirke/bezirksorganisation-und-verwaltung/artikel.29993.php); [Constitution Art. 85](https://www.berlin.de/rbmskzl/politik/senat/verfassung/artikel.41499.php) | Institutional rule | Cite/link |
| `de_bmas_socialbudget` | BMAS Sozialbudget | Cross-system social benefits and financing integration | [2024 publication](https://www.bmas.de/DE/Service/Publikationen/Broschueren/a230-25-sozialbudget-2024.html); downloadable CSVs | 2024 values may include preliminary observations; preserve status | `licence_unverified` |
| `de_drv_actual` | Deutsche Rentenversicherung financial indicators/time series | Statutory pension revenue and spending | [Financial indicators](https://www.deutsche-rentenversicherung.de/DRV/DE/Experten/Zahlen-und-Fakten/Kennzahlen-zur-Finanzentwicklung/kennzahlen-zur-finanzentwicklung_node.html) | System account; verify final/preliminary per table | `licence_unverified` |
| `de_bmg_gkv` | BMG GKV financial results | Statutory health service spending detail | [Results page](https://www.bundesgesundheitsministerium.de/themen/krankenversicherung/zahlen-und-fakten-zur-krankenversicherung/finanzergebnisse/) | KJ1 final / KV45 provisional; consolidate Gesundheitsfonds and insurers | `licence_unverified` |
| `de_bmg_care` | BMG social long-term care insurance | Contributions, benefits, administration, reserves and balances | [Statistics page](https://www.bundesgesundheitsministerium.de/themen/pflege/pflegeversicherung-zahlen-und-fakten) | Account is actual without period accrual; status per release | `licence_unverified` |
| `de_ba_actual` | Federal Employment Agency annual account | Contribution-financed unemployment-insurance account | [Reports/archive](https://www.arbeitsagentur.de/ueber-uns/veroeffentlichungen/berichte-und-haushalt) | Keep SGB III separate from tax-financed SGB II | `licence_unverified` |
| `de_bkg_vg250` | BKG WFS VG250 | Länder map and later district/municipal geography | [Product](https://gdz.bkg.bund.de/index.php/default/open-data/wfs-verwaltungsgebiete-1-250-000-stand-01-01-wfs-vg250.html); WFS base `https://sgx.geodatenzentrum.de/wfs_vg250`; layer `vg250_lan` | Annual boundary snapshot; record reference date and reprojection/simplification | Data Licence Germany Attribution 2.0; BKG source note required |
| `eu_eurostat_gov_10a_taxag` | Eurostat detailed taxes/social contributions by receiving subsector | ESA cross-check and future cross-country comparison | [Metadata](https://ec.europa.eu/eurostat/cache/metadata/en/gov_10a_taxag_esms.htm); dissemination API; freeze dimension codebook | Annual ESA accrual, national/subsector—not German Land routing | Eurostat reuse notice to be recorded before redistribution |

## GENESIS access contract

The documented service is:

```text
POST https://genesis.destatis.de/genesisWS/rest/2020/data/tablefile
Content-Type: application/x-www-form-urlencoded
```

The current [official guide](https://genesis.destatis.de/datenbank/online/docs/GENESIS-Webservices_Introduction.pdf)
states that GET/SOAP access was shut off in July 2025. Automated access requires a GENESIS
credential/token. Relevant request fields include table name, content, years/time slices,
regional and classifying variables/keys, format, transpose/compress, job mode, and language.

Undocumented public UI JSON endpoints may be useful for prototypes but are unversioned and must
not be the only production retrieval path.

## Required extraction fields

For every retrieval record:

- source ID and canonical URL;
- retrieval timestamp and collector;
- exact query, table, sheet, page, or row coordinates;
- release/vintage and source checksum where retained;
- unit, year, geography, accounting basis, consolidation, and classification;
- status/quality flags and source rounding;
- licence decision, attribution, and redistribution decision;
- any observed discrepancy or transformation.

Do not promote a source into a publication bundle while its status meaning, accounting context,
or reuse terms remain unresolved.
