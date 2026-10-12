#!/usr/bin/env python3
"""BMF Abrechnung des Finanzausgleichs (Anlage 1) + BMF Monatsbericht (BEZ tables) → data/de/equalisation/

Outputs
- research/extracts/bmf_abrechnung_finanzausgleich/anlage1-<year>.csv   every row of Anlage 1 × 16 Länder + Insgesamt
- research/extracts/bmf_monatsbericht/bez-<year>.csv                    Monatsbericht Tabellen 1–3 per Land (Mio EUR / %)
- data/de/equalisation/<year>.json                                       per Land: population, tax bases, VAT share, FKA, BEZ
- data/de/equalisation/laender-meta.json                                 code, name, city-state flag

Extraction runs from the cached PDF/HTML when present (research/cache is git-ignored); otherwise the
committed extracts are read back. Run with `python -I`; the cached files are treated purely as data.
"""
from __future__ import annotations

import csv
import html
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import DATA, EXTRACTS, LAND_NAMES, ROOT, envelope, raw_path, source_ref, write_csv, write_json  # noqa: E402

SCRIPT = "scripts/research/build_equalisation.py"
SRC_PDF = "bmf_abrechnung_finanzausgleich"
SRC_MB = "bmf_monatsbericht"
YEARS = (2024, 2025)
PDF_FILE = {2024: "abrechnung-ausgleichsjahr-2024.pdf", 2025: "abrechnung-ausgleichsjahr-2025.pdf"}
MB_FILE = {2024: "2025-04-bundesstaatlicher-finanzausgleich-2024.html", 2025: "2026-04-bundesstaatlicher-finanzausgleich-2025.html"}
# column order as printed in Anlage 1 and in the Monatsbericht tables
COLS = ["NW", "BY", "BW", "NI", "HE", "SN", "RP", "ST", "SH", "TH", "BB", "MV", "SL", "BE", "HH", "HB"]
OUT_ORDER = ["BW", "BY", "BE", "BB", "HB", "HH", "HE", "MV", "NI", "NW", "RP", "SL", "SN", "ST", "SH", "TH"]
CITY_STATES = {"BE", "HH", "HB"}
EN_NAMES = {"BY": "Bavaria", "NW": "North Rhine-Westphalia", "NI": "Lower Saxony", "HE": "Hesse", "RP": "Rhineland-Palatinate",
            "SN": "Saxony", "ST": "Saxony-Anhalt", "TH": "Thuringia", "MV": "Mecklenburg-Western Pomerania"}

ANLAGE_HEADER = ["year", "page", "row", "parent", "label", "kind", "unit", *COLS, "Insgesamt", "insgesamt_sign", "n_values", "coordinates", "source_file", "extraction_script"]
BEZ_HEADER = ["year", "table", "caption", "row_label", "land", "value", "raw", "unit", "coordinates", "source_file", "extraction_script"]

NUM_RE = re.compile(r"^-?\d{1,3}(?:\.\d{3})*(?:,\d+)?$|^-?\d+(?:,\d+)?$")
ROWNO_RE = re.compile(r"^(\d+[a-z]?)\.(?:(\d+)\.)?$")
FN4_RE = re.compile(r"Gesamtaufkommen der Umsatzsteuer ([\d.]+,\d+) Euro, davon: von den Ländern vereinnahmte Umsatzsteuer ([\d.]+,\d+) Euro; Einfuhrumsatzsteuer ([\d.]+,\d+) Euro")


def de_num(s: str) -> float:
    return float(s.replace(".", "").replace(",", "."))


def fmt(v: float | None) -> str:
    if v is None:
        return ""
    return str(int(v)) if float(v).is_integer() else repr(v)


# ----------------------------------------------------------------------------------------------
# Anlage 1 (PDF)
# ----------------------------------------------------------------------------------------------

def _lines(page, tol: float = 2.5):
    words = page.extract_words(x_tolerance=1.5, y_tolerance=2)
    words.sort(key=lambda w: (w["top"], w["x0"]))
    lines, cur, cur_top = [], [], None
    for w in words:
        if cur_top is None or w["top"] - cur_top > tol:
            if cur:
                lines.append(sorted(cur, key=lambda x: x["x0"]))
            cur, cur_top = [w], w["top"]
        else:
            cur.append(w)
    if cur:
        lines.append(sorted(cur, key=lambda x: x["x0"]))
    return lines


def _unit_for(row: str, label: str, memo_unit: str | None) -> str:
    if row == "1":
        return "persons"
    if memo_unit:
        return memo_unit
    if "v.H.-Punkten" in label:
        return "percentage points"
    if "in v.H." in label:
        return "percent"
    if "je Einwohner in Euro" in label:
        return "EUR per resident"
    return "EUR thousand"


def extract_anlage1(year: int) -> list[list]:
    import pdfplumber  # noqa: PLC0415

    pdf_path = raw_path(SRC_PDF, PDF_FILE[year])
    rows: list[dict] = []
    anchors: list[float] | None = None
    footnotes: dict[str, str] = {}
    with pdfplumber.open(pdf_path) as pdf:
        for pno, page in enumerate(pdf.pages, start=1):
            text = page.extract_text() or ""
            m = FN4_RE.search(text.replace("\n", " "))
            if m:
                footnotes["Gesamtaufkommen der Umsatzsteuer"] = m.group(1)
                footnotes["davon: von den Ländern vereinnahmte Umsatzsteuer"] = m.group(2)
                footnotes["davon: Einfuhrumsatzsteuer"] = m.group(3)
            lines = _lines(page)
            header_seen = False
            current: dict | None = None
            memo: str | None = None  # None | "memo" | "memo %"
            sub_idx = 0
            for ws in lines:
                texts = [w["text"] for w in ws]
                if not header_seen:
                    if texts[:3] == ["NW", "BY", "BW"] and texts[-1] == "Insgesamt":
                        header_seen = True
                    continue
                if texts[0].endswith(")") and texts[0][:-1].isdigit() and len(texts) > 1 and not NUM_RE.match(texts[1]):
                    break  # footnote block at the end of the last page
                # split into label words and numeric words (numbers sit right of x≈150)
                label_words, nums = [], []
                pending_pm = False
                for w in ws:
                    t = w["text"]
                    if t == "±":
                        pending_pm = True
                        continue
                    if NUM_RE.match(t) and w["x0"] > 150:
                        nums.append((w["x1"], de_num(t), pending_pm))
                        pending_pm = False
                    else:
                        label_words.append(t)
                label = " ".join(label_words).strip()
                if anchors is None and len(nums) == 17:
                    anchors = [x1 for x1, _, _ in nums]
                rowno = None
                if label_words:
                    m = ROWNO_RE.match(label_words[0])
                    if m:
                        rowno = m.group(1) + ("." + m.group(2) if m.group(2) else "")
                        label = " ".join(label_words[1:]).strip()
                if rowno:
                    current = {"page": pno, "row": rowno, "parent": "", "label": label, "kind": "value", "values": {}, "sign": "", "n": 0}
                    rows.append(current)
                    memo = None
                    sub_idx = 0
                    if nums:
                        _assign(current, nums, anchors)
                    continue
                if not nums:
                    if label.startswith("nachrichtlich"):
                        memo = "percent" if "v.H." in label else "memo"
                    elif current is not None and current["n"] == 0:
                        current["label"] = (current["label"] + " " + label).strip()
                    else:
                        raise SystemExit(f"{year} p{pno}: unexpected text line {label!r}")
                    continue
                # numbers without a row number
                if memo:
                    r = {"page": pno, "row": "", "parent": current["row"] if current else "", "label": "nachrichtlich: " + label,
                         "kind": "memo", "values": {}, "sign": "", "n": 0, "unit": "percent" if memo == "percent" else None}
                    _assign(r, nums, anchors)
                    rows.append(r)
                elif label.startswith("-") or label.startswith("–"):
                    sub_idx += 1
                    r = {"page": pno, "row": f"{current['row']}{'abcdef'[sub_idx - 1]}", "parent": current["row"],
                         "label": current["label"] + " – " + label.lstrip("-– ").strip(), "kind": "value", "values": {}, "sign": "", "n": 0}
                    _assign(r, nums, anchors)
                    rows.append(r)
                elif current is not None and current["n"] == 0:
                    current["label"] = (current["label"] + " " + label).strip()
                    _assign(current, nums, anchors)
                else:
                    raise SystemExit(f"{year} p{pno}: unexpected value line {label!r}")
    out = []
    memo_unit = None
    for r in rows:
        if r["kind"] == "memo":
            unit = r.get("unit") or "EUR thousand"
        else:
            unit = _unit_for(r["row"], r["label"], None)
        vals = [fmt(r["values"].get(c)) for c in [*COLS, "Insgesamt"]]
        coord = f"Anlage 1 Seite {r['page']}, Zeile {r['row'] or ('nachrichtlich zu ' + r['parent'])}"
        out.append([year, r["page"], r["row"], r["parent"], r["label"], r["kind"], unit, *vals, r["sign"], r["n"], coord, PDF_FILE[year], SCRIPT])
    for k, v in footnotes.items():
        out.append([year, 3, "fn4", "10", k, "footnote", "EUR", *[""] * 16, repr(de_num(v)), "", 1, "Anlage 1 Seite 3, Fußnote 4", PDF_FILE[year], SCRIPT])
    if not footnotes:
        raise SystemExit(f"{year}: footnote 4 (Gesamtaufkommen der Umsatzsteuer) not found")
    return out


def _assign(row: dict, nums, anchors):
    if anchors is None:
        raise SystemExit("column anchors not established before first value row")
    for x1, v, pm in nums:
        dist = [abs(x1 - a) for a in anchors]
        i = dist.index(min(dist))
        if dist[i] > 6:
            raise SystemExit(f"value {v} at x1={x1:.1f} does not align with any column (row {row['row']} {row['label']!r})")
        col = ([*COLS, "Insgesamt"])[i]
        if col in row["values"]:
            raise SystemExit(f"duplicate value for column {col} in row {row['row']} {row['label']!r}")
        row["values"][col] = v
        if pm and col == "Insgesamt":
            row["sign"] = "±"
        row["n"] += 1


# ----------------------------------------------------------------------------------------------
# Monatsbericht tables (HTML)
# ----------------------------------------------------------------------------------------------

def _cells(fragment: str) -> list[str]:
    return [html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", c))).strip() for c in re.findall(r"<t[hd].*?</t[hd]>", fragment, flags=re.S)]


def extract_bez(year: int) -> list[list]:
    src = raw_path(SRC_MB, MB_FILE[year]).read_text(encoding="utf-8")
    tables = re.findall(r"<table.*?</table>", src, flags=re.S)
    if len(tables) != 3:
        raise SystemExit(f"{year}: expected 3 tables in the Monatsbericht article, found {len(tables)}")
    out = []
    for tno, t in enumerate(tables, start=1):
        cap = re.search(r"<caption.*?</caption>", t, flags=re.S)
        caption = html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", cap.group(0)))).strip() if cap else ""
        cols: list[str] = []
        seen_rows: dict[str, int] = {}
        for tr in re.findall(r"<tr.*?</tr>", t, flags=re.S):
            cells = _cells(tr)
            if len(cells) < 2:
                continue
            if cells[0] == "" and cells[1] in ("NW", "TH"):
                cols = cells[1:]
                continue
            label = re.sub(r"\s+", " ", cells[0]).replace("Finanzkraft-ausgleich", "Finanzkraftausgleich")
            label = label.replace("überdurchschnittlicher hoher", "überdurchschnittlich hoher")  # 2025 typo, second half-table
            unit = "Mio EUR" if "in Mio. Euro" in label else "percent"
            key = label
            for col, raw in zip(cols, cells[1:]):
                raw = raw.strip()
                if raw in ("-", "–"):
                    val, sign = 0.0, ""
                elif raw.startswith("±"):
                    val, sign = de_num(raw[1:]), "±"
                else:
                    val, sign = de_num(raw), ""
                seen_rows[key] = seen_rows.get(key, 0) + 1
                coord = f"Tabelle {tno} ({caption}), Zeile '{label[:60]}', Spalte {col}"
                out.append([year, tno, caption, label, col, fmt(val) if not sign else "±" + fmt(val), raw, unit, coord, MB_FILE[year], SCRIPT])
    return out


# ----------------------------------------------------------------------------------------------
# build
# ----------------------------------------------------------------------------------------------

def read_csv(path: Path) -> list[dict]:
    with path.open(encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


class Anlage:
    def __init__(self, rows: list[dict]):
        self.rows = rows
        self.by_row = {r["row"]: r for r in rows if r["row"]}

    def val(self, row: str, col: str) -> float | None:
        r = self.by_row[row]
        s = r[col]
        return None if s == "" else float(s)

    def label(self, row: str) -> str:
        return self.by_row[row]["label"]

    def coord(self, row: str) -> str:
        return self.by_row[row]["coordinates"]

    def footnote(self, key: str) -> float:
        for r in self.rows:
            if r["kind"] == "footnote" and r["label"] == key:
                return float(r["Insgesamt"])
        raise KeyError(key)


class Bez:
    def __init__(self, rows: list[dict]):
        self.rows = rows

    def get(self, table: int, label_start: str, land: str) -> tuple[float, str, str]:
        for r in self.rows:
            if int(r["table"]) == table and r["row_label"].startswith(label_start) and r["land"] == land:
                v = r["value"]
                return (float(v.lstrip("±")), "±" if v.startswith("±") else "", r["coordinates"])
        raise KeyError((table, label_start, land))


T1_FKA = "Zu- und Abschläge im Finanzkraftausgleich"
T1_AFTER_FKA = "Relative Finanzkraft in Prozent der jeweiligen Ausgleichsmesszahl nach Finanzkraftausgleich"
T2_ALLG = "Bundesergänzungszuweisung zur ergänzenden Deckung des allgemeinen Finanzbedarfs"
T2_GSTK = "Bundesergänzungszuweisung zum Ausgleich besonders geringer kommunaler Steuerkraft"
T2_DOF = "Bundesergänzungszuweisung durchschnittsorientierter Forschungsförderungsausgleich"
T2_AFTER = "Finanzkraft in Prozent der Ausgleichsmesszahl nach Finanzkraftausgleich und Bundesergänzungszuweisungen"
T3_ALG = "SoBEZ zum Ausgleich von Sonderlasten durch strukturelle Arbeitslosigkeit"
T3_POL = "SoBEZ wegen überdurchschnittlich hoher Kosten politischer Führung"
T3_AFTER = "Finanzkraft in Prozent der Ausgleichsmesszahl nach Finanzkraftausgleich, Bundesergänzungszuweisungen und SoBEZ"

PINS_2024 = {  # previously verified values, EUR thousand unless stated (must reproduce exactly)
    ("10.3", "Insgesamt"): 148_378_868, ("10.3", "BE"): 6_526_007, ("15.10", "BE"): 3_942_990, ("15.10", "BY"): -9_773_933,
    ("10.3", "NW"): 32_022_578, ("15.10", "Insgesamt"): 18_653_957, ("1", "BE"): 3_672_983,
}
PIN_VAT_TOTAL_2024 = 302_143_338_590.25
PIN_SPLIT_2024 = {"bund": 145_334, "laender": 148_379, "gemeinden": 8_431}  # Mio EUR, rounded
PIN_BEZ_2024 = {"allgemeine": 8178, "gstk": 1411, "dof": 300, "sobez_unemployment": 82, "sobez_political": 642}  # Mio EUR


def check(cond: bool, msg: str):
    if not cond:
        raise SystemExit("CHECK FAILED: " + msg)
    print("  ok:", msg)


def k2eur(v: float | None) -> int | None:
    return None if v is None else round(v * 1000)


def build_year(year: int, anl: Anlage, bez: Bez, destatis: dict) -> dict:
    print(f"== {year}")
    # ---- structural checks inside Anlage 1 (EUR thousand; each printed value is rounded, so ±1 per term) ----
    for c in COLS:
        check(abs(anl.val("10.1", c) + anl.val("10.2", c) - anl.val("10.3", c)) <= 1, f"{year} {c}: 10.1 + 10.2 = 10.3")
        check(abs(anl.val("15.1", c) + anl.val("15.2", c) - anl.val("15.3", c)) <= 1, f"{year} {c}: 15.1 + 15.2 = 15.3")
        check(abs(anl.val("15.6", c) + anl.val("15.7", c) - anl.val("15.8", c)) <= 1, f"{year} {c}: 15.6 + 15.7 = 15.8")
        check(abs(anl.val("15.3", c) - anl.val("15.8", c) - anl.val("15.9", c)) <= 1, f"{year} {c}: 15.3 - 15.8 = 15.9")
        check(abs(-0.63 * anl.val("15.9", c) - anl.val("15.10", c)) <= 1, f"{year} {c}: 15.10 = -63% × 15.9")
        check(abs(100 * anl.val("15.3", c) / anl.val("15.8", c) - anl.val("15.4", c)) <= 0.051, f"{year} {c}: 15.4 = 15.3 / 15.8")
        check(abs(anl.val("13", c) - anl.val("15.1", c)) == 0, f"{year} {c}: row 13 = row 15.1")
    vat_sum = sum(anl.val("10.3", c) for c in COLS)
    check(abs(vat_sum - anl.val("10.3", "Insgesamt")) <= 16, f"{year}: Länder VAT shares sum to the pool total (Σ={vat_sum:.0f} vs {anl.val('10.3', 'Insgesamt'):.0f} thousand EUR)")
    fka = {c: anl.val("15.10", c) for c in COLS}
    fka_sum = sum(fka.values())
    check(abs(fka_sum) <= 1, f"{year}: FKA sums to zero (Σ={fka_sum:+.0f} thousand EUR)")
    plus = sum(v for v in fka.values() if v > 0)
    minus = -sum(v for v in fka.values() if v < 0)
    check(abs(plus - anl.val("15.10", "Insgesamt")) <= 8 and abs(minus - anl.val("15.10", "Insgesamt")) <= 8,
          f"{year}: FKA volume ± {anl.val('15.10', 'Insgesamt'):.0f} thousand EUR equals Σ positive = Σ negative")
    pop_sum = sum(anl.val("1", c) for c in COLS)
    check(pop_sum == anl.val("1", "Insgesamt"), f"{year}: population sums exactly ({pop_sum:.0f})")
    # VAT split
    vat_total = anl.footnote("Gesamtaufkommen der Umsatzsteuer")
    vat_dom = anl.footnote("davon: von den Ländern vereinnahmte Umsatzsteuer")
    vat_imp = anl.footnote("davon: Einfuhrumsatzsteuer")
    check(abs(vat_dom + vat_imp - vat_total) < 0.01, f"{year}: domestic + import VAT = total ({vat_total:,.2f} EUR)")
    laender_eur = k2eur(anl.val("10.3", "Insgesamt"))
    gemeinden_eur = k2eur(anl.val("14.5", "Insgesamt"))
    bund_eur = round(vat_total - laender_eur - gemeinden_eur)
    d_bund = destatis["STEUERNVB40"]
    check(abs(bund_eur - d_bund) <= 1000, f"{year}: Bund VAT share derived as total − Länder − Gemeinden ({bund_eur:,} EUR) matches Destatis STEUERNVB40 ({d_bund:,} EUR)")
    # ---- BEZ ----
    bez_cols = {"allgemeine": (2, T2_ALLG), "gstk": (2, T2_GSTK), "dof": (2, T2_DOF), "sobez_unemployment": (3, T3_ALG), "sobez_political": (3, T3_POL)}
    bez_tot = {}
    for key, (tno, lab) in bez_cols.items():
        vals = {c: bez.get(tno, lab, c)[0] for c in COLS}
        tot, _, _ = bez.get(tno, lab, "Insgesamt")
        n_nonzero = sum(1 for v in vals.values() if v)
        check(abs(sum(vals.values()) - tot) <= 0.5 * n_nonzero + 0.5,
              f"{year}: {key} BEZ sums to published total {tot:.0f} Mio EUR (Σ={sum(vals.values()):.0f}, {n_nonzero} rounded terms)")
        bez_tot[key] = tot
    # Monatsbericht Tabelle 1 FKA (Mio, rounded) vs Anlage 1 row 15.10
    for c in COLS:
        t1, _, _ = bez.get(1, T1_FKA, c)
        check(abs(t1 - fka[c] / 1000) <= 0.5, f"{year} {c}: Monatsbericht Tab. 1 FKA {t1:.0f} Mio = Anlage 1 row 15.10 ({fka[c] / 1000:.3f})")
    if year == 2024:
        for (row, col), v in PINS_2024.items():
            check(anl.val(row, col) == v, f"2024 pin row {row} {col} = {v:,}")
        check(vat_total == PIN_VAT_TOTAL_2024, f"2024 pin VAT total = {PIN_VAT_TOTAL_2024:,.2f} EUR")
        for k, v in {"bund": bund_eur, "laender": laender_eur, "gemeinden": gemeinden_eur}.items():
            check(round(v / 1e6) == PIN_SPLIT_2024[k], f"2024 pin VAT split {k} = {PIN_SPLIT_2024[k]:,} Mio EUR")
        for k, v in PIN_BEZ_2024.items():
            check(bez_tot[k] == v, f"2024 pin BEZ total {k} = {v:,} Mio EUR")

    # ---- Destatis comparison (report only) ----
    comparisons = []

    def compare(what: str, code: str, bmf_eur: int | None, dest_eur: int | None, land: str | None = None):
        if bmf_eur is None or dest_eur is None:
            return
        comparisons.append({"land": land, "item": what, "destatis_position": code, "bmf_eur": bmf_eur, "destatis_eur": dest_eur, "difference_eur": dest_eur - bmf_eur})

    # ---- assemble ----
    pop_date = f"{year}-06-30"
    laender = []
    bez_land_total = 0.0
    for c in OUT_ORDER:
        pop = anl.val("1", c)
        fka_eur = k2eur(fka[c])
        b = {k: bez.get(tno, lab, c)[0] for k, (tno, lab) in bez_cols.items()}
        b_total = sum(b.values())
        bez_land_total += b_total
        after_fka, _, c_after_fka = bez.get(1, T1_AFTER_FKA, c)
        after_bez, _, c_after_bez = bez.get(2, T2_AFTER, c)
        after_sobez, _, c_after_sobez = bez.get(3, T3_AFTER, c)
        fkm, amz = anl.val("15.3", c), anl.val("15.8", c)
        derived_after_fka = round(100 * (fkm + fka[c]) / amz, 2)
        check(abs(derived_after_fka - after_fka) <= 0.051, f"{year} {c}: (15.3 + 15.10) / 15.8 = {derived_after_fka} ≈ Tab. 1 'nach FKA' {after_fka}")
        dl = destatis["laender"].get(c, {})
        compare("VAT share of the Land (row 10.3)", "STEUERNVL40", k2eur(anl.val("10.3", c)), dl.get("STEUERNVL40"), c)
        compare("Finanzkraftausgleich (row 15.10)", "STEUERNVL71", fka_eur, dl.get("STEUERNVL71"), c)
        compare("All BEZ incl. SoBEZ (Monatsbericht Tab. 2+3, Mio EUR rounded)", "STEUERNVL66", round(b_total * 1e6), dl.get("STEUERNVL66"), c)
        compare("Municipal VAT share used in the FKA (row 14.5)", "STEUERNVG40", k2eur(anl.val("14.5", c)), dl.get("STEUERNVG40"), c)
        laender.append({
            "code": c,
            "name": {"de": LAND_NAMES[c], "en": EN_NAMES.get(c, LAND_NAMES[c])},
            "city_state": c in CITY_STATES,
            "population": {"value": int(pop), "date": pop_date, "unit": "persons", "coordinates": anl.coord("1"),
                           "label": {"de": anl.label("1"), "en": f"Residents on {pop_date} (basis of the calculation)"}},
            "tax_bases": {
                "unit": "EUR", "precision": "EUR thousand in source",
                "land_taxes_by_revenue": {"value": k2eur(anl.val("9", c)), "coordinates": anl.coord("9"),
                                          "label": {"de": anl.label("9"), "en": "Land taxes by place of collection (before VAT distribution)"}},
                "land_taxes_in_fka": {"value": k2eur(anl.val("15.1", c)), "coordinates": anl.coord("15.1"),
                                      "label": {"de": anl.label("15.1"), "en": "Land taxes counted in the equalisation (incl. VAT share, Förderabgabe, after § 7 (3) FAG deduction)"}},
                "municipal_taxes_in_fka": {"value": k2eur(anl.val("15.2", c)), "coordinates": anl.coord("15.2"),
                                           "label": {"de": anl.label("15.2"), "en": "Municipal taxes counted in the equalisation (75 % of the municipal tax basis)"}},
                "finanzkraftmesszahl": {"value": k2eur(fkm), "coordinates": anl.coord("15.3"),
                                        "label": {"de": anl.label("15.3"), "en": "Fiscal capacity measure (Land + municipal part)"}},
                "ausgleichsmesszahl": {"value": k2eur(amz), "coordinates": anl.coord("15.8"),
                                       "label": {"de": "Ausgleichsmesszahl (15.6.+15.7.)", "en": "Equalisation measure (what the Land would have at the national average, with resident weights)"}},
                "fiscal_strength_before_fka_pct": {"value": anl.val("15.4", c), "unit": "percent", "coordinates": anl.coord("15.4"),
                                                   "label": {"de": anl.label("15.4"), "en": "Fiscal capacity in % of the equalisation measure, before FKA"}},
            },
            "vat_share": {
                "unit": "EUR", "precision": "EUR thousand in source",
                "population_part": {"value": k2eur(anl.val("10.1", c)), "coordinates": anl.coord("10.1"),
                                    "label": {"de": anl.label("10.1"), "en": "Land share of VAT by residents (§ 1 FAG percentage)"}},
                "festbetrag_part": {"value": k2eur(anl.val("10.2", c)), "coordinates": anl.coord("10.2"),
                                    "label": {"de": anl.label("10.2"), "en": "Land share of VAT, fixed amounts (§ 1 FAG Festbeträge)"}},
                "total": {"value": k2eur(anl.val("10.3", c)), "coordinates": anl.coord("10.3"),
                          "label": {"de": "Länderanteil an der Umsatzsteuer insgesamt", "en": "Land share of VAT, total"}},
            },
            "fka": {
                "unit": "EUR", "precision": "EUR thousand in source",
                "adjustment": {"value": fka_eur, "coordinates": anl.coord("15.10"),
                               "label": {"de": anl.label("15.10"), "en": "Equalisation adjustment (+ received / − paid) within the VAT distribution"}},
                "fiscal_strength_after_fka_pct": {"value": after_fka, "unit": "percent", "coordinates": c_after_fka, "source": "monatsbericht",
                                                  "derived_check": derived_after_fka,
                                                  "label": {"de": T1_AFTER_FKA, "en": "Fiscal capacity in % of the equalisation measure, after FKA"}},
            },
            "bez": {
                "unit": "EUR", "precision": "Mio EUR in source (rounded)", "source": "monatsbericht",
                "allgemeine": {"value": round(b["allgemeine"] * 1e6), "coordinates": bez.get(2, T2_ALLG, c)[2],
                               "label": {"de": "Allgemeine Bundesergänzungszuweisungen", "en": "General supplementary federal grants (§ 11 (2) FAG)"}},
                "gstk": {"value": round(b["gstk"] * 1e6), "coordinates": bez.get(2, T2_GSTK, c)[2],
                         "label": {"de": "BEZ zum Ausgleich besonders geringer kommunaler Steuerkraft (GStK-BEZ)", "en": "Grants for particularly low municipal tax capacity (§ 11 (5) FAG)"}},
                "dof": {"value": round(b["dof"] * 1e6), "coordinates": bez.get(2, T2_DOF, c)[2],
                        "label": {"de": "BEZ durchschnittsorientierter Forschungsförderungsausgleich (doF-BEZ)", "en": "Research-funding equalisation grants (§ 11 (6) FAG)"}},
                "sobez_unemployment": {"value": round(b["sobez_unemployment"] * 1e6), "coordinates": bez.get(3, T3_ALG, c)[2],
                                       "label": {"de": "SoBEZ wegen struktureller Arbeitslosigkeit", "en": "Special-needs grants for structural unemployment (§ 11 (3) FAG)"}},
                "sobez_political": {"value": round(b["sobez_political"] * 1e6), "coordinates": bez.get(3, T3_POL, c)[2],
                                    "label": {"de": "SoBEZ wegen überdurchschnittlich hoher Kosten politischer Führung", "en": "Special-needs grants for above-average costs of political leadership (§ 11 (4) FAG)"}},
                "total": {"value": round(b_total * 1e6), "derived": True, "coordinates": "sum of the five BEZ columns",
                          "label": {"de": "Bundesergänzungszuweisungen insgesamt (inkl. SoBEZ)", "en": "All supplementary federal grants incl. SoBEZ"}},
                "fiscal_strength_after_bez_pct": {"value": after_bez, "unit": "percent", "coordinates": c_after_bez,
                                                  "label": {"de": T2_AFTER, "en": "Fiscal capacity in % after FKA and general/GStK/doF BEZ"}},
                "fiscal_strength_after_sobez_pct": {"value": after_sobez, "unit": "percent", "coordinates": c_after_sobez,
                                                    "label": {"de": T3_AFTER, "en": "Fiscal capacity in % after FKA, BEZ and SoBEZ"}},
            },
            "per_resident": {
                "unit": "EUR per resident", "derived": True, "basis": f"value ÷ residents on {pop_date} (row 1)",
                "vat_share": round(k2eur(anl.val("10.3", c)) / pop, 2),
                "fka_adjustment": round(fka_eur / pop, 2),
                "bez_total": round(b_total * 1e6 / pop, 2),
                "fka_plus_bez": round((fka_eur + b_total * 1e6) / pop, 2),
            },
        })
    # Destatis totals
    compare("Länder VAT pool (row 10.3 Insgesamt)", "STEUERNVL40", laender_eur, destatis["STEUERNVL40"])
    compare("Municipal VAT (row 14.5 Insgesamt)", "STEUERNVG40", gemeinden_eur, destatis["STEUERNVG40"])
    compare("All BEZ incl. SoBEZ (sum of Monatsbericht totals)", "STEUERNVL66", round(sum(bez_tot.values()) * 1e6), destatis["STEUERNVL66"])
    for cmp in comparisons:
        if cmp["land"] is None:
            print(f"  destatis {cmp['destatis_position']}: BMF {cmp['bmf_eur']:,} vs Destatis {cmp['destatis_eur']:,} (diff {cmp['difference_eur']:+,})")

    totals = {
        "vat": {
            "unit": "EUR",
            "total": {"value": vat_total, "coordinates": "Anlage 1 Seite 3, Fußnote 4", "label": {"de": "Gesamtaufkommen der Umsatzsteuer (einschl. Einfuhrumsatzsteuer)", "en": "Total VAT incl. import VAT"}},
            "domestic": {"value": vat_dom, "coordinates": "Anlage 1 Seite 3, Fußnote 4", "label": {"de": "von den Ländern vereinnahmte Umsatzsteuer", "en": "VAT collected by the Länder tax offices"}},
            "import": {"value": vat_imp, "coordinates": "Anlage 1 Seite 3, Fußnote 4", "label": {"de": "Einfuhrumsatzsteuer", "en": "Import VAT (customs)"}},
            "laender": {"value": laender_eur, "coordinates": anl.coord("10.3"), "label": {"de": "Länderanteil (Zeile 10.3 Insgesamt)", "en": "Länder share (row 10.3 total)"}},
            "gemeinden": {"value": gemeinden_eur, "coordinates": anl.coord("14.5"), "label": {"de": "Gemeindeanteil (Zeile 14.5 Insgesamt)", "en": "Municipal share (row 14.5 total)"}},
            "bund": {"value": bund_eur, "derived": True, "coordinates": "total − Länder − Gemeinden; equals Destatis 71211-0002 STEUERNVB40 within 1,000 EUR",
                     "label": {"de": "Bundesanteil", "en": "Federal share"}},
            "effective_shares_pct": {"derived": True, "bund": round(100 * bund_eur / vat_total, 2), "laender": round(100 * laender_eur / vat_total, 2), "gemeinden": round(100 * gemeinden_eur / vat_total, 2)},
            "statutory_shares_pct": {"bund": 52.81398351, "laender": 45.19007254, "gemeinden": 1.99594395,
                                     "note": "§ 1 (1) FAG percentages before the fixed-amount corrections of § 1 (2), (2a), (5) FAG; the effective split differs because of them"},
        },
        "fka": {"unit": "EUR", "volume": {"value": k2eur(anl.val("15.10", "Insgesamt")), "coordinates": anl.coord("15.10") + " (Insgesamt, ±)",
                                           "label": {"de": "Gesamtvolumen der Zu- und Abschläge", "en": "Redistribution volume (sum of all positive = sum of all negative adjustments)"}},
                "rate_note": "Adjustments are 63 % of the gap between Finanzkraftmesszahl and Ausgleichsmesszahl (§ 10 FAG); verified row by row in the build"},
        "bez": {"unit": "EUR", "precision": "Mio EUR in source (rounded)",
                **{k: {"value": round(v * 1e6), "coordinates": bez.get(tno, lab, "Insgesamt")[2]} for (k, v), (tno, lab) in zip(bez_tot.items(), bez_cols.values())},
                "total": {"value": round(sum(bez_tot.values()) * 1e6), "derived": True}},
        "population": {"value": int(anl.val("1", "Insgesamt")), "date": pop_date, "coordinates": anl.coord("1")},
    }
    return {"laender": laender, "totals": totals, "destatis_comparison": comparisons}


def load_destatis(year: str) -> dict:
    import json  # noqa: PLC0415
    rec = json.loads((DATA / "de/taxes/by-recipient.json").read_text(encoding="utf-8"))
    by_land = json.loads((DATA / "de/taxes/by-land.json").read_text(encoding="utf-8"))
    out = {r["id"]: r["values_eur"][year] for r in rec["rows"] if r["id"] in ("STEUERNVB40", "STEUERNVL40", "STEUERNVG40", "STEUERNVL66")}
    out["laender"] = {c: v["years"].get(year, {}) for c, v in by_land["laender"].items()}
    return out


def main():
    have_cache = all((ROOT / "research/cache" / SRC_PDF / PDF_FILE[y]).exists() and (ROOT / "research/cache" / SRC_MB / MB_FILE[y]).exists() for y in YEARS)
    if have_cache:
        for y in YEARS:
            write_csv(f"{SRC_PDF}/anlage1-{y}.csv", ANLAGE_HEADER, extract_anlage1(y), base=EXTRACTS)
            write_csv(f"{SRC_MB}/bez-{y}.csv", BEZ_HEADER, extract_bez(y), base=EXTRACTS)
    else:
        print("cache files missing: building from the committed extracts")

    for y in YEARS:
        anl = Anlage(read_csv(EXTRACTS / SRC_PDF / f"anlage1-{y}.csv"))
        bez = Bez(read_csv(EXTRACTS / SRC_MB / f"bez-{y}.csv"))
        expected_rows = {"1", "2.1", "2.2", "2.3", "2.4", "2.5", "2.6", "3.1", "3.2", "3.3", "3.4", "4.1", "4.2", "4.3", "4.4", "5.1", "5.2", "5.3", "5.4",
                         "6.1", "6.2", "6.3", "6.4", "6.5", "7", "8.1", "8.2", "8.3", "8.4", "8.5", "8.6", "8.7", "8.8", "8.9", "9", "10.1", "10.2", "10.3", "11",
                         "12.1a", "12.1b", "12.2", "12.3", "12.4", "12.5", "13", "14.1", "14.3", "14.4", "14.5", "14.6", "14.7", "14.8", "14.9", "14.10",
                         "15.1", "15.2", "15.3", "15.4", "15.6", "15.7", "15.8", "15.9", "15.10"}
        if y == 2025:
            expected_rows.add("6a")
        got = {r["row"] for r in anl.rows if r["kind"] == "value" and r["n_values"] != "0"}
        check(got == expected_rows, f"{y}: all expected Anlage 1 value rows parsed ({len(got)} rows)")
        for r in anl.rows:
            n = int(r["n_values"])
            if r["kind"] == "value" and n and r["row"] != "12.3" and n != 17:
                raise SystemExit(f"{y}: row {r['row']} has {n} values, expected 17")
        result = build_year(y, anl, bez, load_destatis(str(y)))
        payload = envelope(
            f"de.equalisation.{y}",
            f"Umsatzsteuerverteilung, Finanzkraftausgleich und Bundesergänzungszuweisungen, Ausgleichsjahr {y}",
            f"VAT distribution, fiscal capacity equalisation and supplementary federal grants, equalisation year {y}",
            "EUR",
            f"BMF Abrechnung Ausgleichsjahr {y} (Anlage 1, in 1.000 Euro, converted ×1000) and BMF Monatsbericht tables (in Mio. Euro, converted ×1,000,000; BEZ values are therefore rounded to the million). Population: residents on 30.06.{y}.",
            SCRIPT,
            year=y,
            status="provisional (BMF: based on the vorläufige Jahresrechnung)",
            land_order=OUT_ORDER,
            notes=[
                "Positive FKA adjustment = the Land receives a supplement out of the Länder VAT pool; negative = the Land's VAT share is reduced (§ 10 FAG). Adjustments sum to zero across the 16 Länder.",
                "BEZ (Bundesergänzungszuweisungen) are paid by the Federation on top of the VAT distribution; they are published by BMF only rounded to Mio EUR. A dash in the 2024 tables means no grant and is stored as 0 (the 2025 tables print 0).",
                "Fiscal strength percentages before FKA come from Anlage 1 row 15.4; after FKA/BEZ/SoBEZ they come from Monatsbericht Tabellen 1–3 (one decimal). The after-FKA value is re-derived in the build from rows 15.3, 15.8 and 15.10 and agrees within rounding.",
                "destatis_comparison lists the same items in Destatis 71211-0102 (cash receipts after distribution). VAT share and FKA agree to the EUR thousand; BEZ and municipal VAT differ because Destatis records cash paid in the calendar year (including settlements of earlier years) while BMF shows the amounts attributed to the equalisation year.",
                "per_resident values are derived (value ÷ residents on 30.06.) and are not published by BMF.",
            ],
            sources={
                "anlage1": source_ref(SRC_PDF, PDF_FILE[y], "Anlage 1, Seiten 1–3; row numbers as printed; extract research/extracts/bmf_abrechnung_finanzausgleich/anlage1-%d.csv" % y),
                "monatsbericht": source_ref(SRC_MB, MB_FILE[y], "Tabelle 1 (UStV/FKA), Tabelle 2 (BEZ), Tabelle 3 (SoBEZ); extract research/extracts/bmf_monatsbericht/bez-%d.csv" % y),
                "fag_1": source_ref("gesetze_im_internet", "finausglg_1.html", "§ 1 (1) FAG percentages, § 1 (2) fixed amounts"),
                "gg_107": source_ref("gesetze_im_internet", "gg_art_107.html", "Art. 107 (2) GG: constitutional basis of the equalisation"),
                "destatis": {"file": "data/de/taxes/by-land.json, data/de/taxes/by-recipient.json", "positions": ["STEUERNVL40", "STEUERNVL71", "STEUERNVL66", "STEUERNVG40", "STEUERNVB40"]},
            },
            **result,
        )
        write_json(f"de/equalisation/{y}.json", payload)

    meta = envelope(
        "de.equalisation.laender_meta", "Länder: Kennung, Name, Stadtstaat", "Länder: code, name, city-state flag", "n/a",
        "Static attributes used to read the equalisation files", SCRIPT,
        note="municipal_shares_in_land_budget: in Berlin and Hamburg the Land budget also contains the municipal level (no separate municipalities), so municipal tax shares flow into the Land budget; Bremen is a city-state whose two municipalities (Bremen, Bremerhaven) keep separate budgets. Statutory basis: § 7 GemFinRefG (Stadtstaaten); that section is not among the retrieved statutes, so the flag is marked unverified_in_repo.",
        laender=[{"code": c, "name": {"de": LAND_NAMES[c], "en": EN_NAMES.get(c, LAND_NAMES[c])}, "city_state": c in CITY_STATES,
                  "municipal_shares_in_land_budget": c in ("BE", "HH"), "flag_status": "unverified_in_repo" if c in CITY_STATES else "n/a"} for c in OUT_ORDER],
    )
    write_json("de/equalisation/laender-meta.json", meta)


if __name__ == "__main__":
    main()
