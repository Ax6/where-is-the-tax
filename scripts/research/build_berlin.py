#!/usr/bin/env python3
"""Berlin → data/de/berlin/

- tax-receipts.json   Berlin's own tax account 2024 and 2025 (Senatsverwaltung für Finanzen CSV, CC BY),
                      Land shares, Land taxes, municipal taxes, municipal shares; EUR
- functions-2024.json the Berlin 2024 annual account by function (re-homed from data/de/2024/accounts/
                      berlin-functions.json with provenance pointing at the cached Drucksache 19/2681)
"""
from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import DATA, EXTRACTS, envelope, raw_path, source_ref, write_csv, write_json  # noqa: E402

SRC = "berlin_steuereinnahmen"
SCRIPT = "scripts/research/build_berlin.py"
FILES = {"2024": ("steuereinnahmen_12_2024.csv", "latin-1"), "2025": ("steuereinnahmen_122025.csv", "utf-8-sig")}
GROUP = {
    "Landesanteil an den Gemeinschaftsteuern": ("land_share_joint", "Landesanteil an den Gemeinschaftsteuern", "Land share of joint taxes"),
    "Landessteuern": ("land_taxes", "Landessteuern", "Land taxes"),
    "Gemeindesteuern": ("municipal_taxes", "Gemeindesteuern", "Municipal taxes"),
    "Gemeindeanteile an Gemeinschaftsteuern": ("municipal_share_joint", "Gemeindeanteile an Gemeinschaftsteuern", "Municipal share of joint taxes"),
}
EN = {
    "Lohnsteuer": "Wage tax", "Veranlagte Einkommensteuer": "Assessed income tax", "Nicht veranlagte Steuer vom Ertrag": "Non-assessed taxes on yields",
    "Abgeltungsteuer auf Zins.- u. Veräußerungserträge": "Final withholding tax", "Körperschaftsteuer": "Corporation tax", "Umsatzsteuer": "VAT",
    "Einfuhr-Umsatzsteuer": "Import VAT", "Gewerbesteuerumlage Land": "Trade-tax levy (Land component)", "Vermögensteuer": "Net worth tax",
    "Erbschaftsteuer": "Inheritance tax", "Grunderwerbsteuer": "Real-estate transfer tax", "Rennwett- und Lotteriesteuer": "Betting and lottery tax",
    "Biersteuer": "Beer tax", "Feuerschutzsteuer": "Fire protection tax", "Grundsteuer": "Property tax", "Gewerbesteuer": "Trade tax (gross)",
    "Gewerbesteuerumlage Gesamt": "Trade-tax levy paid (total)", "Vergnügungsteuer": "Entertainment tax", "Hundesteuer": "Dog tax",
    "Zweitwohnungsteuer": "Second-home tax", "Übernachtungsteuer": "Overnight-stay tax", "Lohn- und Einkommensteuer": "Wage and income tax",
    "Abgeltungsteuer auf Zins.-u.V.erträge": "Final withholding tax",
}


def parse_amount(s: str) -> int:
    s = s.strip()
    neg = s.startswith("-")
    digits = s.replace("-", "").replace(".", "")
    v = int(digits) if digits else 0
    return -v if neg else v


def build_taxes():
    years = {}
    extract = []
    for year, (fname, enc) in FILES.items():
        text = raw_path(SRC, fname).read_text(encoding=enc)
        rows = list(csv.reader(text.splitlines(), delimiter=";"))
        hdr = rows[0]
        assert "Januar bis Dezember" in hdr[3] and year in hdr[3], hdr
        items = []
        for i, r in enumerate(rows[1:], start=2):
            if len(r) < 4 or not r[0].strip():
                continue
            name, group = r[0].strip(), r[1].strip()
            eur = parse_amount(r[3]) * 1000  # T EUR → EUR
            items.append({"id": f"{GROUP[group][0]}:{name}", "label": {"de": name, "en": EN.get(name, name)}, "group": GROUP[group][0], "value_eur": eur, "csv_row": i})
            extract.append([year, i, name, group, parse_amount(r[2]), parse_amount(r[3])])
        groups = {}
        for it in items:
            groups[it["group"]] = groups.get(it["group"], 0) + it["value_eur"]
        total = sum(groups.values())
        years[year] = {"status": "final cash receipts (Jan-Dec)", "total_eur": total, "groups_eur": groups, "items": items,
                       "source": source_ref(SRC, fname, "column 'Einnahmen Januar bis Dezember' (T EUR) × 1000; row numbers per item")}
        print(f"Berlin {year}: total {total/1e9:.3f} bn EUR; groups {{{', '.join(f'{k}: {v/1e9:.3f}' for k,v in groups.items())}}}")
    # pin: 2024 total verified independently on 2026-08-05 as 27,302,326 T EUR
    # (the HTML table total is 27,302,326 T EUR; the CSV rows are rounded to T EUR individually, giving 27,302,328)
    assert abs(years["2024"]["total_eur"] - 27_302_326_000) <= 5_000, years["2024"]["total_eur"]
    write_csv("berlin_steuereinnahmen/steuereinnahmen-2024-2025.csv", ["year", "csv_row", "steuerart", "ertragshoheit", "dezember_teur", "jan_dez_teur"], extract, base=EXTRACTS)
    payload = envelope(
        "de.berlin.tax_receipts", "Steuereinnahmen des Landes Berlin (Land- und Gemeindeanteile)", "Tax receipts of Berlin (Land and municipal roles)",
        "EUR", "Cash receipts Jan-Dec as published monthly by the Senatsverwaltung für Finanzen; Berlin is Land and municipality at once, so both roles appear. Gross trade tax is shown with the levy paid to the Federation/Land as a negative line.",
        SCRIPT, groups={v[0]: {"de": v[1], "en": v[2]} for v in GROUP.values()}, years=years,
        licence_note="CC BY, attribution 'Senatsverwaltung für Finanzen Berlin' (datenregister.berlin.de package metadata)",
    )
    write_json("de/berlin/tax-receipts.json", payload)


def rehome_functions():
    old = json.loads((DATA / "de" / "2024" / "accounts" / "berlin-functions.json").read_text(encoding="utf-8"))
    payload = envelope(
        "de.berlin.functions_2024", "Ausgaben Berlins nach Funktionen 2024 (Haushaltsrechnung)", "Berlin expenditure by function 2024 (annual account)",
        "EUR", old["basis"], SCRIPT, year=2024, status="final",
        method=old["method"], total_eur=old["total_eur"], groups=old["groups"],
        source=source_ref("berlin_jahresrechnung_2024", "d19-2681.pdf", "Funktionenübersicht, PDF pages 79-88 (rotated table); group rows and total", "Extraction done 2026-08-06 (see data/de/2024/accounts/berlin-functions.json history); independent re-verification pending in the 2026-10-09 review log"),
    )
    write_json("de/berlin/functions-2024.json", payload)


if __name__ == "__main__":
    build_taxes()
    rehome_functions()
