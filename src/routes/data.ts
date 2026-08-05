/**
 * Fiscal-graph route fixtures for the P0 prototype.
 *
 * Statutory shares are exact law and cite their legal basis. Euro figures come
 * from the 2026-08-05 deep-research report and are PENDING INDEPENDENT
 * VERIFICATION — the page banner says so. Nothing here is published data.
 */

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

export interface Route {
  id: string;
  chipTitle: string;
  chipNote: string;
  lede: string;
  stages: string[];
  /** How edge weights are expressed: fractions of the route, or observed € millions. */
  unit: "share" | "million_eur";
  unitNote: string;
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

const pendingVerification = "Research-report figure — pending independent verification.";

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

export const routes: Route[] = [
  {
    id: "wage",
    chipTitle: "You earn a wage",
    chipNote: "Wage tax · Lohnsteuer",
    lede: "Wage tax is withheld from every paycheck. Its split is written into the constitution — and for a Berlin resident, the Land share comes home through residence-based clearing.",
    stages: ["The event", "The named tax", "Who gets it, by law", "Recipient budgets"],
    unit: "share",
    unitNote: "Ribbon widths show the statutory split of one wage-tax euro (Article 106: 42.5 / 42.5 / 15).",
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
  },
  {
    id: "vat",
    chipTitle: "You buy something",
    chipNote: "VAT · Umsatzsteuer",
    lede: "VAT paid at a Berlin till does not stay in Berlin. It joins one national aggregate, is split by an annual formula, and returns to Berlin through a population-weighted, equalised pool.",
    stages: ["The event", "One national pot", "Annual vertical split", "Recipient budgets"],
    unit: "share",
    unitNote: "Ribbon widths show the official 2024 allocation of the national VAT aggregate (€302.1bn).",
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
  },
  {
    id: "trade",
    chipTitle: "A business pays trade tax",
    chipNote: "Gewerbesteuer",
    lede: "Trade tax is the classic municipal tax — and Berlin is special. Because it is a Land and a municipality at once, it keeps nearly all of it, remitting only the federal component of the statutory levy.",
    stages: ["The event", "The named tax", "Recipient budgets"],
    unit: "million_eur",
    unitNote: "Ribbon widths show observed 2024 Berlin amounts (trade tax gross €3.01bn).",
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
          "Because Berlin is both Land and municipality, the Land component of the trade-tax levy never leaves town — Berlin remits only the federal component and keeps roughly 96.5% of gross trade tax.",
        status: "calculated_official",
        sources: [gemFinRef7, berlinTaxAccount2024, lhoBerlin8],
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
        shareLabel: "≈96.5% retained",
        description:
          "Berlin keeps gross trade tax minus the levy. The statutory federal component is 14.5 / 410 = 3.5366% of gross — Berlin, being Land and municipality at once, remits only that federal part.",
        sources: [gemFinRef7, berlinTaxAccount2024],
        caveats: [pendingVerification],
      },
      {
        id: "trade-federation",
        from: "gewerbesteuer",
        to: "federal_budget",
        weight: 262.074,
        kind: "fixed_share",
        status: "provisional_official",
        shareLabel: "levy −€262m (2024)",
        description:
          "Berlin's 2024 account records a trade-tax levy of €262.1m. The pure statutory federal component would be ≈€106m (3.5366% of gross); the difference is unreconciled and flagged for the independent verification pass.",
        sources: [berlinTaxAccount2024, gemFinRef7],
        caveats: [
          "Observed levy (8.7% of gross) exceeds the statutory federal rate (3.5366%) — composition not yet reconciled.",
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
  },
  {
    id: "housing",
    chipTitle: "You own or rent a home",
    chipNote: "Grundsteuer · Grunderwerbsteuer",
    lede: "Housing carries two named taxes: property tax every year, and real-estate transfer tax when a home is bought. In Berlin, both stay entirely in the Berlin budget.",
    stages: ["The event", "The named taxes", "Recipient budget"],
    unit: "million_eur",
    unitNote: "Ribbon widths show observed 2024 Berlin amounts (property tax €0.87bn; real-estate transfer tax €0.91bn).",
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
  },
];

export function getRoute(id: string): Route | undefined {
  return routes.find((route) => route.id === id);
}

export const defaultRouteId = "wage";
