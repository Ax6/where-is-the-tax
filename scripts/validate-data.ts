#!/usr/bin/env node
import { resolve } from "node:path";

import { validateDataRoot } from "../src/data/validator.ts";

function argumentValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : (process.argv[index + 1] ?? null);
}

if (process.argv.includes("--help")) {
  console.log("Usage: node --experimental-strip-types scripts/validate-data.ts [--root data] [--evidence-root research/evidence] [--allow-synthetic]");
  process.exit(0);
}

const root = resolve(argumentValue("--root") ?? "data");
const result = await validateDataRoot(root, {
  allowSynthetic: process.argv.includes("--allow-synthetic"),
  evidenceRoot: resolve(argumentValue("--evidence-root") ?? "research/evidence"),
});

if (result.errors.length === 0) {
  console.log(`Validated ${result.datasetsChecked} dataset bundle(s) in ${root}`);
} else {
  for (const error of result.errors) {
    console.error(`[${error.code}] ${error.path}: ${error.message}`);
  }
  console.error(`Validation failed with ${result.errors.length} error(s).`);
  process.exitCode = 1;
}
