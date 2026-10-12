#!/usr/bin/env python3
"""Who legally receives each tax (Art. 106 GG and the implementing statutes) → data/de/taxes/legal-allocation.json

The shares are law, not statistics. Each entry names the statute section and the build asserts that the
fetched statute text contains the quoted share or phrase, so a changed law breaks the build instead of
silently going stale. Observed 2024/2025 amounts per tax come from data/de/taxes/by-tax.json; where
Destatis publishes the actual split after distribution, the recipient amounts are attached too.
"""
from __future__ import annotations

import html
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import DATA, envelope, raw_path, source_ref, write_json  # noqa: E402

SCRIPT = "scripts/research/build_legal.py"
LAW = "gesetze_im_internet"
LAW2 = "gesetze_im_internet_allocation"


def statute_text(src: str, file: str) -> str:
    t = raw_path(src, file).read_text(encoding="utf-8", errors="replace")
    t = re.sub(r"<script.*?</script>", "", t, flags=re.S)
    t = re.sub(r"<[^>]+>", " ", t)
    return re.sub(r"[\s\u00a0\u202f]+", " ", html.unescape(t))


def must_contain(src: str, file: str, phrase: str):
    if phrase not in statute_text(src, file):
        raise SystemExit(f"{file} no longer contains: {phrase!r}")


# recipient keys: federation, laender, municipalities, eu
ENTRIES = [
    # Joint taxes
    {"id": "STEUERARTG10", "shares": {"federation": 0.425, "laender": 0.425, "municipalities": 0.15},
     "kind": "fixed_share", "basis": [("gg_art_106.html", "Am Aufkommen der Einkommensteuer und der Körperschaftsteuer sind der Bund und die Länder je zur Hälfte beteiligt", "Art. 106 (3) GG"),
                                      ("gemfinrefg_1.html", "15 Prozent", "§ 1 GemFinRefG")],
     "note": {"de": "Gemeinden erhalten 15 % vorab; der Rest wird hälftig geteilt (42,5 / 42,5). Die Lohnsteuer wird nach dem Wohnsitz des Arbeitnehmers auf die Länder zerlegt (§ 7 ZerlG).", "en": "Municipalities take 15 % first; the rest is halved (42.5 / 42.5). Wage tax is apportioned to the Land of residence (§ 7 ZerlG)."}},
    {"id": "STEUERARTG20", "shares": {"federation": 0.425, "laender": 0.425, "municipalities": 0.15}, "kind": "fixed_share",
     "basis": [("gg_art_106.html", "je zur Hälfte beteiligt", "Art. 106 (3) GG"), ("gemfinrefg_1.html", "15 Prozent", "§ 1 GemFinRefG")]},
    {"id": "STEUERARTG30", "shares": {"federation": 0.5, "laender": 0.5}, "kind": "fixed_share",
     "basis": [("gg_art_106.html", "je zur Hälfte beteiligt", "Art. 106 (3) GG")],
     "note": {"de": "Nicht veranlagte Steuern vom Ertrag (Kapitalertragsteuer auf Dividenden) gehören zur Einkommen-/Körperschaftsteuer; kein Gemeindeanteil.", "en": "Non-assessed taxes on yields (withholding on dividends) belong to income/corporation tax; no municipal share."}},
    {"id": "STEUERARTG40", "shares": {"federation": 0.44, "laender": 0.44, "municipalities": 0.12}, "kind": "fixed_share",
     "basis": [("gemfinrefg_1.html", "12 Prozent", "§ 1 GemFinRefG"), ("gg_art_106.html", "je zur Hälfte beteiligt", "Art. 106 (3) GG")]},
    {"id": "STEUERARTG50", "shares": {"federation": 0.5, "laender": 0.5}, "kind": "fixed_share",
     "basis": [("gg_art_106.html", "je zur Hälfte beteiligt", "Art. 106 (3) GG")],
     "note": {"de": "Der Länderanteil wird nach Betriebsstätten (Arbeitslöhnen) zerlegt.", "en": "The Länder half is apportioned by establishments (payroll)."}},
    {"id": "STEUERARTG60", "shares": None, "kind": "annual_formula",
     "basis": [("gg_art_106.html", "Die Anteile von Bund und Ländern an der Umsatzsteuer werden durch Bundesgesetz", "Art. 106 (3) GG"), ("finausglg_1.html", "52,81398351 45,19007254 1,99594395", "§ 1 (1) FAG")],
     "note": {"de": "Grundanteile Bund 52,81 % / Länder 45,19 % / Gemeinden 2,00 %, jährlich um feste Euro-Beträge verschoben (§ 1 (2) FAG). Das tatsächliche Ergebnis steht in data/de/equalisation/<Jahr>.json (2024: Bund 48,10 %, Länder 49,11 %, Gemeinden 2,79 %).", "en": "Base shares Federation 52.81 % / Länder 45.19 % / municipalities 2.00 %, shifted every year by fixed euro amounts (§ 1 (2) FAG). The effective outcome is in data/de/equalisation/<year>.json (2024: 48.10 / 49.11 / 2.79 %)."}},
    {"id": "STEUERARTG70", "shares": None, "kind": "annual_formula", "basis": [("finausglg_1.html", "Das Aufkommen der Umsatzsteuer wird auf Bund, Länder und Gemeinden", "§ 1 FAG")],
     "note": {"de": "Einfuhrumsatzsteuer folgt der Umsatzsteuerverteilung.", "en": "Import VAT follows the VAT allocation."}},
    # Federal taxes (Art. 106 (1))
    *[{"id": c, "shares": {"federation": 1.0}, "kind": "exclusive_assignment", "basis": [("gg_art_106.html", ph, "Art. 106 (1) GG")]} for c, ph in [
        ("STEUERARTB10", "die Versicherungsteuer"), ("STEUERARTB20", "die Verbrauchsteuern"), ("STEUERARTB30", "die Verbrauchsteuern"), ("STEUERARTB40", "die Verbrauchsteuern"),
        ("STEUERARTB45", "die Verbrauchsteuern"), ("STEUERARTB50", "die Verbrauchsteuern"), ("STEUERARTB60", "die Verbrauchsteuern"), ("STEUERARTB70", "die Verbrauchsteuern"),
        ("STEUERARTB75", "die Verbrauchsteuern"), ("STEUERARTB77", "die Kraftfahrzeugsteuer"), ("STEUERARTB78", "sonstige auf motorisierte Verkehrsmittel bezogene Verkehrsteuern"),
        ("STEUERARTB79", "die Verbrauchsteuern"), ("STEUERARTB80", "die Ergänzungsabgabe zur Einkommensteuer und zur Körperschaftsteuer"), ("STEUERARTB85", "die Verbrauchsteuern"),
        ("STEUERARTB90", "Abgaben im Rahmen der Europäischen Gemeinschaften"), ("STEUERARTB100", "stehen dem Bund zu")]],
    # Customs → EU own resource (collected by the Federation, passed to the EU less collection costs)
    {"id": "STEUERARTZ10", "shares": {"eu": 1.0}, "kind": "exclusive_assignment", "basis": [("gg_art_106.html", "die Zölle", "Art. 106 (1) Nr. 1 GG")],
     "note": {"de": "Zölle sind traditionelle EU-Eigenmittel; Deutschland behält 25 % Erhebungskostenpauschale (EU-Eigenmittelbeschluss), Destatis bucht die Zölle vollständig als EU-Eigenmittel.", "en": "Customs duties are traditional EU own resources; Germany retains a 25 % collection-cost share (EU Own Resources Decision); Destatis books customs fully as EU own resources."}},
    # Länder taxes (Art. 106 (2))
    *[{"id": c, "shares": {"laender": 1.0}, "kind": "exclusive_assignment", "basis": [("gg_art_106.html", ph, "Art. 106 (2) GG")]} for c, ph in [
        ("STEUERARTL10", "die Vermögensteuer"), ("STEUERARTL20", "die Erbschaftsteuer"), ("STEUERARTL30", "die Verkehrsteuern"), ("STEUERARTL40", "die Kraftfahrzeugsteuer"),
        ("STEUERARTL51", "die Verkehrsteuern"), ("STEUERARTL52", "die Verkehrsteuern"), ("STEUERARTL53", "die Verkehrsteuern"), ("STEUERARTL54", "die Verkehrsteuern"),
        ("STEUERARTL55", "die Verkehrsteuern"), ("STEUERARTL56", "die Verkehrsteuern"), ("STEUERARTL60", "die Verkehrsteuern"), ("STEUERARTL70", "die Biersteuer"), ("STEUERARTL80", "steht den Ländern zu")]],
    # Municipal taxes (Art. 106 (6))
    {"id": "STEUERARTK30", "shares": {"municipalities": 1.0}, "kind": "exclusive_assignment",
     "basis": [("gg_art_106.html", "Das Aufkommen der Grundsteuer und Gewerbesteuer steht den Gemeinden", "Art. 106 (6) GG"), ("gemfinrefg_6.html", "Der Bundesvervielfältiger beträgt 14,5 Prozent. Der Landesvervielfältiger beträgt 20,5 Prozent.", "§ 6 (3) GemFinRefG")],
     "note": {"de": "Brutto. Die Gemeinden führen eine Umlage ab: (Istaufkommen ÷ Hebesatz) × 35 % (14,5 Bund + 20,5 Land). Berlin und Hamburg zahlen als Stadtstaaten nur den Bundesanteil (§ 7 GemFinRefG).", "en": "Gross. Municipalities remit a levy: (receipts ÷ assessment rate) × 35 % (14.5 federal + 20.5 Land). Berlin and Hamburg pay only the federal part (§ 7 GemFinRefG)."}},
    *[{"id": c, "shares": {"municipalities": 1.0}, "kind": "exclusive_assignment", "basis": [("gg_art_106.html", ph, "Art. 106 (6) GG")]} for c, ph in [
        ("STEUERARTK10", "Das Aufkommen der Grundsteuer und Gewerbesteuer steht den Gemeinden"), ("STEUERARTK20", "Das Aufkommen der Grundsteuer und Gewerbesteuer steht den Gemeinden"), ("STEUERARTK21", "Das Aufkommen der Grundsteuer und Gewerbesteuer steht den Gemeinden"),
        ("STEUERARTK41", "örtlichen Verbrauch- und Aufwandsteuern"), ("STEUERARTK42", "örtlichen Verbrauch- und Aufwandsteuern"), ("STEUERARTK43", "örtlichen Verbrauch- und Aufwandsteuern"),
        ("STEUERARTK44", "örtlichen Verbrauch- und Aufwandsteuern"), ("STEUERARTK45", "örtlichen Verbrauch- und Aufwandsteuern"), ("STEUERARTK46", "örtlichen Verbrauch- und Aufwandsteuern"),
        ("STEUERARTK47", "örtlichen Verbrauch- und Aufwandsteuern"), ("STEUERARTK48", "örtlichen Verbrauch- und Aufwandsteuern"), ("STEUERARTK50", "steht den Gemeinden")]],
    {"id": "STEUERARTK40", "shares": {"municipalities": 1.0}, "kind": "state_law", "basis": [("gg_art_106.html", "ob und inwieweit das Aufkommen der Landessteuern den Gemeinden", "Art. 106 (7) GG")],
     "note": {"de": "Gemeindeanteil an der Grunderwerbsteuer nach Landesrecht (nur in einigen Ländern).", "en": "Municipal share of real-estate transfer tax under Land law (only some Länder)."}},
]
RECIPIENTS = {"federation": {"de": "Bund", "en": "Federation"}, "laender": {"de": "Länder", "en": "Länder"}, "municipalities": {"de": "Gemeinden", "en": "Municipalities"}, "eu": {"de": "EU", "en": "EU"}}
KINDS = {"fixed_share": {"de": "Fester gesetzlicher Anteil", "en": "Fixed statutory share"}, "annual_formula": {"de": "Jährliche gesetzliche Formel", "en": "Annual statutory formula"},
         "exclusive_assignment": {"de": "Ausschließlich zugewiesen", "en": "Assigned exclusively"}, "state_law": {"de": "Nach Landesrecht", "en": "Under Land law"}}


def main():
    by_tax = json.loads((DATA / "de" / "taxes" / "by-tax.json").read_text(encoding="utf-8"))
    taxes = {r["id"]: r for r in by_tax["rows"]}
    rows = []
    for e in ENTRIES:
        basis = []
        for file, phrase, section in e["basis"]:
            src = LAW2 if file in ("gemfinrefg_1.html", "zerlg_7.html", "gg_art_105.html") else LAW
            must_contain(src, file, phrase)
            basis.append({"section": section, "quote": phrase, "source": source_ref(src, file, f"text contains: {phrase}")})
        t = taxes[e["id"]]
        amounts = {y: t["values_eur"].get(y) for y in ("2024", "2025")}
        split = None
        if e["shares"]:
            split = {y: ({k: round(v * s) for k, s in e["shares"].items()} if v is not None else None) for y, v in amounts.items()}
        rows.append({"id": e["id"], "label": t["label"], "group": t["group"], "kind": e["kind"], "shares": e["shares"], "legal_basis": basis,
                     "receipts_eur": amounts, "statutory_split_eur": split, "note": e.get("note")})
    covered = {r["id"] for r in rows}
    leaves = [r["id"] for r in by_tax["rows"] if r["depth"] == 2]
    missing = [c for c in leaves if c not in covered]
    if missing:
        raise SystemExit(f"taxes without legal entry: {missing}")
    print(f"legal allocation: {len(rows)} taxes, all {len(leaves)} Destatis leaf positions covered; statute quotes verified")
    payload = envelope(
        "de.taxes.legal_allocation", "Wer bekommt welche Steuer? Gesetzliche Ertragshoheit je Steuerart", "Who receives which tax? Statutory allocation per named tax",
        "share (0-1) and EUR", "Statute (Art. 106 GG, FAG, GemFinRefG) in force at retrieval; shares applied to Destatis cash receipts give the statutory split before decomposition, equalisation and grants. The statutory split is a derived figure, not an observation.",
        SCRIPT, recipients=RECIPIENTS, kinds=KINDS,
        notes=["Statutory split × receipts ignores timing and the geographic decomposition; the observed outcome per recipient is in by-recipient.json.",
               "VAT has no fixed share: see equalisation files for the effective yearly split.",
               "Trade tax is shown gross; the levy to Federation and Land is in by-recipient.json (STEUERNVK30, STEUERNVB50, STEUERNVL50)."],
        rows=rows,
    )
    write_json("de/taxes/legal-allocation.json", payload)


if __name__ == "__main__":
    main()
