# Source catalog

> Current source preflight: **NOT RESEARCHED**. Dataset names in the plan are leads only until an
> official current endpoint, metadata page, licence, and usable observations are verified.

One row represents a source family or dataset, not an individual observation. Exact retrievals
belong in bundle `extractions.json`; exact observations belong in `provenance.json`.

| Field | Required content |
|---|---|
| Source ID | Stable local ID |
| Institution | Publishing authority |
| Dataset/publication | Official title and code |
| Canonical URL | Current official HTTPS landing page |
| Access | API/table/download method and quirks |
| Dimensions | Required sector/unit/period/classification/status filters |
| Release/vintage | How a specific release is identified |
| Cadence/lag | Dated observation; never assumed permanent |
| Status flags | Meaning of provisional/estimate/forecast markers |
| Licence | Source-specific name, URL, attribution, redistribution limits |
| Last checked | Date and researcher |
| Evidence | Verification links or notes |

## Candidate catalog

| Source ID | Intended role | Verification state |
|---|---|---|
| `eurostat_gov_10a_main` | Revenue and headline aggregates | NOT RESEARCHED |
| `eurostat_gov_10a_taxag` | Compatible tax detail candidate | NOT RESEARCHED |
| `eurostat_gov_10a_exp` | COFOG expenditure | NOT RESEARCHED |
| `destatis_candidate` | Germany-specific verification/context | NOT RESEARCHED |

Do not put a candidate into `sources.json` until every required field above has been checked.
