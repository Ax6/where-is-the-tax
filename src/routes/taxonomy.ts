/**
 * The whole map: every major named German tax family and where it goes by law,
 * from the constitutional assignment (Art. 106 GG) verified in the 2026-08-05
 * research report. Amounts appear only where the report recorded them; the rest
 * arrive with the verified dataset.
 */

import { artikel106, berlinTaxAccount2024, bmfDec2024, gemFinRef7, ustg12, type SourceRef } from "./data.ts";

const sgb4: SourceRef = {
  label: "Sozialgesetzbuch IV (social insurance framework)",
  url: "https://www.gesetze-im-internet.de/sgb_4/",
};

export interface TaxEntry {
  id: string;
  name: string;
  official?: string;
  split: string;
  description: string;
  amountNote?: string;
  sources: SourceRef[];
  routeId?: string;
}

export interface TaxGroup {
  id: string;
  title: string;
  blurb: string;
  entries: TaxEntry[];
}

export const taxonomy: TaxGroup[] = [
  {
    id: "joint",
    title: "Joint taxes — shared by the constitution",
    blurb: "The big ones. No level of government owns them; the split is fixed law or an annual statutory formula.",
    entries: [
      {
        id: "wage_income_tax",
        name: "Wage & assessed income tax",
        official: "Lohnsteuer · Einkommensteuer",
        split: "42.5% Federation · 42.5% Länder · 15% municipalities",
        description:
          "Tax on what people earn — withheld from paychecks or assessed yearly. The Länder share is cleared to where the employee lives.",
        sources: [artikel106],
        routeId: "wage",
      },
      {
        id: "vat",
        name: "VAT",
        official: "Umsatzsteuer",
        split: "Annual formula: 2024 ≈ 48.1% / 49.1% / 2.8%",
        description:
          "Tax on almost everything you buy. Pooled nationally, split by an annual statutory formula, equalised across Länder.",
        amountNote: "2024 total allocated: €302.1bn.",
        sources: [artikel106, ustg12],
        routeId: "vat",
      },
      {
        id: "corporation_tax",
        name: "Corporation tax",
        official: "Körperschaftsteuer",
        split: "50% Federation · 50% Länder",
        description:
          "Tax on company profits. The Länder half is divided between Länder mainly by where the firm's establishments pay wages.",
        sources: [artikel106],
      },
      {
        id: "withholding_tax",
        name: "Tax on interest & capital gains",
        official: "Abgeltungsteuer",
        split: "44% Federation · 44% Länder · 12% municipalities",
        description: "Flat withholding tax on savings interest, dividends, and capital gains.",
        sources: [artikel106],
      },
    ],
  },
  {
    id: "federation",
    title: "Federation only",
    blurb: "Assigned exclusively to the federal budget by Article 106.",
    entries: [
      {
        id: "energy_tax",
        name: "Energy tax",
        official: "Energiesteuer",
        split: "100% Federation",
        description: "Excise on petrol, diesel, heating oil and gas — paid at the pump on top of VAT.",
        sources: [artikel106],
      },
      {
        id: "electricity_tax",
        name: "Electricity tax",
        official: "Stromsteuer",
        split: "100% Federation",
        description: "Excise on electricity consumption, part of every power bill.",
        sources: [artikel106],
      },
      {
        id: "tobacco_tax",
        name: "Tobacco tax",
        official: "Tabaksteuer",
        split: "100% Federation",
        description: "Excise on cigarettes and tobacco products, on top of VAT.",
        sources: [artikel106],
      },
      {
        id: "insurance_tax",
        name: "Insurance tax",
        official: "Versicherungsteuer",
        split: "100% Federation",
        description: "Tax on insurance premiums — the reason your liability policy lists a 19% tax line that is not VAT.",
        sources: [artikel106],
      },
      {
        id: "motor_vehicle_tax",
        name: "Motor-vehicle tax",
        official: "Kraftfahrzeugsteuer",
        split: "100% Federation",
        description: "Yearly tax on registered vehicles, based on engine and emissions.",
        sources: [artikel106],
      },
      {
        id: "aviation_alcohol_coffee",
        name: "Aviation, alcohol & coffee taxes",
        official: "Luftverkehr-, Alkohol-, Kaffeesteuer",
        split: "100% Federation",
        description: "Smaller federal excises: air tickets, spirits, and — genuinely — coffee.",
        sources: [artikel106],
      },
      {
        id: "soli",
        name: "Solidarity surcharge",
        official: "Solidaritätszuschlag",
        split: "100% Federation",
        description:
          "A 5.5% surcharge on income and corporate tax, introduced in 1991 for reunification. Since 2021 only high earners and companies pay it.",
        sources: [artikel106],
      },
    ],
  },
  {
    id: "laender",
    title: "Länder only",
    blurb: "Belong to the Land where the event happens.",
    entries: [
      {
        id: "inheritance_tax",
        name: "Inheritance & gift tax",
        official: "Erbschaft- und Schenkungsteuer",
        split: "100% Land",
        description: "Tax on inheritances and large gifts, owed to the Land of the deceased or donor.",
        sources: [artikel106],
      },
      {
        id: "transfer_tax",
        name: "Real-estate transfer tax",
        official: "Grunderwerbsteuer",
        split: "100% Land",
        description: "Due when property changes hands; each Land sets its own rate — Berlin charges 6%.",
        amountNote: "Berlin 2024: €911m.",
        sources: [artikel106, berlinTaxAccount2024],
        routeId: "housing",
      },
      {
        id: "beer_betting_tax",
        name: "Beer & betting taxes",
        official: "Bier-, Rennwett- und Lotteriesteuer",
        split: "100% Land",
        description: "Beer carries a Land excise (spirits are federal); betting and lotteries are taxed by the Länder.",
        sources: [artikel106],
      },
    ],
  },
  {
    id: "municipal",
    title: "Municipal",
    blurb: "Belong to the municipality — in Berlin's case, Berlin itself.",
    entries: [
      {
        id: "trade_tax",
        name: "Trade tax",
        official: "Gewerbesteuer",
        split: "Municipality, minus a statutory levy",
        description:
          "The main municipal tax, on business profits. A statutory levy passes a component up; Berlin remits only the federal part.",
        amountNote: "Berlin 2024 gross: €3.01bn.",
        sources: [artikel106, gemFinRef7, berlinTaxAccount2024],
        routeId: "trade",
      },
      {
        id: "property_tax",
        name: "Property tax",
        official: "Grundsteuer",
        split: "100% municipality",
        description: "Yearly tax on real property; commonly passed on to renters through service charges.",
        amountNote: "Berlin 2024: €870m.",
        sources: [artikel106, berlinTaxAccount2024],
        routeId: "housing",
      },
      {
        id: "local_excises",
        name: "Local consumption taxes",
        official: "z.B. Hundesteuer, Zweitwohnungsteuer",
        split: "100% municipality",
        description: "Small local taxes municipalities may levy — dog tax, second-home tax, and similar.",
        sources: [artikel106],
      },
    ],
  },
  {
    id: "eu",
    title: "European Union",
    blurb: "Collected in Germany, owed to the EU as own resources.",
    entries: [
      {
        id: "customs",
        name: "Customs duties",
        official: "Zölle",
        split: "EU own resources",
        description:
          "Duties on imports from outside the EU. Collected by German customs, forwarded to the EU budget.",
        amountNote: "2024: €5.5bn (of €32.0bn total German EU own resources).",
        sources: [bmfDec2024],
      },
    ],
  },
  {
    id: "contributions",
    title: "Social insurance contributions — the parallel branch",
    blurb: "Not taxes. Payroll contributions assigned directly to the statutory insurance systems.",
    entries: [
      {
        id: "pension_contributions",
        name: "Pension insurance",
        official: "Rentenversicherung",
        split: "To the statutory pension system",
        description:
          "The biggest paycheck deduction after wage tax. Goes to the pension system, not into any government budget — the systems also receive federal grants.",
        sources: [sgb4],
      },
      {
        id: "health_care_unemployment",
        name: "Health, care & unemployment insurance",
        official: "Kranken-, Pflege-, Arbeitslosenversicherung",
        split: "To each statutory system",
        description:
          "Contributions assigned to the statutory health funds, long-term care insurance, and the Federal Employment Agency.",
        sources: [sgb4],
      },
    ],
  },
];

export function getTaxEntry(id: string): { group: TaxGroup; entry: TaxEntry } | undefined {
  for (const group of taxonomy) {
    const entry = group.entries.find((candidate) => candidate.id === id);
    if (entry) {
      return { group, entry };
    }
  }
  return undefined;
}
