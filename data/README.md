# data/ — rationalized artifacts for the front end

Built from `research/` by `scripts/research/build_*.py` (see `research/README.md` for the
conventions, reference years and provenance rules). `data/manifest.json` is the machine-readable
index; the table below is generated from it by `scripts/research/build_docs.py`.

Rules for whoever wires the front end:

- Read the `basis`, `unit` and `status` of every file. Never add values across files with
  different bases (cash vs ESA accrual vs statute) or years.
- `label.de` / `label.en` exist on every row; use them, do not re-translate.
- The old `data/index.json` and `data/de/2024/`, `data/de/2021/` trees are **legacy**: they were
  built in August 2026 without stored raw material. Every figure in them has been reproduced by the
  new builds (see `docs/research/logs/2026-10-09-*.md`), and each legacy file now has a
  `superseded_by` pointer. They stay only until `src/` stops importing them.

<!-- index -->
| File | Id | Title (en) | Years | Built by |
|---|---|---|---|---|
| `data/de/2024/accounts/berlin-functions.json` | `de_berlin_budget` | Berlin budget — actual spending 2024 | legacy (superseded, kept until the front end is rewired) | `` |
| `data/de/berlin/functions-2024.json` | `de.berlin.functions_2024` | Berlin expenditure by function 2024 (annual account) | 2024 | `scripts/research/build_berlin.py` |
| `data/de/berlin/tax-receipts.json` | `de.berlin.tax_receipts` | Tax receipts of Berlin (Land and municipal roles) |  | `scripts/research/build_berlin.py` |
| `data/de/citizen/payslip-examples.json` | `de.citizen.payslip_examples` | Worked examples: gross → net 2024-2026 |  | `scripts/research/build_payslip.py` |
| `data/de/citizen/payslip-parameters.json` | `de.citizen.payslip_parameters` | Statutory payslip parameters 2024-2026 |  | `scripts/research/build_payslip.py` |
| `data/de/citizen/purchase-taxes.json` | `de.citizen.purchase_taxes` | Taxes inside everyday purchases |  | `scripts/research/build_purchases.py` |
| `data/de/equalisation/2024.json` | `de.equalisation.2024` | VAT distribution, fiscal capacity equalisation and supplementary federal grants, equalisation year 2024 | 2024 | `scripts/research/build_equalisation.py` |
| `data/de/equalisation/2025.json` | `de.equalisation.2025` | VAT distribution, fiscal capacity equalisation and supplementary federal grants, equalisation year 2025 | 2025 | `scripts/research/build_equalisation.py` |
| `data/de/equalisation/laender-meta.json` | `de.equalisation.laender_meta` | Länder: code, name, city-state flag |  | `scripts/research/build_equalisation.py` |
| `data/de/eu/round-trip.json` | `de.eu.round_trip` | Germany and the EU budget: payments and EU spending in Germany |  | `scripts/research/build_eu.py` |
| `data/de/federal/budget-2024.json` | `de.federal.budget_2024` | Federal budget 2024: actual expenditure by function, Einzelplan and Titel, reconciled to the BMF provisional closing | 2024 | `scripts/research/build_federal.py` |
| `data/de/federal/budget-2025.json` | `de.federal.budget_2025` | Federal budget 2025: actual expenditure by function, Einzelplan and Titel, reconciled to the BMF provisional closing | 2025 | `scripts/research/build_federal.py` |
| `data/de/federal/overview.json` | `de.federal.overview` | Federal budget 2023–2025: provisional closing headline figures and special funds | 2023, 2024, 2025 | `scripts/research/build_federal.py` |
| `data/de/government/aggregates.json` | `de.government.aggregates` | General government revenue, expenditure, deficit, interest, debt and GDP (time series) | 1975–2025 | `scripts/research/build_government.py` |
| `data/de/government/cash-by-level.json` | `de.government.cash_by_level` | Cash results of the overall public budget by level and economic type | 2024, 2025 | `scripts/research/build_cash_levels.py` |
| `data/de/government/cofog.json` | `de.government.cofog` | General government expenditure by function (COFOG), consolidated | 1990–2025 | `scripts/research/build_government.py` |
| `data/de/government/revenue-by-subsector-2024.json` | `de.government.revenue_by_subsector_2024` | Taxes and social contributions 2024 by receiving subsector (incl. EU institutions) |  | `scripts/research/build_government.py` |
| `data/de/laender/functions-2022.json` | `de.laender.functions_2022` | Expenditure of Länder and municipalities by function 2022 | 2022 | `scripts/research/build_laender.py` |
| `data/de/municipal/functions-2024.json` | `de.municipal.functions_2024` | Adjusted expenditure of municipalities by product area |  | `scripts/research/build_municipal.py` |
| `data/de/population.json` | `de.population` | Population at 31 December |  | `scripts/research/build_population.py` |
| `data/de/social-insurance/accounts.json` | `de.social_insurance.accounts` | Social insurance: accounts 2024 and 2025 by payer, with transfer ledger | 2024, 2025 | `scripts/research/build_social.py` |
| `data/de/taxes/by-land.json` | `de.taxes.by_land` | Tax receipts by Land, before and after distribution | 2022, 2023, 2024, 2025 | `scripts/research/build_taxes.py` |
| `data/de/taxes/by-recipient.json` | `de.taxes.by-recipient` | Tax receipts after distribution (EU, Federation, Länder, municipalities) | 1999–2025 | `scripts/research/build_taxes.py` |
| `data/de/taxes/by-tax.json` | `de.taxes.by-tax` | Tax receipts by named tax, before distribution | 1999–2025 | `scripts/research/build_taxes.py` |
| `data/de/taxes/legal-allocation.json` | `de.taxes.legal_allocation` | Who receives which tax? Statutory allocation per named tax |  | `scripts/research/build_legal.py` |
<!-- /index -->
