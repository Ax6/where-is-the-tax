/**
 * The only place the front end touches data/. Every file here is listed in data/manifest.json and built
 * by scripts/research/build_*.py. Nothing in src/ hard-codes a figure; numbers come from these files.
 */
import payslipParameters from "../../data/de/citizen/payslip-parameters.json" with { type: "json" };
import purchaseTaxes from "../../data/de/citizen/purchase-taxes.json" with { type: "json" };
import wageReference from "../../data/de/citizen/wage-reference.json" with { type: "json" };
import householdIndirectTaxes from "../../data/de/citizen/household-indirect-taxes.json" with { type: "json" };
import funktionenplan from "../../data/de/federal/funktionenplan.json" with { type: "json" };
import legalAllocation from "../../data/de/taxes/legal-allocation.json" with { type: "json" };
import byTax from "../../data/de/taxes/by-tax.json" with { type: "json" };
import byRecipient from "../../data/de/taxes/by-recipient.json" with { type: "json" };
import federalBudget2024 from "../../data/de/federal/budget-2024.json" with { type: "json" };
import federalOverview from "../../data/de/federal/overview.json" with { type: "json" };
import laenderFunctions2022 from "../../data/de/laender/functions-2022.json" with { type: "json" };
import berlinFunctions2024 from "../../data/de/berlin/functions-2024.json" with { type: "json" };
import municipalFunctions2024 from "../../data/de/municipal/functions-2024.json" with { type: "json" };
import socialInsurance from "../../data/de/social-insurance/accounts.json" with { type: "json" };
import cofog from "../../data/de/government/cofog.json" with { type: "json" };
import aggregates from "../../data/de/government/aggregates.json" with { type: "json" };
import equalisation2024 from "../../data/de/equalisation/2024.json" with { type: "json" };
import laenderMeta from "../../data/de/equalisation/laender-meta.json" with { type: "json" };
import population from "../../data/de/population.json" with { type: "json" };
import euRoundTrip from "../../data/de/eu/round-trip.json" with { type: "json" };
import laenderGeo from "../../data/geo/de-laender.json" with { type: "json" };

export const raw = {
  payslipParameters,
  purchaseTaxes,
  wageReference,
  householdIndirectTaxes,
  funktionenplan,
  legalAllocation,
  byTax,
  byRecipient,
  federalBudget2024,
  federalOverview,
  laenderFunctions2022,
  berlinFunctions2024,
  municipalFunctions2024,
  socialInsurance,
  cofog,
  aggregates,
  equalisation2024,
  laenderMeta,
  population,
  euRoundTrip,
  laenderGeo,
};

/** Repository paths of the files above, for source links. */
export const files = {
  payslipParameters: "data/de/citizen/payslip-parameters.json",
  payslipExamples: "data/de/citizen/payslip-examples.json",
  purchaseTaxes: "data/de/citizen/purchase-taxes.json",
  wageReference: "data/de/citizen/wage-reference.json",
  householdIndirectTaxes: "data/de/citizen/household-indirect-taxes.json",
  funktionenplan: "data/de/federal/funktionenplan.json",
  legalAllocation: "data/de/taxes/legal-allocation.json",
  byTax: "data/de/taxes/by-tax.json",
  byRecipient: "data/de/taxes/by-recipient.json",
  federalBudget2024: "data/de/federal/budget-2024.json",
  federalOverview: "data/de/federal/overview.json",
  laenderFunctions2022: "data/de/laender/functions-2022.json",
  berlinFunctions2024: "data/de/berlin/functions-2024.json",
  municipalFunctions2024: "data/de/municipal/functions-2024.json",
  socialInsurance: "data/de/social-insurance/accounts.json",
  cofog: "data/de/government/cofog.json",
  aggregates: "data/de/government/aggregates.json",
  equalisation2024: "data/de/equalisation/2024.json",
  laenderMeta: "data/de/equalisation/laender-meta.json",
  population: "data/de/population.json",
  euRoundTrip: "data/de/eu/round-trip.json",
  laenderGeo: "data/geo/de-laender.json",
} as const;

export type DataFileKey = keyof typeof files;

export const REPO_URL = "https://github.com/Ax6/where-is-the-tax";
export const repoBlob = (path: string): string => `${REPO_URL}/blob/main/${path}`;
