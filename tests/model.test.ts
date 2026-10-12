import assert from "node:assert/strict";
import test from "node:test";

import {
  buildGermany,
  buildYou,
  defaultWage,
  equalisation,
  federalGrants,
  payrollView2024,
  perResidentPerDay,
  places,
  purchases,
  taxTable,
  vatSplit2024,
  wageTicks,
} from "../src/data/model.ts";

const bn = (eur: number) => Math.round(eur / 1e8) / 10;
const close = (actual: number, expected: number, tolerance: number, message?: string) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message ?? ""} expected ${expected} ± ${tolerance}, got ${actual}`);

// Figures below are the verified constructs in docs/research/RATIONALIZATION.md.

test("whole state: COFOG shares of every €100 and €69.95 per resident per day (§ 1)", () => {
  const g = buildGermany();
  assert.equal(bn(g.spendingTotal), 2139.7);
  const share = (code: string) => Math.round((g.cofog.find((c) => c.code === code)!.value / g.spendingTotal) * 1000) / 10;
  assert.equal(share("GF10"), 41.3);
  assert.equal(share("GF07"), 15.4);
  assert.equal(share("GF01"), 13.0);
  assert.equal(share("GF04"), 11.0);
  assert.equal(share("GF09"), 9.1);
  assert.equal(Math.round(perResidentPerDay(g.spendingTotal) * 100) / 100, 69.95);
});

test("revenue bridge: taxes 49.7 / contributions 37.4 / other 12.9 and a €115.3bn deficit (§ 2)", () => {
  const g = buildGermany();
  const pct = (id: string) => Math.round((g.bridge.find((b) => b.id === id)!.share ?? 0) * 1000) / 10;
  assert.equal(pct("taxes"), 49.7);
  assert.equal(pct("contributions"), 37.4);
  assert.equal(pct("other"), 12.9);
  assert.equal(bn(g.deficit), 115.3);
  close(g.revenueTotal + g.deficit, g.spendingTotal, 1, "revenue + borrowing = spending");
});

test("named taxes: the legal split conserves every euro of the €947.7bn cash receipts (§ 3)", () => {
  const g = buildGermany();
  assert.equal(bn(g.taxesTotal), 947.7);
  const taxNodes = g.flow.nodes.filter((node) => node.id.startsWith("t-"));
  close(taxNodes.reduce((sum, node) => sum + node.value, 0), g.taxesTotal, 10e6, "tax nodes sum to the total (trade-tax levy timing ≤ €10m)");
  for (const node of g.flow.nodes.filter((n) => n.stage === 0)) {
    const out = g.flow.edges.filter((edge) => edge.from === node.id).reduce((sum, edge) => sum + edge.value, 0);
    close(out, node.value, 1, node.id);
  }
});

test("VAT split 2024 is the annual-formula outcome 48.10 / 49.11 / 2.79 (§ 3)", () => {
  assert.equal(Math.round((vatSplit2024.fed / vatSplit2024.total) * 10000) / 100, 48.1);
  assert.equal(Math.round((vatSplit2024.laender / vatSplit2024.total) * 10000) / 100, 49.11);
  assert.equal(Math.round((vatSplit2024.muni / vatSplit2024.total) * 10000) / 100, 2.79);
});

test("federal pot: €465.7bn, grants to social insurance shown as a transfer, €33.3bn borrowed (§ 5)", () => {
  const you = buildYou(2024, 45_358, "DE");
  const fed = you.pots.find((pot) => pot.id === "pot-fed")!;
  assert.equal(bn(fed.total), 465.7);
  assert.equal(bn(federalGrants.pension), 107.5);
  assert.equal(bn(fed.transferOut!.value), bn(federalGrants.pension + federalGrants.health));
  close(fed.compositionBase, fed.total - fed.transferOut!.value, 1);
  close(fed.categories.reduce((sum, c) => sum + c.value, 0), fed.compositionBase, 1e6, "composition sums to own spending");
  assert.equal(bn(fed.borrowed!), 33.3);
});

test("social pots: 2024 expenditure and the payroll view of €529.3bn* (§ 10)", () => {
  const you = buildYou(2024, 45_358, "DE");
  const total = (id: string) => bn(you.pots.find((pot) => pot.id === id)!.total);
  assert.equal(total("pot-pension"), 397.4);
  assert.equal(total("pot-health"), 328.7);
  assert.equal(total("pot-care"), 68.2);
  assert.equal(total("pot-unemp"), 45.2);
  assert.equal(bn(payrollView2024.total_eur), 529.3);
  for (const pot of you.pots.filter((p) => p.fenced)) {
    assert.ok(pot.transferOut && pot.transferOut.value > 0, `${pot.id} removes inter-system payments`);
    close(pot.categories.reduce((sum, c) => sum + c.value, 0), pot.compositionBase, 1e6, pot.id);
  }
});

test("pots never show slivers: every category except 'other' is at least 1 % of its pot", () => {
  for (const code of ["DE", ...places.map((p) => p.code)]) {
    for (const pot of buildYou(2024, 45_358, code).pots) {
      for (const cat of pot.categories) {
        if (cat.id !== "other") {
          assert.ok(cat.value / pot.compositionBase >= 0.01, `${code} ${pot.id} ${cat.label.en}`);
        }
      }
    }
  }
});

test("You zoom conserves euros: gross + employer = deductions + net; recipients = taxes + contributions", () => {
  for (const code of ["DE", "BE", "HB", "HH", "BY"]) {
    for (const year of [2024, 2025, 2026]) {
      for (const gross of [12_000, defaultWage(year), 150_000]) {
        const you = buildYou(year, gross, code);
        const p = you.payslip;
        const stage = (s: number) => you.flow.nodes.filter((n) => n.stage === s).reduce((sum, n) => sum + n.value, 0);
        close(stage(0), gross + p.totals.social_employer, 0.01);
        close(stage(1), gross + p.totals.social_employer, 0.01);
        close(stage(2), p.totals.taxes + p.totals.social_employee + p.totals.social_employer, 0.01);
        close(Object.values(you.inflow).reduce((a, b) => a + b, 0), stage(2), 0.01, "every recipient joins a pot");
      }
    }
  }
});

test("wage tax goes 42.5 / 42.5 / 15; Berlin and Hamburg take Land and municipal shares in one node", () => {
  const you = buildYou(2024, 60_000, "BY");
  const tax = you.payslip.deductions_employee.lohnsteuer;
  const edge = (id: string) => you.flow.edges.find((e) => e.id === id)!.value;
  close(edge("wagetax-fed"), tax * 0.425, 0.001);
  close(edge("wagetax-land"), tax * 0.425, 0.001);
  close(edge("wagetax-muni"), tax * 0.15, 0.001);
  const berlin = buildYou(2024, 60_000, "BE");
  assert.equal(berlin.flow.nodes.some((n) => n.id === "r-muni"), false);
  close(berlin.flow.edges.find((e) => e.id === "wagetax-land")!.value, tax * 0.575, 0.001);
  assert.equal(berlin.pots.find((p) => p.id === "pot-land")!.year, 2024);
  assert.equal(buildYou(2024, 60_000, "NW").pots.find((p) => p.id === "pot-land")!.year, 2022);
});

test("slider ticks come from data: average earnings and contribution ceilings", () => {
  const ticks = wageTicks(2024);
  assert.deepEqual(
    ticks.map((tick) => [tick.id, tick.value]),
    [
      ["average", 45_358],
      ["kv", 62_100],
      ["rv", 90_600],
      ["double", 90_716],
    ],
  );
});

test("equalisation per resident includes all supplementary federal grants (Berlin +€1,578.82)", () => {
  const berlin = equalisation().find((land) => land.code === "BE")!;
  assert.equal(berlin.perResident, 1578.82);
  const sumFka = equalisation().reduce((sum, land) => sum + land.fka, 0);
  close(sumFka, 0, 16_000, "FKA nets to zero");
});

test("purchases: exact per-unit taxes, assumed prices (petrol 53 %, cigarettes 63 %)", () => {
  const items = purchases();
  assert.equal(Math.round(items.find((p) => p.id === "petrol_litre")!.taxShare * 100), 53);
  assert.equal(Math.round(items.find((p) => p.id === "cigarettes_pack")!.taxShare * 100), 63);
  for (const item of items) {
    close(item.segments.reduce((sum, seg) => sum + seg.value, 0), item.price, 1e-9, item.id);
  }
});

test("all-taxes table: every named tax with receipts, shares sum to one", () => {
  const rows = taxTable();
  assert.ok(rows.length >= 40);
  for (const row of rows) {
    if (row.shares) {
      close(row.shares.reduce((sum, s) => sum + s.share, 0), 1, 1e-9, row.id);
    }
  }
});
