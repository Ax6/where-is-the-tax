# Data schema

This document is the machine-readable data contract for `where-is-the-tax`. The normative TypeScript
constants and interfaces live in `src/data/schema.ts`; the validator enforces the rules below.

The current schema version is `1`. A change that alters required fields, meanings, or arithmetic
compatibility must increment the version and include a migration.

## Bundle layout

Each country-year bundle contains `meta.json`, `revenue.csv`, `expenditure.csv`, `sources.json`,
`extractions.json`, and `provenance.json`. `data/index.json` lists publication bundles. Synthetic
fixtures use the same layout but set `dataset_purpose` to `synthetic_test_fixture`; they must never
be copied into the deployable `data/` index.

## CSV rows

Both CSV files have exactly these columns, in order:

`id,parent_id,name,name_official,amount,availability,description,quality,value_kind,mapping,children_coverage,is_residual,provenance_id,notes`

- `amount` is numeric only when `availability=available`. Empty means unavailable, never zero.
- `quality` and `value_kind` are required only for available rows.
- `mapping` is `direct` or `mapped`; it is independent of reported versus derived origin.
- `children_coverage` is `none`, `partial`, or `exhaustive`. This makes reconciliation mechanical.
- `is_residual=true` identifies an explicit derived residual. It cannot conceal a framework,
  sector, period, unit, consolidation, or vintage mismatch.
- Top-level revenue and expenditure IDs are the fixed constants in `src/data/schema.ts`.
- Parent references stay within one CSV, cannot cycle, and have a maximum depth of four.

An additive parent and every child must resolve through provenance to the same statistical
context. `exhaustive` children reconcile to the parent within the sum of recorded source-rounding
bounds. `partial` children may be less than the parent; any balancing residual must be explicit.

## Source, extraction, and observation identity

`sources.json` describes a publication family and its reuse terms. An entry contains an ID,
institution, title, canonical HTTPS landing page, source-specific licence name/URL/attribution, and
notes.

`extractions.json` describes one reproducible retrieval. It includes the source and dataset IDs,
exact query, full statistical context, release/retrieval dates, caveats, collection status, and an
evidence SHA-256. Stored evidence has a path; evidence that cannot be redistributed has a reason
instead. Only a loudly marked synthetic fixture may omit evidence entirely. One extraction may
support many observations. Validation resolves stored paths beneath `research/evidence/`, rejects
path escape, reads the artifact, and verifies its SHA-256.

`research/evidence/<country>/<year>/manifest.json` is the formal evidence inventory for the
bundle. It identifies the bundle and contains exactly one entry per extraction. Each entry repeats
that extraction's evidence descriptor exactly (or `null` for synthetic-only omitted evidence), so
the retrieval audit and stored-artifact inventory cannot silently diverge.

A reported `provenance.json` entry selects exactly one observation from an extraction with
dimension coordinates. It preserves the raw and displayed values, official status flags, mapping,
normalized quality, rounding increment, sign convention, description sources, caveats, and
independent review state.
This is the row-level audit trail; sharing an extraction never means sharing coordinates.

A derived entry has no executable formula string. It stores a structured linear combination:

```json
{
  "operator": "linear_combination",
  "terms": [
    { "provenance_id": "p_total", "coefficient": 1 },
    { "provenance_id": "p_part", "coefficient": -1 }
  ],
  "constant": 0
}
```

The validator resolves the dependency graph, rejects cycles, recalculates the result, and checks
the stored value using the declared rounding rule. Derived records also carry a reviewed quality
label, which must match any displayed row. No formula is evaluated as source code.

An unavailable entry records `not_available` or `not_applicable`, the attempted extraction and
coordinates when relevant, a reason, caveats, and review state. It has no numeric value.

## Metadata and status

`meta.json` identifies the bundle, country, reference year, ESA S.13 context, unit, collection and
review dates, publication status, caveats, and the provenance IDs for headline revenue,
expenditure, and their derived balance. Optional population and GDP denominators require their own
provenance.

Bundle status cannot be more certain than its available observations. `mixed`, provisional,
estimated, and forecast inputs must not be presented as final. Negative official observations are
kept with their sign convention; renderers must not force them into positive-area graphics.

## Fixture policy

Fixtures under `tests/fixtures/` are invented values used to exercise structure and arithmetic.
They are not statements about Germany or any official release. A valid fixture must say so in both
its index and metadata, use example-only sources, and be blocked from the deployable index.
