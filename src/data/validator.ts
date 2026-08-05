import { csvParse, type DSVRowArray } from "d3-dsv";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join, normalize, posix, resolve, sep } from "node:path";

import {
  AVAILABILITIES,
  CHILDREN_COVERAGES,
  COLLECTION_STATUSES,
  DATASET_COLUMNS,
  DATASET_PURPOSES,
  EXPENDITURE_TOP_LEVEL,
  MAPPING_KINDS,
  OBSERVATION_QUALITIES,
  PUBLICATION_STATUSES,
  REVENUE_TOP_LEVEL,
  REVIEW_STATUSES,
  ROUNDING_MODES,
  SCHEMA_VERSION,
  VALUE_KINDS,
  type ChildrenCoverage,
  type DatasetMeta,
  type DatasetRow,
  type ExtractionRecord,
  type MappingKind,
  type ObservationQuality,
  type ProvenanceRecord,
  type SourceRecord,
  type StatisticalContext,
  type ValueKind,
} from "./schema.ts";

type UnknownRecord = Record<string, unknown>;

export interface ValidationError {
  code: string;
  path: string;
  message: string;
}

export interface ValidationResult {
  errors: ValidationError[];
  datasetsChecked: number;
}

export interface ValidationOptions {
  allowSynthetic?: boolean;
  evidenceRoot?: string;
}

interface IndexEntry {
  country_code: string;
  reference_year: number;
  path: string;
  dataset_purpose: "publication" | "synthetic_test_fixture";
}

const AVAILABILITY = new Set<string>(AVAILABILITIES);
const QUALITY = new Set<string>(OBSERVATION_QUALITIES);
const VALUE_KIND = new Set<string>(VALUE_KINDS);
const MAPPING = new Set<string>(MAPPING_KINDS);
const COVERAGE = new Set<string>(CHILDREN_COVERAGES);
const REVIEW = new Set<string>(REVIEW_STATUSES);
const PURPOSE = new Set<string>(DATASET_PURPOSES);
const STATUS = new Set<string>(PUBLICATION_STATUSES);
const COLLECTION_STATUS = new Set<string>(COLLECTION_STATUSES);
const ROUNDING_MODE = new Set<string>(ROUNDING_MODES);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ID = /^[a-z][a-z0-9_]*$/;
const SHA256 = /^[a-f0-9]{64}$/i;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function sameSet(actual: Iterable<string>, expected: Iterable<string>): boolean {
  const left = [...actual].sort();
  const right = [...expected].sort();
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function sameContext(left: StatisticalContext, right: StatisticalContext): boolean {
  return (
    left.reference_period === right.reference_period &&
    left.sector === right.sector &&
    left.accounting_basis === right.accounting_basis &&
    left.unit === right.unit &&
    left.consolidation === right.consolidation &&
    left.vintage === right.vintage
  );
}

function add(errors: ValidationError[], code: string, path: string, message: string): void {
  errors.push({ code, path, message });
}

async function readJson(path: string, errors: ValidationError[]): Promise<unknown> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as unknown;
  } catch (error) {
    add(errors, "invalid_json", path, error instanceof Error ? error.message : "Cannot read JSON");
    return null;
  }
}

function parseIndex(value: unknown, path: string, errors: ValidationError[]): IndexEntry[] {
  if (!isRecord(value) || value.schema_version !== SCHEMA_VERSION || !Array.isArray(value.datasets)) {
    add(errors, "invalid_index", path, "Index requires the current schema_version and a datasets array");
    return [];
  }
  const entries: IndexEntry[] = [];
  for (const [index, candidate] of value.datasets.entries()) {
    const itemPath = `${path}#datasets[${index}]`;
    if (
      !isRecord(candidate) ||
      typeof candidate.country_code !== "string" ||
      !Number.isInteger(candidate.reference_year) ||
      typeof candidate.path !== "string" ||
      !PURPOSE.has(candidate.dataset_purpose as string)
    ) {
      add(errors, "invalid_index_entry", itemPath, "Dataset index entry is incomplete or invalid");
      continue;
    }
    const canonicalPath = `${candidate.country_code}/${candidate.reference_year as number}`;
    if (candidate.path !== canonicalPath || normalize(candidate.path).startsWith("..") || posix.isAbsolute(candidate.path)) {
      add(errors, "invalid_dataset_path", itemPath, `Dataset path must be ${canonicalPath}`);
      continue;
    }
    entries.push(candidate as unknown as IndexEntry);
  }
  if (new Set(entries.map(({ path: entryPath }) => entryPath)).size !== entries.length) {
    add(errors, "duplicate_dataset", path, "Index contains duplicate dataset paths");
  }
  return entries;
}

function parseMeta(value: unknown, path: string, errors: ValidationError[]): DatasetMeta | null {
  if (!isRecord(value)) {
    add(errors, "invalid_meta", path, "Metadata must be an object");
    return null;
  }
  const headline = value.headline;
  const stringFields = [
    "dataset_bundle_id",
    "country_code",
    "country_name",
    "consolidation",
    "currency",
    "amount_unit",
  ];
  if (
    value.schema_version !== SCHEMA_VERSION ||
    stringFields.some((field) => typeof value[field] !== "string" || value[field] === "") ||
    !PURPOSE.has(value.dataset_purpose as string) ||
    !Number.isInteger(value.reference_year) ||
    value.accounting_basis !== "ESA 2010 accrual" ||
    value.sector !== "S.13" ||
    value.consolidation !== "consolidated general government" ||
    typeof value.collection_date !== "string" ||
    !ISO_DATE.test(value.collection_date) ||
    !STATUS.has(value.publication_status as string) ||
    !isRecord(headline) ||
    typeof headline.revenue_provenance_id !== "string" ||
    typeof headline.expenditure_provenance_id !== "string" ||
    typeof headline.balance_provenance_id !== "string" ||
    !isStringArray(value.quality_notes) ||
    !isStringArray(value.known_omissions) ||
    typeof value.last_reviewed !== "string" ||
    !ISO_DATE.test(value.last_reviewed)
  ) {
    add(errors, "invalid_meta", path, "Metadata is missing a required field or contains an invalid enum/date");
    return null;
  }
  if (
    value.population !== null &&
    (!isRecord(value.population) ||
      typeof value.population.value !== "number" ||
      !Number.isFinite(value.population.value) ||
      !(value.population.value > 0) ||
      typeof value.population.reference_date !== "string" ||
      !ISO_DATE.test(value.population.reference_date) ||
      typeof value.population.definition !== "string" ||
      value.population.definition === "" ||
      typeof value.population.provenance_id !== "string")
  ) {
    add(errors, "invalid_meta", path, "population must be null or a complete provenanced denominator");
  }
  if (
    value.gdp !== null &&
    (!isRecord(value.gdp) ||
      typeof value.gdp.value !== "number" ||
      !Number.isFinite(value.gdp.value) ||
      typeof value.gdp.provenance_id !== "string")
  ) {
    add(errors, "invalid_meta", path, "gdp must be null or a complete provenanced denominator");
  }
  return value as unknown as DatasetMeta;
}

async function parseCsv(path: string, errors: ValidationError[]): Promise<DatasetRow[]> {
  let parsed: DSVRowArray<string>;
  try {
    parsed = csvParse<string>(await readFile(path, "utf8"));
  } catch (error) {
    add(errors, "invalid_csv", path, error instanceof Error ? error.message : "Cannot read CSV");
    return [];
  }
  if (!parsed.columns || !sameSet(parsed.columns, DATASET_COLUMNS) || parsed.columns.length !== DATASET_COLUMNS.length) {
    add(errors, "invalid_columns", path, `CSV columns must be exactly: ${DATASET_COLUMNS.join(",")}`);
  }

  const rows: DatasetRow[] = [];
  for (const [index, raw] of parsed.entries()) {
    const rowPath = `${path}#row=${index + 2}`;
    const amount = raw.amount === "" ? null : Number(raw.amount);
    const availability = raw.availability ?? "";
    const quality = raw.quality === "" ? null : raw.quality;
    const valueKind = raw.value_kind === "" ? null : raw.value_kind;
    const parentId = raw.parent_id === "" ? null : (raw.parent_id ?? null);
    const isResidual = raw.is_residual === "true" ? true : raw.is_residual === "false" ? false : null;
    if (
      !raw.id ||
      !ID.test(raw.id) ||
      (parentId !== null && !ID.test(parentId)) ||
      !raw.name ||
      !raw.description ||
      !raw.provenance_id ||
      !AVAILABILITY.has(availability) ||
      !MAPPING.has(raw.mapping ?? "") ||
      !COVERAGE.has(raw.children_coverage ?? "") ||
      isResidual === null
    ) {
      add(errors, "invalid_row", rowPath, "Row has an invalid ID, required text, enum, or boolean");
      continue;
    }
    if (availability === "available") {
      if (amount === null || !Number.isFinite(amount) || !QUALITY.has(quality ?? "") || !VALUE_KIND.has(valueKind ?? "")) {
        add(errors, "invalid_available_value", rowPath, "Available rows need a finite amount, quality, and value_kind");
        continue;
      }
    } else if (amount !== null || quality !== null || valueKind !== null) {
      add(errors, "invalid_unavailable_value", rowPath, "Unavailable rows require empty amount, quality, and value_kind");
      continue;
    }
    rows.push({
      id: raw.id,
      parent_id: parentId,
      name: raw.name,
      name_official: raw.name_official === "" ? null : (raw.name_official ?? null),
      amount,
      availability: availability as DatasetRow["availability"],
      description: raw.description,
      quality: quality as ObservationQuality | null,
      value_kind: valueKind as ValueKind | null,
      mapping: raw.mapping as MappingKind,
      children_coverage: raw.children_coverage as ChildrenCoverage,
      is_residual: isResidual,
      provenance_id: raw.provenance_id,
      notes: raw.notes === "" ? null : (raw.notes ?? null),
    });
  }
  return rows;
}

function parseSources(value: unknown, path: string, errors: ValidationError[]): SourceRecord[] {
  if (!Array.isArray(value)) {
    add(errors, "invalid_sources", path, "Sources must be an array");
    return [];
  }
  const sources: SourceRecord[] = [];
  for (const [index, candidate] of value.entries()) {
    const itemPath = `${path}#[${index}]`;
    const licence = isRecord(candidate) ? candidate.licence : null;
    if (
      !isRecord(candidate) ||
      typeof candidate.id !== "string" ||
      !ID.test(candidate.id) ||
      typeof candidate.institution !== "string" ||
      typeof candidate.title !== "string" ||
      typeof candidate.landing_page !== "string" ||
      !candidate.landing_page.startsWith("https://") ||
      !isRecord(licence) ||
      typeof licence.name !== "string" ||
      licence.name === "" ||
      typeof licence.url !== "string" ||
      !licence.url.startsWith("https://") ||
      typeof licence.attribution !== "string" ||
      licence.attribution === "" ||
      !isStringArray(candidate.notes)
    ) {
      add(errors, "invalid_source", itemPath, "Source identity, HTTPS links, licence, attribution, or notes are invalid");
      continue;
    }
    sources.push(candidate as unknown as SourceRecord);
  }
  if (new Set(sources.map(({ id }) => id)).size !== sources.length) {
    add(errors, "duplicate_source", path, "Source IDs must be unique");
  }
  return sources;
}

function validContext(value: unknown): value is StatisticalContext {
  return (
    isRecord(value) &&
    ["reference_period", "sector", "accounting_basis", "unit", "consolidation", "vintage"].every(
      (field) => typeof value[field] === "string" && value[field] !== "",
    )
  );
}

function parseExtractions(
  value: unknown,
  path: string,
  sourceIds: Set<string>,
  errors: ValidationError[],
): ExtractionRecord[] {
  if (!Array.isArray(value)) {
    add(errors, "invalid_extractions", path, "Extractions must be an array");
    return [];
  }
  const extractions: ExtractionRecord[] = [];
  for (const [index, candidate] of value.entries()) {
    const itemPath = `${path}#[${index}]`;
    const evidence = isRecord(candidate) ? candidate.evidence : undefined;
    const validEvidence = evidence === null || (() => {
      if (
        !isRecord(evidence) ||
        typeof evidence.sha256 !== "string" ||
        !SHA256.test(evidence.sha256) ||
        typeof evidence.redistributed !== "boolean"
      ) {
        return false;
      }
      return evidence.redistributed
        ? typeof evidence.path === "string" && evidence.path !== "" && evidence.non_redistribution_reason === null
        : evidence.path === null &&
            typeof evidence.non_redistribution_reason === "string" &&
            evidence.non_redistribution_reason !== "";
    })();
    if (
      !isRecord(candidate) ||
      typeof candidate.id !== "string" ||
      !ID.test(candidate.id) ||
      typeof candidate.source_id !== "string" ||
      !sourceIds.has(candidate.source_id) ||
      typeof candidate.dataset_id !== "string" ||
      !isRecord(candidate.query) ||
      !validContext(candidate.context) ||
      typeof candidate.release_date !== "string" ||
      !ISO_DATE.test(candidate.release_date) ||
      typeof candidate.retrieved_at !== "string" ||
      !Number.isFinite(Date.parse(candidate.retrieved_at)) ||
      !validEvidence ||
      !isStringArray(candidate.caveats) ||
      !COLLECTION_STATUS.has(candidate.collection_status as string)
    ) {
      add(errors, "invalid_extraction", itemPath, "Extraction is incomplete or references an unknown source");
      continue;
    }
    const queryValuesValid = Object.values(candidate.query).every(
      (queryValue) =>
        typeof queryValue === "string" ||
        (Array.isArray(queryValue) && queryValue.length > 0 && queryValue.every((item) => typeof item === "string")),
    );
    if (!queryValuesValid) {
      add(errors, "invalid_extraction", itemPath, "Query values must be strings or non-empty string arrays");
      continue;
    }
    extractions.push(candidate as unknown as ExtractionRecord);
  }
  if (new Set(extractions.map(({ id }) => id)).size !== extractions.length) {
    add(errors, "duplicate_extraction", path, "Extraction IDs must be unique");
  }
  return extractions;
}

function validReview(value: unknown): boolean {
  return (
    isRecord(value) &&
    REVIEW.has(value.status as string) &&
    (value.reviewer === null || typeof value.reviewer === "string") &&
    (value.reviewed_at === null || (typeof value.reviewed_at === "string" && ISO_DATE.test(value.reviewed_at))) &&
    isStringArray(value.notes)
  );
}

function parseProvenance(
  value: unknown,
  path: string,
  extractionIds: Set<string>,
  sourceIds: Set<string>,
  errors: ValidationError[],
): ProvenanceRecord[] {
  if (!Array.isArray(value)) {
    add(errors, "invalid_provenance", path, "Provenance must be an array");
    return [];
  }
  const records: ProvenanceRecord[] = [];
  for (const [index, candidate] of value.entries()) {
    const itemPath = `${path}#[${index}]`;
    if (!isRecord(candidate) || typeof candidate.id !== "string" || !ID.test(candidate.id) || !validReview(candidate.review)) {
      add(errors, "invalid_provenance", itemPath, "Provenance ID or review record is invalid");
      continue;
    }
    if (candidate.kind === "reported") {
      if (
        typeof candidate.extraction_id !== "string" ||
        !extractionIds.has(candidate.extraction_id) ||
        !isRecord(candidate.coordinates) ||
        Object.keys(candidate.coordinates).length === 0 ||
        !Object.values(candidate.coordinates).every((coordinate) => typeof coordinate === "string") ||
        typeof candidate.raw_value !== "number" ||
        !Number.isFinite(candidate.raw_value) ||
        typeof candidate.displayed_value !== "number" ||
        !Number.isFinite(candidate.displayed_value) ||
        !QUALITY.has(candidate.quality as string) ||
        !isStringArray(candidate.official_status_flags) ||
        !MAPPING.has(candidate.mapping as string) ||
        typeof candidate.rounding_increment !== "number" ||
        !Number.isFinite(candidate.rounding_increment) ||
        !(candidate.rounding_increment > 0) ||
        typeof candidate.sign_convention !== "string" ||
        candidate.sign_convention === "" ||
        !isStringArray(candidate.description_source_ids) ||
        !candidate.description_source_ids.every((sourceId) => sourceIds.has(sourceId)) ||
        !isStringArray(candidate.caveats)
      ) {
        add(errors, "invalid_reported_provenance", itemPath, "Reported provenance is incomplete or has unknown references");
        continue;
      }
    } else if (candidate.kind === "derived") {
      const formula = candidate.formula;
      const rounding = candidate.rounding_rule;
      if (
        !isRecord(formula) ||
        formula.operator !== "linear_combination" ||
        !Array.isArray(formula.terms) ||
        formula.terms.length === 0 ||
        !formula.terms.every(
          (term) =>
            isRecord(term) &&
            typeof term.provenance_id === "string" &&
            typeof term.coefficient === "number" &&
            Number.isFinite(term.coefficient) &&
            term.coefficient !== 0,
        ) ||
        typeof formula.constant !== "number" ||
        !Number.isFinite(formula.constant) ||
        typeof candidate.displayed_value !== "number" ||
        !Number.isFinite(candidate.displayed_value) ||
        !QUALITY.has(candidate.quality as string) ||
        !isRecord(rounding) ||
        !ROUNDING_MODE.has(rounding.mode as string) ||
        typeof rounding.increment !== "number" ||
        !(rounding.increment > 0) ||
        typeof candidate.sign_convention !== "string" ||
        !isStringArray(candidate.caveats)
      ) {
        add(errors, "invalid_derived_provenance", itemPath, "Derived provenance requires a structured linear formula");
        continue;
      }
      const termIds = formula.terms.map((term) => (term as UnknownRecord).provenance_id as string);
      if (new Set(termIds).size !== termIds.length) {
        add(errors, "invalid_derived_provenance", itemPath, "Derived formula contains duplicate input IDs");
        continue;
      }
    } else if (candidate.kind === "unavailable") {
      if (
        !["not_available", "not_applicable"].includes(candidate.availability as string) ||
        !(candidate.extraction_id === null ||
          (typeof candidate.extraction_id === "string" && extractionIds.has(candidate.extraction_id))) ||
        !isRecord(candidate.coordinates) ||
        !Object.values(candidate.coordinates).every((coordinate) => typeof coordinate === "string") ||
        typeof candidate.reason !== "string" ||
        candidate.reason === "" ||
        !isStringArray(candidate.caveats)
      ) {
        add(errors, "invalid_unavailable_provenance", itemPath, "Unavailable provenance is incomplete");
        continue;
      }
    } else {
      add(errors, "invalid_provenance_kind", itemPath, "Unknown provenance kind");
      continue;
    }
    records.push(candidate as unknown as ProvenanceRecord);
  }
  if (new Set(records.map(({ id }) => id)).size !== records.length) {
    add(errors, "duplicate_provenance", path, "Provenance IDs must be unique");
  }
  return records;
}

function validateHierarchy(rows: DatasetRow[], path: string, errors: ValidationError[]): Map<string, DatasetRow[]> {
  const byId = new Map(rows.map((row) => [row.id, row]));
  if (byId.size !== rows.length) {
    add(errors, "duplicate_row", path, "Row IDs must be unique within a side");
  }
  const children = new Map<string, DatasetRow[]>();
  for (const row of rows) {
    if (row.parent_id !== null && !byId.has(row.parent_id)) {
      add(errors, "orphan", `${path}#${row.id}`, `Unknown parent ${row.parent_id}`);
    }
    if (row.parent_id !== null) {
      const siblings = children.get(row.parent_id) ?? [];
      siblings.push(row);
      children.set(row.parent_id, siblings);
    }
  }
  for (const row of rows) {
    const seen = new Set<string>();
    let cursor: DatasetRow | undefined = row;
    let depth = 1;
    while (cursor?.parent_id) {
      if (seen.has(cursor.id)) {
        add(errors, "cycle", `${path}#${row.id}`, "Hierarchy contains a cycle");
        break;
      }
      seen.add(cursor.id);
      cursor = byId.get(cursor.parent_id);
      depth += 1;
      if (depth > 4) {
        add(errors, "max_depth", `${path}#${row.id}`, "Hierarchy depth exceeds four");
        break;
      }
    }
    const childCount = children.get(row.id)?.length ?? 0;
    if ((childCount === 0) !== (row.children_coverage === "none")) {
      add(errors, "coverage_shape", `${path}#${row.id}`, "children_coverage does not match the presence of children");
    }
    if (row.is_residual && (row.value_kind !== "derived" || childCount > 0)) {
      add(errors, "invalid_residual", `${path}#${row.id}`, "A residual must be an available derived leaf");
    }
  }
  return children;
}

function validateTopLevel(rows: DatasetRow[], side: "revenue" | "expenditure", path: string, errors: ValidationError[]): void {
  const actual = rows.filter(({ parent_id }) => parent_id === null).map(({ id }) => id);
  const expected = side === "revenue" ? Object.keys(REVENUE_TOP_LEVEL) : Object.keys(EXPENDITURE_TOP_LEVEL);
  if (!sameSet(actual, expected)) {
    add(errors, "top_level_ids", path, `${side} top-level IDs must match the fixed accounting vocabulary`);
  }
}

function validateBundle(
  bundlePath: string,
  indexEntry: IndexEntry,
  meta: DatasetMeta,
  revenue: DatasetRow[],
  expenditure: DatasetRow[],
  sources: SourceRecord[],
  extractions: ExtractionRecord[],
  provenance: ProvenanceRecord[],
  options: ValidationOptions,
  errors: ValidationError[],
): void {
  if (
    meta.country_code !== indexEntry.country_code ||
    meta.reference_year !== indexEntry.reference_year ||
    meta.dataset_purpose !== indexEntry.dataset_purpose
  ) {
    add(errors, "index_meta_mismatch", bundlePath, "Index identity and metadata do not agree");
  }
  if (meta.dataset_purpose === "synthetic_test_fixture" && !options.allowSynthetic) {
    add(errors, "synthetic_not_allowed", bundlePath, "Synthetic fixtures cannot pass publication validation");
  }
  if (meta.dataset_purpose === "publication") {
    for (const extraction of extractions) {
      if (extraction.evidence === null) {
        add(errors, "missing_publication_evidence", `${bundlePath}/extractions.json#${extraction.id}`, "Publication extraction requires a checksum and stored path or non-redistribution reason");
      }
      if (extraction.collection_status !== "checked") {
        add(errors, "unchecked_extraction", `${bundlePath}/extractions.json#${extraction.id}`, "Publication extraction must be checked");
      }
    }
    for (const record of provenance) {
      if (
        record.review.status !== "verified" ||
        !record.review.reviewer ||
        !record.review.reviewed_at
      ) {
        add(errors, "unverified_provenance", `${bundlePath}/provenance.json#${record.id}`, "Publication provenance requires a named completed verification");
      }
    }
  }
  const revenueChildren = validateHierarchy(revenue, `${bundlePath}/revenue.csv`, errors);
  const expenditureChildren = validateHierarchy(expenditure, `${bundlePath}/expenditure.csv`, errors);
  validateTopLevel(revenue, "revenue", `${bundlePath}/revenue.csv`, errors);
  validateTopLevel(expenditure, "expenditure", `${bundlePath}/expenditure.csv`, errors);

  const extractionById = new Map(extractions.map((record) => [record.id, record]));
  const provenanceById = new Map(provenance.map((record) => [record.id, record]));
  const contextCache = new Map<string, StatisticalContext | null>();
  const valueCache = new Map<string, number | null>();

  const contextFor = (id: string, trail = new Set<string>()): StatisticalContext | null => {
    if (contextCache.has(id)) return contextCache.get(id) ?? null;
    if (trail.has(id)) {
      add(errors, "provenance_cycle", `${bundlePath}/provenance.json#${id}`, "Derived provenance contains a cycle");
      return null;
    }
    const record = provenanceById.get(id);
    if (!record) return null;
    let context: StatisticalContext | null = null;
    if (record.kind === "reported") {
      context = extractionById.get(record.extraction_id)?.context ?? null;
    } else if (record.kind === "unavailable") {
      context = record.extraction_id ? (extractionById.get(record.extraction_id)?.context ?? null) : null;
    } else {
      const nextTrail = new Set(trail).add(id);
      const contexts = record.formula.terms
        .map((term) => contextFor(term.provenance_id, nextTrail))
        .filter((candidate): candidate is StatisticalContext => candidate !== null);
      if (contexts.length === record.formula.terms.length && contexts.every((candidate) => sameContext(candidate, contexts[0] as StatisticalContext))) {
        context = contexts[0] ?? null;
      } else {
        add(errors, "derived_context_mismatch", `${bundlePath}/provenance.json#${id}`, "Derived inputs do not share one statistical context");
      }
    }
    contextCache.set(id, context);
    return context;
  };

  const incrementFor = (id: string): number => {
    const record = provenanceById.get(id);
    if (!record || record.kind === "unavailable") return 0;
    return record.kind === "reported" ? record.rounding_increment : record.rounding_rule.increment;
  };

  const valueFor = (id: string, trail = new Set<string>()): number | null => {
    if (valueCache.has(id)) return valueCache.get(id) ?? null;
    if (trail.has(id)) {
      add(errors, "provenance_cycle", `${bundlePath}/provenance.json#${id}`, "Derived provenance contains a cycle");
      return null;
    }
    const record = provenanceById.get(id);
    if (!record || record.kind === "unavailable") return null;
    if (record.kind === "reported") {
      valueCache.set(id, record.displayed_value);
      return record.displayed_value;
    }
    const nextTrail = new Set(trail).add(id);
    let calculated = record.formula.constant;
    let bound = record.rounding_rule.mode === "nearest" ? record.rounding_rule.increment / 2 : 0;
    for (const term of record.formula.terms) {
      const input = valueFor(term.provenance_id, nextTrail);
      if (input === null) {
        add(errors, "unknown_formula_input", `${bundlePath}/provenance.json#${id}`, `Unknown or unavailable input ${term.provenance_id}`);
        return null;
      }
      calculated += input * term.coefficient;
      bound += (Math.abs(term.coefficient) * incrementFor(term.provenance_id)) / 2;
    }
    if (Math.abs(calculated - record.displayed_value) > bound + Number.EPSILON) {
      add(errors, "derived_mismatch", `${bundlePath}/provenance.json#${id}`, `Stored ${record.displayed_value} does not reproduce ${calculated}`);
    }
    valueCache.set(id, record.displayed_value);
    return record.displayed_value;
  };

  for (const record of provenance) {
    if (record.kind === "reported") {
      const extraction = extractionById.get(record.extraction_id);
      if (extraction) {
        for (const [dimension, selection] of Object.entries(extraction.query)) {
          if (Array.isArray(selection) && selection.length > 1 && !(dimension in record.coordinates)) {
            add(errors, "incomplete_observation_coordinates", `${bundlePath}/provenance.json#${record.id}`, `Coordinates must select ${dimension} within extraction ${extraction.id}`);
          }
        }
        for (const [dimension, coordinate] of Object.entries(record.coordinates)) {
          const selected = extraction.query[dimension];
          const allowed = typeof selected === "string" ? selected === coordinate : selected?.includes(coordinate) === true;
          if (!allowed) {
            add(errors, "coordinate_outside_query", `${bundlePath}/provenance.json#${record.id}`, `${dimension}=${coordinate} is not selected by extraction ${extraction.id}`);
          }
        }
      }
      if (Math.abs(record.raw_value - record.displayed_value) > record.rounding_increment / 2 + Number.EPSILON) {
        add(errors, "reported_value_mismatch", `${bundlePath}/provenance.json#${record.id}`, "Displayed reported value is not a valid rounding of the raw observation");
      }
    }
    contextFor(record.id);
    valueFor(record.id);
  }

  const reportedCoordinates = new Set<string>();
  for (const record of provenance) {
    if (record.kind !== "reported") continue;
    const coordinateKey = `${record.extraction_id}:${JSON.stringify(Object.entries(record.coordinates).sort())}`;
    if (reportedCoordinates.has(coordinateKey)) {
      add(errors, "duplicate_observation_coordinates", `${bundlePath}/provenance.json#${record.id}`, "Two provenance records select the same observation from one extraction");
    }
    reportedCoordinates.add(coordinateKey);
  }

  const allRows = [...revenue, ...expenditure];
  for (const row of allRows) {
    const record = provenanceById.get(row.provenance_id);
    const rowPath = `${bundlePath}#${row.id}`;
    if (!record) {
      add(errors, "unknown_provenance", rowPath, `Unknown provenance ${row.provenance_id}`);
      continue;
    }
    if (row.availability === "available") {
      if (record.kind === "unavailable" || row.value_kind !== record.kind) {
        add(errors, "provenance_kind_mismatch", rowPath, "Row value_kind does not match provenance kind");
        continue;
      }
      const provenanceValue = valueFor(record.id);
      const bound = incrementFor(record.id) / 2;
      if (row.amount === null || provenanceValue === null || Math.abs(row.amount - provenanceValue) > bound + Number.EPSILON) {
        add(errors, "row_value_mismatch", rowPath, "Row amount does not match provenance displayed value");
      }
      if (record.kind === "reported" && row.mapping !== record.mapping) {
        add(errors, "mapping_mismatch", rowPath, "Row mapping does not match reported provenance");
      }
      if (row.quality !== record.quality) {
        add(errors, "quality_mismatch", rowPath, "Row quality does not match provenance quality");
      }
      const context = contextFor(record.id);
      if (
        !context ||
        context.reference_period !== String(meta.reference_year) ||
        context.sector !== meta.sector ||
        context.accounting_basis !== meta.accounting_basis ||
        context.unit !== meta.amount_unit ||
        context.consolidation !== meta.consolidation
      ) {
        add(errors, "dataset_context_mismatch", rowPath, "Observation context does not match bundle metadata");
      }
    } else if (record.kind !== "unavailable" || record.availability !== row.availability) {
      add(errors, "provenance_kind_mismatch", rowPath, "Unavailable row requires matching unavailable provenance");
    }
  }

  const validateChildren = (
    rows: DatasetRow[],
    childrenByParent: Map<string, DatasetRow[]>,
    sidePath: string,
  ): void => {
    for (const parent of rows) {
      const children = childrenByParent.get(parent.id) ?? [];
      if (children.length === 0 || parent.amount === null) continue;
      const availableChildren = children.filter((row) => row.amount !== null);
      if (parent.children_coverage === "exhaustive" && availableChildren.length !== children.length) {
        add(errors, "exhaustive_unavailable_child", `${sidePath}#${parent.id}`, "Exhaustive breakdown contains an unavailable child");
      }
      const parentContext = contextFor(parent.provenance_id);
      for (const child of availableChildren) {
        const childContext = contextFor(child.provenance_id);
        if (!parentContext || !childContext || !sameContext(parentContext, childContext)) {
          add(errors, "hierarchy_context_mismatch", `${sidePath}#${child.id}`, "Child is not statistically compatible with its parent");
        }
      }
      const childSum = availableChildren.reduce((sum, child) => sum + (child.amount ?? 0), 0);
      const bound = incrementFor(parent.provenance_id) / 2 + availableChildren.reduce((sum, child) => sum + incrementFor(child.provenance_id) / 2, 0);
      if (parent.children_coverage === "exhaustive" && Math.abs(childSum - parent.amount) > bound + Number.EPSILON) {
        add(errors, "exhaustive_reconciliation", `${sidePath}#${parent.id}`, "Exhaustive children do not reconcile within source rounding");
      }
      if (parent.children_coverage === "partial" && childSum > parent.amount + bound) {
        add(errors, "partial_overflow", `${sidePath}#${parent.id}`, "Partial children exceed their parent");
      }
      if (parent.children_coverage === "partial" && children.some(({ is_residual }) => is_residual) && Math.abs(childSum - parent.amount) > bound + Number.EPSILON) {
        add(errors, "invalid_residual", `${sidePath}#${parent.id}`, "A declared residual does not reconcile the partial breakdown");
      }
    }
  };
  validateChildren(revenue, revenueChildren, `${bundlePath}/revenue.csv`);
  validateChildren(expenditure, expenditureChildren, `${bundlePath}/expenditure.csv`);

  const headlineRevenue = provenanceById.get(meta.headline.revenue_provenance_id);
  const headlineExpenditure = provenanceById.get(meta.headline.expenditure_provenance_id);
  const balance = provenanceById.get(meta.headline.balance_provenance_id);
  if (headlineRevenue?.kind !== "reported" || headlineExpenditure?.kind !== "reported") {
    add(errors, "invalid_headline", `${bundlePath}/meta.json`, "Headline revenue and expenditure must be reported observations");
  }
  if (balance?.kind !== "derived") {
    add(errors, "invalid_balance", `${bundlePath}/meta.json`, "Balance must be a derived observation");
  } else {
    const coefficients = new Map(balance.formula.terms.map((term) => [term.provenance_id, term.coefficient]));
    if (
      balance.formula.constant !== 0 ||
      coefficients.size !== 2 ||
      coefficients.get(meta.headline.revenue_provenance_id) !== 1 ||
      coefficients.get(meta.headline.expenditure_provenance_id) !== -1
    ) {
      add(errors, "invalid_balance", `${bundlePath}/provenance.json#${balance.id}`, "Balance must equal headline revenue minus expenditure");
    }
  }

  const reconcileHeadline = (rows: DatasetRow[], headlineId: string, label: string): void => {
    const top = rows.filter(({ parent_id }) => parent_id === null);
    if (top.some(({ amount }) => amount === null)) {
      add(errors, "headline_incomplete", bundlePath, `${label} has an unavailable top-level category`);
      return;
    }
    const headlineValue = valueFor(headlineId);
    if (headlineValue === null) return;
    const headlineContext = contextFor(headlineId);
    for (const row of top) {
      const rowContext = contextFor(row.provenance_id);
      if (!headlineContext || !rowContext || !sameContext(headlineContext, rowContext)) {
        add(errors, "headline_context_mismatch", `${bundlePath}#${row.id}`, `${label} row does not share the headline observation vintage and context`);
      }
    }
    const total = top.reduce((sum, row) => sum + (row.amount ?? 0), 0);
    const bound = incrementFor(headlineId) / 2 + top.reduce((sum, row) => sum + incrementFor(row.provenance_id) / 2, 0);
    if (Math.abs(total - headlineValue) > bound + Number.EPSILON) {
      add(errors, "headline_reconciliation", bundlePath, `${label} top-level rows do not reconcile to the headline observation`);
    }
  };
  reconcileHeadline(revenue, meta.headline.revenue_provenance_id, "Revenue");
  reconcileHeadline(expenditure, meta.headline.expenditure_provenance_id, "Expenditure");

  const validateDenominator = (denominator: DatasetMeta["population"] | DatasetMeta["gdp"], label: string): void => {
    if (!denominator) return;
    const value = valueFor(denominator.provenance_id);
    if (value === null || Math.abs(value - denominator.value) > incrementFor(denominator.provenance_id) / 2 + Number.EPSILON) {
      add(errors, "denominator_provenance", `${bundlePath}/meta.json`, `${label} does not match its provenance`);
    }
  };
  validateDenominator(meta.population, "Population");
  validateDenominator(meta.gdp, "GDP");

  const displayedQualities = allRows.filter(({ availability }) => availability === "available").map(({ quality }) => quality);
  for (const headlineId of Object.values(meta.headline)) {
    const headlineRecord = provenanceById.get(headlineId);
    if (headlineRecord?.kind !== "unavailable") displayedQualities.push(headlineRecord?.quality ?? null);
  }
  const qualities = new Set(displayedQualities);
  const expectedStatus = qualities.size === 1 ? [...qualities][0] : "mixed";
  if (meta.publication_status !== expectedStatus) {
    add(errors, "status_rollup", `${bundlePath}/meta.json`, `Bundle status must roll up to ${expectedStatus}`);
  }
  if (sources.length === 0 || extractions.length === 0 || provenance.length === 0) {
    add(errors, "empty_audit_trail", bundlePath, "Bundle needs sources, extractions, and provenance");
  }
}

async function verifyStoredEvidence(
  extractions: ExtractionRecord[],
  bundlePath: string,
  options: ValidationOptions,
  errors: ValidationError[],
): Promise<void> {
  const stored = extractions.filter(
    (extraction) => extraction.evidence?.redistributed === true,
  );
  if (stored.length === 0) return;
  if (!options.evidenceRoot) {
    for (const extraction of stored) {
      add(errors, "evidence_root_required", `${bundlePath}/extractions.json#${extraction.id}`, "Stored evidence cannot be verified without an evidence root");
    }
    return;
  }
  const evidenceRoot = resolve(options.evidenceRoot);
  await Promise.all(
    stored.map(async (extraction) => {
      const evidence = extraction.evidence;
      if (!evidence?.path) return;
      const artifactPath = resolve(evidenceRoot, evidence.path);
      if (artifactPath === evidenceRoot || !artifactPath.startsWith(`${evidenceRoot}${sep}`)) {
        add(errors, "invalid_evidence_path", `${bundlePath}/extractions.json#${extraction.id}`, "Evidence path escapes the configured evidence root");
        return;
      }
      try {
        const digest = createHash("sha256").update(await readFile(artifactPath)).digest("hex");
        if (digest !== evidence.sha256.toLowerCase()) {
          add(errors, "evidence_checksum_mismatch", artifactPath, `Evidence checksum does not match extraction ${extraction.id}`);
        }
      } catch (error) {
        add(errors, "unreadable_evidence", artifactPath, error instanceof Error ? error.message : "Cannot read stored evidence");
      }
    }),
  );
}

async function discoverBundlePaths(root: string): Promise<Set<string>> {
  const discovered = new Set<string>();
  for (const country of await readdir(root, { withFileTypes: true })) {
    if (!country.isDirectory() || country.name.startsWith(".")) continue;
    for (const year of await readdir(join(root, country.name), { withFileTypes: true })) {
      if (year.isDirectory() && /^\d{4}$/.test(year.name)) discovered.add(`${country.name}/${year.name}`);
    }
  }
  return discovered;
}

export async function validateDataRoot(rootInput: string, options: ValidationOptions = {}): Promise<ValidationResult> {
  const root = resolve(rootInput);
  const errors: ValidationError[] = [];
  const indexPath = join(root, "index.json");
  const entries = parseIndex(await readJson(indexPath, errors), indexPath, errors);
  let discovered = new Set<string>();
  try {
    discovered = await discoverBundlePaths(root);
  } catch (error) {
    add(errors, "unreadable_data_root", root, error instanceof Error ? error.message : "Cannot inspect data root");
  }
  const indexed = new Set(entries.map(({ path }) => path));
  for (const entryPath of indexed) if (!discovered.has(entryPath)) add(errors, "missing_dataset_directory", root, `${entryPath} is indexed but absent`);
  for (const directory of discovered) if (!indexed.has(directory)) add(errors, "unindexed_dataset", root, `${directory} exists but is not indexed`);

  for (const entry of entries) {
    const bundlePath = join(root, entry.path);
    const metaPath = join(bundlePath, "meta.json");
    const revenuePath = join(bundlePath, "revenue.csv");
    const expenditurePath = join(bundlePath, "expenditure.csv");
    const sourcesPath = join(bundlePath, "sources.json");
    const extractionsPath = join(bundlePath, "extractions.json");
    const provenancePath = join(bundlePath, "provenance.json");
    const [metaValue, revenue, expenditure, sourcesValue, extractionsValue, provenanceValue] = await Promise.all([
      readJson(metaPath, errors),
      parseCsv(revenuePath, errors),
      parseCsv(expenditurePath, errors),
      readJson(sourcesPath, errors),
      readJson(extractionsPath, errors),
      readJson(provenancePath, errors),
    ]);
    const meta = parseMeta(metaValue, metaPath, errors);
    const sources = parseSources(sourcesValue, sourcesPath, errors);
    const extractions = parseExtractions(extractionsValue, extractionsPath, new Set(sources.map(({ id }) => id)), errors);
    const provenance = parseProvenance(
      provenanceValue,
      provenancePath,
      new Set(extractions.map(({ id }) => id)),
      new Set(sources.map(({ id }) => id)),
      errors,
    );
    if (meta) {
      await verifyStoredEvidence(extractions, bundlePath, options, errors);
      validateBundle(bundlePath, entry, meta, revenue, expenditure, sources, extractions, provenance, options, errors);
    }
  }
  return { errors, datasetsChecked: entries.length };
}
