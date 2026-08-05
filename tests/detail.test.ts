import assert from "node:assert/strict";
import test from "node:test";

import { renderDetail } from "../src/ui/detail.ts";
import { loadSyntheticBundle } from "./fixture.ts";

test("renders exact source coordinates for a reported category", async () => {
  const html = renderDetail(await loadSyntheticBundle(), {
    side: "revenue",
    rowId: "income_wealth_taxes",
  });

  assert.match(html, /Taxes on income and wealth/);
  assert.match(html, /Example Statistical Office/);
  assert.match(html, /fixture_main/);
  assert.match(html, /na_item=D5/);
  assert.match(html, /million EUR/);
  assert.match(html, /None recorded/);
  assert.match(html, /Direct/);
  assert.match(html, /Positive is revenue received/);
  assert.match(html, /Synthetic fixture/);
});

test("renders the input trail for a derived headline", async () => {
  const bundle = await loadSyntheticBundle();
  const html = renderDetail(bundle, { provenanceId: bundle.meta.headline.balance_provenance_id });

  assert.match(html, /Net lending \/ net borrowing/);
  assert.match(html, /p_total_revenue/);
  assert.match(html, /p_total_expenditure/);
  assert.match(html, /linear combination/);
});

test("shows a nonzero constant in a derived calculation", async () => {
  const bundle = await loadSyntheticBundle();
  const balance = bundle.provenance.find(({ id }) => id === bundle.meta.headline.balance_provenance_id);
  assert(balance?.kind === "derived");
  balance.formula.constant = 7;

  const html = renderDetail(bundle, { provenanceId: balance.id });
  assert.match(html, /<code>constant<\/code> €7m/);
  assert.match(html, /<dt>Constant<\/dt><dd>€7m<\/dd>/);
});

test("escapes provenance values exactly once", async () => {
  const bundle = await loadSyntheticBundle();
  const extraction = bundle.extractions[0];
  assert(extraction);
  extraction.dataset_id = `<unsafe & value>`;

  const html = renderDetail(bundle, { side: "revenue", rowId: "income_wealth_taxes" });
  assert.match(html, /&lt;unsafe &amp; value&gt;/);
  assert.doesNotMatch(html, /&amp;lt;unsafe/);
});
