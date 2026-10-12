/**
 * Common spending categories across budgets, for "your € per year, pro rata*".
 *
 * The budgets your money enters classify spending differently: the federal Funktionenplan (codes),
 * the Destatis function groups for Länder and municipalities (German names / product areas), Berlin's
 * Funktionenplan-style account, and the social insurers' own expenditure lines. This module maps each of
 * them to eight common categories. It is a modelling choice (documented here, tested in tests/prorata.test.ts),
 * not an official classification; the page shows the result only as pro rata* ("if spread like these budgets").
 *
 * Rule for lines that mix categories and cannot be split in the source: a line goes to a named category only
 * when its own label says that category is the bulk of it; otherwise it goes to "other". A named category is
 * never inflated by a mixed line's minority part (e.g. municipal "building, transport, utilities" is not
 * "transport").
 *
 * Non-obvious mappings (everything else follows the line's own label):
 *
 * | Budget       | Source line                                                   | → category | Why                                                            |
 * |--------------|---------------------------------------------------------------|------------|----------------------------------------------------------------|
 * | Municipal    | Shaping the environment (building, transport, utilities)      | other      | mixed, not split; transport is a minority part                 |
 * | Municipal    | Health and sport                                              | other      | mixed, not split; no evidence that health is the bulk          |
 * | Municipal    | Central financial services (interest, levies)                 | other      | mixed, not split (interest + levies to other local bodies)     |
 * | Municipal    | Schools and culture                                           | education  | schools are the bulk; culture (not split) rides along          |
 * | Municipal    | Central administration                                        | admin      | internal administration is the bulk; incl. public order (Ordnungsamt, fire service), not split |
 * | Länder       | V, civil-servant pensions (Versorgung)                        | social     | pensions; a Destatis carve-out across groups 0 and 1           |
 * | Länder       | 8 Finanzwirtschaft: Beihilfen, Unterstützungen u. ä.          | other      | civil-servant allowances, not only health (as federal 84)      |
 * | Länder       | 8 Finanzwirtschaft: Schulden                                  | interest   | debt service                                                   |
 * | Länder       | 0 without public order, courts, defence                       | admin      | political leadership, central and financial administration     |
 * | Länder       | 3 without Gesundheitswesen (environment, sport)               | other      |                                                                |
 * | Berlin       | groups 3–6 and 8 (no sub-lines in the source)                 | other      | mixed, not split; group 8 is not only interest                 |
 * | Federal      | 2x social (221 and 224 grants removed as transfers)           | social     |                                                                |
 * | Federal      | 84 Beihilfen, Unterstützungen u. ä.                           | other      |                                                                |
 * | Pension      | Rehabilitation and participation benefits                     | health     | medical rehabilitation is the bulk                             |
 * | Health       | Sickness benefit (Krankengeld)                                | health     | a benefit of the health insurance                              |
 * | Health       | Other benefits and other expenditure (residual)               | other      | residual, not split                                            |
 * | Care         | Transfer to the care provision fund; other expenditure        | other      | a reserve, not care                                            |
 * | Unemployment | Staff and administration (incl. SGB II services for the Bund) | admin      | the source line's own label                                    |
 * | Unemployment | Reimbursement to the Bund                                     | other      |                                                                |
 */
import { bi, type Bi } from "../i18n.ts";

export type CommonId = "social" | "health" | "education" | "transport" | "order" | "interest" | "admin" | "other";

export const COMMON: { id: CommonId; label: Bi; short: Bi }[] = [
  { id: "social", label: bi("Soziale Sicherung und Renten", "Social security and pensions"), short: bi("Soziales und Renten", "social security and pensions") },
  { id: "health", label: bi("Gesundheit und Pflege", "Health and care"), short: bi("Gesundheit und Pflege", "health and care") },
  { id: "education", label: bi("Bildung und Forschung", "Education and research"), short: bi("Bildung und Forschung", "education and research") },
  { id: "transport", label: bi("Verkehr und Infrastruktur", "Transport and infrastructure"), short: bi("Verkehr und Infrastruktur", "transport and infrastructure") },
  { id: "order", label: bi("Verteidigung und öffentliche Ordnung", "Defence and public order"), short: bi("Verteidigung und Ordnung", "defence and public order") },
  { id: "interest", label: bi("Zinsen und Schulden", "Interest and debt"), short: bi("Zinsen und Schulden", "interest and debt") },
  { id: "admin", label: bi("Verwaltung", "Administration"), short: bi("Verwaltung", "administration") },
  { id: "other", label: bi("Übriges (Wirtschaft, Umwelt, Wohnen, Kultur, Transfers)", "Other (economy, environment, housing, culture, transfers)"), short: bi("Übriges", "other") },
];

export const commonLabel = (id: CommonId): Bi => COMMON.find((c) => c.id === id)!.label;

/**
 * Federal Funktionenplan, 2-digit function code (also used for Berlin's sub-functions).
 * 01/06 administration; 02 foreign affairs and aid → other; 03 defence, 04 public order, 05 courts → order;
 * 11–16 education and research; 18/19 culture → other; 2x social (the grants to pension and health insurance
 * in 221/224 are already removed as a transfer); 31 health; 32–34 sport, environment → other; 4x–6x → other;
 * 7x transport; 83 debt (interest) → interest; other 8x (assets, allocations, reserves) → other.
 */
export function federalCommon(code: string): CommonId {
  const two = code.slice(0, 2);
  if (two === "01" || two === "06") return "admin";
  if (two === "03" || two === "04" || two === "05") return "order";
  if (["11", "12", "13", "14", "15", "16"].includes(two)) return "education";
  if (two.startsWith("2")) return "social";
  if (two === "31") return "health";
  if (two.startsWith("7")) return "transport";
  if (two === "83") return "interest";
  return "other";
}

/**
 * Destatis Länder function groups (data/de/laender/functions-2022.json), with sub-functions where a group mixes
 * categories: group 0 splits into public order / courts (order) and the rest (admin); group 1 culture → other;
 * group 3 health → health, the rest → other; group 8 "Schulden" (debt) → interest, the rest (allowances,
 * equalisation and other transfers, assets) → other; V (civil-servant pensions, a Destatis carve-out across
 * groups 0 and 1) → social.
 */
export function laenderCommon(group: string, functionKey?: string): CommonId {
  const key = functionKey ?? "";
  switch (group) {
    case "0":
      return /^(Öffentliche Sicherheit|Rechtsschutz|Verteidigung)/.test(key) ? "order" : "admin";
    case "1":
      return /^Kultur/.test(key) ? "other" : "education";
    case "2":
      return "social";
    case "3":
      return /Gesundheitswesen/.test(key) ? "health" : "other";
    case "7":
      return "transport";
    case "8":
      return /Schulden/.test(key) ? "interest" : "other";
    case "V":
      return "social";
    default:
      return "other";
  }
}

/** Berlin 2024 account: children carry Funktionenplan codes; groups 3–8 have no sub-lines in the source. */
export function berlinCommon(group: string, childCode?: string): CommonId {
  if (childCode) {
    return federalCommon(childCode);
  }
  switch (group) {
    case "2":
      return "social";
    case "7":
      return "transport"; // transport and communications
    default:
      // 3 health/environment/sport, 4 housing, 5 agriculture, 6 economy, 8 financial management
      // (interest, assets, allowances, transfers): mixed and not split in the source
      return "other";
  }
}

/**
 * Municipal product areas (data/de/municipal/functions-2024.json), none split further in the source.
 * "Shaping the environment" (building, transport, utilities), "health and sport" and "central financial services"
 * are mixed → other; "schools and culture" → education and "central administration" → admin (their bulk).
 */
export function municipalCommon(area: string): CommonId {
  switch (area) {
    case "central_admin":
      return "admin";
    case "school_culture":
      return "education";
    case "social_youth":
      return "social";
    default:
      return "other";
  }
}

/** Social insurers' expenditure lines, by the English label in data/de/social-insurance/accounts.json. */
export function socialCommon(system: "pension" | "health" | "care" | "unemp", labelEn: string): CommonId {
  if (/administration|Administration/.test(labelEn) && !/Staff and administration/.test(labelEn)) {
    return "admin";
  }
  if (system === "pension") {
    if (/Rehabilitation/.test(labelEn)) return "health";
    if (/Further expenditure/.test(labelEn)) return "other";
    return "social";
  }
  if (system === "health" || system === "care") {
    // residual and reserve lines are not care or treatment
    if (/care provision fund|[Oo]ther expenditure/.test(labelEn)) return "other";
    return "health";
  }
  // unemployment insurance
  if (/Staff and administration/.test(labelEn)) return "admin";
  if (/reimbursement to the Bund/i.test(labelEn)) return "other";
  return "social";
}
