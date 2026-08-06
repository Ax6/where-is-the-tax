/**
 * Fiscal-graph route fixtures for the P0 prototype.
 *
 * Statutory shares are exact law and cite their legal basis. Euro figures come
 * from the 2026-08-05 deep-research report and are PENDING INDEPENDENT
 * VERIFICATION — the page banner says so. Nothing here is published data.
 */

import { getLandFigures, landFigures, VAT_LAENDER_POOL_MEUR, VAT_TOTAL_MEUR } from "./equalisation.ts";
import { BERLIN, GERMANY, type Place } from "./places.ts";
import taxesByLand from "../../data/de/2024/taxes-by-land.json" with { type: "json" };
import socialInsurance from "../../data/de/2024/accounts/social-insurance.json" with { type: "json" };

export type EdgeKind =
  | "exclusive_assignment"
  | "fixed_share"
  | "decomposition_adjustment"
  | "annual_formula"
  | "equalisation_adjustment"
  | "supplementary_grant"
  | "interbudget_transfer";

export type EvidenceStatus =
  | "exact_statute"
  | "calculated_official"
  | "provisional_official"
  | "formula_dependent"
  | "not_individually_traceable";

export type EntityId = "berlin" | "federation" | "laender" | "municipalities" | "neutral";

export type NodeRole = "event" | "tax" | "share" | "pool" | "recipient";

export interface SourceRef {
  label: string;
  url: string;
}

export interface RouteNode {
  id: string;
  stage: number;
  label: string;
  official?: string;
  entity: EntityId;
  role: NodeRole;
  description: string;
  amountNote?: string;
  status: EvidenceStatus;
  sources: SourceRef[];
  caveats?: string[];
}

export interface RouteEdge {
  id: string;
  from: string;
  to: string;
  weight: number;
  kind: EdgeKind;
  status: EvidenceStatus;
  shareLabel: string;
  description: string;
  sources: SourceRef[];
  caveats?: string[];
}

export interface RouteAnnotation {
  nodeId: string;
  text: string;
}

export interface BoundaryContext {
  heading: string;
  body: string[];
  examples: string[];
}

export interface RouteBrief {
  about: string;
  takeaway: string;
  sources: SourceRef[];
}

export interface Route {
  id: string;
  chipTitle: string;
  chipNote: string;
  lede: string;
  stages: string[];
  /** How edge weights are expressed: fractions of the route, or observed € millions. */
  unit: "share" | "million_eur";
  /** For share-unit routes: the route's total in € millions, when officially known. */
  routeTotalMeur?: number;
  unitNote: string;
  brief: RouteBrief;
  /** True when the route re-parameterises for the selected place; false = Berlin example only. */
  placeAware: boolean;
  /** Entity display names for this route (the "berlin" slot carries the selected place's name). */
  entityLabels: Record<EntityId, string>;
  nodes: RouteNode[];
  edges: RouteEdge[];
  annotations: RouteAnnotation[];
  boundary: BoundaryContext;
}

export const EDGE_KIND_LABELS: Record<EdgeKind, string> = {
  exclusive_assignment: "Assigned exclusively by law",
  fixed_share: "Fixed statutory share",
  decomposition_adjustment: "Geographical clearing",
  annual_formula: "Annual formula result",
  equalisation_adjustment: "Pooled equalisation",
  supplementary_grant: "Federal supplementary grant",
  interbudget_transfer: "Transfer between budgets",
};

export const STATUS_LABELS: Record<EvidenceStatus, string> = {
  exact_statute: "Exact — written in law",
  calculated_official: "Official calculation",
  provisional_official: "Official, marked provisional",
  formula_dependent: "Formula-dependent",
  not_individually_traceable: "Not individually traceable",
};

export const ENTITY_LABELS: Record<EntityId, string> = {
  berlin: "Berlin",
  federation: "Federation",
  laender: "Other Länder",
  municipalities: "Other municipalities",
  neutral: "Undivided money",
};

const artikel106: SourceRef = {
  label: "Basic Law, Article 106",
  url: "https://www.gesetze-im-internet.de/gg/art_106.html",
};
const artikel107: SourceRef = {
  label: "Basic Law, Article 107",
  url: "https://www.gesetze-im-internet.de/gg/art_107.html",
};
const zerlegung: SourceRef = {
  label: "§7 Zerlegungsgesetz",
  url: "https://www.gesetze-im-internet.de/zerlg_1998/__7.html",
};
const gemFinRef: SourceRef = {
  label: "Gemeindefinanzreformgesetz",
  url: "https://www.gesetze-im-internet.de/gemfinrefg/BJNR015870969.html",
};
const gemFinRef6: SourceRef = {
  label: "§6 Gemeindefinanzreformgesetz (levy multipliers)",
  url: "https://www.gesetze-im-internet.de/gemfinrefg/__6.html",
};
const gemFinRef7: SourceRef = {
  label: "§7 Gemeindefinanzreformgesetz",
  url: "https://www.gesetze-im-internet.de/gemfinrefg/__7.html",
};
const ustg12: SourceRef = {
  label: "§12 Umsatzsteuergesetz",
  url: "https://www.gesetze-im-internet.de/ustg_1980/__12.html",
};
const fag1: SourceRef = {
  label: "§1 Finanzausgleichsgesetz",
  url: "https://www.gesetze-im-internet.de/finausglg_2005/__1.html",
};
const vatKeyReg: SourceRef = {
  label: "Municipal VAT key regulation 2024–2026",
  url: "https://www.gesetze-im-internet.de/ustschlfestv_2024/BJNR11D0A0023.html",
};
const bmfEqualisation2024: SourceRef = {
  label: "BMF equalisation calculation 2024 (provisional)",
  url: "https://www.bundesfinanzministerium.de/Content/DE/Downloads/Oeffentliche-Finanzen/Foederale-Finanzbeziehungen/Bundestaatlicher-Finanzausgleich/abrechnung-ausgleichsjahr-2024.pdf?__blob=publicationFile&v=3",
};
const berlinTaxAccount2024: SourceRef = {
  label: "Berlin 2024 tax account (official table)",
  url: "https://www.berlin.de/sen/finanzen/steuern/steuereinnahmen/2024/artikel.1653286.php",
};
const bmfDec2024: SourceRef = {
  label: "BMF tax report, December 2024",
  url: "https://www.bundesfinanzministerium.de/Monatsberichte/Ausgabe/2025/01/Inhalte/Kapitel-4-Wirtschafts-und-Finanzlage/4-2-steuereinnahmen-dezember-2024.html",
};
const bho8: SourceRef = {
  label: "§8 Bundeshaushaltsordnung",
  url: "https://www.gesetze-im-internet.de/bho/__8.html",
};
const lhoBerlin8: SourceRef = {
  label: "§8 Landeshaushaltsordnung Berlin",
  url: "https://gesetze.berlin.de/bsbe/?query=DOKNR%3Ajlr-HOBE2009pP8&source=PermaLink",
};
const destatis71211: SourceRef = {
  label: "Destatis GENESIS statistic 71211",
  url: "https://genesis.destatis.de/datenbank/online/statistic/71211/details",
};
const betrKV2: SourceRef = {
  label: "§2 Betriebskostenverordnung",
  url: "https://www.gesetze-im-internet.de/betrkv/__2.html",
};

export { artikel106, artikel107, berlinTaxAccount2024, bmfDec2024, gemFinRef7, ustg12 };

function formatBn(meur: number): string {
  return meur >= 1000 ? `€${(meur / 1000).toFixed(meur >= 100000 ? 0 : meur >= 10000 ? 1 : 2)}bn` : `€${Math.round(meur)}m`;
}

const pendingVerification =
  "Independently reproduced from official sources on 2026-08-05; the fully provenanced production dataset is still in progress.";

const berlinBoundaryBody = [
  "From here on, the general coverage principle applies: except for lawful earmarking, all revenue finances all expenditure. The euros you followed are now indistinguishable from every other euro in the budget.",
  "So the honest question changes from “what did my tax pay for?” to “what does this budget pay for as a whole?” Function-level actuals from Berlin's audited 2024 annual account arrive with the verified dataset (phase P2).",
];

const berlinBoundaryExamples = [
  "Schools & daycare",
  "Police & fire service",
  "Public transport subsidy",
  "Hospitals",
  "Housing & districts",
  "Culture & parks",
  "Debt service",
  "Borough services",
];

const wageBerlin: Route = {
    id: "wage",
    chipTitle: "You earn a wage",
    chipNote: "Wage tax · Lohnsteuer",
    lede: "Wage tax is taken from every paycheck and split by the constitution: 42.5% Federation, 42.5% Land, 15% municipalities. For a Berlin resident, the Land share goes to Berlin.",
    stages: ["The event", "The named tax", "Who gets it, by law", "Recipient budgets"],
    unit: "share",
    unitNote: "Ribbon widths show the statutory split of one wage-tax euro (Article 106: 42.5 / 42.5 / 15).",
    brief: {
      about: "The legal destination of one wage-tax euro withheld from a Berlin resident.",
      takeaway: "42.5% Federation · 42.5% Berlin · 15% municipalities; Berlin receives both local shares.",
      sources: [artikel106, zerlegung],
    },
    placeAware: true,
    entityLabels: { ...ENTITY_LABELS },
    nodes: [
      {
        id: "event",
        stage: 0,
        label: "Payday in Berlin",
        entity: "neutral",
        role: "event",
        description:
          "Your employer withholds wage tax before your salary arrives. For most employees this is the main income tax they ever pay.",
        amountNote: "Germany collected €947.7bn in taxes before distribution in 2024.",
        status: "calculated_official",
        sources: [destatis71211],
        caveats: [pendingVerification],
      },
      {
        id: "lohnsteuer",
        stage: 1,
        label: "Wage tax",
        official: "Lohnsteuer",
        entity: "neutral",
        role: "tax",
        description:
          "A joint tax: no single level of government owns it. The constitution fixes exactly how it is divided before a euro of it is spent.",
        amountNote: "Berlin's 2024 Land share of wage tax: €5.18bn.",
        status: "calculated_official",
        sources: [artikel106, berlinTaxAccount2024],
        caveats: [pendingVerification],
      },
      {
        id: "share_federation",
        stage: 2,
        label: "Federation 42.5%",
        entity: "federation",
        role: "share",
        description: "The federal share of income tax, fixed by Article 106 of the Basic Law.",
        status: "exact_statute",
        sources: [artikel106],
      },
      {
        id: "share_land",
        stage: 2,
        label: "Länder 42.5%",
        entity: "berlin",
        role: "share",
        description:
          "The Länder share is cleared to the Land where the employee lives — not where the employer's payroll office sits. You live in Berlin, so this share is cleared to Berlin.",
        status: "exact_statute",
        sources: [artikel106, zerlegung],
      },
      {
        id: "share_municipal",
        stage: 2,
        label: "Municipalities 15%",
        entity: "berlin",
        role: "share",
        description:
          "The municipal share is distributed by a statutory key based on residents' income-tax contributions, with a cap. Berlin counts as a municipality here too.",
        status: "exact_statute",
        sources: [artikel106, gemFinRef],
      },
      {
        id: "federal_budget",
        stage: 3,
        label: "Federal budget",
        entity: "federation",
        role: "recipient",
        description:
          "The Federation's general budget. Once the money enters, its wage-tax identity ends — it funds the whole federal budget together with every other revenue.",
        status: "exact_statute",
        sources: [artikel106, bho8],
      },
      {
        id: "berlin_budget",
        stage: 3,
        label: "Berlin budget",
        official: "Land + municipality",
        entity: "berlin",
        role: "recipient",
        description:
          "Berlin is a Land and a municipality at once, so it receives both the Land share and the municipal share. Its twelve boroughs are not tax recipients — they get allocations inside this budget.",
        amountNote: "Berlin's total 2024 tax receipts: €27.30bn.",
        status: "calculated_official",
        sources: [berlinTaxAccount2024, lhoBerlin8],
        caveats: [pendingVerification],
      },
    ],
    edges: [
      {
        id: "event-tax",
        from: "event",
        to: "lohnsteuer",
        weight: 1,
        kind: "exclusive_assignment",
        status: "exact_statute",
        shareLabel: "withheld at source",
        description: "Wage tax is withheld by the employer and paid to the tax office on your behalf.",
        sources: [artikel106],
      },
      {
        id: "tax-federation",
        from: "lohnsteuer",
        to: "share_federation",
        weight: 0.425,
        kind: "fixed_share",
        status: "exact_statute",
        shareLabel: "42.5%",
        description: "Fixed federal share of wage and assessed income tax under Article 106(3) of the Basic Law.",
        sources: [artikel106],
      },
      {
        id: "tax-land",
        from: "lohnsteuer",
        to: "share_land",
        weight: 0.425,
        kind: "fixed_share",
        status: "exact_statute",
        shareLabel: "42.5%",
        description: "Fixed Länder share of wage and assessed income tax under Article 106(3) of the Basic Law.",
        sources: [artikel106],
      },
      {
        id: "tax-municipal",
        from: "lohnsteuer",
        to: "share_municipal",
        weight: 0.15,
        kind: "fixed_share",
        status: "exact_statute",
        shareLabel: "15%",
        description: "Fixed municipal share of income tax under Article 106(5) of the Basic Law.",
        sources: [artikel106, gemFinRef],
      },
      {
        id: "federation-budget",
        from: "share_federation",
        to: "federal_budget",
        weight: 0.425,
        kind: "exclusive_assignment",
        status: "exact_statute",
        shareLabel: "to the federal budget",
        description: "The federal share flows into the Federation's general budget.",
        sources: [artikel106],
      },
      {
        id: "land-berlin",
        from: "share_land",
        to: "berlin_budget",
        weight: 0.425,
        kind: "decomposition_adjustment",
        status: "exact_statute",
        shareLabel: "cleared to your Land of residence",
        description:
          "Wage tax is decomposed principally to the employee's Land of residence under §7 Zerlegungsgesetz. For a Berlin resident, the Land share is cleared to Berlin.",
        sources: [zerlegung],
        caveats: ["Shown for a Berlin resident; the clearing operates on official aggregates, not on your individual euro."],
      },
      {
        id: "municipal-berlin",
        from: "share_municipal",
        to: "berlin_budget",
        weight: 0.15,
        kind: "annual_formula",
        status: "not_individually_traceable",
        shareLabel: "by statutory key, capped",
        description:
          "The municipal 15% is distributed using residence and a capped income-tax contribution key. Your exact personal allocation cannot be reproduced from public aggregate data — Berlin's aggregate share can.",
        sources: [gemFinRef],
        caveats: ["Berlin's 2024 municipal share of wage and assessed income tax: €2.32bn.", pendingVerification],
      },
    ],
    annotations: [],
    boundary: {
      heading: "Beyond this line: the Berlin budget",
      body: berlinBoundaryBody,
      examples: berlinBoundaryExamples,
    },
};

const vatBerlin: Route = {
    id: "vat",
    chipTitle: "You buy something",
    chipNote: "VAT · Umsatzsteuer",
    lede: "VAT paid at a Berlin till does not stay in Berlin. It joins one national aggregate, is split by an annual formula, and returns to Berlin through a population-weighted, equalised pool.",
    stages: ["The event", "One national pot", "Annual vertical split", "Recipient budgets"],
    unit: "share",
    unitNote: "Ribbon widths show the official 2024 allocation of the national VAT aggregate (€302.1bn).",
    brief: {
      about: "Where Germany's €302.1bn 2024 VAT aggregate went, including Berlin's slice.",
      takeaway: "48.1% Federation · 49.1% Länder · 2.8% municipalities; the Länder pool is then equalised.",
      sources: [bmfDec2024, bmfEqualisation2024],
    },
    routeTotalMeur: VAT_TOTAL_MEUR,
    placeAware: true,
    entityLabels: { ...ENTITY_LABELS },
    nodes: [
      {
        id: "event",
        stage: 0,
        label: "A purchase in Berlin",
        entity: "neutral",
        role: "event",
        description:
          "Most purchases carry 19% VAT; food, books and some services carry the reduced 7% rate. Petrol, beer or tobacco add product-specific excises on top — separate routes, coming later.",
        status: "exact_statute",
        sources: [ustg12],
      },
      {
        id: "vat_pool",
        stage: 1,
        label: "National VAT aggregate",
        official: "Umsatzsteuer inkl. Einfuhrumsatzsteuer",
        entity: "neutral",
        role: "pool",
        description:
          "Your VAT enters the national total. From this moment it has no home town: the allocation below happens to the aggregate, not to your receipt.",
        amountNote: "2024 total allocated: €302.1bn.",
        status: "calculated_official",
        sources: [bmfDec2024, fag1],
        caveats: [pendingVerification],
      },
      {
        id: "share_federation",
        stage: 2,
        label: "Federal share 48.10%",
        entity: "federation",
        role: "share",
        description:
          "Base shares are set in §1 Finanzausgleichsgesetz, but annual fixed-euro adjustments change the effective result materially. 2024 effective: 48.1010% (€145.3bn).",
        status: "calculated_official",
        sources: [fag1, bmfDec2024],
        caveats: [pendingVerification],
      },
      {
        id: "laender_pool",
        stage: 2,
        label: "Länder pool 49.11%",
        entity: "laender",
        role: "pool",
        description:
          "The Länder share (€148.4bn in 2024) is distributed by population — with fiscal-capacity equalisation applied inside the distribution. Additions and deductions happen around a common pool; no Land wires money to another Land.",
        status: "calculated_official",
        sources: [artikel107, bmfEqualisation2024],
        caveats: [pendingVerification],
      },
      {
        id: "share_municipal",
        stage: 2,
        label: "Municipal share 2.79%",
        entity: "municipalities",
        role: "share",
        description:
          "Municipalities receive a small slice of VAT (€8.4bn in 2024), distributed by a fixed statutory key set for 2024–2026.",
        status: "calculated_official",
        sources: [vatKeyReg, bmfDec2024],
        caveats: [pendingVerification],
      },
      {
        id: "federal_budget",
        stage: 3,
        label: "Federal budget",
        entity: "federation",
        role: "recipient",
        description:
          "The federal VAT share funds the whole federal budget. EU own resources (€32.0bn in 2024) also leave from the federal level — computed from a harmonised base, not from your purchase.",
        status: "calculated_official",
        sources: [bmfDec2024, bho8],
        caveats: [pendingVerification],
      },
      {
        id: "berlin_budget",
        stage: 3,
        label: "Berlin budget",
        official: "Land + municipality",
        entity: "berlin",
        role: "recipient",
        description:
          "Berlin's slice of the Länder pool is population-based and lifted by equalisation: €6.53bn base plus a €3.94bn equalisation addition in 2024 (provisional), plus a €354m municipal VAT share via Berlin's key of 4.2%.",
        amountNote: "≈ €10.8bn of 2024 VAT reached Berlin — none of it 'your' VAT specifically.",
        status: "provisional_official",
        sources: [bmfEqualisation2024, vatKeyReg],
        caveats: [pendingVerification],
      },
      {
        id: "other_laender",
        stage: 3,
        label: "Other 15 Länder",
        entity: "laender",
        role: "recipient",
        description:
          "The rest of the Länder pool, distributed by population with equalisation additions and deductions. Berlin, Hamburg and Bremen carry a 135% city-state population weighting in parts of the calculation.",
        status: "provisional_official",
        sources: [bmfEqualisation2024],
        caveats: [pendingVerification],
      },
      {
        id: "other_municipalities",
        stage: 3,
        label: "Other municipalities",
        entity: "municipalities",
        role: "recipient",
        description: "The municipal VAT share outside Berlin, distributed by the statutory key.",
        status: "calculated_official",
        sources: [vatKeyReg],
        caveats: [pendingVerification],
      },
    ],
    edges: [
      {
        id: "event-pool",
        from: "event",
        to: "vat_pool",
        weight: 1,
        kind: "exclusive_assignment",
        status: "exact_statute",
        shareLabel: "19% / reduced 7%",
        description: "VAT charged at the till is remitted by the seller into the national VAT system.",
        sources: [ustg12],
      },
      {
        id: "pool-federation",
        from: "vat_pool",
        to: "share_federation",
        weight: 0.48101,
        kind: "annual_formula",
        status: "calculated_official",
        shareLabel: "48.1010% · €145.3bn",
        description:
          "The effective 2024 federal share of VAT after the annual fixed-euro adjustments to the statutory base shares.",
        sources: [fag1, bmfDec2024],
        caveats: [pendingVerification],
      },
      {
        id: "pool-laender",
        from: "vat_pool",
        to: "laender_pool",
        weight: 0.491088,
        kind: "annual_formula",
        status: "calculated_official",
        shareLabel: "49.1088% · €148.4bn",
        description: "The effective 2024 Länder share of VAT, forming the pool that equalisation adjusts.",
        sources: [fag1, bmfEqualisation2024],
        caveats: [pendingVerification],
      },
      {
        id: "pool-municipal",
        from: "vat_pool",
        to: "share_municipal",
        weight: 0.027903,
        kind: "annual_formula",
        status: "calculated_official",
        shareLabel: "2.7903% · €8.4bn",
        description: "The effective 2024 municipal share of VAT.",
        sources: [fag1, bmfDec2024],
        caveats: [pendingVerification],
      },
      {
        id: "federation-budget",
        from: "share_federation",
        to: "federal_budget",
        weight: 0.48101,
        kind: "exclusive_assignment",
        status: "calculated_official",
        shareLabel: "to the federal budget",
        description: "The federal share enters the Federation's general budget.",
        sources: [bho8],
      },
      {
        id: "laender-berlin",
        from: "laender_pool",
        to: "berlin_budget",
        weight: 0.034649,
        kind: "equalisation_adjustment",
        status: "provisional_official",
        shareLabel: "€6.53bn base + €3.94bn equalisation",
        description:
          "Berlin's population-based share of the Länder pool plus its fiscal-capacity equalisation addition (initial fiscal strength: 77.4%; the system generally closes 63% of the measured gap). Pooled — not a transfer from any named Land.",
        sources: [bmfEqualisation2024, artikel107],
        caveats: ["BMF still marked the 2024 calculation provisional on 2026-06-24.", pendingVerification],
      },
      {
        id: "laender-others",
        from: "laender_pool",
        to: "other_laender",
        weight: 0.456439,
        kind: "equalisation_adjustment",
        status: "provisional_official",
        shareLabel: "population share ± equalisation",
        description: "The remaining Länder pool after Berlin's slice, distributed by population with equalisation adjustments.",
        sources: [bmfEqualisation2024],
        caveats: [pendingVerification],
      },
      {
        id: "municipal-berlin",
        from: "share_municipal",
        to: "berlin_budget",
        weight: 0.001172,
        kind: "annual_formula",
        status: "calculated_official",
        shareLabel: "key 4.2022% · €354m",
        description:
          "Berlin's municipal VAT share under the fixed 2024–2026 key (0.042022533). A separate formula system from the Länder pool.",
        sources: [vatKeyReg, bmfEqualisation2024],
        caveats: [pendingVerification],
      },
      {
        id: "municipal-others",
        from: "share_municipal",
        to: "other_municipalities",
        weight: 0.026731,
        kind: "annual_formula",
        status: "calculated_official",
        shareLabel: "rest of the key",
        description: "The municipal VAT share outside Berlin.",
        sources: [vatKeyReg],
        caveats: [pendingVerification],
      },
    ],
    annotations: [
      {
        nodeId: "federal_budget",
        text: "EU own resources (€32.0bn in 2024) leave from the federal level — not a traceable slice of your purchase.",
      },
      {
        nodeId: "berlin_budget",
        text: "Berlin also received ≈€1.86bn in federal supplementary grants (2024) — general federal funds, not VAT.",
      },
    ],
    boundary: {
      heading: "Beyond this line: four budgets, one rule",
      body: [
        "Each recipient budget obeys the general coverage principle: all revenue finances all expenditure. The VAT you paid is now part of federal, Berlin, Länder and municipal budgets in shares no receipt can trace.",
        "What each budget spends, as a whole, becomes explorable when the verified recipient accounts land (federal 2024 XML actuals; Berlin's audited 2024 annual account).",
      ],
      examples: berlinBoundaryExamples,
    },
};

const tradeBerlin: Route = {
    id: "trade",
    chipTitle: "A business pays trade tax",
    chipNote: "Gewerbesteuer",
    lede: "Trade tax is the classic municipal tax — and Berlin is special. Because it is a Land and a municipality at once, it keeps nearly all of it, remitting only the federal component of the statutory levy.",
    stages: ["The event", "The named tax", "Recipient budgets"],
    unit: "million_eur",
    unitNote: "Ribbon widths show observed 2024 Berlin amounts (trade tax gross €3.01bn).",
    brief: {
      about: "The route taken by Berlin's €3.01bn gross trade-tax receipts in 2024.",
      takeaway: "Berlin keeps the municipal and Land components; about 3.54% leaves for the Federation.",
      sources: [berlinTaxAccount2024, gemFinRef6],
    },
    placeAware: false,
    entityLabels: { ...ENTITY_LABELS },
    nodes: [
      {
        id: "event",
        stage: 0,
        label: "A business operates in Berlin",
        entity: "neutral",
        role: "event",
        description:
          "A company with premises in Berlin pays trade tax on its profits — Berlin's assessment rate is 410%.",
        status: "calculated_official",
        sources: [berlinTaxAccount2024],
        caveats: [pendingVerification],
      },
      {
        id: "gewerbesteuer",
        stage: 1,
        label: "Trade tax",
        official: "Gewerbesteuer",
        entity: "neutral",
        role: "tax",
        description:
          "A municipal tax on business profits. The municipality that hosts the establishment collects it; a statutory levy passes a component up to the Federation and normally the Land.",
        amountNote: "Berlin 2024 gross: €3.01bn.",
        status: "calculated_official",
        sources: [berlinTaxAccount2024, gemFinRef7],
        caveats: [pendingVerification],
      },
      {
        id: "berlin_budget",
        stage: 2,
        label: "Berlin budget",
        official: "Land + municipality",
        entity: "berlin",
        role: "recipient",
        description:
          "Because Berlin is both Land and municipality, the Land component of the trade-tax levy circles back to Berlin through the equalisation system — only the federal component (≈3.5% of gross) truly leaves town.",
        status: "calculated_official",
        sources: [gemFinRef6, gemFinRef7, berlinTaxAccount2024, lhoBerlin8],
        caveats: [pendingVerification],
      },
      {
        id: "federal_budget",
        stage: 2,
        label: "Federal budget",
        entity: "federation",
        role: "recipient",
        description: "The federal component of the trade-tax levy, set by a statutory multiplier.",
        status: "provisional_official",
        sources: [gemFinRef7, berlinTaxAccount2024],
        caveats: [pendingVerification],
      },
    ],
    edges: [
      {
        id: "event-trade",
        from: "event",
        to: "gewerbesteuer",
        weight: 3011.215,
        kind: "exclusive_assignment",
        status: "calculated_official",
        shareLabel: "€3.01bn gross (2024)",
        description: "Gross trade tax collected by Berlin in 2024, at an assessment rate of 410%.",
        sources: [berlinTaxAccount2024],
        caveats: [pendingVerification],
      },
      {
        id: "trade-berlin",
        from: "gewerbesteuer",
        to: "berlin_budget",
        weight: 2749.141,
        kind: "exclusive_assignment",
        status: "calculated_official",
        shareLabel: "net of the levy",
        description:
          "Berlin's cash account keeps gross trade tax minus the full statutory levy — a 35% multiplier on the base amount (14.5 federal + 20.5 Land, §6 Gemeindefinanzreformgesetz).",
        sources: [berlinTaxAccount2024, gemFinRef6],
        caveats: [pendingVerification],
      },
      {
        id: "trade-berlin-fka",
        from: "gewerbesteuer",
        to: "berlin_budget",
        weight: 153.501,
        kind: "equalisation_adjustment",
        status: "calculated_official",
        shareLabel: "Land levy component — returns to Berlin",
        description:
          "The Land component of the levy (20.5 of the 35 multiplier, ≈€153.5m in 2024) is credited back to Berlin inside the official equalisation calculation — because Berlin is the Land.",
        sources: [bmfEqualisation2024, gemFinRef6],
        caveats: [pendingVerification],
      },
      {
        id: "trade-federation",
        from: "gewerbesteuer",
        to: "federal_budget",
        weight: 108.573,
        kind: "fixed_share",
        status: "calculated_official",
        shareLabel: "federal levy component ≈3.54%",
        description:
          "The federal component of the trade-tax levy: 14.5 / 410 = 3.5366% of gross, ≈€108.6m in 2024, remitted by Berlin under §7 Gemeindefinanzreformgesetz.",
        sources: [gemFinRef6, gemFinRef7, bmfEqualisation2024],
        caveats: [
          "The cash-year levy (€262.1m) differs ~2% from 35% of same-year gross because of quarterly payments and prior-year settlement (§6 (6)–(7) GemFinRefG).",
          pendingVerification,
        ],
      },
    ],
    annotations: [
      {
        nodeId: "berlin_budget",
        text: "Boroughs like Mitte or Neukölln are not tax recipients — they receive global allocations inside Berlin's budget.",
      },
    ],
    boundary: {
      heading: "Beyond this line: the Berlin budget",
      body: berlinBoundaryBody,
      examples: berlinBoundaryExamples,
    },
};

const housingBerlin: Route = {
    id: "housing",
    chipTitle: "You own or rent a home",
    chipNote: "Grundsteuer · Grunderwerbsteuer",
    lede: "Housing carries two named taxes: property tax every year, and real-estate transfer tax when a home is bought. In Berlin, both stay entirely in the Berlin budget.",
    stages: ["The event", "The named taxes", "Recipient budget"],
    unit: "million_eur",
    unitNote: "Ribbon widths show observed 2024 Berlin amounts (property tax €0.87bn; real-estate transfer tax €0.91bn).",
    brief: {
      about: "Berlin's 2024 property-tax and real-estate-transfer-tax receipts.",
      takeaway: "Both stay in Berlin: €870m property tax and €911m transfer tax; renters may bear property tax via service charges.",
      sources: [berlinTaxAccount2024, betrKV2],
    },
    placeAware: false,
    entityLabels: { ...ENTITY_LABELS },
    nodes: [
      {
        id: "event",
        stage: 0,
        label: "A home in Berlin",
        entity: "neutral",
        role: "event",
        description:
          "Owning property in Berlin means annual property tax; buying one triggers real-estate transfer tax at Berlin's 6% rate. Renters usually pay property tax too — landlords may pass it on through service charges.",
        status: "calculated_official",
        sources: [berlinTaxAccount2024, betrKV2],
        caveats: [pendingVerification],
      },
      {
        id: "grundsteuer",
        stage: 1,
        label: "Property tax",
        official: "Grundsteuer",
        entity: "neutral",
        role: "tax",
        description:
          "A municipal tax on real property, paid yearly. It belongs to Berlin itself — not to the borough where the property stands. It commonly reaches renters via the service-charge bill.",
        amountNote: "Berlin 2024: €870m.",
        status: "calculated_official",
        sources: [berlinTaxAccount2024, betrKV2],
        caveats: [pendingVerification],
      },
      {
        id: "grunderwerbsteuer",
        stage: 1,
        label: "Real-estate transfer tax",
        official: "Grunderwerbsteuer",
        entity: "neutral",
        role: "tax",
        description:
          "A Land tax due when property changes hands. Berlin's rate is 6% of the purchase price — one of the larger one-off costs of buying a home.",
        amountNote: "Berlin 2024: €911m.",
        status: "calculated_official",
        sources: [berlinTaxAccount2024],
        caveats: [pendingVerification],
      },
      {
        id: "berlin_budget",
        stage: 2,
        label: "Berlin budget",
        official: "Land + municipality",
        entity: "berlin",
        role: "recipient",
        description:
          "Property tax is municipal and real-estate transfer tax belongs to the Land — and Berlin is both at once, so neither tax leaves town. Boroughs are not tax recipients; they get allocations inside this budget.",
        status: "calculated_official",
        sources: [berlinTaxAccount2024, lhoBerlin8],
        caveats: [pendingVerification],
      },
    ],
    edges: [
      {
        id: "event-grundsteuer",
        from: "event",
        to: "grundsteuer",
        weight: 870.447,
        kind: "exclusive_assignment",
        status: "calculated_official",
        shareLabel: "€870m (2024)",
        description: "Property tax collected by Berlin in 2024.",
        sources: [berlinTaxAccount2024],
        caveats: [pendingVerification],
      },
      {
        id: "event-grunderwerbsteuer",
        from: "event",
        to: "grunderwerbsteuer",
        weight: 910.834,
        kind: "exclusive_assignment",
        status: "calculated_official",
        shareLabel: "€911m (2024)",
        description: "Real-estate transfer tax collected on Berlin property purchases in 2024, at the 6% Berlin rate.",
        sources: [berlinTaxAccount2024],
        caveats: [pendingVerification],
      },
      {
        id: "grundsteuer-berlin",
        from: "grundsteuer",
        to: "berlin_budget",
        weight: 870.447,
        kind: "exclusive_assignment",
        status: "calculated_official",
        shareLabel: "100% to Berlin",
        description: "Property tax belongs to the municipality in full — Berlin. No revenue edge to any borough exists.",
        sources: [berlinTaxAccount2024],
        caveats: [pendingVerification],
      },
      {
        id: "grunderwerbsteuer-berlin",
        from: "grunderwerbsteuer",
        to: "berlin_budget",
        weight: 910.834,
        kind: "exclusive_assignment",
        status: "calculated_official",
        shareLabel: "100% to Berlin (Land tax)",
        description: "Real-estate transfer tax is a Land tax; Berlin is the Land where the property sits.",
        sources: [berlinTaxAccount2024],
        caveats: [pendingVerification],
      },
    ],
    annotations: [
      {
        nodeId: "event",
        text: "Renters: landlords may pass property tax through the annual service-charge bill (§2 Betriebskostenverordnung).",
      },
    ],
    boundary: {
      heading: "Beyond this line: the Berlin budget",
      body: berlinBoundaryBody,
      examples: berlinBoundaryExamples,
    },
};

function buildWageRoute(place: Place): Route {
  if (place.national) {
    return buildNationalWageRoute();
  }
  if (place.code === BERLIN.code) {
    return wageBerlin;
  }

  const name = place.name;
  const municipalTargetId = place.municipalMerged ? "land_budget" : "municipal_budget";
  const nodes: RouteNode[] = [
    {
      id: "event",
      stage: 0,
      label: `Payday in ${name}`,
      entity: "neutral",
      role: "event",
      description:
        "Your employer withholds wage tax before your salary arrives. For most employees this is the main income tax they ever pay.",
      amountNote: "Germany collected €947.7bn in taxes before distribution in 2024.",
      status: "calculated_official",
      sources: [destatis71211],
      caveats: [pendingVerification],
    },
    {
      id: "lohnsteuer",
      stage: 1,
      label: "Wage tax",
      official: "Lohnsteuer",
      entity: "neutral",
      role: "tax",
      description:
        "A joint tax: no single level of government owns it. The constitution fixes exactly how it is divided before a euro of it is spent.",
      status: "exact_statute",
      sources: [artikel106],
    },
    {
      id: "share_federation",
      stage: 2,
      label: "Federation 42.5%",
      entity: "federation",
      role: "share",
      description: "The federal share of income tax, fixed by Article 106 of the Basic Law.",
      status: "exact_statute",
      sources: [artikel106],
    },
    {
      id: "share_land",
      stage: 2,
      label: "Länder 42.5%",
      entity: "berlin",
      role: "share",
      description: `The Länder share is cleared to the Land where the employee lives — not where the employer's payroll office sits. You live in ${name}, so this share is cleared to ${name}.`,
      status: "exact_statute",
      sources: [artikel106, zerlegung],
    },
    {
      id: "share_municipal",
      stage: 2,
      label: "Municipalities 15%",
      entity: place.municipalMerged ? "berlin" : "municipalities",
      role: "share",
      description: place.municipalMerged
        ? `The municipal share is distributed by a statutory key based on residents' income-tax contributions, with a cap. ${name} counts as a municipality here too.`
        : "The municipal share is distributed among municipalities by a statutory key based on residents' income-tax contributions, with a cap.",
      status: "exact_statute",
      sources: [artikel106, gemFinRef],
    },
    {
      id: "federal_budget",
      stage: 3,
      label: "Federal budget",
      entity: "federation",
      role: "recipient",
      description:
        "The Federation's general budget. Once the money enters, its wage-tax identity ends — it funds the whole federal budget together with every other revenue.",
      status: "exact_statute",
      sources: [artikel106, bho8],
    },
    {
      id: "land_budget",
      stage: 3,
      label: `${name} budget`,
      official: place.cityState ? "Land + municipality" : undefined,
      entity: "berlin",
      role: "recipient",
      description: place.cityState
        ? `${name} is a Land and a municipality at once, so it receives both the Land share and the municipal share of your wage tax.`
        : `${name}'s Land budget. Once the money enters, its wage-tax identity ends — it funds the whole Land budget together with every other revenue.`,
      status: "exact_statute",
      sources: [artikel106, bho8],
    },
  ];
  if (!place.municipalMerged) {
    nodes.push({
      id: "municipal_budget",
      stage: 3,
      label: "Your municipality",
      entity: "municipalities",
      role: "recipient",
      description:
        "The town or city where you live receives the municipal share via the statutory key. Which municipality gets exactly how much is aggregate data — your personal euro is not individually traceable.",
      status: "formula_dependent",
      sources: [gemFinRef],
    });
  }

  const edges: RouteEdge[] = [
    {
      id: "event-tax",
      from: "event",
      to: "lohnsteuer",
      weight: 1,
      kind: "exclusive_assignment",
      status: "exact_statute",
      shareLabel: "withheld at source",
      description: "Wage tax is withheld by the employer and paid to the tax office on your behalf.",
      sources: [artikel106],
    },
    {
      id: "tax-federation",
      from: "lohnsteuer",
      to: "share_federation",
      weight: 0.425,
      kind: "fixed_share",
      status: "exact_statute",
      shareLabel: "42.5%",
      description: "Fixed federal share of wage and assessed income tax under Article 106(3) of the Basic Law.",
      sources: [artikel106],
    },
    {
      id: "tax-land",
      from: "lohnsteuer",
      to: "share_land",
      weight: 0.425,
      kind: "fixed_share",
      status: "exact_statute",
      shareLabel: "42.5%",
      description: "Fixed Länder share of wage and assessed income tax under Article 106(3) of the Basic Law.",
      sources: [artikel106],
    },
    {
      id: "tax-municipal",
      from: "lohnsteuer",
      to: "share_municipal",
      weight: 0.15,
      kind: "fixed_share",
      status: "exact_statute",
      shareLabel: "15%",
      description: "Fixed municipal share of income tax under Article 106(5) of the Basic Law.",
      sources: [artikel106, gemFinRef],
    },
    {
      id: "federation-budget",
      from: "share_federation",
      to: "federal_budget",
      weight: 0.425,
      kind: "exclusive_assignment",
      status: "exact_statute",
      shareLabel: "to the federal budget",
      description: "The federal share flows into the Federation's general budget.",
      sources: [artikel106],
    },
    {
      id: "land-place",
      from: "share_land",
      to: "land_budget",
      weight: 0.425,
      kind: "decomposition_adjustment",
      status: "exact_statute",
      shareLabel: "cleared to your Land of residence",
      description: `Wage tax is decomposed principally to the employee's Land of residence under §7 Zerlegungsgesetz. For a resident of ${name}, the Land share is cleared to ${name}.`,
      sources: [zerlegung],
      caveats: [`Shown for a resident of ${name}; the clearing operates on official aggregates, not on your individual euro.`],
    },
    {
      id: "municipal-place",
      from: "share_municipal",
      to: municipalTargetId,
      weight: 0.15,
      kind: "annual_formula",
      status: "not_individually_traceable",
      shareLabel: "by statutory key, capped",
      description:
        "The municipal 15% is distributed using residence and a capped income-tax contribution key. Your exact personal allocation cannot be reproduced from public aggregate data — the aggregate shares can.",
      sources: [gemFinRef],
    },
  ];

  return {
    id: "wage",
    chipTitle: "You earn a wage",
    chipNote: "Wage tax · Lohnsteuer",
    lede: `Wage tax is taken from every paycheck and split by the constitution: 42.5% Federation, 42.5% Land, 15% municipalities. For a resident of ${name}, the Land share goes to ${name}.`,
    stages: ["The event", "The named tax", "Who gets it, by law", "Recipient budgets"],
    unit: "share",
    unitNote: "Ribbon widths show the statutory split of one wage-tax euro (Article 106: 42.5 / 42.5 / 15).",
    brief: {
      about: `The legal destination of one wage-tax euro withheld from a resident of ${name}.`,
      takeaway: `42.5% Federation · 42.5% ${name} · 15% municipalities; residence decides the Land share.`,
      sources: [artikel106, zerlegung],
    },
    placeAware: true,
    entityLabels: { ...ENTITY_LABELS, berlin: name },
    nodes,
    edges,
    annotations: [
      {
        nodeId: "land_budget",
        text: `The statutory split is identical for every Land; ${name}-specific euro amounts arrive with the verified dataset.`,
      },
    ],
    boundary: {
      heading: place.cityState ? `Beyond this line: the ${name} budget` : "Beyond this line: three budgets, one rule",
      body: [
        "From here on, the general coverage principle applies: except for lawful earmarking, all revenue finances all expenditure. The euros you followed are now indistinguishable from every other euro in the budget.",
        `So the honest question changes from "what did my tax pay for?" to "what does each budget pay for as a whole?" Verified recipient accounts are being added Land by Land — Berlin first.`,
      ],
      examples: berlinBoundaryExamples,
    },
  };
}

function buildNationalWageRoute(): Route {
  return {
    id: "wage",
    chipTitle: "You earn a wage",
    chipNote: "Wage tax · Lohnsteuer",
    lede: "Wage tax is taken from every paycheck. The constitution splits it: 42.5% to the Federation, 42.5% to the Länder, 15% to municipalities. This split is the same everywhere in Germany.",
    stages: ["The event", "The named tax", "Who gets it, by law", "Recipient budgets"],
    unit: "share",
    unitNote: "Ribbon widths show the statutory split of one wage-tax euro (Article 106: 42.5 / 42.5 / 15).",
    brief: {
      about: "The legal destination of one wage-tax euro withheld in Germany.",
      takeaway: "42.5% Federation · 42.5% Länder · 15% municipalities; the split is identical in every Land.",
      sources: [artikel106, zerlegung],
    },
    placeAware: true,
    entityLabels: { ...ENTITY_LABELS },
    nodes: [
      {
        id: "event",
        stage: 0,
        label: "Payday in Germany",
        entity: "neutral",
        role: "event",
        description:
          "Employers withhold wage tax before salaries are paid out. For most employees this is the main income tax they pay.",
        amountNote: "Germany collected €947.7bn in taxes before distribution in 2024.",
        status: "calculated_official",
        sources: [destatis71211],
        caveats: [pendingVerification],
      },
      {
        id: "lohnsteuer",
        stage: 1,
        label: "Wage tax",
        official: "Lohnsteuer",
        entity: "neutral",
        role: "tax",
        description:
          "A joint tax: no single level of government owns it. The constitution fixes how it is divided before any of it is spent.",
        status: "exact_statute",
        sources: [artikel106],
      },
      {
        id: "share_federation",
        stage: 2,
        label: "Federation 42.5%",
        entity: "federation",
        role: "share",
        description: "The federal share of income tax, fixed by Article 106 of the Basic Law.",
        status: "exact_statute",
        sources: [artikel106],
      },
      {
        id: "share_laender",
        stage: 2,
        label: "Länder 42.5%",
        entity: "laender",
        role: "share",
        description: "The Länder share. Each Land receives the wage tax of its own residents (residence-based clearing).",
        status: "exact_statute",
        sources: [artikel106, zerlegung],
      },
      {
        id: "share_municipal",
        stage: 2,
        label: "Municipalities 15%",
        entity: "municipalities",
        role: "share",
        description: "The municipal share, distributed among municipalities by a statutory key based on residents' income tax, with a cap.",
        status: "exact_statute",
        sources: [artikel106, gemFinRef],
      },
      {
        id: "federal_budget",
        stage: 3,
        label: "Federal budget",
        entity: "federation",
        role: "recipient",
        description: "The Federation's general budget. From here on, wage tax is not tracked separately — it pays for everything the budget pays for.",
        status: "exact_statute",
        sources: [artikel106, bho8],
      },
      {
        id: "laender_budgets",
        stage: 3,
        label: "The 16 Länder",
        entity: "laender",
        role: "recipient",
        description: "Each Land's budget receives the wage tax of the people who live there. Pick a Land on the map to see its route.",
        status: "exact_statute",
        sources: [artikel106, zerlegung],
      },
      {
        id: "municipal_budgets",
        stage: 3,
        label: "Municipalities",
        entity: "municipalities",
        role: "recipient",
        description: "Cities and towns receive the municipal share via the statutory key.",
        status: "exact_statute",
        sources: [gemFinRef],
      },
    ],
    edges: [
      {
        id: "event-tax",
        from: "event",
        to: "lohnsteuer",
        weight: 1,
        kind: "exclusive_assignment",
        status: "exact_statute",
        shareLabel: "withheld at source",
        description: "Wage tax is withheld by the employer and paid to the tax office.",
        sources: [artikel106],
      },
      {
        id: "tax-federation",
        from: "lohnsteuer",
        to: "share_federation",
        weight: 0.425,
        kind: "fixed_share",
        status: "exact_statute",
        shareLabel: "42.5%",
        description: "Fixed federal share of wage and assessed income tax under Article 106(3) of the Basic Law.",
        sources: [artikel106],
      },
      {
        id: "tax-laender",
        from: "lohnsteuer",
        to: "share_laender",
        weight: 0.425,
        kind: "fixed_share",
        status: "exact_statute",
        shareLabel: "42.5%",
        description: "Fixed Länder share of wage and assessed income tax under Article 106(3) of the Basic Law.",
        sources: [artikel106],
      },
      {
        id: "tax-municipal",
        from: "lohnsteuer",
        to: "share_municipal",
        weight: 0.15,
        kind: "fixed_share",
        status: "exact_statute",
        shareLabel: "15%",
        description: "Fixed municipal share of income tax under Article 106(5) of the Basic Law.",
        sources: [artikel106, gemFinRef],
      },
      {
        id: "federation-budget",
        from: "share_federation",
        to: "federal_budget",
        weight: 0.425,
        kind: "exclusive_assignment",
        status: "exact_statute",
        shareLabel: "to the federal budget",
        description: "The federal share flows into the Federation's general budget.",
        sources: [artikel106],
      },
      {
        id: "laender-budgets",
        from: "share_laender",
        to: "laender_budgets",
        weight: 0.425,
        kind: "decomposition_adjustment",
        status: "exact_statute",
        shareLabel: "by Land of residence",
        description: "Wage tax is cleared to the Land where each employee lives (§7 Zerlegungsgesetz).",
        sources: [zerlegung],
      },
      {
        id: "municipal-budgets",
        from: "share_municipal",
        to: "municipal_budgets",
        weight: 0.15,
        kind: "annual_formula",
        status: "not_individually_traceable",
        shareLabel: "by statutory key, capped",
        description:
          "Distributed using residence and a capped income-tax contribution key. Aggregate shares are official; a single person's euro is not individually traceable.",
        sources: [gemFinRef],
      },
    ],
    annotations: [
      {
        nodeId: "laender_budgets",
        text: "This split is written into the constitution — it is identical in every Land. Pick a Land to see its own route.",
      },
    ],
    boundary: {
      heading: "After this line: general budgets",
      body: [
        "By law, all revenue pays for all spending (except for explicit legal earmarks). So from here on, wage tax cannot be tracked separately.",
        "What each budget spends as a whole will be shown once the audited accounts are loaded (federal and Berlin first).",
      ],
      examples: berlinBoundaryExamples,
    },
  };
}

function buildNationalVatRoute(): Route {
  const poolWeight = VAT_LAENDER_POOL_MEUR / VAT_TOTAL_MEUR;
  const paying = landFigures.filter((entry) => entry.equalisationMeur < 0);
  const totalShifted = landFigures
    .filter((entry) => entry.equalisationMeur > 0)
    .reduce((sum, entry) => sum + entry.equalisationMeur, 0);
  return {
    ...vatBerlin,
    lede: "VAT from every purchase goes into one national pot. An annual formula splits it between the Federation, the Länder and municipalities; the Länder part is shared by population, with an equalisation adjustment.",
    brief: {
      about: "Where Germany's €302.1bn 2024 VAT aggregate went across all public budgets.",
      takeaway: "48.1% Federation · 49.1% Länder · 2.8% municipalities; the Länder pool is then equalised.",
      sources: [bmfDec2024, bmfEqualisation2024],
    },
    entityLabels: { ...ENTITY_LABELS },
    nodes: [
      ...vatBerlin.nodes
        .filter((node) =>
          ["event", "vat_pool", "share_federation", "laender_pool", "share_municipal", "federal_budget"].includes(node.id),
        )
        .map((node) => (node.id === "event" ? { ...node, label: "A purchase in Germany" } : node)),
      {
        id: "laender_budgets",
        stage: 3,
        label: "The 16 Länder",
        entity: "laender",
        role: "recipient",
        description: `The Länder pool is shared by population, then adjusted for fiscal capacity: in 2024, €${(totalShifted / 1000).toFixed(2)}bn moved from above-average to below-average Länder inside this pool.`,
        status: "provisional_official",
        sources: [bmfEqualisation2024, artikel107],
        caveats: [pendingVerification],
      },
      {
        id: "municipalities_budget",
        stage: 3,
        label: "Municipalities",
        entity: "municipalities",
        role: "recipient",
        description: "The municipal VAT share, distributed nationwide by a fixed statutory key.",
        status: "calculated_official",
        sources: [vatKeyReg],
        caveats: [pendingVerification],
      },
    ],
    edges: [
      ...vatBerlin.edges.filter((edge) =>
        ["event-pool", "pool-federation", "pool-laender", "pool-municipal", "federation-budget"].includes(edge.id),
      ),
      {
        id: "laender-budgets",
        from: "laender_pool",
        to: "laender_budgets",
        weight: poolWeight,
        kind: "equalisation_adjustment",
        status: "provisional_official",
        shareLabel: "population share ± equalisation",
        description:
          "Each Land's slice is its population share plus or minus the pooled fiscal-capacity adjustment. No Land pays another Land directly.",
        sources: [bmfEqualisation2024, artikel107],
        caveats: [pendingVerification],
      },
      {
        id: "municipal-all",
        from: "share_municipal",
        to: "municipalities_budget",
        weight: 0.027903,
        kind: "annual_formula",
        status: "calculated_official",
        shareLabel: "by statutory key",
        description: "The municipal VAT share flows to municipalities nationwide under the fixed 2024–2026 key.",
        sources: [vatKeyReg],
        caveats: [pendingVerification],
      },
    ],
    annotations: [
      {
        nodeId: "federal_budget",
        text: "EU own resources (€32.0bn in 2024) leave from the federal level — they are computed from a harmonised base, not taken from your purchase.",
      },
      {
        nodeId: "laender_budgets",
        text: `In 2024, ${paying.length} Länder paid into equalisation (Bayern, Baden-Württemberg, Hessen, Hamburg); the other twelve received. The map shows who pays and who receives, per resident.`,
      },
    ],
    boundary: {
      heading: "After this line: general budgets",
      body: [
        "By law, all revenue pays for all spending. Your VAT is now part of federal, Länder and municipal budgets in shares no receipt can trace.",
        "What each budget spends as a whole will be shown once the audited accounts are loaded.",
      ],
      examples: berlinBoundaryExamples,
    },
  };
}

function buildVatRoute(place: Place): Route {
  if (place.national) {
    return buildNationalVatRoute();
  }
  if (place.code === BERLIN.code) {
    return vatBerlin;
  }

  const name = place.name;
  const figures = getLandFigures(place.code);
  if (!figures) {
    return vatBerlin;
  }
  const sliceMeur = figures.vatBaseMeur + figures.equalisationMeur;
  const sliceWeight = sliceMeur / VAT_TOTAL_MEUR;
  const poolWeight = VAT_LAENDER_POOL_MEUR / VAT_TOTAL_MEUR;
  const eqLabel =
    figures.equalisationMeur >= 0
      ? `€${(figures.vatBaseMeur / 1000).toFixed(2)}bn base + €${(figures.equalisationMeur / 1000).toFixed(2)}bn equalisation`
      : `€${(figures.vatBaseMeur / 1000).toFixed(2)}bn base − €${(Math.abs(figures.equalisationMeur) / 1000).toFixed(2)}bn equalisation deduction`;
  const grantsNote =
    figures.supplementaryGrantsMeur > 0
      ? `${name} also received €${(figures.supplementaryGrantsMeur / 1000).toFixed(2)}bn in general federal supplementary grants (2024) — general federal funds, not VAT.`
      : `${name} received no general federal supplementary grants in 2024 — its fiscal capacity sits above the grant threshold.`;

  const vatPoolNodes = vatBerlin.nodes
    .filter((node) =>
      ["event", "vat_pool", "share_federation", "laender_pool", "share_municipal", "federal_budget"].includes(node.id),
    )
    .map((node) => (node.id === "event" ? { ...node, label: `A purchase in ${name}` } : node));

  const nodes: RouteNode[] = [
    ...vatPoolNodes,
    {
      id: "land_budget",
      stage: 3,
      label: `${name} budget`,
      official: place.cityState ? "Land + municipality" : undefined,
      entity: "berlin",
      role: "recipient",
      description:
        figures.equalisationMeur >= 0
          ? `${name}'s slice of the Länder pool is population-based and lifted by a pooled equalisation addition — €${(sliceMeur / 1000).toFixed(2)}bn of 2024 VAT in total. None of it is 'your' VAT specifically.`
          : `${name}'s slice of the Länder pool is population-based, reduced by a pooled equalisation deduction — €${(sliceMeur / 1000).toFixed(2)}bn of 2024 VAT in total. None of it is 'your' VAT specifically.`,
      status: "provisional_official",
      sources: [bmfEqualisation2024],
      caveats: [pendingVerification],
    },
    {
      id: "other_laender",
      stage: 3,
      label: "Other 15 Länder",
      entity: "laender",
      role: "recipient",
      description:
        "The rest of the Länder pool, distributed by population with pooled equalisation additions and deductions — never bilateral transfers between Länder.",
      status: "provisional_official",
      sources: [bmfEqualisation2024],
      caveats: [pendingVerification],
    },
    {
      id: "municipalities_budget",
      stage: 3,
      label: "Municipalities",
      entity: "municipalities",
      role: "recipient",
      description:
        "The municipal VAT share, distributed nationwide by a fixed statutory key. Your own municipality's slice is aggregate data; per-Land key detail arrives with a later dataset.",
      status: "calculated_official",
      sources: [vatKeyReg],
      caveats: [pendingVerification],
    },
  ];

  const keepEdges = vatBerlin.edges.filter((edge) =>
    ["event-pool", "pool-federation", "pool-laender", "pool-municipal", "federation-budget"].includes(edge.id),
  );

  const edges: RouteEdge[] = [
    ...keepEdges,
    {
      id: "laender-place",
      from: "laender_pool",
      to: "land_budget",
      weight: sliceWeight,
      kind: "equalisation_adjustment",
      status: "provisional_official",
      shareLabel: eqLabel,
      description: `${name}'s population-based share of the Länder pool, adjusted by the pooled fiscal-capacity equalisation. Pooled — not a transfer from any named Land.`,
      sources: [bmfEqualisation2024, artikel107],
      caveats: ["BMF bases the 2024 calculation on the provisional annual account.", pendingVerification],
    },
    {
      id: "laender-others",
      from: "laender_pool",
      to: "other_laender",
      weight: poolWeight - sliceWeight,
      kind: "equalisation_adjustment",
      status: "provisional_official",
      shareLabel: "population share ± equalisation",
      description: `The remaining Länder pool after ${name}'s slice.`,
      sources: [bmfEqualisation2024],
      caveats: [pendingVerification],
    },
    {
      id: "municipal-all",
      from: "share_municipal",
      to: "municipalities_budget",
      weight: 0.027903,
      kind: "annual_formula",
      status: "calculated_official",
      shareLabel: "by statutory key",
      description: "The municipal VAT share flows to municipalities nationwide under the fixed 2024–2026 key.",
      sources: [vatKeyReg],
      caveats: [pendingVerification],
    },
  ];

  return {
    ...vatBerlin,
    lede: `VAT paid at a till in ${name} does not stay in ${name}. It joins one national aggregate, is split by an annual formula, and comes back through a population-weighted, equalised pool.`,
    brief: {
      about: `Where Germany's €302.1bn 2024 VAT aggregate went, including ${name}'s slice.`,
      takeaway: "48.1% Federation · 49.1% Länder · 2.8% municipalities; the Länder pool is then equalised.",
      sources: [bmfDec2024, bmfEqualisation2024],
    },
    entityLabels: { ...ENTITY_LABELS, berlin: name },
    nodes,
    edges,
    annotations: [
      {
        nodeId: "federal_budget",
        text: "EU own resources (€32.0bn in 2024) leave from the federal level — not a traceable slice of your purchase.",
      },
      { nodeId: "land_budget", text: grantsNote },
    ],
    boundary: {
      heading: "Beyond this line: four budgets, one rule",
      body: [
        `Each recipient budget obeys the general coverage principle: all revenue finances all expenditure. The VAT you paid is now part of federal, ${name}, Länder and municipal budgets in shares no receipt can trace.`,
        "What each budget spends, as a whole, becomes explorable as verified recipient accounts are added.",
      ],
      examples: berlinBoundaryExamples,
    },
  };
}

interface LandTaxes {
  code: string;
  gross_trade_tax_meur: number;
  trade_tax_levy_meur: number;
  property_tax_meur: number;
  transfer_tax_meur: number;
}

const landTaxRows = taxesByLand.laender as LandTaxes[];

function getLandTaxes(code: string): LandTaxes | undefined {
  return landTaxRows.find((row) => row.code === code);
}

const genesis71211: SourceRef = {
  label: "Destatis GENESIS statistic 71211 (2024 cash results)",
  url: "https://genesis.destatis.de/datenbank/online/statistic/71211/details",
};

const levySplitCaveats = [
  "Federal and Land components are derived from the statutory multipliers (14.5 and 20.5 of 35, §6 GemFinRefG); the cash-year levy includes quarterly-payment and prior-year settlement timing.",
  pendingVerification,
];

const genericSpendBoundary = (heading: string) => ({
  heading,
  body: [
    "By law, all revenue pays for all spending (except for explicit legal earmarks). From here on, this tax cannot be tracked separately.",
    "The panel shows what the recipient budget spent as a whole, from its audited or standardized accounts.",
  ],
  examples: berlinBoundaryExamples,
});

function buildTradeRoute(place: Place): Route {
  if (place.code === BERLIN.code) {
    return tradeBerlin;
  }
  const national = place.national === true;
  const rows = national ? landTaxRows : landTaxRows.filter((row) => row.code === place.code);
  const gross = rows.reduce((sum, row) => sum + row.gross_trade_tax_meur, 0);
  const levy = rows.reduce((sum, row) => sum + row.trade_tax_levy_meur, 0);
  const net = gross - levy;
  const fedComponent = (levy * 14.5) / 35;
  const landComponent = (levy * 20.5) / 35;
  const name = national ? "Germany" : place.name;
  const munisLabel = national ? "Municipalities" : place.municipalMerged ? `${name} budget` : `Municipalities in ${name}`;
  const landLabel = national ? "The 16 Länder" : `${name} budget`;
  const mergedCity = !national && place.municipalMerged;

  const nodes: RouteNode[] = [
    {
      id: "event",
      stage: 0,
      label: national ? "Businesses across Germany" : `A business operates in ${name}`,
      entity: "neutral",
      role: "event",
      description: national
        ? "Businesses pay trade tax on their profits to the municipality where they operate; each municipality sets its own assessment rate."
        : `Businesses in ${name} pay trade tax on their profits to their municipality, at that municipality's assessment rate.`,
      status: "calculated_official",
      sources: [genesis71211],
      caveats: [pendingVerification],
    },
    {
      id: "gewerbesteuer",
      stage: 1,
      label: "Trade tax",
      official: "Gewerbesteuer",
      entity: "neutral",
      role: "tax",
      description:
        "The main municipal tax, on business profits. A statutory levy passes a fixed component up to the Federation and the Land.",
      amountNote: `${name} 2024 gross: ${formatBn(gross)}.`,
      status: "calculated_official",
      sources: [genesis71211, gemFinRef6],
      caveats: [pendingVerification],
    },
    {
      id: mergedCity ? "land_budget" : "municipal_budgets",
      stage: 2,
      label: munisLabel,
      official: mergedCity ? "Land + municipality" : undefined,
      entity: mergedCity ? "berlin" : "municipalities",
      role: "recipient",
      description: mergedCity
        ? `${name} is a Land and a municipality at once, so it keeps the municipal share — and the Land component of the levy stays in town too.`
        : national
          ? "Municipalities keep trade tax net of the statutory levy — it is their most important own tax."
          : `The municipalities of ${name} keep trade tax net of the statutory levy — their most important own tax.`,
      status: "calculated_official",
      sources: [genesis71211, gemFinRef6],
      caveats: [pendingVerification],
    },
    {
      id: "federal_budget",
      stage: 2,
      label: "Federal budget",
      entity: "federation",
      role: "recipient",
      description: "The federal component of the trade-tax levy (14.5 of the 35 multiplier).",
      status: "calculated_official",
      sources: [gemFinRef6],
      caveats: levySplitCaveats,
    },
  ];
  if (!mergedCity) {
    nodes.splice(3, 0, {
      id: "land_budget",
      stage: 2,
      label: landLabel,
      entity: national ? "laender" : "berlin",
      role: "recipient",
      description: national
        ? "The Land component of the levy (20.5 of the 35 multiplier) flows to each Land."
        : `The Land component of the levy (20.5 of the 35 multiplier) flows to ${name}'s budget.`,
      status: "calculated_official",
      sources: [gemFinRef6],
      caveats: levySplitCaveats,
    });
  }

  const edges: RouteEdge[] = [
    {
      id: "event-trade",
      from: "event",
      to: "gewerbesteuer",
      weight: gross,
      kind: "exclusive_assignment",
      status: "calculated_official",
      shareLabel: `${formatBn(gross)} gross (2024)`,
      description: national
        ? "Gross trade tax collected by all German municipalities in 2024."
        : `Gross trade tax collected in ${name} in 2024.`,
      sources: [genesis71211],
      caveats: [pendingVerification],
    },
    {
      id: "trade-munis",
      from: "gewerbesteuer",
      to: mergedCity ? "land_budget" : "municipal_budgets",
      weight: net,
      kind: "exclusive_assignment",
      status: "calculated_official",
      shareLabel: "net of the levy",
      description: "Gross trade tax minus the full statutory levy (35 multiplier: 14.5 federal + 20.5 Land, §6 GemFinRefG).",
      sources: [genesis71211, gemFinRef6],
      caveats: [pendingVerification],
    },
    {
      id: "trade-federation",
      from: "gewerbesteuer",
      to: "federal_budget",
      weight: fedComponent,
      kind: "fixed_share",
      status: "calculated_official",
      shareLabel: "federal levy component",
      description: `The federal share of the levy: 14.5 of 35, ≈ ${formatBn(fedComponent)} in 2024.`,
      sources: [gemFinRef6],
      caveats: levySplitCaveats,
    },
    {
      id: "trade-land",
      from: "gewerbesteuer",
      to: "land_budget",
      weight: landComponent,
      kind: "fixed_share",
      status: "calculated_official",
      shareLabel: mergedCity ? "Land levy component — stays in town" : "Land levy component",
      description: `The Land share of the levy: 20.5 of 35, ≈ ${formatBn(landComponent)} in 2024.`,
      sources: [gemFinRef6],
      caveats: levySplitCaveats,
    },
  ];

  return {
    id: "trade",
    chipTitle: "A business pays trade tax",
    chipNote: "Gewerbesteuer",
    lede: national
      ? "Trade tax is the municipalities' most important own tax. They keep it net of a statutory levy whose components go to the Länder and the Federation."
      : `Trade tax stays mostly with ${mergedCity ? name : `the municipalities of ${name}`}; a statutory levy passes fixed components to the Land and the Federation.`,
    stages: ["The event", "The named tax", "Recipient budgets"],
    unit: "million_eur",
    unitNote: `Ribbon widths show observed 2024 amounts (gross trade tax ${formatBn(gross)}).`,
    brief: {
      about: national
        ? "The route of Germany's €75.3bn gross trade tax in 2024."
        : `The route of ${name}'s ${formatBn(gross)} gross trade tax in 2024.`,
      takeaway: mergedCity
        ? `${name} keeps the municipal and Land components; only the federal levy component leaves.`
        : "Municipalities keep the net; the levy splits 20.5 Land / 14.5 federal.",
      sources: [genesis71211, gemFinRef6],
    },
    placeAware: true,
    entityLabels: { ...ENTITY_LABELS, berlin: national ? ENTITY_LABELS.berlin : name },
    nodes,
    edges,
    annotations: national
      ? [{ nodeId: "municipal_budgets", text: "Each municipality sets its own assessment rate — the local levels differ far more than the Land totals shown here." }]
      : [],
    boundary: genericSpendBoundary(mergedCity ? `Beyond this line: the ${name} budget` : "Beyond this line: general budgets"),
  };
}

function buildHousingRoute(place: Place): Route {
  if (place.code === BERLIN.code) {
    return housingBerlin;
  }
  const national = place.national === true;
  const rows = national ? landTaxRows : landTaxRows.filter((row) => row.code === place.code);
  const property = rows.reduce((sum, row) => sum + row.property_tax_meur, 0);
  const transfer = rows.reduce((sum, row) => sum + row.transfer_tax_meur, 0);
  const name = national ? "Germany" : place.name;
  const mergedCity = !national && place.municipalMerged;
  const propertyTargetId = mergedCity ? "land_budget" : "municipal_budgets";

  const nodes: RouteNode[] = [
    {
      id: "event",
      stage: 0,
      label: national ? "Homes across Germany" : `A home in ${name}`,
      entity: "neutral",
      role: "event",
      description:
        "Owning property means yearly property tax; buying one triggers real-estate transfer tax. Landlords may pass property tax to renters through service charges.",
      status: "calculated_official",
      sources: [genesis71211, betrKV2],
      caveats: [pendingVerification],
    },
    {
      id: "grundsteuer",
      stage: 1,
      label: "Property tax",
      official: "Grundsteuer",
      entity: "neutral",
      role: "tax",
      description: "A municipal tax on real property, paid yearly; commonly reaches renters via the service-charge bill.",
      amountNote: `${name} 2024: ${formatBn(property)}.`,
      status: "calculated_official",
      sources: [genesis71211, betrKV2],
      caveats: [pendingVerification],
    },
    {
      id: "grunderwerbsteuer",
      stage: 1,
      label: "Real-estate transfer tax",
      official: "Grunderwerbsteuer",
      entity: "neutral",
      role: "tax",
      description: "A Land tax due when property changes hands; each Land sets its own rate.",
      amountNote: `${name} 2024: ${formatBn(transfer)}.`,
      status: "calculated_official",
      sources: [genesis71211],
      caveats: [pendingVerification],
    },
    ...(mergedCity
      ? []
      : [
          {
            id: "municipal_budgets",
            stage: 2,
            label: national ? "Municipalities" : `Municipalities in ${name}`,
            entity: "municipalities",
            role: "recipient",
            description: "Property tax belongs to the municipality in full.",
            status: "calculated_official",
            sources: [genesis71211],
            caveats: [pendingVerification],
          } satisfies RouteNode,
        ]),
    {
      id: "land_budget",
      stage: 2,
      label: national ? "The 16 Länder" : `${name} budget`,
      official: mergedCity ? "Land + municipality" : undefined,
      entity: national ? "laender" : "berlin",
      role: "recipient",
      description: mergedCity
        ? `${name} is Land and municipality at once — both housing taxes stay in town.`
        : "Real-estate transfer tax is a Land tax; it goes to the Land where the property sits.",
      status: "calculated_official",
      sources: [genesis71211, lhoBerlin8],
      caveats: [pendingVerification],
    },
  ];

  const edges: RouteEdge[] = [
    {
      id: "event-grundsteuer",
      from: "event",
      to: "grundsteuer",
      weight: property,
      kind: "exclusive_assignment",
      status: "calculated_official",
      shareLabel: `${formatBn(property)} (2024)`,
      description: `Property tax collected in ${name} in 2024 (Grundsteuer A + B).`,
      sources: [genesis71211],
      caveats: [pendingVerification],
    },
    {
      id: "event-grunderwerbsteuer",
      from: "event",
      to: "grunderwerbsteuer",
      weight: transfer,
      kind: "exclusive_assignment",
      status: "calculated_official",
      shareLabel: `${formatBn(transfer)} (2024)`,
      description: `Real-estate transfer tax collected in ${name} in 2024.`,
      sources: [genesis71211],
      caveats: [pendingVerification],
    },
    {
      id: "grundsteuer-munis",
      from: "grundsteuer",
      to: propertyTargetId,
      weight: property,
      kind: "exclusive_assignment",
      status: "calculated_official",
      shareLabel: mergedCity ? "100% — stays in town" : "100% to the municipality",
      description: "Property tax belongs to the municipality in full — no borough or district receives it directly.",
      sources: [genesis71211],
      caveats: [pendingVerification],
    },
    {
      id: "grunderwerbsteuer-land",
      from: "grunderwerbsteuer",
      to: "land_budget",
      weight: transfer,
      kind: "exclusive_assignment",
      status: "calculated_official",
      shareLabel: "100% to the Land",
      description: "Real-estate transfer tax is assigned exclusively to the Länder.",
      sources: [genesis71211, artikel106],
      caveats: [pendingVerification],
    },
  ];

  return {
    id: "housing",
    chipTitle: "You own or rent a home",
    chipNote: "Grundsteuer · Grunderwerbsteuer",
    lede: national
      ? "Housing carries two named taxes: property tax every year (to the municipality) and real-estate transfer tax on purchases (to the Land)."
      : `Housing in ${name} carries two named taxes: property tax every year and real-estate transfer tax when a home is bought.`,
    stages: ["The event", "The named taxes", "Recipient budgets"],
    unit: "million_eur",
    unitNote: `Ribbon widths show observed 2024 amounts (property tax ${formatBn(property)}; transfer tax ${formatBn(transfer)}).`,
    brief: {
      about: national
        ? "The routes of Germany's €16.1bn property tax and €12.7bn real-estate transfer tax in 2024."
        : `The routes of ${name}'s housing taxes in 2024.`,
      takeaway: mergedCity
        ? `Both housing taxes stay entirely in the ${name} budget.`
        : "Property tax stays municipal; the transfer tax goes to the Land.",
      sources: [genesis71211, artikel106],
    },
    placeAware: true,
    entityLabels: { ...ENTITY_LABELS, berlin: national ? ENTITY_LABELS.berlin : name },
    nodes,
    edges,
    annotations: [],
    boundary: genericSpendBoundary(mergedCity ? `Beyond this line: the ${name} budget` : "Beyond this line: general budgets"),
  };
}

interface SocialSystemRow {
  id: string;
  name: string;
  name_de: string;
  contributions_meur: number;
  federal_grants_meur: number;
  expenditure_meur: number;
  rate: { pct: number; split: string; legal_basis: { label: string; url: string } };
  source: { label: string; url: string };
}

const socialSystems = socialInsurance.systems as SocialSystemRow[];

function buildSocialRoute(): Route {
  const totalContributions = socialSystems.reduce((sum, system) => sum + system.contributions_meur, 0);
  const nodes: RouteNode[] = [
    {
      id: "event",
      stage: 0,
      label: "Payroll deductions",
      entity: "neutral",
      role: "event",
      description:
        "Social contributions are withheld alongside wage tax — split between employee and employer. They are not taxes: each euro is assigned by law to one statutory insurance system.",
      amountNote: `2024 contributions across the four systems: ${formatBn(totalContributions)}.`,
      status: "calculated_official",
      sources: socialSystems.map((system) => system.source),
      caveats: [pendingVerification],
    },
    {
      id: "federal_grants",
      stage: 0,
      label: "Federal budget (grants)",
      entity: "federation",
      role: "event",
      description:
        "The federal budget adds large tax-financed grants — mainly to the pension system — on top of contributions.",
      status: "calculated_official",
      sources: [socialSystems[0]!.source],
      caveats: [pendingVerification],
    },
    ...socialSystems.map(
      (system): RouteNode => ({
        id: system.id,
        stage: 1,
        label: system.name,
        official: system.name_de,
        entity: "neutral",
        role: "recipient",
        description: `${system.name}: 2024 contribution rate ${system.rate.pct}% (${system.rate.split}).`,
        amountNote: `2024 expenditure: ${formatBn(system.expenditure_meur)}.`,
        status: "calculated_official",
        sources: [system.source, system.rate.legal_basis],
        caveats: [pendingVerification],
      }),
    ),
  ];
  const edges: RouteEdge[] = [
    ...socialSystems.map(
      (system): RouteEdge => ({
        id: `contrib-${system.id}`,
        from: "event",
        to: system.id,
        weight: system.contributions_meur,
        kind: "exclusive_assignment",
        status: "calculated_official",
        shareLabel: `${system.rate.pct}% of gross pay`,
        description: `Contributions assigned by law to the ${system.name.toLowerCase()} (${system.rate.legal_basis.label}).`,
        sources: [system.source, system.rate.legal_basis],
        caveats: [pendingVerification],
      }),
    ),
    ...socialSystems
      .filter((system) => system.federal_grants_meur > 0)
      .map(
        (system): RouteEdge => ({
          id: `grant-${system.id}`,
          from: "federal_grants",
          to: system.id,
          weight: system.federal_grants_meur,
          kind: "interbudget_transfer",
          status: "calculated_official",
          shareLabel: `${formatBn(system.federal_grants_meur)} federal grants`,
          description: `Tax-financed federal grants to the ${system.name.toLowerCase()} — federal expenditure on one side, system revenue on the other.`,
          sources: [system.source],
          caveats: [pendingVerification],
        }),
      ),
  ];
  return {
    id: "social",
    chipTitle: "You pay social contributions",
    chipNote: "Rente · Kranken · Pflege · Arbeitslosen",
    lede: "The biggest paycheck deduction after wage tax. Contributions go straight to four statutory insurance systems — plus large tax-financed federal grants on top.",
    stages: ["Where the money comes from", "The four systems"],
    unit: "million_eur",
    unitNote: "Ribbon widths show 2024 amounts: contributions per system, plus federal grants.",
    brief: {
      about: "Where €706bn of 2024 social contributions (plus €102bn federal grants) went, system by system.",
      takeaway: "Not taxes: each euro is assigned by law to one system. The same place everywhere in Germany.",
      sources: socialSystems.map((system) => system.source),
    },
    placeAware: true,
    entityLabels: { ...ENTITY_LABELS },
    nodes,
    edges,
    annotations: [
      {
        nodeId: "pension",
        text: "The pension system also receives €27.4bn of health contributions paid on behalf of pensioners — systems transfer money between each other, so their totals must not be summed naively.",
      },
    ],
    boundary: genericSpendBoundary("Beyond this line: the system accounts"),
  };
}

export function buildRoutes(place: Place): Route[] {
  return [buildWageRoute(place), buildVatRoute(place), buildTradeRoute(place), buildHousingRoute(place), buildSocialRoute()];
}

export const routes: Route[] = buildRoutes(GERMANY);

export function getRoute(id: string): Route | undefined {
  return routes.find((route) => route.id === id);
}

export const defaultRouteId = "wage";
