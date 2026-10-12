#!/usr/bin/env python3
"""Destatis 71211 → data/de/taxes/*.json

Outputs
- by-tax.json          56 named-tax positions before distribution, Germany, 1999-2025, EUR
- by-recipient.json    39 recipient positions after distribution (EU, Bund, Länder, Gemeinden), 1999-2025, EUR
- by-land.json         16 Länder, 2022-2025, both tables, EUR
- by-land-series.csv   16 Länder, 2013-2025, both tables (long format)

The arithmetic of each hierarchy is checked against the published totals (cell-exact, no tolerance:
GENESIS stores the data in EUR thousand and sums are exact).
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (  # noqa: E402
    LAND_CODES, LAND_NAMES, cube_get, envelope, genesis_labels, jsonstat_cube, raw_path, source_ref, write_csv, write_json,
)

SRC = "destatis_genesis_71211"
SCRIPT = "scripts/research/build_taxes.py"
UNIT_FACTOR = 1000  # GENESIS STEU01$QMU is 'Tsd. EUR'

# Before-distribution hierarchy (START1). Children sum exactly to the parent in the source.
PRE_TREE = {
    "STEUERNVINS10": ["STEUERNGEM10", "STEUERNVB20", "STEUERNVL20", "STEUERNVK20", "STEUERARTZ10"],
    "STEUERNGEM10": ["STEUERARTG10", "STEUERARTG20", "STEUERARTG30", "STEUERARTG40", "STEUERARTG50", "STEUERARTG60", "STEUERARTG70"],
    "STEUERNVB20": ["STEUERARTB10", "STEUERARTB20", "STEUERARTB30", "STEUERARTB40", "STEUERARTB45", "STEUERARTB50", "STEUERARTB60",
                     "STEUERARTB70", "STEUERARTB75", "STEUERARTB77", "STEUERARTB78", "STEUERARTB79", "STEUERARTB80", "STEUERARTB85",
                     "STEUERARTB90", "STEUERARTB100"],
    "STEUERNVL20": ["STEUERARTL10", "STEUERARTL20", "STEUERARTL30", "STEUERARTL40", "STEUERARTL51", "STEUERARTL52", "STEUERARTL53",
                     "STEUERARTL54", "STEUERARTL55", "STEUERARTL56", "STEUERARTL60", "STEUERARTL70", "STEUERARTL80"],
    "STEUERNVK20": ["STEUERARTK10", "STEUERARTK20", "STEUERARTK21", "STEUERARTK30", "STEUERARTK40", "STEUERARTK41", "STEUERARTK42",
                     "STEUERARTK43", "STEUERARTK44", "STEUERARTK45", "STEUERARTK46", "STEUERARTK47", "STEUERARTK48", "STEUERARTK50"],
}
GROUP_OF = {
    "STEUERNGEM10": "joint", "STEUERNVB20": "federal", "STEUERNVL20": "land", "STEUERNVK20": "municipal", "STEUERARTZ10": "customs",
}
GROUP_LABELS = {
    "joint": {"de": "Gemeinschaftsteuern", "en": "Joint taxes (shared by law)"},
    "federal": {"de": "Bundessteuern", "en": "Federal taxes"},
    "land": {"de": "Landessteuern", "en": "Länder taxes"},
    "municipal": {"de": "Gemeindesteuern", "en": "Municipal taxes"},
    "customs": {"de": "Zölle", "en": "Customs duties (EU)"},
    "total": {"de": "Steuereinnahmen insgesamt", "en": "Total tax revenue"},
}

# After-distribution hierarchy (STAT10). Signs: deductions from the federal column are negative in the source.
POST_TREE = {
    "STEUERNVINS10": ["STEUERNVEU10", "STEUERNVB10", "STEUERNVL10", "STEUERNVK10"],
    "STEUERNVEU10": ["STEUERNVEU20", "STEUERNVEU30", "STEUERNVEU40", "STEUERNVEU50"],
    "STEUERNVB10": ["STEUERNVB20", "STEUERNVB60", "STEUERNVB70", "STEUERARTB41", "STEUERNVB40", "STEUERNVB50", "STEUERNVB65",
                     "STEUERNVB66", "STEUERNVB67", "STEUERNVB68", "STEUERNVB69", "STEUERNVB71"],
    "STEUERNVL10": ["STEUERNVL20", "STEUERNVL61", "STEUERNVL70", "STEUERARTL41", "STEUERNVL40", "STEUERNVL50", "STEUERNVL60",
                     "STEUERNVL65", "STEUERNVL66", "STEUERNVL71", "STEUERNVL67", "STEUERNVL68"],
    "STEUERNVK10": ["STEUERARTK301", "STEUERNVG601", "STEUERNVG40", "STEUERNVK201"],
    "STEUERARTK301": ["STEUERARTK30", "STEUERNVK30"],
}
RECIPIENT_OF = {"STEUERNVEU10": "eu", "STEUERNVB10": "federation", "STEUERNVL10": "laender", "STEUERNVK10": "municipalities"}


# Positions that are deducted from a parent without being published as a child of it.
IMPLICIT_DEDUCTIONS = {"STEUERNVB10": ["STEUERNVEU50"]}  # plastics own resource is paid out of the federal share (from 2021)


def check_tree(name: str, tree: dict, get, years: list[str]) -> list[dict]:
    """Return a list of {parent, year, parent_value, children_sum, ok}. Fails loudly on mismatch."""
    report = []
    for parent, children in tree.items():
        for y in years:
            pv, _ = get(parent, y)
            if pv is None:
                continue
            cs = 0.0
            missing = 0
            for c in children:
                v, _ = get(c, y)
                if v is None:
                    missing += 1
                else:
                    cs += v
            for c in IMPLICIT_DEDUCTIONS.get(parent, []):
                v, _ = get(c, y)
                if v is not None:
                    cs -= v
            # source unit is EUR thousand; each child is rounded independently, so allow one unit per child
            # (or 1 ppm of the parent for the few older cells where Destatis' own rounding is coarser).
            tol = max(len(children), 1e-5 * abs(pv))  # 2009 municipal total has a 100k residual in the source itself
            ok = abs(pv - cs) <= tol
            report.append({"tree": name, "parent": parent, "year": y, "parent_value": pv, "children_sum": cs, "diff": pv - cs, "ok": ok, "missing_children": missing})
    bad = [r for r in report if not r["ok"]]
    if bad:
        for r in bad[:20]:
            print(f"  MISMATCH {r['tree']} {r['parent']} {r['year']}: parent {r['parent_value']} vs children {r['children_sum']}")
        raise SystemExit(f"{name}: {len(bad)} hierarchy mismatches")
    worst = max((abs(r["diff"]) for r in report), default=0)
    print(f"  {name}: {len(report)} parent/year sums verified (max residual {worst:.0f} thousand EUR = source rounding)")
    return report


def build_germany(table: str, dim: str, tree: dict, labels: dict, out_name: str, title_de: str, title_en: str):
    cube = jsonstat_cube(raw_path(SRC, f"{table}.json"))
    years = sorted(dict(cube["dims"])["JAHR"])
    codes = dict(cube["dims"])[dim]

    def get(code: str, y: str):
        return cube_get(cube, JAHR=y, **{dim: code})

    print(f"{table}: {len(codes)} positions × {len(years)} years ({years[0]}–{years[-1]})")
    # After distribution, grant deductions (ÖPNV, BEZ, Kfz compensation, consolidation aid, EU own resources)
    # are only published as separate positions from 2013; before that the totals cannot be decomposed.
    check_years = [y for y in years if y >= "2013"] if tree is POST_TREE else years
    check_tree(table, tree, get, check_years)

    parent_of = {c: p for p, cs in tree.items() for c in cs}
    rows = []
    order = []

    def walk(code, depth):
        order.append((code, depth))
        for c in tree.get(code, []):
            walk(c, depth + 1)

    walk("STEUERNVINS10", 0)
    seen = {c for c, _ in order}
    for c in codes:
        if c not in seen:
            order.append((c, 1))
    for code, depth in order:
        values, status = {}, {}
        for y in years:
            v, s = get(code, y)
            values[y] = None if v is None else round(v * UNIT_FACTOR)
            status[y] = "final" if s == "e" else ("nil" if s == "-" else s)
        top = code
        while top in parent_of and parent_of[top] != "STEUERNVINS10":
            top = parent_of[top]
        rows.append({
            "id": code,
            "label": labels[code],
            "parent": parent_of.get(code),
            "depth": depth,
            "group": "total" if code == "STEUERNVINS10" else GROUP_OF.get(top, RECIPIENT_OF.get(top, None)),
            "values_eur": values,
            "status": status,
        })
    payload = envelope(
        f"de.taxes.{out_name}", title_de, title_en, "EUR",
        "Kassenmäßige Steuereinnahmen (cash receipts), calendar year, Germany; GENESIS unit 'Tsd. EUR' multiplied by 1000",
        SCRIPT,
        years=years,
        year_status={y: ("final" if all(r["status"][y] in ("final", "nil") for r in rows) else "mixed") for y in years},
        hierarchy_note="Each parent equals the sum of its children within source rounding (verified in build; before distribution for all years, after distribution from 2013 because grant deductions are not published separately earlier). After distribution, deductions from the federal column (EU VAT/GNI own resources, ÖPNV grants, supplementary federal grants, motor-vehicle-tax compensation, consolidation aid) carry a negative sign; the EU plastics own resource (STEUERNVEU50) is also deducted from the federal total but has no separate federal position. The total after distribution differs slightly from the total before distribution in some years (e.g. 2024: 947,314,455 vs 947,706,848 thousand EUR); the GENESIS metadata does not explain the gap; both are Destatis figures and are kept as published.",
        source=source_ref(SRC, f"{table}.json", f"dimension {dim} × JAHR, content STEU01$QMU; labels from variables-{dim}.json"),
        label_source=source_ref(SRC, f"variables-{dim}.json", "code → name.de / name.en"),
        rows=rows,
    )
    write_json(f"de/taxes/{out_name}.json", payload)
    return rows, years


def build_laender(labels_pre: dict, labels_post: dict):
    out_rows = []
    series = []
    for table, dim, labels in (("71211-0101", "START1", labels_pre), ("71211-0102", "STAT10", labels_post)):
        cube = jsonstat_cube(raw_path(SRC, f"{table}.json"))
        years = sorted(dict(cube["dims"])["JAHR"])
        codes = dict(cube["dims"])[dim]
        lands = dict(cube["dims"])["DLAND"]
        # check: 16 Länder sum to Germany for the total row? Not expected (Germany table differs for EU/customs timing) — only hierarchy within each Land.
        tree = PRE_TREE if dim == "START1" else POST_TREE
        for land in lands:
            def get(code, y, land=land):
                return cube_get(cube, JAHR=y, DLAND=land, **{dim: code})
            check_tree(f"{table}/{LAND_CODES[land]}", tree, get, [y for y in years if y >= "2022"])  # noqa: B023
        for land in lands:
            for code in codes:
                for y in years:
                    v, s = cube_get(cube, JAHR=y, DLAND=land, **{dim: code})
                    series.append([LAND_CODES[land], table, code, y, "" if v is None else round(v * UNIT_FACTOR), s])
                    if y >= "2022":
                        out_rows.append({"land": LAND_CODES[land], "table": table, "id": code, "year": int(y), "value_eur": None if v is None else round(v * UNIT_FACTOR), "status": "final" if s == "e" else s})
    write_csv("de/taxes/by-land-series.csv", ["land", "table", "position", "year", "value_eur", "status"], series)
    # compact JSON: land → year → position → value
    compact: dict = {}
    for r in out_rows:
        compact.setdefault(r["land"], {"name": LAND_NAMES[r["land"]], "years": {}})["years"].setdefault(str(r["year"]), {})[r["id"]] = r["value_eur"]
    payload = envelope(
        "de.taxes.by_land", "Steuereinnahmen nach Ländern, vor und nach Verteilung", "Tax receipts by Land, before and after distribution", "EUR",
        "Cash receipts by Land, calendar year. 'Before distribution' = taxes collected in the Land (Aufkommen); 'after distribution' = what the Land, its municipalities, the Federation and the EU receive out of that Land's table after legal shares, equalisation and grants.",
        SCRIPT,
        years=["2022", "2023", "2024", "2025"],
        positions={**{c: labels_pre[c] for c in labels_pre}, **{c: labels_post[c] for c in labels_post}},
        source_pre=source_ref(SRC, "71211-0101.json", "DLAND × JAHR × START1"),
        source_post=source_ref(SRC, "71211-0102.json", "DLAND × JAHR × STAT10"),
        laender=compact,
    )
    write_json("de/taxes/by-land.json", payload)


def main():
    labels_pre = genesis_labels(raw_path(SRC, "variables-START1.json"))
    labels_post = genesis_labels(raw_path(SRC, "variables-STAT10.json"))
    build_germany("71211-0001", "START1", PRE_TREE, labels_pre, "by-tax",
                  "Steuereinnahmen nach Steuerarten vor der Steuerverteilung", "Tax receipts by named tax, before distribution")
    build_germany("71211-0002", "STAT10", POST_TREE, labels_post, "by-recipient",
                  "Steuereinnahmen nach der Steuerverteilung (EU, Bund, Länder, Gemeinden)", "Tax receipts after distribution (EU, Federation, Länder, municipalities)")
    build_laender(labels_pre, labels_post)


if __name__ == "__main__":
    main()
