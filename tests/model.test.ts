import assert from "node:assert/strict";
import test from "node:test";

import { buildExplorerModel } from "../src/data/model.ts";
import { parseDatasetCsv } from "../src/data/load.ts";
import { formatMoney, formatShare } from "../src/format.ts";
import { loadSyntheticBundle } from "./fixture.ts";

test("builds ranked sides from the validated synthetic bundle", async () => {
  const model = buildExplorerModel(await loadSyntheticBundle());

  assert.equal(model.revenue.total, 1_000);
  assert.equal(model.expenditure.total, 1_030);
  assert.equal(model.revenue.nodes[0]?.id, "social_contributions");
  assert.equal(model.expenditure.nodes[0]?.id, "social_protection");
  assert.equal(model.revenue.nodes[0]?.shareOfSide, 0.35);
  assert.equal(model.expenditure.nodes.length, 10);
});

test("labels the signed balance as net borrowing without calling it debt", async () => {
  const model = buildExplorerModel(await loadSyntheticBundle());

  assert.equal(model.balance, -30);
  assert.equal(model.balanceLabel, "Net borrowing");
  assert.equal(formatMoney(model.balance, model.bundle.meta.amount_unit), "−€30m");
});

test("keeps unavailable top-level categories in a separate coverage collection", async () => {
  const bundle = await loadSyntheticBundle();
  const defence = bundle.expenditure.find(({ id }) => id === "defence");
  assert(defence);
  defence.amount = null;
  defence.availability = "not_available";
  defence.quality = null;
  defence.value_kind = null;

  const model = buildExplorerModel(bundle);
  assert(!model.expenditure.nodes.some(({ id }) => id === "defence"));
  assert.equal(model.expenditure.coverage[0]?.id, "defence");
});

test("formats large totals and shares without source-like excess precision", () => {
  assert.equal(formatMoney(1_030, "million EUR"), "€1.03bn");
  assert.equal(formatMoney(250, "million EUR"), "€250m");
  assert.equal(formatShare(250, 1_000), "25.0%");
});

test("runtime CSV parsing fails on an altered contract header", () => {
  assert.throws(
    () => parseDatasetCsv("id,name\nexample,Example\n"),
    /Dataset columns must exactly match/,
  );
});
