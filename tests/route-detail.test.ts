import assert from "node:assert/strict";
import test from "node:test";

import { buildRoutes, getRoute } from "../src/routes/data.ts";
import { getPlace } from "../src/routes/places.ts";
import { renderEdgeDetail, renderNodeDetail } from "../src/ui/route-detail.ts";

test("node detail shows the official name, evidence status, and source links", () => {
  const route = getRoute("wage");
  assert(route);
  const node = route.nodes.find(({ id }) => id === "berlin_budget");
  assert(node);

  const html = renderNodeDetail(route, node);
  assert.match(html, /Berlin budget/);
  assert.match(html, /Land \+ municipality/);
  assert.match(html, /Official calculation/);
  assert.match(html, /href="https:\/\/www\.berlin\.de/);
});

test("edge detail shows share, mechanism, and open caveats", () => {
  const route = getRoute("trade");
  assert(route);
  const edge = route.edges.find(({ id }) => id === "trade-federation");
  assert(edge);
  const from = route.nodes.find(({ id }) => id === edge.from);
  const to = route.nodes.find(({ id }) => id === edge.to);
  assert(from && to);

  const html = renderEdgeDetail(route, edge, from, to);
  assert.match(html, /Trade tax → Federal budget/);
  assert.match(html, /Fixed statutory share/);
  assert.match(html, /14\.5 \/ 410 = 3\.5366%/);
  assert.match(html, /quarterly payments and prior-year settlement/);
});

test("the wage route re-parameterises for a non-city-state Land", () => {
  const nw = getPlace("NW");
  assert(nw);
  const route = buildRoutes(nw).find(({ id }) => id === "wage");
  assert(route);
  assert(route.nodes.some((node) => node.label === "Nordrhein-Westfalen budget"));
  assert(route.nodes.some((node) => node.id === "municipal_budget"));
  assert.equal(route.entityLabels.berlin, "Nordrhein-Westfalen");
});

test("the VAT route uses verified per-Land equalisation figures", () => {
  const by = getPlace("BY");
  assert(by);
  const route = buildRoutes(by).find(({ id }) => id === "vat");
  assert(route);
  const slice = route.edges.find(({ id }) => id === "laender-place");
  assert(slice);
  assert.match(slice.shareLabel, /equalisation deduction/);
  const expected = (23457.004 - 9773.933) / 302143.338;
  assert(Math.abs(slice.weight - expected) < 1e-9);
});

test("detail rendering escapes HTML in data fields", () => {
  const route = getRoute("wage");
  assert(route);
  const node = { ...route.nodes[0]!, label: `<img src=x onerror="1">`, description: "<b>bold</b>" };

  const html = renderNodeDetail(route, node);
  assert.doesNotMatch(html, /<img/);
  assert.doesNotMatch(html, /<b>bold/);
});
