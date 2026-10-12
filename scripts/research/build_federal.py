#!/usr/bin/env python3
"""Federal core budget, actual spending (Ist) 2024 and 2025 → data/de/federal/*.json

Inputs
- research/raw/bundeshaushalt_rechnung/rechnung_{2024,2025}.xml   Haushaltsrechnung per Titel (redistributable)
- research/cache/bmf_monatsbericht/2025-01-vorlaeufiger-abschluss-bundeshaushalt-2024.html
  research/cache/bmf_monatsbericht/2026-01-abschluss-bundeshaushalt-ktf-svik-2025.html   BMF provisional closings
  (cached, not redistributable; the rows used are written to research/extracts/bmf_monatsbericht/*.csv)

Outputs
- data/de/federal/budget-2024.json, budget-2025.json   gross XML total → bridge → BMF official total; Hauptfunktionen,
  Funktionen (2/3-digit), Einzelpläne, top 40 Titel, key items
- data/de/federal/overview.json                        2023–2025 headline figures incl. special funds
- research/extracts/bmf_monatsbericht/abschluss-2024-tabellen.csv, abschluss-2025-tabellen.csv

The build fails if the bridge does not land on the official total (±0.5 Mio EUR, BMF rounds to Mio) or if any
Hauptfunktion / mapped sub-function / interest figure differs from the BMF table by more than 1 Mio EUR.
"""
from __future__ import annotations

import csv
import html
import re
import sys
import xml.etree.ElementTree as ET
from collections import defaultdict
from html.parser import HTMLParser
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import EXTRACTS, ROOT, envelope, raw_path, source_ref, write_json  # noqa: E402

SCRIPT = "scripts/research/build_federal.py"
XML_SRC = "bundeshaushalt_rechnung"
BMF_SRC = "bmf_monatsbericht"
BMF_FILE = {
    2024: "2025-01-vorlaeufiger-abschluss-bundeshaushalt-2024.html",
    2025: "2026-01-abschluss-bundeshaushalt-ktf-svik-2025.html",
}
STATUS = "provisional (vorläufiger Abschluss)"
MEUR = 1_000_000

# Gruppierungsplan Obergruppen that BMF excludes from "Ausgaben" (footnote 1 of every expenditure table):
# "Mit Ausnahme der Ausgaben zur Schuldentilgung am Kreditmarkt [59], der Zuführungen an Rücklagen [91], der Ausgaben
#  zur Deckung eines kassenmäßigen Fehlbetrags [96] und den Tilgungsausgaben aufgrund nicht-struktureller Einnahmen
#  aus zurückgezahlten Notlagenmitteln [595 01]. Ohne Ausgaben aus haushaltstechnischen Verrechnungen [98]."
BRIDGE_ITEMS = [
    ("59", {"de": "Tilgungsausgaben am Kreditmarkt (Obergruppe 59; 2024/2025 nur Tit. 595 01 Kap. 3201: Tilgung aus nicht-strukturellen Rückflüssen von Notlagenkrediten)",
            "en": "Debt repayment on the credit market (Obergruppe 59; in 2024/2025 only Titel 595 01 in Kapitel 3201: repayment out of non-structural refunds of emergency-credit funds)"}),
    ("91", {"de": "Zuführungen an Rücklagen (Obergruppe 91)", "en": "Transfers to reserves (Obergruppe 91)"}),
    ("96", {"de": "Ausgaben zur Deckung eines kassenmäßigen Fehlbetrags (Obergruppe 96)", "en": "Expenditure covering a cash shortfall (Obergruppe 96)"}),
    ("98", {"de": "Haushaltstechnische Verrechnungen (Obergruppe 98: Tit. 981 Verrechnungsausgaben § 61 BHO, 982 durchlaufende Posten)",
            "en": "Budget-technical clearing items (Obergruppe 98: Titel 981 internal settlements under § 61 BHO, 982 pass-through items)"}),
]

HF_LABEL_EN = {
    "0": "General public services", "1": "Education, science, research, cultural affairs",
    "2": "Social security, family and youth, labour-market policy", "3": "Health, environment, sport and recreation",
    "4": "Housing, urban development, spatial planning and municipal community services",
    "5": "Food, agriculture and forestry", "6": "Energy and water management, trade, services",
    "7": "Transport and communications", "8": "General financial management",
}
# Funktionenplan codes whose label can be taken from a row of BMF "Ausgaben des Bundeshaushalts nach Aufgabenbereichen".
# The build verifies that the XML sum for the code equals the row (±1 Mio EUR) before using the label.
FKT_FROM_BMF = {
    "01": ("Politische Führung und zentrale Verwaltung", "Political leadership and central administration"),
    "011": ("Politische Führung", "Political leadership"),
    "018": ("Versorgung einschließlich Beihilfen", "Civil-service pensions including Beihilfe health allowances"),
    "02": ("Auswärtige Angelegenheiten", "Foreign affairs"),
    "021": ("Auslandsvertretungen", "Missions abroad"),
    "022": ("Beiträge an Internationale Organisationen", "Contributions to international organisations"),
    "023": ("Wirtschaftliche Zusammenarbeit und Entwicklung", "Economic cooperation and development"),
    "029": ("Sonstige auswärtige Angelegenheiten", "Other foreign affairs"),
    "03": ("Verteidigung", "Defence"),
    "04": ("Öffentliche Sicherheit und Ordnung", "Public security and order"),
    "042": ("Polizei", "Police"),
    "06": ("Finanzverwaltung", "Financial administration"),
    "13": ("Hochschulen", "Higher-education institutions"),
    "14": ("Förderung für Schüler, Studierende, Weiterbildungsteilnehmende", "Support for pupils, students and continuing-education participants"),
    "16": ("Wissenschaft, Forschung, Entwicklung außerhalb der Hochschulen", "Science, research and development outside higher education"),
    "164": ("Gemeinsame Forschungsförderung von Bund und Ländern", "Joint federal–Länder research funding"),
    "165": ("Forschung und experimentelle Entwicklung", "Research and experimental development"),
    "22": ("Sozialversicherung einschließlich Arbeitslosenversicherung", "Social insurance including unemployment insurance"),
    "221": ("Allgemeine Rentenversicherung (nur Bundesträger)", "General statutory pension insurance (federal carriers only)"),
    "222": ("Knappschaftliche Rentenversicherung (nur Bundesträger)", "Miners' pension insurance (federal carriers only)"),
    "224": ("Krankenversicherung", "Health insurance"),
    "226": ("Alterssicherung der Landwirte (einschließlich Landabgabenrente)", "Farmers' old-age security (including land-transfer pension)"),
    "229": ("Sonstige Sozialversicherungen", "Other social insurance"),
    "23": ("Familienhilfe, Wohlfahrtspflege", "Family assistance, welfare"),
    "232": ("Elterngeld, Erziehungsgeld, Mutterschutz", "Parental allowance, child-raising allowance, maternity protection"),
    "24": ("Soziale Leistungen für Folgen von Krieg und politischen Ereignissen", "Social benefits for consequences of war and political events"),
    "25": ("Arbeitsmarktpolitik", "Labour-market policy"),
    "251": ("Bürgergeld nach dem SGB II", "Bürgergeld (basic income support) under SGB II"),
    "252": ("Leistungen für Unterkunft und Heizung nach dem SGB II", "Housing and heating benefits under SGB II"),
    "253": ("Aktive Arbeitsmarktpolitik", "Active labour-market policy"),
    "259": ("Sonstige Leistungen der Grundsicherung für Arbeitsuchende nach dem SGB II", "Other basic-support benefits for job seekers under SGB II"),
    "282": ("Grundsicherung im Alter und bei Erwerbsminderung nach dem SGB XII", "Basic old-age and reduced-earning-capacity support under SGB XII"),
    "64": ("Energie- und Wasserversorgung, Entsorgung", "Energy and water supply, waste disposal"),
    "66": ("Geld- und Versicherungswesen", "Banking and insurance"),
    "69": ("Regionale Fördermaßnahmen", "Regional development measures"),
    "72": ("Straßen", "Roads"),
    "721": ("Bundesautobahnen", "Federal motorways"),
    "722": ("Bundesstraßen", "Federal trunk roads"),
    "73": ("Wasserstraßen und Häfen, Förderung der Schifffahrt", "Waterways and ports, shipping support"),
    "74": ("Eisenbahnen und öffentlicher Personennahverkehr", "Railways and local public transport"),
    "83": ("Zinsausgaben und Ausgaben im Zusammenhang mit der Schuldenaufnahme", "Interest and other borrowing-related expenditure"),
}
# BMF rows that combine several Funktionenplan codes (checked, not used as labels).
FKT_COMBINED_ROWS = {
    "Luftfahrt, Nachrichtenwesen, sonstiges Verkehrswesen": ("75", "77", "79"),
    "Grund- und Kapitalvermögen, Sondervermögen und Finanzzuweisungen": ("81", "82"),
}

EPL_EN = {
    "Bundespräsident und Bundespräsidialamt": "Federal President and Office of the Federal President",
    "Deutscher Bundestag": "German Bundestag",
    "Bundesrat": "Bundesrat",
    "Bundeskanzler und Bundeskanzleramt": "Federal Chancellor and Federal Chancellery",
    "Auswärtiges Amt": "Federal Foreign Office",
    "Bundesministerium des Innern und für Heimat": "Federal Ministry of the Interior and Community",
    "Bundesministerium des Innern": "Federal Ministry of the Interior",
    "Bundesministerium der Justiz": "Federal Ministry of Justice",
    "Bundesministerium der Justiz und für Verbraucherschutz": "Federal Ministry of Justice and Consumer Protection",
    "Bundesministerium der Finanzen": "Federal Ministry of Finance",
    "Bundesministerium für Wirtschaft und Klimaschutz": "Federal Ministry for Economic Affairs and Climate Action",
    "Bundesministerium für Wirtschaft und Energie": "Federal Ministry for Economic Affairs and Energy",
    "Bundesministerium für Ernährung und Landwirtschaft": "Federal Ministry of Food and Agriculture",
    "Bundesministerium für Landwirtschaft, Ernährung und Heimat": "Federal Ministry of Agriculture, Food and Regional Identity",
    "Bundesministerium für Arbeit und Soziales": "Federal Ministry of Labour and Social Affairs",
    "Bundesministerium für Digitales und Verkehr": "Federal Ministry for Digital and Transport",
    "Bundesministerium für Verkehr": "Federal Ministry of Transport",
    "Bundesministerium der Verteidigung": "Federal Ministry of Defence",
    "Bundesministerium für Gesundheit": "Federal Ministry of Health",
    "Bundesministerium für Umwelt, Naturschutz, nukleare Sicherheit und Verbraucherschutz": "Federal Ministry for the Environment, Nature Conservation, Nuclear Safety and Consumer Protection",
    "Bundesministerium für Umwelt, Klimaschutz, Naturschutz und nukleare Sicherheit": "Federal Ministry for the Environment, Climate Action, Nature Conservation and Nuclear Safety",
    "Bundesministerium für Familie, Senioren, Frauen und Jugend": "Federal Ministry for Family Affairs, Senior Citizens, Women and Youth",
    "Bundesministerium für Bildung, Familie, Senioren, Frauen und Jugend": "Federal Ministry of Education, Family Affairs, Senior Citizens, Women and Youth",
    "Bundesverfassungsgericht": "Federal Constitutional Court",
    "Bundesrechnungshof": "Federal Court of Audit",
    "Der Bundesbeauftragte für den Datenschutz und die Informationsfreiheit": "Federal Commissioner for Data Protection and Freedom of Information",
    "Die Bundesbeauftragte für den Datenschutz und die Informationsfreiheit": "Federal Commissioner for Data Protection and Freedom of Information",
    "Unabhängiger Kontrollrat": "Independent Control Council",
    "Bundesministerium für wirtschaftliche Zusammenarbeit und Entwicklung": "Federal Ministry for Economic Cooperation and Development",
    "Bundesministerium für Digitales und Staatsmodernisierung": "Federal Ministry for Digital Affairs and State Modernisation",
    "Bundesministerium für Wohnen, Stadtentwicklung und Bauwesen": "Federal Ministry for Housing, Urban Development and Building",
    "Bundesministerium für Bildung und Forschung": "Federal Ministry of Education and Research",
    "Bundesministerium für Forschung, Technologie und Raumfahrt": "Federal Ministry of Research, Technology and Space",
    "Bundesschuld": "Federal debt",
    "Allgemeine Finanzverwaltung": "General financial administration",
}


# ----------------------------------------------------------------------------------------------- XML

def parse_amount(text: str) -> int:
    """'1.088.350,00' → cents; negative values carry a trailing minus ('16,43-')."""
    neg = text.endswith("-")
    t = text.rstrip("-").replace(".", "").replace(",", ".")
    cents = int(round(float(t) * 100))
    return -cents if neg else cents


def read_xml(year: int) -> dict:
    root = ET.parse(raw_path(XML_SRC, f"rechnung_{year}.xml")).getroot()
    assert root.get("jahr") == str(year), root.attrib
    epl_names, titel, empty = {}, {}, 0
    for epl in root.findall("einzelplan"):
        epl_names[epl.get("nr")] = epl.findtext("text")
        for kap in epl.findall("kapitel"):
            for side in ("ausgaben", "einnahmen"):
                for blk in kap.findall(side):
                    for t in blk.iter("titel"):  # recurses into <titelgruppe>; flexibilised blocks are plain <ausgaben>
                        if not t.get("nr"):
                            empty += 1  # four empty placeholder <titel/> elements per file (no number, no values)
                            continue
                        key = (side, epl.get("nr"), kap.get("nr"), t.get("nr"))
                        rec = {
                            "side": side, "epl": epl.get("nr"), "kap": kap.get("nr"), "titel": t.get("nr"),
                            "grp": t.get("nr")[:3], "og": t.get("nr")[:2], "fkt": t.get("fkt"),
                            "flex": t.get("flexibilisiert"), "seite": t.get("seite"), "text": t.findtext("text"),
                            "soll": parse_amount(t.find("soll").get("wert")), "ist": parse_amount(t.find("ist").get("wert")),
                        }
                        if key in titel:
                            if titel[key]["ist"] != rec["ist"]:
                                raise SystemExit(f"{year}: duplicate Titel {key} with different Ist")
                            continue
                        titel[key] = rec
    assert all(len(r["fkt"]) == 3 and r["fkt"].isdigit() for r in titel.values()), "Titel without 3-digit fkt"
    return {"epl_names": epl_names, "titel": list(titel.values()), "empty_elements": empty}


def annexed_kapitel(titel: list[dict]) -> list[str]:
    """Kapitel numbered xx9y are annexed Wirtschaftspläne (Sondervermögen, EU own resources pass-through, agencies),
    not part of the core budget. 2024 has none; 2025 has 16."""
    return sorted({r["kap"] for r in titel if r["kap"][2] == "9"})


# ----------------------------------------------------------------------------------------------- BMF HTML

class _Tables(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tables, self.cur, self.row, self.cell = [], None, None, None
        self.in_caption = False

    def handle_starttag(self, tag, attrs):
        if tag == "table":
            self.cur = {"caption": "", "rows": []}
        elif tag == "caption" and self.cur is not None:
            self.in_caption = True
        elif tag == "tr" and self.cur is not None:
            self.row = []
        elif tag in ("td", "th") and self.row is not None:
            self.cell = ""
        elif tag == "br" and self.cell is not None:
            self.cell += " "

    def handle_endtag(self, tag):
        if tag == "table" and self.cur is not None:
            self.tables.append(self.cur)
            self.cur = None
        elif tag == "caption":
            self.in_caption = False
        elif tag == "tr" and self.row is not None:
            self.cur["rows"].append(self.row)
            self.row = None
        elif tag in ("td", "th") and self.cell is not None:
            self.row.append(re.sub(r"\s+", " ", self.cell).strip())
            self.cell = None

    def handle_data(self, data):
        if self.in_caption:
            self.cur["caption"] += data
        elif self.cell is not None:
            self.cell += data


def norm(label: str) -> str:
    return re.sub(r"[\s\-¹²³⁴.:]", "", label).lower()


def bmf_number(cell: str) -> float | None:
    cell = cell.strip()
    if cell in ("", "-", "X", "x"):
        return None
    return float(cell.replace(".", "").replace(",", "."))


def read_bmf(year: int) -> dict:
    """Parse the cached article: every numeric table row of the tables we use plus a few prose figures.
    Returns {"rows": [...], "lookup": {(table_no, norm(label)): row}}."""
    path = ROOT / "research" / "cache" / BMF_SRC / BMF_FILE[year]
    if not path.exists():
        raise SystemExit(f"missing cached file {path} (run fetch.py; the BMF pages are not redistributable)")
    text = path.read_text(encoding="utf-8")
    p = _Tables()
    p.feed(text)
    # the table number sits in a <div class="figcaption"> ~2,200 characters after each </table>
    numbers = []
    for m in re.finditer(r"</table>", text):
        n = re.search(r"Tabelle\s*(\d+)", text[m.end():m.end() + 3000])
        if not n:
            raise SystemExit(f"{year}: no 'Tabelle N' figcaption after the table ending at offset {m.end()}")
        numbers.append(int(n.group(1)))
    if len(numbers) != len(p.tables) or numbers != sorted(numbers):
        raise SystemExit(f"{year}: table numbering {numbers} does not match {len(p.tables)} parsed tables")
    rows, lookup = [], {}
    for no, t in zip(numbers, p.tables):
        caption = re.sub(r"\s+", " ", html.unescape(t["caption"])).strip()
        if caption.startswith("Tilgungsplan"):
            continue  # repayment schedule in Mrd EUR per period; not used
        schuldenbremse = "Schuldenbremse" in caption  # lfd. Nr. | Bezeichnung | Soll | Ist; only rows 8/8a (NKA, Tilgung) are used
        header = t["rows"][0] if t["rows"] else []
        prev_year_col = any(f"Ist {year - 1}" in h for h in header)
        for r in t["rows"][1:]:
            if len(r) < 3:
                continue
            if schuldenbremse:
                if r[0] not in ("8", "8a") or len(r) < 4:
                    continue
                label = f"{r[0]} {html.unescape(r[1])}"
                nums = [bmf_number(c) if re.fullmatch(r"[\d.,+\-X ]*", c) else None for c in r[2:4]]
            else:
                label = html.unescape(r[0])
                nums = [bmf_number(c) if re.fullmatch(r"[\d.,+\-X ]*", c) else None for c in r[1:]]
            if not label or all(v is None for v in nums):
                continue
            rec = {
                "table_no": no, "table": caption, "row": re.sub(r"[¹²³⁴]", "", label).strip(),
                "soll": nums[0] if len(nums) > 0 else None, "ist": nums[1] if len(nums) > 1 else None,
                "ist_prev": (nums[2] if len(nums) > 2 and prev_year_col else None),
                "coordinates": f"Tabelle {no} '{caption}', row '{label}'",
            }
            rows.append(rec)
            lookup.setdefault((no, norm(rec["row"])), rec)
    return {"rows": rows, "lookup": lookup, "path": path}


def bmf_get(bmf: dict, table_no: int, label: str) -> dict:
    rec = bmf["lookup"].get((table_no, norm(label)))
    if rec is None:
        raise SystemExit(f"BMF row not found: Tabelle {table_no} {label!r}")
    return rec


def prose_figures(year: int, bmf: dict) -> list[dict]:
    """Figures only stated in the article text (KTF, SVIK). Each entry is matched against the exact sentence."""
    text = bmf["path"].read_text(encoding="utf-8")
    text = re.sub(r"<table.*?</table>", "", text, flags=re.S)
    text = html.unescape(re.sub(r"<[^>]+>", " ", text))
    text = re.sub(r"\s+", " ", text)
    specs = {
        2024: [
            ("ktf_investive_ausgaben", r"im Klima- und Transformationsfonds \(KTF\) umfangreiche Investitionsausgaben in Höhe von ([\d,]+) Mrd\. Euro"),
            ("ktf_investive_ausgaben_delta_vorjahr", r"Das waren um ([\d,]+) Mrd\. Euro höhere investive Ausgaben als im Jahr 2023"),
            ("ktf_programmausgaben", r"Programmausgaben im KTF im abgelaufenen Jahr auf insgesamt ([\d,]+) Mrd\. Euro"),
            ("ktf_programmausgaben_delta_vorjahr", r"Das waren ([\d,]+) Mrd\. Euro höhere Programmausgaben als im Jahr 2023"),
        ],
        2025: [
            ("ktf_investive_ausgaben", r"Im KTF erfolgten im Jahr 2025 umfangreiche investive Ausgaben in Höhe von ([\d,]+) Mrd\. Euro"),
            ("ktf_programmausgaben", r"Programmausgaben im KTF im abgelaufenen Jahr auf insgesamt ([\d,]+) Mrd\. Euro"),
            ("svik_ausgaben", r"wurden 64 Prozent \(([\d,]+) Mrd\. Euro\) aller geplanten Ausgaben abgerufen"),
            ("svik_zuweisung_an_ktf", r"Davon gingen (\d+) Mrd\. Euro an den KTF"),
            ("svik_bundessaeule_ausgaben", r"wurden 74 Prozent \(([\d,]+) Mrd\. Euro\) der in der Bundessäule geplanten Mittel verausgabt"),
            ("investitionen_bund_ktf_svik_zusammen", r"beliefen sich zusammengenommen im Jahr 2025 auf ([\d,]+) Mrd\. Euro"),
        ],
    }[year]
    out = []
    for key, pattern in specs:
        m = re.search(pattern, text)
        if not m:
            raise SystemExit(f"{year}: prose figure {key} not found ({pattern})")
        val = float(m.group(1).replace(",", "."))
        sentence = text[max(0, m.start() - 80):m.end() + 40].strip()
        out.append({"table_no": None, "table": "Text", "row": key, "soll": None, "ist": val * 1000, "ist_prev": None,
                    "unit_note": "stated in Mrd. EUR with one decimal; written here in Mio EUR",
                    "coordinates": f"article text, sentence: \"…{sentence}…\""})
    return out


def write_extract(year: int, bmf: dict, prose: list[dict]) -> None:
    out = EXTRACTS / BMF_SRC / f"abschluss-{year}-tabellen.csv"
    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["source_id", "file", "table_no", "table", "row", f"soll_{year}_meur", f"ist_{year}_meur", f"ist_{year - 1}_meur", "coordinates", "extracted_by"])
        for r in bmf["rows"] + prose:
            w.writerow([BMF_SRC, BMF_FILE[year], r["table_no"] if r["table_no"] else "", r["table"], r["row"],
                        "" if r["soll"] is None else f"{r['soll']:g}", "" if r["ist"] is None else f"{r['ist']:g}",
                        "" if r["ist_prev"] is None else f"{r['ist_prev']:g}", r["coordinates"], SCRIPT])
    print(f"wrote {out.relative_to(ROOT)} ({len(bmf['rows']) + len(prose)} rows)")


# ----------------------------------------------------------------------------------------------- build

def meur(cents: int) -> float:
    return cents / 100 / MEUR


def eur(cents: int) -> float:
    return round(cents / 100, 2)


def label_for(code: str, bmf_rows: dict, sums: dict) -> tuple[dict | None, str]:
    if code in FKT_FROM_BMF:
        de, en = FKT_FROM_BMF[code]
        row = bmf_rows.get(norm(de))
        if row is None:
            raise SystemExit(f"BMF Aufgabenbereiche row for fkt {code} ({de}) not found")
        if abs(meur(sums[code]) - row["ist"]) > 1:
            raise SystemExit(f"fkt {code} {de}: XML {meur(sums[code]):.1f} vs BMF {row['ist']} Mio EUR")
        return {"de": de, "en": en}, f"BMF Tabelle {row['table_no']} row '{row['row']}' (XML sum for code {code} equals the row within 1 Mio EUR)"
    return None, "Funktionenplan label not contained in the sources (XML carries codes only); code shown as is"


def build_year(year: int) -> dict:
    x = read_xml(year)
    bmf = read_bmf(year)
    prose = prose_figures(year, bmf)
    write_extract(year, bmf, prose)
    aufg_no = {2024: 6, 2025: 7}[year]  # "Ausgaben des Bundeshaushalts nach Aufgabenbereichen"
    konsum_no = {2024: 4, 2025: 5}[year]
    aufg_rows = {norm(r["row"]): r for r in bmf["rows"] if r["table_no"] == aufg_no}
    official_meur = bmf_get(bmf, 1, "1. Ausgaben")["ist"]
    assert bmf_get(bmf, aufg_no, "Ausgaben zusammen")["ist"] == official_meur

    exp = [r for r in x["titel"] if r["side"] == "ausgaben"]
    annex = annexed_kapitel(exp)
    core = [r for r in exp if r["kap"] not in annex]
    excluded_og = {og for og, _ in BRIDGE_ITEMS}
    official_set = [r for r in core if r["og"] not in excluded_og]

    xml_gross = sum(r["ist"] for r in exp)
    core_gross = sum(r["ist"] for r in core)
    bridge = []
    for og, label in BRIDGE_ITEMS:
        items = [r for r in core if r["og"] == og]
        amt = sum(r["ist"] for r in items)
        bridge.append({
            "gruppierung": og, "label": label, "amount_eur": eur(amt), "titel_count": len(items),
            "titel_nonzero": [{"epl": r["epl"], "kapitel": r["kap"], "titel": r["titel"], "fkt": r["fkt"], "text": r["text"], "ist_eur": eur(r["ist"])}
                              for r in sorted(items, key=lambda r: -abs(r["ist"])) if r["ist"] != 0][:5],
        })
    annex_rows = []
    for k in annex:
        a = sum(r["ist"] for r in exp if r["kap"] == k)
        e = sum(r["ist"] for r in x["titel"] if r["side"] == "einnahmen" and r["kap"] == k)
        top = max((r for r in exp if r["kap"] == k), key=lambda r: r["ist"])
        annex_rows.append({"kapitel": k, "einzelplan": k[:2], "ausgaben_eur": eur(a), "einnahmen_eur": eur(e), "balanced": a == e, "largest_titel": top["text"]})
    reconciled = core_gross - sum(sum(r["ist"] for r in core if r["og"] == og) for og in excluded_og)
    residual_meur = meur(reconciled) - official_meur
    print(f"\n== {year} reconciliation (Mio EUR)")
    print(f"  XML gross, all expenditure Titel           {meur(xml_gross):>14,.3f}")
    if annex:
        print(f"  - annexed Wirtschaftspläne (Kapitel xx9y)  {meur(xml_gross - core_gross):>14,.3f}   {', '.join(annex)}")
    print(f"  = core budget gross                        {meur(core_gross):>14,.3f}")
    for b in bridge:
        print(f"  - Obergruppe {b['gruppierung']}                            {b['amount_eur'] / MEUR:>14,.3f}")
    print(f"  = reconciled                               {meur(reconciled):>14,.3f}")
    print(f"  BMF official Ist                           {official_meur:>14,.3f}   residual {residual_meur:+.3f}")
    if abs(residual_meur) > 0.5:
        raise SystemExit(f"{year}: bridge does not reconcile (residual {residual_meur:+.3f} Mio EUR)")

    # functions
    s1, s2, s3 = defaultdict(int), defaultdict(int), defaultdict(int)
    for r in official_set:
        s1[r["fkt"][0]] += r["ist"]
        s2[r["fkt"][:2]] += r["ist"]
        s3[r["fkt"]] += r["ist"]
    sums = {**s2, **s3}
    hauptfunktionen = []
    for hf in sorted(s1):
        row = next((r for r in bmf["rows"] if r["table_no"] == aufg_no and r["row"].startswith(f"{hf}. ")), None)
        if row is None:
            raise SystemExit(f"{year}: BMF has no Hauptfunktion {hf} row")
        de = row["row"][3:].strip()
        match = abs(meur(s1[hf]) - row["ist"]) <= 1
        print(f"  HF {hf} {de[:48]:<48} XML {meur(s1[hf]):>12,.1f}  BMF {row['ist']:>10,.0f}  {'ok' if match else 'MISMATCH'}")
        if not match:
            raise SystemExit(f"{year}: Hauptfunktion {hf} differs from BMF by more than 1 Mio EUR")
        funktionen = []
        for f2 in sorted(k for k in s2 if k[0] == hf):
            lab2, src2 = label_for(f2, aufg_rows, sums)
            sub = []
            for f3 in sorted(k for k in s3 if k[:2] == f2):
                lab3, src3 = label_for(f3, aufg_rows, sums)
                sub.append({"code": f3, "label": lab3, "label_source": src3, "amount_eur": eur(s3[f3])})
            funktionen.append({"code": f2, "label": lab2, "label_source": src2, "amount_eur": eur(s2[f2]), "funktionen": sub})
        hauptfunktionen.append({
            "code": hf, "label": {"de": de, "en": HF_LABEL_EN[hf]},
            "label_source": f"BMF Tabelle {aufg_no} row '{row['row']}'",
            "amount_eur": eur(s1[hf]), "bmf_table_amount_meur": row["ist"], "bmf_table_soll_meur": row["soll"], "match": match,
            "funktionen": funktionen,
        })
    for label, codes in FKT_COMBINED_ROWS.items():
        row = aufg_rows[norm(label)]
        tot = sum(s2[c] for c in codes)
        if abs(meur(tot) - row["ist"]) > 1:
            raise SystemExit(f"{year}: combined row {label} ({'+'.join(codes)}) {meur(tot):.1f} vs BMF {row['ist']}")
    combined_checked = {label: {"codes": list(codes), "amount_eur": eur(sum(s2[c] for c in codes)), "bmf_table_amount_meur": aufg_rows[norm(label)]["ist"]} for label, codes in FKT_COMBINED_ROWS.items()}

    # Einzelpläne
    epl_sum, epl_gross = defaultdict(int), defaultdict(int)
    for r in official_set:
        epl_sum[r["epl"]] += r["ist"]
    for r in core:
        epl_gross[r["epl"]] += r["ist"]
    einzelplaene = []
    for nr in sorted(x["epl_names"]):
        de = x["epl_names"][nr]
        if de not in EPL_EN:
            raise SystemExit(f"no English label for Einzelplan {nr} {de!r}")
        einzelplaene.append({"nr": nr, "label": {"de": de, "en": EPL_EN[de]}, "amount_eur": eur(epl_sum[nr]), "core_gross_eur": eur(epl_gross[nr])})

    top = sorted(official_set, key=lambda r: -r["ist"])[:40]
    top_titel = [{"rank": i + 1, "einzelplan": r["epl"], "kapitel": r["kap"], "titel": r["titel"], "text": r["text"], "fkt": r["fkt"], "grp": r["grp"],
                  "flexibilisiert": r["flex"], "ist_eur": eur(r["ist"]), "soll_eur": eur(r["soll"]),
                  "xpath": f"/haushalt/einzelplan[@nr='{r['epl']}']/kapitel[@nr='{r['kap']}']//titel[@nr='{r['titel']}']/ist/@wert"}
                 for i, r in enumerate(top)]

    # key items
    interest = sum(r["ist"] for r in official_set if r["og"] == "57")
    zins_row = bmf_get(bmf, konsum_no, "Zinsausgaben")
    if abs(meur(interest) - zins_row["ist"]) > 1:
        raise SystemExit(f"{year}: interest OG 57 {meur(interest):.1f} vs BMF {zins_row['ist']}")
    print(f"  interest (Obergruppe 57) {meur(interest):,.1f} vs BMF Zinsausgaben {zins_row['ist']:,.0f} ok")

    def titel_rows(pred):
        return [{"einzelplan": r["epl"], "kapitel": r["kap"], "titel": r["titel"], "text": r["text"], "fkt": r["fkt"], "grp": r["grp"], "ist_eur": eur(r["ist"])}
                for r in sorted(official_set, key=lambda r: -r["ist"]) if pred(r) and r["ist"] != 0]

    rv = [r for r in official_set if r["epl"] == "11" and r["kap"] == "1102" and r["grp"] == "636" and r["fkt"] == "221"]
    epl14 = epl_sum["14"]
    key_items = {
        "interest": {
            "label": {"de": "Zinsausgaben (Obergruppe 57)", "en": "Interest expenditure (Obergruppe 57)"},
            "amount_eur": eur(interest), "bmf_table_amount_meur": zins_row["ist"], "selection": "all expenditure Titel with Gruppierung 57x on the official basis",
        },
        "pension_insurance_federal_grants": {
            "label": {"de": "Leistungen des Bundes an die allgemeine Rentenversicherung (Epl. 11 Kap. 1102, alle Titel mit Funktion 221; davon Tit. 636 81-85 = 107.420,5 Mio)",
                      "en": "Federal payments to the general statutory pension insurance (Epl. 11 Kap. 1102, all Titel with function 221; of which Titel 636 81-85 = 107,420.5 Mio)"},
            "amount_eur": eur(sum(r["ist"] for r in rv)), "titel": titel_rows(lambda r: r in rv),
            "note": "Sum of the Zuschuss, zusätzlicher Zuschuss, Zuschuss Beitrittsgebiet, Beitragszahlungen für Kindererziehungszeiten and Zuschüsse zu Beiträgen für Werkstattbeschäftigte. Function 221 as a whole (BMF row 'Allgemeine Rentenversicherung') is slightly larger because it also carries small reimbursements.",
            "funktion_221_total_eur": eur(s3["221"]), "funktion_222_knappschaft_eur": eur(s3["222"]),
        },
        "buergergeld": {
            "label": {"de": "Bürgergeld (Epl. 11 Kap. 1101 Tit. 681 12, Funktion 251)", "en": "Bürgergeld basic income support (Epl. 11 Kap. 1101 Titel 681 12, function 251)"},
            "amount_eur": eur(s3["251"]), "titel": titel_rows(lambda r: r["fkt"] == "251"),
            "bmf_table_amount_meur": aufg_rows[norm("Bürgergeld nach dem SGB II")]["ist"],
            "related": {
                "unterkunft_heizung_sgb2_eur": eur(s3["252"]), "aktive_arbeitsmarktpolitik_eur": eur(s3["253"]), "sonstige_grundsicherung_sgb2_eur": eur(s3["259"]),
                "arbeitsmarktpolitik_funktion_25_eur": eur(s2["25"]),
            },
        },
        "grundsicherung_alter_erwerbsminderung": {
            "label": {"de": "Grundsicherung im Alter und bei Erwerbsminderung (SGB XII, Funktion 282)", "en": "Basic old-age and reduced-earning-capacity support (SGB XII, function 282)"},
            "amount_eur": eur(s3["282"]), "titel": titel_rows(lambda r: r["fkt"] == "282"),
            "bmf_table_amount_meur": aufg_rows[norm("Grundsicherung im Alter und bei Erwerbsminderung nach dem SGB XII")]["ist"],
        },
        "gkv_federal_grant": {
            "label": {"de": "Bundeszuschuss an den Gesundheitsfonds (Epl. 15 Kap. 1501 Tit. 636 06)", "en": "Federal grant to the health fund (Epl. 15 Kap. 1501 Titel 636 06)"},
            "amount_eur": eur(sum(r["ist"] for r in official_set if r["kap"] == "1501" and r["titel"] == "63606")),
            "funktion_224_total_eur": eur(s3["224"]),
        },
        "defence_einzelplan_14": {
            "label": {"de": "Einzelplan 14 Bundesministerium der Verteidigung (Kernhaushalt)", "en": "Einzelplan 14 Federal Ministry of Defence (core budget)"},
            "amount_eur": eur(epl14), "funktion_03_verteidigung_eur": eur(s2["03"]),
            "bmf_table_amount_meur_funktion_03": aufg_rows[norm("Verteidigung")]["ist"],
            "note": "Function 03 'Verteidigung' is larger than Einzelplan 14 because defence-related Titel also sit in other Einzelpläne (e.g. Epl. 60 Ertüchtigung). "
                    + ("The Sondervermögen Bundeswehr (annexed Kapitel 1491) is not part of the core budget; see annexed_kapitel." if year == 2025 else "The Sondervermögen Bundeswehr is not contained in rechnung_2024.xml."),
        },
        "kindergeld": {"amount_eur": None, "note": "Kindergeld is paid out of income-tax receipts (a deduction from tax revenue, Destatis/BMF), not an expenditure Titel; only the small BKGG residual (Epl. 17 Tit. 681 11) is expenditure."},
    }
    negatives = [r for r in official_set if r["ist"] < 0]

    payload = envelope(
        f"de.federal.budget_{year}",
        f"Bundeshaushalt {year}: Ist-Ausgaben nach Funktionen, Einzelplänen und Titeln, abgestimmt auf den vorläufigen Abschluss des BMF",
        f"Federal budget {year}: actual expenditure by function, Einzelplan and Titel, reconciled to the BMF provisional closing",
        "EUR",
        "Kernhaushalt des Bundes, kassenmäßiges Ist je Titel (Haushaltsrechnung XML). 'Official basis' = BMF definition of Ausgaben: without Obergruppen 59 (Tilgung), 91 (Zuführung an Rücklagen), 96 (kassenmäßiger Fehlbetrag) and 98 (haushaltstechnische Verrechnungen)"
        + ("; annexed Wirtschaftspläne (Kapitel xx9y: Sondervermögen, EU-Eigenmittel-Durchleitung, Bundesanstalten) removed first" if annex else ""),
        SCRIPT,
        year=year, status=STATUS,
        official_total_eur=official_meur * MEUR, official_total_meur=official_meur,
        xml_gross_total_eur=eur(xml_gross), xml_core_gross_total_eur=eur(core_gross),
        annexed_kapitel=annex_rows,
        annexed_note=("Kapitel numbered xx9y carry the Wirtschaftspläne annexed to the Einzelpläne (e.g. 1491 Sondervermögen Bundeswehr, 6092 Klima- und Transformationsfonds, 6093 Sondervermögen Infrastruktur und Klimaneutralität, 6090 EU own resources pass-through, 0690/0691 Versorgungsrücklage/-fonds). They are not part of the core budget; 14 of 16 are self-balancing (Ausgaben = Einnahmen). Kapitel 1091 and 1092 (BMEL agencies) are not self-balancing but are excluded on the same numbering rule; this is confirmed by the data: the total and Hauptfunktion 5 only match BMF when they are excluded (with them HF 5 would be 1,602 instead of 1,258 Mio EUR)." if annex else "No annexed Kapitel in this file."),
        bridge=bridge,
        bridge_result={"reconciled_eur": eur(reconciled), "official_total_eur": official_meur * MEUR, "residual_eur": round(residual_meur * MEUR), "tolerance_eur": 0.5 * MEUR, "ok": abs(residual_meur) <= 0.5},
        hauptfunktionen=hauptfunktionen,
        hauptfunktionen_note="The federal Funktionenplan has Hauptfunktionen 0–8 only (no 9). Sub-function labels are taken from BMF's table rows where a row corresponds to exactly one code and the XML sum matches it; all other codes carry label null.",
        bmf_combined_rows_checked=combined_checked,
        einzelplaene=einzelplaene,
        top_titel=top_titel,
        key_items=key_items,
        anomalies={
            "negative_ist_titel": {"count": len(negatives), "sum_eur": eur(sum(r["ist"] for r in negatives)),
                                   "largest": titel_rows(lambda r: r["ist"] < 0)[-5:],
                                   "note": "Negative Ist = refunds/recoveries booked against the expenditure Titel; kept as in the source."},
            "empty_titel_elements": x["empty_elements"],
        },
        sources={
            "xml": source_ref(XML_SRC, f"rechnung_{year}.xml", "/haushalt/einzelplan[@nr]/kapitel[@nr]/ausgaben//titel[@nr][@fkt]/ist/@wert (titelgruppe and flexibilised <ausgaben> blocks included; deduplicated by einzelplan, kapitel, titel nr; 'nr' = Titelnummer whose first three digits are the Gruppierung)"),
            "bmf": source_ref(BMF_SRC, BMF_FILE[year], f"Tabelle 1 'Gesamtübersicht' row '1. Ausgaben', column 'Ist {year}'; Tabelle {aufg_no} 'Ausgaben des Bundeshaushalts nach Aufgabenbereichen', column 'Ist {year}'; Tabelle {konsum_no} row 'Zinsausgaben' — rows extracted to research/extracts/bmf_monatsbericht/abschluss-{year}-tabellen.csv"),
        },
    )
    write_json(f"de/federal/budget-{year}.json", payload)
    return {"bmf": bmf, "prose": prose, "annex": annex_rows, "x": x, "exp": exp}


def build_overview(years: dict) -> None:
    b24, b25 = years[2024]["bmf"], years[2025]["bmf"]
    p24 = {r["row"]: r for r in years[2024]["prose"]}
    p25 = {r["row"]: r for r in years[2025]["prose"]}

    def cell(bmf, year_of_article, table_no, label, col):
        r = bmf_get(bmf, table_no, label)
        v = r[col]
        return None if v is None else {
            "value_eur": v * MEUR, "status": STATUS,
            "source": source_ref(BMF_SRC, BMF_FILE[year_of_article], r["coordinates"] + f", column 'Ist {year_of_article - 1 if col == 'ist_prev' else year_of_article}'"),
        }

    def tri(table24, label24, table25=None, label25=None):
        table25 = table25 or table24
        label25 = label25 or label24
        out = {"2023": cell(b24, 2024, table24, label24, "ist_prev"), "2024": cell(b24, 2024, table24, label24, "ist"), "2025": cell(b25, 2025, table25, label25, "ist")}
        r25 = cell(b25, 2025, table25, label25, "ist_prev")
        if r25 and out["2024"] and r25["value_eur"] != out["2024"]["value_eur"]:
            out["2024"]["revised_value_in_2025_article_eur"] = r25["value_eur"]
            out["2024"]["revision_note"] = "The January 2026 article restates the 2024 figure; the January 2025 article value is kept as primary."
        return out

    def prose_cell(p, year_of_article, key, note=None):
        r = p.get(key)
        if r is None:
            return None
        c = {"value_eur": r["ist"] * MEUR, "status": STATUS, "precision": "0.1 Mrd EUR as stated in the article text",
             "source": source_ref(BMF_SRC, BMF_FILE[year_of_article], r["coordinates"])}
        if note:
            c["note"] = note
        return c

    def xml_cell(year, kapitel, note):
        a = sum(r["ist"] for r in years[year]["exp"] if r["kap"] == kapitel)
        return {"value_eur": eur(a), "status": "Ist per Haushaltsrechnung XML (annexed Wirtschaftsplan)", "note": note,
                "source": source_ref(XML_SRC, f"rechnung_{year}.xml", f"/haushalt/einzelplan/kapitel[@nr='{kapitel}']/ausgaben//titel/ist/@wert, summed")}

    ktf23_inv = (p24["ktf_investive_ausgaben"]["ist"] - p24["ktf_investive_ausgaben_delta_vorjahr"]["ist"]) * MEUR
    ktf23_prog = (p24["ktf_programmausgaben"]["ist"] - p24["ktf_programmausgaben_delta_vorjahr"]["ist"]) * MEUR
    derived_note = "Derived in the build from the article's 2024 figure minus the stated change against 2023 (both to 0.1 Mrd EUR)."
    svik_na = {"value_eur": None, "note": "The Sondervermögen Infrastruktur und Klimaneutralität was created in 2025 (Art. 143h GG, 25 March 2025)."}

    metrics = [
        ("ausgaben", "Ausgaben (BMF-Abgrenzung)", "Expenditure (BMF definition)", tri(1, "1. Ausgaben")),
        ("einnahmen", "Einnahmen (ohne Kredite, Rücklagen, Münzen)", "Revenue (excl. borrowing, reserves, coinage)", tri(1, "2. Einnahmen")),
        ("steuereinnahmen", "Steuereinnahmen", "Tax revenue", tri(1, "Steuereinnahmen")),
        ("sonstige_einnahmen", "Sonstige Einnahmen (ohne Münzeinnahmen)", "Other revenue (excl. coinage)", tri(1, "Sonstige Einnahmen (ohne Münzeinnahmen)")),
        ("finanzierungssaldo", "Finanzierungssaldo", "Net balance (revenue minus expenditure)", tri(1, "Einnahmen ./. Ausgaben + Saldo der durchlaufenden Mittel = Finanzierungssaldo")),
        ("nettokreditaufnahme", "Nettokreditaufnahme", "Net borrowing", tri(1, "Nettokreditaufnahme")),
        ("ruecklage", "Zuführung(-)/Entnahme(+) Rücklage", "Transfer to (-) / withdrawal from (+) reserve", tri(1, "Zuführung(-)/Entnahme(+) Rücklage")),
        ("tilgung_nichtstrukturelle_rueckfluesse", "Tilgung aus nicht-strukturellen Rückflüssen von Notlagenkrediten (nicht in den Ausgaben)", "Repayment out of non-structural refunds of emergency credits (outside expenditure)",
         tri(1, "Tilgungsausgaben aufgrund nicht-struktureller Rückflüsse von notlagenkreditfinanzierten Ausgaben", 1, "Tilgung aufgrund nicht-struktureller Rückflüsse von notlagenkreditfinanzierten Ausgaben")),
        ("investive_ausgaben", "Investive Ausgaben (Hauptgruppen 7 und 8)", "Investment expenditure (Hauptgruppen 7 and 8)", tri(3, "Investive Ausgaben", 4)),
        ("konsumtive_ausgaben", "Konsumtive Ausgaben", "Consumption expenditure", tri(3, "Konsumtive Ausgaben", 4)),
        ("zinsausgaben", "Zinsausgaben", "Interest expenditure", tri(4, "Zinsausgaben", 5)),
        ("personalausgaben", "Personalausgaben", "Personnel expenditure", tri(4, "Personalausgaben", 5)),
        ("ktf_investive_ausgaben", "Klima- und Transformationsfonds: investive Ausgaben", "Climate and Transformation Fund: investment expenditure",
         {"2023": {"value_eur": ktf23_inv, "status": STATUS, "note": derived_note, "source": source_ref(BMF_SRC, BMF_FILE[2024], p24["ktf_investive_ausgaben_delta_vorjahr"]["coordinates"])},
          "2024": prose_cell(p24, 2024, "ktf_investive_ausgaben"), "2025": prose_cell(p25, 2025, "ktf_investive_ausgaben")}),
        ("ktf_programmausgaben", "Klima- und Transformationsfonds: Programmausgaben", "Climate and Transformation Fund: programme expenditure",
         {"2023": {"value_eur": ktf23_prog, "status": STATUS, "note": derived_note, "source": source_ref(BMF_SRC, BMF_FILE[2024], p24["ktf_programmausgaben_delta_vorjahr"]["coordinates"])},
          "2024": prose_cell(p24, 2024, "ktf_programmausgaben"),
          "2025": prose_cell(p25, 2025, "ktf_programmausgaben", "Cross-check: rechnung_2025.xml Kapitel 6092 Ausgaben 37,416.5 Mio EUR minus Zuführung an Rücklage (Tit. 919 01) 10,806.3 = 26,610.2 Mio EUR.")}),
        ("svik_ausgaben", "Sondervermögen Infrastruktur und Klimaneutralität: Ausgaben (einschl. 10 Mrd. Zuweisung an KTF)", "Infrastructure and Climate Neutrality Fund: expenditure (incl. 10 bn transferred to the KTF)",
         {"2023": svik_na, "2024": svik_na, "2025": prose_cell(p25, 2025, "svik_ausgaben", "Of which 10,000 Mio EUR Zuweisung an den KTF and 14,000 Mio EUR 'Bundessäule' (article). Cross-check: rechnung_2025.xml Kapitel 6093 Ausgaben 23,992.1 Mio EUR.")}),
        ("sv_bundeswehr_ausgaben", "Sondervermögen Bundeswehr: Ausgaben", "Bundeswehr special fund: expenditure",
         {"2023": {"value_eur": None, "note": "Not stated in the cached BMF articles and not contained in the XML files."},
          "2024": {"value_eur": None, "note": "Not stated in the 2024 closing article; rechnung_2024.xml does not contain the fund's Wirtschaftsplan."},
          "2025": xml_cell(2025, "1491", "The 2025 closing article gives no Ist figure for the fund; the value is the sum of Kapitel 1491 (Wirtschaftsplan Sondervermögen Bundeswehr, annexed to Einzelplan 14) in rechnung_2025.xml.")}),
    ]
    rows = [{"id": i, "label": {"de": de, "en": en}, "unit": "EUR", "values": v} for i, de, en, v in metrics]
    payload = envelope(
        "de.federal.overview", "Bundeshaushalt 2023–2025: Eckwerte des vorläufigen Abschlusses und Sondervermögen",
        "Federal budget 2023–2025: provisional closing headline figures and special funds", "EUR",
        "BMF Monatsbericht provisional closings (Jan 2025 for 2024 with Ist 2023 column; Jan 2026 for 2025). Figures in Mio EUR in the source, multiplied by 1,000,000; KTF/SVIK figures from the article text in Mrd EUR (one decimal).",
        SCRIPT, years=["2023", "2024", "2025"], status=STATUS, rows=rows,
        sources={"2024_article": source_ref(BMF_SRC, BMF_FILE[2024], "Tabellen 1, 3, 4 and article text"), "2025_article": source_ref(BMF_SRC, BMF_FILE[2025], "Tabellen 1, 4, 5 and article text")},
    )
    write_json("de/federal/overview.json", payload)


def main() -> None:
    years = {y: build_year(y) for y in (2024, 2025)}
    build_overview(years)
    print("\nall checks passed")


if __name__ == "__main__":
    main()
