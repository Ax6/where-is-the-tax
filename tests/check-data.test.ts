import assert from "node:assert/strict";
import test from "node:test";

import { checkData } from "../scripts/check-data.ts";

test("data/ passes the v2 envelope check and the front end reads no legacy file", () => {
  const result = checkData();
  assert.deepEqual(result.failures, []);
  assert.ok(result.passes.some((line) => line.startsWith("front end reads data/de/citizen/payslip-parameters.json")));
});
