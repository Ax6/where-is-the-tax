#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { loadDatasetBundle } from "../src/data/load.ts";
import { buildExplorerModel } from "../src/data/model.ts";
import { readBundleText } from "../src/data/read.ts";
import { validateDataRoot } from "../src/data/validator.ts";
import { renderStaticPage } from "../src/ui/static-page.ts";

const fixtureRoot = resolve("tests/fixtures/valid");
const bundleRoot = resolve(fixtureRoot, "de/2024");
const outputRoot = resolve(".generated");
const outputPath = resolve(outputRoot, "static-content.html");

const validation = await validateDataRoot(fixtureRoot, { allowSynthetic: true });
if (validation.errors.length > 0) {
  for (const error of validation.errors) {
    console.error(`[${error.code}] ${error.path}: ${error.message}`);
  }
  throw new Error("Refusing to generate the prototype from an invalid synthetic fixture.");
}

const bundle = loadDatasetBundle(await readBundleText(bundleRoot));
const html = renderStaticPage(buildExplorerModel(bundle));

await mkdir(outputRoot, { recursive: true });
await writeFile(outputPath, `${html.trim()}\n`);
console.log(`Generated build-time prototype HTML at ${outputPath}`);
