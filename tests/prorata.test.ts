import assert from "node:assert/strict";
import test from "node:test";

import { COMMON, municipalCommon, berlinCommon, laenderCommon, socialCommon } from "../src/data/categories.ts";
import { buildYou, places } from "../src/data/model.ts";
import { potShares, proRata } from "../src/data/prorata.ts";

const close = (a: number, b: number, tol: number, msg?: string) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ""} ${a} vs ${b}`);

test("every budget's common-category shares sum to one (mapping covers every spending line)", () => {
  for (const code of ["DE", ...places.map((p) => p.code)]) {
    for (const year of [2024, 2025]) {
      for (const pot of buildYou(year, 52_000, code).pots) {
        const shares = [...potShares(pot.spending).values()];
        close(shares.reduce((a, b) => a + b, 0), 1, 1e-9, `${code} ${year} ${pot.id}`);
        assert.ok(shares.every((share) => share > -0.02), `${pot.id} has no sizeable negative share`);
        // known source residuals: federal XML Titel sum vs BMF total (−0.34 Mio, 2024); municipal product areas vs
        // published total (+58 Mio, 0.016 %, ROADMAP). Shares are taken from the lines, so they still sum to one.
        close(pot.spending.reduce((sum, line) => sum + line.value, 0), pot.compositionBase, Math.max(1, pot.compositionBase * 2e-4), `${pot.id} spending lines = composition base`);
      }
    }
  }
});

test("pro rata rows sum to your exact total; the ≈ estimate stays a separate part that sums to the estimate", () => {
  for (const [year, gross, land] of [
    [2024, 52_159, "DE"],
    [2025, 54_000, "BY"],
    [2024, 30_000, "BE"],
    [2025, 120_000, "HB"],
  ] as const) {
    for (const estimate of [false, true]) {
      const you = buildYou(year, gross, land, { estimate });
      const pr = proRata(you);
      const exactInflow = Object.values(you.inflow).reduce((a, b) => a + b, 0);
      close(pr.total, exactInflow, 1e-6, "total");
      close(pr.rows.reduce((sum, row) => sum + row.exact, 0), exactInflow, 1e-6, `${year} ${land} rows`);
      const est = you.flow.edges.filter((e) => e.estimate).reduce((sum, e) => sum + e.value, 0);
      close(pr.rows.reduce((sum, row) => sum + row.estimate, 0), est, 1e-6, "estimate part");
      assert.equal(pr.estimateTotal > 0, estimate);
      assert.ok(pr.rows.length <= 7, "six rows plus other");
      for (const row of pr.rows) {
        close(row.byPot.reduce((sum, part) => sum + part.exact, 0), row.exact, 1e-6, `${row.id} per-budget breakdown`);
      }
    }
  }
});

test("the vintage range reflects the budgets used (Länder 2022 … payslip year)", () => {
  assert.deepEqual(proRata(buildYou(2024, 52_159, "BY")).years, [2022, 2024]);
  assert.deepEqual(proRata(buildYou(2025, 52_159, "BY")).years, [2022, 2025]);
  assert.deepEqual(proRata(buildYou(2025, 52_159, "BE")).years, [2024, 2025]);
  assert.ok(COMMON.length === 8);
});

test("mixed source lines never inflate a named category", () => {
  // municipal "building, transport, utilities" is not transport; "health and sport" is not health
  assert.equal(municipalCommon("environment"), "other");
  assert.equal(municipalCommon("health_sport"), "other");
  assert.equal(municipalCommon("central_finance"), "other");
  // Berlin's financial management group is not only interest; Länder allowances are not only health
  assert.equal(berlinCommon("8"), "other");
  assert.equal(laenderCommon("8", "Beihilfen, Unterstützungen u.ä."), "other");
  assert.equal(laenderCommon("8", "Schulden"), "interest");
  assert.equal(socialCommon("health", "Other benefits and other expenditure (residual)"), "other");
});
