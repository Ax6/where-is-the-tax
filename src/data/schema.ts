export const SCHEMA_VERSION = 1 as const;

export const PUBLICATION_STATUSES = ["final", "provisional", "estimate", "forecast", "mixed"] as const;
export const OBSERVATION_QUALITIES = ["final", "provisional", "estimate", "forecast"] as const;
export const AVAILABILITIES = ["available", "not_available", "not_applicable"] as const;
export const VALUE_KINDS = ["reported", "derived"] as const;
export const MAPPING_KINDS = ["direct", "mapped"] as const;
export const CHILDREN_COVERAGES = ["none", "partial", "exhaustive"] as const;
export const REVIEW_STATUSES = ["pending", "verified", "rejected"] as const;
export const DATASET_PURPOSES = ["publication", "synthetic_test_fixture"] as const;
export const COLLECTION_STATUSES = ["collected", "checked"] as const;
export const ROUNDING_MODES = ["none", "nearest"] as const;

export const REVENUE_TOP_LEVEL = {
  production_import_taxes: { name: "Taxes on products and production", esa: "D.2" },
  income_wealth_taxes: { name: "Taxes on income and wealth", esa: "D.5" },
  social_contributions: { name: "Net social contributions", esa: "D.61" },
  capital_taxes: { name: "Capital taxes", esa: "D.91" },
  other_revenue: { name: "Other general-government revenue", esa: "residual" },
} as const;

export const EXPENDITURE_TOP_LEVEL = {
  general_public_services: { name: "General public services", cofog: "GF01" },
  defence: { name: "Defence", cofog: "GF02" },
  public_order_safety: { name: "Public order and safety", cofog: "GF03" },
  economic_affairs: { name: "Economic affairs", cofog: "GF04" },
  environment_protection: { name: "Environmental protection", cofog: "GF05" },
  housing_community: { name: "Housing and community amenities", cofog: "GF06" },
  health: { name: "Health", cofog: "GF07" },
  recreation_culture_religion: { name: "Recreation, culture and religion", cofog: "GF08" },
  education: { name: "Education", cofog: "GF09" },
  social_protection: { name: "Social protection", cofog: "GF10" },
} as const;

export type RevenueTopLevelId = keyof typeof REVENUE_TOP_LEVEL;
export type ExpenditureTopLevelId = keyof typeof EXPENDITURE_TOP_LEVEL;
export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number];
export type ObservationQuality = (typeof OBSERVATION_QUALITIES)[number];
export type Availability = (typeof AVAILABILITIES)[number];
export type ValueKind = (typeof VALUE_KINDS)[number];
export type MappingKind = (typeof MAPPING_KINDS)[number];
export type ChildrenCoverage = (typeof CHILDREN_COVERAGES)[number];
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];
export type DatasetPurpose = (typeof DATASET_PURPOSES)[number];
export type CollectionStatus = (typeof COLLECTION_STATUSES)[number];
export type RoundingMode = (typeof ROUNDING_MODES)[number];

export const DATASET_COLUMNS = [
  "id",
  "parent_id",
  "name",
  "name_official",
  "amount",
  "availability",
  "description",
  "quality",
  "value_kind",
  "mapping",
  "children_coverage",
  "is_residual",
  "provenance_id",
  "notes",
] as const;

export interface DatasetRow {
  id: string;
  parent_id: string | null;
  name: string;
  name_official: string | null;
  amount: number | null;
  availability: Availability;
  description: string;
  quality: ObservationQuality | null;
  value_kind: ValueKind | null;
  mapping: MappingKind;
  children_coverage: ChildrenCoverage;
  is_residual: boolean;
  provenance_id: string;
  notes: string | null;
}

export interface SourceRecord {
  id: string;
  institution: string;
  title: string;
  landing_page: string;
  licence: {
    name: string;
    url: string;
    attribution: string;
  };
  notes: string[];
}

export interface StatisticalContext {
  reference_period: string;
  sector: string;
  accounting_basis: string;
  unit: string;
  consolidation: string;
  vintage: string;
}

export interface ExtractionRecord {
  id: string;
  source_id: string;
  dataset_id: string;
  query: Record<string, string | string[]>;
  context: StatisticalContext;
  release_date: string;
  retrieved_at: string;
  evidence: null | {
    path: string | null;
    sha256: string;
    redistributed: boolean;
    non_redistribution_reason: string | null;
  };
  caveats: string[];
  collection_status: CollectionStatus;
}

export interface ReviewRecord {
  status: ReviewStatus;
  reviewer: string | null;
  reviewed_at: string | null;
  notes: string[];
}

export interface ReportedProvenance {
  id: string;
  kind: "reported";
  extraction_id: string;
  coordinates: Record<string, string>;
  raw_value: number;
  displayed_value: number;
  quality: ObservationQuality;
  official_status_flags: string[];
  mapping: MappingKind;
  rounding_increment: number;
  sign_convention: string;
  description_source_ids: string[];
  caveats: string[];
  review: ReviewRecord;
}

export interface LinearFormula {
  operator: "linear_combination";
  terms: Array<{
    provenance_id: string;
    coefficient: number;
  }>;
  constant: number;
}

export interface DerivedProvenance {
  id: string;
  kind: "derived";
  formula: LinearFormula;
  displayed_value: number;
  quality: ObservationQuality;
  rounding_rule: {
    mode: RoundingMode;
    increment: number;
  };
  sign_convention: string;
  caveats: string[];
  review: ReviewRecord;
}

export interface UnavailableProvenance {
  id: string;
  kind: "unavailable";
  availability: Exclude<Availability, "available">;
  extraction_id: string | null;
  coordinates: Record<string, string>;
  reason: string;
  caveats: string[];
  review: ReviewRecord;
}

export type ProvenanceRecord = ReportedProvenance | DerivedProvenance | UnavailableProvenance;

export interface DatasetMeta {
  schema_version: typeof SCHEMA_VERSION;
  dataset_bundle_id: string;
  dataset_purpose: DatasetPurpose;
  country_code: string;
  country_name: string;
  reference_year: number;
  accounting_basis: "ESA 2010 accrual";
  sector: "S.13";
  consolidation: "consolidated general government";
  currency: string;
  amount_unit: string;
  collection_date: string;
  publication_status: PublicationStatus;
  headline: {
    revenue_provenance_id: string;
    expenditure_provenance_id: string;
    balance_provenance_id: string;
  };
  population: null | {
    value: number;
    reference_date: string;
    definition: string;
    provenance_id: string;
  };
  gdp: null | {
    value: number;
    provenance_id: string;
  };
  quality_notes: string[];
  known_omissions: string[];
  expected_revision_window: string | null;
  last_reviewed: string;
}
