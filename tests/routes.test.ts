import assert from "node:assert/strict";
import test from "node:test";

import { buildRoutes, defaultRouteId, getRoute, routes } from "../src/routes/data.ts";
import { getPlace, places } from "../src/routes/places.ts";

const checkedPlaces = [getPlace("BE")!, getPlace("BY")!, getPlace("HH")!, getPlace("NW")!];
const allRouteSets = checkedPlaces.flatMap((place) => buildRoutes(place));

test("the default route exists and every route is well-formed for every checked place", () => {
  assert(getRoute(defaultRouteId));
  assert(routes.length >= 3);
  assert.equal(places.length, 16);

  for (const route of allRouteSets) {
    const ids = route.nodes.map((node) => node.id);
    assert.equal(new Set(ids).size, ids.length, `${route.id}: node ids must be unique`);

    const maxStage = Math.max(...route.nodes.map((node) => node.stage));
    assert.equal(maxStage, route.stages.length - 1, `${route.id}: stages and node columns must agree`);

    const byId = new Map(route.nodes.map((node) => [node.id, node]));
    for (const edge of route.edges) {
      const from = byId.get(edge.from);
      const to = byId.get(edge.to);
      assert(from, `${route.id}/${edge.id}: missing source node`);
      assert(to, `${route.id}/${edge.id}: missing target node`);
      assert(from.stage < to.stage, `${route.id}/${edge.id}: flows must move to a later stage`);
      assert(edge.weight > 0, `${route.id}/${edge.id}: weights must be positive`);
    }
  }
});

test("flow is conserved through every pass-through node", () => {
  for (const route of allRouteSets) {
    for (const node of route.nodes) {
      const inbound = route.edges.filter((edge) => edge.to === node.id).reduce((sum, edge) => sum + edge.weight, 0);
      const outbound = route.edges.filter((edge) => edge.from === node.id).reduce((sum, edge) => sum + edge.weight, 0);
      if (inbound > 0 && outbound > 0) {
        const drift = Math.abs(inbound - outbound) / Math.max(inbound, outbound);
        assert(drift < 1e-3, `${route.id}/${node.id}: inbound ${inbound} vs outbound ${outbound}`);
      }
    }
  }
});

test("every node and flow carries a plain-English description and an https source", () => {
  for (const route of allRouteSets) {
    for (const item of [...route.nodes, ...route.edges]) {
      assert(item.description.trim().length > 0, `${route.id}/${item.id}: description required`);
      assert(item.sources.length > 0, `${route.id}/${item.id}: at least one source required`);
      for (const source of item.sources) {
        assert(source.url.startsWith("https://"), `${route.id}/${item.id}: source URLs must be https`);
      }
    }
  }
});

test("recipient nodes terminate routes — nothing flows past the budget boundary", () => {
  for (const route of allRouteSets) {
    for (const node of route.nodes.filter((candidate) => candidate.role === "recipient")) {
      const outbound = route.edges.filter((edge) => edge.from === node.id);
      assert.equal(outbound.length, 0, `${route.id}/${node.id}: recipients must not have outgoing flows`);
    }
  }
});
