# Research run: 2026-08-05 Germany fiscal graph

- **Status:** awaiting independent verification
- **Collectors:** Codex primary research pass with three delegated official-source workstreams
- **Independent verifier:** not yet assigned
- **Run opened / closed:** 2026-08-05 / 2026-08-05
- **Selected route/account year:** 2024
- **Selected comparable-system year:** 2021
- **Why:** 2024 is the newest verified coherent year spanning named cash taxes, Berlin tax receipts,
  equalisation, federal title actuals, Berlin final function actuals, and main social-system
  accounts. The latest verified deep standardized public-function file is 2021.
- **Bundle status:** research contract only; no production observations published by this run

## Scope

The run answered the corrected product question:

> How can a person in Berlin drill from named taxes and purchase events through Germany's real
> legal recipients, redistribution, account boundaries, and recipient spending without implying
> false earmarking?

The previous consolidated ESA S.13/COFOG-first hero model was tested and rejected as the primary
product topology. ESA remains a comparison and verification layer.

## Sources and queries checked

### Law and institutional routes

- Basic Law Articles 106 and 107.
- Finanzausgleichsgesetz, Gemeindefinanzreformgesetz, Zerlegungsgesetz.
- Umsatzsteuergesetz §12.
- Bundeshaushaltsordnung §8 and Berlin Landeshaushaltsordnung §8.
- Berlin borough-administration description and Berlin Constitution Article 85.

Exact links and source roles are recorded in `../SOURCE_CATALOG.md` and the full report.

### Tax observations

- Destatis GENESIS statistic 71211:
  - `71211-0001` Germany annual before distribution;
  - `71211-0002` Germany annual after distribution;
  - `71211-0101` Länder annual before distribution;
  - `71211-0102` Länder annual after distribution.
- Dimension IDs verified: `JAHR`, `DINSG`/`DLAND`, `START1`/`STAT10`, `STEU01$QMU`.
- Berlin geography key: `DLAND=11`.
- Berlin official 2024 tax-revenue table and monthly/open CSV family.
- BMF 2024 cash-tax/EU report.
- BMF official 2024 VAT and fiscal-capacity equalisation calculation.

### Spending and financing

- Destatis 71141 aggregate public-finance statistic.
- Destatis 2021 Rechnungsergebnisse workbook, especially `csv-71711-12`.
- Bundeshaushalt portal and 2024 actual XML `rechnung_2024.xml`.
- Berlin 2024/25 open-budget CSV.
- Berlin final 2024 annual account, parliamentary document 19/2681.
- BMAS Sozialbudget; DRV, BMG GKV/care, and BA financial results.

### Geodata and comparison

- BKG VG250 WFS, layer `vg250_lan`, GeoJSON/EPSG:4326 request pattern.
- Eurostat `gov_10a_taxag` metadata for ESA subsector verification and cross-country portability.

### API checks

- GENESIS web-service guide version 5.1 dated 2026-06-01.
- Confirmed documented REST/JSON POST service and authentication requirement.
- Confirmed that former GET/SOAP access was retired in July 2025.
- Noted undocumented public UI JSON endpoints as prototype-only, not a stable production contract.

## Document inspection

The Berlin final 2024 account PDF was downloaded to a temporary workspace and rendered with
Poppler. Pages 79–88 were visually inspected as the three-digit function actual-expenditure
tables. This confirmed that:

- the PDF contains `Ist`, `Ansatz`, `Rechnungssoll`, and remaining amounts by function;
- the final actual is function-level rather than an official title-level CSV;
- the separate Berlin open-budget CSV is plan-only in the inspected 2024/25 rows.

Temporary render files are not publication evidence. A future extraction must record the official
PDF checksum and exact page/table coordinates.

## Decisions and transformations

1. Adopted `tax event → legal allocation → clearing/equalisation → recipient account → budget
   boundary → contextual spending` as the product topology.
2. Selected 2024 for route/account mode and 2021 for standardized comparison mode.
3. Classified Berlin as one `Land + municipality` recipient; boroughs occur after its budget
   boundary.
4. Represented Länder equalisation as adjustments around the Länder VAT pool, not bilateral
   transfers.
5. Separated taxes from social-insurance contributions.
6. Required a complete financing bridge and transfer ledger per recipient account.
7. Defined typed graph-edge and evidence-status vocabularies.
8. Kept ESA/Eurostat data outside the additive cash route; retained it for checking/comparison.
9. Allowed many observations to share one extraction/provenance record, with exact per-observation
   coordinates.

## Reproduced calculations

- Income-tax statutory split: 42.5% Federation / 42.5% Länder / 15% municipalities.
- Flat withholding-tax split: 44% / 44% / 12%.
- Berlin trade-tax federal levy at 410% assessment rate: `14.5 / 410 = 3.5366%` of gross receipt.
- 2024 effective VAT allocation from official totals:
  - Federation €145.334bn / 48.1010%;
  - Länder €148.379bn / 49.1088%;
  - municipalities €8.431bn / 2.7903%.
- Berlin 2024 official tax groups sum to €27.302326bn.

These require independent reproduction before production use.

## Discrepancies and failed approaches

### Old one-pool/consolidated-first model

It cannot represent named tax ownership, Berlin's dual status, VAT allocation, residence and
establishment decomposition, or equalisation. It is retained only as an obsolete prototype/data
contract pending rewrite.

### Berlin plan metadata versus rows

The 2024/25 open-data metadata describes amount type in a way that suggests actuals might be
present. Direct CSV inspection found 23,858 2024 `Soll` rows and 23,865 2025 `Soll` rows, with no
`Ist` rows. Treat the file as plan-only.

### Berlin actual depth

The official final account supplies actual functions in PDF, but no official title-level actual
CSV was found. Do not interpolate plan titles into actuals.

### Federal actual machine access

The official portal was directly queried for 2024 and returned a title-level actual XML resource.
A subsequent attempt to confirm the 2025 resource list was not completed. The 2024 resource is the
verified production anchor for this run.

### Data vintage mismatch

Current tax results are newer than the deepest standardized public-function result. No honest
single-current-year deep tree exists in the checked sources. The interface must switch modes or
show the branch year explicitly.

### Licensing gaps

Reuse terms were not explicit enough on several BMF/BMAS/BMG/DRV/BA/PDF pages. Their entries remain
`licence_unverified`; the project may link and cite them but should not redistribute raw copies
until terms are resolved.

### Destatis access wording

Public web-table access is free, but the current documented automated API requires authentication.
Any earlier note saying the current API is registration-free is superseded.

## Verification results

No independent verification was performed. Delegated parallel research and primary synthesis are
not a substitute for a reviewer independently reproducing the source coordinates and arithmetic.

Required verifier priorities:

1. reproduce 2024 Destatis before/after tax totals and Berlin coordinates;
2. reproduce the effective VAT shares and Berlin equalisation rows;
3. reproduce the Berlin tax table sum and trade-tax derivation;
4. validate federal XML hierarchy and Berlin PDF function extraction;
5. verify all licences currently marked unresolved;
6. test every prohibited interface claim against fixtures/validators.

## Files produced or changed

- [x] `GERMANY_FISCAL_GRAPH_2026-08-05.md`
- [x] `SOURCE_CATALOG.md`
- [x] `DATA_LICENSES.md`
- [x] `RESEARCH_LEARNINGS.md`
- [x] `COLLECTION_PLAYBOOK.md`
- [x] `RESEARCH_PROMPT.md`
- [x] this dated log
- [ ] production dataset files
- [ ] raw evidence manifest/files
- [ ] independently verified observation bundle

## Final gate

- [x] Reference years and their rationale are documented.
- [x] Product topology and prohibited claims are documented.
- [x] Candidate source families, access, status, and known licence state are catalogued.
- [ ] Every production value has exact provenance and known status.
- [ ] Recipient accounts reconcile within source-rounding bounds.
- [ ] Transfers are identified and eliminated inside consolidated totals.
- [ ] Every redistributed raw source has verified reuse terms.
- [ ] Independent review is complete.
- [ ] Production validation and rendered inspection pass.
