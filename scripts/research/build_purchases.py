#!/usr/bin/env python3
"""Taxes inside everyday purchases → data/de/citizen/purchase-taxes.json

Statutory rates only (VAT § 12 UStG; excises per their tariff sections). Each rate is asserted against the
fetched statute text. Worked examples apply the rates to stated reference prices/quantities; the prices are
assumptions and are labelled as such (the tax per unit is exact, the share of a price depends on the price).
"""
from __future__ import annotations

import html
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import envelope, raw_path, source_ref, write_json  # noqa: E402

SCRIPT = "scripts/research/build_purchases.py"
LAW = "gesetze_im_internet"


def statute_text(file: str) -> str:
    t = raw_path(LAW, file).read_text(encoding="utf-8", errors="replace")
    t = re.sub(r"<[^>]+>", " ", t)
    return re.sub(r"[\s\u00a0\u202f]+", " ", html.unescape(t))


def rate(file: str, section: str, phrase: str, value: float, unit: str, de: str, en: str, recipient: str, valid: str | None = None) -> dict:
    if phrase not in statute_text(file):
        raise SystemExit(f"{file} does not contain {phrase!r}")
    out = {"value": value, "unit": unit, "label": {"de": de, "en": en}, "recipient": recipient, "legal_basis": section,
           "quote": phrase, "source": source_ref(LAW, file, f"text contains: {phrase}")}
    if valid:
        out["valid"] = valid
    return out


def main():
    vat_std = rate("ustg_12.html", "§ 12 (1) UStG", "19 Prozent der Bemessungsgrundlage", 0.19, "share of net price", "Umsatzsteuer, Regelsatz", "VAT, standard rate", "shared (Bund/Länder/Gemeinden, annual formula)")
    vat_red = rate("ustg_12.html", "§ 12 (2) UStG", "ermäßigt sich auf sieben Prozent", 0.07, "share of net price", "Umsatzsteuer, ermäßigter Satz (u.a. Lebensmittel, Bücher, ÖPNV)", "VAT, reduced rate (e.g. food, books, local transport)", "shared (Bund/Länder/Gemeinden, annual formula)")
    excises = {
        "petrol": rate("energiestg_2.html", "§ 2 (1) Nr. 1 b EnergieStG", "mit einem Schwefelgehalt von höchstens 10 mg/kg 654,50 EUR", 654.50, "EUR per 1000 l", "Energiesteuer auf Benzin (schwefelarm)", "Energy tax on petrol (low sulphur)", "federation"),
        "diesel": rate("energiestg_2.html", "§ 2 (1) Nr. 4 b EnergieStG", "mit einem Schwefelgehalt von höchstens 10 mg/kg 470,40 EUR", 470.40, "EUR per 1000 l", "Energiesteuer auf Diesel (schwefelarm)", "Energy tax on diesel (low sulphur)", "federation"),
        "natural_gas_heating_2026": rate("energiestg_2.html", "§ 2 (3) EnergieStG / § 2 (2) Nr. 1 d", "vom 1. Januar 2026 bis zum 31. Dezember 2026 27,33 EUR", 27.33, "EUR per MWh", "Energiesteuer auf Erdgas (Kraftstoff-Übergangssatz 2026; Heizgas: 5,50 EUR/MWh nach § 2 (3))", "Energy tax on natural gas (transitional motor-fuel rate 2026; heating gas 5.50 EUR/MWh under § 2 (3))", "federation", "2026"),
        "electricity": rate("stromstg_3.html", "§ 3 StromStG", "20,50 Euro für eine Megawattstunde", 20.50, "EUR per MWh", "Stromsteuer", "Electricity tax", "federation"),
        "cigarettes_2026": rate("tabstg_2.html", "§ 2 (1) Nr. 1 e TabStG", "vom 1. Januar 2026 bis zum 14. Februar 2027 12,28 Cent je Stück und 19,84 Prozent des Kleinverkaufspreises, mindestens jedoch 25,106 Cent je Stück", 0.1228, "EUR per cigarette + 19.84 % of retail price (minimum 0.25106 EUR per piece less VAT)", "Tabaksteuer auf Zigaretten", "Tobacco tax on cigarettes", "federation", "2026-01-01 to 2027-02-14"),
        "cigarettes_2025": rate("tabstg_2.html", "§ 2 (1) Nr. 1 d TabStG", "vom 1. Januar 2025 bis zum 31. Dezember 2025 11,71 Cent je Stück und 19,84 Prozent des Kleinverkaufspreises", 0.1171, "EUR per cigarette + 19.84 % of retail price", "Tabaksteuer auf Zigaretten 2025", "Tobacco tax on cigarettes 2025", "federation", "2025"),
        "beer": rate("bierstg_2.html", "§ 2 (1) BierStG", "Die Biersteuer beträgt für einen Hektoliter (hl) Bier 0,787 Euro je Grad Plato", 0.787, "EUR per hl per degree Plato", "Biersteuer", "Beer tax", "laender"),
        "coffee": rate("kaffeestg_2.html", "§ 2 (1) KaffeeStG", "für Röstkaffee 2,19 Euro je Kilogramm", 2.19, "EUR per kg roasted coffee", "Kaffeesteuer", "Coffee tax", "federation"),
        "spirits": rate("alkstg_2.html", "§ 2 (1) AlkStG", "als Regelsatz 1 303 Euro", 1303.0, "EUR per hl pure alcohol", "Alkoholsteuer", "Spirits tax", "federation"),
        "sparkling_wine": rate("schaumwzwstg_2.html", "§ 2 (1) SchaumwZwStG", "136 Euro je Hektoliter", 136.0, "EUR per hl", "Schaumweinsteuer", "Sparkling-wine tax", "federation"),
        "insurance": rate("versstg_6.html", "§ 6 (1) VersStG", "19 Prozent des Versicherungsentgelts", 0.19, "share of premium", "Versicherungsteuer (keine Umsatzsteuer auf Versicherungen)", "Insurance tax (insurance is VAT-exempt)", "federation"),
        "real_estate_transfer_default": rate("grestg_11.html", "§ 11 (1) GrEStG", "Die Steuer beträgt 3,5 vom Hundert", 0.035, "share of purchase price", "Grunderwerbsteuer, Grundsatz (Länder setzen eigene Sätze von 3,5 % bis 6,5 %; Art. 105 (2a) GG)", "Real-estate transfer tax, default (Länder set their own rates, 3.5 % to 6.5 %; Art. 105 (2a) GG)", "laender"),
    }
    # worked examples; prices are illustrative assumptions, taxes are exact for the stated quantity
    examples = [
        {"id": "petrol_litre", "label": {"de": "1 Liter Benzin (E10) für 1,75 €", "en": "1 litre of petrol (E10) at €1.75"}, "assumption": "Pump price 1.75 EUR/l (assumption, not a source)",
         "price_eur": 1.75, "layers": [{"tax": "energy_tax", "eur": 0.6545, "basis": "654.50 EUR / 1000 l"}, {"tax": "vat", "eur": round(1.75 - 1.75 / 1.19, 4), "basis": "19 % VAT inside the gross price (applies to the energy tax too)"}],
         "recipients": {"federation": "energy tax entirely", "shared": "VAT by the annual formula"}},
        {"id": "diesel_litre", "label": {"de": "1 Liter Diesel für 1,65 €", "en": "1 litre of diesel at €1.65"}, "assumption": "Pump price 1.65 EUR/l (assumption)",
         "price_eur": 1.65, "layers": [{"tax": "energy_tax", "eur": 0.4704, "basis": "470.40 EUR / 1000 l"}, {"tax": "vat", "eur": round(1.65 - 1.65 / 1.19, 4), "basis": "19 % VAT inside the gross price"}]},
        {"id": "electricity_kwh", "label": {"de": "1 kWh Haushaltsstrom für 0,38 €", "en": "1 kWh of household electricity at €0.38"}, "assumption": "0.38 EUR/kWh (assumption)",
         "price_eur": 0.38, "layers": [{"tax": "electricity_tax", "eur": 0.0205, "basis": "20.50 EUR / MWh"}, {"tax": "vat", "eur": round(0.38 - 0.38 / 1.19, 4), "basis": "19 % VAT inside the gross price"}],
         "note": "Network charges and levies (e.g. §19-Umlage) are not taxes and are not shown."},
        {"id": "cigarettes_pack", "label": {"de": "Schachtel mit 20 Zigaretten für 9,00 € (2026)", "en": "Pack of 20 cigarettes at €9.00 (2026)"}, "assumption": "Retail price 9.00 EUR (assumption)",
         "price_eur": 9.00, "layers": [{"tax": "tobacco_tax", "eur": round(20 * 0.1228 + 0.1984 * 9.00, 4), "basis": "20 × 12.28 ct + 19.84 % × 9.00 (above the minimum of 20 × 25.106 ct less VAT)"}, {"tax": "vat", "eur": round(9.00 - 9.00 / 1.19, 4), "basis": "19 % VAT inside the gross price"}]},
        {"id": "beer_half_litre", "label": {"de": "0,5 l Bier (12° Plato) für 4,00 € in der Kneipe", "en": "0.5 l of beer (12° Plato) at €4.00 in a pub"}, "assumption": "12° Plato, 4.00 EUR (assumptions)",
         "price_eur": 4.00, "layers": [{"tax": "beer_tax", "eur": round(0.787 * 12 * 0.5 / 100, 4), "basis": "0.787 EUR × 12 ° × 0.5 l / 100 l"}, {"tax": "vat", "eur": round(4.00 - 4.00 / 1.19, 4), "basis": "19 % VAT (restaurant drinks)"}]},
        {"id": "coffee_pack", "label": {"de": "500 g Röstkaffee für 7,00 €", "en": "500 g of roasted coffee at €7.00"}, "assumption": "7.00 EUR (assumption)",
         "price_eur": 7.00, "layers": [{"tax": "coffee_tax", "eur": 1.095, "basis": "2.19 EUR/kg × 0.5 kg"}, {"tax": "vat", "eur": round(7.00 - 7.00 / 1.07, 4), "basis": "7 % VAT (food)"}]},
        {"id": "groceries", "label": {"de": "Lebensmitteleinkauf für 50 €", "en": "Grocery shopping at €50"}, "assumption": "All items at the 7 % rate (assumption; drinks, sweets and many ready meals carry 19 %)",
         "price_eur": 50.00, "layers": [{"tax": "vat", "eur": round(50 - 50 / 1.07, 4), "basis": "7 % VAT inside the gross price"}]},
        {"id": "electronics", "label": {"de": "Smartphone für 800 €", "en": "Smartphone at €800"}, "assumption": "Standard rate", "price_eur": 800.0, "layers": [{"tax": "vat", "eur": round(800 - 800 / 1.19, 2), "basis": "19 % VAT inside the gross price"}]},
        {"id": "car_insurance", "label": {"de": "Kfz-Versicherung, 600 € Jahresbeitrag", "en": "Car insurance, €600 annual premium"}, "assumption": "600 EUR incl. tax (assumption)", "price_eur": 600.0, "layers": [{"tax": "insurance_tax", "eur": round(600 - 600 / 1.19, 2), "basis": "19 % insurance tax inside the premium; no VAT on insurance"}]},
        # The transfer tax is charged on the consideration (§ 8 GrEStG) and comes on top of it: 400,000 + 24,000 = 424,000 paid in total.
        {"id": "flat_purchase_berlin", "label": {"de": "Wohnungskauf in Berlin: 400 000 € plus Grunderwerbsteuer", "en": "Buying a flat in Berlin: €400,000 plus transfer tax"}, "assumption": "Berlin's rate is 6 % (Land law; the statute default is 3.5 %) — the Berlin rate is not in the fetched statutes and is marked secondary. The tax is charged on the €400,000 consideration and paid on top of it.",
         "price_eur": 424000.0, "layers": [{"tax": "real_estate_transfer_tax", "eur": 24000.0, "basis": "6 % × 400,000 consideration (Berlin rate, secondary*), paid on top: 424,000 in total", "status": "secondary"}]},
    ]
    for ex in examples:
        ex["tax_total_eur"] = round(sum(l["eur"] for l in ex["layers"]), 4)
        ex["tax_share_of_price"] = round(ex["tax_total_eur"] / ex["price_eur"], 4)
    print(f"purchase taxes: {len(excises)} statutory rates verified against statute text; {len(examples)} worked examples")
    payload = envelope(
        "de.citizen.purchase_taxes", "Steuern in Alltagskäufen", "Taxes inside everyday purchases",
        "mixed (see each rate)", "Statutory rates (exact); worked examples use illustrative prices marked as assumptions; recipients follow data/de/taxes/legal-allocation.json",
        SCRIPT, vat={"standard": vat_std, "reduced": vat_red}, excises=excises, examples=examples,
        notes=["The tax per unit is exact law; the share of a price depends on the assumed price.", "VAT is levied on the price including excise, so excises are taxed again.",
               "Where a rate is time-limited (tobacco, natural gas), the validity window is given.", "Berlin's 6 % real-estate transfer rate is Land law not included in the fetched statutes: marked secondary (*)."],
    )
    write_json("de/citizen/purchase-taxes.json", payload)


if __name__ == "__main__":
    main()
