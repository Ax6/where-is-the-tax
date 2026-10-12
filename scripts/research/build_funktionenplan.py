#!/usr/bin/env python3
"""BMF Funktionenplan (Stand 12.11.2024, cached PDF) → research/extracts/bmf_funktionenplan/funktionenplan.csv
and data/de/federal/funktionenplan.json: official German names of all Hauptfunktionen (1 digit),
Oberfunktionen (2 digits) and Funktionen (3 digits), with editorial English names.
"""
from __future__ import annotations

import csv
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import EXTRACTS, envelope, raw_path, source_ref, write_json  # noqa: E402

SRC, FILE = "bmf_funktionenplan", "funktionenplan.pdf"
SCRIPT = "scripts/research/build_funktionenplan.py"
CONT = re.compile(r"(^|\s)(für|und|der|des|dem|den|im|von|zur|zum|mit|oder|sowie|außerhalb|u\.|einschl\.|politischen)$|,$")

EN = {
    "0": "General public services", "1": "Education, science, research, cultural affairs", "2": "Social security, family and youth, labour market",
    "3": "Health, environment, sport and recreation", "4": "Housing, urban development, regional planning, community services", "5": "Food, agriculture and forestry",
    "6": "Energy and water, trade and services", "7": "Transport and communications", "8": "General financial management", "9": "Other (balancing items)",
    "01": "Political leadership and central administration", "02": "Foreign affairs", "03": "Defence (federal only)", "04": "Public security and order",
    "05": "Legal protection (courts)", "06": "Financial administration", "11": "General and vocational schools (joint heading 11/12)", "12": "General and vocational schools (joint heading 11/12)",
    "13": "Higher education", "14": "Support for pupils, students and trainees", "15": "Other education", "16": "Science, research and development outside universities",
    "17": "Culture and religion (general)", "18": "Culture and religion (joint heading 18/19)", "19": "Culture and religion (joint heading 18/19)", "21": "Social administration",
    "22": "Social insurance incl. unemployment insurance", "23": "Family assistance, welfare and similar", "24": "Social compensation benefits (SGB XIV) and benefits for consequences of political events",
    "25": "Labour-market policy", "26": "Child and youth welfare (SGB VIII)", "27": "Day care for children (SGB VIII)", "28": "Social assistance (SGB XII), asylum-seeker benefits, integration assistance",
    "29": "Other social affairs", "31": "Health", "32": "Sport and recreation", "33": "Environmental and nature protection", "34": "Nuclear safety and radiation protection",
    "41": "Housing, housing-construction premium", "42": "Geo-information, regional and state planning, urban development funding", "43": "Community services",
    "51": "Administration for food, agriculture and forestry", "52": "Agriculture and food", "53": "Forestry, fishing and hunting", "61": "Administration for energy, water, trade and services",
    "62": "Water management, flood and coastal protection", "63": "Mining, manufacturing and construction", "64": "Energy and water supply, waste disposal", "65": "Trade and tourism",
    "66": "Banking and insurance", "68": "Other trade and services", "69": "Regional development measures", "71": "Administration of transport and communications",
    "72": "Roads", "73": "Waterways and ports, shipping support", "74": "Railways and local public transport", "75": "Aviation", "77": "Communications", "79": "Other transport",
    "81": "Real and financial assets, special funds", "82": "Taxes and financial allocations", "83": "Debt", "84": "Allowances and support", "86": "Other", "88": "Global items",
    "011": "Political leadership", "012": "Internal administration", "013": "Information services", "014": "Statistical service", "015": "Civilian service", "016": "Building administration",
    "019": "Other general state tasks", "021": "Foreign missions", "023": "Economic cooperation and development", "024": "German schools abroad and cultural affairs",
    "031": "Bundeswehr administration", "032": "German armed forces", "033": "Defence burdens linked to the stationing of foreign forces", "036": "Defence research and development",
    "037": "Income support for conscripts", "038": "Pensions incl. allowances for civil servants of the defence administration", "039": "Pensions incl. allowances for soldiers",
    "042": "Police", "043": "Public order", "044": "Fire protection", "045": "Civil protection and disaster control", "046": "Meteorological service", "047": "Protection of the constitution",
    "051": "Courts and public prosecutors", "052": "Prisons", "059": "Other legal protection tasks", "061": "Tax and customs administration", "062": "Debt, asset and other financial administration",
    "068": "Pensions incl. allowances for civil servants of the financial administration", "111": "Administration of schools", "112": "Primary and secondary schools (general)",
    "114": "Public secondary general schools", "129": "Other school tasks", "133": "Public universities and universities of cooperative education", "134": "Private universities",
    "137": "German Research Foundation (DFG)", "139": "Other higher-education tasks", "141": "Support for pupils", "142": "Support for students and young researchers",
    "144": "Support for continuing-education participants", "153": "Other continuing education", "154": "Teacher training", "162": "Scientific libraries, archives, documentation",
    "163": "Research institutions", "165": "Research and experimental development", "167": "Grants to international scientific organisations", "181": "Theatres", "182": "Music", "183": "Museums, collections, exhibitions",
    "186": "Non-scientific libraries", "187": "Other cultural promotion", "195": "Heritage protection and preservation", "199": "Church affairs", "211": "Administration for social affairs",
    "219": "Other social administration", "221": "Statutory pension insurance", "222": "Statutory health insurance", "223": "Accident insurance", "225": "Unemployment insurance (federal only)",
    "227": "Long-term care insurance", "231": "Child benefit, child supplement", "232": "Parental allowance, parental leave", "233": "Housing benefit", "235": "Social institutions",
    "236": "Promotion of welfare organisations", "237": "Maintenance-advance benefits", "241": "Social compensation benefits (SGB XIV)", "243": "Burden equalisation", "244": "Restitution",
    "246": "Expellees and ethnic German resettlers", "249": "Other benefits for consequences of war and political events", "251": "Citizen's benefit (Bürgergeld, formerly Arbeitslosengeld II) under SGB II", "252": "Accommodation and heating benefits under SGB II",
    "253": "Active labour-market policy", "261": "Youth work and youth associations", "265": "Educational and integration assistance", "271": "Day care for children",
    "281": "Subsistence assistance (SGB XII)", "282": "Basic income support in old age and reduced earning capacity", "283": "Assistance for health, care and other situations",
    "285": "Integration assistance for people with disabilities", "287": "Asylum-seeker benefits", "290": "Other social affairs (total)", "311": "Health administration",
    "312": "Hospitals and sanatoria", "313": "Occupational safety", "314": "Health protection", "315": "Other health", "321": "Recreation", "322": "Sport", "331": "Environmental administration",
    "332": "Environmental and nature-protection measures", "341": "Administration for nuclear safety and radiation protection", "342": "Nuclear safety and radiation-protection measures",
    "411": "Housing-construction promotion", "412": "Housing-construction premium / wealth formation (federal only)", "419": "Other housing", "421": "Geo-information", "422": "Regional and state planning", "423": "Urban development funding",
    "511": "Administration for food and agriculture", "512": "Forestry administration", "521": "Agricultural structure and rural areas", "522": "Income-stabilising measures",
    "523": "Agricultural production, animal health and food", "531": "Forestry", "532": "Fisheries", "533": "Hunting", "610": "Administration for energy, water, trade and services (total)",
    "623": "Water management and land improvement", "625": "Coastal protection", "631": "Coal mining", "632": "Other mining", "634": "Manufacturing industry", "641": "Nuclear energy",
    "642": "Renewable energy", "643": "Electricity supply", "649": "Other energy and water supply", "651": "Trade", "652": "Tourism", "661": "Banks and credit institutions",
    "669": "Other banking and insurance", "680": "Other trade and services (total)", "691": "Business investment", "692": "Improvement of economic and infrastructure conditions",
    "711": "Road administration", "712": "Waterways and ports administration", "719": "Other transport and communications administration", "721": "Federal motorways",
    "722": "Federal roads", "723": "State roads", "725": "Municipal roads", "729": "Other road transport", "731": "Waterways and ports", "732": "Shipping support", "741": "Local public transport",
    "742": "Railways", "750": "Aviation (total)", "771": "Postal services", "772": "Broadcasting and television", "790": "Other transport (total)", "811": "Real estate", "812": "Financial assets",
    "018": "Pensions incl. allowances for civil servants of general administration", "022": "International organisations", "029": "Other foreign affairs",
    "048": "Pensions incl. allowances for civil servants of public security", "056": "Prisons", "058": "Pensions incl. allowances for civil servants of the judiciary",
    "113": "Private primary schools", "115": "Private secondary general schools", "118": "Pensions incl. allowances for school staff", "124": "Public special-needs schools",
    "125": "Private special-needs schools", "127": "Public vocational schools", "128": "Private vocational schools", "132": "University hospitals",
    "138": "Pensions incl. allowances for higher-education staff", "145": "Pupil transport", "152": "Adult education centres", "155": "In-service teacher training",
    "164": "Joint federal-state research funding (excl. DFG)", "184": "Zoological and botanical gardens", "185": "Music schools", "188": "Administration for cultural affairs",
    "224": "Health insurance", "226": "Farmers' old-age insurance (federal only)", "229": "Other social insurance", "259": "Other basic income support for job seekers (SGB II)",
    "262": "Youth social work", "263": "Child and youth protection, family education support", "266": "Further youth-welfare tasks", "284": "Care assistance (SGB XII)",
    "286": "SGB XII benefits (territorial Länder only)", "624": "Dams and flood retention basins", "635": "Crafts and small trades", "638": "Construction industry",
    "644": "Water supply", "645": "Waste-water disposal", "646": "Waste management", "647": "Street cleaning", "724": "District roads", "726": "Street lighting",
    "85": "Reserves", "87": "Settlement of previous years", "89": "Budget-technical clearing items", "813": "Special funds", "820": "Taxes and financial allocations (total)", "830": "Debt (total)", "840": "Allowances and support (total)", "860": "Other (total)", "880": "Global items (total)",
}


NO_TRAILER = {"732", "412"}          # headings printed without the "Funktion <code>" trailer
TRAILER_TYPO = {"236": "235"}        # BMF prints "236 Förderung der Wohlfahrtspflege Funktion 235"
JOINT = {"11": "11/12", "12": "11/12", "18": "18/19", "19": "18/19"}


def parse() -> dict[str, dict]:
    import pypdf

    r = pypdf.PdfReader(raw_path(SRC, FILE))
    names: dict[str, dict] = {}
    superseded: list[dict] = []
    trailer = re.compile(r"\s*(Hauptfunktion|Oberfunktionen|Oberfunktion|Obergruppe|Funktion)\s+(\d{1,3}(?:/\d{1,3})?)\s*$")
    head = re.compile(r"^(\d{1,3}(?:/\d{1,3})?) (\S.*)$")
    marker = re.compile(r"--\s*(gültig bis Haushaltsjahr (\d{4})|neu gültig ab Haushaltsjahr (\d{4}))\s*--")
    pending: dict | None = None
    for pno, page in enumerate(r.pages, start=1):
        raw_lines = (page.extract_text() or "").split("\n")
        raw_lines = [l for l in raw_lines if not re.match(r"^\s*(Funktionenplan mit allgemeinen Vorschriften Stand: 12\. November 2024|Seite \d+ von 38)\s*$", l)]
        i = 0
        while i < len(raw_lines):
            line = raw_lines[i]
            mk = marker.search(line)
            if mk:
                pending = {"valid_until": int(mk.group(2))} if mk.group(2) else {"valid_from": int(mk.group(3))}
                i += 1
                continue
            m = head.match(" ".join(line.split()))
            if not m:
                i += 1
                continue
            code = m.group(1)
            joined, end, wrapped = None, i, False
            for k in range(0, 3):
                if i + k >= len(raw_lines):
                    break
                cand_raw = "  ".join(raw_lines[i:i + k + 1])
                t = trailer.search(cand_raw)
                if t and (t.group(2) == code or TRAILER_TYPO.get(code) == t.group(2)):
                    before = cand_raw[: t.start()]
                    wrapped = cand_raw[t.start():t.start() + 2] == "  " or before.rstrip().endswith((",", "und", "für"))  # pypdf leaves a double space where the heading wrapped
                    joined, end = " ".join(before.split()), i + k
                    break
            if joined is None:
                if code in NO_TRAILER:
                    joined, end = " ".join(line.split()), i
                else:
                    i += 1
                    continue
            name = joined[len(code) + 1:].strip()
            j = end + 1
            # the heading continues on the next line(s) when it wrapped before the trailer or ends in a connector
            while (wrapped or CONT.search(name) or name.count("(") > name.count(")")) and j < len(raw_lines):
                nxt = " ".join(raw_lines[j].split())
                if not nxt or head.match(nxt) or nxt.startswith(("•", "-", "(nicht", "(siehe", "Hierzu", "z. B.")) or marker.search(nxt):
                    break
                # a wrapped heading continues with a short fragment, a lower-case word or an opening bracket;
                # anything else after a double space is the explanatory text that follows every heading
                if not (CONT.search(name) or name.count("(") > name.count(")")) and not (nxt[0].islower() or nxt.startswith("(") or len(nxt.split()) <= 2):
                    break
                name = f"{name} {nxt}"
                wrapped = name.endswith((",", "und", "für")) or (name.count("(") > name.count(")"))
                j += 1
            entry = {"de": name, "page": pno, "level": len(code.split("/")[0])}
            if pending:
                entry.update(pending)
                pending = None
            for c in code.split("/"):
                e = dict(entry)
                if "/" in code:
                    e["joint_heading"] = code
                if "valid_until" in e:
                    superseded.append({"code": c, **e})
                    continue
                if c in names and "valid_from" not in e:
                    continue
                names[c] = e
            i = end + 1
    for code, en in EN.items():
        if len(code) == 3 and code.endswith("0") and code not in names and code[:2] in names:
            names[code] = {"de": names[code[:2]]["de"], "page": names[code[:2]]["page"], "level": 3, "derived": True, "derived_note": "Oberfunktion total; the plan lists no 3-digit code ending in 0"}
    for x in superseded:  # a code whose only printed version is the pre-2024 one keeps it, flagged
        if x["code"] not in names:
            names[x["code"]] = {k: v for k, v in x.items() if k != "code"}
    names["_superseded"] = superseded  # type: ignore[assignment]
    return names


def main():
    names = parse()
    superseded = names.pop("_superseded")
    rows = []
    for code in sorted(names):
        n = names[code]
        row = {"code": code, "level": n["level"], "label": {"de": n["de"], "en": EN.get(code)}, "page": n["page"]}
        for k in ("derived", "derived_note", "joint_heading", "valid_from", "valid_until"):
            if n.get(k):
                row[k] = n[k]
        rows.append(row)
    # the names that no longer apply (printed with "gültig bis Haushaltsjahr 2023")
    superseded_rows = [{"code": x["code"], "label_de": x["de"], "valid_until": x["valid_until"], "page": x["page"]} for x in superseded]
    out = EXTRACTS / SRC / "funktionenplan.csv"
    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["code", "level", "name_de", "pdf_page", "derived", "joint_heading", "valid_from"])
        for r in rows:
            w.writerow([r["code"], r["level"], r["label"]["de"], r["page"], "yes" if r.get("derived") else "", r.get("joint_heading", ""), r.get("valid_from", "")])
    n1 = sum(1 for r in rows if r["level"] == 1)
    n2 = sum(1 for r in rows if r["level"] == 2)
    n3 = sum(1 for r in rows if r["level"] == 3)
    missing_en = [r["code"] for r in rows if r["label"]["en"] is None]
    print(f"Funktionenplan: {n1} Hauptfunktionen, {n2} Oberfunktionen, {n3} Funktionen parsed; {len(missing_en)} without English label")
    assert n1 >= 9 and n2 >= 50 and n3 >= 170, (n1, n2, n3)
    payload = envelope(
        "de.federal.funktionenplan", "Funktionenplan des Bundes: Haupt-, Ober- und Funktionen", "Federal functional classification (Funktionenplan): main, upper and detailed functions",
        "labels", "Official classification per § 10 HGrG as published by BMF (Stand 12 November 2024); German names verbatim, English names editorial",
        SCRIPT, source=source_ref(SRC, FILE, "lines '<code> <name> Hauptfunktion|Oberfunktion|Funktion <code>', page numbers per row in research/extracts/bmf_funktionenplan/funktionenplan.csv"),
        notes=["German names verbatim from the PDF (wrapped headings joined); English names are editorial translations.",
               "Joint headings (11/12, 18/19) give both codes the same name; the plan does not name them separately.",
               "Codes ending in 0 at the 3-digit level are derived Oberfunktion totals.",
               "Where the plan prints two versions (markers 'gültig bis Haushaltsjahr 2023' / 'neu gültig ab Haushaltsjahr 2024'), the version valid from 2024 is used and the old one is listed under superseded_names."],
        superseded_names=superseded_rows,
        rows=rows,
    )
    write_json("de/federal/funktionenplan.json", payload)


if __name__ == "__main__":
    main()
