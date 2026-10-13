/**
 * Data adapter: turns the rationalized data/ files into the view models of the slide.
 * Pure functions, no DOM: used by the browser, the build-time static page and the tests.
 *
 * Rules applied here (docs/FRONTEND_PLAN.md, data/README.md):
 * - never add values across files with different bases or years;
 * - transfers between budgets are shown as transfers, never as the payer's spending;
 * - per-person euros beyond the boundary exist only as pro rata*.
 */
import { bi, type Bi } from "../i18n.ts";
import { computePayslip, type PayslipOptions, type PayslipParameters, type PayslipRow } from "./payslip.ts";
import { files, raw } from "./sources.ts";

export type EntityId = "fed" | "land" | "muni" | "eu" | "pension" | "health" | "care" | "unemp";
export type Status = "law" | "official" | "provisional" | "assumption" | "estimate";

export interface SourceLink {
  label: Bi;
  file: string;
  url?: string;
  coordinates?: string;
}

export interface Place {
  code: string;
  name: Bi;
  cityState: boolean;
  /** Berlin and Hamburg: Land and municipal level are one budget (one merged node). */
  merged: boolean;
}

export const GERMANY_CODE = "DE";

export const places: Place[] = raw.laenderMeta.laender.map((land) => ({
  code: land.code,
  name: land.name,
  cityState: land.city_state,
  merged: land.municipal_shares_in_land_budget,
}));

export function getPlace(code: string): Place | undefined {
  return places.find((place) => place.code === code.toUpperCase());
}

export const placeName = (code: string): Bi =>
  code === GERMANY_CODE ? bi("Alle Länder", "All Länder") : (getPlace(code)?.name ?? bi(code, code));

// ---------------------------------------------------------------------------------------------
// Population (per-resident framings)
// ---------------------------------------------------------------------------------------------

/** Years the page offers (one global switch). 2026 appears only as one payslip line in the drawer. */
export const PAGE_YEARS = [2024, 2025] as const;
export const DEFAULT_PAGE_YEAR = 2025;
export type PageYear = (typeof PAGE_YEARS)[number];

export const populationOf = (year: number): number => (raw.population.germany as Record<string, number>)[String(year)] ?? (raw.population.germany as Record<string, number>)["2024"]!;
export const daysIn = (year: number): number => (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 366 : 365);
export const POPULATION_2024 = populationOf(2024);
export const DAYS_2024 = 366;
export const perResidentPerDay = (eur: number, year = 2024): number => eur / populationOf(year) / daysIn(year);

// ---------------------------------------------------------------------------------------------
// Statutory splits (legal-allocation.json)
// ---------------------------------------------------------------------------------------------

interface AllocationRow {
  id: string;
  label: Bi;
  group: string;
  kind: string;
  shares: Partial<Record<"federation" | "laender" | "municipalities" | "eu", number>> | null;
  legal_basis: { section: string; quote: string; source: { url?: string; file?: string; coordinates?: string } }[];
  receipts_eur: Record<string, number | null>;
  note: Bi | null;
}

export const allocationRows = raw.legalAllocation.rows as unknown as AllocationRow[];
export const allocation = (id: string): AllocationRow => {
  const row = allocationRows.find((candidate) => candidate.id === id);
  if (!row) {
    throw new Error(`legal-allocation.json has no row ${id}`);
  }
  return row;
};

const shareOf = (id: string, recipient: "federation" | "laender" | "municipalities" | "eu"): number =>
  allocation(id).shares?.[recipient] ?? 0;

export const equalisationFile = (year: number) => (year >= 2025 ? raw.equalisation2025 : raw.equalisation2024);

/** Effective VAT split of a year (outcome of the annual § 1 FAG formula), equalisation/<year>.json. */
export function vatSplit(year: number) {
  const vat = equalisationFile(year).totals.vat;
  return {
    year: equalisationFile(year).year as number,
    total: vat.total.value,
    fed: vat.bund.value,
    laender: vat.laender.value,
    muni: vat.gemeinden.value,
    sharesPct: vat.effective_shares_pct,
  };
}
export const vatSplit2024 = vatSplit(2024);

// ---------------------------------------------------------------------------------------------
// Payslip (You zoom)
// ---------------------------------------------------------------------------------------------

export const payslipParams = raw.payslipParameters as unknown as PayslipParameters;
export const payslipYears = raw.payslipParameters.years_covered as number[];

export function payslip(year: number, gross: number, options: PayslipOptions = {}): PayslipRow {
  return computePayslip(payslipParams, year, gross, options);
}

/** Saxony keeps a public holiday the other Länder gave up: the employee bears more of the care contribution (§ 58 Abs. 3 SGB XI). */
export const SAXONY_CODE = "SN";

interface WageYear {
  minimum_wage?: { hourly_eur: number; annual_full_time_eur: number; annual_assumption: string } | null;
  full_time_earnings?: { annual?: { median_gross_annual_eur: number; average_gross_annual_eur: number } } | null;
}
const wageYears = (raw.wageReference as unknown as { years: Record<string, WageYear> }).years;

export interface WageTick {
  id: "minimum" | "median" | "average";
  value: number;
  /** year of the figure when it differs from the payslip year (newest available) */
  fromYear?: number;
  star?: boolean;
}

/**
 * Slider reference points (data/de/citizen/wage-reference.json), all full-time: minimum wage annualised
 * (40 h × 52 weeks, derived*), median and average annual earnings. Earnings for a year that is not
 * published yet come from the newest earlier year and say so.
 */
export function wageTicks(year: number): WageTick[] {
  const ticks: WageTick[] = [];
  const minimum = wageYears[String(year)]?.minimum_wage;
  if (minimum) {
    ticks.push({ id: "minimum", value: minimum.annual_full_time_eur, star: true });
  }
  const earningsYear = Object.keys(wageYears)
    .map(Number)
    .filter((y) => y <= year && wageYears[String(y)]?.full_time_earnings?.annual)
    .sort((a, b) => b - a)[0];
  const annual = earningsYear ? wageYears[String(earningsYear)]!.full_time_earnings!.annual! : undefined;
  if (annual) {
    const fromYear = earningsYear !== year ? earningsYear : undefined;
    ticks.push({ id: "median", value: annual.median_gross_annual_eur, fromYear }, { id: "average", value: annual.average_gross_annual_eur, fromYear });
  }
  return ticks.sort((a, b) => a.value - b.value);
}

export const minimumWageAssumption = (year: number): string | undefined => wageYears[String(year)]?.minimum_wage?.annual_assumption;

/** Default wage: the full-time median (the typical full-time employee). */
export const defaultWage = (year: number): number => wageTicks(year).find((tick) => tick.id === "median")?.value ?? 50_000;

// ---------------------------------------------------------------------------------------------
// Flow graph types
// ---------------------------------------------------------------------------------------------

export type NodeKind = "neutral" | "entity" | "yours" | "ghost";

export interface FlowNode {
  id: string;
  stage: number;
  label: Bi;
  value: number;
  entity?: EntityId;
  kind: NodeKind;
  status: Status;
  mechanism?: Bi;
  /** extra line under the label (e.g. "42.5 % by law") */
  sub?: Bi;
  star?: boolean;
  /** ≈* part of the value that comes from the household estimate (never part of the exact payslip) */
  estimate?: number;
}

export interface FlowEdge {
  id: string;
  from: string;
  to: string;
  value: number;
  entity?: EntityId;
  status: Status;
  share?: number;
  ghost?: boolean;
  /** ≈* household estimate ribbon */
  estimate?: boolean;
}

export interface Flow {
  stages: Bi[];
  nodes: FlowNode[];
  edges: FlowEdge[];
}

// ---------------------------------------------------------------------------------------------
// Pots (the budgets each recipient's money joins)
// ---------------------------------------------------------------------------------------------

export interface PotCategory {
  id: string;
  label: Bi;
  value: number;
  star?: boolean;
  children?: { label: Bi; value: number }[];
}

export interface Pot {
  id: string;
  entity: EntityId;
  recipients: string[];
  label: Bi;
  total: number;
  year: number;
  status: Status;
  fenced: boolean;
  /** what the composition % refers to */
  compositionBase: number;
  compositionLabel: Bi;
  categories: PotCategory[];
  transferOut?: { label: Bi; value: number; to: { pot: string; value: number }[]; star?: boolean };
  transferIn?: { label: Bi; value: number; from: string };
  borrowed?: number;
  basis: Bi;
  note?: Bi;
  sources: SourceLink[];
  benchmark?: Benchmark;
}

export interface Benchmark {
  year: number;
  scope: Bi;
  groups: { id: string; label: Bi; shares: { code: string; share: number }[] }[];
  highlight: string;
}

/** Share of a pot's total it spends itself; the rest leaves as a transfer to other pots (e.g. federal grants). */
export const ownShare = (pot: Pot): number => (pot.transferOut && pot.total > 0 ? 1 - pot.transferOut.value / pot.total : 1);

interface SourceLike {
  url?: string;
  file?: string;
  coordinates?: string;
}
/** Names the source publishes in German only: shown as is, marked "(DE)" in English. */
const germanOnly = (name: string): Bi => bi(name, `${name} (DE)`);

const link = (label: Bi, file: string, source?: SourceLike | null): SourceLink => ({
  label,
  file,
  url: source?.url,
  coordinates: source?.coordinates,
});

/** Fold categories beyond the top `keep` into one "other" row so a pot never shows slivers. */
function fold(categories: PotCategory[], keep = 7, minShare = 0.01): PotCategory[] {
  const sorted = [...categories].sort((a, b) => b.value - a.value);
  const total = sorted.reduce((sum, c) => sum + c.value, 0);
  const small = sorted.filter((c, index) => index >= keep || c.value / total < minShare);
  if (small.length === 0) {
    return sorted;
  }
  if (small.length === 1) {
    // a single sliver folds together with the next-smallest category
    const next = sorted.filter((c) => !small.includes(c)).pop();
    if (next) {
      small.unshift(next);
    }
  }
  const head = sorted.filter((c) => !small.includes(c));
  const tail = small;
  return [
    ...head,
    {
      id: "other",
      label: bi(
        `Übrige (${tail.length})`,
        `Other (${tail.length})`,
      ),
      value: tail.reduce((sum, c) => sum + c.value, 0),
      children: tail.map((c) => ({ label: c.label, value: c.value })),
    },
  ];
}

// --- federal -------------------------------------------------------------------------------

interface FedFunction {
  code: string;
  label: Bi | null;
  amount_eur: number;
  funktionen?: FedFunction[];
}

interface FederalFile {
  year: number;
  official_total_eur: number;
  hauptfunktionen: FedFunction[];
  key_items: Record<string, { amount_eur: number | null; label?: Bi }>;
  sources: Record<string, SourceLike>;
  status: string;
}
const federalFile = (year: number): FederalFile =>
  (year >= 2025 ? raw.federalBudget2025 : raw.federalBudget2024) as unknown as FederalFile;
const federalPath = (year: number): string => (year >= 2025 ? files.federalBudget2025 : files.federalBudget2024);

const overviewRow = (id: string, year = 2024): number => {
  const row = (raw.federalOverview.rows as unknown as { id: string; values: Record<string, { value_eur: number | null } | null> }[]).find(
    (candidate) => candidate.id === id,
  );
  const value = row?.values[String(year)]?.value_eur;
  if (value === undefined || value === null) {
    throw new Error(`overview.json has no ${year} value for ${id}`);
  }
  return value;
};

function findFunction(code: string, year = 2024): FedFunction {
  const walk = (list: FedFunction[]): FedFunction | undefined => {
    for (const item of list) {
      if (item.code === code) {
        return item;
      }
      const inner = item.funktionen ? walk(item.funktionen) : undefined;
      if (inner) {
        return inner;
      }
    }
    return undefined;
  };
  const found = walk(federalFile(year).hauptfunktionen);
  if (!found) {
    throw new Error(`federal budget ${year} has no function ${code}`);
  }
  return found;
}

/** Federal function names from the Funktionenplan (data/de/federal/funktionenplan.json), else the budget file. */
const planLabels = new Map(
  (raw.funktionenplan as unknown as { rows: { code: string; label: Bi }[] }).rows.map((row) => [row.code, row.label]),
);
export const functionName = (code: string, fallback?: Bi | null): Bi =>
  planLabels.get(code) ?? fallback ?? bi(`Funktion ${code}`, `Function ${code}`);
const fnLabel = (fn: FedFunction): Bi => functionName(fn.code, fn.label);

/** Federal grants to the two social pools shown as pots: function 221 (pension) and 224 (health). */
export const federalGrantsOf = (year: number) => ({
  pension: findFunction("221", year).amount_eur,
  health: findFunction("224", year).amount_eur,
});
export const federalGrants = federalGrantsOf(2024);

function federalPot(year: number): Pot {
  const federal = federalFile(year);
  const grants = federalGrantsOf(year);
  const transfer = grants.pension + grants.health;
  const categories: PotCategory[] = federal.hauptfunktionen.map((hf) => {
    const removed = hf.code === "2" ? transfer : 0;
    const children = (hf.funktionen ?? [])
      .map((fn) => ({
        label: fnLabel(fn),
        value: fn.code === "22" ? fn.amount_eur - transfer : fn.amount_eur,
      }))
      .filter((child) => Math.abs(child.value) > 0.5e9)
      .sort((a, b) => b.value - a.value);
    return { id: `hf${hf.code}`, label: functionName(hf.code, hf.label), value: hf.amount_eur - removed, children };
  });
  const own = federal.official_total_eur - transfer;
  const article = (raw.federalOverview.sources as Record<string, SourceLike>)[`${year}_article`];
  return {
    id: "pot-fed",
    entity: "fed",
    recipients: ["r-fed"],
    label: bi("Bundeshaushalt", "Federal budget"),
    total: federal.official_total_eur,
    year,
    status: "provisional",
    fenced: false,
    compositionBase: own,
    compositionLabel: bi("Ausgaben des Bundes (ohne Zuschüsse an die Sozialversicherung)", "Federation spending (excluding grants to social insurance)"),
    categories: fold(categories, 6),
    transferOut: {
      label: bi("Zuschüsse an Renten- und Krankenversicherung (alle Zweige)", "Grants to pension and health insurance (all schemes)"),
      value: transfer,
      to: [
        { pot: "pot-pension", value: grants.pension },
        { pot: "pot-health", value: grants.health },
      ],
    },
    borrowed: overviewRow("nettokreditaufnahme", year),
    basis: bi("Kernhaushalt des Bundes, tatsächliche Ausgaben, wie das BMF sie zählt", "Core federal budget, actual spending, as the BMF counts it"),
    sources: [
      link(bi(`Haushaltsrechnung des Bundes ${year} (XML)`, `Federal budget account ${year} (XML)`), federalPath(year), federal.sources.xml),
      link(bi(`BMF Monatsbericht: Abschluss ${year}`, `BMF monthly report: closing ${year}`), files.federalOverview, article),
    ],
  };
}

// --- Länder ----------------------------------------------------------------------------------

interface LaenderMeasure {
  total_meur: number | null;
  groups_meur: Record<string, number>;
  functions_meur: Record<string, number | null>;
}
const laender = raw.laenderFunctions2022 as unknown as {
  year: number;
  groups: Record<string, Bi>;
  /** bilingual labels keyed by the German function key (added 2026-10-12); older builds lack it */
  function_labels?: Record<string, Bi>;
  scopes_data: Record<"land" | "municipal" | "land_plus_municipal", Record<string, { name: string; measures: { adjusted: LaenderMeasure } }>>;
  source: SourceLike;
  caveats: string[];
};

/**
 * functions_meur is a flat map keyed by German names, hierarchy joined with ", " (and names contain commas).
 * Groups 2–8 are keys themselves: their children are the keys "<group>, <child>" that do not extend another child.
 * Groups 0 and 1 are not keys: their top-level functions are listed here (Funktionenplan structure, no figures).
 */
const TOP_LEVEL_FUNCTIONS: Record<string, string[]> = {
  "0": ["Politische Führung und zentrale Verwaltung", "Auswärtige Angelegenheiten", "Verteidigung", "Öffentliche Sicherheit und Ordnung", "Rechtsschutz", "Finanzverwaltung"],
  "1": [
    "Allgemeinbildende und berufliche Schulen",
    "Hochschulen",
    "Förderung für Schülerinnen und Schüler, Studierende, Weiterbildungsteilnehmende u. dgl.",
    "Sonstiges Bildungswesen",
    "Wissenschaft, Forschung und Entwicklung außerhalb der Hochschulen",
    "Kultur und Religion",
  ],
};

function laenderChildren(measure: LaenderMeasure, code: string): { label: Bi; value: number }[] {
  return laenderChildEntries(measure, code)
    .map((entry) => ({ label: functionLabel(entry.key, entry.strip), value: entry.value }))
    .sort((a, b) => b.value - a.value);
}

function laenderChildEntries(measure: LaenderMeasure, code: string): { key: string; strip: number; value: number }[] {
  const entries = Object.entries(measure.functions_meur);
  const explicit = TOP_LEVEL_FUNCTIONS[code];
  let names: string[];
  let strip = 0;
  if (explicit) {
    names = explicit;
  } else {
    // The group's own key: same first word as the group's German name and the group's total as value.
    const firstWord = (laender.groups[code]?.de ?? "").split(/[ ,-]/)[0] ?? "";
    const groupValue = measure.groups_meur[code];
    const groupKey = entries.find(
      ([name, value]) => name.startsWith(firstWord) && typeof value === "number" && groupValue !== undefined && Math.abs(value - groupValue) < 0.001,
    )?.[0];
    if (!groupKey) {
      return [];
    }
    const prefix = `${groupKey}, `;
    const candidates = entries.map(([name]) => name).filter((name) => name.startsWith(prefix));
    names = candidates.filter((name) => !candidates.some((other) => other !== name && name.startsWith(`${other}, `)));
    strip = prefix.length;
  }
  return names
    .map((name) => ({ name, value: measure.functions_meur[name] }))
    .filter((entry): entry is { name: string; value: number } => typeof entry.value === "number" && entry.value > 0)
    .map((entry) => ({ key: entry.name, strip, value: entry.value * 1e6 }));
}

/** Label of a Länder function: the file's bilingual label (child part only), else the German name marked (DE). */
function functionLabel(key: string, strip: number): Bi {
  const label = laender.function_labels?.[key];
  if (!label) {
    return germanOnly(key.slice(strip));
  }
  const childEn = strip > 0 && label.en.includes(": ") ? label.en.slice(label.en.lastIndexOf(": ") + 2) : label.en;
  return bi(key.slice(strip), childEn);
}

function laenderCategories(measure: LaenderMeasure): PotCategory[] {
  return Object.entries(measure.groups_meur).map(([code, value]) => ({
    id: `g${code}`,
    label: laender.groups[code] ?? bi(code, code),
    value: value * 1e6,
    children: laenderChildren(measure, code),
  }));
}

function benchmark(highlight: string): Benchmark {
  const scope = laender.scopes_data.land_plus_municipal;
  const codes = places.map((place) => place.code);
  const groupIds = Object.keys(laender.groups);
  return {
    year: laender.year,
    scope: bi("Land und Gemeinden zusammen, bereinigte Ausgaben 2022", "Land and its municipalities together, adjusted spending 2022"),
    highlight,
    groups: groupIds.map((id) => ({
      id,
      label: laender.groups[id]!,
      shares: codes
        .map((code) => {
          const measure = scope[code]?.measures.adjusted;
          const total = measure?.total_meur;
          const value = measure?.groups_meur[id];
          return total && value !== undefined ? { code, share: value / total } : undefined;
        })
        .filter((entry): entry is { code: string; share: number } => Boolean(entry)),
    })),
  };
}

const laenderSource = (label: Bi): SourceLink => link(label, files.laenderFunctions2022, laender.source);

const berlin = raw.berlinFunctions2024 as unknown as {
  total_eur: number;
  year: number;
  status: string;
  groups: {
    code: string;
    label?: Bi;
    name?: string;
    name_de?: string;
    amount_eur: number;
    children?: { code: string; label?: Bi; name_de?: string; amount_eur: number }[];
  }[];
  source: SourceLike;
};

function landPot(place: Place | undefined): Pot {
  if (place?.code === "BE") {
    return {
      id: "pot-land",
      entity: "land",
      recipients: ["r-land"],
      label: bi("Haushalt Berlin (Land und Bezirke)", "Berlin budget (Land and boroughs)"),
      total: berlin.total_eur,
      year: berlin.year,
      status: "official",
      fenced: false,
      compositionBase: berlin.total_eur,
      compositionLabel: bi("Ausgaben nach Funktionen", "spending by function"),
      categories: fold(
        berlin.groups.map((group) => ({
          id: `g${group.code}`,
          label: group.label ?? bi(group.name_de ?? group.code, group.name ?? group.code),
          value: group.amount_eur,
          children: (group.children ?? []).map((child) => ({ label: child.label ?? germanOnly(child.name_de ?? child.code), value: child.amount_eur })),
        })),
        6,
      ),
      basis: bi("Haushaltsrechnung 2024 (Kasse), ganzer Berliner Haushalt", "Annual account 2024 (cash), whole Berlin budget"),
      sources: [link(bi("Haushaltsrechnung Berlin 2024, Drucksache 19/2681", "Berlin annual account 2024, printed paper 19/2681"), files.berlinFunctions2024, berlin.source)],
      benchmark: benchmark("BE"),
    };
  }
  const code = place?.code ?? "DE_LAENDER";
  const measure = laender.scopes_data.land[code]!.measures.adjusted;
  const name = place ? place.name : bi("Alle Länder", "All Länder");
  return {
    id: "pot-land",
    entity: "land",
    recipients: place?.code === "HB" ? ["r-land", "r-muni"] : ["r-land"],
    label: place ? bi(`Haushalt ${name.de}`, `${name.en} budget`) : bi("Haushalte der Länder", "Länder budgets"),
    total: (measure.total_meur ?? 0) * 1e6,
    year: laender.year,
    status: "official",
    fenced: false,
    compositionBase: (measure.total_meur ?? 0) * 1e6,
    compositionLabel: bi("bereinigte Ausgaben nach Aufgaben", "adjusted spending by function"),
    categories: fold(laenderCategories(measure), 6),
    basis: bi(
      "Jahresrechnungsstatistik 2022 (neueste Ausgabe), Kern- und Extrahaushalte",
      "Annual accounts statistics 2022 (newest edition), core and extra budgets",
    ),
    note:
      place?.code === "HB"
        ? bi("Die Statistik führt Bremen und Bremerhaven im Landeshaushalt.", "The statistics show Bremen and Bremerhaven inside the Land budget.")
        : bi("Gruppe 8 enthält Ausgleichszahlungen und Zinsen.", "Group 8 contains equalisation payments and interest."),
    sources: [laenderSource(bi("Destatis Rechnungsergebnisse 2022 (71711)", "Destatis annual accounts 2022 (71711)"))],
    benchmark: benchmark(place?.code ?? ""),
  };
}

// --- municipalities ----------------------------------------------------------------------

const municipal = raw.municipalFunctions2024 as unknown as {
  areas: Record<string, Bi>;
  germany_series: Record<string, Record<string, number>>;
  laender_2024: Record<string, { name: string; areas_meur: Record<string, number> }>;
  source: SourceLike;
};

function municipalPot(place: Place | undefined): Pot | undefined {
  if (place && (place.merged || place.code === "HB")) {
    return undefined;
  }
  const areas = place ? municipal.laender_2024[place.code]?.areas_meur : municipal.germany_series["2024"];
  if (!areas) {
    return undefined;
  }
  const total = (areas.total ?? 0) * 1e6;
  const name = place ? place.name : bi("Deutschland", "Germany");
  return {
    id: "pot-muni",
    entity: "muni",
    recipients: ["r-muni"],
    label: bi(`Gemeinden in ${name.de}`, place ? `Municipalities in ${name.en}` : "Municipalities"),
    total,
    year: 2024,
    status: "official",
    fenced: false,
    compositionBase: total,
    compositionLabel: bi("bereinigte Ausgaben nach Produktbereichen", "adjusted spending by product area"),
    categories: fold(
      Object.entries(areas)
        .filter(([id]) => id !== "total")
        .map(([id, value]) => ({ id, label: municipal.areas[id] ?? bi(id, id), value: value * 1e6 })),
    ),
    basis: bi("Jahresrechnungsstatistik 2024, kommunale Kernhaushalte", "Annual accounts statistics 2024, municipal core budgets"),
    sources: [link(bi("Destatis Rechnungsergebnisse der Gemeinden 2024 (71717)", "Destatis municipal annual accounts 2024 (71717)"), files.municipalFunctions2024, municipal.source)],
  };
}

// --- social insurance ------------------------------------------------------------------------

interface ValueItem {
  label?: Bi;
  value_eur: number | null;
  source?: { ref?: string; page?: number; coordinates?: string };
}
interface SocialYear {
  expenditure_total?: ValueItem;
  expenditure_items?: ValueItem[];
  revenue_total?: ValueItem;
  contributions_total?: ValueItem;
  contributions_by_payer?: Record<string, ValueItem>;
  federal_grants?: ValueItem;
  consolidated?: { expenditure_total_eur: number; revenue_total_eur: number; contributions_total: ValueItem; federal_grants?: ValueItem };
  krankenkassen?: { expenditure_items: ValueItem[]; expenditure_total: ValueItem; contributions_paid_to_other_systems: ValueItem | number };
}
const social = raw.socialInsurance as unknown as {
  year_status: Record<string, Record<string, string>>;
  systems: Record<string, { label: Bi; years: Record<string, SocialYear> }>;
  sources: Record<string, SourceLike>;
  transfers: { year: number; from: string; to: string; amount_eur: number | null; kind: string; label: Bi }[];
  payroll_view: Record<string, { components: { system: string; value_eur: number }[]; total_eur: number; label: Bi }>;
};

const socialYear = (system: string, year = 2024): SocialYear => social.systems[system]!.years[String(year)]!;
const valueOf = (item: ValueItem | number | undefined): number =>
  typeof item === "number" ? item : (item?.value_eur ?? 0);

/** Transfers of a year paid by `from` to the other three systems (transfer ledger). */
function ledger(from: string, kinds: string[] = ["contribution_paid_by_public_body"], year = 2024): number {
  return social.transfers
    .filter((tr) => tr.year === year && tr.from === from && kinds.includes(tr.kind))
    .reduce((sum, tr) => sum + (tr.amount_eur ?? 0), 0);
}

const SOCIAL_SOURCES: Record<string, string[]> = {
  pension: ["drv_fb"],
  health: ["kj1_2024"],
  ltc: ["spv_2024"],
  unemployment: ["ba_2024"],
};

function socialPot(entity: "pension" | "health" | "care" | "unemp", accountYear = 2024): Pot {
  const system = { pension: "pension", health: "health", care: "ltc", unemp: "unemployment" }[entity];
  const year = socialYear(system, accountYear);
  const meta = social.systems[system]!;
  let total = valueOf(year.expenditure_total);
  let items = (year.expenditure_items ?? []).map((item, index) => ({ id: `i${index}`, label: item.label ?? bi("", ""), value: valueOf(item) }));
  let transfer = 0;
  let transferLabel = bi("an andere Sozialversicherungen", "paid to other social insurers");
  let transferStar = false;
  const matches = (item: { label: Bi }, pattern: RegExp) => pattern.test(item.label.en);

  if (entity === "pension") {
    // KVdR: the pension insurer's share of pensioners' health contributions goes to the health insurance.
    const kvdr = items.find((item) => matches(item, /KVdR/));
    transfer = kvdr?.value ?? 0;
    transferStar = true; // upper bound: includes § 106 SGB VI subsidies to pensioners outside the GKV
    items = items.filter((item) => item !== kvdr);
    transferLabel = bi("an die Krankenversicherung der Rentner (KVdR)*", "to pensioners' health insurance (KVdR)*");
  } else if (entity === "health") {
    total = year.consolidated?.expenditure_total_eur ?? total;
    const kk = year.krankenkassen!;
    transfer = valueOf(kk.contributions_paid_to_other_systems);
    items = kk.expenditure_items.map((item, index) => ({ id: `i${index}`, label: item.label ?? bi("", ""), value: valueOf(item) }));
    const sickness = items.find((item) => matches(item, /Sickness benefit/));
    if (sickness) {
      sickness.value -= transfer;
    }
  } else if (entity === "care") {
    const carers = items.find((item) => matches(item, /Social security of family carers/));
    transfer = carers?.value ?? 0;
    items = items.filter((item) => item !== carers);
  } else {
    // Unemployment benefit I includes the contributions the BA pays for recipients to DRV, GKV and SPV.
    transfer = ledger("bundesagentur", undefined, accountYear) + ledger("bundesagentur", ["reimbursement"], accountYear);
    const alg = items.find((item) => matches(item, /Unemployment benefit I/));
    if (alg) {
      alg.value -= ledger("bundesagentur", undefined, accountYear);
    }
    items = items.filter((item) => !matches(item, /Reimbursements to pension and care/));
  }

  const compositionBase = items.reduce((sum, item) => sum + item.value, 0);
  const label = {
    pension: bi("Rentenversicherung", "Pension insurance"),
    health: bi("Krankenversicherung", "Health insurance"),
    care: bi("Pflegeversicherung", "Long-term care insurance"),
    unemp: bi("Arbeitslosenversicherung", "Unemployment insurance"),
  }[entity];
  // What the scheme shown here booked from the federal budget (its own accounts), not the federal function total:
  // pension = Bundeszuschüsse + contributions for child-raising periods; health = Bundeszuschuss § 221 SGB V + farmers' subsidies.
  const fedIn =
    entity === "pension"
      ? valueOf(year.federal_grants) + valueOf(year.contributions_by_payer?.federal_budget)
      : entity === "health"
        ? valueOf(year.consolidated?.federal_grants)
        : 0;
  const status = /^provisional/.test(social.year_status[String(accountYear)]?.[system] ?? "") ? "provisional" : "official";
  return {
    id: `pot-${entity}`,
    entity,
    recipients: [`r-${entity}`],
    label,
    total,
    year: accountYear,
    status,
    fenced: true,
    compositionBase,
    compositionLabel: bi("eigene Ausgaben ohne Zahlungen an andere Sozialversicherungen", "own spending, without payments to other social insurers"),
    categories: fold(items, 6),
    transferOut: transfer > 0 ? { label: transferLabel, value: transfer, to: [], star: transferStar } : undefined,
    transferIn:
      fedIn > 0
        ? {
            label: entity === "pension" ? bi("Zuschüsse und Beiträge aus dem Bundeshaushalt (laut DRV-Rechnung)", "Grants and contributions from the federal budget (per the DRV accounts)") : bi("Bundeszuschuss (laut GKV-Rechnung)", "Federal grant (per the GKV accounts)"),
            value: fedIn,
            from: "pot-fed",
          }
        : undefined,
    basis: bi(`${meta.label.de}, Rechnungsergebnis ${accountYear}`, `${meta.label.en}, accounts ${accountYear}`),
    sources: (SOCIAL_SOURCES[system] ?? []).map((ref) =>
      link(bi(`${meta.label.de} ${accountYear}`, `${meta.label.en} ${accountYear}`), files.socialInsurance, social.sources[ref.replace("2024", String(accountYear))] ?? social.sources[ref]),
    ),
  };
}

export const payrollViewOf = (year: number) => social.payroll_view[String(year)] ?? social.payroll_view["2024"]!;
export const payrollView2024 = payrollViewOf(2024);

// ---------------------------------------------------------------------------------------------
// Household indirect taxes (estimate ≈*), data/de/citizen/household-indirect-taxes.json
// ---------------------------------------------------------------------------------------------

interface HouseholdClass {
  household_net_income_class_de: string;
  consumption_month_eur: number;
  vat_year_eur: number;
  excises_year_eur: Record<string, number>;
  indirect_taxes_year_eur: number;
  share_of_consumption: number;
  recipients_year_eur: { bund: number; laender: number; gemeinden: number };
}
const household = raw.householdIndirectTaxes as unknown as {
  class_order: string[];
  classes: Record<string, HouseholdClass>;
  caveats: string[];
  basis: string;
  method: Record<string, string>;
  sources: Record<string, SourceLike>;
};

export interface HouseholdEstimate {
  /** survey year of the consumption data (LWR) */
  year: number;
  classId: string;
  /** monthly household net income bounds of the class, EUR */
  from: number;
  to: number | null;
  label: Bi;
  monthlyNet: number;
  total: number;
  vat: number;
  excises: Record<string, number>;
  recipients: { fed: number; land: number; muni: number };
  consumptionMonth: number;
  shareOfConsumption: number;
}

/** Classes by monthly household net income, parsed from the class names ("1300 bis unter 2600 Euro"). */
export const householdClasses = household.class_order
  .filter((id) => /\d/.test(id))
  .map((id) => {
    const numbers = (id.match(/\d+/g) ?? []).map(Number);
    const from = /^Unter/.test(id) ? 0 : numbers[0]!;
    const to = /^Unter/.test(id) ? numbers[0]! : /und mehr/.test(id) ? null : numbers[1]!;
    return { id, from, to };
  });

/**
 * ≈* indirect taxes for the household class the payslip's net pay falls into (net ÷ 12, single earner, as the
 * file's method suggests). An estimate by household, not a person; shown next to the exact payslip, never in it.
 */
export function householdEstimate(netAnnual: number): HouseholdEstimate {
  const monthly = netAnnual / 12;
  const found = householdClasses.find((c) => monthly >= c.from && (c.to === null || monthly < c.to)) ?? householdClasses[0]!;
  const c = household.classes[found.id]!;
  const range = (lang: "de" | "en") => {
    const n = (v: number) => v.toLocaleString(lang === "de" ? "de-DE" : "en-GB");
    if (found.from === 0) return lang === "de" ? `unter ${n(found.to!)} €` : `under €${n(found.to!)}`;
    if (found.to === null) return lang === "de" ? `ab ${n(found.from)} €` : `€${n(found.from)} and more`;
    return lang === "de" ? `${n(found.from)}–${n(found.to)} €` : `€${n(found.from)}–${n(found.to)}`;
  };
  return {
    year: Number(/LWR (\d{4})/.exec(household.basis)?.[1] ?? 2024),
    classId: found.id,
    from: found.from,
    to: found.to,
    label: bi(`Haushaltsnetto ${range("de")} im Monat`, `household net ${range("en")} a month`),
    monthlyNet: monthly,
    total: c.indirect_taxes_year_eur,
    vat: c.vat_year_eur,
    excises: c.excises_year_eur,
    recipients: { fed: c.recipients_year_eur.bund, land: c.recipients_year_eur.laender, muni: c.recipients_year_eur.gemeinden },
    consumptionMonth: c.consumption_month_eur,
    shareOfConsumption: c.share_of_consumption,
  };
}

export const householdCaveats = household.caveats;
export const householdSource = (): SourceLink[] => [
  link(bi("Destatis Laufende Wirtschaftsrechnungen 2024 (63111)", "Destatis household budget survey 2024 (63111)"), files.householdIndirectTaxes, household.sources.lwr),
  { label: bi("Steuersätze und Verteilung: Umsatzsteuer 2024, Verbrauchsteuern", "Rates and split: VAT 2024 outcome, excises"), file: files.householdIndirectTaxes, coordinates: household.method.recipients },
];

// ---------------------------------------------------------------------------------------------
// You zoom: payslip → recipients → pots
// ---------------------------------------------------------------------------------------------

export interface YouModel {
  year: number;
  gross: number;
  place: Place | undefined;
  payslip: PayslipRow;
  flow: Flow;
  pots: Pot[];
  /** personal euros reaching each pot (sum of its recipients), exact payslip only */
  inflow: Record<string, number>;
  /** your euros that reach a social pot indirectly: the federal pot passes on its grants pro rata (keyed by pot id) */
  grantIn: Record<string, number>;
  /** ≈* indirect taxes on what the household buys, when the Shopping layer is on */
  estimate?: HouseholdEstimate;
}

/** Your euros joining a pot: directly from the payslip plus, for pension and health, your share of the federal grants. */
export const potInflow = (you: YouModel, pot: Pot): number => (you.inflow[pot.id] ?? 0) + (you.grantIn[pot.id] ?? 0);

export const ENTITY_ORDER: EntityId[] = ["fed", "land", "muni", "eu", "pension", "health", "care", "unemp"];

export function buildYou(year: number, gross: number, placeCode: string, options: { estimate?: boolean } = {}): YouModel {
  const place = getPlace(placeCode);
  const saxony = place?.code === SAXONY_CODE;
  const p = payslip(year, gross, { saxony });
  const d = p.deductions_employee;
  const er = p.employer_contributions;
  const wageTaxShares = {
    fed: shareOf("STEUERARTG10", "federation"),
    land: shareOf("STEUERARTG10", "laender"),
    muni: shareOf("STEUERARTG10", "municipalities"),
  };
  const merged = place?.merged ?? false;
  const landName = place ? place.name : bi("Ihr Land", "Your Land");

  const nodes: FlowNode[] = [
    { id: "gross", stage: 0, label: bi("Bruttolohn", "Gross wage"), value: gross, kind: "neutral", status: "law" },
    {
      id: "employer",
      stage: 0,
      label: bi("zahlt Ihr Arbeitgeber zusätzlich", "paid on top by your employer"),
      value: p.totals.social_employer,
      kind: "ghost",
      status: "law",
    },
    { id: "net", stage: 1, label: bi("Netto: bleibt Ihnen", "Net pay: yours"), value: p.totals.net, kind: "yours", status: "law" },
    {
      id: "wagetax",
      stage: 1,
      label: bi("Lohnsteuer", "Wage tax"),
      value: d.lohnsteuer,
      kind: "neutral",
      status: "law",
      mechanism: bi(
        "Vom Arbeitgeber einbehalten (§ 39b EStG). Gemeinschaftsteuer: 42,5 % Bund, 42,5 % Land, 15 % Gemeinden (Art. 106 GG, § 1 GemFinRefG).",
        "Withheld by the employer (§ 39b EStG). A joint tax: 42.5 % Federation, 42.5 % Land, 15 % municipalities (Art. 106 GG, § 1 GemFinRefG).",
      ),
    },
    {
      id: "soli",
      stage: 1,
      label: bi("Solidaritätszuschlag", "Solidarity surcharge"),
      value: d.soli,
      entity: "fed",
      kind: "entity",
      status: "law",
      mechanism: bi(
        "5,5 % der Lohnsteuer, erst oberhalb einer Freigrenze (§§ 3, 4 SolzG). Steht allein dem Bund zu.",
        "5.5 % of wage tax, only above an exemption limit (§§ 3, 4 SolzG). Goes to the Federation alone.",
      ),
    },
  ];
  const contributions: { entity: "pension" | "health" | "care" | "unemp"; key: "rv" | "kv" | "pv" | "alv"; label: Bi }[] = [
    { entity: "pension", key: "rv", label: bi("Rentenbeitrag", "Pension contribution") },
    { entity: "health", key: "kv", label: bi("Krankenkassenbeitrag", "Health contribution") },
    { entity: "care", key: "pv", label: bi("Pflegebeitrag", "Care contribution") },
    { entity: "unemp", key: "alv", label: bi("Arbeitslosenbeitrag", "Unemployment contribution") },
  ];
  const half = bi("Je zur Hälfte von Ihnen und Ihrem Arbeitgeber, bis zur Beitragsbemessungsgrenze.", "Half paid by you, half by your employer, up to the contribution ceiling.");
  const mechanisms: Record<string, Bi> = {
    rv: half,
    alv: half,
    kv: bi(
      "Je zur Hälfte, bis zur Beitragsbemessungsgrenze. * Mit dem durchschnittlichen Zusatzbeitrag (§ 242a SGB V); jede Kasse erhebt ihren eigenen.",
      "Half each, up to the contribution ceiling. * With the average additional rate (§ 242a SGB V); each insurer charges its own.",
    ),
    pv: saxony
      ? bi("In Sachsen tragen Sie 0,5 Punkte mehr als Ihr Arbeitgeber (§ 58 Abs. 3 SGB XI); den Zuschlag für Kinderlose ab 23 zahlen Sie allein.", "In Saxony you bear 0.5 points more than your employer (§ 58 Abs. 3 SGB XI); the surcharge for the childless aged 23+ is paid by you alone.")
      : bi("Je zur Hälfte; den Zuschlag für Kinderlose ab 23 zahlen Sie allein.", "Half each; the surcharge for the childless aged 23+ is paid by you alone."),
  };
  for (const c of contributions) {
    nodes.push({
      id: `c-${c.entity}`,
      stage: 1,
      label: c.label,
      value: d[c.key] + er[c.key],
      entity: c.entity,
      kind: "entity",
      status: c.key === "kv" ? "assumption" : "law",
      star: c.key === "kv",
      mechanism: mechanisms[c.key],
    });
  }
  const recipients: FlowNode[] = [
    { id: "r-fed", stage: 2, label: bi("Bund", "Federation"), value: 0, entity: "fed", kind: "entity", status: "law" },
    merged
      ? { id: "r-land", stage: 2, label: bi(`${landName.de} (Land und Gemeinde)`, `${landName.en} (Land and municipal)`), value: 0, entity: "land", kind: "entity", status: "law" }
      : { id: "r-land", stage: 2, label: place ? landName : bi("Ihr Land", "Your Land"), value: 0, entity: "land", kind: "entity", status: "law" },
    ...(merged
      ? []
      : [
          {
            id: "r-muni",
            stage: 2,
            label: place ? bi(`Gemeinden in ${landName.de}`, `Municipalities in ${landName.en}`) : bi("Ihre Gemeinde", "Your municipality"),
            value: 0,
            entity: "muni" as const,
            kind: "entity" as const,
            status: "law" as const,
          },
        ]),
    { id: "r-pension", stage: 2, label: bi("Rentenversicherung", "Pension insurance"), value: 0, entity: "pension", kind: "entity", status: "law" },
    { id: "r-health", stage: 2, label: bi("Krankenversicherung", "Health insurance"), value: 0, entity: "health", kind: "entity", status: "law" },
    { id: "r-care", stage: 2, label: bi("Pflegeversicherung", "Care insurance"), value: 0, entity: "care", kind: "entity", status: "law" },
    { id: "r-unemp", stage: 2, label: bi("Arbeitslosenversicherung", "Unemployment insurance"), value: 0, entity: "unemp", kind: "entity", status: "law" },
  ];
  const generalBudget = bi("Allgemeiner Haushalt: alle Einnahmen decken alle Ausgaben.", "General budget: all revenue covers all spending.");
  const fencedPool = bi("Nur für diese Versicherung (§ 30 SGB IV), nicht für den allgemeinen Haushalt.", "Only for this insurance (§ 30 SGB IV), not for the general budget.");
  for (const recipient of recipients) {
    recipient.mechanism = ["fed", "land", "muni"].includes(recipient.entity ?? "") ? generalBudget : fencedPool;
  }
  nodes.push(...recipients);

  const edges: FlowEdge[] = [
    { id: "gross-net", from: "gross", to: "net", value: p.totals.net, status: "law" },
    { id: "gross-wagetax", from: "gross", to: "wagetax", value: d.lohnsteuer, status: "law" },
    { id: "gross-soli", from: "gross", to: "soli", value: d.soli, entity: "fed", status: "law" },
  ];
  for (const c of contributions) {
    edges.push({ id: `gross-c-${c.entity}`, from: "gross", to: `c-${c.entity}`, value: d[c.key], entity: c.entity, status: "law" });
    edges.push({ id: `employer-c-${c.entity}`, from: "employer", to: `c-${c.entity}`, value: er[c.key], entity: c.entity, status: "law", ghost: true });
    edges.push({ id: `c-${c.entity}-r`, from: `c-${c.entity}`, to: `r-${c.entity}`, value: d[c.key] + er[c.key], entity: c.entity, status: "law" });
  }
  edges.push({ id: "wagetax-fed", from: "wagetax", to: "r-fed", value: d.lohnsteuer * wageTaxShares.fed, entity: "fed", status: "law", share: wageTaxShares.fed });
  if (merged) {
    edges.push({
      id: "wagetax-land",
      from: "wagetax",
      to: "r-land",
      value: d.lohnsteuer * (wageTaxShares.land + wageTaxShares.muni),
      entity: "land",
      status: "law",
      share: wageTaxShares.land + wageTaxShares.muni,
    });
  } else {
    edges.push({ id: "wagetax-land", from: "wagetax", to: "r-land", value: d.lohnsteuer * wageTaxShares.land, entity: "land", status: "law", share: wageTaxShares.land });
    edges.push({ id: "wagetax-muni", from: "wagetax", to: "r-muni", value: d.lohnsteuer * wageTaxShares.muni, entity: "muni", status: "law", share: wageTaxShares.muni });
  }
  edges.push({ id: "soli-fed", from: "soli", to: "r-fed", value: d.soli, entity: "fed", status: "law", share: 1 });

  // ≈* taxes on what the household buys, out of net pay, by the file's recipient split
  const estimate = options.estimate ? householdEstimate(p.totals.net) : undefined;
  if (estimate) {
    const parts: { to: string; entity: EntityId; value: number }[] = merged
      ? [
          { to: "r-fed", entity: "fed", value: estimate.recipients.fed },
          { to: "r-land", entity: "land", value: estimate.recipients.land + estimate.recipients.muni },
        ]
      : [
          { to: "r-fed", entity: "fed", value: estimate.recipients.fed },
          { to: "r-land", entity: "land", value: estimate.recipients.land },
          { to: "r-muni", entity: "muni", value: estimate.recipients.muni },
        ];
    for (const part of parts) {
      edges.push({ id: `est-${part.entity}`, from: "net", to: part.to, value: part.value, entity: part.entity, status: "estimate", estimate: true });
    }
  }

  for (const node of nodes) {
    if (node.stage === 2) {
      node.value = edges.filter((edge) => edge.to === node.id).reduce((sum, edge) => sum + edge.value, 0);
      const est = edges.filter((edge) => edge.to === node.id && edge.estimate).reduce((sum, edge) => sum + edge.value, 0);
      if (est > 0) {
        node.estimate = est;
      }
    }
  }

  const muniPot = municipalPot(place);
  // budgets: the newest account up to the payslip year (each pot keeps and shows its own year)
  const potYear = Math.min(year, PAGE_YEARS[PAGE_YEARS.length - 1]!);
  const pots = [
    federalPot(potYear),
    landPot(place),
    ...(muniPot ? [muniPot] : []),
    socialPot("pension", potYear),
    socialPot("health", potYear),
    socialPot("care", potYear),
    socialPot("unemp", potYear),
  ];
  const inflow: Record<string, number> = {};
  for (const pot of pots) {
    // exact payslip euros only: the ≈ estimate never enters the pro-rata base
    inflow[pot.id] = edges.filter((edge) => !edge.estimate && pot.recipients.includes(edge.to)).reduce((sum, edge) => sum + edge.value, 0);
  }
  // The federal budget hands part of every euro on as grants: your share of them joins the receiving pots.
  const grantIn: Record<string, number> = {};
  const fed = pots.find((pot) => pot.id === "pot-fed");
  if (fed && fed.total > 0) {
    for (const pot of pots) {
      if (pot.transferIn?.from === fed.id) {
        grantIn[pot.id] = (inflow[fed.id] ?? 0) * (pot.transferIn.value / fed.total);
      }
    }
  }

  return {
    year,
    gross,
    place,
    payslip: p,
    flow: {
      stages: [bi("Bruttolohn", "Gross wage"), bi("Steuern und Beiträge", "Taxes and contributions"), bi("Wer es bekommt (per Gesetz)", "Who receives it (by law)")],
      nodes: nodes.filter((node) => node.value > 0 || node.stage === 2),
      edges: edges.filter((edge) => edge.value > 0),
    },
    pots,
    inflow,
    grantIn,
    estimate,
  };
}

// ---------------------------------------------------------------------------------------------
// Germany zoom: named taxes and contributions → recipients ‖ the consolidated state
// ---------------------------------------------------------------------------------------------

interface SeriesRow {
  id: string;
  label: Bi;
  parent: string | null;
  depth: number;
  group: string;
  values_eur: Record<string, number | null>;
}
export const byTaxRows = raw.byTax.rows as unknown as SeriesRow[];
export const byRecipientRows = raw.byRecipient.rows as unknown as SeriesRow[];
const taxValue = (id: string, year = "2024"): number => byTaxRows.find((row) => row.id === id)?.values_eur[year] ?? 0;
const recipientValue = (id: string, year = "2024"): number => byRecipientRows.find((row) => row.id === id)?.values_eur[year] ?? 0;

export interface GermanyModel {
  year: number;
  /** year of the consolidated-state side (ESA/COFOG), ≤ year */
  stateYear: number;
  flow: Flow;
  taxesTotal: number;
  bridge: { id: string; label: Bi; value: number; share?: number }[];
  revenueTotal: number;
  spendingTotal: number;
  deficit: number;
  cofog: { code: string; label: Bi; value: number; children: { code: string; label: Bi; value: number }[] }[];
  esaTaxes: number;
}

interface AggRow {
  id: string;
  label: Bi;
  values_meur: Record<string, number | null>;
  status: Record<string, string>;
}
export const aggregateRows = raw.aggregates.rows as unknown as AggRow[];
export const aggregate = (id: string, year = "2024"): number => (aggregateRows.find((row) => row.id === id)?.values_meur[year] ?? 0) * 1e6;

interface CofogRow {
  sector: string;
  code: string;
  level: number;
  parent: string | null;
  label: Bi;
  values_meur: Record<string, number | null>;
  status: Record<string, string>;
}
export const cofogRows = raw.cofog.rows as unknown as CofogRow[];

export function buildGermany(year = 2024): GermanyModel {
  const Y = String(year);
  const vat = vatSplit(year);
  // the consolidated state (ESA, COFOG) is published up to its latest year; never mix years inside it
  const stateYear = Math.min(year, Number((raw.cofog as unknown as { latest_year: string }).latest_year));
  const SY = String(stateYear);
  const taxNodes: { id: string; label: Bi; parts: { to: EntityId; value: number; share?: number }[]; mechanism?: Bi }[] = [];
  const fixed = (id: string, label?: Bi): { id: string; label: Bi; parts: { to: EntityId; value: number; share: number }[] } => {
    const row = allocation(id);
    const value = taxValue(id, Y);
    const parts = (Object.entries(row.shares ?? {}) as ["federation" | "laender" | "municipalities" | "eu", number][]).map(([recipient, share]) => ({
      to: ({ federation: "fed", laender: "land", municipalities: "muni", eu: "eu" } as const)[recipient],
      value: value * share,
      share,
    }));
    return { id, label: label ?? row.label, parts };
  };
  taxNodes.push(fixed("STEUERARTG10"));
  taxNodes.push({
    id: "vat",
    label: bi("Umsatzsteuer (inkl. Einfuhr)", "VAT (incl. import VAT)"),
    parts: [
      { to: "fed", value: vat.fed, share: vat.fed / vat.total },
      { to: "land", value: vat.laender, share: vat.laender / vat.total },
      { to: "muni", value: vat.muni, share: vat.muni / vat.total },
    ],
    mechanism: bi(
      "Jährliche Formel (§ 1 FAG): Grundanteile verschoben um feste Beträge. Der Länderanteil ist ein Topf, verteilt nach Einwohnern und Finanzkraft.",
      "Annual formula (§ 1 FAG): base shares shifted by fixed amounts. The Länder share is a pool, distributed by population and fiscal capacity.",
    ),
  });
  taxNodes.push(fixed("STEUERARTG20"));
  // Trade tax: municipal, minus the levy to Federation and Länder (by-recipient.json, cash 2024).
  taxNodes.push({
    id: "STEUERARTK30",
    label: bi("Gewerbesteuer", "Trade tax"),
    parts: tradeTaxSplit(year).map(({ entity, value }) => ({ to: entity, value })),
    mechanism: bi(
      "Steht den Gemeinden zu; eine Umlage geht an Bund und Land (§ 6 GemFinRefG).",
      "Belongs to the municipalities; a levy goes to the Federation and the Land (§ 6 GemFinRefG).",
    ),
  });
  taxNodes.push(fixed("STEUERARTG50"));
  const g30 = fixed("STEUERARTG30");
  const g40 = fixed("STEUERARTG40");
  const capital = new Map<EntityId, number>();
  for (const part of [...g30.parts, ...g40.parts]) {
    capital.set(part.to, (capital.get(part.to) ?? 0) + part.value);
  }
  taxNodes.push({
    id: "capital",
    label: bi("Steuern auf Kapitalerträge", "Taxes on capital income"),
    parts: [...capital.entries()].map(([to, value]) => ({ to, value })),
  });
  taxNodes.push({ id: "STEUERNVB20", label: bi("Bundessteuern (Energie, Tabak, Soli\u00a0…)", "Federal taxes (energy, tobacco, soli\u00a0…)"), parts: [{ to: "fed", value: taxValue("STEUERNVB20", Y), share: 1 }] });
  taxNodes.push({ id: "STEUERNVL20", label: bi("Landessteuern (Grunderwerb, Erbschaft\u00a0…)", "Länder taxes (real estate, inheritance\u00a0…)"), parts: [{ to: "land", value: taxValue("STEUERNVL20", Y), share: 1 }] });
  taxNodes.push({
    id: "municipal-other",
    label: bi("Grundsteuer u.\u00a0a.", "Property and local taxes"),
    parts: [{ to: "muni", value: taxValue("STEUERNVK20", Y) - taxValue("STEUERARTK30", Y), share: 1 }],
  });
  const customsShares = (Object.entries(allocation("STEUERARTZ10").shares ?? { eu: 1 }) as ["federation" | "laender" | "municipalities" | "eu", number][]).map(([recipient, share]) => ({
    to: ({ federation: "fed", laender: "land", municipalities: "muni", eu: "eu" } as const)[recipient],
    value: taxValue("STEUERARTZ10", Y) * share,
    share,
  }));
  taxNodes.push({ id: "STEUERARTZ10", label: allocation("STEUERARTZ10").label, parts: customsShares });

  // Order taxes by the weighted mean position of their recipients (barycentre): federal-only taxes sit
  // next to the Federation, municipal taxes next to the municipalities, so ribbons barely cross.
  const barycentre = (tax: (typeof taxNodes)[number]) => {
    const total = tax.parts.reduce((sum, part) => sum + part.value, 0);
    return tax.parts.reduce((sum, part) => sum + ENTITY_ORDER.indexOf(part.to) * part.value, 0) / total;
  };
  taxNodes.sort((a, b) => barycentre(a) - barycentre(b));

  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];
  for (const tax of taxNodes) {
    nodes.push({
      id: `t-${tax.id}`,
      stage: 0,
      label: tax.label,
      value: tax.parts.reduce((sum, part) => sum + part.value, 0),
      kind: tax.parts.length === 1 ? "entity" : "neutral",
      entity: tax.parts.length === 1 ? tax.parts[0]!.to : undefined,
      status: "official",
      mechanism: tax.mechanism,
    });
    for (const part of tax.parts) {
      edges.push({ id: `t-${tax.id}-${part.to}`, from: `t-${tax.id}`, to: `r-${part.to}`, value: part.value, entity: part.to, status: "official", share: part.share });
    }
  }
  const systems: { entity: EntityId; system: string; label: Bi }[] = [
    { entity: "pension", system: "pension", label: bi("Rentenbeiträge", "Pension contributions") },
    { entity: "health", system: "health", label: bi("Krankenkassenbeiträge", "Health contributions") },
    { entity: "care", system: "ltc", label: bi("Pflegebeiträge", "Care contributions") },
    { entity: "unemp", system: "unemployment", label: bi("Arbeitslosenbeiträge", "Unemployment contributions") },
  ];
  for (const s of systems) {
    const value = payrollViewOf(year).components.find((component) => component.system === s.system)?.value_eur ?? 0;
    nodes.push({ id: `c-${s.entity}`, stage: 0, label: s.label, value, entity: s.entity, kind: "entity", status: "official", star: true });
    edges.push({ id: `c-${s.entity}-r`, from: `c-${s.entity}`, to: `r-${s.entity}`, value, entity: s.entity, status: "official" });
  }
  const recipientLabels: Record<EntityId, Bi> = {
    fed: bi("Bund", "Federation"),
    land: bi("Länder", "Länder"),
    muni: bi("Gemeinden", "Municipalities"),
    eu: bi("EU", "EU"),
    pension: bi("Rentenversicherung", "Pension insurance"),
    health: bi("Krankenversicherung", "Health insurance"),
    care: bi("Pflegeversicherung", "Care insurance"),
    unemp: bi("Arbeitslosenversicherung", "Unemployment insurance"),
  };
  for (const entity of ENTITY_ORDER) {
    nodes.push({
      id: `r-${entity}`,
      stage: 1,
      label: recipientLabels[entity],
      value: edges.filter((edge) => edge.to === `r-${entity}`).reduce((sum, edge) => sum + edge.value, 0),
      entity,
      kind: "entity",
      status: "official",
    });
  }

  const taxes = aggregate("D2REC", SY) + aggregate("D5REC", SY) + aggregate("D91REC", SY);
  const contributions = aggregate("D61REC", SY);
  const revenue = aggregate("TR", SY);
  const spending = aggregate("TE", SY);
  const other = revenue - taxes - contributions;
  const deficit = -aggregate("B9", SY);

  const cofog = cofogRows
    .filter((row) => row.sector === "S13" && row.level === 1)
    .map((row) => ({
      code: row.code,
      label: row.label,
      value: (row.values_meur[SY] ?? 0) * 1e6,
      children: cofogRows
        .filter((child) => child.sector === "S13" && child.parent === row.code)
        .map((child) => ({ code: child.code, label: child.label, value: (child.values_meur[SY] ?? 0) * 1e6 }))
        .filter((child) => child.value > 0)
        .sort((a, b) => b.value - a.value),
    }))
    .sort((a, b) => b.value - a.value);

  return {
    flow: {
      stages: [bi(`Steuern und Beiträge ${year} (Kasse)`, `Taxes and contributions ${year} (cash)`), bi("Wer es bekommt (per Gesetz)", "Who receives it (by law)")],
      nodes,
      edges,
    },
    year,
    stateYear,
    taxesTotal: taxValue("STEUERNVINS10", Y),
    bridge: [
      { id: "taxes", label: bi("Steuern", "Taxes"), value: taxes, share: taxes / revenue },
      { id: "contributions", label: bi("Sozialbeiträge", "Social contributions"), value: contributions, share: contributions / revenue },
      { id: "other", label: bi("Sonstige Einnahmen", "Other revenue"), value: other, share: other / revenue },
      { id: "borrowed", label: bi("Kredit (Defizit)", "Borrowed (deficit)"), value: deficit },
    ],
    revenueTotal: revenue,
    spendingTotal: spending,
    deficit,
    cofog,
    esaTaxes: taxes,
  };
}

// ---------------------------------------------------------------------------------------------
// Purchases (per purchase, exact per-unit law, assumed prices *)
// ---------------------------------------------------------------------------------------------

export interface Purchase {
  id: string;
  /** statutory basis of each tax inside (purchase-taxes.json) */
  laws: string[];
  label: Bi;
  price: number;
  star: boolean;
  /** segments in euros, by recipient; "price" is the rest of the price */
  segments: { id: string; entity?: EntityId; value: number; label: Bi }[];
  taxShare: number;
  assumption: string;
}

const EXCISE_RECIPIENT: Record<string, { entity: EntityId; label: Bi }> = {
  energy_tax: { entity: "fed", label: bi("Energiesteuer → Bund", "Energy tax → Federation") },
  electricity_tax: { entity: "fed", label: bi("Stromsteuer → Bund", "Electricity tax → Federation") },
  tobacco_tax: { entity: "fed", label: bi("Tabaksteuer → Bund", "Tobacco tax → Federation") },
  coffee_tax: { entity: "fed", label: bi("Kaffeesteuer → Bund", "Coffee tax → Federation") },
  insurance_tax: { entity: "fed", label: bi("Versicherungsteuer → Bund", "Insurance tax → Federation") },
  beer_tax: { entity: "land", label: bi("Biersteuer → Länder", "Beer tax → Länder") },
  real_estate_transfer_tax: { entity: "land", label: bi("Grunderwerbsteuer → Land*", "Real-estate transfer tax → Land*") },
};

/** Purchases; the VAT inside is split by the given year's outcome shares (§ 1 FAG). */
export function purchases(year = 2024): Purchase[] {
  const examples = raw.purchaseTaxes.examples as unknown as {
    id: string;
    label: Bi;
    assumption: string;
    price_eur: number;
    layers: { tax: string; eur: number; status?: string }[];
    tax_share_of_price: number;
  }[];
  const split = vatSplit(year);
  const vatShares = { fed: split.fed / split.total, land: split.laender / split.total, muni: split.muni / split.total };
  return examples.map((example) => {
    const segments: Purchase["segments"] = [];
    for (const layer of example.layers) {
      if (layer.tax === "vat") {
        segments.push(
          { id: "vat-fed", entity: "fed", value: layer.eur * vatShares.fed, label: bi("Umsatzsteuer → Bund", "VAT → Federation") },
          { id: "vat-land", entity: "land", value: layer.eur * vatShares.land, label: bi("Umsatzsteuer → Länder-Topf", "VAT → Länder pool") },
          { id: "vat-muni", entity: "muni", value: layer.eur * vatShares.muni, label: bi("Umsatzsteuer → Gemeinden", "VAT → municipalities") },
        );
      } else {
        const recipient = EXCISE_RECIPIENT[layer.tax];
        segments.push({ id: layer.tax, entity: recipient?.entity, value: layer.eur, label: recipient?.label ?? bi(layer.tax, layer.tax) });
      }
    }
    const tax = example.layers.reduce((sum, layer) => sum + layer.eur, 0);
    segments.push({ id: "price", value: example.price_eur - tax, label: bi("Preis ohne Steuer", "Price before tax") });
    const excises = (raw.purchaseTaxes as unknown as { excises: Record<string, { legal_basis: string }>; vat: Record<string, { legal_basis: string }> });
    const exciseKey: Record<string, string> = {
      petrol_litre: "petrol",
      diesel_litre: "diesel",
      electricity_kwh: "electricity",
      cigarettes_pack: "cigarettes_2026",
      beer_half_litre: "beer",
      coffee_pack: "coffee",
      car_insurance: "insurance",
      flat_purchase_berlin: "real_estate_transfer_default",
    };
    const laws = [
      ...(exciseKey[example.id] ? [excises.excises[exciseKey[example.id]!]?.legal_basis ?? ""] : []),
      ...(example.layers.some((layer) => layer.tax === "vat") ? [excises.vat[["groceries", "coffee_pack"].includes(example.id) ? "reduced" : "standard"]!.legal_basis] : []),
    ].filter(Boolean);
    return {
      id: example.id,
      laws,
      label: example.label,
      price: example.price_eur,
      star: true,
      segments,
      taxShare: example.tax_share_of_price,
      assumption: example.assumption,
    };
  });
}

// ---------------------------------------------------------------------------------------------
// Equalisation map
// ---------------------------------------------------------------------------------------------

export interface EqualisationLand {
  code: string;
  name: Bi;
  perResident: number;
  fka: number;
  bez: number;
  vatShare: number;
  population: number;
  fiscalBefore?: number;
  fiscalAfter?: number;
}

export function equalisation(year = 2024): EqualisationLand[] {
  const data = equalisationFile(year) as unknown as {
    laender: {
      code: string;
      name: Bi;
      population: { value: number };
      vat_share: { total: { value: number } };
      fka: { adjustment: { value: number }; fiscal_strength_after_fka_pct?: { value: number } };
      bez: { total: { value: number }; fiscal_strength_after_sobez_pct?: { value: number } };
      tax_bases: { fiscal_strength_before_fka_pct?: { value: number } };
      per_resident: { fka_plus_bez: number };
    }[];
  };
  return data.laender.map((land) => ({
    code: land.code,
    name: land.name,
    perResident: land.per_resident.fka_plus_bez,
    fka: land.fka.adjustment.value,
    bez: land.bez.total.value,
    vatShare: land.vat_share.total.value,
    population: land.population.value,
    fiscalBefore: land.tax_bases.fiscal_strength_before_fka_pct?.value,
    fiscalAfter: land.bez.fiscal_strength_after_sobez_pct?.value,
  }));
}

// ---------------------------------------------------------------------------------------------
// All-taxes table and time series
// ---------------------------------------------------------------------------------------------

export interface TaxTableRow {
  id: string;
  label: Bi;
  amount: number | null;
  kind: string;
  shares: { entity: EntityId; share: number }[] | null;
  /** the split shown is the realised 2024 outcome, not a fixed statutory share */
  outcome?: Bi;
  note: Bi | null;
}

/**
 * Trade tax: legal-allocation.json assigns it 100 % to municipalities (gross) and carries the levy only in
 * its note; the levy amounts paid to Federation and Länder in 2024 are in by-recipient.json.
 */
export const tradeTaxLevy = (raw.legalAllocation as unknown as {
  trade_tax_levy: {
    label: Bi;
    formula: Bi;
    multipliers: { federation_pct: number; land_pct: number; total_pct: number; legal_basis: string; source: SourceLike };
    city_states: Bi;
    effective_share_of_gross_note: Bi;
    outcome: Record<string, { gross_trade_tax_eur: number; levy_paid_by_municipalities_eur: number; received_federation_eur: number; received_laender_eur: number; received_laender_increased_levy_eur: number; levy_share_of_gross: number }>;
  };
}).trade_tax_levy;

export const tradeTaxSplit2024 = () => tradeTaxSplit(2024);
export function tradeTaxSplit(year: number): { entity: EntityId; share: number; value: number }[] {
  const o = tradeTaxLevy.outcome[String(year)] ?? tradeTaxLevy.outcome["2024"]!;
  const muni = o.gross_trade_tax_eur + o.levy_paid_by_municipalities_eur;
  const fed = o.received_federation_eur;
  const land = o.received_laender_eur + o.received_laender_increased_levy_eur;
  const total = muni + fed + land;
  return [
    { entity: "muni", share: muni / total, value: muni },
    { entity: "fed", share: fed / total, value: fed },
    { entity: "land", share: land / total, value: land },
  ];
}

export function taxTable(year = 2024): TaxTableRow[] {
  const vat = vatSplit(year);
  return allocationRows
    .map((row) => {
      const amount = taxValue(row.id, String(year)) || null;
      const shares =
        row.kind === "annual_formula"
          ? [
              { entity: "fed" as EntityId, share: vat.fed / vat.total },
              { entity: "land" as EntityId, share: vat.laender / vat.total },
              { entity: "muni" as EntityId, share: vat.muni / vat.total },
            ]
          : row.shares
            ? (Object.entries(row.shares) as [string, number][]).map(([recipient, share]) => ({
                entity: ({ federation: "fed", laender: "land", municipalities: "muni", eu: "eu" } as Record<string, EntityId>)[recipient]!,
                share,
              }))
            : null;
      if (row.id === "STEUERARTK30") {
        return {
          id: row.id,
          label: row.label,
          amount,
          kind: row.kind,
          shares: tradeTaxSplit(year).map(({ entity, share }) => ({ entity, share })),
          outcome: bi(
            `${year} nach der Gewerbesteuerumlage (${tradeTaxLevy.multipliers.total_pct.toLocaleString("de-DE")} % des Messbetrags: ${tradeTaxLevy.multipliers.federation_pct.toLocaleString("de-DE")} Bund, ${tradeTaxLevy.multipliers.land_pct.toLocaleString("de-DE")} Land)`,
            `${year}, after the statutory levy (${tradeTaxLevy.multipliers.total_pct} % of the tax base: ${tradeTaxLevy.multipliers.federation_pct} Federation, ${tradeTaxLevy.multipliers.land_pct} Land)`,
          ),
          note: row.note,
        };
      }
      if (row.kind === "annual_formula") {
        return { id: row.id, label: row.label, amount, kind: row.kind, shares, outcome: bi(`Ergebnis ${year} der Jahresformel`, `${year} outcome of the annual formula`), note: row.note };
      }
      return { id: row.id, label: row.label, amount, kind: row.kind, shares, note: row.note };
    })
    .filter((row) => row.amount !== null && row.amount > 0)
    .sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0));
}

export const allocationKinds = raw.legalAllocation.kinds as Record<string, Bi>;

export interface Series {
  id: string;
  label: Bi;
  points: { year: number; value: number; provisional: boolean }[];
}

export function timeSeries(): Series[] {
  const fromAgg = (id: string): Series => {
    const row = aggregateRows.find((candidate) => candidate.id === id)!;
    return {
      id,
      label: row.label,
      points: Object.entries(row.values_meur)
        .filter(([, value]) => value !== null)
        .map(([year, value]) => ({ year: Number(year), value: (value ?? 0) * 1e6, provisional: row.status[year] === "provisional" }))
        .filter((point) => point.year >= 1995),
    };
  };
  const taxes = byTaxRows.find((row) => row.id === "STEUERNVINS10")!;
  return [
    fromAgg("TR"),
    fromAgg("TE"),
    fromAgg("B9"),
    fromAgg("GD"),
    fromAgg("D41PAY"),
    {
      id: "cash-taxes",
      label: taxes.label,
      points: Object.entries(taxes.values_eur)
        .filter(([, value]) => value !== null)
        .map(([year, value]) => ({ year: Number(year), value: value ?? 0, provisional: false })),
    },
  ];
}

export const taxSeries = (id: string): { year: number; value: number }[] => {
  const row = byTaxRows.find((candidate) => candidate.id === id);
  return row
    ? Object.entries(row.values_eur)
        .filter(([, value]) => value !== null)
        .map(([year, value]) => ({ year: Number(year), value: value ?? 0 }))
    : [];
};

// ---------------------------------------------------------------------------------------------
// EU round trip (Germany drawer)
// ---------------------------------------------------------------------------------------------

export const euRoundTrip2024 = () => euRoundTrip(2024);
export function euRoundTrip(year: number): { paid: number; spentInGermany: number; ngeu: number } {
  const data = (raw.euRoundTrip.years as unknown as Record<string, { own_resources_paid_meur: Record<string, number>; eu_spending_in_germany_meur: Record<string, number>; ngeu_in_germany_meur: Record<string, number> }>)[String(year)]!;
  return {
    paid: data.own_resources_paid_meur.total_own_resources! * 1e6,
    spentInGermany: data.eu_spending_in_germany_meur.total! * 1e6,
    ngeu: data.ngeu_in_germany_meur.total! * 1e6,
  };
}

export const euSource = (): SourceLink => link(bi("EU-Kommission, Haushaltsausführung", "European Commission, budget implementation"), files.euRoundTrip, (raw.euRoundTrip as unknown as { source: SourceLike }).source);
export const allocationSource = (id: string): SourceLink[] =>
  allocation(id).legal_basis.map((basis) => ({ label: bi(basis.section, basis.section), file: files.legalAllocation, url: basis.source.url, coordinates: `${basis.section}: "${basis.quote}"` }));
export const byTaxSource = (): SourceLink =>
  link(bi("Destatis 71211-0001, Steuereinnahmen", "Destatis 71211-0001, tax receipts"), files.byTax, (raw.byTax as unknown as { source: SourceLike }).source);
export const byRecipientSource = (): SourceLink =>
  link(bi("Destatis 71211-0002, nach Verteilung", "Destatis 71211-0002, after distribution"), files.byRecipient, (raw.byRecipient as unknown as { source: SourceLike }).source);
export const cofogSource = (): SourceLink => link(bi("Eurostat gov_10a_exp (COFOG)", "Eurostat gov_10a_exp (COFOG)"), files.cofog, (raw.cofog as unknown as { source: SourceLike }).source);
export const aggregatesSource = (): SourceLink =>
  link(bi("Eurostat gov_10a_main", "Eurostat gov_10a_main"), files.aggregates, (raw.aggregates as unknown as { source_main: SourceLike }).source_main);
export const equalisationSource = (year = 2024): SourceLink[] => {
  const sources = (equalisationFile(year) as unknown as { sources: Record<string, SourceLike> }).sources;
  const file = year >= 2025 ? files.equalisation2025 : files.equalisation2024;
  return [
    link(bi(`BMF Abrechnung Ausgleichsjahr ${year}`, `BMF settlement, equalisation year ${year}`), file, sources.anlage1),
    link(bi(`BMF Monatsbericht: Finanzausgleich ${year}`, `BMF monthly report: equalisation ${year}`), file, sources.monatsbericht),
  ];
};
export const equalisationStatus = (year: number): string => (equalisationFile(year) as unknown as { status: string }).status;
export const payslipSource = (): SourceLink[] => {
  const p = raw.payslipParameters.years["2026"].tariff as unknown as { source_ref: SourceLike };
  return [
    link(bi("§ 32a EStG (Tarif)", "§ 32a EStG (tariff)"), files.payslipParameters, p.source_ref),
    { label: bi("BMF-Prüftabellen: 121 Zeilen exakt nachgerechnet", "BMF test tables: 121 rows reproduced exactly"), file: files.payslipParameters },
  ];
};
export const purchaseSource = (): SourceLink => ({ label: bi("Steuersätze (UStG, EnergieStG, TabStG …)", "Tax rates (UStG, EnergieStG, TabStG …)"), file: files.purchaseTaxes });
export const populationSource = (): SourceLink =>
  link(bi("Destatis 12411, Bevölkerung", "Destatis 12411, population"), files.population, (raw.population as unknown as { source_germany: SourceLike }).source_germany);
