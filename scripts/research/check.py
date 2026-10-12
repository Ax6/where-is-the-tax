#!/usr/bin/env python3
"""Cross-file reconciliation of data/. Fails (exit 1) on any hard check; prints soft comparisons with the
explanation of why two official sources legitimately differ. Run after build_all.py."""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import DATA  # noqa: E402

FAIL = 0


def load(rel: str) -> dict | None:
    p = DATA / rel
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else None


def hard(cond: bool, msg: str):
    global FAIL
    print(("ok   " if cond else "FAIL ") + msg)
    if not cond:
        FAIL += 1


def soft(msg: str):
    print("note " + msg)


def main():
    by_tax = load("de/taxes/by-tax.json")
    by_rec = load("de/taxes/by-recipient.json")
    tax = {r["id"]: r for r in by_tax["rows"]}
    rec = {r["id"]: r for r in by_rec["rows"]}

    # 1. Tax totals: pre-distribution total vs post-distribution total (same statistic, two tables)
    for y in ("2024", "2025"):
        pre, post = tax["STEUERNVINS10"]["values_eur"][y], rec["STEUERNVINS10"]["values_eur"][y]
        hard(abs(pre - post) / pre < 0.001, f"71211 total {y}: before {pre/1e9:.3f} bn vs after distribution {post/1e9:.3f} bn (diff {abs(pre-post)/1e6:.0f} Mio, < 0.1 %)")

    # 2. Federal tax revenue: Destatis after distribution vs BMF closing table (different definitions: BMF nets EU own resources etc. identically but books some positions differently)
    fed = load("de/federal/overview.json")
    if fed:
        for y in ("2024", "2025"):
            bmf = next((r for r in fed.get("rows", []) if r.get("id") == "steuereinnahmen"), None)
            des = rec["STEUERNVB10"]["values_eur"][y] / 1e6
            val = (bmf or {}).get("values", {}).get(y, {}).get("value_eur")
            if val is not None:
                soft(f"Bund tax revenue {y}: Destatis STEUERNVB10 {des:,.0f} Mio vs BMF Gesamtübersicht {val/1e6:,.0f} Mio (BMF footnote: methodological differences in booking EU own resources/compensations; diff {val/1e6-des:,.0f} Mio)")

    # 3. Equalisation vs Destatis positions (Länder VAT share, FKA) must agree to the thousand
    for y in ("2024", "2025"):
        eq = load(f"de/equalisation/{y}.json")
        if not eq:
            continue
        pool = eq["totals"]["vat"]["laender"]["value"]
        des = rec["STEUERNVL40"]["values_eur"][y]
        hard(abs(pool - des) < 1000, f"Länder VAT pool {y}: BMF {pool/1e6:,.3f} Mio vs Destatis STEUERNVL40 {des/1e6:,.3f} Mio")
        def fka_value(land: dict):
            for k, v in land.items():
                if isinstance(v, dict) and "fka" in k.lower():
                    for kk, vv in v.items():
                        if isinstance(vv, dict) and "value" in vv and ("adjust" in kk.lower() or "zuschlag" in kk.lower() or kk == "net"):
                            return vv["value"]
            return None
        vals = [fka_value(l) for l in eq["laender"]]
        if all(v is not None for v in vals):
            hard(abs(sum(vals)) <= 16 * 1000, f"FKA {y} nets to {sum(vals)/1e6:+,.3f} Mio across 16 Länder (source rounded to EUR thousand per Land)")

    # 4. COFOG consolidated total vs ESA main aggregate TE (same dataset family, must match)
    cofog = load("de/government/cofog.json")
    agg = load("de/government/aggregates.json")
    te = {r["id"]: r for r in agg["rows"]}["TE"]["values_meur"]
    ctot = next(r for r in cofog["rows"] if r["sector"] == "S13" and r["code"] == "TOTAL")["values_meur"]
    for y in ("2022", "2023", "2024"):
        hard(abs(ctot[y] - te[y]) < 1, f"ESA total expenditure {y}: COFOG S13 TOTAL {ctot[y]:,.0f} vs gov_10a_main TE {te[y]:,.0f} Mio")

    # 5. Cash vs ESA: Destatis Kassenstatistik Bereinigte Ausgaben (Gesamthaushalt) vs Eurostat TE — different bases, report only
    cash = load("de/government/cash-by-level.json")
    for y in (2024, 2025):
        row = next(r for r in cash["rows"] if r["year"] == y and r["label"]["de"] == "Ausgaben, Bereinigte Ausgaben")
        soft(f"{y}: cash Bereinigte Ausgaben (Gesamthaushalt, Kern+Extra) {row['values_meur']['gesamthaushalt']:,.0f} Mio vs ESA TE {te.get(str(y), float('nan')):,.0f} Mio — cash statistics vs accrual national accounts, different coverage (e.g. ESA includes hospitals/public enterprises classified in S13, imputed items); never mix")

    # 6. Social insurance contributions: ESA D61REC vs cash 'Steuern und steuerähnliche Abgaben' of the SV column
    d61 = {r["id"]: r for r in agg["rows"]}["D61REC"]["values_meur"]
    for y in (2024, 2025):
        row = next(r for r in cash["rows"] if r["year"] == y and r["label"]["de"].startswith("Einnahmen, Steuern und steuerähnliche"))
        soft(f"{y}: social-insurance receipts in cash statistics {row['values_meur']['sozialversicherung']:,.0f} Mio vs ESA net social contributions D61 {d61.get(str(y), float('nan')):,.0f} Mio (ESA includes imputed contributions e.g. for civil servants)")

    # 7. Federal budget: XML reconciles to BMF official total (hard, from the build output)
    for y in ("2024", "2025"):
        b = load(f"de/federal/budget-{y}.json")
        if b:
            br = b["bridge_result"]
            hard(br["ok"] and abs(br["residual_eur"]) <= 500_000, f"federal {y}: reconciled XML total {br['reconciled_eur']/1e6:,.1f} Mio vs BMF official {br['official_total_eur']/1e6:,.0f} Mio (residual {br['residual_eur']/1e6:+.3f} Mio)")

    # 8. Berlin: Destatis Land+municipal receipts vs Berlin's own account (different accounting moments: Berlin books cash received incl. settlements)
    bln = load("de/berlin/tax-receipts.json")
    land = load("de/taxes/by-land.json")
    for y in ("2024", "2025"):
        own = bln["years"][y]["total_eur"]
        d = land["laender"]["BE"]["years"][y]
        des_land_tax = (d.get("STEUERNVL20") or 0) + (d.get("STEUERNVL61") or 0) + (d.get("STEUERNVL70") or 0) + (d.get("STEUERARTL41") or 0) + (d.get("STEUERNVL40") or 0) + (d.get("STEUERNVL50") or 0)
        soft(f"Berlin {y}: own account {own/1e9:.3f} bn (Land shares + Land taxes + municipal taxes + municipal shares) vs Destatis Land-level after-distribution total {d['STEUERNVL10']/1e9:.3f} bn (includes FKA {d.get('STEUERNVL71',0)/1e9:.3f} and BEZ {d.get('STEUERNVL66',0)/1e9:.3f}) + municipal {d['STEUERNVK10']/1e9:.3f} bn")

    # 9. Population present for per-capita framings
    pop = load("de/population.json")
    hard(pop["germany"].get("2024") and pop["germany"].get("2025"), f"population 2024 {pop['germany'].get('2024'):,} / 2025 {pop['germany'].get('2025'):,}")

    # 10. Social insurance file (if built): payroll view components sum
    soc = load("de/social-insurance/accounts.json")
    if soc:
        pv = soc.get("payroll_view", {})
        for y, blk in pv.items() if isinstance(pv, dict) else []:
            comps = blk.get("components") or []
            tot = blk.get("total_eur")
            if comps and tot:
                s = sum(c["value_eur"] for c in comps if isinstance(c, dict) and c.get("value_eur") is not None)
                hard(abs(s - tot) <= max(1, 0.001 * tot), f"payroll view {y}: {len(comps)} components {s/1e9:,.1f} bn vs total {tot/1e9:,.1f} bn")

    # 11. wage reference and household estimate
    w = load("de/citizen/wage-reference.json")
    if w:
        y26 = w["years"]["2026"]["minimum_wage"]
        hard(abs(y26["annual_full_time_eur"] - 13.90 * 2080) < 0.01, f"minimum wage 2026 annual {y26['annual_full_time_eur']} = 13.90 × 2080")
        y24 = w["years"]["2024"]["full_time_earnings"]
        hard(y24["monthly_april"]["median_gross_monthly_eur"] == 3978 and y24["annual"]["median_gross_annual_eur"] == 52159, "full-time median 2024: 3,978 EUR/month (April), 52,159 EUR/year incl. special payments")
    h = load("de/citizen/household-indirect-taxes.json")
    if h:
        for c, blk in h["classes"].items():
            hard(abs(blk["recipients_year_eur"]["bund"] + blk["recipients_year_eur"]["laender"] + blk["recipients_year_eur"]["gemeinden"] - blk["indirect_taxes_year_eur"]) <= 2, f"household estimate {c}: recipients sum to total {blk['indirect_taxes_year_eur']} EUR/yr")
        hard(0.05 < h["classes"]["Haushalte insgesamt"]["share_of_consumption"] < 0.2, f"household estimate: {h['classes']['Haushalte insgesamt']['share_of_consumption']*100:.1f} % of consumption is in a plausible band")
    print(f"\n{FAIL} hard failures")
    return 1 if FAIL else 0


if __name__ == "__main__":
    raise SystemExit(main())
