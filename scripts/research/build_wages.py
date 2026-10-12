#!/usr/bin/env python3
"""Wage reference points for the wage slider → data/de/citizen/wage-reference.json

- statutory minimum wage per hour (MiLoG § 1, MiLoV4/MiLoV5) and its annual full-time equivalent (assumption: 40 h × 52 weeks)
- median and average gross earnings of full-time employees (Destatis Verdiensterhebung 62361)
- Durchschnittsentgelt of the statutory pension insurance (Anlage 1 SGB VI), the 'average wage' used by pension law
"""
from __future__ import annotations

import html
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import cube_get, envelope, jsonstat_cube, raw_path, source_ref, write_json  # noqa: E402

SCRIPT = "scripts/research/build_wages.py"
LAW = "gesetze_im_internet_wages"
GEN = "destatis_genesis_62361"
HOURS_PER_WEEK, WEEKS = 40, 52  # assumption for the annual full-time equivalent


def statute_text(file: str) -> str:
    t = raw_path(LAW, file).read_text(encoding="utf-8", errors="replace")
    t = re.sub(r"<[^>]+>", " ", t)
    return re.sub(r"[\s  ]+", " ", html.unescape(t))


def must(file: str, phrase: str):
    if phrase not in statute_text(file):
        raise SystemExit(f"{file} does not contain {phrase!r}")


def main():
    # 1. minimum wage
    must("milov4_1.html", "ab 1. Januar 2024 12,41 Euro brutto je Zeitstunde")
    must("milov4_1.html", "ab 1. Januar 2025 12,82 Euro brutto je Zeitstunde")
    must("milov5_1.html", "ab 1. Januar 2026 13,90 Euro brutto je Zeitstunde")
    must("milov5_1.html", "ab 1. Januar 2027 14,60 Euro brutto je Zeitstunde")
    minimum = {}
    for year, hourly, file, sec in ((2024, 12.41, "milov4_1.html", "§ 1 Nr. 1 MiLoV4"), (2025, 12.82, "milov4_1.html", "§ 1 Nr. 2 MiLoV4"), (2026, 13.90, "milov5_1.html", "§ 1 Nr. 1 MiLoV5"), (2027, 14.60, "milov5_1.html", "§ 1 Nr. 2 MiLoV5")):
        annual = round(hourly * HOURS_PER_WEEK * WEEKS, 2)
        minimum[str(year)] = {
            "hourly_eur": hourly, "status": "statute", "legal_basis": f"{sec} (§ 1 (2) MiLoG)",
            "annual_full_time_eur": annual, "annual_status": "derived*",
            "annual_assumption": f"{HOURS_PER_WEEK} h/week × {WEEKS} weeks = {HOURS_PER_WEEK * WEEKS} paid hours; collectively agreed full-time weeks are often 35-39 h, which gives a lower annual figure",
            "monthly_full_time_eur": round(hourly * HOURS_PER_WEEK * WEEKS / 12, 2),
            "source": source_ref(LAW, file, f"text contains: ab 1. Januar {year} {hourly:.2f}".replace(".", ",") + " Euro brutto je Zeitstunde"),
        }
    # 1b. sourced alternative hours assumption: Destatis average paid weekly hours of full-time employees
    from common import read_sheet
    sheet = read_sheet(raw_path("destatis_verdienste_bericht", "verdienste-2025-q4.xlsx"), "csv-62361-04_1")
    hours = next(float(r[15]) for r in sheet[1:] if r[0] and str(r[12]).strip() == "Gesamtwirtschaft")
    for y, m in minimum.items():
        m["annual_full_time_at_destatis_hours_eur"] = round(m["hourly_eur"] * hours * WEEKS, 2)
        m["destatis_hours_assumption"] = {"paid_hours_per_week": hours, "definition": "Durchschnittliche bezahlte Wochenarbeitszeit inkl. Überstunden, Vollzeitbeschäftigte, Gesamtwirtschaft, April 2025", "source": source_ref("destatis_verdienste_bericht", "verdienste-2025-q4.xlsx", "sheet csv-62361-04_1, row Gesamtwirtschaft, column WZT002")}
    # 2. Destatis Verdiensterhebung: April reference month (monthly, without special payments) and annual (incl. special payments)
    monthly = jsonstat_cube(raw_path(GEN, "62361-0031.json"))
    annual = jsonstat_cube(raw_path(GEN, "62361-0035.json"))
    earnings = {}
    for m in dict(monthly["dims"])["SMONAT"]:
        y = m[:4]
        med, s1 = cube_get(monthly, GES="%TOTAL%", SMONAT=m, content="VST052$QMU", ALT035="%TOTAL%")
        avg, s2 = cube_get(monthly, GES="%TOTAL%", SMONAT=m, content="VST047$QMU", ALT035="%TOTAL%")
        medh, _ = cube_get(monthly, GES="%TOTAL%", SMONAT=m, content="VST051$QMU", ALT035="%TOTAL%")
        earnings.setdefault(y, {})["monthly_april"] = {
            "median_gross_monthly_eur": med, "average_gross_monthly_eur": avg, "median_gross_hourly_eur": medh,
            "definition": {"de": "Bruttomonatsverdienst ohne Sonderzahlungen, Vollzeitbeschäftigte, Stichmonat April", "en": "Gross monthly earnings without special payments, full-time employees, reference month April"},
            "status": "final" if s1 == "e" and s2 == "e" else "provisional",
            "source": source_ref(GEN, "62361-0031.json", f"SMONAT={m}, GES=%TOTAL%, ALT035=%TOTAL%, content VST052 (Mittlere = median) / VST047 (Durchschn.) / VST051", "The GENESIS table title does not say 'Vollzeit'; the identically coded tables 62361-03/-05 of the Statistischer Bericht Verdienste are titled 'Vollzeitbeschäftigte' (research/cache/destatis_verdienste_bericht)"),
        }
        earnings[y]["monthly_april"]["median_x12_eur"] = round(med * 12) if med else None
    for y in dict(annual["dims"])["JAHR"]:
        med, s1 = cube_get(annual, GES="%TOTAL%", JAHR=y, content="VST053$QMU", ALT035="%TOTAL%")
        avg, s2 = cube_get(annual, GES="%TOTAL%", JAHR=y, content="VST050$QMU", ALT035="%TOTAL%")
        earnings.setdefault(y, {})["annual"] = {
            "median_gross_annual_eur": med, "average_gross_annual_eur": avg,
            "definition": {"de": "Bruttojahresverdienst mit Sonderzahlungen, Vollzeitbeschäftigte", "en": "Gross annual earnings including special payments, full-time employees"},
            "status": "final" if s1 == "e" and s2 == "e" else "provisional",
            "source": source_ref(GEN, "62361-0035.json", f"JAHR={y}, GES=%TOTAL%, ALT035=%TOTAL%, content VST053 (median) / VST050 (average)"),
        }
    # 3. Durchschnittsentgelt (Anlage 1 SGB VI)
    t = statute_text("sgb6_anlage_1.html")
    i = t.find("2020 39 167")
    seg = t[i:i + 200]
    vals = re.findall(r"(?:^|\s)(20\d\d|\d\d) ([\d ]{5,7}?)(\*\))?(?=\s)", seg)
    de = {}
    for yy, v, prov in vals:
        year = int(yy) if len(yy) == 4 else 2000 + int(yy)
        de[str(year)] = {"durchschnittsentgelt_eur": int(v.replace(" ", "")), "status": "provisional (vorläufig, § 69 (2) SGB VI)" if prov else "final"}
    assert de["2024"]["durchschnittsentgelt_eur"] == 47085 and de["2025"]["durchschnittsentgelt_eur"] == 50493, de
    years = {}
    for y in ("2024", "2025", "2026", "2027"):
        years[y] = {
            "minimum_wage": minimum.get(y),
            "full_time_earnings": earnings.get(y),
            "pension_average_earnings": {**de[y], "label": {"de": "Durchschnittsentgelt der Rentenversicherung (Anlage 1 SGB VI)", "en": "Average earnings of insured persons used by pension law (Anlage 1 SGB VI)"},
                                          "definition": {"de": "Durchschnittliches Bruttojahresarbeitsentgelt aller Versicherten der gesetzlichen Rentenversicherung (inkl. Teilzeit)", "en": "Average gross annual earnings of all persons insured in the statutory pension insurance (incl. part-time)"},
                                          "source": source_ref(LAW, "sgb6_anlage_1.html", f"Anlage 1 row '{y}'")} if y in de else None,
        }
    print("wage reference:", {y: (years[y]["minimum_wage"] or {}).get("annual_full_time_eur") for y in years}, {y: (years[y]["full_time_earnings"] or {}).get("annual", {}).get("median_gross_annual_eur") for y in years})
    payload = envelope(
        "de.citizen.wage_reference", "Lohn-Referenzpunkte: Mindestlohn, Median- und Durchschnittsverdienst", "Wage reference points: minimum wage, median and average earnings",
        "EUR", "Statute (minimum wage), Destatis Verdiensterhebung (full-time employees), Anlage 1 SGB VI (pension-law average). Annual minimum-wage figure is derived* from an hours assumption.",
        SCRIPT, assumptions=[f"Annual minimum wage = hourly rate × {HOURS_PER_WEEK} h × {WEEKS} weeks (marked derived*); a second figure uses Destatis' average paid full-time week (39.1 h, April 2025)", "Median monthly × 12 ignores special payments (13th salary etc.); the annual series includes them, which is why annual median > 12 × monthly median"],
        years=years,
    )
    write_json("de/citizen/wage-reference.json", payload)


if __name__ == "__main__":
    main()
