import { csvParse } from "d3-dsv";

import {
  AVAILABILITIES,
  CHILDREN_COVERAGES,
  DATASET_COLUMNS,
  MAPPING_KINDS,
  OBSERVATION_QUALITIES,
  VALUE_KINDS,
  type DatasetMeta,
  type DatasetRow,
  type ExtractionRecord,
  type ProvenanceRecord,
  type SourceRecord,
} from "./schema.ts";

export interface BundleTextInput {
  meta: string;
  revenue: string;
  expenditure: string;
  sources: string;
  extractions: string;
  provenance: string;
}

export interface DatasetBundle {
  meta: DatasetMeta;
  revenue: DatasetRow[];
  expenditure: DatasetRow[];
  sources: SourceRecord[];
  extractions: ExtractionRecord[];
  provenance: ProvenanceRecord[];
}

function required(value: string | undefined, field: string, rowIndex: number): string {
  if (value === undefined || value === "") {
    throw new Error(`Row ${rowIndex + 2} is missing required field ${field}.`);
  }
  return value;
}

function enumValue<const T extends readonly string[]>(
  value: string | undefined,
  values: T,
  field: string,
  rowIndex: number,
): T[number] {
  const parsed = required(value, field, rowIndex);
  if (!values.includes(parsed)) {
    throw new Error(`Row ${rowIndex + 2} has invalid ${field}: ${parsed}.`);
  }
  return parsed as T[number];
}

function optionalEnumValue<const T extends readonly string[]>(
  value: string | undefined,
  values: T,
  field: string,
  rowIndex: number,
): T[number] | null {
  if (value === undefined || value === "") {
    return null;
  }
  return enumValue(value, values, field, rowIndex);
}

export function parseDatasetCsv(text: string): DatasetRow[] {
  const parsed = csvParse(text);
  const columns = parsed.columns;
  if (columns.length !== DATASET_COLUMNS.length || columns.some((column, index) => column !== DATASET_COLUMNS[index])) {
    throw new Error(`Dataset columns must exactly match: ${DATASET_COLUMNS.join(", ")}.`);
  }

  return parsed.map((row, rowIndex) => {
    const amountText = row.amount ?? "";
    const amount = amountText === "" ? null : Number(amountText);
    if (amount !== null && !Number.isFinite(amount)) {
      throw new Error(`Row ${rowIndex + 2} has a non-finite amount.`);
    }

    const isResidual = required(row.is_residual, "is_residual", rowIndex);
    if (isResidual !== "true" && isResidual !== "false") {
      throw new Error(`Row ${rowIndex + 2} has invalid is_residual: ${isResidual}.`);
    }

    return {
      id: required(row.id, "id", rowIndex),
      parent_id: row.parent_id === "" || row.parent_id === undefined ? null : row.parent_id,
      name: required(row.name, "name", rowIndex),
      name_official: row.name_official === "" || row.name_official === undefined ? null : row.name_official,
      amount,
      availability: enumValue(row.availability, AVAILABILITIES, "availability", rowIndex),
      description: required(row.description, "description", rowIndex),
      quality: optionalEnumValue(row.quality, OBSERVATION_QUALITIES, "quality", rowIndex),
      value_kind: optionalEnumValue(row.value_kind, VALUE_KINDS, "value_kind", rowIndex),
      mapping: enumValue(row.mapping, MAPPING_KINDS, "mapping", rowIndex),
      children_coverage: enumValue(row.children_coverage, CHILDREN_COVERAGES, "children_coverage", rowIndex),
      is_residual: isResidual === "true",
      provenance_id: required(row.provenance_id, "provenance_id", rowIndex),
      notes: row.notes === "" || row.notes === undefined ? null : row.notes,
    };
  });
}

function parseJson<T>(text: string, filename: string): T {
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`${filename} is not valid JSON: ${detail}`);
  }
}

export function loadDatasetBundle(input: BundleTextInput): DatasetBundle {
  return {
    meta: parseJson<DatasetMeta>(input.meta, "meta.json"),
    revenue: parseDatasetCsv(input.revenue),
    expenditure: parseDatasetCsv(input.expenditure),
    sources: parseJson<SourceRecord[]>(input.sources, "sources.json"),
    extractions: parseJson<ExtractionRecord[]>(input.extractions, "extractions.json"),
    provenance: parseJson<ProvenanceRecord[]>(input.provenance, "provenance.json"),
  };
}

