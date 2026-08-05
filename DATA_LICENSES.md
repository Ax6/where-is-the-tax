# Data licences and attribution

**Checked:** 2026-08-05

**Publication rule:** `licence_unverified` sources may be cited and linked, but their raw files must
not be redistributed in a release bundle until reuse terms are resolved.

| Source ID | Institution/dataset | Licence / reuse state | Required attribution / action | Raw redistribution |
|---|---|---|---|---|
| `de_destatis_71211_pre`, `de_destatis_71211_post`, `de_destatis_71211_short_period`, `de_destatis_71231`, `de_destatis_71141` | Destatis GENESIS / Regionalstatistik | [Data Licence Germany – Attribution – 2.0](https://www.govdata.de/dl-de/by-2-0) | Name Destatis, dataset/table, retrieval date, licence; identify translations, aggregation, rounding, and other modifications | Allowed with conditions |
| `de_destatis_71711_2021` | Destatis Rechnungsergebnisse workbook | Data Licence Germany – Attribution – 2.0 expected for Destatis open data; re-check the exact workbook notice during extraction | Same Destatis attribution plus workbook/table/sheet | Fail closed until file notice recorded in extraction |
| `de_berlin_tax`, `de_berlin_plan_2024_25` | Berlin Senate Finance open data | CC BY | `Senatsverwaltung für Finanzen Berlin`; link source and identify modifications | Allowed with conditions |
| `de_federal_actual_2024` | Bundeshaushalt download portal | Portal states its public data may be reproduced, processed, combined, and used commercially; official legal documents remain authoritative | Name Bundesministerium der Finanzen / Bundeshaushalt, year, resource, retrieval date, and modifications | Allowed subject to recorded portal notice |
| `de_bkg_vg250` | BKG VG250 | Data Licence Germany – Attribution – 2.0 | Required linked `BKG` and licence identifier; include the BKG data-source note and identify simplification/reprojection/TopoJSON conversion | Allowed with conditions |
| `de_bmf_equalisation`, `de_bmf_tax_eu` | BMF reports/calculations | `licence_unverified` | Cite/link official page or document; verify before storing source PDF/XLSX in a public bundle | No, pending verification |
| `de_berlin_actual_2024` | Berlin Parliament annual account PDF | `licence_unverified` | Cite/link official document; record checksum privately; verify before redistribution | No, pending verification |
| `de_bmas_socialbudget`, `de_drv_actual`, `de_bmg_gkv`, `de_bmg_care`, `de_ba_actual` | BMAS, DRV, BMG, BA social-system publications | `licence_unverified` | Cite/link; verify each downloadable file and attribution requirement separately | No, pending verification |
| `eu_eurostat_gov_10a_taxag` | Eurostat | Eurostat reuse notice not yet recorded in this repository | Verify current notice and required source statement before production redistribution | No, pending verification |

Federal and Berlin legal texts are cited as legal evidence, not republished as raw datasets.

For every publication-bundle source, the extraction record must contain:

| Field | Requirement |
|---|---|
| Source ID | Match `docs/research/SOURCE_CATALOG.md` |
| Licence name and URL | Exact terms that apply to the retrieved resource |
| Required attribution | Ready-to-render wording and links |
| Redistribution decision | allowed / not allowed / unresolved |
| Modification disclosure | Translation, filtering, aggregation, rounding, derivation, geometry conversion |
| Checked on/by | Date and independent verifier |

Synthetic files under `tests/fixtures/` are original test material and make no official-data
claim. Their example URLs and licence labels are intentionally non-authoritative.

## Committed geodata

| Resource | Licence | Attribution | Notes |
|---|---|---|---|
| `data/geo/de-laender.json` | Data licence Germany – attribution – 2.0 (dl-de/by-2-0) | "© BKG 2026 dl-de/by-2-0" with links to bkg.bund.de and govdata.de/dl-de/by-2-0, plus the BKG Datenquellen PDF | Generalised (simplified, rounded, small islands dropped) from BKG VG250 `vg250_lan` (gf=4); modification disclosed per licence. Verified 2026-08-05. |
