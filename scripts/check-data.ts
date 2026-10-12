#!/usr/bin/env node
/**
 * Data check for the v2 data envelope (replaces the v1 ESA-bundle validator).
 *
 * - data/manifest.json lists every dataset; each non-legacy dataset exists and carries the envelope
 *   (schema_version 2, id, title.de/en, unit, basis, generated_by pointing at an existing build script).
 * - Every file the front end reads (src/data/sources.ts) is in the manifest and is not legacy.
 * - Nothing in src/ reads the legacy trees (data/de/2021, data/de/2024, data/index.json).
 * - Rows with a `label` carry both languages (null labels are counted as warnings: known source gaps).
 *
 * Cross-file reconciliation of the numbers is scripts/research/check.py (run by `npm run check:data`).
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { files } from "../src/data/sources.ts";

export interface CheckResult {
  failures: string[];
  warnings: string[];
  passes: string[];
}

interface ManifestEntry {
  path: string;
  id: string;
  title?: { de?: string; en?: string };
  status?: string;
  superseded_by?: string | null;
  generated_by?: string;
}

const LEGACY = /^legacy/;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function labelGaps(value: unknown, path: string, out: string[], limit = 5): number {
  let count = 0;
  const visit = (node: unknown, where: string) => {
    if (Array.isArray(node)) {
      node.forEach((child, index) => visit(child, `${where}[${index}]`));
      return;
    }
    if (node && typeof node === "object") {
      for (const [key, child] of Object.entries(node)) {
        if (key === "label") {
          const ok = child === null || (typeof child === "object" && child !== null && typeof (child as Record<string, unknown>).de === "string" && typeof (child as Record<string, unknown>).en === "string");
          const isString = typeof child === "string";
          if (child === null || (!ok && !isString)) {
            count += 1;
            if (out.length < limit) {
              out.push(`${path}: ${where}.label is ${child === null ? "null" : "not {de,en}"}`);
            }
          }
          continue;
        }
        visit(child, `${where}.${key}`);
      }
    }
  };
  visit(value, "$");
  return count;
}

export function checkData(root = resolve(fileURLToPath(new URL("..", import.meta.url)))): CheckResult {
  const result: CheckResult = { failures: [], warnings: [], passes: [] };
  const fail = (message: string) => result.failures.push(message);
  const pass = (message: string) => result.passes.push(message);
  const warn = (message: string) => result.warnings.push(message);

  const manifestPath = join(root, "data/manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { schema_version: number; datasets: ManifestEntry[] };
  if (manifest.schema_version !== 2 || !Array.isArray(manifest.datasets)) {
    fail("data/manifest.json: schema_version 2 with a datasets array expected");
    return result;
  }
  pass(`manifest: ${manifest.datasets.length} datasets`);

  const byPath = new Map(manifest.datasets.map((entry) => [entry.path, entry]));
  for (const entry of manifest.datasets) {
    const abs = join(root, entry.path);
    if (LEGACY.test(entry.status ?? "")) {
      if (existsSync(abs)) {
        warn(`${entry.path}: legacy file still present (superseded by ${entry.superseded_by ?? "?"})`);
      } else {
        warn(`${entry.path}: legacy entry in manifest, file removed (re-run scripts/research/build_docs.py to drop it)`);
      }
      continue;
    }
    if (!existsSync(abs)) {
      fail(`${entry.path}: listed in manifest but missing`);
      continue;
    }
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(readFileSync(abs, "utf8")) as Record<string, unknown>;
    } catch (error) {
      fail(`${entry.path}: invalid JSON (${String(error)})`);
      continue;
    }
    const title = data.title as { de?: unknown; en?: unknown } | undefined;
    const problems = [
      data.schema_version !== 2 ? "schema_version ≠ 2" : "",
      data.id !== entry.id ? `id ${String(data.id)} ≠ manifest ${entry.id}` : "",
      typeof title?.de !== "string" || typeof title?.en !== "string" ? "title.de/en missing" : "",
      data.unit === undefined ? "unit missing" : "",
      typeof data.basis !== "string" || !data.basis ? "basis missing" : "",
      typeof data.generated_by !== "string" ? "generated_by missing" : !existsSync(join(root, data.generated_by)) ? `generated_by ${data.generated_by} not found` : "",
    ].filter(Boolean);
    if (problems.length) {
      fail(`${entry.path}: ${problems.join("; ")}`);
    } else {
      pass(`${entry.path}: envelope ok`);
    }
    const gaps: string[] = [];
    const count = labelGaps(data, entry.path, gaps);
    if (count) {
      warn(`${entry.path}: ${count} row label(s) without both languages, e.g. ${gaps[0]}`);
    }
  }

  // files the front end reads
  for (const [key, path] of Object.entries(files)) {
    if (path.startsWith("data/geo/")) {
      if (!existsSync(join(root, path))) {
        fail(`${path} (${key}): read by the front end but missing`);
      }
      continue;
    }
    const entry = byPath.get(path);
    if (!entry) {
      fail(`${path} (${key}): read by the front end but not in data/manifest.json`);
    } else if (LEGACY.test(entry.status ?? "")) {
      fail(`${path} (${key}): the front end reads a legacy dataset`);
    } else {
      pass(`front end reads ${path}`);
    }
  }

  // no legacy imports in src/
  const legacyPattern = /data\/de\/20(21|24)\/|data\/index\.json/;
  for (const file of walk(join(root, "src"))) {
    if (legacyPattern.test(readFileSync(file, "utf8"))) {
      fail(`${relative(root, file)}: references a legacy data path`);
    }
  }
  pass("src/ does not reference legacy data paths");
  return result;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const result = checkData();
  for (const line of result.passes) {
    console.log(`ok    ${line}`);
  }
  for (const line of result.warnings) {
    console.log(`note  ${line}`);
  }
  for (const line of result.failures) {
    console.log(`FAIL  ${line}`);
  }
  console.log(`\n${result.failures.length} failures, ${result.warnings.length} notes`);
  process.exit(result.failures.length ? 1 : 0);
}
