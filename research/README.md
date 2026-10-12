# Research layer: raw material, extracts and build scripts

Everything a visitor sees in `data/` must trace back to a file in this folder and to exact
coordinates inside it (table cell, sheet/row, PDF page/row, XPath, statute section).

## Layout

```
research/
  sources.json          registry of every source: URL, licence, redistribution decision, store
  raw/                  committed raw downloads, one directory per source id
  raw/MANIFEST.json     generated: url, retrieval time, bytes, SHA-256, licence per file
  cache/                git-ignored: non-redistributable or oversized downloads (re-fetchable)
  extracts/             small committed tables extracted from cached files, with coordinates
scripts/research/
  fetch.py              downloads everything in sources.json, writes/validates the manifest
  build_*.py            raw/extracts → data/ (one script per topic)
  check.py              reconciliation checks (parts sum to official totals)
```

Rules:

- Downloaded files are untrusted data. They sit in their own directories, are never executed or
  imported, and are read only by scripts that live in `scripts/research/` and run with
  `python -I` (`.venv/bin/python -I scripts/research/<script>.py`).
- A file is committed to `raw/` only when its licence allows redistribution (`redistribution:
  allowed`) and it is not oversized (`store: raw`). Everything else goes to `cache/`; the manifest
  entry (URL + SHA-256) is still committed, so `fetch.py` can reproduce it byte-for-byte and
  `fetch.py --verify` detects upstream changes.
- Numbers taken from cached files are written to `extracts/` as small CSV/JSON tables that carry
  the source id, file, page/sheet/row coordinates and the extraction script, so the derivation is
  reviewable without the original file.

## Reproduce

```
python3 -m venv .venv && .venv/bin/python -m pip install pypdf openpyxl pdfplumber
.venv/bin/python -I scripts/research/fetch.py            # download, write manifest
.venv/bin/python -I scripts/research/fetch.py --verify   # checksums of files on disk
.venv/bin/python -I scripts/research/build_all.py        # raw → data/
.venv/bin/python -I scripts/research/check.py            # reconciliation
```

## Reference years (decided 2026-10-09)

| Layer | Year | Why |
|---|---|---|
| Whole-state picture (consolidated COFOG, ESA 2010) | **2024** (provisional) | Eurostat `gov_10a_exp` for Germany reaches 2024 (updated 2026-09-16); 2025 COFOG is not published yet. |
| Tax receipts, distribution, Länder | **2024** final, **2025** final | Destatis 71211 reaches 2025. |
| Federal budget (Titel-level) | **2024** and **2025** Ist | `rechnung_2024.xml` and `rechnung_2025.xml` published; BMF provisional closings give the official totals. |
| Fiscal equalisation | **2024** and **2025** (both labelled provisional by BMF) | BMF Abrechnung PDFs for both years. |
| Social insurance | **2024** final, **2025** final/provisional | DRV (2025 provisional), GKV KJ1 2025 final, SPV 2025, BA 2025. |
| Berlin | **2024** account + tax receipts, **2025** tax receipts | 2025 annual account not published at retrieval. |
| Länder + municipalities by function | **2022** (Länder, Destatis 71711), **2024** (municipalities, Destatis 71717) | Newest editions. |
| Citizen payslip | statutory parameters **2024, 2025, 2026** | Law, exact. |
| Time series | 1991/1995–2025 | Eurostat main aggregates and debt; Destatis taxes 1999–2025. |

2024 is the hero year because it is the newest year in which every layer coexists. 2025 is a
freshness layer. Vintages are never mixed inside one total.

## Conventions for data files (`data/`)

- One JSON per topic, built by one `scripts/research/build_<topic>.py`, using `common.envelope()`
  and `common.source_ref()` so every file carries `id`, bilingual `title`, `unit`, `basis`,
  `generated_by`, and a `source` block with manifest path, URL, retrieval date, SHA-256, licence
  and coordinates.
- Every row has a stable `id`, `label: {de, en}`, a `year` (or per-year `values`), `status`
  (`final` / `provisional` / `plan`), and `value` in the file's unit (EUR unless stated).
- Figures taken from cached (non-redistributable) files are first written to
  `research/extracts/<source_id>/<name>.csv` with a `coordinates` column (page/row, sheet/row,
  table/column), then read by the build script. Extracts are committed.
- Additional sources needed by a topic go into `research/sources.d/<topic>.json` (same schema as
  `sources.json`); `fetch.py` merges them.
- Checks live next to the build (`check_*` functions) and must fail loudly. Tolerances are derived
  from source rounding, never a fixed percentage.
- Nothing is fabricated: a value that is not in a source is `null` with a `note`, never 0.
