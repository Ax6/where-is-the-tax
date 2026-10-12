#!/usr/bin/env python3
"""Destatis 12411 population at 31 December → data/de/population.json (Germany 1990-2025, Länder 2015-2025)."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import LAND_CODES, LAND_NAMES, cube_get, envelope, jsonstat_cube, raw_path, source_ref, write_json  # noqa: E402

SRC = "destatis_genesis_12411"
SCRIPT = "scripts/research/build_population.py"


def main():
    de = jsonstat_cube(raw_path(SRC, "12411-0001.json"))
    dates = dict(de["dims"])["STAG"]
    germany = {}
    for d in dates:
        v, s = cube_get(de, STAG=d)
        if v is not None and d >= "1990":
            germany[d[:4]] = int(v)
    la = jsonstat_cube(raw_path(SRC, "12411-0010.json"))
    laender = {}
    for land in dict(la["dims"])["DLAND"]:
        code = LAND_CODES[land]
        laender[code] = {"name": LAND_NAMES[code], "values": {}}
        for d in dict(la["dims"])["STAG"]:
            v, s = cube_get(la, DLAND=land, STAG=d)
            if v is not None and d >= "2015":
                laender[code]["values"][d[:4]] = int(v)
    for y in ("2024", "2025"):
        s = sum(l["values"].get(y, 0) for l in laender.values())
        if germany.get(y) and abs(s - germany[y]) > 0:
            print(f"  note: Länder sum {s} vs Germany {germany[y]} in {y} (diff {s-germany[y]})")
    print(f"population: Germany 2024 {germany.get('2024')}, 2025 {germany.get('2025')}")
    payload = envelope(
        "de.population", "Bevölkerung am 31. Dezember", "Population at 31 December", "persons",
        "Fortschreibung des Bevölkerungsstandes auf Basis des Zensus 2022; status flags per GENESIS ('e' = final)", SCRIPT,
        source_germany=source_ref(SRC, "12411-0001.json", "STAG × BEVSTD"), source_laender=source_ref(SRC, "12411-0010.json", "DLAND × STAG"),
        germany=germany, laender=laender,
    )
    write_json("de/population.json", payload)


if __name__ == "__main__":
    main()
