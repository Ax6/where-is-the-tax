import assert from "node:assert/strict";
import test from "node:test";

import { buildExplorerModel } from "../src/data/model.ts";
import { renderStaticPage, escapeHtml } from "../src/ui/static-page.ts";
import { loadSyntheticBundle } from "./fixture.ts";

test("renders the explanation, accounting warning, alternative view, and full table at build time", async () => {
  const html = renderStaticPage(buildExplorerModel(await loadSyntheticBundle()));

  assert.match(html, /Every figure on this page is invented test data/);
  assert.match(html, /No category-to-category links/);
  assert.match(html, /data-view-panel="pool"/);
  assert.match(html, /The public-finance pool/);
  assert.match(html, /<table>/);
  assert.match(html, /id="record-revenue-income_wealth_taxes"/);
  assert.match(html, /Example Statistical Office — Synthetic revenue table/);
  assert.match(html, /Not the change in debt/);
});

test("escapes text inserted into build-time HTML", () => {
  assert.equal(escapeHtml(`<script>alert("x")</script>`), "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
});

test("renders known unavailable categories as coverage, not numeric bars", async () => {
  const bundle = await loadSyntheticBundle();
  const defence = bundle.expenditure.find(({ id }) => id === "defence");
  assert(defence);
  defence.amount = null;
  defence.availability = "not_available";
  defence.quality = null;
  defence.value_kind = null;
  const provenanceIndex = bundle.provenance.findIndex(({ id }) => id === defence.provenance_id);
  assert.notEqual(provenanceIndex, -1);
  bundle.provenance[provenanceIndex] = {
    id: defence.provenance_id,
    kind: "unavailable",
    availability: "not_available",
    extraction_id: "x_fixture_expenditure",
    coordinates: { cofog: "GF02" },
    reason: "Synthetic observation withheld for coverage testing.",
    caveats: ["Coverage test."],
    review: { status: "verified", reviewer: "fixture-author", reviewed_at: "2026-01-01", notes: [] },
  };

  const html = renderStaticPage(buildExplorerModel(bundle));
  assert.match(html, /Coverage note/);
  assert.match(html, /Defence<\/a> — Not available/);
  assert.doesNotMatch(html, /<span class="rank-name">Defence<\/span>/);
});
