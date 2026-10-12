#!/usr/bin/env python3
"""Destatis 71711 Rechnungsergebnisse 2022, table csv-71711-12 → data/de/laender/functions-2022.json

Expenditure by function (Aufgabenbereich) for each Land, for three scopes: Länder, Gemeinden/Gv., and
Länder + Gemeinden/Gv. together (core and extra budgets). Measures kept: Bereinigte Ausgaben (adjusted
expenditure, the comparable total), Nettoausgaben (what the level finances itself) and Personalausgaben.
Supersedes data/de/2021/accounts/laender-functions.json (2021 edition) with the same group structure.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import LAND_NAMES, envelope, num, raw_path, read_sheet, source_ref, write_csv, write_json, EXTRACTS  # noqa: E402

SRC = "destatis_rechnungsergebnisse_2022"
FILE = "rechnungsergebnisse-2022.xlsx"
SCRIPT = "scripts/research/build_laender.py"
NAME_TO_CODE = {v: k for k, v in LAND_NAMES.items()}

# Top-level Aufgabenbereiche of the Destatis function plan with their Hauptfunktion digit.
TOP = {
    "Politische Führung und zentrale Verwaltung": "0", "Auswärtige Angelegenheiten": "0", "Verteidigung": "0",
    "Öffentliche Sicherheit und Ordnung": "0", "Rechtsschutz": "0", "Finanzverwaltung": "0",
    "Allgemeinbildende und berufliche Schulen": "1", "Hochschulen": "1",
    "Förderung für Schülerinnen und Schüler, Studierende, Weiterbildungsteilnehmende u. dgl.": "1",
    "Sonstiges Bildungswesen": "1", "Wissenschaft, Forschung und Entwicklung außerhalb der Hochschulen": "1", "Kultur und Religion": "1",
    "Soziale Sicherung, Familie und Jugend, Arbeitsmarktpolitik": "2",
    "Gesundheit, Umwelt, Sport und Erholung": "3",
    "Wohnungswesen, Städtebau, Raumordnung und komm. Gemeinschaftsdienste": "4",
    "Ernährung, Landwirtschaft und Forsten": "5",
    "Energie- und Wasserwirtschaft, Gewerbe, Dienstleistungen": "6",
    "Verkehrs- und Nachrichtenwesen": "7",
    "Finanzwirtschaft": "8",
    "Versorgung": "V",
}
GROUPS = {
    "0": {"de": "Allgemeine Dienste", "en": "General services (administration, police, courts, tax offices)"},
    "1": {"de": "Bildungswesen, Wissenschaft, Forschung, kulturelle Angelegenheiten", "en": "Education, science, research, culture"},
    "2": {"de": "Soziale Sicherung, Familie und Jugend, Arbeitsmarktpolitik", "en": "Social security, family and youth, labour market"},
    "3": {"de": "Gesundheit, Umwelt, Sport und Erholung", "en": "Health, environment, sport and recreation"},
    "4": {"de": "Wohnungswesen, Städtebau, Raumordnung, kommunale Gemeinschaftsdienste", "en": "Housing, urban development, community services"},
    "5": {"de": "Ernährung, Landwirtschaft und Forsten", "en": "Food, agriculture and forestry"},
    "6": {"de": "Energie- und Wasserwirtschaft, Gewerbe, Dienstleistungen", "en": "Energy, water, business and services"},
    "7": {"de": "Verkehrs- und Nachrichtenwesen", "en": "Transport and communications"},
    "8": {"de": "Finanzwirtschaft", "en": "Financial management (interest, equalisation payments, assets)"},
    "V": {"de": "Versorgung (Beamtenpensionen; Destatis-Sonderausweis)", "en": "Civil-servant pensions (Destatis carve-out across functions)"},
}
SCOPES = {"Länder und Gemeinden/Gv.": "land_plus_municipal", "Länder": "land", "Gemeinden/Gv.": "municipal"}
MEASURES = {"Ausgaben, Bereinigte Ausgaben": "adjusted", "Ausgaben, Nettoausgaben": "net", "Ausgaben, Personalausgaben": "staff"}


def main():
    sheet = read_sheet(raw_path(SRC, FILE), "csv-71711-12")
    hdr = sheet[0]
    assert hdr[6] == "Aufgabenbereiche" and hdr[7].strip() == "Ausgabeart_Einnahmeart" and hdr[9] == "Wert_Mill_EUR", hdr
    data: dict = {}
    extract = []
    for i, r in enumerate(sheet[1:], start=2):
        if r[0] is None:
            continue
        scope, land, func, art, year, val = r[4], r[5], r[6], str(r[7]).strip(), str(r[8]), num(r[9])
        if year != "2022" or art not in MEASURES:
            continue
        code = "DE_LAENDER" if land == "Zusammen" else NAME_TO_CODE[land]
        data.setdefault(SCOPES[scope], {}).setdefault(code, {}).setdefault(MEASURES[art], {})[func] = val
        extract.append([i, scope, code, func, art, val])
    write_csv("destatis_rechnungsergebnisse_2022/csv-71711-12-expenditure-2022.csv", ["sheet_row", "scope", "land", "aufgabenbereich", "ausgabeart", "value_meur"], extract, base=EXTRACTS)

    out = {}
    for scope, lands in data.items():
        out[scope] = {}
        for code, measures in lands.items():
            entry = {"name": LAND_NAMES.get(code, "Länder zusammen"), "measures": {}}
            for m, funcs in measures.items():
                total = funcs.get("Insgesamt")
                groups = {}
                for f, g in TOP.items():
                    v = funcs.get(f)
                    if v is not None:
                        groups[g] = groups.get(g, 0.0) + v
                groups = {g: round(v, 3) for g, v in groups.items()}
                detail = {f: v for f, v in funcs.items() if f != "Insgesamt"}
                check = sum(groups.values())
                ok = total is not None and abs(check - total) <= 0.01 * len(TOP)
                if total is None and not groups:
                    ok = None  # city states have no separate municipal column
                if m == "adjusted" and ok is False:
                    raise SystemExit(f"{scope} {code} {m}: groups {check} vs Insgesamt {total}")
                entry["measures"][m] = {"total_meur": total, "groups_meur": groups, "groups_sum_check": ok, "functions_meur": detail}
            out[scope][code] = entry
    la = out["land_plus_municipal"]
    print(f"2022: {len(la)} Länder; Länder+Gemeinden adjusted total DE {la['DE_LAENDER']['measures']['adjusted']['total_meur']} MEUR; Berlin {la['BE']['measures']['adjusted']['total_meur']}")
    payload = envelope(
        "de.laender.functions_2022", "Ausgaben der Länder und Gemeinden nach Aufgabenbereichen 2022", "Expenditure of Länder and municipalities by function 2022",
        "MEUR", "Jahresrechnungsstatistik 2022 (final), core and extra budgets; Bereinigte Ausgaben = total net of payments within the same level; Nettoausgaben = financed by the level itself; Personalausgaben = staff. Versorgung (V) is a Destatis carve-out spanning functions of groups 0 and 1 and must be shown as its own tile.",
        SCRIPT, year=2022, status="final", groups=GROUPS, scopes={v: k for k, v in SCOPES.items()},
        caveats=["Includes extra budgets (Extrahaushalte); larger than core budget documents.", "Group 8 (Finanzwirtschaft) contains equalisation payments and interest; it is inflated for donor Länder.", "Not the same scope or year as the federal 2024/2025 accounts; never add across files."],
        source=source_ref(SRC, FILE, "sheet csv-71711-12, columns Koerperschaft/Bundeslaender/Aufgabenbereiche/Ausgabeart_Einnahmeart/Jahr/Wert_Mill_EUR; rows in research/extracts/destatis_rechnungsergebnisse_2022/csv-71711-12-expenditure-2022.csv"),
        scopes_data=out,
    )
    write_json("de/laender/functions-2022.json", payload)


if __name__ == "__main__":
    main()
