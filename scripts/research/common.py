"""Shared helpers for the raw → data build scripts. Run every script with `python -I`."""
from __future__ import annotations

import csv
import json
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "research" / "raw"
CACHE = ROOT / "research" / "cache"
EXTRACTS = ROOT / "research" / "extracts"
DATA = ROOT / "data"
MANIFEST = RAW / "MANIFEST.json"

LAND_CODES = {
    "01": "SH", "02": "HH", "03": "NI", "04": "HB", "05": "NW", "06": "HE", "07": "RP", "08": "BW",
    "09": "BY", "10": "SL", "11": "BE", "12": "BB", "13": "MV", "14": "SN", "15": "ST", "16": "TH",
}
LAND_NAMES = {
    "SH": "Schleswig-Holstein", "HH": "Hamburg", "NI": "Niedersachsen", "HB": "Bremen",
    "NW": "Nordrhein-Westfalen", "HE": "Hessen", "RP": "Rheinland-Pfalz", "BW": "Baden-Württemberg",
    "BY": "Bayern", "SL": "Saarland", "BE": "Berlin", "BB": "Brandenburg",
    "MV": "Mecklenburg-Vorpommern", "SN": "Sachsen", "ST": "Sachsen-Anhalt", "TH": "Thüringen",
}


def load_manifest() -> dict[tuple[str, str], dict]:
    m = json.loads(MANIFEST.read_text(encoding="utf-8"))
    return {(f["source_id"], f["file"]): f for f in m["files"]}


_MANIFEST: dict | None = None


def source_ref(source_id: str, file: str, coordinates: str, note: str | None = None) -> dict:
    """Build a provenance block pointing at a manifest entry plus coordinates inside the file."""
    global _MANIFEST
    if _MANIFEST is None:
        _MANIFEST = load_manifest()
    entry = _MANIFEST.get((source_id, file))
    if entry is None:
        raise KeyError(f"{source_id}/{file} is not in research/raw/MANIFEST.json (run fetch.py)")
    ref = {
        "source_id": source_id,
        "file": file,
        "path": entry["path"],
        "url": entry["url"],
        "retrieved": entry["retrieved"],
        "sha256": entry["sha256"],
        "licence": entry["licence"],
        "coordinates": coordinates,
    }
    if note:
        ref["note"] = note
    return ref


def raw_path(source_id: str, file: str) -> Path:
    global _MANIFEST
    if _MANIFEST is None:
        _MANIFEST = load_manifest()
    return ROOT / _MANIFEST[(source_id, file)]["path"]


def write_json(rel: str, payload: dict) -> Path:
    out = DATA / rel
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {out.relative_to(ROOT)}")
    return out


def write_csv(rel: str, header: list[str], rows: list[list], base: Path = DATA) -> Path:
    out = base / rel
    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(header)
        w.writerows(rows)
    print(f"wrote {out.relative_to(ROOT)} ({len(rows)} rows)")
    return out


def envelope(dataset_id: str, title_de: str, title_en: str, unit: str, basis: str, script: str, **extra) -> dict:
    env = {
        "schema_version": 2,
        "id": dataset_id,
        "title": {"de": title_de, "en": title_en},
        "unit": unit,
        "basis": basis,
        "generated": date.today().isoformat(),
        "generated_by": script,
    }
    env.update(extra)
    return env


def jsonstat_cube(path: Path) -> dict:
    """Read a GENESIS public-API response (JSON-stat-like) into {dim: [codes]}, values, status."""
    d = json.loads(path.read_text(encoding="utf-8"))["data"][0]
    dims = []
    for k in d["id"]:
        idx = d["dimension"][k]["category"]["index"]
        codes = sorted(idx, key=lambda c: idx[c]) if isinstance(idx, dict) else list(idx)
        dims.append((k, codes))
    return {"dims": dims, "size": d["size"], "value": d["value"], "status": d["status"]}


def cube_get(cube: dict, **coords) -> tuple[float | None, str]:
    """Value and status flag for one cell, addressed by dimension codes (row-major, JSON-stat)."""
    pos = 0
    for (k, codes), n in zip(cube["dims"], cube["size"]):
        if len(codes) == 1:
            i = 0
        else:
            i = codes.index(coords[k])
        pos = pos * n + i
    v = cube["value"][pos]
    s = cube["status"][pos]
    return (None if v is None or s in ("-", "x", ".") else float(v)), s


def genesis_labels(path: Path) -> dict[str, dict]:
    return {x["code"]: {"de": x["name"]["de"], "en": x["name"]["en"]} for x in json.loads(path.read_text(encoding="utf-8"))}


def eurostat_cube(path: Path) -> dict:
    """Read a Eurostat JSON-stat 2.0 response: dims (ordered), sizes, sparse values, status, labels."""
    d = json.loads(path.read_text(encoding="utf-8"))
    dims = []
    labels = {}
    for k in d["id"]:
        cat = d["dimension"][k]["category"]
        idx = cat["index"]
        codes = sorted(idx, key=lambda c: idx[c]) if isinstance(idx, dict) else list(idx)
        dims.append((k, codes))
        labels[k] = cat.get("label", {})
    return {"dims": dims, "size": d["size"], "value": d["value"], "status": d.get("status", {}),
            "labels": labels, "updated": d.get("updated"), "status_labels": (d.get("extension") or {}).get("status", {}).get("label", {})}


def eurostat_get(cube: dict, **coords) -> tuple[float | None, str | None]:
    pos = 0
    for (k, codes), n in zip(cube["dims"], cube["size"]):
        i = 0 if len(codes) == 1 else codes.index(coords[k])
        pos = pos * n + i
    key = str(pos)
    v = cube["value"].get(key)
    s = cube["status"].get(key)
    return (None if v is None else float(v)), s


def read_sheet(path: Path, sheet: str) -> list[list]:
    import openpyxl  # imported lazily so scripts without xlsx needs do not require it

    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    return [list(r) for r in wb[sheet].iter_rows(values_only=True)]


def num(v) -> float | None:
    """Destatis CSV sheets store numbers as text with '-' for nil, '.' for secret, '...' for not yet available."""
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v).strip()
    if s in ("-", ".", "...", "x", "X", ""):
        return None
    return float(s.replace(",", "."))
