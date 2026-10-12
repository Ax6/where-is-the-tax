#!/usr/bin/env python3
"""Social insurance (pension, health, long-term care, unemployment), 2024 and 2025 → data/de/social-insurance/accounts.json

Two phases:
  --extract   read the cached PDFs (research/cache/...) with pdfplumber and write one CSV per PDF to
              research/extracts/<source_id>/<file>.csv (item_de, year, value, unit, page, row_or_table, note).
              Needs the cached files (fetch.py). Extracts are committed, so the build can run without them.
  (default)   read the extracts and write data/de/social-insurance/accounts.json, running the reconciliation
              checks (parts sum to the published totals within the source's own rounding; fails loudly).

Every figure in the output carries a source pointer {ref, coordinates}; `sources` at the top of the file resolves
`ref` to the manifest entry (url, sha256, retrieval date, licence).

Nothing is netted across systems except in `payroll_view` and `contributions_by_payer_all_systems`, where every
component is shown with its own source.
"""
from __future__ import annotations

import csv
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import EXTRACTS, ROOT, envelope, raw_path, source_ref, write_json  # noqa: E402

SCRIPT = "scripts/research/build_social.py"
OUT = "de/social-insurance/accounts.json"

# source id, file, short ref used inside the data file
FILES = {
    "drv_fb": ("drv_finanzen", "finanzbericht-fruehjahr-2026.pdf"),
    "drv_ad": ("drv_finanzen", "aktuelle_daten.pdf"),
    "kj1_2024": ("bmg_gkv_finanzergebnisse", "KJ1_2024.pdf"),
    "kj1_2025": ("bmg_gkv_finanzergebnisse", "KJ1_2025.pdf"),
    "spv_2024": ("bmg_pflegeversicherung", "finanzentwicklung-spv-2024.pdf"),
    "spv_2025": ("bmg_pflegeversicherung", "finanzentwicklung-spv-2025.pdf"),
    "ba_2024": ("ba_finanzentwicklung", "finanzentwicklung-alv-2024.pdf"),
    "ba_2025": ("ba_finanzentwicklung", "finanzentwicklung-alv-2025.pdf"),
    "sgb6_158": ("gesetze_im_internet", "sgb6_158.html"),
    "sgb5_241": ("gesetze_im_internet", "sgb5_241.html"),
    "sgb5_242a": ("gesetze_im_internet", "sgb5_242a.html"),
    "sgb11_55": ("gesetze_im_internet", "sgb11_55.html"),
    "sgb3_341": ("gesetze_im_internet", "sgb3_341.html"),
    "svbezgrv_2024_3": ("gesetze_im_internet", "svbezgrv_2024_3.html"),
    "svbezgrv_2025_3": ("gesetze_im_internet", "svbezgrv_2025_3.html"),
    "svbezgrv_2026_1": ("gesetze_im_internet", "svbezgrv_2026_1.html"),
    "svbezgrv_2026_2": ("gesetze_im_internet", "svbezgrv_2026_2.html"),
    "svbezgrv_2026_3": ("gesetze_im_internet", "svbezgrv_2026_3.html"),
    "bmg_gkv": ("bmg_finanzierung_gkv", "finanzierung-gkv.html"),
}
CSV_HEADER = ["item_de", "year", "value", "unit", "page", "row_or_table", "note"]
NUM_DE = re.compile(r"^-?[\d.]*\d,\d+$")


def de_num(s: str) -> float:
    return float(s.replace(".", "").replace(",", "."))


def extract_path(ref: str) -> Path:
    sid, file = FILES[ref]
    return EXTRACTS / sid / (Path(file).stem + ".csv")


def write_extract(ref: str, rows: list[list]) -> None:
    out = extract_path(ref)
    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(CSV_HEADER)
        w.writerows(rows)
    print(f"wrote {out.relative_to(ROOT)} ({len(rows)} rows)")


def read_extract(ref: str) -> list[dict]:
    p = extract_path(ref)
    if not p.exists():
        raise SystemExit(f"missing extract {p.relative_to(ROOT)} (run with --extract and the cached PDFs present)")
    with p.open(encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))
    for r in rows:
        r["value"] = None if r["value"] in ("", "null") else float(r["value"])
        r["year"] = int(r["year"]) if r["year"] else None
        r["page"] = int(r["page"]) if r["page"] else None
    return rows


# ----------------------------------------------------------------------------------------------------------------
# extraction
# ----------------------------------------------------------------------------------------------------------------

def page_texts(ref: str) -> list[str]:
    import pdfplumber  # noqa: PLC0415

    with pdfplumber.open(raw_path(*FILES[ref])) as pdf:
        return [p.extract_text() or "" for p in pdf.pages]


def extract_drv_fb() -> None:
    """Finanzbericht Frühjahr 2026, p.3: Rechnungsergebnis 2024 (endgültig) / 2025 (vorläufig), Mrd EUR, one decimal."""
    texts = page_texts("drv_fb")
    rows = []
    p3 = texts[2]
    assert "Rechnungsergebnis" in p3 and "2024 2025" in p3 and "(endgültig) (vorläufig)" in p3, "DRV p.3 layout changed"
    line_re = re.compile(r"^(?P<label>[A-Za-zÄÖÜäöüß].+?)\s+(?P<v24>-?\d+,\d+)\s+(?P<v25>-?\d+,\d+)\s+(?P<rest>\S.*)$")
    section = "Einnahmen"
    for line in p3.splitlines():
        m = line_re.match(line.strip())
        if not m:
            continue
        label = re.sub(r"\d\)$", "", m["label"]).strip()
        if label.startswith("Rentenausgaben"):
            section = "Ausgaben"
        if label.startswith("Nachhaltigkeitsrücklage"):
            section = "Bestand"
        unit = "Monatsausgaben" if label == "in Monatsausgaben" else "Mrd EUR"
        for year, key, status in ((2024, "v24", "endgültig"), (2025, "v25", "vorläufig")):
            rows.append([label, year, de_num(m[key]), unit, 3, f"Tabelle 'Rechnungsergebnis', Abschnitt {section}, Zeile '{line.strip().split('  ')[0][:60]}'", f"Status {status}; rundungsbedingte Differenzen in den Summen möglich (Fußnote 6)"])
    assert any(r[0] == "Einnahmen gesamt" for r in rows) and any(r[0] == "Ausgaben gesamt" for r in rows), "DRV p.3 totals not found"
    # p.4: contribution rate 2025 (first column of the projection table)
    m = re.search(r"Beitragssatz zur RV \(in %\) (\d+,\d)", texts[3])
    assert m, "DRV p.4 Beitragssatz not found"
    rows.append(["Beitragssatz zur RV (in %)", 2025, de_num(m.group(1)), "%", 4, "Tabelle 'Weitere Entwicklung', Zeile 'Beitragssatz zur RV (in %)', Spalte 2025", ""])
    # p.5: Bundesmittel 2025
    p5 = texts[4]
    block = p5.split("Bundesmittel - in Mrd. EUR -")[1].split("1)")[0]
    for line in block.splitlines():
        m = re.match(r"^(?P<label>[A-Za-zÄÖÜäöüß].+?)\s+(?P<v>-?\d+,\d)$", line.strip())
        if m:
            rows.append([m["label"], 2025, de_num(m["v"]), "Mrd EUR", 5, "Abschnitt 'Faustdaten (2025)', Block 'Bundesmittel'", "Status vorläufig"])
    assert any(r[0] == "Bundesmittel gesamt" for r in rows), "DRV p.5 Bundesmittel not found"
    write_extract("drv_fb", rows)


def extract_drv_ad() -> None:
    """Aktuelle Daten 2026 (Stand 22.12.2025), p.1: Einnahmen/Ausgaben allg. RV in Mio EUR, 2024 and 2025 (geschätzt)."""
    texts = page_texts("drv_ad")
    p1, p2 = texts[0], texts[1]
    assert "Einnahmen und Ausgaben, allg. RV (ohne KnV), in Mio. Euro" in p1, "DRV Aktuelle Daten p.1 layout changed"
    pats = {
        "Einnahmen": r"Einnahmen (\d{3} \d{3}) (\d{3} \d{3})",
        "Beiträge": r"Beiträge (\d{3} \d{3}) (\d{3} \d{3})",
        "Bundeszuschuss (allgemeiner)": r"Bundeszuschuss \(allgemeiner\) (\d{2} \d{3}) (\d{2} \d{3})",
        "zusätzliche Bundeszuschüsse": r"zusätzliche Bundeszuschüsse (\d{2} \d{3}) (\d{2} \d{3})",
        "Ausgaben": r"Ausgaben (\d{3} \d{3}) (\d{3} \d{3})",
        "Rentenausgaben": r"Rentenausgaben (\d{3} \d{3}) (\d{3} \d{3})",
        "Beiträge und Zuschüsse zur KVdR": r"zur KVdR (\d{2} \d{3}) (\d{2} \d{3})",
        "Leistungen zur Teilhabe": r"Leistungen zur Teilhabe (\d \d{3}) (\d \d{3})",
        "Verwaltungs- und Verfahrenskosten": r"Verfahrenskosten (\d \d{3}) (\d \d{3})",
        "Einnahmeüberschuss": r"Einnahmeüberschuss (- \d{3}) (- \d \d{3})",
        "Nachhaltigkeitsrücklage am Jahresende (absolut)": r"absolut (\d{2} \d{3}) (\d{2} \d{3})",
    }
    rows = []
    for label, pat in pats.items():
        m = re.search(pat, p1)
        assert m, f"DRV Aktuelle Daten: '{label}' not found"
        for year, g, note in ((2024, 1, "Ist"), (2025, 2, "geschätzt (Herbstfinanzschätzung 2025, Fußnote 1)")):
            v = float(m.group(g).replace(" ", "").replace("-", "-"))
            rows.append([label, year, v, "Mio EUR", 1, "Tabelle 'Einnahmen und Ausgaben, allg. RV (ohne KnV), in Mio. Euro'" if label != "Nachhaltigkeitsrücklage am Jahresende (absolut)" else "Tabelle 'Nachhaltigkeitsrücklage, allg. RV, in Mio. Euro'", note])
    m25 = re.search(r"Beitragssatz \(allg\. RV\) 2025 (\d+,\d)", p2)
    m26 = re.search(r"^2026\d\) (\d+,\d) ", p2, re.M)  # first '2026x)' line on the page = allg. RV (the KnV line follows later)
    assert m25 and m26, "DRV Aktuelle Daten p.2 Beitragssatz not found"
    rows.append(["Beitragssatz (allg. RV)", 2025, de_num(m25.group(1)), "%", 2, "Block 'Berechnungswerte, Deutschland', Zeile 'Beitragssatz (allg. RV) 2025'", ""])
    rows.append(["Beitragssatz (allg. RV)", 2026, de_num(m26.group(1)), "%", 2, "Block 'Berechnungswerte, Deutschland', Zeile 'Beitragssatz (allg. RV) 2026'", "Fußnote 1: Bekanntmachung der Beitragssätze 2026"])
    m = re.search(r"\(allg\. RV\) 2026\d\) (\d[\d .]*,\d\d) (\d{3} \d{3})", p2)
    assert m, "DRV Aktuelle Daten p.2 BBG not found"
    rows.append(["Beitragsbemessungsgrenze (allg. RV), monatlich", 2026, de_num(m.group(1).replace(" ", "")), "EUR", 2, "Block 'Berechnungswerte', Zeile 'Beitragsbemessungsgrenze (allg. RV) 2026'", "Fußnote 2: SV-Rechengrößenverordnung 2026"])
    rows.append(["Beitragsbemessungsgrenze (allg. RV), jährlich", 2026, float(m.group(2).replace(" ", "")), "EUR", 2, "Block 'Berechnungswerte', Zeile 'Beitragsbemessungsgrenze (allg. RV) 2026'", "Fußnote 2: SV-Rechengrößenverordnung 2026"])
    write_extract("drv_ad", rows)


def extract_spv(ref: str) -> None:
    """Finanzentwicklung der sozialen Pflegeversicherung, p.3 (2022–2024 or 2022–2025), Mrd EUR, two decimals."""
    texts = page_texts(ref)
    p3 = texts[2]
    assert "Ist-Ergebnisse ohne Rechnungsabgrenzung" in p3, f"{ref} p.3 layout changed"
    years = None
    rows = []
    val_re = re.compile(r"(?:\s+(?:-?\d+,\d+|\+?\d+,\d+|-{3,}))+$")
    section = ""
    for line in p3.splitlines():
        s = line.strip()
        if re.match(r"^(20\d\d\s+)+20\d\d$", s):
            years = [int(y) for y in s.split()]
            continue
        if s in ("Einnahmen", "Ausgaben", "Liquidität"):
            section = s
            continue
        m = val_re.search(s)
        if not m or years is None:
            continue
        label = s[: m.start()].strip()
        if not label or label == "Bezeichnung" or label.startswith("in Mrd"):
            continue
        vals = m.group(0).split()
        if len(vals) != len(years):
            continue
        if label == "der Kassen":
            label = "Mittelbestand in Monatsausgaben lt. Haushaltsplänen der Kassen"
        for y, v in zip(years, vals):
            value = None if set(v) == {"-"} else de_num(v.lstrip("+"))
            rows.append([label, y, value, "Monatsausgaben" if "Monatsausgaben" in label else "Mrd EUR", 3, f"Tabelle 'Ist-Ergebnisse ohne Rechnungsabgrenzung', Abschnitt {section}, Spalte {y}", "'---' in source = nil" if value is None else "Abweichungen in den Summen durch Rundungen (Fußnote 1)"])
    assert any(r[0] == "Einnahmen insgesamt" for r in rows) and any(r[0] == "Ausgaben insgesamt" for r in rows), f"{ref}: totals not found"
    write_extract(ref, rows)


def extract_ba(ref: str, year: int) -> None:
    """BA Finanzentwicklung in der Arbeitslosenversicherung: narrative figures (Mrd EUR, 2 decimals) + FEBA table (Mio EUR)."""
    import pdfplumber  # noqa: PLC0415

    texts = page_texts(ref)
    rows = []
    narrative = {
        "Einnahmen": (r"Einnahmen (?:in Höhe von |des BA-Haushalts mit )(\d+,\d\d) Milli", "Mrd EUR"),
        "Ausgaben": (r"(?:gestiegenen Ausgaben von|Ausgaben in Höhe von) (\d+,\d\d) Milli", "Mrd EUR"),
        "Beitragseinnahmen": (r"Beitragseinnahmen mit (\d+,\d\d) Milli", "Mrd EUR"),
        "Verwaltungskostenerstattungen SGB II (Bund)": (r"Bund im vergangenen Jahr (\d+,\d\d) Milliarden Euro an Verwaltungskosten", "Mrd EUR"),
        "Erstattungen und Verwaltungseinnahmen": (r"Erstattungen und Verwaltungseinnahmen \(u\.a\..*?beliefen sich \d{4} auf (\d+,\d\d) Milli", "Mrd EUR"),
        "Einnahmen aus der Insolvenzgeldumlage": (r"Insolvenzgeldumlage hat die BA in \d{4} Einnahmen in Höhe von (\d+,\d\d) Milli", "Mrd EUR"),
        "Einnahmen aus der Winterbeschäftigungsumlage": (r"Winterbeschäftigungsumlage betrugen (\d+,\d\d) Milli", "Mrd EUR"),
        "Arbeitslosengeld bei Arbeitslosigkeit": (r"Gesamtaus-?\s*gaben beim Arbeitslosengeld von (\d+,\d\d) Milli", "Mrd EUR"),
        "Insolvenzgeld": (r"Insolvenzgeld (?:hat die BA Jahr|(?:hat die BA )?für Insolvenzgeld) (\d+,\d\d) Milli|für Insolvenzgeld (\d+,\d\d) Milliarden Euro ausgezahlt", "Mrd EUR"),
        "Aktive Arbeitsförderung": (r"aktive Arbeitsförderung hat die BA im abgelaufenen Jahr (\d+,\d\d) Milli", "Mrd EUR"),
        "Personal- und Verwaltungsausgaben": (r"Rechtskreis SGB II wurden bis zum Jah-?\s*resende (\d+,\d\d) Milli", "Mrd EUR"),
    }
    if year == 2024:
        narrative["Finanzierungssaldo (Defizit)"] = (r"schloss mit einem Defizit von (\d+,\d\d) Milli", "Mrd EUR")
        narrative["Zuführung zur Rücklage der BA (einschl. Eingliederungsrücklage), saldiert"] = (r"noch saldiert (\d+,\d\d) Milliarden Euro\s*zugeführt", "Mrd EUR")
    else:
        narrative["Finanzierungssaldo (Defizit)"] = (r"schloss mit ei-?\s*nem Defizit von (\d+,\d\d) Milli", "Mrd EUR")
        narrative["Defizit nach Abrechnung der umlagefinanzierten Rücklagen"] = (r"erhöhte sich das Defizit auf (\d+,\d\d) Milli", "Mrd EUR")
        narrative["Auflösung der Rücklage (einschl. Eingliederungsrücklage)"] = (r"Rücklage \(einschließlich Eingliederungsrücklage\) in Höhe von (\d+,\d\d) Mil", "Mrd EUR")
        narrative["Liquiditätshilfe des Bundes (Darlehen)"] = (r"Darlehens in Höhe von (\d+,\d\d) Milli", "Mrd EUR")
    full = "\n".join(f"<<p{i + 1}>>\n{t}" for i, t in enumerate(texts))
    for label, (pat, unit) in narrative.items():
        m = re.search(pat.replace(" ", r"\s+"), full, re.S)  # line breaks fall inside sentences
        assert m, f"{ref}: narrative figure '{label}' not found"
        v = next(g for g in m.groups() if g)
        page = full[: m.start()].count("<<p")
        rows.append([label, year, de_num(v), unit, page, "Fließtext", "Narrative figure, 2 decimals"])
    # FEBA table (Mio EUR), columns assigned by x position of the header words
    table_page = 6 if year == 2024 else 4
    with pdfplumber.open(raw_path(*FILES[ref])) as pdf:
        words = pdf.pages[table_page - 1].extract_words(x_tolerance=1.5)
    hdr_row = [w for w in words if w["text"] in ("Dezember", "Vormonat", str(year), f"({year - 1})", "absolut", "%") and 220 < w["top"] < 245]
    cols = {w["text"]: w["x1"] + 7 for w in hdr_row}
    assert set(cols) == {"Dezember", "Vormonat", str(year), f"({year - 1})", "absolut", "%"}, f"{ref}: table header not found: {cols}"
    lines: dict[int, list] = {}
    for w in words:
        lines.setdefault(round(w["top"] / 3), []).append(w)
    seen = 0
    for key in sorted(lines):
        ws = sorted(lines[key], key=lambda w: w["x0"])
        nums = [w for w in ws if NUM_DE.match(w["text"])]
        label = " ".join(w["text"] for w in ws if not NUM_DE.match(w["text"])).strip()
        if not nums or not label or label.startswith(("Berichtszeitraum", "Quelle", "Ist seit")):
            continue
        by_col = {min(cols, key=lambda c: abs(cols[c] - n["x1"])): de_num(n["text"]) for n in nums}
        if str(year) not in by_col:
            continue
        seen += 1
        rows.append([label, year, by_col[str(year)], "Mio EUR", table_page, f"Tabelle 'Finanzentwicklung im Beitragshaushalt der BA (FEBA SGB III)', Spalte 'Ist seit Jahresbeginn {year}'", "Einnahmen und Überschüsse werden mit negativem Vorzeichen dargestellt"])
        if f"({year - 1})" in by_col:
            rows.append([label, year - 1, by_col[f"({year - 1})"], "Mio EUR", table_page, f"Tabelle 'FEBA SGB III', Spalte 'Vorjahr ({year - 1})'", "previous-year column of the same table"])
    assert seen > 20, f"{ref}: too few table rows ({seen})"
    write_extract(ref, rows)


# KJ1 accounts we keep (konto → canonical label). Kontenrahmen of the GKV (KJ1), labels as printed in the PDF.
KJ1_LABELS = {
    "02000": "Beiträge für versicherungspflichtige Beschäftigte",
    "02011": "Beiträge der Bundesagentur für Arbeit für versicherte Empfänger von Arbeitslosengeld nach dem SGB III und für Empfänger weiterer Leistungen",
    "02013": "Beiträge für versicherte Bürgergeld-Beziehende",
    "02020": "Beiträge aus Renten für Pflichtversicherte (ohne 2026)/Beiträge aus Renten für Altenteiler (nur LKK)",
    "02022": "Beiträge der Rentenantragsteller",
    "02025": "Beiträge aus Versorgungsbezügen und aus Arbeitseinkommen für Pflichtversicherte mit und ohne Rentenbezug (nur LKK)",
    "02026": "Beiträge aus Renten für Aktiv-Versicherte (nur LKK)",
    "02027": "Beitragserstattungen nach § 231 Abs. 2 SGB V/§ 40 Abs. 7 Satz 4 KVLG 1989",
    "02040": "Beiträge der pflichtversicherten Studenten, Praktikanten und zur Berufsausbildung ohne Arbeitsentgelt Beschäftigten (nur LKK)",
    "02050": "Beiträge der freiwillig Wehrdienst leistenden Soldaten und Eignungsübenden",
    "02060": "Beiträge aus Versorgungsbezügen und aus Arbeitseinkommen für Pflichtversicherte (nur LKK)",
    "02100": "Beiträge der versicherungsberechtigten Mitglieder (nur LKK)",
    "02140": "Beiträge der freiwillig versicherten Studenten (nur LKK)",
    "02200": "Beiträge für Rehabilitanden (nur LKK)",
    "02300": "Beiträge der versicherungspflichtigen Mitglieder nach § 2 Abs. 1 Nr. 7 KVLG 1989 (nur LKK)",
    "02310": "Sonstige Krankenversicherungsbeiträge (nur LKK)",
    "02400": "Beiträge für selbständige Künstler und Publizisten nach dem KSVG",
    "02500": "Zusatzbeitrag nach § 242 Abs. 1 SGB V in der bis 31.12.2014 geltenden Fassung",
    "02600": "Sonstige Beiträge (Gesundheitsfonds)",
    "02700": "Beiträge nach § 249b SGB V/§ 48 Abs. 6 KVLG 1989 (ohne 2702)",
    "02702": "Beiträge nach § 249b SGB V/§ 48 Abs. 6 KVLG 1989 -Altenteiler-",
    "02800": "Säumniszuschläge auf Beiträge der KV",
    "02802": "Säumniszuschläge auf Beiträge der KV - Altenteiler",
    "02810": "Verspätungszuschläge auf Zusatzbeiträge nach § 242 Abs. 6 SGB V in der bis 31.12.2014 geltenden Fassung",
    "02900": "Zusatzbeiträge für versicherungspflichtige Beschäftigte (Gesundheitsfonds)",
    "02901": "Zusatzbeiträge der Bundesagentur für Arbeit für versicherte Empfänger von Arbeitslosengeld nach dem SGB III und für Empfänger weiterer Leistungen (Gesundheitsfonds)",
    "02902": "Zusatzbeiträge für pflichtversicherte Bürgergeld-Beziehende (Gesundheitsfonds)",
    "02903": "Zusatzbeiträge aus Renten für Pflichtversicherte (Gesundheitsfonds)",
    "02904": "Zusatzbeitragserstattungen nach § 231 Abs. 2 SGB V (Gesundheitsfonds)",
    "02905": "Zusatzbeiträge der freiwillig Wehrdienst leistenden Soldaten und Eignungsübenden (Gesundheitsfonds)",
    "02906": "Zusatzbeiträge für selbständige Künstler und Publizisten nach dem KSVG (Gesundheitsfonds)",
    "02907": "Sonstige Zusatzbeiträge (Gesundheitsfonds)",
    "02999": "Beitragseinnahmen insgesamt (KG 20-28)",
    "03010": "Zinsen aus Geldanlagen",
    "03222": "Zuschüsse für Leistungsaufwendungen nach § 37 Abs. 2 KVLG 1989",
    "03223": "Zuschüsse nach § 37 Abs. 3 i.V.m. § 4 Abs. 3 und § 59 Abs. 3 KVLG 1989",
    "03260": "Beteiligung des Bundes an Aufwendungen nach § 221 SGB V",
    "03263": "Erstattungen des Bundes (KHG / COVID-19) (Gesundheitsfonds)",
    "03264": "Bundesmittel für die Erstattung von Energiekostensteigerungen (Gesundheitsfonds)",
    "03730": "Vorsorge- und Früherkennungsmaßnahmen nach § 270 Abs. 4 SGB V",
    "03760": "Mittel aus dem Zusatzbeitrag nach § 270a Abs. 2 SGB V - Abschlagsverfahren",
    "03761": "Mittel aus dem Zusatzbeitrag nach § 270a Abs. 2 SGB V - Spitzbetrag Jahresausgleich",
    "03762": "Mittel aus dem Zusatzbeitrag (ohne 3760 und 3761) - Forderungen/Verpflichtungen",
    "03770": "Zuweisungen aus dem Gesundheitsfonds (§ 266 SGB V) - Abschlagsverfahren",
    "03771": "Zuweisungen aus dem Gesundheitsfonds nach § 270 Abs. 1 Buchstabe a SGB V - Abschlagsverfahren",
    "03772": "Zuweisungen aus dem Gesundheitsfonds nach § 270 Abs. 1 Buchstabe b SGB V - Abschlagsverfahren",
    "03773": "Zuweisungen aus dem Gesundheitsfonds nach § 270 Abs. 1 Buchstabe c SGB V - Abschlagsverfahren",
    "03775": "Zuweisungen aus dem Gesundheitsfonds nach RSAV (Einkommensausgleich-Abschlag) - Abschlagsverfahren",
    "03780": "Zuweisungen aus dem Gesundheitsfonds (§ 266 SGB V) - Spitzbetrag Jahresausgleich",
    "03781": "Zuweisungen aus dem Gesundheitsfonds nach § 270 Abs. 1 Buchstabe a SGB V - Spitzbetrag Jahresausgleich",
    "03782": "Zuweisungen aus dem Gesundheitsfonds nach § 270 Abs. 1 Buchstabe b SGB V - Spitzbetrag Jahresausgleich",
    "03783": "Zuweisungen aus dem Gesundheitsfonds nach § 270 Abs. 1 Buchstabe c SGB V - Spitzbetrag Jahresausgleich",
    "03784": "Zuweisungen aus dem Gesundheitsfonds nach § 268 Abs. 4 SGB V (Risikopool) - Jahresausgleich",
    "03785": "Zuweisungen aus dem Gesundheitsfonds nach RSAV - Spitzbetrag Jahresausgleich",
    "03786": "Zuweisungen aus dem Gesundheitsfonds - Korrekturbetrag",
    "03787": "Bereinigungs- und Korrekturbeträge nach RSAV sowie nach § 408 SGB V",
    "03790": "Zuweisungen aus dem Gesundheitsfonds (§ 266 SGB V) - ohne 3770 und 3780",
    "03791": "Zuweisungen aus dem Gesundheitsfonds nach § 270 Abs. 1 Buchstabe a SGB V - ohne 3771 und 3781",
    "03792": "Zuweisungen aus dem Gesundheitsfonds nach § 270 Abs. 1 Buchstabe b SGB V - ohne 3772 und 3782",
    "03793": "Zuweisungen aus dem Gesundheitsfonds nach § 270 Abs. 1 Buchstabe c SGB V - ohne 3773 und 3783",
    "03794": "Zuweisungen aus dem Gesundheitsfonds nach § 268 Abs. 4 SGB V (Risikopool) - ohne 3784",
    "03795": "Zuweisungen aus dem Gesundheitsfonds nach RSAV - ohne 3775 und 3785",
    "03796": "Abweichungsbetrag für Zuweisungen nach § 266 SGB V",
    "03797": "Abweichungsbetrag für Zuweisungen nach § 270 Abs. 1 Buchstabe c SGB V",
    "03798": "Korrekturbedarf für Zuweisungen, die nicht das laufende Geschäftsjahr betreffen",
    "03799": "Korrekturbedarf nach § 273 SGB V",
    "03999": "sonstige Einnahmen insgesamt",
    "04780": "Beiträge aus Krankengeld (ohne 4781 und 4782)",
    "04781": "Beiträge aus Krankengeld bei Erkrankung des Kindes",
    "04782": "Beiträge aus Krankengeld nach § 44b SGB V",
    "05999": "Kontenklasse 4/5 insgesamt (Leistungsausgaben)",
    "06400": "Finanzierungsanteil des Gesundheitsfonds am Innovationsfonds (Gesundheitsfonds)",
    "06401": "Finanzierungsanteil des Gesundheitsfonds am Strukturfonds (Gesundheitsfonds)",
    "06730": "Vorsorge- und Früherkennungsmaßnahmen nach § 270 Abs. 4 SGB V (Gesundheitsfonds)",
    "06760": "Zahlungen aus dem Einkommensausgleich - monatliches Verfahren - (Gesundheitsfonds)",
    "06761": "Zahlungen aus dem Einkommensausgleich - Strukturanpassungen - (Gesundheitsfonds)",
    "06762": "Zahlungen aus dem Einkommensausgleich - Jahresausgleich - (Gesundheitsfonds)",
    "06776": "Zuweisungen - monatliche Zuweisungen - (Gesundheitsfonds)",
    "06777": "Zuweisungen - Strukturanpassungen - (Gesundheitsfonds)",
    "06787": "Bereinigungs- und Korrekturbeträge (Gesundheitsfonds)",
    "06788": "Zuweisungen aus dem Risikopool nach § 268 Abs. 4 SGB V (Gesundheitsfonds)",
    "06789": "Zuweisungen - Jahresausgleich - (Gesundheitsfonds)",
    "06999": "Kontenklasse 6 insgesamt",
    "07599": "Zwischensumme 70 bis 75 -Ausgaben- (Brutto-Verwaltungskosten)",
    "07620": "Erstattungen von Trägern der allgemeinen Rentenversicherung",
    "07630": "Erstattungen von der Pflegeversicherung",
    "07640": "Erstattungen von der Bundesagentur für Arbeit (ohne 7641)",
    "07660": "Erstattungen vom Bund",
    "07899": "Erstattete Verwaltungskosten insgesamt -Einnahmen-",
    "07999": "Netto-Verwaltungskosten (Summe 70 bis 75 abz. Summe 76)",
    "09202": "Beiträge aus Versorgungsbezügen (Gesundheitsfonds)",
    "09204": "Beiträge der Studenten (Gesundheitsfonds)",
    "09210": "Beiträge von freiwillig versicherten Mitgliedern (Gesundheitsfonds)",
    "09220": "Beiträge für Rehabilitanden (Gesundheitsfonds)",
    "09230": "Beiträge der versicherungspflichtigen Mitglieder nach § 5 Abs. 1 Nr. 13 SGB V (Gesundheitsfonds)",
    "09231": "Sonstige Beiträge, die nicht den Schlüssel-Nummern 9202 bis 9230 zuzuordnen sind (Gesundheitsfonds)",
    "09400": "Umlagebeträge (einschl. Säumniszuschläge und Zinsen) - AAG U1 (Krankheit)",
    "09410": "Erstattungen an Arbeitgeber - AAG U1 (Krankheit)",
    "09420": "Umlagebeträge (einschl. Säumniszuschläge und Zinsen) - AAG U2 (Mutterschaft)",
    "09430": "Erstattungen an Arbeitgeber - AAG U2 (Mutterschaft)",
    "09870": "Saldo Einkommensausgleich (Gesundheitsfonds)",
    "09920": "Einnahmen (Kontenklasse 2 und Konten 9400, 9420)",
    "09930": "Einnahmen (Kontenklasse 3 und Konten 9401, 9402, 9421, 9422)",
    "09950": "Ausgaben (Kontenklasse 4/5 und Konten 9410, 9430)",
    "09960": "Ausgaben (Kontenklasse 6/7 und Konten 9411, 9419, 9431, 9439)",
    "09971": "Rücklage-Ist am Ende des Geschäftsjahres",
    "09980": "Saldo aus Einnahmen und Ausgaben",
    "09990": "Liquiditätsreserve des Gesundheitsfonds",
}
KJ1_EN = {
    "02000": "Contributions for compulsorily insured employees",
    "02011": "Contributions of the Federal Employment Agency for insured recipients of unemployment benefit (SGB III) and of further benefits",
    "02013": "Contributions for insured Bürgergeld recipients",
    "02020": "Contributions on pensions of compulsorily insured members (excl. 2026) / on pensions of retired farmers (LKK only)",
    "02022": "Contributions of pension applicants",
    "02025": "Contributions on company pensions and earned income of compulsorily insured members with and without a pension (LKK only)",
    "02026": "Contributions on pensions of actively insured members (LKK only)",
    "02027": "Contribution refunds under § 231(2) SGB V / § 40(7) sentence 4 KVLG 1989",
    "02040": "Contributions of compulsorily insured students, interns and unpaid trainees (LKK only)",
    "02050": "Contributions of voluntary military service members and aptitude trainees",
    "02060": "Contributions on company pensions and earned income of compulsorily insured members (LKK only)",
    "02100": "Contributions of members entitled to insure (LKK only)",
    "02140": "Contributions of voluntarily insured students (LKK only)",
    "02200": "Contributions for rehabilitation participants (LKK only)",
    "02300": "Contributions of compulsorily insured members under § 2(1) no. 7 KVLG 1989 (LKK only)",
    "02310": "Other health-insurance contributions (LKK only)",
    "02400": "Contributions for self-employed artists and writers under the KSVG",
    "02500": "Additional contribution under § 242(1) SGB V in the version in force until 31 Dec 2014",
    "02600": "Other contributions (Gesundheitsfonds): voluntary members, company pensions, students, rehabilitation participants, catch-all insurance",
    "02700": "Employer flat-rate contributions on mini-jobs (§ 249b SGB V / § 48(6) KVLG 1989, excl. 2702)",
    "02702": "Employer flat-rate contributions on mini-jobs (§ 249b SGB V / § 48(6) KVLG 1989), retired farmers",
    "02800": "Late-payment surcharges on health-insurance contributions",
    "02802": "Late-payment surcharges on health-insurance contributions, retired farmers",
    "02810": "Late-filing surcharges on additional contributions under § 242(6) SGB V (version until 31 Dec 2014)",
    "02900": "Additional contributions (Zusatzbeitrag) for compulsorily insured employees (Gesundheitsfonds)",
    "02901": "Additional contributions of the Federal Employment Agency for insured recipients of unemployment benefit and further benefits (Gesundheitsfonds)",
    "02902": "Additional contributions for compulsorily insured Bürgergeld recipients (Gesundheitsfonds)",
    "02903": "Additional contributions on pensions of compulsorily insured members (Gesundheitsfonds)",
    "02904": "Refunds of additional contributions under § 231(2) SGB V (Gesundheitsfonds)",
    "02905": "Additional contributions of voluntary military service members and aptitude trainees (Gesundheitsfonds)",
    "02906": "Additional contributions for self-employed artists and writers under the KSVG (Gesundheitsfonds)",
    "02907": "Other additional contributions (Gesundheitsfonds)",
    "02999": "Contribution revenue, total (account groups 20–28)",
    "03010": "Interest on investments",
    "03222": "Subsidies for benefit expenditure under § 37(2) KVLG 1989 (federal, agricultural insurer)",
    "03223": "Subsidies under § 37(3) in conjunction with § 4(3) and § 59(3) KVLG 1989",
    "03260": "Federal participation in expenditure under § 221 SGB V (Bundeszuschuss)",
    "03263": "Federal reimbursements (KHG / COVID-19) (Gesundheitsfonds)",
    "03264": "Federal funds for the reimbursement of hospital energy-cost increases (Gesundheitsfonds)",
    "03730": "Prevention and early-detection measures under § 270(4) SGB V",
    "03760": "Funds from the additional contribution under § 270a(2) SGB V — advance procedure",
    "03761": "Funds from the additional contribution under § 270a(2) SGB V — final amount of the annual settlement",
    "03762": "Funds from the additional contribution (excl. 3760 and 3761) — receivables/liabilities",
    "03770": "Allocations from the Gesundheitsfonds (§ 266 SGB V) — advance procedure",
    "03771": "Allocations from the Gesundheitsfonds under § 270(1)(a) SGB V — advance procedure",
    "03772": "Allocations from the Gesundheitsfonds under § 270(1)(b) SGB V — advance procedure",
    "03773": "Allocations from the Gesundheitsfonds under § 270(1)(c) SGB V — advance procedure",
    "03775": "Allocations from the Gesundheitsfonds under the RSAV (income-equalisation deduction) — advance procedure",
    "03780": "Allocations from the Gesundheitsfonds (§ 266 SGB V) — final amount of the annual settlement",
    "03781": "Allocations from the Gesundheitsfonds under § 270(1)(a) SGB V — final amount of the annual settlement",
    "03782": "Allocations from the Gesundheitsfonds under § 270(1)(b) SGB V — final amount of the annual settlement",
    "03783": "Allocations from the Gesundheitsfonds under § 270(1)(c) SGB V — final amount of the annual settlement",
    "03784": "Allocations from the Gesundheitsfonds under § 268(4) SGB V (risk pool) — annual settlement",
    "03785": "Allocations from the Gesundheitsfonds under the RSAV — final amount of the annual settlement",
    "03786": "Allocations from the Gesundheitsfonds — correction amount",
    "03787": "Adjustment and correction amounts under the RSAV and § 408 SGB V",
    "03790": "Allocations from the Gesundheitsfonds (§ 266 SGB V) — other than 3770 and 3780",
    "03791": "Allocations from the Gesundheitsfonds under § 270(1)(a) SGB V — other than 3771 and 3781",
    "03792": "Allocations from the Gesundheitsfonds under § 270(1)(b) SGB V — other than 3772 and 3782",
    "03793": "Allocations from the Gesundheitsfonds under § 270(1)(c) SGB V — other than 3773 and 3783",
    "03794": "Allocations from the Gesundheitsfonds under § 268(4) SGB V (risk pool) — other than 3784",
    "03795": "Allocations from the Gesundheitsfonds under the RSAV — other than 3775 and 3785",
    "03796": "Deviation amount for allocations under § 266 SGB V",
    "03797": "Deviation amount for allocations under § 270(1)(c) SGB V",
    "03798": "Correction requirement for allocations not relating to the current financial year",
    "03799": "Correction requirement under § 273 SGB V",
    "03999": "Other revenue, total",
    "04780": "Contributions paid on sickness benefit (excl. 4781 and 4782) — pension, unemployment and care insurance",
    "04781": "Contributions paid on sickness benefit for care of a sick child",
    "04782": "Contributions paid on sickness benefit under § 44b SGB V",
    "05999": "Account classes 4/5, total (benefit expenditure)",
    "06400": "Fund's financing share of the Innovation Fund (Gesundheitsfonds)",
    "06401": "Fund's financing share of the Hospital Structure Fund (Gesundheitsfonds)",
    "06730": "Prevention and early-detection measures under § 270(4) SGB V (Gesundheitsfonds)",
    "06740": "Care supplements for hospitals under § 21a(4) KHG, COVID-19 (Gesundheitsfonds)",
    "06741": "Expenses under § 4(8) SARS-CoV-2 pharmaceutical supply ordinance (Gesundheitsfonds)",
    "06742": "Compensation payments to hospitals under § 26f KHG, energy costs (Gesundheitsfonds)",
    "06750": "Compensation payments and care supplements for hospitals under § 21(4), (4a), (4b) and § 21a(4) KHG, COVID-19 (Gesundheitsfonds)",
    "06751": "Compensation payments to hospitals under § 21(5) KHG (Gesundheitsfonds)",
    "06752": "Compensation payments to prevention and rehabilitation facilities under § 111d SGB V (Gesundheitsfonds)",
    "06753": "Compensation payments, COVID-19 pandemic (Gesundheitsfonds)",
    "06754": "Subsidies for social service providers under § 9 SodEG (Gesundheitsfonds)",
    "06755": "Expenses for SARS-CoV-2 testing under § 20i(3) SGB V (Gesundheitsfonds)",
    "06756": "Expenses, COVID-19 pandemic (Gesundheitsfonds)",
    "06757": "Expenses, COVID-19 pandemic (Gesundheitsfonds)",
    "06758": "Expenses for vaccinations under § 20i(3) SGB V (Gesundheitsfonds)",
    "06759": "Other expenses in the context of the COVID-19 pandemic (Gesundheitsfonds)",
    "06760": "Income-equalisation payments (Zusatzbeitrag pooling) — monthly procedure (Gesundheitsfonds)",
    "06761": "Income-equalisation payments — structural adjustments (Gesundheitsfonds)",
    "06762": "Income-equalisation payments — annual settlement (Gesundheitsfonds)",
    "06776": "Allocations to insurers — monthly allocations (Gesundheitsfonds)",
    "06777": "Allocations to insurers — structural adjustments (Gesundheitsfonds)",
    "06787": "Adjustment and correction amounts (Gesundheitsfonds)",
    "06788": "Allocations from the risk pool under § 268(4) SGB V (Gesundheitsfonds)",
    "06789": "Allocations to insurers — annual settlement (Gesundheitsfonds)",
    "06999": "Account class 6, total",
    "07599": "Subtotal 70–75 — expenditure (gross administration costs)",
    "07620": "Reimbursements from the general pension insurance institutions",
    "07630": "Reimbursements from the long-term care insurance",
    "07640": "Reimbursements from the Federal Employment Agency (excl. 7641)",
    "07660": "Reimbursements from the Federation",
    "07899": "Reimbursed administration costs, total — revenue",
    "07999": "Net administration costs (sum 70–75 less sum 76)",
    "09202": "Contributions on company pensions (Gesundheitsfonds)",
    "09204": "Contributions of students (Gesundheitsfonds)",
    "09210": "Contributions of voluntarily insured members (Gesundheitsfonds)",
    "09220": "Contributions for rehabilitation participants (Gesundheitsfonds)",
    "09230": "Contributions of members compulsorily insured under § 5(1) no. 13 SGB V (catch-all insurance) (Gesundheitsfonds)",
    "09231": "Other contributions not assignable to keys 9202–9230 (Gesundheitsfonds)",
    "09400": "Employer levy U1 (sick-pay continuation, AAG) incl. surcharges and interest — revenue of the U1 special fund",
    "09410": "Reimbursements to employers from the U1 special fund (AAG)",
    "09420": "Employer levy U2 (maternity, AAG) incl. surcharges and interest — revenue of the U2 special fund",
    "09430": "Reimbursements to employers from the U2 special fund (AAG)",
    "09870": "Balance of the income equalisation (Gesundheitsfonds)",
    "09920": "Revenue (account class 2 and accounts 9400, 9420)",
    "09930": "Revenue (account class 3 and accounts 9401, 9402, 9421, 9422)",
    "09950": "Expenditure (account classes 4/5 and accounts 9410, 9430)",
    "09960": "Expenditure (account classes 6/7 and accounts 9411, 9419, 9431, 9439)",
    "09971": "Actual reserve at the end of the financial year",
    "09980": "Balance of revenue and expenditure",
    "09990": "Liquidity reserve of the Gesundheitsfonds",
}
KJ1_SUMS = {  # rows without Konto number: label as printed → canonical
    "Einnahmen insgesamt": "Einnahmen insgesamt",
    "Ausgaben insgesamt": "Ausgaben insgesamt",
    "Ausgaben insgesant": "Ausgaben insgesamt",  # typo in KJ1 2024 p.20
    "Summe ärztliche Behandlung": "Summe ärztliche Behandlung",
    "Summe zahnärztliche Behandlung": "Summe zahnärztliche Behandlung",
    "Summe Zahnersatz": "Summe Zahnersatz",
    "Summe Arzneimittel": "Summe Arzneimittel",
    "Summe Hilfsmittel": "Summe Hilfsmittel",
    "Summe Heilmittel": "Summe Heilmittel",
    "Summe Krankenhaus": "Summe Krankenhaus",
    "Summe Krankengeld": "Summe Krankengeld",
    "Summe Fahrkosten": "Summe Fahrkosten",
    "Summe Vorsorge- und Rehaleistungen": "Summe Vorsorge- und Rehaleistungen",
    "Summe Schwangerschaft und Mutterschaft": "Summe Schwangerschaft und Mutterschaft",
    "Summe Schwangerschaft und Mutterschaft ohne stat. Entbindung": "Summe Schwangerschaft und Mutterschaft",
}
KJ1_COLS = ("BAS", "BUND", "AOK", "BKK", "IKK", "LKK", "KBS", "VDEK")


def extract_kj1(ref: str, year: int) -> None:
    """KJ1 (BMG, final GKV results), absolute part. Columns: BAS = Gesundheitsfonds, BUND = all Krankenkassen, then insurer types.
    Numbers are right-aligned under the column header; empty cells are simply absent, so columns are assigned by x position."""
    import pdfplumber  # noqa: PLC0415

    rows = []
    with pdfplumber.open(raw_path(*FILES[ref])) as pdf:
        p1 = pdf.pages[0].extract_text() or ""
        m = re.search(r"Einnahmen und Ausgaben absolut (\d+) - (\d+)", p1)
        assert m, f"{ref}: page index not found on p.1"
        first, last = int(m.group(1)), int(m.group(2))
        status = re.search(r"(Endgültige|Vorläufige) Rechnungsergebnisse\s+(\d{4})", p1)
        stand = re.search(r"Stand: (\d{1,2}\. \w+ \d{4})", p1)
        assert status and int(status.group(2)) == year, f"{ref}: title/year mismatch"
        rows.append(["Status laut Titelseite", year, None, "", 1, "Titel", f"{status.group(1)} Rechnungsergebnisse {year}; Stand: {stand.group(1) if stand else '?'}"])
        for pno in range(first, last + 1):
            page = pdf.pages[pno - 1]
            words = page.extract_words(x_tolerance=1.5)
            hdr_words = [w for w in words if w["text"] in KJ1_COLS and w["top"] < 80]
            hdr = {w["text"]: (w["x0"] + w["x1"]) / 2 for w in hdr_words}
            assert set(hdr) == set(KJ1_COLS), f"{ref} p.{pno}: column header incomplete: {sorted(hdr)}"
            hdr_bottom = max(w["bottom"] for w in hdr_words)  # the first data row can start 2–3 pt below the header (KJ1 2025 p.8)
            lines: dict[int, list] = {}
            for w in words:
                if w["top"] < hdr_bottom - 1:
                    continue
                lines.setdefault(round(w["top"] / 3), []).append(w)
            pending = ""
            for key in sorted(lines):
                ws = sorted(lines[key], key=lambda w: w["x0"])
                nums = [w for w in ws if NUM_DE.match(w["text"])]
                text = " ".join(w["text"] for w in ws if not NUM_DE.match(w["text"])).strip()
                if not nums:
                    if text.startswith("Datenquelle"):
                        pending = ""
                    else:
                        pending = (pending + " " + text).strip()
                    continue
                label = (pending + " " + text).strip()
                pending = ""
                kontos = re.findall(r"\b0\d{4}\b", label)  # KJ1 account numbers start with 0; a stray digit may follow (e.g. '05999 0' in KJ1 2025)
                konto = kontos[-1] if kontos else None
                plain = (label[: label.rfind(konto)] if konto else label).strip()
                cells = [(min(hdr, key=lambda c: abs(hdr[c] + 15 - n["x1"])), n) for n in nums]  # numbers are right-aligned ≈15–35 px right of the header centre
                if konto in KJ1_LABELS:
                    canon = KJ1_LABELS[konto]
                elif konto is None and plain in KJ1_SUMS:
                    canon = KJ1_SUMS[plain]
                elif konto and konto[:2] in ("06", "07") and any(c == "BAS" for c, _ in cells):
                    canon = plain  # every Gesundheitsfonds expenditure row is kept so the fund's total can be verified
                else:
                    continue
                for col, n in cells:
                    if col in ("BAS", "BUND"):
                        rows.append([canon, year, de_num(n["text"]), "EUR", pno, f"Konto {konto}, Spalte {col}" if konto else f"Zeile '{canon}', Spalte {col}", "BAS = Gesundheitsfonds; BUND = alle Krankenkassen" if konto else ("Summenzeile ohne Kontonummer" + (f"; gedruckt als '{plain}'" if plain != canon else ""))])
    assert any(r[0] == "Einnahmen insgesamt" and "BUND" in r[5] for r in rows) and any(r[0] == "Ausgaben insgesamt" and "BUND" in r[5] for r in rows), f"{ref}: totals missing"
    write_extract(ref, rows)


def extract_all() -> None:
    extract_drv_fb()
    extract_drv_ad()
    extract_spv("spv_2024")
    extract_spv("spv_2025")
    extract_ba("ba_2024", 2024)
    extract_ba("ba_2025", 2025)
    extract_kj1("kj1_2024", 2024)
    extract_kj1("kj1_2025", 2025)


# ----------------------------------------------------------------------------------------------------------------
# build
# ----------------------------------------------------------------------------------------------------------------
CHECKS: list[dict] = []


def check(name: str, total: float, parts: float, tol: float, detail: str = "") -> None:
    ok = abs(total - parts) <= tol + 1e-9
    CHECKS.append({"check": name, "total": round(total, 2), "sum_of_parts": round(parts, 2), "diff": round(total - parts, 2), "tolerance": tol, "ok": ok, "detail": detail})
    if not ok:
        raise SystemExit(f"CHECK FAILED {name}: total {total} vs parts {parts} (diff {total - parts}, tol {tol}) {detail}")
    print(f"  ok  {name}: {total:,.2f} vs {parts:,.2f} (diff {total - parts:+,.2f}, tol {tol})")


class Table:
    """Lookup over one extract: (item_de, year[, coordinate substring]) → row."""

    def __init__(self, ref: str):
        self.ref = ref
        self.rows = read_extract(ref)

    def row(self, item: str, year: int, coord: str | None = None) -> dict:
        hits = [r for r in self.rows if r["item_de"] == item and r["year"] == year and (coord is None or coord in r["row_or_table"])]
        if not hits:
            hits = [r for r in self.rows if r["item_de"].startswith(item) and r["year"] == year and (coord is None or coord in r["row_or_table"])]
        if len(hits) != 1:
            raise SystemExit(f"{self.ref}: expected exactly one row for {item!r}/{year}/{coord!r}, found {len(hits)}")
        return hits[0]

    def has(self, item: str, year: int, coord: str | None = None) -> bool:
        return any(r["item_de"] == item and r["year"] == year and (coord is None or coord in r["row_or_table"]) for r in self.rows)

    def val(self, item: str, year: int, coord: str | None = None) -> float | None:
        return self.row(item, year, coord)["value"]


UNIT_TO_EUR = {"Mrd EUR": 1e9, "Mio EUR": 1e6, "EUR": 1.0}
PRECISION = {"Mrd EUR": {1: 1e8, 2: 1e7}, "Mio EUR": {0: 1e6, 1: 1e5}, "EUR": {2: 0.01}}


def fig(t: Table, item: str, year: int, coord: str | None = None, label_en: str | None = None, note: str | None = None, decimals: int | None = None) -> dict:
    """One sourced figure in EUR. `decimals` = decimals printed in the source (derives precision_eur)."""
    r = t.row(item, year, coord)
    unit = r["unit"]
    v = r["value"]
    if decimals is None:
        decimals = {"Mrd EUR": 1 if t.ref.startswith("drv") else 2, "Mio EUR": 0 if t.ref.startswith("drv") else 1, "EUR": 2}[unit]
    out = {
        "label": {"de": r["item_de"], "en": label_en or r["item_de"]},
        "value_eur": None if v is None else round(v * UNIT_TO_EUR[unit], 2),
        "precision_eur": PRECISION[unit][decimals],
        "source": {"ref": t.ref, "page": r["page"], "coordinates": r["row_or_table"]},
    }
    if r["note"]:
        out["source"]["note"] = r["note"]
    if note:
        out["note"] = note
    return out


def eur(f: dict) -> float:
    return f["value_eur"] or 0.0


def build() -> None:
    drv = Table("drv_fb")
    drv_ad = Table("drv_ad")
    spv = {2024: Table("spv_2024"), 2025: Table("spv_2025")}
    ba = {2024: Table("ba_2024"), 2025: Table("ba_2025")}
    kj1 = {2024: Table("kj1_2024"), 2025: Table("kj1_2025")}
    transfers: list[dict] = []

    def transfer(year, frm, to, amount_fig, kind, label_en, note=None):
        transfers.append({"year": year, "from": frm, "to": to, "amount_eur": amount_fig["value_eur"], "precision_eur": amount_fig["precision_eur"], "kind": kind, "label": {"de": amount_fig["label"]["de"], "en": label_en}, "source": amount_fig["source"], **({"note": note} if note else {})})

    # ------------------------------------------------------------------ pension (allgemeine Rentenversicherung)
    pension_years = {}
    for y, status in ((2024, "final"), (2025, "provisional")):
        c_payroll = fig(drv, "Pflichtbeiträge aus Erwerbstätigkeit", y, label_en="Compulsory contributions from gainful activity (employees incl. mini-jobs, compulsorily insured self-employed, other directly paid compulsory contributions)", note="Footnote 1: includes compulsorily insured self-employed and other directly paid compulsory contributions; the source does not separate them from payroll.")
        c_kez = fig(drv, "Kindererziehungszeiten (Bund)", y, label_en="Contributions paid by the federal budget for child-raising periods")
        c_ba = fig(drv, "Bundesagentur für Arbeit", y, label_en="Contributions paid by the Federal Employment Agency for unemployment-benefit recipients")
        c_kv = fig(drv, "Krankenversicherung", y, label_en="Contributions paid by statutory health insurance (sickness-benefit recipients)")
        c_pv = fig(drv, "Pflegeversicherung", y, label_en="Contributions paid by long-term care insurance (family carers)")
        c_vol = fig(drv, "Freiwillig gezahlte Beiträge", y, label_en="Voluntary contributions")
        c_tot = fig(drv, "Beitragseinnahmen gesamt", y, label_en="Contribution revenue, total")
        g_tot = fig(drv, "Bundeszuschüsse gesamt", y, coord="Rechnungsergebnis", label_en="Federal grants, total")
        g_all = fig(drv, "Allgemeiner Bundeszuschuss", y, label_en="General federal grant (§ 213(2) SGB VI)")
        g_add = fig(drv, "Zusätzlicher Bundeszuschuss", y, label_en="Additional federal grant (§ 213(3) SGB VI)")
        g_inc = fig(drv, "Erhöhungsbetrag", y, label_en="Increase amount to the additional federal grant (§ 213(4) SGB VI)")
        o_erst = fig(drv, "Erstattungen öffentlicher Stellen", y, label_en="Reimbursements from public bodies")
        o_verm = fig(drv, "Vermögenserträge", y, label_en="Investment income")
        o_ubr = fig(drv, "Übrige Einnahmen", y, label_en="Other revenue (incl. reimbursements from the miners' pension insurance)")
        r_tot = fig(drv, "Einnahmen gesamt", y, label_en="Revenue, total (without Finanzausgleich)")
        e_rent = fig(drv, "Rentenausgaben", y, label_en="Pension payments")
        e_kvdr = fig(drv, "KVdR", y, label_en="Contributions and subsidies to pensioners' health insurance (KVdR): pension insurer's half of GKV contributions plus § 106 SGB VI subsidies to pensioners insured outside the GKV", note="Printed 'KVdR' here, 'Beiträge und Zuschüsse zur KVdR' in DRV Aktuelle Daten: includes the § 106 SGB VI subsidy to voluntarily/privately insured pensioners (never reaches the GKV) and, per footnote 5, pensioner-borne care and health contributions on EM supplements. As a DRV→GKV flow it is therefore an upper bound for the allgemeine RV share; the cached sources do not quantify the parts.")
        e_ubr = fig(drv, "Übrige Ausgaben", y, label_en="Other expenditure")
        e_wva = fig(drv, "Wanderversicherungsausgleich", y, label_en="Settlement with the miners' pension insurance (Wanderversicherungsausgleich)")
        e_wa = fig(drv, "Wanderungsausgleich", y, label_en="Settlement for insured persons migrating from the miners' scheme (Wanderungsausgleich, § 223 SGB VI)")
        e_reha = fig(drv, "Leistungen zur Teilhabe", y, label_en="Rehabilitation and participation benefits")
        e_verw = fig(drv, "Verwaltungskosten", y, label_en="Administration costs")
        e_tot = fig(drv, "Ausgaben gesamt", y, label_en="Expenditure, total (without Finanzausgleich)")
        reserve = fig(drv, "Nachhaltigkeitsrücklage am Jahresende", y, label_en="Sustainability reserve at year end")
        months = drv.val("in Monatsausgaben", y)
        tol = 0.1e9 * 1  # one decimal in Mrd EUR, several independently rounded parts: 0.1 bn
        check(f"DRV {y}: contribution parts = Beitragseinnahmen gesamt", eur(c_tot), sum(map(eur, (c_payroll, c_kez, c_ba, c_kv, c_pv, c_vol))), tol)
        check(f"DRV {y}: federal grant parts = Bundeszuschüsse gesamt", eur(g_tot), sum(map(eur, (g_all, g_add, g_inc))), tol)
        check(f"DRV {y}: revenue parts = Einnahmen gesamt", eur(r_tot), sum(map(eur, (c_tot, g_tot, o_erst, o_verm, o_ubr))), tol)
        check(f"DRV {y}: expenditure parts = Ausgaben gesamt", eur(e_tot), sum(map(eur, (e_rent, e_kvdr, e_ubr))), tol)
        other_rest = eur(e_ubr) - sum(map(eur, (e_wva, e_wa, e_reha, e_verw)))
        assert -0.1e9 <= other_rest <= 0.4e9, f"DRV {y}: 'Übrige Ausgaben' residual implausible: {other_rest}"
        balance = eur(r_tot) - eur(e_tot)
        pension_years[str(y)] = {
            "status": status,
            "status_source_wording": "endgültig" if y == 2024 else "vorläufig",
            "revenue_total": r_tot,
            "contributions_total": c_tot,
            "contributions_by_payer": {
                "payroll_employee_employer_combined": {"value_eur": c_payroll["value_eur"], "components": [c_payroll], "caveat": "Includes compulsorily insured self-employed and other directly paid compulsory contributions (DRV footnote 1); not separable in the source."},
                "self_employed_voluntary": {"value_eur": c_vol["value_eur"], "components": [c_vol], "caveat": "Voluntary contributions only; compulsorily insured self-employed sit in the payroll line."},
                "federal_budget": {"value_eur": c_kez["value_eur"], "components": [c_kez]},
                "bundesagentur": {"value_eur": c_ba["value_eur"], "components": [c_ba]},
                "pension_insurance_for_pensioners": {"value_eur": 0.0, "components": [], "note": "not applicable (pension insurance is the payer in other systems, not a payee of itself)"},
                "other_public": {"value_eur": eur(c_kv) + eur(c_pv), "components": [c_kv, c_pv], "note": "Health insurance pays for sickness-benefit recipients, long-term care insurance for family carers."},
            },
            "federal_grants": {"value_eur": g_tot["value_eur"], "total": g_tot, "components": [g_all, g_add, g_inc]},
            "other_revenue": [o_erst, o_verm, o_ubr],
            "expenditure_total": e_tot,
            "expenditure_items": [e_rent, e_kvdr, e_wva, e_wa, e_reha, e_verw, {"label": {"de": "Weitere Ausgaben (Rest von 'Übrige Ausgaben')", "en": "Further expenditure (residual of 'other expenditure')"}, "value_eur": round(other_rest, 2), "precision_eur": 1e8, "derived": "Übrige Ausgaben − (Wanderversicherungsausgleich + Wanderungsausgleich + Leistungen zur Teilhabe + Verwaltungskosten)", "source": e_ubr["source"]}],
            "expenditure_other_total": e_ubr,
            "balance_eur": round(balance, 2),
            "balance_note": "Einnahmen gesamt − Ausgaben gesamt (both without Finanzausgleich), from one-decimal Mrd figures.",
            "reserve": {**reserve, "months_of_expenditure": months},
            "cross_check_mio_eur": {
                "note": "DRV 'Aktuelle Daten' (Stand 22.12.2025) prints the same account in Mio EUR; 2025 there is the autumn 2025 estimate, superseded by the provisional result above. Differences of up to 0.2 bn between the two DRV tables (e.g. Rentenausgaben, KVdR) come from different item definitions (Finanzbericht footnotes 5/6), not from revisions.",
                "revenue_total": fig(drv_ad, "Einnahmen", y, label_en="Revenue, total"),
                "contributions_total": fig(drv_ad, "Beiträge", y, label_en="Contributions"),
                "federal_grant_general": fig(drv_ad, "Bundeszuschuss (allgemeiner)", y, label_en="General federal grant"),
                "federal_grants_additional": fig(drv_ad, "zusätzliche Bundeszuschüsse", y, label_en="Additional federal grants (incl. increase amount)"),
                "expenditure_total": fig(drv_ad, "Ausgaben", y, label_en="Expenditure, total"),
                "pension_payments": fig(drv_ad, "Rentenausgaben", y, label_en="Pension payments"),
                "kvdr": fig(drv_ad, "Beiträge und Zuschüsse zur KVdR", y, label_en="Contributions and subsidies to pensioners' health insurance"),
                "rehabilitation": fig(drv_ad, "Leistungen zur Teilhabe", y, label_en="Rehabilitation"),
                "administration": fig(drv_ad, "Verwaltungs- und Verfahrenskosten", y, label_en="Administration and procedure costs"),
                "balance": fig(drv_ad, "Einnahmeüberschuss", y, label_en="Revenue surplus (negative = deficit)"),
                "reserve": fig(drv_ad, "Nachhaltigkeitsrücklage am Jahresende (absolut)", y, label_en="Sustainability reserve at year end"),
            },
        }
        if y == 2024:
            check("DRV 2024: Aktuelle Daten (Mio) vs Finanzbericht (Mrd): revenue", eur(r_tot), eur(pension_years["2024"]["cross_check_mio_eur"]["revenue_total"]), 0.05e9)
            check("DRV 2024: Aktuelle Daten (Mio) vs Finanzbericht (Mrd): expenditure", eur(e_tot), eur(pension_years["2024"]["cross_check_mio_eur"]["expenditure_total"]), 0.05e9)
            check("DRV 2024: Aktuelle Daten (Mio) vs Finanzbericht (Mrd): contributions", eur(c_tot), eur(pension_years["2024"]["cross_check_mio_eur"]["contributions_total"]), 0.05e9)
        transfer(y, "bund", "drv", g_tot, "grant", "Federal grants to the general pension insurance (general + additional + increase amount)")
        transfer(y, "bund", "drv", c_kez, "contribution_paid_by_public_body", "Federal contributions for child-raising periods (§ 177 SGB VI)")
        transfer(y, "bundesagentur", "drv", c_ba, "contribution_paid_by_public_body", "BA pension contributions for unemployment-benefit (ALG I) recipients", "Paying side: part of the BA's Arbeitslosengeld expenditure (BA report does not split it out).")
        transfer(y, "gkv", "drv", c_kv, "contribution_paid_by_public_body", "Health insurers' pension contributions for sickness-benefit recipients", "Paying side in KJ1: 'Beiträge aus Krankengeld' (Konto 4780–4782) covers pension, unemployment and care contributions together; see health.years.*.contributions_paid_to_other_systems.")
        transfer(y, "spv", "drv", c_pv, "contribution_paid_by_public_body", "Long-term care insurance pension contributions for family carers", "Paying side in the SPV table: 'Soziale Sicherung der Pflegepersonen' (covers pension + unemployment + accident insurance contributions).")
        transfer(y, "drv", "gkv", e_kvdr, "contribution_paid_by_public_body", "Pension insurer's contributions and subsidies for pensioners' health insurance (KVdR) — upper bound for the allgemeine RV → GKV flow", "Upper bound: the DRV line includes § 106 SGB VI subsidies to pensioners not in the GKV and pensioner-borne contributions on EM supplements (not quantifiable in the cached sources); it covers the allgemeine RV only, whereas KJ1 Konto 2020 + 2903 'Beiträge aus Renten' (receiving side) also contain the pensioners' own half and contributions on miners' and other pensions.")
    # 2025 Bundesmittel block (p.5) — AAÜG reimbursements and miners' deficit are federal money outside the allg. RV account
    bm_aaueg = fig(drv, "Erstattungen nach AAÜG, §§ 290a, 291a SGB VI", 2025, label_en="Federal reimbursements under AAÜG / §§ 290a, 291a SGB VI")
    bm_knv = fig(drv, "Defitzitausgleich in der knappschaftlichen Rentenversicherung", 2025, label_en="Federal deficit cover of the miners' pension insurance")
    bm_tot = fig(drv, "Bundesmittel gesamt", 2025, label_en="Federal funds to pension insurance, total")
    check("DRV 2025: Bundesmittel gesamt = grants + KEZ + AAÜG + KnV", eur(bm_tot), eur(drv_rows := fig(drv, "Bundeszuschüsse gesamt", 2025, coord="Faustdaten")) + eur(fig(drv, "Beiträge für Zeiten der Kindererziehung", 2025)) + eur(bm_aaueg) + eur(bm_knv), 0.1e9)
    transfer(2025, "bund", "drv", bm_aaueg, "reimbursement", "Federal reimbursements under AAÜG and §§ 290a, 291a SGB VI (2025 only in source)", "Not part of 'Einnahmen gesamt' of the allgemeine RV as shown on p.3 (listed under 'Erstattungen öffentlicher Stellen' only partly); shown in the Faustdaten block p.5.")
    transfer(2025, "bund", "knappschaft", bm_knv, "deficit_cover", "Federal deficit cover of the miners' pension insurance (outside the allgemeine RV account)")

    pension = {
        "id": "pension",
        "label": {"de": "Allgemeine Rentenversicherung (Deutsche Rentenversicherung)", "en": "Statutory pension insurance (general scheme, without miners' scheme)"},
        "scope_note": "Allgemeine Rentenversicherung only (ohne knappschaftliche RV), ohne Finanzausgleich. Mrd EUR with one decimal in the source; precision_eur = 1e8.",
        "years": pension_years,
        "federal_funds_2025_total": bm_tot,
        "rates": {
            "contribution_rate_pct": {"2024": {"value": 18.6, "evidence": "indirect", "note": "Cached sources print the rate for 2025 (DRV Finanzbericht p.4; Aktuelle Daten p.2) and 2026 (Aktuelle Daten p.2) only; the rate has been 18.6 % since 2018 by Beitragssatzverordnung 2018 (not cached)."}, "2025": {"value": drv.val("Beitragssatz zur RV (in %)", 2025), "source": {"ref": "drv_fb", "page": 4, "coordinates": "Zeile 'Beitragssatz zur RV (in %)', Spalte 2025"}}, "2026": {"value": drv_ad.val("Beitragssatz (allg. RV)", 2026), "source": {"ref": "drv_ad", "page": 2, "coordinates": "Zeile 'Beitragssatz (allg. RV) 2026'"}}},
            "split": {"text": "Employee and employer each pay half of the contribution on wages (§ 168 Abs. 1 Nr. 1 SGB VI; statute page not cached).", "evidence": "not cached"},
            "legal_basis": {"label": "§ 158 SGB VI (mechanism for setting the rate)", "source": {"ref": "sgb6_158"}},
            "ceiling_monthly_eur": {"2026": {"value": drv_ad.val("Beitragsbemessungsgrenze (allg. RV), monatlich", 2026), "source": {"ref": "drv_ad", "page": 2, "coordinates": "Zeile 'Beitragsbemessungsgrenze (allg. RV) 2026'"}}, "2024": None, "2025": None, "note": "2024/2025 ceilings are in the SV-Rechengrößenverordnungen 2024/2025 § 3? No: only § 3 (Durchschnittsentgelt) of those ordinances is cached; the ceiling sections are not, so 2024/2025 are null."},
            "average_earnings_eur": {"2024": {"value": 45358, "note": "vorläufiges Durchschnittsentgelt 2024", "source": {"ref": "svbezgrv_2024_3"}}, "2025": {"value": 50493, "note": "vorläufiges Durchschnittsentgelt 2025", "source": {"ref": "svbezgrv_2025_3"}}, "2026": {"value": 51944, "note": "vorläufiges Durchschnittsentgelt 2026", "source": {"ref": "svbezgrv_2026_3"}}},
        },
    }

    # ------------------------------------------------------------------ health (GKV: Gesundheitsfonds + Krankenkassen)
    health_years = {}
    for y in (2024, 2025):
        t = kj1[y]
        status_note = t.row("Status laut Titelseite", y)["note"]

        def k(konto: str, col: str, label_en: str | None = None, note: str | None = None, year=y, t=t) -> dict:
            item = KJ1_LABELS[konto]
            label_en = label_en if (label_en and label_en != item) else KJ1_EN[konto]
            if not t.has(item, year, f"Konto {konto}, Spalte {col}"):
                return {"label": {"de": item, "en": label_en or item}, "value_eur": None, "precision_eur": 0.01, "source": {"ref": t.ref, "coordinates": f"Konto {konto}, Spalte {col} — cell empty in source"}, "note": "empty cell in source (treated as 0 in sums)"}
            return fig(t, item, year, f"Konto {konto}, Spalte {col}", label_en=label_en, note=note)

        def s(label: str, col: str, label_en: str, year=y, t=t) -> dict:
            return fig(t, label, year, f"Zeile '{label}', Spalte {col}", label_en=label_en)

        def both(konto: str, label_en: str, note: str | None = None) -> dict:
            a, b = k(konto, "BAS", label_en, note), k(konto, "BUND", label_en, note)
            return {"label": a["label"], "value_eur": round(eur(a) + eur(b), 2), "precision_eur": 0.01, "source": {"ref": t.ref, "page": a["source"].get("page") or b["source"].get("page"), "coordinates": f"Konto {konto}, Spalten BAS + BUND"}, "gesundheitsfonds": a, "krankenkassen": b, **({"note": note} if note else {})}

        # --- contributions by konto, both levels (BAS = fund, BUND = insurers; the BUND column is essentially the LKK, which is outside the fund)
        cat_map = {
            "payroll_employee_employer_combined": ["02000", "02900", "02700", "02702"],
            "bundesagentur": ["02011", "02901"],
            "federal_budget": ["02013", "02902", "02050", "02905"],
            "pension_insurance_for_pensioners": ["02020", "02903", "02022", "02026"],
            "members_other": ["02600", "02907", "02025", "02060", "02100", "02140", "02040", "02300", "02310"],
            "other_public": ["02200"],
            "kuenstlersozialkasse_mixed": ["02400", "02906"],
            "adjustments_and_surcharges": ["02027", "02904", "02800", "02802", "02810", "02500"],
        }
        cat_labels = {
            "payroll_employee_employer_combined": ("Beiträge aus Arbeitsentgelt (Pflichtversicherte Beschäftigte, allgemeiner Beitrag + Zusatzbeitrag, Pauschalbeiträge Minijobs)", "Contributions on wages: compulsorily insured employees (general rate + Zusatzbeitrag) and employer flat-rate contributions for mini-jobs (§ 249b)"),
            "bundesagentur": ("Beiträge der Bundesagentur für Arbeit (ALG-I-Beziehende)", "Contributions paid by the Federal Employment Agency for unemployment-benefit recipients"),
            "federal_budget": ("Beiträge des Bundes (Bürgergeld-Beziehende, freiwillig Wehrdienstleistende)", "Contributions paid by the federal budget (Bürgergeld recipients, voluntary military service)"),
            "pension_insurance_for_pensioners": ("Beiträge aus Renten (Rentner und Rentenversicherungsträger je zur Hälfte)", "Contributions on pensions (pensioners and pension insurers, half each; withheld by the pension insurer)"),
            "members_other": ("Sonstige Beiträge: freiwillig Versicherte (u.a. Selbständige), Versorgungsbezüge, Studierende, Auffangversicherung, LKK-Mitglieder", "Other members' contributions: voluntary members (incl. self-employed and employees above the threshold), company pensions, students, catch-all insurance, LKK members"),
            "other_public": ("Beiträge für Rehabilitanden (Reha-Träger)", "Contributions for rehabilitation participants (paid by rehabilitation carriers)"),
            "kuenstlersozialkasse_mixed": ("Beiträge der Künstlersozialkasse (Versicherte, Verwerter-Abgabe, Bundeszuschuss)", "Artists' social fund contributions (artists, levy on users, federal grant — mixed financing)"),
            "adjustments_and_surcharges": ("Beitragserstattungen, Säumnis- und Verspätungszuschläge", "Refunds (negative) and late-payment surcharges"),
        }
        by_payer = {}
        cat_sum = 0.0
        for cat, kontos in cat_map.items():
            comps = [both(kk, KJ1_LABELS[kk]) for kk in kontos]
            v = round(sum(eur(c) for c in comps), 2)
            cat_sum += v
            by_payer[cat] = {"label": {"de": cat_labels[cat][0], "en": cat_labels[cat][1]}, "value_eur": v, "components": comps}
        c_tot = both("02999", "Contribution revenue, total (Kontengruppen 20–28)")
        check(f"KJ1 {y}: contributions by konto = 02999 (fund + insurers)", eur(c_tot), cat_sum, 0.01 * 40)
        # breakdown of 'Sonstige Beiträge (Gesundheitsfonds)' (nachrichtlich, Konto 9202–9231)
        sonst = {kk: k(kk, "BAS", KJ1_LABELS[kk]) for kk in ("09202", "09204", "09210", "09220", "09230", "09231")}
        check(f"KJ1 {y}: Konto 9202–9231 = Sonstige Beiträge (Konto 2600)", eur(k("02600", "BAS")), sum(eur(v) for v in sonst.values()), 0.01 * 6)
        by_payer["members_other"]["breakdown_of_konto_2600"] = list(sonst.values())
        by_payer["members_other"]["caveat"] = "Konto 2600 is split (Konto 9202–9231) into voluntary members, company pensions, students, rehabilitation participants, catch-all insurance and rest; the matching Zusatzbeiträge (Konto 2907) are not split. Rehabilitation participants (Konto 9220) are paid by rehabilitation carriers (public), employer subsidies to voluntarily insured employees are inside Konto 9210 — neither is separable here."
        by_payer["pension_insurance_for_pensioners"]["caveat"] = "Half of these contributions is borne by the pensioners (withheld from the pension), half by the pension insurer (§ 249a SGB V). The DRV's own share for the allgemeine RV is its KVdR expenditure (see pension); the miners' scheme and other pension payers also contribute."

        # --- federal money
        g_221 = both("03260", "Federal participation in non-insurance benefits (§ 221 SGB V) — Bundeszuschuss", "Konto 3260: BAS = grant to the Gesundheitsfonds; BUND column = LKK share (paid directly to the agricultural insurer).")
        g_khg = k("03263", "BAS", "Federal reimbursements (KHG § 21(8) / COVID-19) via the fund")
        g_energy = k("03264", "BAS", "Federal funds for hospital energy-cost compensation (pass-through via the fund)")
        g_lkk = k("03222", "BUND", "Federal subsidies to the agricultural health insurance (§ 37(2) KVLG 1989)")
        g_lkk2 = k("03223", "BUND", "Federal subsidies under § 37(3) KVLG 1989")
        # --- fund revenue
        f_contrib = k("02999", "BAS", "Contributions to the Gesundheitsfonds")
        f_other = k("03999", "BAS", "Other revenue of the Gesundheitsfonds (federal grant, interest, federal pass-through funds)")
        if t.has("Einnahmen insgesamt", y, "Spalte BAS"):
            f_rev = s("Einnahmen insgesamt", "BAS", "Revenue of the Gesundheitsfonds, total")
        else:  # KJ1 2025 prints no BAS cell in the 'Einnahmen insgesamt' row; derive and verify against the printed balance below
            f_rev = {"label": {"de": "Einnahmen insgesamt (Gesundheitsfonds)", "en": "Revenue of the Gesundheitsfonds, total"}, "value_eur": round(eur(f_contrib) + eur(f_other), 2), "precision_eur": 0.01, "derived": "Konto 2999 + Konto 3999 (BAS); the printed 'Einnahmen insgesamt' row has no BAS cell in this edition", "source": f_contrib["source"]}
        f_int = k("03010", "BAS", "Interest income of the Gesundheitsfonds")
        f_other_parts = [g_221["gesundheitsfonds"], g_khg, g_energy, f_int]
        f_other_rest = eur(f_other) - sum(map(eur, f_other_parts))
        assert abs(f_other_rest) < 20e6, f"KJ1 {y}: fund other revenue residual {f_other_rest}"
        check(f"KJ1 {y}: fund revenue = contributions + other", eur(f_rev), eur(f_contrib) + eur(f_other), 0.01)
        # --- fund expenditure (Kontenklasse 6 = allocations etc.; 7 = admin)
        f_exp = k("09960", "BAS", "Expenditure of the Gesundheitsfonds, total (Kontenklasse 6/7)")
        f_kk6 = k("06999", "BAS", "Kontenklasse 6 of the Gesundheitsfonds (allocations and other payments)")
        f_adm = k("07999", "BAS", "Net administration costs of the Gesundheitsfonds (BAS)")
        check(f"KJ1 {y}: fund expenditure = Kontenklasse 6 + net admin", eur(f_exp), eur(f_kk6) + eur(f_adm), 0.02)
        alloc_kontos = ("06776", "06777", "06787", "06788", "06789")
        eink_kontos = ("06760", "06761", "06762")
        f_alloc = [k(kk, "BAS", KJ1_LABELS[kk]) for kk in alloc_kontos]
        f_eink = [k(kk, "BAS", KJ1_LABELS[kk]) for kk in eink_kontos]
        f_vors = k("06730", "BAS", "Prevention/early-detection funds to insurers (§ 270(4) SGB V)")
        f_funds = [k("06400", "BAS", KJ1_LABELS["06400"]), k("06401", "BAS", KJ1_LABELS["06401"])]
        # every other Kontenklasse-6 row of the fund (hospital pass-throughs financed by the Bund etc.)
        other6 = [r for r in t.rows if r["year"] == y and r["row_or_table"].startswith("Konto 06") and r["row_or_table"].endswith("Spalte BAS") and r["row_or_table"].split(",")[0].split()[1] not in alloc_kontos + eink_kontos + ("06730", "06400", "06401", "06999")]
        f_other6 = [{"label": {"de": r["item_de"], "en": KJ1_EN.get(r["row_or_table"].split(",")[0].split()[1], r["item_de"])}, "value_eur": r["value"], "precision_eur": 0.01, "source": {"ref": t.ref, "page": r["page"], "coordinates": r["row_or_table"]}} for r in other6]
        check(f"KJ1 {y}: fund Kontenklasse 6 = allocations + Einkommensausgleich + prevention + fund shares + other rows", eur(f_kk6), sum(map(eur, f_alloc + f_eink + [f_vors] + f_funds + f_other6)), 0.01 * (len(other6) + 12))
        fund_to_insurers_fund_side = sum(map(eur, f_alloc + f_eink + [f_vors]))
        f_bal = k("09980", "BAS", "Balance of the Gesundheitsfonds (revenue − expenditure)")
        check(f"KJ1 {y}: fund balance = revenue − expenditure", eur(f_bal), eur(f_rev) - eur(f_exp), 0.02)
        f_liq = k("09990", "BAS", "Liquidity reserve of the Gesundheitsfonds at year end")
        # --- insurers (BUND column)
        i_rev = s("Einnahmen insgesamt", "BUND", "Revenue of all Krankenkassen, total")
        i_contrib = k("02999", "BUND", "Contributions collected directly by insurers (essentially the agricultural LKK, outside the fund)")
        i_other = k("03999", "BUND", "Other revenue of insurers (mostly allocations from the Gesundheitsfonds)")
        check(f"KJ1 {y}: insurer revenue = contributions + other", eur(i_rev), eur(i_contrib) + eur(i_other), 0.01)
        alloc_rows = [r for r in t.rows if r["year"] == y and r["row_or_table"].endswith("Spalte BUND") and re.match(r"Konto 03(730|76\d|7[7-9]\d)", r["row_or_table"])]
        i_from_fund = sum(r["value"] for r in alloc_rows)
        i_exp = s("Ausgaben insgesamt", "BUND", "Expenditure of all Krankenkassen, total")
        i_bal = k("09980", "BUND", "Balance of all Krankenkassen (revenue − expenditure)")
        check(f"KJ1 {y}: insurer balance = revenue − expenditure", eur(i_bal), eur(i_rev) - eur(i_exp), 0.02)
        i_leist = k("05999", "BUND", "Benefit expenditure of insurers (Kontenklasse 4/5)")
        i_kk6 = k("06999", "BUND", "Kontenklasse 6 of insurers (asset/other expenditure)")
        i_adm = k("07999", "BUND", "Net administration costs of insurers")
        check(f"KJ1 {y}: insurer expenditure = benefits (KK 4/5) + KK 6 + net admin", eur(i_exp), eur(i_leist) + eur(i_kk6) + eur(i_adm), 0.03)
        exp_items = [
            s("Summe Krankenhaus", "BUND", "Hospital treatment"),
            s("Summe Arzneimittel", "BUND", "Pharmaceuticals and dressings"),
            s("Summe ärztliche Behandlung", "BUND", "Physicians' services"),
            s("Summe Krankengeld", "BUND", "Sickness benefit (incl. contributions paid on it)"),
            s("Summe zahnärztliche Behandlung", "BUND", "Dental treatment"),
            s("Summe Zahnersatz", "BUND", "Dentures (fixed subsidies)"),
            s("Summe Heilmittel", "BUND", "Therapeutic services (Heilmittel)"),
            s("Summe Hilfsmittel", "BUND", "Medical aids (Hilfsmittel)"),
            s("Summe Fahrkosten", "BUND", "Transport costs"),
            s("Summe Vorsorge- und Rehaleistungen", "BUND", "Prevention and rehabilitation"),
            s("Summe Schwangerschaft und Mutterschaft", "BUND", "Pregnancy and maternity"),
            i_adm,
        ]
        listed = sum(map(eur, exp_items))
        exp_rest = eur(i_exp) - listed
        exp_items.append({"label": {"de": "Übrige Leistungs- und sonstige Ausgaben (Rest)", "en": "Other benefits and other expenditure (residual)"}, "value_eur": round(exp_rest, 2), "precision_eur": 0.01, "derived": "Ausgaben insgesamt (BUND) − listed items", "source": i_exp["source"]})
        assert 0 < exp_rest < 0.1 * eur(i_exp), f"KJ1 {y}: residual implausible {exp_rest}"
        kg_contrib = [k(kk, "BUND", KJ1_LABELS[kk]) for kk in ("04780", "04781", "04782")]
        aag = {kk: k(kk, "BUND", KJ1_LABELS[kk]) for kk in ("09400", "09410", "09420", "09430")}
        aag_block = {
            "label": {"de": "Umlagen U1/U2 nach dem Aufwendungsausgleichsgesetz (Sondervermögen der Krankenkassen)", "en": "Employer levies U1/U2 under the AAG (special funds of the insurers, outside GKV contributions)"},
            "levies_received_eur": round(eur(aag["09400"]) + eur(aag["09420"]), 2),
            "refunds_to_employers_eur": round(eur(aag["09410"]) + eur(aag["09430"]), 2),
            "components": list(aag.values()),
            "status": "not in GKV contributions (Konto 2999) and not in payroll_view",
            "note": "Employer-only levies that finance the refund of wage continuation during sickness (U1, small employers) and maternity (U2) to employers; they are booked in separate special funds (Konto 9400–9439), not in the insurers' contribution revenue, and are largely paid back to employers.",
        }
        reimb = {kk: k(kk, "BUND", KJ1_LABELS[kk]) for kk in ("07620", "07630", "07640", "07660")}
        # --- consolidated GKV (fund + insurers, fund→insurer flows eliminated)
        cons_rev = eur(f_rev) + eur(i_rev) - i_from_fund
        cons_exp = eur(f_exp) + eur(i_exp) - fund_to_insurers_fund_side
        elim_resid = i_from_fund - fund_to_insurers_fund_side
        health_years[str(y)] = {
            "status": "final",
            "status_source_wording": status_note,
            "levels_note": "The GKV has two books: the Gesundheitsfonds (column BAS) collects contributions and the federal grant and allocates them to the insurers; the insurers (column BUND, all Krankenkassen) pay the benefits. Adding the two revenue totals double counts the allocations. `consolidated` eliminates them.",
            "gesundheitsfonds": {
                "revenue_total": f_rev,
                "contributions_total": f_contrib,
                "other_revenue": {"total": f_other, "components": f_other_parts, "residual_eur": round(f_other_rest, 2)},
                "expenditure_total": f_exp,
                "expenditure_items": {"allocations_to_insurers": f_alloc, "einkommensausgleich_zusatzbeitrag_to_insurers": f_eink, "prevention_to_insurers": f_vors, "fund_shares_innovations_strukturfonds": f_funds, "other_rows": f_other6, "net_administration": f_adm},
                "paid_to_insurers_eur": round(fund_to_insurers_fund_side, 2),
                "balance": f_bal,
                "liquidity_reserve": f_liq,
            },
            "krankenkassen": {
                "revenue_total": i_rev,
                "contributions_collected_directly": i_contrib,
                "other_revenue_total": i_other,
                "received_from_fund_eur": round(i_from_fund, 2),
                "received_from_fund_rows": [{"konto": r["row_or_table"].split(",")[0], "item_de": r["item_de"], "item_en": KJ1_EN[r["row_or_table"].split(",")[0].split()[1]], "value_eur": r["value"], "page": r["page"]} for r in alloc_rows],
                "expenditure_total": i_exp,
                "benefit_expenditure_total": i_leist,
                "expenditure_items": exp_items,
                "contributions_paid_to_other_systems": {"label": {"de": "Beiträge aus Krankengeld (RV, ALV, PV)", "en": "Contributions paid on sickness benefit (pension, unemployment, care insurance)"}, "value_eur": round(sum(map(eur, kg_contrib)), 2), "components": kg_contrib, "note": "Inside 'Summe Krankengeld'. Not split by receiving system in KJ1; the DRV reports 'Krankenversicherung' contributions received separately (see pension)."},
                "administration_cost_reimbursements_received": reimb,
                "aag_employer_levies_special_funds": aag_block,
                "balance": i_bal,
                "reserve": k("09971", "BUND", "Reserve (Rücklage) of insurers at year end"),
            },
            "consolidated": {
                "revenue_total_eur": round(cons_rev, 2),
                "contributions_total": c_tot,
                "contributions_by_payer": by_payer,
                "federal_grants": {"value_eur": round(eur(g_221) + eur(g_lkk) + eur(g_lkk2), 2), "components": [g_221, g_lkk, g_lkk2], "note": "Bundeszuschuss § 221 SGB V (fund + LKK share) plus federal subsidies to the agricultural insurer. Pass-through federal funds (hospital energy costs, KHG/COVID reimbursements) are listed separately under federal_pass_through."},
                "federal_pass_through": [g_energy, g_khg],
                "expenditure_total_eur": round(cons_exp, 2),
                "balance_eur": round(eur(f_bal) + eur(i_bal), 2),
                "elimination_note": f"Revenue: fund {eur(f_rev):,.2f} + insurers {eur(i_rev):,.2f} − allocations booked by insurers {i_from_fund:,.2f} (Konto 3730, 3760–3762, 3770–3799, BUND). Expenditure: fund {eur(f_exp):,.2f} + insurers {eur(i_exp):,.2f} − payments to insurers booked by the fund {fund_to_insurers_fund_side:,.2f} (Konto 6730, 6760–6762, 6776–6789, BAS). The two sides differ by {elim_resid:,.2f} EUR (accrual timing between the two books), so consolidated revenue − expenditure differs from the sum of the two balances by that amount.",
                "elimination_residual_eur": round(elim_resid, 2),
            },
        }
        transfer(y, "bund", "gesundheitsfonds", g_221["gesundheitsfonds"], "grant", "Federal grant to the Gesundheitsfonds (§ 221 SGB V)")
        transfer(y, "bund", "lkk", g_221["krankenkassen"], "grant", "Federal participation § 221 SGB V, LKK share")
        transfer(y, "bund", "lkk", g_lkk, "grant", "Federal subsidies to the agricultural health insurance (§ 37(2) KVLG 1989)")
        transfer(y, "bund", "gesundheitsfonds", g_energy, "pass_through", "Federal funds for hospital energy-cost compensation (passed on to hospitals via the fund)")
        transfer(y, "bund", "gesundheitsfonds", g_khg, "reimbursement", "Federal reimbursements KHG / COVID-19 (negative = repayment)")
        transfer(y, "bund", "gesundheitsfonds", both("02013", "x"), "contribution_paid_by_public_body", "Health contributions for Bürgergeld recipients (general rate), paid from the federal budget (§ 251(4) SGB V)")
        transfer(y, "bund", "gesundheitsfonds", k("02902", "BAS"), "contribution_paid_by_public_body", "Health contributions for Bürgergeld recipients (Zusatzbeitrag)")
        transfer(y, "bundesagentur", "gesundheitsfonds", both("02011", "x"), "contribution_paid_by_public_body", "Health contributions for ALG I recipients (general rate), paid by the BA")
        transfer(y, "bundesagentur", "gesundheitsfonds", k("02901", "BAS"), "contribution_paid_by_public_body", "Health contributions for ALG I recipients (Zusatzbeitrag), paid by the BA")
        transfer(y, "pensioners_and_pension_insurers", "gesundheitsfonds", both("02020", "x"), "contribution_channel", "Health contributions on pensions (general rate); half borne by pensioners, half by the pension insurers", "Only the pension insurers' half is public money; the DRV's share is in the ledger as drv→gkv (KVdR).")
        transfer(y, "pensioners_and_pension_insurers", "gesundheitsfonds", k("02903", "BAS"), "contribution_channel", "Health contributions on pensions (Zusatzbeitrag)", "Half borne by pensioners, half by pension insurers.")
        transfer(y, "spv", "gkv", reimb["07630"], "admin_reimbursement", "Long-term care insurance reimburses the health insurers for administering it (part of SPV Verwaltungsausgaben)")
        transfer(y, "drv", "gkv", reimb["07620"], "admin_reimbursement", "Pension insurers reimburse health insurers' administration costs (contribution collection)")
        transfer(y, "bundesagentur", "gkv", reimb["07640"], "admin_reimbursement", "BA reimburses health insurers' administration costs")
        transfer(y, "bund", "gkv", reimb["07660"], "admin_reimbursement", "Federal reimbursements of insurers' administration costs")
        transfer(y, "gkv", "drv_ba_spv", {"label": {"de": "Beiträge aus Krankengeld (Konto 4780 + 4781 + 4782)", "en": "Contributions on sickness benefit (Konto 4780 + 4781 + 4782)"}, "value_eur": round(sum(map(eur, kg_contrib)), 2), "precision_eur": 0.01, "source": {**kg_contrib[0]["source"], "coordinates": "Konto 04780 + 04781 + 04782, Spalte BUND"}}, "contribution_paid_by_public_body", "Pension, unemployment and care contributions paid by health insurers on sickness benefit (paying side; receiving side split only for DRV)")

    health = {
        "id": "health",
        "label": {"de": "Gesetzliche Krankenversicherung (GKV): Gesundheitsfonds und Krankenkassen", "en": "Statutory health insurance (GKV): health fund and insurers"},
        "scope_note": "KJ1 endgültige Rechnungsergebnisse, EUR with cents. Column BAS = Gesundheitsfonds (administered by the Bundesamt für Soziale Sicherung), column BUND = all Krankenkassen incl. the agricultural LKK, which is outside the fund.",
        "years": health_years,
        "rates": {
            "general_contribution_rate_pct": {"value": 14.6, "source": {"ref": "sgb5_241"}, "text": "Der allgemeine Beitragssatz beträgt 14,6 Prozent der beitragspflichtigen Einnahmen der Mitglieder."},
            "average_zusatzbeitragssatz_pct": {"2024": None, "2025": None, "note": "Set yearly by the BMG in the Bundesanzeiger (§ 242a(2) SGB V); the announcements for 2024 (1.7 %) and 2025 (2.5 %) are not cached in this repo, so the values are not asserted here. The cached BMG page states 3.13 % as the average actually levied (Stand 1 April 2026).", "current": {"value": 3.13, "as_of": "2026-04-01", "source": {"ref": "bmg_gkv"}}},
            "split": {"text": "Den allgemeinen Beitrag und den Zusatzbeitrag tragen Arbeitgeber und Arbeitnehmer je zur Hälfte.", "source": {"ref": "bmg_gkv"}},
            "legal_basis": [{"label": "§ 241 SGB V", "source": {"ref": "sgb5_241"}}, {"label": "§ 242a SGB V", "source": {"ref": "sgb5_242a"}}],
            "income_threshold_eur": {"2026": {"jahresarbeitsentgeltgrenze_general": 77400, "jahresarbeitsentgeltgrenze_special": 69750, "source": {"ref": "svbezgrv_2026_2"}}, "2024": None, "2025": None, "note": "Only the 2026 ordinance section is cached."},
        },
    }

    # ------------------------------------------------------------------ long-term care (soziale Pflegeversicherung)
    ltc_years = {}
    for y in (2024, 2025):
        t = spv[y]
        c_emp = fig(t, "Beiträge für abhängig Beschäftigte", y, label_en="Contributions for employees")
        c_vol = fig(t, "Beiträge für freiwillig in der KV Versicherte", y, label_en="Contributions of voluntarily (health-)insured members (self-employed, high earners, etc.)")
        c_rent = fig(t, "Beiträge aus Renten", y, label_en="Contributions on pensions (borne fully by pensioners, withheld and forwarded by the pension insurers)")
        c_alg1 = fig(t, "Beiträge für versicherte ALG I-Empfänger", y, label_en="Contributions for ALG I recipients (paid by the BA)")
        c_alg2 = fig(t, "Beiträge für versicherte ALG II-Empfänger", y, label_en="Contributions for Bürgergeld (formerly ALG II) recipients (paid by the federal budget)")
        c_sonst = fig(t, "sonstige Beiträge", y, label_en="Other contributions")
        c_tot = fig(t, "Beitragseinnahmen", y, label_en="Contribution revenue, total")
        o_rev = fig(t, "Sonstige Einnahmen", y, label_en="Other revenue", note="Not itemised in the source. Any federal grant would sit here; in 2022–2023 the federal grant of 1 bn (§ 61a SGB XI, statute not cached) was inside this line.")
        r_tot = fig(t, "Einnahmen insgesamt", y, label_en="Revenue, total")
        tol = 0.01e9 * 6  # two decimals in Mrd EUR per part
        check(f"SPV {y}: contribution parts = Beitragseinnahmen", eur(c_tot), sum(map(eur, (c_emp, c_vol, c_rent, c_alg1, c_alg2, c_sonst))), tol)
        check(f"SPV {y}: revenue = contributions + other", eur(r_tot), eur(c_tot) + eur(o_rev), 0.02e9)
        items_de = [
            ("Geldleistung", "Care allowance (Pflegegeld)"), ("Pflegesachleistung", "Home-care services in kind"), ("Verhinderungspflege", "Respite care"),
            ("Tages-/Nachtpflege", "Day/night care"), ("Zusätzliche ambulante Betreuungs- und Entlastungsleistunge", "Additional outpatient support and relief services"),
            ("Kurzzeitpflege", "Short-term care"), ("Soziale Sicherung der Pflegepersonen", "Social security of family carers (pension, unemployment, accident contributions)"),
            ("Hilfsmittel/ Wohnumfeldverbesserung", "Aids and home adaptation"), ("Vollstationäre Pflege", "Residential care"),
            ("Vollstationäre Pflege in Behindertenheimen", "Residential care in homes for the disabled"), ("Stationäre Vergütungszuschläge", "Residential remuneration supplements"),
            ("Vergütungszuschläge für zusätzl. Personal in vollst. Einrichtun", "Supplements for additional staff in residential facilities"),
            ("Vollstationäre Eigenanteilsbegrenzung", "Caps on residents' co-payments (Leistungszuschläge)"), ("Pflegeberatung", "Care counselling"), ("Sonstige Leistungsausgaben", "Other benefit expenditure"),
        ]
        leist_items = [fig(t, de, y, label_en=en) for de, en in items_de]
        leist_tot = fig(t, "Leistungsausgaben", y, label_en="Benefit expenditure, total")
        check(f"SPV {y}: benefit items = Leistungsausgaben", eur(leist_tot), sum(map(eur, leist_items)), 0.01e9 * len(leist_items))
        e_md = fig(t, "Hälfte der Kosten des Medizinischen Dienstes", y, label_en="Half of the Medical Service's costs")
        e_adm = fig(t, "Verwaltungsausgaben", y, label_en="Administration expenditure (largely reimbursed to the health insurers that run the care funds)")
        e_fonds = fig(t, "Zuführung zum Pflegevorsorgefonds", y, label_en="Transfer to the care provision fund (Pflegevorsorgefonds)")
        e_sonst = fig(t, "Sonstige Ausgaben", y, label_en="Other expenditure")
        e_tot = fig(t, "Ausgaben insgesamt", y, label_en="Expenditure, total")
        check(f"SPV {y}: expenditure parts = Ausgaben insgesamt", eur(e_tot), sum(map(eur, (leist_tot, e_md, e_adm, e_fonds, e_sonst))), 0.01e9 * 5)
        surplus = t.val("Überschuss der Einnahmen", y)
        deficit = t.val("Überschuss der Ausgaben", y)
        balance = (surplus or 0.0) - (deficit or 0.0)
        check(f"SPV {y}: balance line = revenue − expenditure", balance * 1e9, eur(r_tot) - eur(e_tot), 0.02e9)
        reserve = fig(t, "Mittelbestand am Jahresende", y, label_en="Funds at year end (Mittelbestand)")
        vorsorge = fig(t, "Nachrichtlich: Mittelbestand Pflegevorsorgefonds", y, label_en="Care provision fund balance (memo item)")
        loan = fig(t, "Darlehen des Bundes", y, label_en="Federal loan (positive = received, negative = repaid)") if t.has("Darlehen des Bundes", y) else None
        ltc_years[str(y)] = {
            "status": "final",
            "status_source_wording": "Ist-Ergebnisse ohne Rechnungsabgrenzung",
            "revenue_total": r_tot,
            "contributions_total": c_tot,
            "contributions_by_payer": {
                "payroll_employee_employer_combined": {"value_eur": c_emp["value_eur"], "components": [c_emp], "caveat": "Employer and employee halves not separated (Saxony has a different split; childless surcharge is employee-only)."},
                "self_employed_voluntary": {"value_eur": c_vol["value_eur"], "components": [c_vol]},
                "federal_budget": {"value_eur": c_alg2["value_eur"], "components": [c_alg2]},
                "bundesagentur": {"value_eur": c_alg1["value_eur"], "components": [c_alg1]},
                "pension_insurance_for_pensioners": {"value_eur": c_rent["value_eur"], "components": [c_rent], "caveat": "Borne fully by the pensioners (withheld from the pension by the pension insurer); not pension-insurer money."},
                "other_public": {"value_eur": 0.0, "components": [], "note": "not separately shown"},
                "members_other": {"value_eur": c_sonst["value_eur"], "components": [c_sonst]},
            },
            "federal_grants": {"value_eur": None, "components": [], "note": "The table has no federal-grant line. 'Sonstige Einnahmen' is not itemised and bounds any grant from above (see other_revenue). The only federal line is 'Darlehen des Bundes' (loan), shown in the 2025 edition: 2024 nil ('---'), 2025 +0.50 bn — a repayable loan, not a grant."},
            "federal_loan": loan,
            "other_revenue": [o_rev],
            "expenditure_total": e_tot,
            "expenditure_items": leist_items + [e_md, e_adm, e_fonds, e_sonst],
            "benefit_expenditure_total": leist_tot,
            "balance_eur": round(balance * 1e9, 2),
            "reserve": reserve,
            "care_provision_fund": vorsorge,
        }
        transfer(y, "bund", "spv", c_alg2, "contribution_paid_by_public_body", "Care contributions for Bürgergeld recipients, paid from the federal budget")
        transfer(y, "bundesagentur", "spv", c_alg1, "contribution_paid_by_public_body", "Care contributions for ALG I recipients, paid by the BA")
        transfer(y, "pensioners_via_drv", "spv", c_rent, "contribution_channel", "Care contributions on pensions, withheld and forwarded by the pension insurers (borne fully by pensioners)")
        transfer(y, "spv", "drv_ba_uv", fig(t, "Soziale Sicherung der Pflegepersonen", y, label_en="Social security of family carers"), "contribution_paid_by_public_body", "Pension (and unemployment/accident) contributions paid by the care insurance for family carers (paying side)")
        if loan and loan["value_eur"]:
            transfer(y, "bund", "spv", loan, "loan", "Federal loan to the long-term care insurance (repayable)")
    # the 2025 edition repeats 2024: cross-check that the two editions agree
    for item in ("Beitragseinnahmen", "Einnahmen insgesamt", "Ausgaben insgesamt", "Leistungsausgaben", "Mittelbestand am Jahresende"):
        check(f"SPV: 2024 value identical in 2024 and 2025 editions ({item})", spv[2024].val(item, 2024), spv[2025].val(item, 2024), 0.0)
    ltc = {
        "id": "ltc",
        "label": {"de": "Soziale Pflegeversicherung", "en": "Social long-term care insurance"},
        "scope_note": "BMG 'Finanzentwicklung der sozialen Pflegeversicherung', Ist-Ergebnisse ohne Rechnungsabgrenzung, Mrd EUR with two decimals (precision_eur = 1e7). 2025 figures from the 2025 edition.",
        "years": ltc_years,
        "rates": {
            "contribution_rate_pct": {"statute_text_value": 3.4, "source": {"ref": "sgb11_55"}, "note": "§ 55(1) SGB XI as cached: 3.4 % (in force from 1 July 2023). From 1 January 2025 the rate was raised by 0.2 points by Rechtsverordnung under § 55(1a) (ordinance not cached; therefore the 2025 rate is not asserted here)."},
            "childless_surcharge_pct": {"value": 0.6, "source": {"ref": "sgb11_55"}, "text": "Beitragszuschlag für Kinderlose, 0,6 Beitragssatzpunkte (§ 55(3))"},
            "per_child_abatement_pct": {"value": 0.25, "source": {"ref": "sgb11_55"}, "text": "Abschlag von 0,25 Beitragssatzpunkten je Kind ab dem zweiten bis zum fünften Kind (§ 55(3))"},
            "split": {"text": "Employer and employee halves (§ 58 SGB XI, not cached); the childless surcharge is borne by the employee; Saxony: employees bear a larger share.", "evidence": "not cached"},
            "legal_basis": {"label": "§ 55 SGB XI", "source": {"ref": "sgb11_55"}},
        },
    }

    # ------------------------------------------------------------------ unemployment (Bundesagentur für Arbeit, SGB III)
    ue_years = {}
    for y in (2024, 2025):
        t = ba[y]
        tbl = f"Spalte 'Ist seit Jahresbeginn {y}'"
        c_tot = fig(t, "Beitragseinnahmen", y, label_en="Contribution revenue")
        r_sgb2 = fig(t, "Verwaltungskostenerstattungen SGB II (Bund)", y, label_en="Federal reimbursement of administration costs for SGB II (Bürgergeld) services")
        r_erst = fig(t, "Erstattungen und Verwaltungseinnahmen", y, label_en="Other reimbursements and administrative revenue (Familienleistungsausgleich, Ausgleichsabgabe)")
        r_insu = fig(t, "Einnahmen aus der Insolvenzgeldumlage", y, label_en="Insolvency-benefit levy (employer-only)")
        r_wint = fig(t, "Einnahmen aus der Winterbeschäftigungsumlage", y, label_en="Winter-employment levy (employer-only, construction)")
        r_tot = fig(t, "Einnahmen", y, coord="Fließtext", label_en="Revenue, total")
        r_tot_tbl = fig(t, "Einnahmen", y, coord=tbl, label_en="Revenue, total (FEBA table)")
        check(f"BA {y}: revenue parts (narrative) = Einnahmen", eur(r_tot), sum(map(eur, (c_tot, r_sgb2, r_erst, r_insu, r_wint))), 0.005e9 * 5)
        check(f"BA {y}: narrative revenue = table revenue", eur(r_tot), -eur(r_tot_tbl), 0.005e9)
        e_tot = fig(t, "Ausgaben", y, coord=tbl, label_en="Expenditure, total")
        check(f"BA {y}: narrative expenditure = table expenditure", eur(fig(t, "Ausgaben", y, coord="Fließtext")), eur(e_tot), 0.005e9)
        e_aktiv = fig(t, "Aktive Arbeitsförderung", y, coord=tbl, label_en="Active labour-market policy (chapters 2 and 3)")
        e_kap2 = fig(t, "Kapitel 2 - Eingliederungstitel", y, coord=tbl, label_en="Chapter 2: integration budget (SGB III, not SGB II)")
        e_kap3 = fig(t, "Kapitel 3", y, coord=tbl, label_en="Chapter 3: other active benefits (training, rehabilitation, short-time work)")
        e_kap4 = fig(t, "Kapitel 4", y, coord=tbl, label_en="Chapter 4: wage-replacement benefits")
        e_alg = fig(t, "Arbeitslosengeld (Alg I)", y, coord=tbl, label_en="Unemployment benefit I (incl. the social contributions the BA pays for recipients)")
        e_ausl = fig(t, "Erstattung an ausländische Versicherungsträger", y, coord=tbl, label_en="Reimbursements to foreign insurers")
        e_rvpv = fig(t, "Erst. an Renten- und Pflegeversicherung", y, coord=tbl, label_en="Reimbursements to pension and care insurance")
        e_insg = fig(t, "Insolvenzgeld", y, coord=tbl, label_en="Insolvency benefit")
        e_verw = fig(t, "Verwaltungsausgaben (Kapitel 5 und 6)", y, coord=tbl, label_en="Staff and administration (chapters 5 and 6, incl. SGB II services reimbursed by the Bund)")
        e_kug = fig(t, "Leistungen bei konjunkturellem Kurzarbeitergeld" if y == 2024 else "Konjunkturelles Kurzarbeitergeld", y, coord=tbl, label_en="Cyclical short-time work benefit")
        e_fbw = fig(t, "Förderung der beruflichen Weiterbildung (FbW)", y, coord=tbl, label_en="Further vocational training")
        e_reha = fig(t, "Teilhabe behinderter Menschen am Arbeitsleben", y, coord=tbl, label_en="Participation of disabled people in working life")
        kap4_parts = [e_rvpv, e_alg, e_ausl, e_insg]
        if t.has("Aufwendungsersatz Übergang FbW/Reha an den Bund", y, tbl):
            kap4_parts.append(fig(t, "Aufwendungsersatz Übergang FbW/Reha an den Bund", y, coord=tbl, label_en="Expense reimbursement to the Bund (transition FbW/rehabilitation)"))
        check(f"BA {y}: chapter 4 parts = Kapitel 4", eur(e_kap4), sum(map(eur, kap4_parts)), 0.05e6 * len(kap4_parts))
        check(f"BA {y}: Kapitel 2 + 3 = aktive Arbeitsförderung", eur(e_aktiv), eur(e_kap2) + eur(e_kap3), 0.1e6)
        check(f"BA {y}: aktive + Kapitel 4 + Verwaltung = Ausgaben", eur(e_tot), eur(e_aktiv) + eur(e_kap4) + eur(e_verw), 0.15e6)
        saldo = fig(t, "Finanzierungssaldo (Überschuss (-) / Defizit (+)", y, coord=tbl, label_en="Financing balance (surplus negative / deficit positive)")
        check(f"BA {y}: table balance = expenditure − revenue", eur(saldo), eur(e_tot) + eur(r_tot_tbl), 0.1e6)
        if y == 2025:
            # the 2025 table repeats 2024 in its 'Vorjahr' column
            for item, en in (("Einnahmen", ""), ("Ausgaben", ""), ("Arbeitslosengeld (Alg I)", ""), ("Insolvenzgeld", "")):
                check(f"BA: 2024 value identical in 2024 table and 2025 'Vorjahr' column ({item})", ba[2024].val(item, 2024, "Ist seit Jahresbeginn 2024"), t.val(item, 2024, "Vorjahr (2024)"), 0.0)
        ue_years[str(y)] = {
            "status": "final",
            "status_source_wording": "Ist (Bericht über das Geschäftsjahr)",
            "revenue_total": r_tot,
            "contributions_total": c_tot,
            "contributions_by_payer": {
                "payroll_employee_employer_combined": {"value_eur": c_tot["value_eur"], "components": [c_tot], "caveat": "The BA report gives one contribution line. It includes the unemployment contributions that other bodies pay for benefit recipients (health insurers for sickness-benefit recipients, care insurance for carers) and for compulsorily insured non-employees; the report does not separate them."},
                "employer_levies": {"value_eur": round(eur(r_insu) + eur(r_wint), 2), "components": [r_insu, r_wint], "note": "Umlagen (Insolvenzgeld, Winterbeschäftigung) are employer-only levies earmarked for those benefits; they are outside 'Beitragseinnahmen' in the source."},
                "federal_budget": {"value_eur": 0.0, "components": [], "note": "No federal contributions for benefit recipients to the BA (Bürgergeld is SGB II, financed by the Bund outside the BA's contribution budget)."},
            },
            "federal_grants": {"value_eur": 0.0, "components": [], "derivation": f"The report enumerates all revenue items (Beiträge {eur(c_tot) / 1e9:.2f}, SGB II admin reimbursement {eur(r_sgb2) / 1e9:.2f}, other reimbursements {eur(r_erst) / 1e9:.2f}, Insolvenzgeldumlage {eur(r_insu) / 1e9:.2f}, Winterbeschäftigungsumlage {eur(r_wint) / 1e9:.2f}); they sum to the published total within rounding, and none is a federal grant (Zuschuss). Federal money reaching the BA is the SGB II administration-cost reimbursement (payment for services) and, in 2025, a repayable liquidity loan.", "source_pages": "narrative pp. 3–4 (2024) / pp. 1–2 (2025)"},
            "federal_reimbursement_sgb2": r_sgb2,
            "federal_loan": fig(t, "Liquiditätshilfe des Bundes (Darlehen)", 2025, label_en="Federal liquidity loan (repayable)") if y == 2025 else None,
            "other_revenue": [r_sgb2, r_erst, r_insu, r_wint],
            "expenditure_total": e_tot,
            "expenditure_items": [e_alg, e_aktiv, e_verw, e_insg, e_rvpv, e_ausl] + ([fig(t, "Aufwendungsersatz Übergang FbW/Reha an den Bund", y, coord=tbl, label_en="Expense reimbursement to the Bund (transition FbW/rehabilitation)")] if y == 2025 else []),
            "expenditure_detail": {"chapter_2_integration": e_kap2, "chapter_3_other_active": e_kap3, "chapter_4_wage_replacement": e_kap4, "short_time_work_cyclical": e_kug, "further_training": e_fbw, "rehabilitation": e_reha},
            "balance_eur": round(-eur(saldo), 2),
            "balance_note": "Negative = deficit. The report's Finanzierungssaldo is shown with the opposite sign (deficit positive).",
            "reserve": {"2024": {"label": {"de": "Zuführung zur Rücklage (saldiert)", "en": "Net addition to the reserve"}, "value_eur": fig(t, "Zuführung zur Rücklage der BA (einschl. Eingliederungsrücklage), saldiert", 2024)["value_eur"], "source": {"ref": "ba_2024", "page": 3, "coordinates": "Fließtext"}} if y == 2024 else {"label": {"de": "Auflösung der Rücklage (vollständig)", "en": "Reserve fully dissolved"}, "value_eur": -fig(t, "Auflösung der Rücklage (einschl. Eingliederungsrücklage)", 2025)["value_eur"], "source": {"ref": "ba_2025", "page": 1, "coordinates": "Fließtext"}, "note": "Remaining reserve of 3.18 bn fully used in 2025; stock at year end is therefore 0 apart from the levy-financed reserves (not quantified in the report)."}, "note": "The reports give the flow into/out of the reserve, not the stock."},
        }
        transfer(y, "bund", "bundesagentur", r_sgb2, "reimbursement", "Federal reimbursement of BA administration costs for SGB II (Bürgergeld) tasks — payment for services, not a grant")
        transfer(y, "bundesagentur", "drv_spv", e_rvpv, "reimbursement", "BA reimbursements to pension and care insurance (chapter 4)")
        if y == 2025:
            transfer(2025, "bund", "bundesagentur", ue_years["2025"]["federal_loan"], "loan", "Federal liquidity loan to the BA (repayable)")
            transfer(2025, "bundesagentur", "bund", fig(t, "Aufwendungsersatz Übergang FbW/Reha an den Bund", 2025, coord=tbl, label_en="Expense reimbursement to the Bund"), "reimbursement", "BA expense reimbursement to the Bund (transition FbW/rehabilitation)")
    unemployment = {
        "id": "unemployment",
        "label": {"de": "Arbeitslosenversicherung (Bundesagentur für Arbeit, SGB III)", "en": "Unemployment insurance (Federal Employment Agency, SGB III)"},
        "scope_note": "BA 'Finanzentwicklung in der Arbeitslosenversicherung' (Beitragshaushalt SGB III). Narrative figures in Mrd EUR with two decimals (precision 1e7), FEBA table in Mio EUR with one decimal (precision 1e5). SGB II (Bürgergeld) is federal and not in this account; the BA only administers it against reimbursement.",
        "years": ue_years,
        "rates": {
            "contribution_rate_pct": {"value": 2.6, "source": {"ref": "sgb3_341"}, "text": "Der Beitragssatz beträgt 2,6 Prozent. (§ 341(2) SGB III)", "years": ["2024", "2025", "2026"], "note": "Statute text as cached (current version); the rate has been 2.6 % since 1 January 2023."},
            "split": {"text": "Employee and employer each pay half (§ 346 SGB III, not cached).", "evidence": "not cached"},
            "ceiling": {"text": "Beitragsbemessungsgrenze ist die Beitragsbemessungsgrenze der allgemeinen Rentenversicherung (§ 341(4) SGB III).", "source": {"ref": "sgb3_341"}},
            "legal_basis": {"label": "§ 341 SGB III", "source": {"ref": "sgb3_341"}},
        },
    }

    # ------------------------------------------------------------------ payroll view and cross-system payer table
    payroll_view = {}
    all_payers = {}
    for y in (2024, 2025):
        ys = str(y)
        p = pension_years[ys]
        h = health_years[ys]["consolidated"]["contributions_by_payer"]
        c = ltc_years[ys]["contributions_by_payer"]
        u = ue_years[ys]["contributions_by_payer"]
        comps = [
            {"system": "pension", **p["contributions_by_payer"]["payroll_employee_employer_combined"]["components"][0], "caveat": p["contributions_by_payer"]["payroll_employee_employer_combined"]["caveat"]},
            {"system": "health", "label": h["payroll_employee_employer_combined"]["label"], "value_eur": h["payroll_employee_employer_combined"]["value_eur"], "components": h["payroll_employee_employer_combined"]["components"], "caveat": "Excludes voluntarily insured employees above the income threshold (their contributions and employer subsidies sit in 'members_other', Konto 2600/9210, not separable)."},
            {"system": "ltc", **c["payroll_employee_employer_combined"]["components"][0], "caveat": "Excludes voluntarily (health-)insured employees, see health."},
            {"system": "unemployment", **u["payroll_employee_employer_combined"]["components"][0], "caveat": u["payroll_employee_employer_combined"]["caveat"]},
        ]
        levies = u["employer_levies"]
        total = round(sum(x["value_eur"] for x in comps), 2)
        payroll_view[ys] = {
            "label": {"de": "Beiträge der versicherungspflichtig Beschäftigten (Arbeitnehmer- und Arbeitgeberanteil), vier Systeme", "en": "Contributions of compulsorily insured employees (employee + employer share), four systems"},
            "total_eur": total,
            "precision_eur": 1e8,
            "scope": {
                "is": "Proxy for payroll money: the contribution lines each system publishes for compulsorily insured employment, employee and employer shares combined.",
                "excludes": [
                    {"what": "GKV and SPV: employees above the Versicherungspflichtgrenze (voluntarily insured) — own share and employer subsidy (§ 257 SGB V)", "where": "GKV Konto 9210 (fund) and SPV 'Beiträge für freiwillig in der KV Versicherte', both mixed with the self-employed", "effect": "total understated"},
                ],
                "includes_although_not_payroll": [
                    {"what": "DRV: compulsorily insured self-employed and other directly paid compulsory contributions", "where": "'Pflichtbeiträge aus Erwerbstätigkeit', footnote 1", "effect": "total overstated"},
                    {"what": "BA: unemployment contributions paid by GKV (sickness benefit) and SPV (carers) for benefit recipients", "where": "'Beitragseinnahmen' is a single line", "effect": "total overstated"},
                    {"what": "GKV and DRV: employer-only flat-rate contributions on mini-jobs (GKV Konto 2700/2702)", "where": "", "effect": "employer money, kept"},
                ],
                "net_direction": "unknown; the GKV/SPV omission is probably the larger term",
            },
            "components": comps,
            "employer_only_levies_not_in_total": {"ba_umlagen": levies, "aag_u1_u2_krankenkassen": health_years[ys]["krankenkassen"]["aag_employer_levies_special_funds"]},
            "excluded_from_total": [
                {"what": "GKV voluntary members, company pensions, students, catch-all (Konto 2600 + 2907)", "value_eur": h["members_other"]["value_eur"], "why": "paid by members themselves (self-employed, pensioners with company pensions, voluntarily insured employees incl. their employer subsidy — the employee part cannot be separated)"},
                {"what": "GKV contributions on pensions (Konto 2020 + 2903 + 2022 + 2026)", "value_eur": h["pension_insurance_for_pensioners"]["value_eur"], "why": "half withheld from pensions, half paid by pension insurers"},
                {"what": "GKV contributions paid by the Bund (Bürgergeld, Wehrdienst)", "value_eur": h["federal_budget"]["value_eur"], "why": "federal budget"},
                {"what": "GKV contributions paid by the BA (ALG I)", "value_eur": h["bundesagentur"]["value_eur"], "why": "BA (itself financed by unemployment contributions — would double count)"},
                {"what": "GKV other public / KSK / adjustments", "value_eur": round(h["other_public"]["value_eur"] + h["kuenstlersozialkasse_mixed"]["value_eur"] + h["adjustments_and_surcharges"]["value_eur"], 2), "why": "mixed or public payers"},
                {"what": "DRV: child-raising periods (Bund), BA, health insurers, care insurance, voluntary", "value_eur": round(p["contributions_by_payer"]["federal_budget"]["value_eur"] + p["contributions_by_payer"]["bundesagentur"]["value_eur"] + p["contributions_by_payer"]["other_public"]["value_eur"] + p["contributions_by_payer"]["self_employed_voluntary"]["value_eur"], 2), "why": "public bodies or voluntary payers"},
                {"what": "SPV: voluntary members, pensions, ALG I (BA), Bürgergeld (Bund), other", "value_eur": round(c["self_employed_voluntary"]["value_eur"] + c["pension_insurance_for_pensioners"]["value_eur"] + c["bundesagentur"]["value_eur"] + c["federal_budget"]["value_eur"] + c["members_other"]["value_eur"], 2), "why": "members themselves, pensioners, public bodies"},
            ],
            "not_separable_note": "Still inside the total although not payroll: (1) DRV 'Pflichtbeiträge aus Erwerbstätigkeit' contain compulsorily insured self-employed (craftsmen, artists via KSK, carers' contributions are not here) and other directly paid compulsory contributions; (2) BA 'Beitragseinnahmen' contain contributions paid by other bodies for benefit recipients; (3) GKV Konto 2000/2900 contain contributions for compulsorily insured non-employees only marginally. Missing from the total although payroll: employer subsidies and own contributions of voluntarily insured employees above the threshold (GKV Konto 9210, SPV 'freiwillig in der KV Versicherte'), not separable from the self-employed. The old file's 'payroll deductions' of 706 bn (2024) summed all contributions of all payers across the four systems.",
        }
        # cross-system payer table (not netted; inter-system components flagged)
        rows = {
            "payroll_employee_employer_combined": [("pension", comps[0]["value_eur"]), ("health", comps[1]["value_eur"]), ("ltc", comps[2]["value_eur"]), ("unemployment", comps[3]["value_eur"])],
            "employer_only_levies": [("unemployment", levies["value_eur"])],
            "members_self_employed_voluntary_other": [("pension", p["contributions_by_payer"]["self_employed_voluntary"]["value_eur"]), ("health", round(h["members_other"]["value_eur"] + h["kuenstlersozialkasse_mixed"]["value_eur"] + h["adjustments_and_surcharges"]["value_eur"], 2)), ("ltc", round(c["self_employed_voluntary"]["value_eur"] + c["members_other"]["value_eur"], 2))],
            "pensioners_own_share_and_pension_insurers": [("health", h["pension_insurance_for_pensioners"]["value_eur"]), ("ltc", c["pension_insurance_for_pensioners"]["value_eur"])],
            "federal_budget": [("pension", p["contributions_by_payer"]["federal_budget"]["value_eur"]), ("health", h["federal_budget"]["value_eur"]), ("ltc", c["federal_budget"]["value_eur"])],
            "bundesagentur_for_benefit_recipients": [("pension", p["contributions_by_payer"]["bundesagentur"]["value_eur"]), ("health", h["bundesagentur"]["value_eur"]), ("ltc", c["bundesagentur"]["value_eur"])],
            "health_and_care_insurance_for_benefit_recipients": [("pension", p["contributions_by_payer"]["other_public"]["value_eur"]), ("health", h["other_public"]["value_eur"])],
        }
        PREC = 1e8  # coarsest input: DRV lines are printed in Mrd EUR with one decimal
        all_payers[ys] = {k_: {"by_system": dict(v), "total_eur": round(sum(x for _, x in v), 2), "precision_eur": PREC} for k_, v in rows.items()}
        sys_sum = eur(p["contributions_total"]) + health_years[ys]["consolidated"]["contributions_total"]["value_eur"] + eur(ltc_years[ys]["contributions_total"]) + eur(ue_years[ys]["contributions_total"])
        inter = all_payers[ys]["bundesagentur_for_benefit_recipients"]["total_eur"] + all_payers[ys]["health_and_care_insurance_for_benefit_recipients"]["total_eur"] + eur(pension_years[ys]["expenditure_items"][1])
        check(f"payer table {y}: rows = sum of system contribution totals", sys_sum, sum(v["total_eur"] for k_, v in all_payers[ys].items() if isinstance(v, dict) and "total_eur" in v) - levies["value_eur"], 0.2e9)
        all_payers[ys]["precision_eur"] = PREC
        all_payers[ys]["sum_of_system_contribution_totals_eur"] = round(sys_sum / PREC) * PREC
        all_payers[ys]["inter_system_double_count_eur"] = {"value_eur": round(inter / PREC) * PREC, "bound": "lower", "label": {"de": "Mindestens so viel zahlt eines der vier Systeme an ein anderes", "en": "At least this much is paid by one of the four systems to another"}, "components": ["BA → DRV/GKV/SPV contributions for ALG I recipients", "GKV → DRV and SPV → DRV contributions for sickness-benefit recipients and carers (receiving side, DRV)", "DRV KVdR line → GKV (itself an upper bound, see pension expenditure note)"], "not_included": ["GKV → BA and GKV → SPV contributions on sickness benefit (inside the 3.56 bn paying side, not split)", "SPV → BA for carers (inside 'Soziale Sicherung der Pflegepersonen', not split)", "administration-cost reimbursements between systems (in the ledger)"]}
        all_payers[ys]["note"] = "Rows are the four systems' contribution revenue regrouped by who pays; the row sums equal the sum of the four systems' contribution totals (checked, tolerance 0.2 bn). Totals are rounded to 0.1 bn because the DRV inputs carry one decimal in Mrd EUR. 'inter_system_double_count_eur' is a lower bound for the contributions one of the four systems pays to another: that money is expenditure of the paying system and revenue of the receiving one, so a naive sum of the four systems' contributions counts it twice."

    sources = {ref: source_ref(sid, file, "see per-figure coordinates") for ref, (sid, file) in FILES.items()}
    for ref in sources:
        sources[ref].pop("coordinates", None)
    payload = envelope(
        "de.social_insurance.accounts",
        "Sozialversicherung: Rechnungsergebnisse 2024 und 2025 nach Zahlern, mit Transferbuch",
        "Social insurance: accounts 2024 and 2025 by payer, with transfer ledger",
        "EUR",
        "Annual accounts of the four statutory systems as published by DRV (Mrd, 1 decimal), BMG KJ1 (EUR, cents), BMG SPV table (Mrd, 2 decimals), BA (Mrd 2 decimals / Mio 1 decimal). Each figure carries precision_eur = the source's rounding unit. Systems are not summed except in payroll_view and contributions_by_payer_all_systems.",
        SCRIPT,
        years=["2024", "2025"],
        year_status={"2024": {"pension": "final (endgültig)", "health": "final (endgültig)", "ltc": "final (Ist)", "unemployment": "final (Ist)"}, "2025": {"pension": "provisional (vorläufig)", "health": "final (endgültig)", "ltc": "final (Ist)", "unemployment": "final (Ist)"}},
        sources=sources,
        systems={"pension": pension, "health": health, "ltc": ltc, "unemployment": unemployment},
        transfers=transfers,
        payroll_view=payroll_view,
        contributions_by_payer_all_systems=all_payers,
        checks=CHECKS,
    )
    write_json(OUT, payload)
    print(f"{len(CHECKS)} checks passed; {len(transfers)} transfers; payroll view 2024 = {payroll_view['2024']['total_eur'] / 1e9:.1f} bn, 2025 = {payroll_view['2025']['total_eur'] / 1e9:.1f} bn")


if __name__ == "__main__":
    if "--extract" in sys.argv:
        extract_all()
    build()
