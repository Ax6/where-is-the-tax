#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { flattenJsonStat } from "../src/data/jsonstat.ts";

function argumentValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : (process.argv[index + 1] ?? null);
}

if (process.argv.includes("--help")) {
  console.log(
    "Usage: node --experimental-strip-types scripts/import-eurostat.ts --input saved-response.json --output normalized.json",
  );
  console.log("This offline helper normalizes saved JSON-stat evidence; it does not fetch or map publication data.");
  process.exit(0);
}

const inputArgument = argumentValue("--input");
const outputArgument = argumentValue("--output");
if (!inputArgument || !outputArgument) {
  console.error("Both --input and --output are required. Use --help for details.");
  process.exit(2);
}

const input = resolve(inputArgument);
const output = resolve(outputArgument);
const payload = JSON.parse(await readFile(input, "utf8")) as unknown;
const normalized = {
  importer: "where-is-the-tax/jsonstat-v1",
  notice: "Normalized observations only. Mapping, provenance, status interpretation, and review remain required.",
  observations: flattenJsonStat(payload),
};

await writeFile(output, `${JSON.stringify(normalized, null, 2)}\n`, { flag: "wx" });
console.log(`Wrote ${normalized.observations.length} observations to ${output}`);
