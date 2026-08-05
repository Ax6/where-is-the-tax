export interface JsonStatObservation {
  index: number;
  coordinates: Record<string, string>;
  value: number | null;
  status: string | null;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function categoryCodes(index: unknown, expected: number, dimensionId: string): string[] {
  if (Array.isArray(index)) {
    if (index.length !== expected || index.some((value) => typeof value !== "string")) {
      throw new Error(`Dimension ${dimensionId} declares ${expected} categories but its index does not match`);
    }
    return [...index] as string[];
  }

  if (!isRecord(index)) {
    throw new Error(`Dimension ${dimensionId} has no usable category index`);
  }

  const codes = new Array<string | undefined>(expected);
  for (const [code, position] of Object.entries(index)) {
    if (!Number.isInteger(position) || (position as number) < 0 || (position as number) >= expected) {
      throw new Error(`Dimension ${dimensionId} has an invalid category position for ${code}`);
    }
    if (codes[position as number] !== undefined) {
      throw new Error(`Dimension ${dimensionId} has duplicate category position ${position as number}`);
    }
    codes[position as number] = code;
  }

  if (codes.some((code) => code === undefined)) {
    throw new Error(`Dimension ${dimensionId} declares ${expected} categories but its index does not match`);
  }
  return codes as string[];
}

function indexedValue(container: unknown, index: number): unknown {
  if (Array.isArray(container)) {
    return container[index];
  }
  return isRecord(container) ? container[String(index)] : undefined;
}

/** Convert a JSON-stat dataset into explicit observation coordinates, retaining missing values. */
export function flattenJsonStat(payload: unknown): JsonStatObservation[] {
  if (!isRecord(payload) || !Array.isArray(payload.id) || !Array.isArray(payload.size)) {
    throw new Error("Expected a JSON-stat dataset with id and size arrays");
  }
  if (payload.class !== "dataset") {
    throw new Error("Expected JSON-stat class=dataset");
  }
  if (payload.id.length !== payload.size.length || payload.id.length === 0) {
    throw new Error("JSON-stat id and size arrays must have the same non-zero length");
  }
  if (payload.id.some((id) => typeof id !== "string")) {
    throw new Error("JSON-stat dimension IDs must be strings");
  }
  if (payload.size.some((size) => !Number.isInteger(size) || (size as number) <= 0)) {
    throw new Error("JSON-stat dimension sizes must be positive integers");
  }
  if (!isRecord(payload.dimension)) {
    throw new Error("JSON-stat dataset has no dimension definitions");
  }
  if (!Array.isArray(payload.value) && !isRecord(payload.value)) {
    throw new Error("JSON-stat dataset has no value array or sparse value object");
  }
  if (payload.status !== undefined && !Array.isArray(payload.status) && !isRecord(payload.status)) {
    throw new Error("JSON-stat status must be an array or sparse object when present");
  }

  const ids = payload.id as string[];
  const sizes = payload.size as number[];
  const dimensionDefinitions = payload.dimension;
  const codesByDimension = ids.map((id, position) => {
    const dimension = dimensionDefinitions[id];
    if (!isRecord(dimension) || !isRecord(dimension.category)) {
      throw new Error(`Dimension ${id} has no category definition`);
    }
    return categoryCodes(dimension.category.index, sizes[position] as number, id);
  });
  const observationCount = sizes.reduce((product, size) => product * size, 1);

  return Array.from({ length: observationCount }, (_, linearIndex) => {
    let remainder = linearIndex;
    const coordinates: Record<string, string> = {};
    for (let dimensionIndex = ids.length - 1; dimensionIndex >= 0; dimensionIndex -= 1) {
      const size = sizes[dimensionIndex] as number;
      const categoryPosition = remainder % size;
      remainder = Math.floor(remainder / size);
      coordinates[ids[dimensionIndex] as string] = codesByDimension[dimensionIndex]?.[categoryPosition] as string;
    }

    const rawValue = indexedValue(payload.value, linearIndex);
    if (rawValue !== undefined && rawValue !== null && (typeof rawValue !== "number" || !Number.isFinite(rawValue))) {
      throw new Error(`Observation ${linearIndex} is not numeric or missing`);
    }
    const rawStatus = indexedValue(payload.status, linearIndex);
    if (rawStatus !== undefined && rawStatus !== null && typeof rawStatus !== "string") {
      throw new Error(`Observation ${linearIndex} has a non-string status`);
    }

    return {
      index: linearIndex,
      coordinates,
      value: rawValue === undefined || rawValue === null ? null : rawValue,
      status: rawStatus === undefined || rawStatus === null ? null : rawStatus,
    };
  });
}
