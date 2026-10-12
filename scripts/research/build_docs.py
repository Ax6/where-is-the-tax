#!/usr/bin/env python3
"""Generate the source catalog, licence register and dataset index from the registries and the data files.

Writes docs/research/SOURCE_CATALOG.md, DATA_LICENSES.md and data/manifest.json (+ the table in data/README.md
between the markers). Run after the build scripts.
"""
from __future__ import annotations

import json
import re
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import DATA, MANIFEST, ROOT  # noqa: E402


def load_sources() -> list[dict]:
    reg = json.loads((ROOT / "research" / "sources.json").read_text(encoding="utf-8"))["sources"]
    for extra in sorted((ROOT / "research" / "sources.d").glob("*.json")):
        reg.extend(json.loads(extra.read_text(encoding="utf-8"))["sources"])
    return reg


def source_catalog(sources: list[dict], manifest: dict):
    files_by_src: dict[str, list[dict]] = {}
    for f in manifest["files"]:
        files_by_src.setdefault(f["source_id"], []).append(f)
    lines = [
        "# Source catalog", "", f"**Generated:** {date.today().isoformat()} by `scripts/research/build_docs.py` from `research/sources.json`, `research/sources.d/*.json` and `research/raw/MANIFEST.json`. Do not edit by hand.", "",
        "Every file below was downloaded by `scripts/research/fetch.py`; `committed` files live in `research/raw/`, the others in the git-ignored `research/cache/` (re-fetchable, checksum pinned).", "",
        "| Source id | Institution / dataset | Basis | Licence | Redistribution | Files (bytes, retrieved) |", "|---|---|---|---|---|---|",
    ]
    for s in sources:
        fl = files_by_src.get(s["id"], [])
        flist = "<br>".join(f"`{f['file']}` ({f['bytes']:,} B, {f['retrieved'][:10]}{'' if f['committed'] else ', cache'})" for f in fl)
        lines.append(f"| `{s['id']}` | {s['institution']}: {s['title']} | {s['basis']} | {s['licence']} | {s['redistribution']} | {flist} |")
    lines += ["", "## Access notes", "",
              "- GENESIS: the public web-application endpoint `https://genesis.destatis.de/genesis/api/rest/tables/<table>/data` returns all years of a table without authentication; labels from `/variables/<code>/values`. It is unversioned, so responses are committed with checksums.",
              "- Eurostat: dissemination API `statistics/1.0/data/<dataset>?geo=DE&...` (JSON-stat 2.0).",
              "- BMF Monatsbericht issue pages follow `Monatsberichte/Ausgabe/YYYY/MM/monatsbericht-MM-YYYY.html`; article URLs are listed in the registry.",
              "- Berlin tax receipts: CKAN package metadata on datenregister.berlin.de gives the monthly CSV URLs (the December file is the full year)."]
    (ROOT / "docs" / "research" / "SOURCE_CATALOG.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def licences(sources: list[dict]):
    lines = ["# Data licences and attribution", "", f"**Generated:** {date.today().isoformat()} by `scripts/research/build_docs.py`. Do not edit by hand.", "",
             "**Rule:** a raw file is committed only if its licence allows redistribution. Otherwise it stays in the git-ignored cache; the numbers taken from it are committed as small extracts with coordinates (facts are not protected), and the source is cited.", "",
             "| Source id | Licence / reuse terms | Evidence | Raw redistribution | Where it lives |", "|---|---|---|---|---|"]
    for s in sources:
        where = "`research/raw/`" if s["redistribution"] == "allowed" and s.get("store", "raw") == "raw" else "`research/cache/` (+ extracts)"
        lines.append(f"| `{s['id']}` | {s['licence']} | {s['licence_evidence']} | {s['redistribution']} | {where} |")
    lines += ["", "## Committed geodata", "", "| Resource | Licence | Attribution |", "|---|---|---|",
              "| `data/geo/de-laender.json` | Data licence Germany – attribution – 2.0 (dl-de/by-2-0) | \"© BKG 2026 dl-de/by-2-0\" with links to bkg.bund.de and govdata.de/dl-de/by-2-0; generalised from VG250 `vg250_lan` (gf=4), modification disclosed |",
              "", "## Required attribution strings for the page", "",
              "- Statistisches Bundesamt (Destatis), GENESIS-Online, table 71211-0001/-0002/-0101/-0102, 12411, 71321; Statistische Berichte 71511, 71711, 71717; retrieval dates per `research/raw/MANIFEST.json`; Datenlizenz Deutschland – Namensnennung – 2.0.",
              "- Source: Eurostat (gov_10a_exp, gov_10a_main, gov_10dd_edpt1, gov_10a_taxag).",
              "- Bundesministerium der Finanzen / bundeshaushalt.de (Haushaltsrechnung 2024, 2025); the official budget documents remain authoritative.",
              "- Senatsverwaltung für Finanzen Berlin (CC BY).",
              "- European Commission, DG Budget: EU budget spending and revenue 2000-2025.",
              "- Statutes: gesetze-im-internet.de (official works)."]
    (ROOT / "DATA_LICENSES.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def dataset_index():
    entries = []
    for path in sorted(DATA.rglob("*.json")):
        rel = path.relative_to(DATA).as_posix()
        if rel in ("manifest.json", "index.json") or rel.startswith("geo/"):
            continue
        try:
            d = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        if not isinstance(d, dict) or "generated_by" not in d:
            entries.append({"path": f"data/{rel}", "id": d.get("id") or d.get("account") or rel, "title": {"de": d.get("title", rel) if isinstance(d.get("title"), str) else rel, "en": d.get("title", rel) if isinstance(d.get("title"), str) else rel},
                            "status": "legacy (superseded, kept until the front end is rewired)", "superseded_by": d.get("superseded_by")})
            continue
        years = d.get("years") or ([d["year"]] if "year" in d else None) or (sorted(d["years"].keys()) if isinstance(d.get("years"), dict) else None)
        entries.append({"path": f"data/{rel}", "id": d["id"], "title": d["title"], "unit": d.get("unit"), "years": years, "basis": d.get("basis"), "generated_by": d["generated_by"], "generated": d.get("generated")})
    out = {"schema_version": 2, "generated": date.today().isoformat(), "datasets": entries}
    (DATA / "manifest.json").write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    rows = ["| File | Id | Title (en) | Years | Built by |", "|---|---|---|---|---|"]
    for e in entries:
        t = e["title"]["en"] if isinstance(e.get("title"), dict) else e.get("title")
        yrs = e.get("years")
        yrs = ", ".join(str(y) for y in yrs) if isinstance(yrs, list) and len(yrs) <= 6 else (f"{yrs[0]}–{yrs[-1]}" if isinstance(yrs, list) else (e.get("status") or ""))
        rows.append(f"| `{e['path']}` | `{e['id']}` | {t} | {yrs} | `{e.get('generated_by') or ''}` |")
    readme = DATA / "README.md"
    text = readme.read_text(encoding="utf-8") if readme.exists() else "# data/\n\n<!-- index -->\n<!-- /index -->\n"
    text = re.sub(r"<!-- index -->.*<!-- /index -->", "<!-- index -->\n" + "\n".join(rows) + "\n<!-- /index -->", text, flags=re.S)
    readme.write_text(text, encoding="utf-8")
    print(f"indexed {len(entries)} datasets")


if __name__ == "__main__":
    sources = load_sources()
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    source_catalog(sources, manifest)
    licences(sources)
    dataset_index()
    print("wrote docs/research/SOURCE_CATALOG.md, DATA_LICENSES.md, data/manifest.json, data/README.md index")
