#!/usr/bin/env python3
"""Household indirect taxes (ESTIMATE) → data/de/citizen/household-indirect-taxes.json

Method: Destatis LWR 2024 monthly consumption per household by purpose and by household net income
class (sheet csv-63111-03) × statutory VAT rates per purpose (§ 12 UStG) + excise shares for the few
purposes that carry excises (energy, electricity, fuel, tobacco, alcohol, insurance), using the EVS 2023
split of alcoholic drinks vs tobacco. Every rate assignment and price assumption is listed in the
output; the result is an order-of-magnitude estimate (≈, *), not a measurement.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import DATA, EXTRACTS, envelope, num, raw_path, read_sheet, source_ref, write_csv, write_json  # noqa: E402

SCRIPT = "scripts/research/build_household_taxes.py"
LWR, LWR_FILE = "destatis_lwr_2024", "lwr-2024.xlsx"
EVS, EVS_FILE = "destatis_evs_2023_feinanschreibung", "evs-2023-feinanschreibung.xlsx"

# VAT rate assumption per LWR purpose (leaf items). Values: 0.19, 0.07, 0.0 (exempt) or a blended share with reason.
VAT = {
    "Nahrungsmittel, Getränke, Tabakwaren und Ähnliches, Nahrungsmittel, alkoholfreie Getränke": (0.07, "food 7 % (§ 12 (2) Nr. 1 UStG, Anlage 2); soft drinks are 19 % — ignored, small*"),
    "Nahrungsmittel, Getränke, Tabakwaren und Ähnliches, alkoholische Getränke, Tabakwaren und Ähnliches": (0.19, "19 %"),
    "Bekleidung und Schuhe": (0.19, "19 %"),
    "Wohnen, Energie, Wohnungsinstandhaltung , Wohnungsmieten und Ähnliches": (0.0, "residential rent is VAT-exempt (§ 4 Nr. 12 UStG); owner-occupiers' imputed rent carries no VAT"),
    "Wohnen, Energie, Wohnungsinstandhaltung , Energie": (0.19, "19 % on electricity, gas, heating oil, district heating"),
    "Wohnen, Energie, Wohnungsinstandhaltung, Wohnungsinstandhaltung": (0.19, "19 %"),
    "Innenausstattung, Haushaltsgeräte und -gegenstände, Dienstleistungen von Haushaltshilfen und häusliche Dienste": (0.0, "mostly mini-jobs/private persons without VAT*"),
    "Innenausstattung, Haushaltsgeräte und -gegenstände": (0.19, "19 %"),
    "Gesundheit, Hilfsmittel für die Gesundheit": (0.19, "19 % (glasses, hearing aids; some 7 %)*"),
    "Gesundheit, Arzneimittel, medizinische Erzeugnisse": (0.19, "19 %"),
    "Gesundheit, Gesundheitsdienstleistungen (ambulant und stationär)": (0.0, "medical services exempt (§ 4 Nr. 14 UStG)"),
    "Verkehr, Personenbeförderungsdienstleistungen": (0.07, "7 % for rail (all distances) and for bus/taxi/ferry within a municipality or up to 50 km (§ 12 (2) Nr. 10 UStG); long-distance bus and air travel 19 % — ignored*"),
    "Verkehr": (0.19, "19 % (cars, bikes, parts, repairs, fuel)"),
    "Information und Kommunikation": (0.19, "19 %"),
    "Freizeit, Sport und Kultur, Kulturdienstleistungen": (0.07, "7 % for theatre, concerts, museums, cinema (§ 12 (2) Nr. 7); streaming 19 % — ignored*"),
    "Freizeit, Sport und Kultur, Bücher (auch CD-ROMs, E-Book-Downloads)": (0.07, "7 % books incl. e-books"),
    "Freizeit, Sport und Kultur, Zeitungen, Zeitschriften und Ähnliches": (0.07, "7 %"),
    "Freizeit, Sport und Kultur, Blumen und Gärten": (0.07, "7 % cut flowers and plants (Anlage 2)"),
    "Freizeit, Sport und Kultur, Pauschalreisen": (0.0, "package tours: margin taxation, mostly abroad; effective VAT small — set to 0*"),
    "Freizeit, Sport und Kultur": (0.19, "19 %"),
    "Bildungsdienstleistungen": (0.0, "education and child care exempt (§ 4 Nr. 21-25 UStG)"),
    "Gastronomie- und Beherbergungsdienstleistungen, Gastronomiedienstleistungen": (0.19, "19 % in 2024 (restaurant food returned to 19 % on 1 Jan 2024; 7 % again from 1 Jan 2026)"),
    "Gastronomie- und Beherbergungsdienstleistungen, Beherbergungsdienstleistungen": (0.07, "7 % accommodation (§ 12 (2) Nr. 11)"),
    "Versicherungs- und Finanzdienstleistungen, Versicherungsdienstleistungen": (0.0, "no VAT on insurance (§ 4 Nr. 10); insurance premiums are outside LWR consumption ('/' in every class), so the 19 % insurance tax is NOT in this estimate"),
    "Versicherungs- und Finanzdienstleistungen, Finanzdienstleistungen": (0.0, "financial services exempt (§ 4 Nr. 8)"),
    "Andere Waren und Dienstleistungen": (0.19, "19 %"),
}
# Excise share of the gross spend on a purpose (assumptions; see notes). recipient: bund | laender | mixed
EXCISE = {
    "Wohnen, Energie, Wohnungsinstandhaltung , Energie": [
        ("electricity_tax", 0.030, "bund", "electricity ≈ 55 % of household energy spend*; 20.50 EUR/MWh at ≈ 0.38 EUR/kWh = 5.4 % of electricity spend → 3.0 % of energy spend"),
        ("energy_tax_heating", 0.015, "bund", "gas/heating oil ≈ 40 % of energy spend*; 5.50 EUR/MWh gas (§ 2 (3) EnergieStG) at ≈ 0.12 EUR/kWh ≈ 4.6 %, heating oil 61.35 EUR/1000 l at ≈ 1.0 EUR/l ≈ 6 % → ≈ 1.5 % of energy spend"),
    ],
    "Verkehr, Kraft- und Schmierstoffe": [
        ("energy_tax_fuel", 0.338, "bund", "petrol 654.50 EUR/1000 l at 1.75 EUR/l = 37.4 %, diesel 470.40 at 1.65 EUR/l = 28.5 %; mix 60/40* → 33.8 % of fuel spend"),
    ],
    "Nahrungsmittel, Getränke, Tabakwaren und Ähnliches, alkoholische Getränke, Tabakwaren und Ähnliches": [
        ("tobacco_tax", None, "bund", "tobacco share of this item from EVS 2023 (tobacco / (alcohol + tobacco)) × cigarette tax share 44.6 % of retail price (2024 tariff § 2 (1) Nr. 1c TabStG: 20 × 11.15 ct + 19.84 % at an assumed 9.00 EUR/pack)*"),
        ("alcohol_taxes", None, "mixed", "alcohol share of this item from EVS 2023 × assumed 8 % excise share of alcoholic-drink spend* (beer 0.787 EUR/hl·°Plato ≈ 1 %, wine 0 %, sparkling 136 EUR/hl ≈ 3 %, spirits 1,303 EUR/hl pure alcohol ≈ 25 %); split 80 % Bund (spirits, sparkling) / 20 % Länder (beer)*"),
    ],
}
TOBACCO_SHARE_OF_ALC_TOB = None  # filled from EVS
CIG_TAX_SHARE = round((20 * 0.1115 + 0.1984 * 9.00) / 9.00, 4)  # 2024 tariff at 9.00 EUR/pack = 0.4462
ALC_TAX_SHARE = 0.08
VAT_SPLIT_2024 = {"bund": 0.481010, "laender": 0.491088, "gemeinden": 0.027903}  # effective 2024 (data/de/equalisation/2024.json)


def vat_rate(item: str) -> tuple[float, str]:
    best = None
    for k, v in VAT.items():
        if item.startswith(k) and (best is None or len(k) > len(best[0])):
            best = (k, v)
    if best is None:
        raise KeyError(item)
    return best[1]


def main():
    rows = read_sheet(raw_path(LWR, LWR_FILE), "csv-63111-03")
    assert rows[0][2] == "Art_der_Ausgaben" and rows[0][4] == "monatliches_Haushaltsnettoeinkommen", rows[0]
    data: dict[str, dict[str, float | None]] = {}
    order: list[str] = []
    for r in rows[1:]:
        if not r[0]:
            continue
        raw = str(r[5]).strip().strip("()").strip()  # '(x)' = limited reliability, '/' = not shown
        item, cls, val = " ".join(str(r[2]).split()), str(r[4]).strip(), (None if raw in ("/", "-", "") else num(raw))
        data.setdefault(cls, {})[item] = val
        if item not in order:
            order.append(item)
    tops = [i for i in order if "," not in i.replace(" ,", ",").split(", ", 1)[0] and i != "Private Konsumausgaben" and not any(i.startswith(o + ",") or i.startswith(o + " ,") for o in order if o != i)]
    # leaves: items that have no child item starting with them
    leaves = [i for i in order if i != "Private Konsumausgaben" and not any(o != i and (o.startswith(i + ",") or o.startswith(i + " ,")) for o in order)]
    # EVS split tobacco vs alcohol (Germany, all households)
    evs = read_sheet(raw_path(EVS, EVS_FILE), "csv-63231-04")
    alc = tob = None
    for r in evs[1:]:
        if r[0] and str(r[4]).strip() == "Haushalte insgesamt":
            lab = " ".join(str(r[2]).split())
            if lab == "Alkoholische Getränke, Tabakwaren, alkoholische Getränke":
                alc = num(r[5])
            if lab == "Alkoholische Getränke, Tabakwaren, Tabakwaren":
                tob = num(r[5])
    assert alc and tob, (alc, tob)
    tob_share = tob / (alc + tob)
    extract = []
    classes = {}
    for cls, items in data.items():
        total = items["Private Konsumausgaben"]
        vat_total = 0.0
        exc = {}
        detail = []
        leaf_sum = 0.0
        for leaf in leaves:
            spend = items.get(leaf)
            if spend is None:
                continue
            leaf_sum += spend
            rate, why = vat_rate(leaf)
            vat = spend * rate / (1 + rate)
            vat_total += vat
            ex_here = {}
            for key, share, recip, note in EXCISE.get(leaf, []):
                if key == "tobacco_tax":
                    share = tob_share * CIG_TAX_SHARE
                elif key == "alcohol_taxes":
                    share = (1 - tob_share) * ALC_TAX_SHARE
                amt = spend * share
                ex_here[key] = round(amt, 2)
                exc[key] = exc.get(key, 0.0) + amt
            detail.append({"item_de": leaf, "spend_month_eur": spend, "vat_rate": rate, "vat_month_eur": round(vat, 2), "excise_month_eur": ex_here or None})
            extract.append([cls, leaf, spend, rate, round(vat, 2), json.dumps(ex_here) if ex_here else ""])
        if abs(leaf_sum - total) > 0.02 * total:
            raise SystemExit(f"{cls}: leaves {leaf_sum} vs total {total}")
        annual_vat = vat_total * 12
        annual_exc = {k: v * 12 for k, v in exc.items()}
        recipients = {"bund": annual_vat * VAT_SPLIT_2024["bund"], "laender": annual_vat * VAT_SPLIT_2024["laender"], "gemeinden": annual_vat * VAT_SPLIT_2024["gemeinden"]}
        for k, v in annual_exc.items():
            if k == "alcohol_taxes":
                recipients["bund"] += 0.8 * v
                recipients["laender"] += 0.2 * v
            else:
                recipients["bund"] += v
        classes[cls] = {
            "household_net_income_class_de": cls, "consumption_month_eur": total, "leaf_sum_month_eur": round(leaf_sum, 2),
            "vat_year_eur": round(annual_vat), "excises_year_eur": {k: round(v) for k, v in annual_exc.items()},
            "indirect_taxes_year_eur": round(annual_vat + sum(annual_exc.values())),
            "share_of_consumption": round((annual_vat + sum(annual_exc.values())) / (total * 12), 4),
            "recipients_year_eur": {k: round(v) for k, v in recipients.items()},
            "items": detail,
        }
    write_csv("destatis_lwr_2024/csv-63111-03-with-rates.csv", ["income_class", "item_de", "spend_month_eur", "vat_rate", "vat_month_eur", "excise_month_eur_json"], extract, base=EXTRACTS)
    # LWR universe (grossed-up households) for macro framing
    b01 = read_sheet(raw_path(LWR, LWR_FILE), "csv-63111-b01")
    households_k = next(num(r[6]) for r in b01[1:] if r[0] and str(r[2]).strip() == "Haushalte insgesamt")
    tot = classes["Haushalte insgesamt"]
    print(f"household indirect taxes 2024 (all households): consumption {tot['consumption_month_eur']} EUR/month → VAT ≈ {tot['vat_year_eur']} EUR/yr, excises ≈ {sum(tot['excises_year_eur'].values())} EUR/yr, total ≈ {tot['indirect_taxes_year_eur']} ({tot['share_of_consumption']*100:.1f} % of consumption); tobacco share of alc+tob {tob_share:.3f}")
    class_order = ["Unter 1300 Euro", "1300 bis unter 2600 Euro", "2600 bis unter 3600 Euro", "3600 bis unter 5000 Euro", "5000 und mehr Euro", "Haushalte insgesamt"]
    payload = envelope(
        "de.citizen.household_indirect_taxes", "Indirekte Steuern eines Haushalts (Schätzung ≈): Umsatzsteuer und Verbrauchsteuern nach Haushaltsnettoeinkommen", "A household's indirect taxes (estimate ≈): VAT and excises by household net income class",
        "EUR per household per year", "ESTIMATE*: LWR 2024 monthly consumption per household (Destatis, all household sizes) × statutory VAT rates per purpose × 12, plus excise shares for energy, fuel, tobacco, alcohol and insurance from price assumptions. Not a measurement; quality flags of the LWR cells not propagated.",
        SCRIPT, status="estimate*",
        method={"vat": "VAT inside the gross spend: spend × r/(1+r) with r from the table 'vat_rate_assumptions'; rent, health, education, finance, insurance exempt", "excises": "spend × assumed excise share (table 'excise_assumptions'); the shares depend on assumed prices", "recipients": "VAT by the effective 2024 split Bund 48.10 % / Länder 49.11 % / Gemeinden 2.79 % (data/de/equalisation/2024.json); energy, electricity, tobacco, spirits, sparkling-wine and insurance taxes to the Federation; beer tax to the Länder (Art. 106 GG)", "wage_slider_mapping": "The classes are HOUSEHOLD NET income per month (all household members). For a single earner, use the payslip net ÷ 12 to pick the class*; for couples add both nets."},
        vat_rate_assumptions=[{"item_prefix_de": k, "rate": v[0], "reason": v[1]} for k, v in VAT.items()],
        excise_assumptions=[{"item_de": k, "tax": e[0], "share_of_spend": (round(tob_share * CIG_TAX_SHARE, 4) if e[0] == "tobacco_tax" else round((1 - tob_share) * ALC_TAX_SHARE, 4) if e[0] == "alcohol_taxes" else e[1]), "recipient": e[2], "reason": e[3]} for k, es in EXCISE.items() for e in es],
        evs_tobacco_share_of_alcohol_plus_tobacco={"value": round(tob_share, 4), "source": source_ref(EVS, EVS_FILE, "sheet csv-63231-04, rows 'Alkoholische Getränke, Tabakwaren, alkoholische Getränke' (34.64) and '…, Tabakwaren' (19.36), Haushalte insgesamt, EUR/month 2023")},
        sources={"lwr": source_ref(LWR, LWR_FILE, "sheet csv-63111-03 (Konsumausgaben nach monatlichem Haushaltsnettoeinkommen, je Haushalt und Monat in EUR, 2024); rows in research/extracts/destatis_lwr_2024/csv-63111-03-with-rates.csv")},
        lwr_universe={"households_grossed_up": int(households_k * 1000), "source": source_ref(LWR, LWR_FILE, "sheet csv-63111-b01, row 'Haushalte insgesamt', Hochgerechnete_Haushalte_1000"), "note": "LWR covers private households with net income below 18,000 EUR/month, excluding institutional households; use this count, not the 41.9 m census households, for any grossing-up"},
        macro_sanity={"vat_per_household_x_universe_eur": round(tot["vat_year_eur"] * households_k * 1000), "vat_receipts_2024_eur": None, "note": "≈ 130 bn EUR ≈ 43 % of 2024 VAT receipts (302 bn, data/de/taxes/by-tax.json G60+G70); the rest is borne by government, non-deductible business sectors, housing investment and households outside the survey — a plausibility bound, not a sourced share"},
        class_order=class_order, classes={c: classes[c] for c in class_order if c in classes},
        caveats=["Order-of-magnitude estimate: VAT rate assignment is per purpose group, not per product; excise shares rest on assumed retail prices.",
                 "Survey under-coverage: LWR/EVS households report far less tobacco and alcohol than market sales imply (tobacco tax receipts 15.6 bn ÷ 38.7 m households ≈ 400 EUR vs ≈ 90 EUR here; alcohol similar), so the excise lines are lower bounds.",
                 "Biggest levers: car purchases and fuel (19 % + energy tax), package holidays (set to 0 VAT here), restaurant meals (19 % in 2024, 7 % from 2026) and the treatment of items with mixed rates (soft drinks, air travel, streaming).",
                 "Insurance tax is not included (premiums are outside LWR consumption).",
                 "Household (not person) and net-income (not gross-wage) classes; richer households save more, so indirect taxes fall as a share of income.",
                 "Quality flags ('/', '()') of small cells are not propagated; the lowest class has few households."],
    )
    write_json("de/citizen/household-indirect-taxes.json", payload)


if __name__ == "__main__":
    main()
