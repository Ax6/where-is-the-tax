import assert from "node:assert/strict";
import test from "node:test";

import { getRoute } from "../src/routes/data.ts";
import { getTaxEntry, taxonomy } from "../src/routes/taxonomy.ts";

test("taxonomy entries are unique, described, sourced, and route references resolve", () => {
  const ids = taxonomy.flatMap((group) => group.entries.map((entry) => entry.id));
  assert.equal(new Set(ids).size, ids.length);
  assert(ids.length >= 15, "the whole map should cover the major tax families");

  for (const group of taxonomy) {
    for (const entry of group.entries) {
      assert(entry.description.trim().length > 0, `${entry.id}: description required`);
      assert(entry.split.trim().length > 0, `${entry.id}: split required`);
      assert(entry.sources.length > 0, `${entry.id}: source required`);
      for (const source of entry.sources) {
        assert(source.url.startsWith("https://"), `${entry.id}: sources must be https`);
      }
      if (entry.routeId) {
        assert(getRoute(entry.routeId), `${entry.id}: routeId must reference an existing route`);
      }
    }
  }
});

test("getTaxEntry finds entries with their group", () => {
  const found = getTaxEntry("property_tax");
  assert(found);
  assert.equal(found.group.id, "municipal");
  assert.equal(found.entry.routeId, "housing");
  assert.equal(getTaxEntry("nope"), undefined);
});
