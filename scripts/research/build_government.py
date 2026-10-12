#!/usr/bin/env python3
"""Eurostat government finance statistics (ESA 2010) for Germany → data/de/government/

- cofog.json                 general government expenditure by COFOG division (10) and group (69),
                             consolidated S13 plus the four subsectors, 1995-2024, EUR million
- aggregates.json            revenue, expenditure, deficit, interest, debt, GDP: time series 1991-2025
- revenue-by-subsector-2024.json  taxes and social contributions 2024 by receiving subsector incl. EU

The whole-state view is consolidated (transfers between levels eliminated by Eurostat), so it is the
one honest answer to "where does all public money in Germany go" without double counting.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import envelope, eurostat_cube, eurostat_get, raw_path, source_ref, write_json  # noqa: E402

SRC = "eurostat_gov"
SCRIPT = "scripts/research/build_government.py"

COFOG_DE = {
    "TOTAL": "Gesamtausgaben", "GF01": "Allgemeine öffentliche Verwaltung", "GF02": "Verteidigung",
    "GF03": "Öffentliche Ordnung und Sicherheit", "GF04": "Wirtschaftliche Angelegenheiten", "GF05": "Umweltschutz",
    "GF06": "Wohnungswesen und kommunale Einrichtungen", "GF07": "Gesundheitswesen", "GF08": "Freizeit, Kultur und Religion",
    "GF09": "Bildungswesen", "GF10": "Soziale Sicherung",
    "GF0101": "Exekutive und Legislative, Finanz- und Steuerwesen, auswärtige Angelegenheiten", "GF0102": "Wirtschaftshilfe für das Ausland",
    "GF0103": "Allgemeine Dienste", "GF0104": "Grundlagenforschung", "GF0105": "FuE allgemeine öffentliche Verwaltung",
    "GF0106": "Allgemeine öffentliche Verwaltung a.n.g.", "GF0107": "Transaktionen der öffentlichen Schuld",
    "GF0108": "Allgemeine Transfers zwischen staatlichen Ebenen",
    "GF0201": "Militärische Verteidigung", "GF0202": "Zivilverteidigung", "GF0203": "Militärhilfe für das Ausland", "GF0204": "FuE Verteidigung", "GF0205": "Verteidigung a.n.g.",
    "GF0301": "Polizei", "GF0302": "Feuerschutz", "GF0303": "Gerichte", "GF0304": "Justizvollzug", "GF0305": "FuE öffentliche Ordnung und Sicherheit", "GF0306": "Öffentliche Ordnung und Sicherheit a.n.g.",
    "GF0401": "Allgemeine Wirtschafts-, Handels- und Arbeitsmarktangelegenheiten", "GF0402": "Land- und Forstwirtschaft, Fischerei und Jagd", "GF0403": "Brennstoffe und Energie",
    "GF0404": "Bergbau, Industrie und Bauwesen", "GF0405": "Verkehr", "GF0406": "Kommunikation", "GF0407": "Andere Wirtschaftsbereiche", "GF0408": "FuE wirtschaftliche Angelegenheiten", "GF0409": "Wirtschaftliche Angelegenheiten a.n.g.",
    "GF0501": "Abfallwirtschaft", "GF0502": "Abwasserwirtschaft", "GF0503": "Bekämpfung der Umweltverschmutzung", "GF0504": "Schutz von Biodiversität und Landschaft", "GF0505": "FuE Umweltschutz", "GF0506": "Umweltschutz a.n.g.",
    "GF0601": "Wohnungswesen", "GF0602": "Kommunale Entwicklung", "GF0603": "Wasserversorgung", "GF0604": "Straßenbeleuchtung", "GF0605": "FuE Wohnungswesen", "GF0606": "Wohnungswesen a.n.g.",
    "GF0701": "Medizinische Erzeugnisse, Geräte und Ausrüstungen", "GF0702": "Ambulante Behandlung", "GF0703": "Krankenhäuser", "GF0704": "Öffentlicher Gesundheitsdienst", "GF0705": "FuE Gesundheitswesen", "GF0706": "Gesundheitswesen a.n.g.",
    "GF0801": "Freizeit und Sport", "GF0802": "Kultur", "GF0803": "Rundfunk und Verlagswesen", "GF0804": "Religion und sonstige Gemeinschaftsdienste", "GF0805": "FuE Freizeit, Kultur und Religion", "GF0806": "Freizeit, Kultur und Religion a.n.g.",
    "GF0901": "Elementar- und Primarbereich", "GF0902": "Sekundarbereich", "GF0903": "Postsekundärer, nicht-tertiärer Bereich", "GF0904": "Tertiärbereich", "GF0905": "Nicht nach Stufen zuordenbare Bildung", "GF0906": "Bildungsnahe Dienstleistungen", "GF0907": "FuE Bildungswesen", "GF0908": "Bildungswesen a.n.g.",
    "GF1001": "Krankheit und Invalidität", "GF1002": "Alter", "GF1003": "Hinterbliebene", "GF1004": "Familie und Kinder", "GF1005": "Arbeitslosigkeit", "GF1006": "Wohnen", "GF1007": "Soziale Ausgrenzung a.n.g.", "GF1008": "FuE soziale Sicherung", "GF1009": "Soziale Sicherung a.n.g.",
}
SECTOR_DE = {"S13": "Staat (konsolidiert)", "S1311": "Bund", "S1312": "Länder", "S1313": "Gemeinden", "S1314": "Sozialversicherung"}
SECTOR_EN = {"S13": "General government (consolidated)", "S1311": "Central government", "S1312": "State government (Länder)", "S1313": "Local government", "S1314": "Social security funds"}

AGG_ITEMS = {  # code: (de, en)
    "TR": ("Gesamteinnahmen des Staates", "Total general government revenue"),
    "TE": ("Gesamtausgaben des Staates", "Total general government expenditure"),
    "B9": ("Finanzierungssaldo", "Net lending (+) / net borrowing (-)"),
    "D2REC": ("Produktions- und Importabgaben", "Taxes on production and imports"),
    "D211REC": ("Mehrwertsteuer", "Value added type taxes (VAT)"),
    "D5REC": ("Einkommen- und Vermögensteuern", "Current taxes on income, wealth, etc."),
    "D51A_C1REC": ("Steuern auf Einkommen natürlicher Personen", "Taxes on individual or household income"),
    "D51B_C2REC": ("Steuern auf Unternehmensgewinne", "Taxes on corporate income"),
    "D91REC": ("Vermögenswirksame Steuern (Erbschaft u.a.)", "Capital taxes"),
    "D61REC": ("Nettosozialbeiträge", "Net social contributions"),
    "D611REC": ("Tatsächliche Sozialbeiträge der Arbeitgeber", "Employers' actual social contributions"),
    "D613REC": ("Tatsächliche Sozialbeiträge der privaten Haushalte", "Households' actual social contributions"),
    "P11_P12_P131": ("Verkäufe, Gebühren", "Market output, own-use output and payments for non-market output"),
    "D4REC": ("Vermögenseinkommen", "Property income received"),
    "D7REC": ("Sonstige laufende Transfers (Einnahmen)", "Other current transfers received"),
    "D9REC": ("Vermögenstransfers (Einnahmen)", "Capital transfers received"),
    "D1PAY": ("Arbeitnehmerentgelt", "Compensation of employees"),
    "P2": ("Vorleistungen", "Intermediate consumption"),
    "D41PAY": ("Zinsausgaben", "Interest paid"),
    "D3PAY": ("Subventionen", "Subsidies"),
    "D62PAY": ("Monetäre Sozialleistungen", "Social benefits in cash"),
    "D632PAY": ("Soziale Sachleistungen (gekaufte Marktproduktion)", "Social transfers in kind via market producers"),
    "D7PAY": ("Sonstige laufende Transfers (Ausgaben)", "Other current transfers paid"),
    "D9PAY": ("Vermögenstransfers (Ausgaben)", "Capital transfers paid"),
    "P51G": ("Bruttoanlageinvestitionen", "Gross fixed capital formation"),
    "D76PAY": ("MwSt.- und BNE-Eigenmittel an die EU", "VAT- and GNI-based EU own resources paid"),
}
EDP_ITEMS = {"GD": ("Maastricht-Schuldenstand", "Government consolidated gross debt (Maastricht)")}
GDP_ITEMS = {"B1GQ": ("Bruttoinlandsprodukt (jeweilige Preise)", "Gross domestic product (current prices)")}


def build_cofog():
    cube = eurostat_cube(raw_path(SRC, "gov_10a_exp_DE.json"))
    dims = dict(cube["dims"])
    years = [y for y in dims["time"]]
    cofog = dims["cofog99"]
    labels_en = cube["labels"]["cofog99"]
    rows = []
    for sector in dims["sector"]:
        for code in cofog:
            values, status = {}, {}
            for y in years:
                v, s = eurostat_get(cube, sector=sector, cofog99=code, time=y)
                if v is None:
                    continue
                values[y] = v
                status[y] = "provisional" if s == "p" else ("unflagged" if s is None else s)
            if not values:
                continue
            rows.append({
                "sector": sector, "code": code, "level": 0 if code == "TOTAL" else (1 if len(code) == 4 else 2),
                "parent": None if code == "TOTAL" else ("TOTAL" if len(code) == 4 else code[:4]),
                "label": {"de": COFOG_DE.get(code, labels_en[code]), "en": labels_en[code]},
                "values_meur": values, "status": status,
            })
    # checks: divisions sum to TOTAL and groups to their division, per sector/year, within 1 MEUR per child
    problems = 0
    by = {(r["sector"], r["code"]): r for r in rows}
    for sector in dims["sector"]:
        for y in years:
            tot = by.get((sector, "TOTAL"), {}).get("values_meur", {}).get(y)
            if tot is None:
                continue
            div_sum = sum(by[(sector, c)]["values_meur"].get(y, 0) for c in cofog if len(c) == 4 and (sector, c) in by)
            if abs(div_sum - tot) > 10:
                print(f"  COFOG {sector} {y}: divisions {div_sum} vs total {tot}")
                problems += 1
            for d in [c for c in cofog if len(c) == 4]:
                dv = by.get((sector, d), {}).get("values_meur", {}).get(y)
                if dv is None:
                    continue
                gs = [by[(sector, g)]["values_meur"].get(y) for g in cofog if len(g) == 6 and g[:4] == d and (sector, g) in by]
                if gs and all(g is not None for g in gs) and abs(sum(gs) - dv) > 10:
                    print(f"  COFOG {sector} {y} {d}: groups {sum(gs)} vs division {dv}")
                    problems += 1
    if problems:
        raise SystemExit(f"COFOG hierarchy: {problems} mismatches")
    latest = max(y for y in years if by[("S13", "TOTAL")]["values_meur"].get(y) is not None)
    print(f"COFOG: {len(rows)} series, hierarchy verified; latest year {latest} ({by[('S13','TOTAL')]['status'][latest]}), S13 total {by[('S13','TOTAL')]['values_meur'][latest]} MEUR")
    payload = envelope(
        "de.government.cofog", "Staatsausgaben nach Aufgabenbereichen (COFOG), konsolidiert", "General government expenditure by function (COFOG), consolidated",
        "MEUR", "ESA 2010 accrual; general government S13 consolidated (transfers between levels eliminated) and subsectors S1311-S1314 (not consolidated with each other, do not add subsectors to S13); 'p' = provisional per Eurostat; 'unflagged' = Eurostat sets no flag (not an assertion of finality)",
        SCRIPT, years=years, latest_year=latest, eurostat_updated=cube["updated"],
        sectors={s: {"de": SECTOR_DE[s], "en": SECTOR_EN[s]} for s in dims["sector"]},
        source=source_ref(SRC, "gov_10a_exp_DE.json", "dimensions sector × cofog99 × time, na_item TE, unit MIO_EUR", "German labels are editorial translations of the Eurostat COFOG names"),
        rows=rows,
    )
    write_json("de/government/cofog.json", payload)
    return by, latest


def build_aggregates():
    main = eurostat_cube(raw_path(SRC, "gov_10a_main_DE.json"))
    edp = eurostat_cube(raw_path(SRC, "gov_10dd_edpt1_DE.json"))
    years = dict(main["dims"])["time"]
    rows = []
    for code, (de, en) in AGG_ITEMS.items():
        values, status = {}, {}
        for y in years:
            v, s = eurostat_get(main, na_item=code, time=y)
            if v is None:
                continue
            values[y] = v
            status[y] = "provisional" if s == "p" else ("unflagged" if s is None else s)
        rows.append({"id": code, "label": {"de": de, "en": en}, "values_meur": values, "status": status, "dataset": "gov_10a_main"})
    for code, (de, en) in EDP_ITEMS.items():
        values, status = {}, {}
        for y in dict(edp["dims"])["time"]:
            v, s = eurostat_get(edp, na_item=code, time=y)
            if v is None:
                continue
            values[y] = v
            status[y] = "provisional" if s == "p" else ("unflagged" if s is None else s)
        rows.append({"id": code, "label": {"de": de, "en": en}, "values_meur": values, "status": status, "dataset": "gov_10dd_edpt1"})
    gdp = eurostat_cube(raw_path("eurostat_nama", "nama_10_gdp_DE_B1GQ.json"))
    for code, (de, en) in GDP_ITEMS.items():
        values, status = {}, {}
        for y in dict(gdp["dims"])["time"]:
            v, s = eurostat_get(gdp, na_item=code, time=y)
            if v is None:
                continue
            values[y] = v
            status[y] = "provisional" if s == "p" else ("unflagged" if s is None else s)
        rows.append({"id": code, "label": {"de": de, "en": en}, "values_meur": values, "status": status, "dataset": "nama_10_gdp"})
    by = {r["id"]: r for r in rows}
    # check: TR - TE = B9 for every year
    for y in years:
        tr, te, b9 = (by[c]["values_meur"].get(y) for c in ("TR", "TE", "B9"))
        if None in (tr, te, b9):
            continue
        if abs((tr - te) - b9) > 1.5:
            raise SystemExit(f"TR-TE != B9 in {y}: {tr}-{te} vs {b9}")
    latest = max(by["TE"]["values_meur"])
    print(f"aggregates: TR-TE=B9 verified; latest {latest}: TR {by['TR']['values_meur'][latest]} TE {by['TE']['values_meur'][latest]} debt {by['GD']['values_meur'].get(latest)} GDP {by['B1GQ']['values_meur'].get(latest)}")
    payload = envelope(
        "de.government.aggregates", "Staatseinnahmen, -ausgaben, Defizit, Zinsen, Schulden und BIP (Zeitreihe)", "General government revenue, expenditure, deficit, interest, debt and GDP (time series)",
        "MEUR", "ESA 2010 accrual, general government S13 consolidated; debt = Maastricht gross debt at year end; 'p' = provisional, 'unflagged' = no Eurostat flag",
        SCRIPT, years=years, latest_year=latest,
        source_main=source_ref(SRC, "gov_10a_main_DE.json", "na_item × time, sector S13, unit MIO_EUR"),
        source_edp=source_ref(SRC, "gov_10dd_edpt1_DE.json", "na_item GD × time, sector S13"),
        source_gdp=source_ref("eurostat_nama", "nama_10_gdp_DE_B1GQ.json", "na_item B1GQ, unit CP_MEUR × time"),
        rows=rows,
    )
    write_json("de/government/aggregates.json", payload)
    return by


def build_taxag():
    cube = eurostat_cube(raw_path(SRC, "gov_10a_taxag_DE_2024.json"))
    dims = dict(cube["dims"])
    want = {
        "D2": ("Produktions- und Importabgaben", "Taxes on production and imports"),
        "D211": ("Mehrwertsteuer", "VAT"),
        "D5": ("Einkommen- und Vermögensteuern", "Current taxes on income and wealth"),
        "D51": ("Einkommensteuern", "Taxes on income"),
        "D91": ("Vermögenswirksame Steuern", "Capital taxes"),
        "D61": ("Nettosozialbeiträge", "Net social contributions"),
        "D2_D5_D91": ("Steuern insgesamt", "Total taxes"),
        "D2_D5_D91_D61_M_D995": ("Steuern und Sozialbeiträge insgesamt (nach Abzug D.995)", "Total receipts from taxes and social contributions (after D.995)"),
    }
    rows = []
    for item, (de, en) in want.items():
        if item not in dims["na_item"]:
            continue
        per = {}
        for sector in dims["sector"]:
            v, s = eurostat_get(cube, na_item=item, sector=sector, time="2024")
            if v is not None:
                per[sector] = {"value_meur": v, "status": "provisional" if s == "p" else "final"}
        rows.append({"id": item, "label": {"de": de, "en": en}, "by_sector": per})
    payload = envelope(
        "de.government.revenue_by_subsector_2024", "Steuern und Sozialbeiträge 2024 nach empfangendem Teilsektor (inkl. EU)", "Taxes and social contributions 2024 by receiving subsector (incl. EU institutions)",
        "MEUR", "ESA 2010 accrual; S13_S212 = general government plus EU institutions; S212 = EU institutions' share collected in Germany", SCRIPT,
        sectors={**{s: {"de": SECTOR_DE[s], "en": SECTOR_EN[s]} for s in SECTOR_DE}, "S13_S212": {"de": "Staat und EU-Institutionen", "en": "General government and EU institutions"}, "S212": {"de": "EU-Institutionen", "en": "EU institutions"}},
        source=source_ref(SRC, "gov_10a_taxag_DE_2024.json", "na_item × sector, time 2024"), rows=rows,
    )
    write_json("de/government/revenue-by-subsector-2024.json", payload)


if __name__ == "__main__":
    build_cofog()
    build_aggregates()
    build_taxag()
