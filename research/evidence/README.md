# Evidence storage

Production evidence belongs under `research/evidence/<country>/<year>/`, outside the deployable
data tree. Each directory must have a `manifest.json` connecting files to extraction IDs. The
manifest has `schema_version`, `dataset_bundle_id`, `country_code`, `reference_year`, and an
`entries` array. Every extraction has exactly one entry with its `extraction_id` and the same
`evidence` descriptor as `extractions.json`; use `null` only for an intentionally evidence-free
synthetic fixture.

Store a raw response or table export only when its licence and repository size allow it. Otherwise
record the exact retrieval recipe, SHA-256 of the retrieved bytes, access date, and why the bytes
are not redistributed. Never commit credentials, session cookies, or personal data.

Paths in extraction records are relative to that bundle's country/year evidence directory. The
validator rejects paths that escape it and checks every stored artifact against its recorded
SHA-256.

The current `de/2024` directory is reserved for future authorized research. No official evidence
has been collected for it.
