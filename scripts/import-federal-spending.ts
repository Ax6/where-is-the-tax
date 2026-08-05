#!/usr/bin/env node
/**
 * Imports the official federal 2024 actual account (rechnung_2024.xml from
 * bundeshaushalt.de) and aggregates actual expenditure (Ist) by Funktionenplan
 * Hauptfunktion into data/de/2024/accounts/federal-functions.json.
 *
 * Method: every unique expenditure Titel (ein-aus-art "ausgaben" or
 * "flex-ausgaben" — flexibilised Titel are listed twice in the XML and are
 * deduplicated by Einzelplan/Kapitel/Titelnummer), grouped by the first digit
 * of its functional code. Verified 2026-08-05: structure and totals.
 */
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const SOURCE_URL = "https://www.bundeshaushalt.de/static/daten/2024/ist/rechnung_2024.xml";

const GROUPS: Record<string, { nameDe: string; name: string; description: string }> = {
  "0": {
    nameDe: "Allgemeine Dienste",
    name: "General services & defence",
    description:
      "Running the state: government and administration, the armed forces (defence pay and procurement in the core budget), police, courts, foreign affairs.",
  },
  "1": {
    nameDe: "Bildungswesen, Wissenschaft, Forschung, kulturelle Angelegenheiten",
    name: "Education, science & research",
    description: "Research funding, universities and student support (BAföG), vocational training, culture.",
  },
  "2": {
    nameDe: "Soziale Sicherung",
    name: "Social security",
    description:
      "The biggest block: the federal subsidy to the statutory pension insurance, citizens' benefit (Bürgergeld) and other labour-market spending, family benefits, war-related obligations.",
  },
  "3": {
    nameDe: "Gesundheit, Umwelt, Sport und Erholung",
    name: "Health, environment & sport",
    description: "Federal health programmes, environmental protection, sport funding.",
  },
  "4": {
    nameDe: "Wohnungswesen, Städtebau, Raumordnung, kommunale Gemeinschaftsdienste",
    name: "Housing & urban development",
    description: "Housing benefit, urban development, spatial planning.",
  },
  "5": {
    nameDe: "Ernährung, Landwirtschaft und Forsten",
    name: "Food, agriculture & forests",
    description: "Agricultural policy and rural programmes in the federal budget.",
  },
  "6": {
    nameDe: "Energie- und Wasserwirtschaft, Gewerbe, Dienstleistungen",
    name: "Energy, business & services",
    description: "Energy and business support programmes paid from the core budget.",
  },
  "7": {
    nameDe: "Verkehrs- und Nachrichtenwesen",
    name: "Transport & communications",
    description: "Roads, railways (including federal payments to the rail system), waterways, digital infrastructure.",
  },
  "8": {
    nameDe: "Finanzwirtschaft",
    name: "Interest, debt & financial assets",
    description: "Interest on federal debt, repayments, guarantees, and the management of federal assets.",
  },
  "9": {
    nameDe: "Allgemeine Finanzwirtschaft",
    name: "General financial management",
    description: "General financial transactions not assigned elsewhere.",
  },
};

function parseGermanNumber(raw: string | undefined): number {
  if (!raw) {
    return 0;
  }
  let s = raw.trim();
  let sign = 1;
  if (s.endsWith("-")) {
    sign = -1;
    s = s.slice(0, -1);
  }
  if (s.startsWith("-")) {
    sign = -1;
    s = s.slice(1);
  }
  return sign * Number(s.replaceAll(".", "").replace(",", "."));
}

const response = await fetch(SOURCE_URL);
if (!response.ok) {
  throw new Error(`Download failed: HTTP ${response.status}`);
}
const xml = await response.text();
const sha256 = createHash("sha256").update(xml).digest("hex");

const blocks = xml.match(/<titel\b[^>]*>[\s\S]*?<\/titel>/g) ?? [];
const seen = new Map<string, { value: number; fkt: string }>();
for (const block of blocks) {
  const attr = (name: string) => block.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
  const art = attr("ein-aus-art");
  if (art !== "ausgaben" && art !== "flex-ausgaben") {
    continue;
  }
  const key = `${attr("epl")}|${attr("kap")}|${attr("nr")}`;
  const value = parseGermanNumber(block.match(/<ist wert="([^"]*)"/)?.[1]);
  if (!Number.isFinite(value)) {
    throw new Error(`Unparseable Ist value at ${key}`);
  }
  const existing = seen.get(key);
  if (existing) {
    if (Math.abs(existing.value - value) > 0.005) {
      throw new Error(`Duplicate Titel ${key} with diverging values: ${existing.value} vs ${value}`);
    }
    continue;
  }
  seen.set(key, { value, fkt: attr("fkt") ?? "" });
}

let total = 0;
let unassigned = 0;
const byGroup = new Map<string, number>();
for (const { value, fkt } of seen.values()) {
  total += value;
  const group = fkt.charAt(0);
  if (!GROUPS[group]) {
    unassigned += value;
    continue;
  }
  byGroup.set(group, (byGroup.get(group) ?? 0) + value);
}

if (total < 400e9 || total > 550e9) {
  throw new Error(`Total ${total} outside the plausible range for the 2024 core budget — refusing to write.`);
}
const groupSum = [...byGroup.values()].reduce((sum, value) => sum + value, 0) + unassigned;
if (Math.abs(groupSum - total) > 1) {
  throw new Error(`Groups (${groupSum}) do not reconcile to total (${total}).`);
}

const groups = [...byGroup.entries()]
  .sort((a, b) => b[1] - a[1])
  .map(([code, amount]) => ({
    code,
    name_de: GROUPS[code]!.nameDe,
    name: GROUPS[code]!.name,
    description: GROUPS[code]!.description,
    amount_eur: Math.round(amount),
  }));

const output = {
  schema_version: 1,
  account: "de_federal_core_budget",
  title: "Federal budget — actual spending 2024",
  reference_year: 2024,
  basis:
    "Cash actuals (Ist) of the core federal budget. Federal special funds (e.g. the defence fund) are separate accounts and not included.",
  unit: "EUR",
  source: { label: "Bundeshaushalt 2024 actual account (XML)", url: SOURCE_URL },
  source_sha256: sha256,
  retrieved: new Date().toISOString().slice(0, 10),
  method:
    "Sum of all unique expenditure Titel (ein-aus-art 'ausgaben'/'flex-ausgaben', deduplicated by Einzelplan/Kapitel/Titelnummer), grouped by the first digit of the functional code (Funktionenplan Hauptfunktion). English group names are editorial translations; independently verified structure and totals, 2026-08-05.",
  total_eur: Math.round(total),
  unassigned_eur: Math.round(unassigned),
  titel_count: seen.size,
  groups,
};

const outputPath = resolve("data/de/2024/accounts/federal-functions.json");
await mkdir(resolve("data/de/2024/accounts"), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(
  `Wrote ${outputPath}: total €${(total / 1e9).toFixed(2)}bn across ${groups.length} groups (+€${(unassigned / 1e9).toFixed(2)}bn without function code), ${seen.size} Titel.`,
);
