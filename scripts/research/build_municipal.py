#!/usr/bin/env python3
"""Destatis 71717 Rechnungsergebnisse der kommunalen Kernhaushalte 2024 → data/de/municipal/functions-2024.json

- Germany, adjusted expenditure by Produktoberbereich 2011-2024 (sheet csv-71717-b01)
- 13 Flächenländer, adjusted expenditure by Produktoberbereich 2024 (sheet csv-71717-20); city states are not
  in the municipal statistics (their municipal tasks sit in the Land budget).
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import EXTRACTS, LAND_NAMES, envelope, num, raw_path, read_sheet, source_ref, write_csv, write_json  # noqa: E402

SRC = "destatis_rechnungsergebnisse_gemeinden_2024"
FILE = "rechnungsergebnisse-gemeinden-2024.xlsx"
SCRIPT = "scripts/research/build_municipal.py"
NAME_TO_CODE = {v: k for k, v in LAND_NAMES.items()}
AREAS = {
    "Insgesamt": ("total", "Insgesamt", "Total"),
    "Zentrale Verwaltung": ("central_admin", "Zentrale Verwaltung", "Central administration"),
    "Schule und Kultur": ("school_culture", "Schule und Kultur", "Schools and culture"),
    "Soziales und Jugend": ("social_youth", "Soziales und Jugend", "Social affairs and youth"),
    "Gesundheit und Sport": ("health_sport", "Gesundheit und Sport", "Health and sport"),
    "Gestaltung der Umwelt": ("environment", "Gestaltung der Umwelt (Bauen, Verkehr, Ver- und Entsorgung)", "Shaping the environment (building, transport, utilities)"),
    "Zentrale Finanzleistungen": ("central_finance", "Zentrale Finanzleistungen", "Central financial services (interest, levies)"),
}


def area_key(label: str) -> str:
    s = label.replace("Produktoberbereich hier", "").strip()
    for k in AREAS:
        if s.startswith(k):
            return AREAS[k][0]
    raise KeyError(label)


def main():
    path = raw_path(SRC, FILE)
    series = read_sheet(path, "csv-71717-b01")
    assert series[0][5] == "Wert_Millionen_EUR", series[0]
    de: dict = {}
    extract = []
    for i, r in enumerate(series[1:], start=2):
        if r[0] is None:
            continue
        year = str(r[1]).replace("Jahr", "").strip()
        de.setdefault(year, {})[area_key(str(r[4]))] = num(r[5])
        extract.append(["csv-71717-b01", i, "Deutschland", year, r[4], num(r[5])])
    by_land = read_sheet(path, "csv-71717-20")
    assert by_land[0][6] == "Wert_Mio_EUR", by_land[0]
    lands: dict = {}
    for i, r in enumerate(by_land[1:], start=2):
        if r[0] is None:
            continue
        name = str(r[4]).strip()
        code = "FLAECHENLAENDER" if name.startswith("Flächenländer") else NAME_TO_CODE[name]
        lands.setdefault(code, {})[area_key(str(r[5]))] = num(r[6])
        extract.append(["csv-71717-20", i, name, "2024", r[5], num(r[6])])
    write_csv("destatis_rechnungsergebnisse_gemeinden_2024/produktoberbereiche-2011-2024.csv", ["sheet", "sheet_row", "gebiet", "year", "produktoberbereich", "value_meur"], extract, base=EXTRACTS)
    # checks: areas sum to total (Destatis rounds to MEUR; allow 0.5 per area)
    residuals = {}
    for year, areas in de.items():
        s = sum(v for k, v in areas.items() if k != "total")
        if abs(s - areas["total"]) > 3:
            # 2024: the product areas sum to 58 MEUR more than the published Insgesamt (0.016 %). The workbook does not
            # explain it (its §5.2 says the Bereinigung is done globally, not per product area). Kept as published, residual recorded.
            if abs(s - areas["total"]) > 0.001 * areas["total"]:
                raise SystemExit(f"DE {year}: areas {s} vs total {areas['total']}")
            residuals[year] = round(s - areas["total"], 1)
            print(f"  note: DE {year} areas sum {s} vs Insgesamt {areas['total']} (residual {s-areas['total']:.1f} MEUR, kept as published)")
    for code, areas in lands.items():
        s = sum(v for k, v in areas.items() if k != "total" and v is not None)
        if abs(s - areas["total"]) > 3:
            raise SystemExit(f"{code}: areas {s} vs total {areas['total']}")
    fl = sum(v["total"] for k, v in lands.items() if k != "FLAECHENLAENDER")
    if abs(fl - lands["FLAECHENLAENDER"]["total"]) > 3:
        raise SystemExit(f"Flächenländer sum {fl} vs {lands['FLAECHENLAENDER']['total']}")
    print(f"municipal 2024: DE total {de['2024']['total']} MEUR; 13 Flächenländer sum {fl}; areas verified")
    payload = envelope(
        "de.municipal.functions_2024", "Bereinigte Ausgaben der Gemeinden und Gemeindeverbände nach Produktbereichen", "Adjusted expenditure of municipalities by product area",
        "MEUR", "Jahresrechnungsstatistik der kommunalen Kernhaushalte (core budgets only, no Extrahaushalte); Flächenländer only (Berlin, Hamburg, Bremen municipal tasks are inside the Land budgets)",
        SCRIPT, areas={v[0]: {"de": v[1], "en": v[2]} for v in AREAS.values()},
        source=source_ref(SRC, FILE, "sheets csv-71717-b01 (Germany 2011-2024) and csv-71717-20 (by Land 2024); rows in research/extracts/destatis_rechnungsergebnisse_gemeinden_2024/produktoberbereiche-2011-2024.csv"),
        germany_series={y: de[y] for y in sorted(de)}, germany_series_residual_meur=residuals,
        laender_2024={c: {"name": LAND_NAMES.get(c, "Flächenländer zusammen"), "areas_meur": a} for c, a in lands.items()},
    )
    write_json("de/municipal/functions-2024.json", payload)


if __name__ == "__main__":
    main()
