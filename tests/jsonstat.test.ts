import assert from "node:assert/strict";
import test from "node:test";

import { flattenJsonStat } from "../src/data/jsonstat.ts";

test("flattens sparse JSON-stat observations without turning missing into zero", () => {
  const observations = flattenJsonStat({
    class: "dataset",
    id: ["na_item", "geo"],
    size: [2, 1],
    value: { "0": 100 },
    status: { "0": "p" },
    dimension: {
      na_item: { category: { index: { D2: 0, D5: 1 } } },
      geo: { category: { index: ["DE"] } },
    },
  });

  assert.deepEqual(observations, [
    { index: 0, coordinates: { na_item: "D2", geo: "DE" }, value: 100, status: "p" },
    { index: 1, coordinates: { na_item: "D5", geo: "DE" }, value: null, status: null },
  ]);
});

test("rejects a dimension index that does not cover its declared size", () => {
  assert.throws(
    () =>
      flattenJsonStat({
        class: "dataset",
        id: ["geo"],
        size: [2],
        value: [1, 2],
        dimension: { geo: { category: { index: ["DE"] } } },
      }),
    /declares 2 categories/,
  );
});

test("rejects a malformed JSON-stat value container instead of treating everything as missing", () => {
  assert.throws(
    () =>
      flattenJsonStat({
        class: "dataset",
        id: ["geo"],
        size: [1],
        dimension: { geo: { category: { index: ["DE"] } } },
      }),
    /no value array/,
  );
});
