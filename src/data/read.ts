import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { BundleTextInput } from "./load.ts";

const BUNDLE_FILE_NAMES = {
  meta: "meta.json",
  revenue: "revenue.csv",
  expenditure: "expenditure.csv",
  sources: "sources.json",
  extractions: "extractions.json",
  provenance: "provenance.json",
} as const satisfies Record<keyof BundleTextInput, string>;

export async function readBundleText(directory: string): Promise<BundleTextInput> {
  const [meta, revenue, expenditure, sources, extractions, provenance] = await Promise.all([
    readFile(resolve(directory, BUNDLE_FILE_NAMES.meta), "utf8"),
    readFile(resolve(directory, BUNDLE_FILE_NAMES.revenue), "utf8"),
    readFile(resolve(directory, BUNDLE_FILE_NAMES.expenditure), "utf8"),
    readFile(resolve(directory, BUNDLE_FILE_NAMES.sources), "utf8"),
    readFile(resolve(directory, BUNDLE_FILE_NAMES.extractions), "utf8"),
    readFile(resolve(directory, BUNDLE_FILE_NAMES.provenance), "utf8"),
  ]);
  return { meta, revenue, expenditure, sources, extractions, provenance };
}

