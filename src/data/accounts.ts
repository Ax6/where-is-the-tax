/** Builds SpendingAccount views from the collected datasets. */

import type { SpendingAccount } from "../ui/spending.ts";
import laenderFunctions from "../../data/de/2021/accounts/laender-functions.json" with { type: "json" };
import socialInsurance from "../../data/de/2024/accounts/social-insurance.json" with { type: "json" };

const GROUP_NAMES: Record<string, { de: string; en: string; description: string }> = {
  "0": {
    de: "Allgemeine Dienste",
    en: "General services",
    description: "Administration, police and public safety, courts, tax offices.",
  },
  "1": {
    de: "Bildung, Wissenschaft, Kultur",
    en: "Education, science & culture",
    description: "Schools, universities, research, culture — the Länder's core business.",
  },
  "2": {
    de: "Soziales, Familie, Arbeitsmarkt",
    en: "Social security & family",
    description: "Social assistance, youth welfare, daycare, labour-market programmes.",
  },
  "3": {
    de: "Gesundheit, Umwelt, Sport",
    en: "Health, environment & sport",
    description: "Hospitals investment, public health, environment, sport.",
  },
  "4": {
    de: "Wohnungswesen, Städtebau",
    en: "Housing & urban development",
    description: "Housing programmes, urban development, community services.",
  },
  "5": {
    de: "Ernährung, Landwirtschaft",
    en: "Food, agriculture & forests",
    description: "Agriculture, forestry and food-related services.",
  },
  "6": {
    de: "Energie, Gewerbe, Dienstleistungen",
    en: "Energy, business & services",
    description: "Energy and water, business support, public enterprises.",
  },
  "7": {
    de: "Verkehr und Nachrichtenwesen",
    en: "Transport & communications",
    description: "Roads, public transport, communications.",
  },
  "8": {
    de: "Finanzwirtschaft",
    en: "Interest, debt & financial assets",
    description: "Interest, asset management — inflated by fiscal-equalisation flows for donor and recipient Länder.",
  },
  "9": {
    de: "Allgemeine Finanzwirtschaft",
    en: "General financial management",
    description: "General financial transactions not assigned elsewhere.",
  },
  V: {
    de: "Versorgung",
    en: "Civil-servant pensions",
    description:
      "Pensions for retired civil servants (teachers, police, administration) — a statistical carve-out spanning the administration and education groups.",
  },
};

interface LandRow {
  code: string;
  total_meur: number;
  groups: Record<string, number>;
}

const landRows = laenderFunctions.laender as LandRow[];

function buildLandAccount(row: LandRow, title: string): SpendingAccount {
  const groups = Object.entries(row.groups)
    .filter(([, meur]) => meur > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([code, meur]) => ({
      code,
      name_de: GROUP_NAMES[code]?.de ?? code,
      name: GROUP_NAMES[code]?.en ?? code,
      description: GROUP_NAMES[code]?.description ?? "",
      amount_eur: Math.round(meur * 1e6),
    }));
  return {
    title,
    reference_year: laenderFunctions.reference_year,
    basis: `${laenderFunctions.measure}. 2021 is the newest year with function data comparable across all Länder.`,
    source: laenderFunctions.source,
    total_eur: Math.round(row.total_meur * 1e6),
    unassigned_eur: 0,
    groups,
  };
}

/** Land + municipalities spending by function, 2021 (comparable across Länder). */
export function getLandAccount(code: string, landName: string): SpendingAccount | undefined {
  const row = landRows.find((candidate) => candidate.code === code);
  return row ? buildLandAccount(row, `${landName} — spending 2021`) : undefined;
}

/** All Länder combined — the same-vintage comparison baseline. */
export function getLaenderAggregateAccount(): SpendingAccount {
  const row = landRows.find((candidate) => candidate.code === "DE_LAENDER")!;
  return buildLandAccount(row, "All Länder — spending 2021");
}

interface SocialSystem {
  id: string;
  name: string;
  name_de: string;
  expenditure_meur: number;
  main_expenditure: { label: string; label_de: string; meur: number }[];
  source: { label: string; url: string };
  status: string;
}

const systems = socialInsurance.systems as SocialSystem[];

/** One statutory social-insurance system's 2024 expenditure as an account view. */
export function getSocialAccount(id: string): SpendingAccount | undefined {
  const system = systems.find((candidate) => candidate.id === id);
  if (!system) {
    return undefined;
  }
  const main = system.main_expenditure.map((item) => ({
    code: item.label_de,
    name_de: item.label_de,
    name: item.label,
    description: `${item.label} (${item.label_de}), 2024 actual.`,
    amount_eur: Math.round(item.meur * 1e6),
  }));
  const rest = system.expenditure_meur - system.main_expenditure.reduce((sum, item) => sum + item.meur, 0);
  const groups = [
    ...main,
    ...(rest > 0.5
      ? [
          {
            code: "other",
            name_de: "Übrige Ausgaben",
            name: "Other expenditure",
            description: "Remaining expenditure not itemised in the main blocks.",
            amount_eur: Math.round(rest * 1e6),
          },
        ]
      : []),
  ].sort((a, b) => b.amount_eur - a.amount_eur);
  return {
    title: `${system.name} — spending 2024`,
    reference_year: socialInsurance.reference_year,
    basis: `Final 2024 results of the ${system.name_de}.`,
    source: system.source,
    total_eur: Math.round(system.expenditure_meur * 1e6),
    unassigned_eur: 0,
    groups,
  };
}

export const socialSystemIds = systems.map((system) => ({ id: system.id, name: system.name }));
