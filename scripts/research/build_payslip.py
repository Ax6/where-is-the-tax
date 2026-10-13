#!/usr/bin/env python3
"""Statutes + BMF Programmablaufplan → data/de/citizen/payslip-parameters.json and payslip-examples.json

Pure-Python implementation (decimal arithmetic, PAP rounding rules) of what an employee in Germany pays
out of a gross wage in 2024, 2025 and 2026:

  (a) the § 32a EStG tariff with the full-euro flooring rules,
  (b) the annual wage tax (Jahreslohnsteuer) for tax class I/IV, no children, no church tax, following
      § 39b Abs. 2 EStG as operationalised by the BMF Programmablaufplan (PAP) of each year,
  (c) the solidarity surcharge with Freigrenze and Milderungszone (§§ 3, 4 SolzG),
  (d) statutory social contributions with their ceilings (employee and employer side).

Validation: the class-I column of the official Prüftabelle printed at the end of each PAP is extracted to
research/extracts/bmf_programmablaufplan/prueftabelle_stkl1.csv and every row is recomputed; the build fails
on any euro of difference. Tariff continuity at the zone boundaries and the Grundfreibetrag → 0 are checked too.

Run:  .venv/bin/python -I scripts/research/build_payslip.py [--extract]   (--extract re-reads the cached PDFs)
"""
from __future__ import annotations

import csv
import re
import sys
from decimal import ROUND_DOWN, ROUND_HALF_UP, ROUND_UP, Decimal
from fractions import Fraction
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import CACHE, EXTRACTS, envelope, source_ref, write_csv, write_json  # noqa: E402

SCRIPT = "scripts/research/build_payslip.py"
GII = "gesetze_im_internet"
GIIP = "gesetze_im_internet_payslip"
PAP = "bmf_programmablaufplan"
PAP_FILE = {
    2024: "2024-10-18-PAP-Dez-2024-anl-1.pdf",
    2025: "2025-01-22-geaenderte-PAP-2025-anlage-1.pdf",
    2026: "2025-11-12-PAP-2026-anlage-1.pdf",
}
PAP_PRUEFTABELLE_PAGE = {2024: 44, 2025: 39, 2026: 39}
PAP_PARAM_PAGE = {2024: 16, 2025: 14, 2026: 14}
PAP_TARIFF_PAGE = {2024: 43, 2025: 38, 2026: 38}
TARIFHISTORIE_PAGE = {2024: 32, 2025: 33, 2026: 34}
EXTRACT_CSV = "bmf_programmablaufplan/prueftabelle_stkl1.csv"

D = Decimal
ZERO = D(0)


def floor_eur(x: Decimal) -> Decimal:
    return x.quantize(D("1"), rounding=ROUND_DOWN)


def ceil_eur(x: Decimal) -> Decimal:
    return x.quantize(D("1"), rounding=ROUND_UP)


def floor_cent(x: Decimal) -> Decimal:
    return x.quantize(D("0.01"), rounding=ROUND_DOWN)


def round_cent(x: Decimal) -> Decimal:
    return x.quantize(D("0.01"), rounding=ROUND_HALF_UP)


# --------------------------------------------------------------------------------------------------
# Statutory parameters per year. Every number here is traced in payslip-parameters.json to a source file.
# --------------------------------------------------------------------------------------------------
TARIFF = {
    # § 32a Abs. 1 EStG: zone upper bounds (inclusive, EUR) and constants. y/z are ten-thousandths above the
    # lower bound of the zone; the tax is floored to full euros.
    2024: {"gfb": 11784, "z2_top": 17005, "z3_top": 66760, "z4_top": 277825,
           "a2": D("954.80"), "b2": 1400, "a3": D("181.19"), "b3": 2397, "c3": D("991.21"),
           "r4": D("0.42"), "c4": D("10636.31"), "r5": D("0.45"), "c5": D("18971.06")},
    2025: {"gfb": 12096, "z2_top": 17443, "z3_top": 68480, "z4_top": 277825,
           "a2": D("932.30"), "b2": 1400, "a3": D("176.64"), "b3": 2397, "c3": D("1015.13"),
           "r4": D("0.42"), "c4": D("10911.92"), "r5": D("0.45"), "c5": D("19246.67")},
    2026: {"gfb": 12348, "z2_top": 17799, "z3_top": 69878, "z4_top": 277825,
           "a2": D("914.51"), "b2": 1400, "a3": D("173.10"), "b3": 2397, "c3": D("1034.87"),
           "r4": D("0.42"), "c4": D("11135.63"), "r5": D("0.45"), "c5": D("19470.38")},
}
TARIFF_2024_JAN_NOV = {"gfb": 11604, "a2": D("922.98"), "a3": D("181.19"), "c3": D("1025.38"), "c4": D("10602.13"), "c5": D("18936.88")}

SOLI = {  # §§ 3 Abs. 3 Nr. 2, 4 SolzG: Freigrenze (EUR of wage tax) for classes I, II, IV–VI; rate; Milderung factor
    2024: {"freigrenze": 18130}, 2025: {"freigrenze": 19950}, 2026: {"freigrenze": 20350},
}
SOLI_RATE = D("0.055")
SOLI_MILDERUNG = D("0.119")

ARBEITNEHMER_PAUSCHBETRAG = 1230  # § 9a S. 1 Nr. 1 a EStG
SONDERAUSGABEN_PAUSCHBETRAG = 36  # § 10c S. 1 EStG
KV_REDUCED_RATE = D("0.140")  # § 243 SGB V, used only inside the Vorsorgepauschale (§ 39b Abs. 2 S. 5 Nr. 3 b EStG)
VORSORGE_MIN_CAP = {1: 1900, 3: 3000}  # 2024/2025: 12 % minimum check cap (§ 39b Abs. 2 S. 5 Nr. 3 a.F.; PAP UPEVP)
VORSORGE_ALV_CAP = 1900  # 2026: KV+PV+ALV part capped at 1 900 (§ 39b Abs. 2 S. 5 Nr. 3 e EStG; PAP MVSPHB)

SV = {
    2024: {"rv_rate": D("0.186"), "alv_rate": D("0.026"), "kv_rate": D("0.146"), "kv_zusatz_avg": D("0.017"),
           "pv_rate": D("0.034"), "pv_childless": D("0.006"), "pv_child_abatement": D("0.0025"),
           "bbg_rv": 90600, "bbg_rv_ost": 89400, "bbg_kv": 62100, "bezugsgroesse": 42420, "bezugsgroesse_ost": 41580,
           "pv_employee_saxony": D("0.022"), "pv_employer_saxony": D("0.012")},
    2025: {"rv_rate": D("0.186"), "alv_rate": D("0.026"), "kv_rate": D("0.146"), "kv_zusatz_avg": D("0.025"),
           "pv_rate": D("0.036"), "pv_childless": D("0.006"), "pv_child_abatement": D("0.0025"),
           "bbg_rv": 96600, "bbg_rv_ost": None, "bbg_kv": 66150, "bezugsgroesse": 44940, "bezugsgroesse_ost": None,
           "pv_employee_saxony": D("0.023"), "pv_employer_saxony": D("0.013")},
    2026: {"rv_rate": D("0.186"), "alv_rate": D("0.026"), "kv_rate": D("0.146"), "kv_zusatz_avg": D("0.029"),
           "pv_rate": D("0.036"), "pv_childless": D("0.006"), "pv_child_abatement": D("0.0025"),
           "bbg_rv": 101400, "bbg_rv_ost": None, "bbg_kv": 69750, "bezugsgroesse": 47460, "bezugsgroesse_ost": None,
           "pv_employee_saxony": D("0.023"), "pv_employer_saxony": D("0.013")},
}
YEARS = [2024, 2025, 2026]
EXAMPLE_WAGES = [12000, 20000, 30000, 45000, 60000, 80000, 100000, 150000]

# Übergangsbereich (Midijob), § 20 Abs. 2 and 2a SGB IV: monthly wages above the Geringfügigkeitsgrenze G up to
# 2 000 EUR pay contributions on reduced bases. G = minimum wage × 130 / 3, rounded up to the full euro (§ 8 Abs. 1a
# SGB IV); F = 28 % ÷ the year's total contribution rate (§ 20 Abs. 2a S. 2-3 SGB IV), announced to 4 decimals by the BMAS.
MIDIJOB_UPPER = 2000  # EUR per month, § 20 Abs. 2 SGB IV
MINIMUM_WAGE = {2024: D("12.41"), 2025: D("12.82"), 2026: D("13.90")}  # § 1 MiLoV4 / MiLoV5 (EUR per hour)
MINIMUM_WAGE_REF = {2024: ("milov4_1.html", "Nr. 1: ab 1. Januar 2024 12,41 Euro"), 2025: ("milov4_1.html", "Nr. 2: ab 1. Januar 2025 12,82 Euro"), 2026: ("milov5_1.html", "Nr. 1: ab 1. Januar 2026 13,90 Euro")}
WAGES = "gesetze_im_internet_wages"


def geringfuegigkeitsgrenze(year: int) -> int:
    return int((MINIMUM_WAGE[year] * 130 / 3).to_integral_value(rounding=ROUND_UP))


def total_contribution_rate(year: int) -> Decimal:
    p = SV[year]
    return p["rv_rate"] + p["alv_rate"] + p["kv_rate"] + p["kv_zusatz_avg"] + p["pv_rate"]


def faktor_f(year: int) -> Decimal:
    return (D("0.28") / total_contribution_rate(year)).quantize(D("0.0001"), rounding=ROUND_HALF_UP)


def midijob_bases(monthly: Decimal, year: int) -> tuple[Decimal, Decimal] | None:
    """(BE, BE_AN) in EUR per month for a wage inside the Übergangsbereich, else None. Exact rational arithmetic,
    each base rounded half-up to the cent (the TypeScript engine does the same in integer cents)."""
    g = geringfuegigkeitsgrenze(year)
    if not (g < monthly <= MIDIJOB_UPPER):
        return None
    f = Fraction(faktor_f(year))
    u, gg, ae = Fraction(MIDIJOB_UPPER), Fraction(g), Fraction(monthly)
    be_an = u / (u - gg) * (ae - gg)
    be = f * gg + (u / (u - gg) - gg / (u - gg) * f) * (ae - gg)
    cent = lambda x: (Decimal(x.numerator) / Decimal(x.denominator)).quantize(D("0.01"), rounding=ROUND_HALF_UP)  # noqa: E731
    return cent(be), cent(be_an)


# --------------------------------------------------------------------------------------------------
# (a) § 32a EStG tariff
# --------------------------------------------------------------------------------------------------
def tariff(zve: Decimal | int, year: int) -> Decimal:
    """Tarifliche Einkommensteuer for a taxable income (§ 32a Abs. 1 EStG), with the statute's rounding:
    income floored to full euros (S. 1), y/z as ten-thousandths (S. 3, 4), result floored to full euros (S. 6)."""
    t = TARIFF[year]
    x = floor_eur(D(zve))
    if x <= t["gfb"]:
        return ZERO
    if x <= t["z2_top"]:
        y = (x - t["gfb"]) / D(10000)
        return floor_eur((t["a2"] * y + t["b2"]) * y)
    if x <= t["z3_top"]:
        z = (x - t["z2_top"]) / D(10000)
        return floor_eur((t["a3"] * z + t["b3"]) * z + t["c3"])
    if x <= t["z4_top"]:
        return floor_eur(t["r4"] * x - t["c4"])
    return floor_eur(t["r5"] * x - t["c5"])


# --------------------------------------------------------------------------------------------------
# (b) Jahreslohnsteuer, tax class I/IV, no children, no church tax (§ 39b Abs. 2 EStG as in the PAP)
# --------------------------------------------------------------------------------------------------
def vorsorgepauschale(wage: Decimal, year: int, childless: bool, saxony: bool = False, stkl: int = 1) -> dict:
    """Vorsorgepauschale (§ 39b Abs. 2 S. 5 Nr. 3 EStG). Employee insured in all branches (KRV=0, PKV=0, ALV=0).
    2024/2025: RV share + max(KV+PV share, min(12 % of wage, 1 900)) [PAP UPEVP/MVSP].
    2026:      RV share + KV+PV share, or if higher RV share + min(KV+PV+ALV share, 1 900) [PAP UPEVP/MVSPKVPV/MVSPHB]."""
    p = SV[year]
    rv_an = p["rv_rate"] / 2
    kv_an = KV_REDUCED_RATE / 2 + p["kv_zusatz_avg"] / 2  # § 39b Abs. 2 S. 5 Nr. 3 b: ermäßigter Beitragssatz (§ 243 SGB V), not 14.6 %
    pv_an = (p["pv_employee_saxony"] if saxony else p["pv_rate"] / 2) + (p["pv_childless"] if childless else ZERO)
    base_rv = min(wage, D(p["bbg_rv"]))
    base_kv = min(wage, D(p["bbg_kv"]))
    vsp_rv = floor_cent(base_rv * rv_an)
    vsp_kvpv = floor_cent(base_kv * (kv_an + pv_an))
    vsp = ceil_eur(vsp_kvpv + vsp_rv)
    if year <= 2025:
        vsp_min = min(floor_cent(base_rv * D("0.12")), D(VORSORGE_MIN_CAP[3 if stkl == 3 else 1]))
        vspn = ceil_eur(vsp_rv + vsp_min)
        rule = "rv + max(kv+pv, min(12% wage, 1900))"
    else:
        vsp_alv = floor_cent(base_rv * p["alv_rate"] / 2)
        vsphb = min(floor_cent(vsp_alv + vsp_kvpv), D(VORSORGE_ALV_CAP))
        vspn = ceil_eur(vsp_rv + vsphb)
        rule = "rv + max(kv+pv, min(kv+pv+alv, 1900))"
    return {"rv": vsp_rv, "kv_pv": vsp_kvpv, "alternative": vspn, "total": max(vsp, vspn), "rule": rule}


def lohnsteuer(wage: Decimal | int, year: int, childless: bool = True, saxony: bool = False) -> dict:
    """Annual wage tax, Steuerklasse I (= IV without children), no church tax, no Freibeträge, employee insured
    in all social-insurance branches. Returns the intermediate amounts as well (PAP variable names in notes)."""
    w = D(wage).quantize(D("0.01"))
    anp = D(min(ARBEITNEHMER_PAUSCHBETRAG, ceil_eur(w)))  # ZTABFB: ANP (capped at the wage) + SAP
    sap = D(SONDERAUSGABEN_PAUSCHBETRAG)
    vsp = vorsorgepauschale(w, year, childless, saxony)
    zve = w - anp - sap - vsp["total"]
    x = floor_eur(zve) if zve >= 1 else ZERO
    st = tariff(x, year)
    return {"wage": w, "arbeitnehmer_pauschbetrag": anp, "sonderausgaben_pauschbetrag": sap,
            "vorsorgepauschale": vsp["total"], "vorsorgepauschale_parts": vsp, "zve": x, "lohnsteuer": st}


# --------------------------------------------------------------------------------------------------
# (c) Solidaritätszuschlag (§ 3 Abs. 3, § 4 SolzG) on the annual wage tax, classes I/II/IV–VI
# --------------------------------------------------------------------------------------------------
def soli(jahreslohnsteuer: Decimal, year: int) -> Decimal:
    frei = D(SOLI[year]["freigrenze"])
    if jahreslohnsteuer <= frei:
        return ZERO
    full = floor_cent(jahreslohnsteuer * SOLI_RATE)
    milder = floor_cent((jahreslohnsteuer - frei) * SOLI_MILDERUNG)
    return min(full, milder)


# --------------------------------------------------------------------------------------------------
# (d) Social contributions with ceilings (annual; employee and employer side)
# --------------------------------------------------------------------------------------------------
def contributions(wage: Decimal | int, year: int, childless: bool = True, saxony: bool = False) -> dict:
    p = SV[year]
    w = D(wage)
    pv_an = (p["pv_employee_saxony"] if saxony else p["pv_rate"] / 2) + (p["pv_childless"] if childless else ZERO)
    pv_ag = p["pv_employer_saxony"] if saxony else p["pv_rate"] / 2
    monthly = round_cent(w / 12)  # steady monthly wage (the Übergangsbereich is defined per month)
    bases = midijob_bases(monthly, year)
    if bases is not None:
        # § 20 Abs. 2a SGB IV: the total contribution is due on BE, the employee's share on BE_AN; the employer pays
        # the rest. The childless surcharge is the employee's alone and follows the employee base (§ 58 Abs. 1 S. 3 SGB XI).
        be, be_an = bases
        surcharge = p["pv_childless"] if childless else ZERO
        kv_total = p["kv_rate"] + p["kv_zusatz_avg"]
        emp_m = {"rv": round_cent(be_an * p["rv_rate"] / 2), "alv": round_cent(be_an * p["alv_rate"] / 2),
                 "kv": round_cent(be_an * kv_total / 2), "pv": round_cent(be_an * pv_an)}
        total_m = {"rv": round_cent(be * p["rv_rate"]), "alv": round_cent(be * p["alv_rate"]),
                   "kv": round_cent(be * kv_total), "pv": round_cent(be * p["pv_rate"]) + round_cent(be_an * surcharge)}
        emp = {k: v * 12 for k, v in emp_m.items()}
        er = {k: (total_m[k] - emp_m[k]) * 12 for k in emp_m}
        return {"employee": emp, "employer": er, "base_rv_alv": be * 12, "base_kv_pv": be * 12, "uebergangsbereich": True}
    base_rv = min(w, D(p["bbg_rv"]))
    base_kv = min(w, D(p["bbg_kv"]))
    emp = {"rv": round_cent(base_rv * p["rv_rate"] / 2), "alv": round_cent(base_rv * p["alv_rate"] / 2),
           "kv": round_cent(base_kv * (p["kv_rate"] / 2 + p["kv_zusatz_avg"] / 2)), "pv": round_cent(base_kv * pv_an)}
    er = {"rv": round_cent(base_rv * p["rv_rate"] / 2), "alv": round_cent(base_rv * p["alv_rate"] / 2),
          "kv": round_cent(base_kv * (p["kv_rate"] / 2 + p["kv_zusatz_avg"] / 2)), "pv": round_cent(base_kv * pv_ag)}
    return {"employee": emp, "employer": er, "base_rv_alv": base_rv, "base_kv_pv": base_kv, "uebergangsbereich": False}


def payslip(wage: int, year: int, childless: bool = True, saxony: bool = False) -> dict:
    lst = lohnsteuer(wage, year, childless, saxony)
    sz = soli(lst["lohnsteuer"], year)
    c = contributions(wage, year, childless, saxony)
    emp_sv = sum(c["employee"].values())
    taxes = lst["lohnsteuer"] + sz
    net = D(wage) - taxes - emp_sv
    er_sv = sum(c["employer"].values())
    total_cost = D(wage) + er_sv
    f = lambda x: float(x)  # noqa: E731
    per100 = lambda x: round(float(x) / wage * 100, 2)  # noqa: E731
    return {
        "gross": wage,
        "deductions_employee": {"lohnsteuer": f(lst["lohnsteuer"]), "soli": f(sz), **{k: f(v) for k, v in c["employee"].items()}},
        "employer_contributions": {k: f(v) for k, v in c["employer"].items()},
        "totals": {"taxes": f(taxes), "social_employee": f(emp_sv), "social_employer": f(er_sv), "net": f(net),
                   "employer_total_cost": f(total_cost)},
        "effective_rates": {"lohnsteuer_pct": per100(lst["lohnsteuer"]), "soli_pct": per100(sz), "social_employee_pct": per100(emp_sv),
                            "deductions_total_pct": per100(taxes + emp_sv), "net_pct": per100(net),
                            "social_employer_pct_of_gross": per100(er_sv)},
        "per_100_gross": {"lohnsteuer": per100(lst["lohnsteuer"]), "soli": per100(sz), "rv": per100(c["employee"]["rv"]),
                          "alv": per100(c["employee"]["alv"]), "kv": per100(c["employee"]["kv"]), "pv": per100(c["employee"]["pv"]),
                          "net": per100(net)},
        "intermediate": {"arbeitnehmer_pauschbetrag": f(lst["arbeitnehmer_pauschbetrag"]), "sonderausgaben_pauschbetrag": f(lst["sonderausgaben_pauschbetrag"]),
                         "vorsorgepauschale": f(lst["vorsorgepauschale"]), "vorsorgepauschale_rv": f(lst["vorsorgepauschale_parts"]["rv"]),
                         "vorsorgepauschale_kv_pv": f(lst["vorsorgepauschale_parts"]["kv_pv"]), "vorsorgepauschale_rule": lst["vorsorgepauschale_parts"]["rule"],
                         "zu_versteuernder_jahresbetrag": f(lst["zve"]), "contribution_base_rv_alv": f(c["base_rv_alv"]), "contribution_base_kv_pv": f(c["base_kv_pv"]),
                         "uebergangsbereich": c["uebergangsbereich"]},
    }


# --------------------------------------------------------------------------------------------------
# Extract: class-I column of the PAP Prüftabellen (cached PDFs → committed CSV with page coordinates)
# --------------------------------------------------------------------------------------------------
def extract_prueftabellen() -> None:
    import pypdf  # only needed for --extract
    rows = []
    for year in YEARS:
        pdf = CACHE / PAP / PAP_FILE[year]
        page = PAP_PRUEFTABELLE_PAGE[year]
        text = pypdf.PdfReader(pdf).pages[page - 1].extract_text()
        assert "Prüftabelle" in text, f"{pdf} page {page} is not the Prüftabelle"
        kvz = re.search(r"KVZ = (\d,\d\d)", text).group(1).replace(",", ".")
        for m in re.finditer(r"^(\d{1,3}\.\d{3}) (\S+) (\S+) (\S+) (\S+) (\S+) (\S+)\s*$", text, re.M):
            gross = int(m.group(1).replace(".", ""))
            vals = [int(v.replace(".", "")) for v in m.groups()[1:]]
            rows.append([year, gross, *vals, kvz, PAP_FILE[year], f"page {page}, row '{m.group(1)}'"])
    write_csv(EXTRACT_CSV, ["year", "gross_annual_eur", "lst_I", "lst_II", "lst_III", "lst_IV", "lst_V", "lst_VI", "kvz_pct", "file", "coordinates"], rows, base=EXTRACTS)


def load_prueftabellen() -> list[dict]:
    with (EXTRACTS / EXTRACT_CSV).open(encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


# --------------------------------------------------------------------------------------------------
# Checks (fail loudly)
# --------------------------------------------------------------------------------------------------
def check_tariff(year: int) -> dict:
    t = TARIFF[year]
    assert tariff(t["gfb"], year) == 0 and tariff(t["gfb"] + 1, year) >= 0
    # the law's constants make the tariff continuous at every zone boundary: the two formulas differ by < 1 EUR
    gaps = {}
    for lo_key, hi_fn in (("z2_top", lambda x: (t["a3"] * ((x - t["z2_top"]) / D(10000)) + t["b3"]) * ((x - t["z2_top"]) / D(10000)) + t["c3"]),
                          ("z3_top", lambda x: t["r4"] * x - t["c4"]),
                          ("z4_top", lambda x: t["r5"] * x - t["c5"])):
        x = D(t[lo_key])
        gaps[lo_key] = float(abs(hi_fn(x) - tariff(x, year)))
        assert gaps[lo_key] < 1.0, f"{year}: tariff discontinuous at {lo_key} ({gaps[lo_key]})"
    # the marginal rate at the top of zone 3 is 42 % and at the top of zone 4 is 45 % (within 1 EUR per 100 EUR)
    m3 = (tariff(t["z3_top"], year) - tariff(t["z3_top"] - 100, year)) / 100
    m4 = (tariff(t["z4_top"] + 100, year) - tariff(t["z4_top"], year)) / 100
    assert D("0.41") <= m3 <= D("0.43") and D("0.44") <= m4 <= D("0.46"), (year, m3, m4)
    return {"grundfreibetrag_gives_zero": True, "boundary_floor_effect_eur": gaps, "boundary_floor_effect_note": "next-zone formula minus the floored current-zone value at each boundary (shows the 1-EUR flooring, not formula continuity; formula-vs-formula gaps are 0.002 / 0.067 / 0.000 EUR per review B)", "marginal_rate_top_zone3": float(m3), "marginal_rate_top_zone4": float(m4)}


def check_prueftabelle(rows: list[dict]) -> dict:
    report = {}
    for year in YEARS:
        yrows = [r for r in rows if int(r["year"]) == year]
        kvz = {r["kvz_pct"] for r in yrows}
        assert len(kvz) == 1 and D(next(iter(kvz))) == SV[year]["kv_zusatz_avg"] * 100, f"{year}: PAP KVZ {kvz} differs from the statutory average used"
        bad = []
        for r in yrows:
            ours = lohnsteuer(int(r["gross_annual_eur"]), year, childless=True)["lohnsteuer"]
            if int(ours) != int(r["lst_I"]):
                bad.append((r["gross_annual_eur"], int(ours), int(r["lst_I"])))
            assert r["lst_I"] == r["lst_IV"], "class IV without children must equal class I"
        if bad:
            for b in bad[:10]:
                print(f"  MISMATCH {year} gross {b[0]}: ours {b[1]} vs PAP Prüftabelle {b[2]}")
            raise SystemExit(f"{year}: {len(bad)} Prüftabelle mismatches")
        report[str(year)] = {"rows_compared": len(yrows), "max_abs_diff_eur": 0, "gross_range": [min(int(r["gross_annual_eur"]) for r in yrows), max(int(r["gross_annual_eur"]) for r in yrows)],
                             "kvz_pct_assumed_by_pap": sorted(kvz)[0], "pvz": 1, "source": source_ref(PAP, PAP_FILE[year], f"page {PAP_PRUEFTABELLE_PAGE[year]}, Prüftabelle, column I")}
        print(f"  {year}: {len(yrows)} Prüftabelle rows reproduced exactly (class I)")
    return report


# --------------------------------------------------------------------------------------------------
# Output
# --------------------------------------------------------------------------------------------------
def P(value, unit, de, en, legal_basis, ref, status="statute", note=None):
    d = {"value": value, "unit": unit, "label": {"de": de, "en": en}, "legal_basis": legal_basis, "source_ref": ref, "status": status}
    if note:
        d["note"] = note
    return d


def build_parameters(tariff_checks: dict) -> dict:
    ref_32a = {2024: source_ref("bmf_steuerrechner", "tarifhistorie.pdf", f"page {TARIFHISTORIE_PAGE[2024]}, 'Einkommensteuertarif 2024'; corroborated by PAP Dez-2024 page {PAP_TARIFF_PAGE[2024]} (UPTAB24N)"),
               2025: source_ref("bmf_steuerrechner", "tarifhistorie.pdf", f"page {TARIFHISTORIE_PAGE[2025]}, 'Einkommensteuertarif 2025'; corroborated by PAP 2025 page {PAP_TARIFF_PAGE[2025]} (UPTAB25) and Lohnsteuer2025.xml method UPTAB25"),
               2026: source_ref(GII, "estg_32a.html", "§ 32a Abs. 1 S. 2 Nr. 1-5 (version in force, 'ab dem Veranlagungszeitraum 2026')")}
    ref_pap_param = {y: source_ref(PAP, PAP_FILE[y], f"page {PAP_PARAM_PAGE[y]}, MPARA") for y in YEARS}
    ref_pap_param[2024] = source_ref(PAP, PAP_FILE[2024], "page 15 (GFB = 11784, SOLZFREI = 18130 after the Existenzminimum 2024 law) and page 16, MPARA")
    ref_zb = {2024: source_ref("bundesanzeiger_zusatzbeitrag", "BAnz_AT_31.10.2023_B3.pdf", "page 1, Bekanntmachung vom 16.10.2023: 1,7 Prozent"),
              2025: source_ref("gkv_spitzenverband_zusatzbeitrag", "zusatzbeitragssatz.html", "paragraph 'Das Bundesgesundheitsministerium legt ... fest': 2,5 Prozent im Jahr 2025"),
              2026: source_ref("bundesanzeiger_zusatzbeitrag", "BAnz_AT_10.11.2025_B7.pdf", "page 1, Bekanntmachung vom 07.11.2025: 2,9 Prozent")}
    ref_bbg_rv = source_ref(GIIP, "sgb6_anlage_2.html", "table rows 1.1.2024-31.12.2024 (90 600), 1.1.2025-31.12.2025 (96 600), 1.1.2026-31.12.2026 (101 400), column 'Allgemeine Rentenversicherung'")
    ref_bbg_kv = {2024: source_ref(GIIP, "svbezgrv_2024_2.html", "§ 2 Abs. 2: 62 100 Euro / 5 175 Euro"),
                  2025: source_ref(GIIP, "svbezgrv_2025_2.html", "§ 2 Abs. 2: 66 150 Euro / 5 512,50 Euro"),
                  2026: source_ref(GII, "svbezgrv_2026_2.html", "§ 2 Abs. 2: 69 750 Euro / 5 812,50 Euro")}
    ref_bezug = {2024: source_ref(GIIP, "svbezgrv_2024_1.html", "§ 1 Abs. 1: 42 420 Euro (West), Abs. 2: 41 580 Euro (Ost)"),
                 2025: source_ref(GIIP, "svbezgrv_2025_1.html", "§ 1: 44 940 Euro"),
                 2026: source_ref(GII, "svbezgrv_2026_1.html", "§ 1: 47 460 Euro")}
    ref_pv = {2024: source_ref(GII, "sgb11_55.html", "§ 55 Abs. 1 S. 1: 3,4 Prozent (statutory base rate; in force unchanged during 2024)"),
              2025: source_ref(GIIP, "pbav_2025_1.html", "§ 1 Abs. 1: 3,6 Prozent zum 1. Januar 2025"),
              2026: source_ref(GIIP, "pbav_2025_1.html", "§ 1 Abs. 1: 3,6 Prozent (continues; no later adjustment at retrieval)")}
    ref_rv_rate = {2024: source_ref(GIIP, "bsv_2018_1.html", "§ 1: 18,6 Prozent (set for 2018; continued by annual Bekanntmachung under § 158 Abs. 4 SGB VI)"),
                   2025: source_ref("drv_finanzen", "aktuelle_daten.pdf", "page 2, 'Beitragssatz (allg. RV) 2025 18,6'"),
                   2026: source_ref(GIIP, "rvbeitrsbek_2026.html", "'Der Beitragssatz für das Jahr 2026 beträgt weiterhin in der allgemeinen Rentenversicherung 18,6 Prozent' (BGBl. 2025 I Nr. 291)")}
    years = {}
    for y in YEARS:
        t, s = TARIFF[y], SV[y]
        pct = lambda d: float(d * 100)  # noqa: E731
        years[str(y)] = {
            "tariff": {
                "grundfreibetrag": P(t["gfb"], "EUR", "Grundfreibetrag", "Basic allowance", "§ 32a Abs. 1 S. 2 Nr. 1 EStG", ref_32a[y]),
                "zones": [
                    {"zone": 1, "from": 0, "to": t["gfb"], "formula": "0", "label": {"de": "Nullzone", "en": "Zero zone"}},
                    {"zone": 2, "from": t["gfb"] + 1, "to": t["z2_top"], "formula": f"({t['a2']} * y + {t['b2']}) * y", "y": f"(x - {t['gfb']}) / 10000",
                     "label": {"de": "Erste Progressionszone (14 % → ~24 %)", "en": "First progressive zone (14 % → ~24 %)"}},
                    {"zone": 3, "from": t["z2_top"] + 1, "to": t["z3_top"], "formula": f"({t['a3']} * z + {t['b3']}) * z + {t['c3']}", "z": f"(x - {t['z2_top']}) / 10000",
                     "label": {"de": "Zweite Progressionszone (~24 % → 42 %)", "en": "Second progressive zone (~24 % → 42 %)"}},
                    {"zone": 4, "from": t["z3_top"] + 1, "to": t["z4_top"], "formula": f"{t['r4']} * x - {t['c4']}", "label": {"de": "Proportionalzone 42 %", "en": "Proportional zone 42 %"}},
                    {"zone": 5, "from": t["z4_top"] + 1, "to": None, "formula": f"{t['r5']} * x - {t['c5']}", "label": {"de": "Proportionalzone 45 % („Reichensteuer“)", "en": "Proportional zone 45 %"}},
                ],
                "rounding": "x = taxable income floored to full euros; y, z = ten-thousandths of the part above the zone's lower bound; result floored to full euros (§ 32a Abs. 1 S. 1, 3-6 EStG)",
                "legal_basis": "§ 32a Abs. 1 EStG" + {2024: " i.d.F. des Gesetzes zur steuerlichen Freistellung des Existenzminimums 2024 (BGBl. 2024 I Nr. 386; applies to the whole year 2024, in payroll from December 2024)",
                                                      2025: " i.d.F. des Steuerfortentwicklungsgesetzes (BGBl. 2024 I Nr. 449)", 2026: " (version in force at retrieval)"}[y],
                "source_ref": ref_32a[y],
                "status": "statute",
                **({"note": f"January-November 2024 payroll used the earlier 2024 tariff (Grundfreibetrag {TARIFF_2024_JAN_NOV['gfb']}, zone 2 coefficient {TARIFF_2024_JAN_NOV['a2']}, zone 3 constant {TARIFF_2024_JAN_NOV['c3']}, zone 4 constant {TARIFF_2024_JAN_NOV['c4']}, zone 5 constant {TARIFF_2024_JAN_NOV['c5']}; PAP 2024 of 03.11.2023, page 39); the December 2024 PAP recomputes the year with the new tariff, which is what the assessment for 2024 applies."} if y == 2024 else {}),
            },
            "soli": {
                "rate": P(5.5, "% of wage tax", "Solidaritätszuschlag", "Solidarity surcharge rate", "§ 4 S. 1 SolzG 1995", source_ref(GII, "solzg_4.html", "S. 1: 5,5 Prozent")),
                "freigrenze": P(SOLI[y]["freigrenze"], "EUR of annual wage tax", "Freigrenze (Steuerklassen I, II, IV-VI)", "Exemption threshold (classes I, II, IV-VI)",
                                "§ 3 Abs. 3 S. 1 Nr. 2, Abs. 5 SolzG 1995",
                                source_ref(GII, "solzg_3.html", "Abs. 3 Nr. 2: 20 350 Euro (version in force 2026)") if y == 2026 else ref_pap_param[y],
                                note=None if y == 2026 else f"Value for {y} taken from the PAP constant SOLZFREI; the statute page shows only the 2026 amount."),
                "milderungszone_factor": P(11.9, "% of (wage tax - Freigrenze)", "Milderungszone: Höchstsatz", "Phase-in cap", "§ 4 S. 2 SolzG 1995", source_ref(GII, "solzg_4.html", "S. 2: nicht mehr als 11,9 Prozent des Unterschiedsbetrages")),
                "rounding": "cents are truncated (§ 4 S. 3 SolzG; PAP MSOLZ setScale(2, ROUND_DOWN))",
            },
            "wage_tax_allowances": {
                "arbeitnehmer_pauschbetrag": P(ARBEITNEHMER_PAUSCHBETRAG, "EUR", "Arbeitnehmer-Pauschbetrag", "Employee lump-sum allowance", "§ 9a S. 1 Nr. 1 a EStG; § 39b Abs. 2 S. 5 Nr. 1 EStG", source_ref(GIIP, "estg_9a.html", "S. 1 Nr. 1 a: 1 230 Euro")),
                "sonderausgaben_pauschbetrag": P(SONDERAUSGABEN_PAUSCHBETRAG, "EUR", "Sonderausgaben-Pauschbetrag", "Special-expenses lump sum", "§ 10c S. 1 EStG; § 39b Abs. 2 S. 5 Nr. 2 EStG", source_ref(GIIP, "estg_10c.html", "S. 1: 36 Euro")),
                "vorsorgepauschale": {
                    "rule": {2024: "RV part (employee share of the pension contribution, ceiling BBG RV) + the higher of (i) the employee share of KV (reduced-rate 7.0 % + half the Zusatzbeitrag) and PV (incl. childless surcharge) on the wage up to the KV ceiling and (ii) 12 % of the wage, at most 1 900 EUR (3 000 EUR in class III).",
                             2025: "RV part (employee share of the pension contribution, ceiling BBG RV) + the higher of (i) the employee share of KV (reduced-rate 7.0 % + half the Zusatzbeitrag) and PV (incl. childless surcharge) on the wage up to the KV ceiling and (ii) 12 % of the wage, at most 1 900 EUR (3 000 EUR in class III).",
                             2026: "RV part (employee share, ceiling BBG RV/ALV) + the higher of (i) the employee share of KV (7.0 % + half the Zusatzbeitrag) and PV (incl. childless surcharge) on the wage up to the KV ceiling and (ii) that KV/PV share plus the employee share of the unemployment contribution (1.3 % up to BBG RV/ALV), together capped at 1 900 EUR. The 12 % minimum check no longer exists."}[y],
                    "legal_basis": "§ 39b Abs. 2 S. 5 Nr. 3 EStG" + (" (version applicable to 2024/2025; see PAP UPEVP/MVSP)" if y <= 2025 else " lit. a-c, e (version in force; PAP UPEVP/MVSPKVPV/MVSPHB)"),
                    "source_ref": source_ref(GII, "estg_39b.html", "Abs. 2 S. 5 Nr. 3 (version in force 2026)") if y == 2026 else source_ref(PAP, PAP_FILE[y], "pages 27-28 (UPEVP, MVSP): VSP2 = 0,12 * ZRE4VP, VHB = 1900/3000"),
                    "kv_rate_used": P(7.0, "% (employee half of the reduced rate)", "KV-Satz in der Vorsorgepauschale", "Health rate used in the lump sum", "§ 39b Abs. 2 S. 5 Nr. 3 b EStG → § 243 SGB V (14,0 %)", source_ref(GIIP, "sgb5_243.html", "S. 3: 14,0 Prozent")),
                    "zusatzbeitrag_used": P(pct(s["kv_zusatz_avg"]), "%", "Zusatzbeitragssatz (angenommen: Durchschnitt nach § 242a SGB V)", "Additional contribution assumed (statutory average; the law uses the employee's own insurer's rate)", "§ 39b Abs. 2 S. 5 Nr. 3 b EStG uses the employee's own Krankenkasse rate (§ 242 SGB V); here the § 242a average is used, as the PAP Prüftabelle does (KVZ). With the 3.13 % actually levied on average (BMG, 1 April 2026) the 45,000 example shifts by −16 EUR wage tax and +52 EUR KV contribution.", ref_zb[y], status="statute" if y != 2025 else "secondary"),
                    "rounding": "part amounts truncated to cents; total rounded up to full euros (PAP UPEVP/MVSP; § 39b Abs. 2 S. 5 Nr. 3 EStG via Programmablaufplan, § 39b Abs. 6 EStG)",
                    "status": "statute",
                },
            },
            "social_insurance": {
                "rv": {"rate_total": P(pct(s["rv_rate"]), "% of wage up to ceiling", "Rentenversicherung Beitragssatz", "Pension insurance rate", "§ 158 SGB VI; Beitragssatzverordnung 2018; RVBeitrSBek", ref_rv_rate[y], status="statute" if y != 2025 else "secondary", note=None if y != 2025 else "2025 continuation taken from the DRV 'Aktuelle Daten' table (secondary); the Bekanntmachung for 2025 (BGBl.) was not fetched."),
                       "employee_share": pct(s["rv_rate"] / 2), "employer_share": pct(s["rv_rate"] / 2), "split_basis": "§ 168 Abs. 1 Nr. 1 SGB VI (je zur Hälfte)", "split_ref": source_ref(GIIP, "sgb6_168.html", "Abs. 1 Nr. 1"),
                       "ceiling_annual": P(s["bbg_rv"], "EUR", "Beitragsbemessungsgrenze RV (West)" if y == 2024 else "Beitragsbemessungsgrenze RV", "Contribution ceiling, pension", "§ 159 SGB VI, Anlage 2 SGB VI; SVBezGrV", ref_bbg_rv),
                       "ceiling_monthly": s["bbg_rv"] / 12,
                       **({"ceiling_annual_east": P(s["bbg_rv_ost"], "EUR", "Beitragsbemessungsgrenze RV (Ost)", "Contribution ceiling, pension (East)", "Anlage 2a SGB VI (2024, last year of the East/West distinction)", source_ref(PAP, PAP_FILE[2024], "page 16, MPARA: BBGRV = 89400 (KRV < 2 / East)"), note="Examples use the West ceiling, as the PAP Prüftabelle does.")} if s["bbg_rv_ost"] else {})},
                "alv": {"rate_total": P(pct(s["alv_rate"]), "% of wage up to ceiling", "Arbeitslosenversicherung Beitragssatz", "Unemployment insurance rate", "§ 341 Abs. 2 SGB III", source_ref(GII, "sgb3_341.html", "Abs. 2: 2,6 Prozent")),
                        "employee_share": pct(s["alv_rate"] / 2), "employer_share": pct(s["alv_rate"] / 2), "split_basis": "§ 346 Abs. 1 SGB III (je zur Hälfte)", "split_ref": source_ref(GIIP, "sgb3_346.html", "Abs. 1 S. 1"),
                        "ceiling": "same as pension insurance (§ 341 Abs. 4 SGB III)"},
                "kv": {"rate_general": P(pct(s["kv_rate"]), "% of wage up to ceiling", "Allgemeiner Beitragssatz GKV", "General health insurance rate", "§ 241 SGB V", source_ref(GII, "sgb5_241.html", "14,6 Prozent")),
                       "zusatzbeitrag_average": P(pct(s["kv_zusatz_avg"]), "%", "Durchschnittlicher Zusatzbeitragssatz (§ 242a SGB V)", "Statutory average additional contribution", "§ 242a Abs. 2 SGB V, Bekanntmachung des BMG im Bundesanzeiger", ref_zb[y], status="statute" if y != 2025 else "secondary",
                                                  note="The actual Zusatzbeitrag depends on the Krankenkasse (§ 242 SGB V); the average actually levied is higher (BMG: 3.13 % as of 1 April 2026). " + ("The 2025 Bundesanzeiger notice could not be located by URL; the value is confirmed by the GKV-Spitzenverband page and by the PAP 2025 Prüftabelle (KVZ = 2,50)." if y == 2025 else "")),
                       "employee_share": pct(s["kv_rate"] / 2 + s["kv_zusatz_avg"] / 2), "employer_share": pct(s["kv_rate"] / 2 + s["kv_zusatz_avg"] / 2), "split_basis": "§ 249 Abs. 1 SGB V (je zur Hälfte, incl. Zusatzbeitrag)", "split_ref": source_ref(GIIP, "sgb5_249.html", "Abs. 1 S. 1"),
                       "ceiling_annual": P(s["bbg_kv"], "EUR", "Beitragsbemessungsgrenze KV/PV", "Contribution ceiling, health/care", "§ 6 Abs. 7 SGB V (Jahresarbeitsentgeltgrenze), SVBezGrV § 2 Abs. 2", ref_bbg_kv[y]), "ceiling_monthly": s["bbg_kv"] / 12},
                "pv": {"rate_total": P(pct(s["pv_rate"]), "% of wage up to KV ceiling", "Pflegeversicherung Beitragssatz", "Long-term care insurance rate", "§ 55 Abs. 1 S. 1 SGB XI" + ("" if y == 2024 else "; § 1 Abs. 1 PBAV 2025"), ref_pv[y]),
                       "childless_surcharge": P(pct(s["pv_childless"]), "percentage points, employee only, from age 23", "Beitragszuschlag für Kinderlose", "Childless surcharge", "§ 55 Abs. 3 S. 1 SGB XI; § 58 Abs. 1 S. 3 SGB XI (borne by the employee)", source_ref(GII, "sgb11_55.html", "Abs. 3 S. 1: 0,6 Beitragssatzpunkte")),
                       "child_abatement": P(pct(s["pv_child_abatement"]), "percentage points per child from the 2nd to the 5th (under 25), employee only", "Abschlag je Kind ab dem zweiten Kind", "Abatement per child (2nd-5th)", "§ 55 Abs. 3 S. 4 SGB XI", source_ref(GII, "sgb11_55.html", "Abs. 3 S. 4: 0,25 Beitragssatzpunkte je Kind ab dem zweiten bis zum fünften Kind")),
                       "employee_share": pct(s["pv_rate"] / 2), "employer_share": pct(s["pv_rate"] / 2), "split_basis": "§ 58 Abs. 1 S. 1 SGB XI (je zur Hälfte); surcharge: employee alone (S. 3)", "split_ref": source_ref(GIIP, "sgb11_58.html", "Abs. 1 S. 1 and S. 3"),
                       "saxony": {"employee_share": pct(s["pv_employee_saxony"]), "employer_share": pct(s["pv_employer_saxony"]), "legal_basis": "§ 58 Abs. 3 SGB XI (no public holiday abolished: employee bears 1 percentage point more)", "source_ref": source_ref(GIIP, "sgb11_58.html", "Abs. 3 S. 1, Abs. 5"), "pap_ref": source_ref(PAP, PAP_FILE[y], f"page {PAP_PARAM_PAGE[y]}, MPARA: PVS = 1 → PVSATZAN/PVSATZAG")},
                       "ceiling": "same as health insurance (§ 55 Abs. 2 SGB XI)"},
                "uebergangsbereich": {
                    "geringfuegigkeitsgrenze_monthly": P(geringfuegigkeitsgrenze(y), "EUR per month", "Geringfügigkeitsgrenze", "Marginal-employment threshold (lower end of the Übergangsbereich)", "§ 8 Abs. 1a SGB IV: minimum wage × 130 / 3, rounded up to the full euro", source_ref(GIIP, "sgb4_8.html", "Abs. 1a S. 2: 'mit 130 vervielfacht, durch drei geteilt und auf volle Euro aufgerundet'"), note=f"Minimum wage {MINIMUM_WAGE[y]} EUR/h ({MINIMUM_WAGE_REF[y][1]}, {MINIMUM_WAGE_REF[y][0]} in the wages source)"),
                    "upper_monthly": P(MIDIJOB_UPPER, "EUR per month", "Obere Grenze des Übergangsbereichs", "Upper end of the Übergangsbereich (Midijob)", "§ 20 Abs. 2 SGB IV", source_ref(GIIP, "sgb4_20.html", "Abs. 2: 'bis 2 000 Euro'")),
                    "faktor_f": P(float(faktor_f(y)), "factor", "Faktor F", "Factor F", "§ 20 Abs. 2a S. 2-3 SGB IV: 28 % ÷ total contribution rate (RV + ALV + KV incl. average Zusatzbeitrag + PV) of the year", source_ref(GIIP, "sgb4_20.html", "Abs. 2a S. 2-3: 'der Wert 28 Prozent geteilt wird durch den Gesamtsozialversicherungsbeitragssatz'"), note=f"Computed here as 0.28 / {total_contribution_rate(y)} rounded to 4 decimals; the BMAS Bundesanzeiger notice of the year was not fetched"),
                    "rule": "Monthly wage AE with G < AE <= 2 000: BE = F × G + (2000/(2000 − G) − G/(2000 − G) × F) × (AE − G) is the base of the total contribution; BE_AN = 2000/(2000 − G) × (AE − G) is the base of the employee's share; the employer pays the difference (§ 20 Abs. 2a SGB IV). The childless surcharge follows BE_AN. Wage tax is unaffected (the Vorsorgepauschale uses the wage). The engine assumes a steady monthly wage of gross / 12.",
                    "source_ref": source_ref(GIIP, "sgb4_20.html", "Abs. 2a (formulae)"),
                },
                "bezugsgroesse": P(s["bezugsgroesse"], "EUR per year", "Bezugsgröße (West)" if y == 2024 else "Bezugsgröße", "Reference value (§ 18 SGB IV)", "§ 18 SGB IV; SVBezGrV § 1", ref_bezug[y], note=(f"East: {s['bezugsgroesse_ost']} EUR (§ 1 Abs. 2 SVBezGrV 2024)" if s["bezugsgroesse_ost"] else None)),
                "cross_check": {"bmas_table_2026": source_ref("bmas_rechengroessen", "sv-rechengroessenverordnung-2026.html", "table rows 'Beitragsbemessungsgrenze in der Kranken- und Pflegeversicherung 5.812,50 / 69.750', 'allgemeine Rentenversicherung 8.450 / 101.400', 'Bezugsgröße 3.955 / 47.460'") if y == 2026 else None,
                                "pap_constants": ref_pap_param[y]},
            },
            "tariff_checks": tariff_checks[str(y)],
        }
    return years


def main() -> int:
    if "--extract" in sys.argv:
        extract_prueftabellen()
    print("tariff checks")
    tariff_checks = {str(y): check_tariff(y) for y in YEARS}
    print("Prüftabelle checks")
    rows = load_prueftabellen()
    pruef = check_prueftabelle(rows)

    years = build_parameters(tariff_checks)
    validation = {
        "method": "Every row of the class-I column of the BMF Prüftabelle ('Allgemeine maschinelle Jahreslohnsteuer', printed in each PAP) was recomputed with this engine; the build fails on any difference. The PAP tables assume an employee insured in all branches, PVZ = 1 (childless surcharge), contribution ceilings West, KVZ = the statutory average Zusatzbeitrag of the year. In addition the § 32a tariff was checked for 0 EUR at the Grundfreibetrag, continuity (< 1 EUR) at the three zone boundaries and marginal rates of 42 %/45 % at the top of zones 3/4. The BMF online calculator's programming interface could not be used (access code only shown behind an interactive consent dialog).",
        "prueftabelle": pruef,
        "extract": str(EXTRACTS.relative_to(EXTRACTS.parents[1]) / EXTRACT_CSV),
        "not_validated": ["Solidaritätszuschlag amounts (no official table found; formula follows § 4 SolzG and PAP MSOLZ exactly)", "Social-contribution cent rounding (payroll rounds per month; here annual base × rate rounded to the cent)", "Saxony PV split (implemented, not in the Prüftabelle)", "Übergangsbereich bases (formula of § 20 Abs. 2a SGB IV applied to gross / 12 per month; no official table fetched)"],
    }
    params = envelope(
        "de.citizen.payslip_parameters",
        "Gesetzliche Parameter der Lohnabrechnung 2024-2026", "Statutory payslip parameters 2024-2026", "EUR / %",
        "Statutory values for the annual wage-tax withholding (Steuerklasse I/IV, no children, no church tax) and the statutory social contributions of an employee insured in all branches. Values are the law of the year; 2024 tariff = after the retroactive Grundfreibetrag increase.",
        SCRIPT, years_covered=YEARS, years=years, validation=validation,
        status_legend={"statute": "taken from the statute/regulation text or an official notice (BGBl., Bundesanzeiger, BMF Programmablaufplan)", "secondary": "official value quoted by a non-statutory page; the primary notice was not fetched", "assumption": "a modelling choice of this project, not prescribed by law (e.g. using the statutory average Zusatzbeitrag instead of an insurer's own rate)"},
        review_notes=["2024/2025 § 32a constants and Soli Freigrenzen are taken from the BMF Programmablaufplan/Tarifhistorie (official BMF documents), not from the BGBl. text (review B).", "PV 3.6 % for 2026 rests on PBAV 2025 ('zum 1. Januar 2025') and the PAP 2026 constant; no 2026-specific notice (review B).", "First Soli euro for a single childless employee in 2026 at gross 92,396 EUR (review B).", "2024 rows use the whole-year December-2024 tariff (GFB 11,784); January-November payroll used 11,604."],
    )
    write_json("de/citizen/payslip-parameters.json", params)

    examples = {}
    for y in YEARS:
        examples[str(y)] = {"childless": [payslip(w, y, childless=True) for w in EXAMPLE_WAGES],
                            "with_child": [payslip(w, y, childless=False) for w in EXAMPLE_WAGES],
                            "saxony": [payslip(w, y, childless=True, saxony=True) for w in EXAMPLE_WAGES]}
    ex = envelope(
        "de.citizen.payslip_examples",
        "Beispielrechnungen: Brutto → Netto 2024-2026", "Worked examples: gross → net 2024-2026", "EUR per year",
        "ANNUAL WAGE-TAX WITHHOLDING for Steuerklasse I (identical to IV without children), no church tax, no children, no Freibeträge, employee compulsorily insured in all four social-insurance branches (West ceilings, statutory average Zusatzbeitrag). This is what the employer withholds over a year under the Programmablaufplan; the income-tax ASSESSMENT (Veranlagung) can differ (actual Werbungskosten, Sonderausgaben, the real Zusatzbeitrag of the Krankenkasse, other income). 'childless' = with the PV childless surcharge (age 23+, no children), outside Saxony; 'with_child' = one child (surcharge off, no abatement); 'saxony' = childless, employed in Saxony (§ 58 Abs. 3 SGB XI care split). Monthly wages above the Geringfügigkeitsgrenze up to 2 000 EUR (gross / 12) use the Übergangsbereich bases of § 20 Abs. 2a SGB IV.",
        SCRIPT, years_covered=YEARS, gross_wages=EXAMPLE_WAGES,
        fields={"deductions_employee": "amounts withheld from the gross wage", "employer_contributions": "paid by the employer on top of the gross wage (same rates as the employee, except the PV childless surcharge)",
                "effective_rates": "percent of gross", "per_100_gross": "of every 100 EUR gross: how much goes where", "intermediate": "PAP intermediate values (Vorsorgepauschale, zu versteuernder Jahresbetrag, contribution bases)"},
        parameters="data/de/citizen/payslip-parameters.json", validation=validation["prueftabelle"], years=examples,
    )
    write_json("de/citizen/payslip-examples.json", ex)
    for w in (45000, 60000):
        e = payslip(w, 2026)
        print(f"2026 gross {w}: {e['deductions_employee']} net {e['totals']['net']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
