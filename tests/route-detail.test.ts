import assert from "node:assert/strict";
import test from "node:test";

import { getRoute } from "../src/routes/data.ts";
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
  assert.match(html, /composition not yet reconciled/);
  assert.match(html, /€262\.1m/);
});

test("detail rendering escapes HTML in data fields", () => {
  const route = getRoute("wage");
  assert(route);
  const node = { ...route.nodes[0]!, label: `<img src=x onerror="1">`, description: "<b>bold</b>" };

  const html = renderNodeDetail(route, node);
  assert.doesNotMatch(html, /<img/);
  assert.doesNotMatch(html, /<b>bold/);
});
