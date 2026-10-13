import assert from "node:assert/strict";
import test from "node:test";

import examples from "../data/de/citizen/payslip-examples.json" with { type: "json" };
import parameters from "../data/de/citizen/payslip-parameters.json" with { type: "json" };
import { availableYears, computePayslip, pyRound2, type PayslipParameters, type PayslipRow } from "../src/data/payslip.ts";

const params = parameters as unknown as PayslipParameters;
const years = examples.years as unknown as Record<string, Record<"childless" | "with_child" | "saxony", PayslipRow[]>>;

test("the engine covers exactly the years of the parameters file", () => {
  assert.deepEqual(availableYears(params), examples.years_covered);
});

let compared = 0;
for (const [year, variants] of Object.entries(years)) {
  for (const [variant, rows] of Object.entries(variants)) {
    for (const row of rows) {
      test(`payslip ${year} ${variant} gross ${row.gross} reproduces payslip-examples.json exactly`, () => {
        const computed = computePayslip(params, Number(year), row.gross, { childless: variant !== "with_child", saxony: variant === "saxony" });
        assert.deepEqual(computed, row);
      });
      compared += 1;
    }
  }
}

test("every example row was compared (3 years × 3 variants × 8 wages)", () => {
  assert.equal(compared, examples.years_covered.length * 3 * examples.gross_wages.length);
});

test("Übergangsbereich: the employee's share falls to zero at the Geringfügigkeitsgrenze and meets the normal rule at 2 000 EUR a month", () => {
  for (const year of availableYears(params)) {
    const u = params.years[String(year)]!.social_insurance.uebergangsbereich!;
    const g = u.geringfuegigkeitsgrenze_monthly.value;
    const justAbove = computePayslip(params, year, (g + 1) * 12);
    assert.ok(justAbove.intermediate.uebergangsbereich);
    assert.ok(justAbove.totals.social_employee < 12, `${year}: employee contributions start near zero above G (${justAbove.totals.social_employee})`);
    assert.ok(justAbove.totals.social_employer > justAbove.totals.social_employee, "the employer carries the reduced contribution");
    const top = computePayslip(params, year, 24_000);
    const normal = computePayslip(params, year, 24_012);
    assert.ok(top.intermediate.uebergangsbereich && !normal.intermediate.uebergangsbereich);
    assert.ok(Math.abs(top.totals.social_employee - normal.totals.social_employee) < 6, `${year}: continuous at the upper end`);
  }
});

test("Saxony: half a care-insurance point moves from the employer to the employee (§ 58 Abs. 3 SGB XI); the total is unchanged", () => {
  const west = computePayslip(params, 2025, 54_066);
  const saxony = computePayslip(params, 2025, 54_066, { saxony: true });
  assert.equal(pyRound2(saxony.deductions_employee.pv - west.deductions_employee.pv), pyRound2(54_066 * 0.005));
  assert.equal(pyRound2(west.employer_contributions.pv - saxony.employer_contributions.pv), pyRound2(54_066 * 0.005));
  assert.ok(saxony.deductions_employee.lohnsteuer <= west.deductions_employee.lohnsteuer, "the higher Vorsorgepauschale cannot raise the wage tax");
});

test("the Vorsorgepauschale caps hard-coded in the engine are the ones stated in the parameters' rule text", () => {
  for (const year of availableYears(params)) {
    const rule = params.years[String(year)]!.wage_tax_allowances.vorsorgepauschale.rule;
    assert.match(rule, /1 900 EUR/);
    if (year <= 2025) {
      assert.match(rule, /12 % of the wage/);
    } else {
      assert.match(rule, /unemployment contribution/);
    }
  }
});

test("pyRound2 rounds exact ties to even like Python", () => {
  assert.equal(pyRound2(0.125), 0.12);
  assert.equal(pyRound2(0.375), 0.38);
  assert.equal(pyRound2(2.625), 2.62);
  assert.equal(pyRound2(23.248), 23.25);
  assert.equal(pyRound2(1.005), 1); // binary 1.005 is below the tie
});

test("monotone net pay and plausible shares across the wage range", () => {
  let previousNet = -1;
  for (let gross = 1_000; gross <= 300_000; gross += 997) {
    const row = computePayslip(params, 2026, gross);
    assert.ok(row.totals.net > previousNet, `net pay grows at ${gross}`);
    assert.ok(row.totals.net < gross);
    previousNet = row.totals.net;
  }
});

test("wage tax reproduces all class-I rows of the official BMF Prüftabellen (research extract)", async () => {
  const { readFile } = await import("node:fs/promises");
  const csv = await readFile(new URL("../research/extracts/bmf_programmablaufplan/prueftabelle_stkl1.csv", import.meta.url), "utf8");
  const [header, ...lines] = csv.trim().split("\n");
  const columns = header!.split(",");
  const yearIndex = columns.indexOf("year");
  const grossIndex = columns.indexOf("gross_annual_eur");
  const lstIndex = columns.indexOf("lst_I");
  let rows = 0;
  for (const line of lines) {
    const cells = line.split(",");
    const row = computePayslip(params, Number(cells[yearIndex]), Number(cells[grossIndex]));
    assert.equal(row.deductions_employee.lohnsteuer, Number(cells[lstIndex]), `${cells[yearIndex]} gross ${cells[grossIndex]}`);
    rows += 1;
  }
  assert.equal(rows, 121);
});
