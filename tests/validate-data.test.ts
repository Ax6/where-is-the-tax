import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import { validateDataRoot } from "../src/data/validator.ts";

const fixtureRoot = resolve("tests/fixtures/valid");

async function mutableFixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "where-is-the-tax-"));
  await cp(fixtureRoot, root, { recursive: true });
  return root;
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function publicationFixture(): Promise<string> {
  const root = await mutableFixture();
  const indexPath = join(root, "index.json");
  const index = JSON.parse(await readFile(indexPath, "utf8")) as { datasets: Array<Record<string, unknown>> };
  index.datasets[0]!.dataset_purpose = "publication";
  await writeJson(indexPath, index);

  const metaPath = join(root, "de/2024/meta.json");
  const meta = JSON.parse(await readFile(metaPath, "utf8")) as Record<string, unknown>;
  meta.dataset_purpose = "publication";
  await writeJson(metaPath, meta);

  const extractionsPath = join(root, "de/2024/extractions.json");
  const extractions = JSON.parse(await readFile(extractionsPath, "utf8")) as Array<Record<string, unknown>>;
  extractions.forEach((extraction, indexPosition) => {
    extraction.evidence = {
      path: null,
      sha256: String(indexPosition).padStart(64, "a"),
      redistributed: false,
      non_redistribution_reason: "Publication-mode test fixture does not store external bytes.",
    };
  });
  await writeJson(extractionsPath, extractions);
  const manifestPath = join(root, "evidence/de/2024/manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Record<string, unknown>;
  manifest.entries = extractions.map((extraction) => ({ extraction_id: extraction.id, evidence: extraction.evidence }));
  await writeJson(manifestPath, manifest);
  return root;
}

test("accepts the complete synthetic contract fixture when explicitly allowed", async () => {
  const result = await validateDataRoot(fixtureRoot, { allowSynthetic: true });
  assert.deepEqual(result.errors, []);
  assert.equal(result.datasetsChecked, 1);
});

test("blocks synthetic data from publication validation by default", async () => {
  const result = await validateDataRoot(fixtureRoot);
  assert(result.errors.some((error) => error.code === "synthetic_not_allowed"));
});

test("accepts a publication-shaped bundle with evidence and completed reviews", async () => {
  const root = await publicationFixture();
  const result = await validateDataRoot(root);
  assert.deepEqual(result.errors, []);
});

test("rejects a row whose provenance record is missing", async () => {
  const root = await mutableFixture();
  const path = join(root, "de/2024/provenance.json");
  const records = JSON.parse(await readFile(path, "utf8")) as Array<{ id: string }>;
  await writeJson(path, records.filter(({ id }) => id !== "p_rev_d2"));

  const result = await validateDataRoot(root, { allowSynthetic: true });
  assert(result.errors.some((error) => error.code === "unknown_provenance"));
});

test("rejects a derived value that cannot be reproduced", async () => {
  const root = await mutableFixture();
  const path = join(root, "de/2024/provenance.json");
  const records = JSON.parse(await readFile(path, "utf8")) as Array<Record<string, unknown>>;
  const other = records.find(({ id }) => id === "p_rev_other");
  assert(other);
  other.displayed_value = 190;
  await writeJson(path, records);

  const result = await validateDataRoot(root, { allowSynthetic: true });
  assert(result.errors.some((error) => error.code === "derived_mismatch"));
});

test("rejects an incomplete fixed top-level vocabulary", async () => {
  const root = await mutableFixture();
  const path = join(root, "de/2024/expenditure.csv");
  const lines = (await readFile(path, "utf8")).trimEnd().split("\n");
  await writeFile(path, `${lines.filter((line) => !line.startsWith("defence,")).join("\n")}\n`);

  const result = await validateDataRoot(root, { allowSynthetic: true });
  assert(result.errors.some((error) => error.code === "top_level_ids"));
});

test("rejects publication provenance that has not completed independent review", async () => {
  const root = await publicationFixture();
  const path = join(root, "de/2024/provenance.json");
  const records = JSON.parse(await readFile(path, "utf8")) as Array<Record<string, unknown>>;
  const reported = records.find(({ id }) => id === "p_rev_d2");
  assert(reported);
  reported.review = { status: "pending", reviewer: null, reviewed_at: null, notes: [] };
  await writeJson(path, records);

  const result = await validateDataRoot(root);
  assert(result.errors.some((error) => error.code === "unverified_provenance"));
});

test("rejects publication extraction without auditable evidence", async () => {
  const root = await publicationFixture();
  const path = join(root, "de/2024/extractions.json");
  const extractions = JSON.parse(await readFile(path, "utf8")) as Array<Record<string, unknown>>;
  extractions[0]!.evidence = null;
  await writeJson(path, extractions);

  const result = await validateDataRoot(root);
  assert(result.errors.some((error) => error.code === "missing_publication_evidence"));
});

test("rejects stored evidence whose bytes do not match its checksum", async () => {
  const root = await publicationFixture();
  const evidenceRoot = join(root, "evidence");
  await mkdir(join(evidenceRoot, "de/2024"), { recursive: true });
  await writeFile(join(evidenceRoot, "de/2024/stored.json"), "synthetic evidence\n");

  const path = join(root, "de/2024/extractions.json");
  const extractions = JSON.parse(await readFile(path, "utf8")) as Array<Record<string, unknown>>;
  extractions[0]!.evidence = {
    path: "stored.json",
    sha256: "a".repeat(64),
    redistributed: true,
    non_redistribution_reason: null,
  };
  await writeJson(path, extractions);

  const manifestPath = join(evidenceRoot, "de/2024/manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Record<string, unknown>;
  const entries = manifest.entries as Array<Record<string, unknown>>;
  entries.find(({ extraction_id }) => extraction_id === extractions[0]!.id)!.evidence = extractions[0]!.evidence;
  await writeJson(manifestPath, manifest);

  const result = await validateDataRoot(root, { evidenceRoot });
  assert(result.errors.some((error) => error.code === "evidence_checksum_mismatch"));
});

test("rejects a missing formal evidence-manifest entry", async () => {
  const root = await mutableFixture();
  const path = join(root, "evidence/de/2024/manifest.json");
  const manifest = JSON.parse(await readFile(path, "utf8")) as { entries: unknown[] };
  manifest.entries.pop();
  await writeJson(path, manifest);

  const result = await validateDataRoot(root, { allowSynthetic: true });
  assert(result.errors.some((error) => error.code === "missing_evidence_manifest_entry"));
});

test("rejects an evidence manifest that diverges from its extraction", async () => {
  const root = await mutableFixture();
  const path = join(root, "evidence/de/2024/manifest.json");
  const manifest = JSON.parse(await readFile(path, "utf8")) as { entries: Array<{ evidence: unknown }> };
  manifest.entries[0]!.evidence = {
    path: null,
    sha256: "b".repeat(64),
    redistributed: false,
    non_redistribution_reason: "Synthetic mismatch for validator test.",
  };
  await writeJson(path, manifest);

  const result = await validateDataRoot(root, { allowSynthetic: true });
  assert(result.errors.some((error) => error.code === "evidence_manifest_mismatch"));
});

test("rejects observations whose shared context disagrees with bundle metadata", async () => {
  const root = await mutableFixture();
  const path = join(root, "de/2024/extractions.json");
  const extractions = JSON.parse(await readFile(path, "utf8")) as Array<{ context: Record<string, unknown> }>;
  extractions.forEach(({ context }) => {
    context.sector = "S.12";
  });
  await writeJson(path, extractions);

  const result = await validateDataRoot(root, { allowSynthetic: true });
  assert(result.errors.some((error) => error.code === "dataset_context_mismatch"));
});

test("rejects top-level observations from a different vintage than their headline", async () => {
  const root = await mutableFixture();
  const extractionsPath = join(root, "de/2024/extractions.json");
  const extractions = JSON.parse(await readFile(extractionsPath, "utf8")) as Array<Record<string, unknown>>;
  const alternate = structuredClone(extractions[0]!);
  alternate.id = "x_fixture_revenue_alternate";
  (alternate.context as Record<string, unknown>).vintage = "synthetic-v2";
  extractions.push(alternate);
  await writeJson(extractionsPath, extractions);

  const provenancePath = join(root, "de/2024/provenance.json");
  const records = JSON.parse(await readFile(provenancePath, "utf8")) as Array<Record<string, unknown>>;
  const reported = records.find(({ id }) => id === "p_rev_d2");
  assert(reported);
  reported.extraction_id = "x_fixture_revenue_alternate";
  await writeJson(provenancePath, records);

  const result = await validateDataRoot(root, { allowSynthetic: true });
  assert(result.errors.some((error) => error.code === "headline_context_mismatch"));
});

test("rejects an exhaustive breakdown containing an unavailable child", async () => {
  const root = await mutableFixture();
  const csvPath = join(root, "de/2024/revenue.csv");
  const lines = (await readFile(csvPath, "utf8")).trimEnd().split("\n");
  const parentColumns = lines[1]!.split(",");
  parentColumns[10] = "exhaustive";
  lines[1] = parentColumns.join(",");
  lines.push(
    "synthetic_missing_child,production_import_taxes,Synthetic unavailable child,,,not_available,Synthetic unavailable child for tests.,,,direct,none,false,p_rev_child_missing,Synthetic fixture only.",
  );
  await writeFile(csvPath, `${lines.join("\n")}\n`);

  const provenancePath = join(root, "de/2024/provenance.json");
  const records = JSON.parse(await readFile(provenancePath, "utf8")) as Array<Record<string, unknown>>;
  records.push({
    id: "p_rev_child_missing",
    kind: "unavailable",
    availability: "not_available",
    extraction_id: "x_fixture_revenue",
    coordinates: { na_item: "D2_DETAIL" },
    reason: "Synthetic missing observation.",
    caveats: ["Synthetic fixture."],
    review: { status: "verified", reviewer: "fixture-author", reviewed_at: "2026-01-01", notes: [] },
  });
  await writeJson(provenancePath, records);

  const result = await validateDataRoot(root, { allowSynthetic: true });
  assert(result.errors.some((error) => error.code === "exhaustive_unavailable_child"));
});

test("rejects observation coordinates outside the recorded extraction query", async () => {
  const root = await mutableFixture();
  const path = join(root, "de/2024/provenance.json");
  const records = JSON.parse(await readFile(path, "utf8")) as Array<Record<string, unknown>>;
  const reported = records.find(({ id }) => id === "p_rev_d2");
  assert(reported);
  reported.coordinates = { na_item: "D999" };
  await writeJson(path, records);

  const result = await validateDataRoot(root, { allowSynthetic: true });
  assert(result.errors.some((error) => error.code === "coordinate_outside_query"));
});

test("rejects coordinates that omit a varying extraction dimension", async () => {
  const root = await mutableFixture();
  const path = join(root, "de/2024/provenance.json");
  const records = JSON.parse(await readFile(path, "utf8")) as Array<Record<string, unknown>>;
  const reported = records.find(({ id }) => id === "p_rev_d2");
  assert(reported);
  reported.coordinates = { geo: "DE" };
  await writeJson(path, records);

  const result = await validateDataRoot(root, { allowSynthetic: true });
  assert(result.errors.some((error) => error.code === "incomplete_observation_coordinates"));
});

test("rejects a displayed reported value that is not source rounding", async () => {
  const root = await mutableFixture();
  const path = join(root, "de/2024/provenance.json");
  const records = JSON.parse(await readFile(path, "utf8")) as Array<Record<string, unknown>>;
  const reported = records.find(({ id }) => id === "p_rev_d2");
  assert(reported);
  reported.raw_value = 240;
  await writeJson(path, records);

  const result = await validateDataRoot(root, { allowSynthetic: true });
  assert(result.errors.some((error) => error.code === "reported_value_mismatch"));
});

test("rejects a row that relabels normalized source quality", async () => {
  const root = await mutableFixture();
  const path = join(root, "de/2024/provenance.json");
  const records = JSON.parse(await readFile(path, "utf8")) as Array<Record<string, unknown>>;
  const reported = records.find(({ id }) => id === "p_rev_d2");
  assert(reported);
  reported.quality = "provisional";
  await writeJson(path, records);

  const result = await validateDataRoot(root, { allowSynthetic: true });
  assert(result.errors.some((error) => error.code === "quality_mismatch"));
});

test("rejects a derived row that relabels its reviewed quality", async () => {
  const root = await mutableFixture();
  const path = join(root, "de/2024/provenance.json");
  const records = JSON.parse(await readFile(path, "utf8")) as Array<Record<string, unknown>>;
  const derived = records.find(({ id }) => id === "p_rev_other");
  assert(derived);
  derived.quality = "provisional";
  await writeJson(path, records);

  const result = await validateDataRoot(root, { allowSynthetic: true });
  assert(result.errors.some((error) => error.code === "quality_mismatch"));
});
