#!/usr/bin/env python3
"""EU round trip for Germany → data/de/eu/round-trip.json (2021-2025)

- What Germany pays: own resources as booked by the Commission (customs, VAT-based, GNI-based, lump-sum
  reduction, plastics) from the Commission's 'EU budget: spending and revenue' workbook, and the Destatis
  after-distribution EU positions (cash, from data/de/taxes/by-recipient.json) side by side.
- What the EU spends in Germany: by MFF heading, plus NextGenerationEU.
No 'net balance' is computed: the Commission stopped publishing operating budgetary balances and the two
sides are not like-for-like (the EU budget also funds EU-wide goods). The two totals are shown separately.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import DATA, EXTRACTS, envelope, raw_path, read_sheet, source_ref, write_csv, write_json  # noqa: E402

SRC = "eu_budget_spending_revenue"
FILE = "eu_budget_spending_and_revenue_2000-2025.xlsx"
SCRIPT = "scripts/research/build_eu.py"
HEADINGS = {
    "1.": ("single_market", "Binnenmarkt, Innovation und Digitales", "Single Market, Innovation and Digital"),
    "2.": ("cohesion", "Zusammenhalt, Resilienz und Werte", "Cohesion, Resilience and Values"),
    "3.": ("natural_resources", "Natürliche Ressourcen und Umwelt (v.a. Agrarzahlungen)", "Natural Resources and Environment (mostly agriculture)"),
    "4.": ("migration", "Migration und Grenzmanagement", "Migration and Border Management"),
    "5.": ("security", "Sicherheit und Verteidigung", "Security and Defence"),
    "6.": ("neighbourhood", "Nachbarschaft und die Welt", "Neighbourhood and the World"),
    "7.": ("administration", "Europäische öffentliche Verwaltung", "European Public Administration"),
    "O": ("outside_mff", "Außerhalb des MFR", "Outside the MFF"),
    "S": ("solidarity", "Solidaritätsmechanismen", "Solidarity mechanisms"),
}
REVENUE = {
    "Customs duties": ("customs", "Zölle", "Customs duties"),
    "Own resources based on VAT": ("vat_based", "MwSt.-Eigenmittel", "VAT-based own resource"),
    "Own resources based on GNI": ("gni_based", "BNE-Eigenmittel", "GNI-based own resource"),
    "Gross reduction in the annual GNI-based contribution granted": ("gni_reduction", "Pauschale Ermäßigung des BNE-Beitrags", "Lump-sum reduction of the GNI-based contribution"),
    "Own resources based on plastic packaging waste not recycled": ("plastics", "Kunststoff-Eigenmittel", "Plastics own resource"),
    "TOTAL Own resources": ("total_own_resources", "Eigenmittel insgesamt", "Total own resources"),
    "TOTAL Balances and adjustments": ("balances_adjustments", "Salden und Anpassungen", "Balances and adjustments"),
    "Gross National Income (GNI), EUR million": ("gni", "Bruttonationaleinkommen", "Gross national income"),
}


def main():
    path = raw_path(SRC, FILE)
    years = {}
    extract = []
    for year in ["2021", "2022", "2023", "2024", "2025"]:
        rows = read_sheet(path, year)
        hdr = rows[2]
        de = hdr.index("DE")
        spend, ngeu, revenue = {}, {}, {}
        mode = "mff"
        for i, r in enumerate(rows):
            a = str(r[0]).strip() if r[0] is not None else ""
            b = str(r[1]).strip() if len(r) > 1 and r[1] is not None else ""
            v = r[de] if len(r) > de else None
            if a == "TOTAL EXPENDITURE":
                spend["total"] = float(v); extract.append([year, i, "expenditure", a, v]); mode = "ngeu"; continue
            if a == "TOTAL NGEU":
                ngeu["total"] = float(v); extract.append([year, i, "ngeu", a, v]); mode = "revenue"; continue
            if mode == "mff" and a in HEADINGS:
                spend[HEADINGS[a][0]] = float(v); extract.append([year, i, "expenditure", b, v])
            elif mode == "ngeu" and a in HEADINGS and v is not None:
                ngeu[HEADINGS[a][0]] = float(v); extract.append([year, i, "ngeu", b, v])
            elif mode == "revenue":
                key = b.replace("*", "").strip()
                for k, meta in REVENUE.items():
                    if key.startswith(k) and v is not None and not isinstance(v, str):
                        revenue[meta[0]] = float(v); extract.append([year, i, "revenue", key, v])
        s = sum(val for k, val in spend.items() if k != "total")
        if abs(s - spend["total"]) > 0.5:
            raise SystemExit(f"{year}: headings {s} vs total {spend['total']}")
        rs = sum(revenue[k] for k in ("customs", "vat_based", "gni_based", "gni_reduction", "plastics"))
        if abs(rs - revenue["total_own_resources"]) > 1.0:  # rows are rounded independently in the workbook
            raise SystemExit(f"{year}: own resources {rs} vs total {revenue['total_own_resources']}")
        years[year] = {"eu_spending_in_germany_meur": spend, "ngeu_in_germany_meur": ngeu, "own_resources_paid_meur": revenue,
                       "status": "final budget implementation" if year < "2025" else "as published 2026 (check for later revisions)"}
        print(f"EU {year}: spending in DE {spend['total']:.0f} + NGEU {ngeu.get('total',0):.0f}; own resources {revenue['total_own_resources']:.0f} MEUR")
    write_csv("eu_budget_spending_revenue/germany-2021-2025.csv", ["year", "sheet_row", "block", "label", "value_meur"], extract, base=EXTRACTS)
    # Destatis cash view of the same flows (EU own resources as booked in German tax statistics)
    rec = json.loads((DATA / "de" / "taxes" / "by-recipient.json").read_text(encoding="utf-8"))
    rows = {r["id"]: r for r in rec["rows"]}
    destatis = {}
    for y in years:
        destatis[y] = {k: rows[c]["values_eur"].get(y) for k, c in (("total", "STEUERNVEU10"), ("customs", "STEUERNVEU20"), ("vat_based", "STEUERNVEU30"), ("gni_based", "STEUERNVEU40"), ("plastics", "STEUERNVEU50"))}
    payload = envelope(
        "de.eu.round_trip", "Deutschland und der EU-Haushalt: Zahlungen und EU-Ausgaben in Deutschland", "Germany and the EU budget: payments and EU spending in Germany",
        "MEUR", "Commission budget implementation (accrual-free, by year of booking) for both sides; Destatis cash positions (EUR) added for comparison: the two sources differ in timing and in the treatment of the GNI reduction and balances. No net balance is computed (see file notes).",
        SCRIPT, headings={v[0]: {"de": v[1], "en": v[2]} for v in HEADINGS.values()}, revenue_items={v[0]: {"de": v[1], "en": v[2]} for v in REVENUE.values()},
        source=source_ref(SRC, FILE, "sheets 2021-2025, column DE; rows in research/extracts/eu_budget_spending_revenue/germany-2021-2025.csv"),
        destatis_cash_eu_own_resources_eur=destatis, destatis_source=rec["source"],
        notes=["Own resources are paid from the federal budget share of tax revenue (Art. 106 GG does not assign them separately); Destatis books them as deductions from the Federation's tax revenue.",
               "EU spending 'in Germany' is spending allocated to Germany as recipient; EU-wide spending (e.g. external action, administration abroad) is not allocatable and is not a German benefit or cost.",
               "The Commission no longer publishes operating budgetary balances; any 'net contributor' figure is a derived construct and must be marked as such."],
        years=years,
    )
    write_json("de/eu/round-trip.json", payload)


if __name__ == "__main__":
    main()
