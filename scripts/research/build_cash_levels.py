#!/usr/bin/env python3
"""Destatis 71511 (vierteljährliche Kassenergebnisse, 1.-4. Quartal = full year) → data/de/government/cash-by-level.json

Expenditure and revenue by economic type for the five columns Öffentlicher Gesamthaushalt, Bund, EU-Anteile,
Länder, Gemeinden/Gv., Sozialversicherung; core and extra budgets; 2024 and 2025; EUR million.
'Bereinigte Ausgaben/Einnahmen' are net of payments between units of the same level; payments between
levels are NOT eliminated in the per-level columns but are in the Gesamthaushalt column.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import EXTRACTS, envelope, num, raw_path, read_sheet, source_ref, write_csv, write_json  # noqa: E402

SRC = "destatis_kassenergebnisse"
SCRIPT = "scripts/research/build_cash_levels.py"
FILES = {"2024": "kassenergebnisse-2024-q1-4.xlsx", "2025": "kassenergebnisse-2025-q1-4.xlsx"}
COLS = ["gesamthaushalt", "bund", "eu_anteile", "laender", "gemeinden", "sozialversicherung"]
COL_LABELS = {
    "gesamthaushalt": {"de": "Öffentlicher Gesamthaushalt (konsolidiert)", "en": "Overall public budget (consolidated)"},
    "bund": {"de": "Bund", "en": "Federation"}, "eu_anteile": {"de": "EU-Anteile", "en": "EU shares"},
    "laender": {"de": "Länder", "en": "Länder"}, "gemeinden": {"de": "Gemeinden/Gemeindeverbände", "en": "Municipalities"},
    "sozialversicherung": {"de": "Sozialversicherung", "en": "Social insurance"},
}
EN = {  # editorial translations of the row labels (German kept verbatim)
    "Ausgaben, Personalausgaben": "Staff", "Ausgaben, Laufender Sachaufwand": "Running material expenses",
    "Ausgaben, Zinsausgaben": "Interest", "Ausgaben, Laufende Zuweisungen und Zuschüsse, Schuldendiensthilfen": "Current grants and subsidies",
    "Ausgaben, Ausgaben der laufenden Rechnung": "Current expenditure", "Ausgaben, Sachinvestitionen": "Fixed investment",
    "Ausgaben, Baumaßnahmen": "Construction", "Ausgaben, Vermögensübertragungen": "Capital transfers", "Ausgaben, Darlehen": "Loans granted",
    "Ausgaben, Erwerb von Beteiligungen": "Equity acquisitions", "Ausgaben, Ausgaben der Kapitalrechnung": "Capital expenditure",
    "Ausgaben, Bereinigte Ausgaben": "Adjusted expenditure", "Einnahmen, Steuern und steuerähnliche Abgaben": "Taxes and tax-like levies (incl. social contributions for the social-insurance column)",
    "Einnahmen, Einnahmen aus wirtschaftlicher Tätigkeit": "Income from economic activity", "Einnahmen, Zinseinnahmen": "Interest received",
    "Einnahmen, Laufende Zuweisungen und Zuschüsse, Schuldendiensthilfen": "Current grants received", "Einnahmen, Sonstige laufende Einnahmen": "Other current revenue",
    "Einnahmen, Einnahmen der laufenden Rechnung": "Current revenue", "Einnahmen, Veräußerung von Vermögen": "Asset sales",
    "Einnahmen, Vermögensübertragungen": "Capital transfers received", "Einnahmen, Darlehensrückflüsse": "Loan repayments received",
    "Einnahmen, Einnahmen der Kapitalrechnung": "Capital revenue", "Einnahmen, Bereinigte Einnahmen": "Adjusted revenue",
    "Finanzierungsübersicht, Finanzierungssaldo": "Financing balance", "Besondere Finanzierungsvorgänge, Schuldenaufnahmen am Kreditmarkt": "Borrowing on the credit market",
    "Besondere Finanzierungsvorgänge, Schuldentilgung am Kreditmarkt": "Debt repayment on the credit market",
}


def main():
    rows_out = []
    extract_rows = []
    for year, fname in FILES.items():
        sheet = read_sheet(raw_path(SRC, fname), "csv-71511-01")
        header = sheet[0]
        assert header[4] == "Ausgaben_Einnahmen_Arten" and header[7].startswith("Wert_Oeffentlicher_Gesamthaushalt"), header
        for i, r in enumerate(sheet[1:], start=2):
            if r[0] is None or r[5] is None:
                continue
            label = str(r[4]).strip()
            assert str(r[5]) == year and str(r[6]) == "1-4", (year, r[5], r[6])
            vals = {c: num(r[7 + j]) for j, c in enumerate(COLS)}
            rows_out.append({"year": int(year), "order": i - 1, "label": {"de": label, "en": EN.get(label, label)}, "scope": "Kern- und Extrahaushalte", "values_meur": vals})
            extract_rows.append([year, "csv-71511-01", i, label] + [vals[c] for c in COLS])
        # check: Bereinigte Ausgaben = laufende Rechnung + Kapitalrechnung for every column
        get = {r["label"]["de"]: r for r in rows_out if r["year"] == int(year)}
        for c in COLS:
            a = get["Ausgaben, Bereinigte Ausgaben"]["values_meur"][c]
            b = get["Ausgaben, Ausgaben der laufenden Rechnung"]["values_meur"][c]
            d = get["Ausgaben, Ausgaben der Kapitalrechnung"]["values_meur"][c]
            if a is None:
                continue
            if abs(a - ((b or 0) + (d or 0))) > 0.2:
                raise SystemExit(f"{year} {c}: bereinigte {a} != laufend {b} + kapital {d}")
            e = get["Einnahmen, Bereinigte Einnahmen"]["values_meur"][c]
            s = get["Finanzierungsübersicht, Finanzierungssaldo"]["values_meur"][c]
            if e is not None and s is not None and abs((e - a) - s) > 0.2 + abs(get["Finanzierungsübersicht, Saldo der haushaltstechnischen Verrechnungen"]["values_meur"][c] or 0):
                raise SystemExit(f"{year} {c}: Einnahmen-Ausgaben {e-a} != Saldo {s}")
        print(f"{year}: {len(get)} rows; Bereinigte Ausgaben gesamt {get['Ausgaben, Bereinigte Ausgaben']['values_meur']['gesamthaushalt']} MEUR, Bund {get['Ausgaben, Bereinigte Ausgaben']['values_meur']['bund']}, Länder {get['Ausgaben, Bereinigte Ausgaben']['values_meur']['laender']}, Gemeinden {get['Ausgaben, Bereinigte Ausgaben']['values_meur']['gemeinden']}, SV {get['Ausgaben, Bereinigte Ausgaben']['values_meur']['sozialversicherung']}")
    write_csv("destatis_kassenergebnisse/csv-71511-01-2024-2025.csv", ["year", "sheet", "sheet_row", "label_de"] + COLS, extract_rows, base=EXTRACTS)
    payload = envelope(
        "de.government.cash_by_level", "Kassenergebnisse des Öffentlichen Gesamthaushalts nach Ebenen und Arten", "Cash results of the overall public budget by level and economic type",
        "MEUR", "Cash statistics (Kassenstatistik), core and extra budgets, calendar year (1st-4th quarter); 'bereinigt' = net of payments within the same level; the Gesamthaushalt column is consolidated across levels",
        SCRIPT, years=[2024, 2025], columns=COL_LABELS,
        sources={y: source_ref(SRC, f, "sheet csv-71511-01, rows listed in research/extracts/destatis_kassenergebnisse/csv-71511-01-2024-2025.csv") for y, f in FILES.items()},
        rows=rows_out,
    )
    write_json("de/government/cash-by-level.json", payload)


if __name__ == "__main__":
    main()
