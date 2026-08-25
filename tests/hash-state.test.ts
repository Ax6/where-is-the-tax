import assert from "node:assert/strict";
import test from "node:test";

import { parseRouteHash, routeHash, routeHashTransition } from "../src/routes/hash.ts";

test("route hashes round-trip route and place", () => {
  assert.equal(routeHash("housing", "BE"), "#route/housing/BE");
  assert.deepEqual(parseRouteHash("#route/housing/BE"), { routeId: "housing", placeCode: "BE" });
});

test("page-section anchors are not interpreted as route state", () => {
  assert.equal(parseRouteHash("#all-taxes"), null);
  assert.equal(parseRouteHash("#sources"), null);
  assert.equal(parseRouteHash(""), null);
});

test("route hashes accept a missing place for backward compatibility", () => {
  assert.deepEqual(parseRouteHash("#route/vat"), { routeId: "vat", placeCode: "DE" });
  assert.equal(parseRouteHash("#route/vat/not-a-code"), null);
});

test("a combined place and route change resolves to one place transition", () => {
  const current = { routeId: "vat", placeCode: "DE" };
  assert.equal(routeHashTransition({ routeId: "housing", placeCode: "BE" }, current), "place");
  assert.equal(routeHashTransition({ routeId: "housing", placeCode: "DE" }, current), "route");
  assert.equal(routeHashTransition(current, current), null);
});
