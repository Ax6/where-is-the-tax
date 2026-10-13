import assert from "node:assert/strict";
import test from "node:test";

import {
  aggregate,
  buildGermany,
  buildYou,
  defaultWage,
  equalisation,
  federalGrants,
  ownShare,
  payrollView2024,
  perResidentPerDay,
  places,
  potInflow,
  purchases,
  crossSystemTransfers,
  TOBACCO_AD_VALOREM,
  taxTable,
  vatSplit2024,
  wageTicks,
} from "../src/data/model.ts";

const bn = (eur: number) => Math.round(eur / 1e8) / 10;
import purchaseTaxes from "../data/de/citizen/purchase-taxes.json" with { type: "json" };
const await_import_free = () => purchaseTaxes.excises;
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

test("unemployment own spending and outgoing payments partition the published total", () => {
  for (const year of [2024, 2025]) {
    const pot = buildYou(year, 54_066, "DE").pots.find((p) => p.id === "pot-unemp")!;
    close(pot.compositionBase + pot.transferOut!.value, pot.total, 1, `${year}: no reimbursement counted twice`);
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

test("slider ticks come from wage-reference.json: minimum wage*, full-time median, average (no 2× average)", () => {
  assert.deepEqual(
    wageTicks(2024).map((tick) => [tick.id, tick.value, tick.fromYear ?? null]),
    [
      ["minimum", 25_812.8, null],
      ["median", 52_159, null],
      ["average", 62_235, null],
    ],
  );
  // 2026 earnings are not published yet: the ticks say they come from 2025
  const t2026 = wageTicks(2026);
  assert.equal(t2026.find((tick) => tick.id === "minimum")?.value, 28_912);
  assert.equal(t2026.find((tick) => tick.id === "median")?.fromYear, 2025);
  assert.equal(defaultWage(2024), 52_159);
});

test("household estimate (≈*): class from net ÷ 12, file's recipient split, never inside the exact payslip", () => {
  for (const [gross, classId] of [
    [30_000, "1300 bis unter 2600 Euro"],
    [52_159, "2600 bis unter 3600 Euro"],
    [150_000, "5000 und mehr Euro"],
  ] as const) {
    const you = buildYou(2024, gross, "BY", { estimate: true });
    const e = you.estimate!;
    assert.equal(e.classId, classId, `gross ${gross}`);
    // the file rounds each recipient to whole euros: the split may differ from the total by €1
    const split = e.recipients.fed + e.recipients.land + e.recipients.muni;
    close(split, e.total, 1, "recipient split vs total");
    const est = you.flow.edges.filter((edge) => edge.estimate);
    close(est.reduce((sum, edge) => sum + edge.value, 0), split, 1e-9);
    assert.ok(est.every((edge) => edge.from === "net" && edge.status === "estimate"));
    // exact euros reaching the recipients and the pots are unchanged by the estimate
    const exact = buildYou(2024, gross, "BY");
    for (const node of you.flow.nodes.filter((n) => n.stage === 2)) {
      const twin = exact.flow.nodes.find((n) => n.id === node.id)!;
      close(node.value - (node.estimate ?? 0), twin.value, 1e-9, node.id);
    }
    assert.deepEqual(you.inflow, exact.inflow);
    assert.deepEqual(you.payslip, exact.payslip);
  }
  // Berlin: Land and municipal shares of the estimate go to the one merged node
  const berlin = buildYou(2024, 52_159, "BE", { estimate: true });
  assert.equal(berlin.flow.edges.filter((edge) => edge.estimate).length, 2);
});

test("trade tax: legal-allocation.json levy block (2024 outcome), the same split in table and Germany view", () => {
  const row = taxTable().find((r) => r.id === "STEUERARTK30")!;
  const split = Object.fromEntries(row.shares!.map((s) => [s.entity, Math.round(s.share * 1000) / 10]));
  assert.deepEqual(split, { muni: 91.2, fed: 3.7, land: 5.2 });
  const g = buildGermany();
  const node = g.flow.nodes.find((n) => n.id === "t-STEUERARTK30")!;
  close(node.value, 75_293_525_000 - 6_642_096_000 + 2_753_363_000 + 3_892_030_000 + 1_789_000, 1);
});

test("federal function names come from the Funktionenplan", () => {
  const fed = buildYou(2024, 52_159, "DE").pots.find((p) => p.id === "pot-fed")!;
  const names = fed.categories.flatMap((c) => (c.children ?? []).map((child) => child.label.en));
  assert.ok(names.some((name) => name.startsWith("Defence")));
  assert.ok(!names.some((name) => /^Function \d/.test(name)), names.join(", "));
});

test("equalisation per resident includes all supplementary federal grants (Berlin +€1,578.82)", () => {
  const berlin = equalisation().find((land) => land.code === "BE")!;
  assert.equal(berlin.perResident, 1578.82);
  const sumFka = equalisation().reduce((sum, land) => sum + land.fka, 0);
  close(sumFka, 0, 16_000, "FKA nets to zero");
});

test("purchases: exact per-unit taxes, assumed prices (petrol 53 %, cigarettes 61 % at the 2024 rate)", () => {
  const items = purchases();
  assert.equal(Math.round(items.find((p) => p.id === "petrol_litre")!.taxShare * 100), 53);
  assert.equal(Math.round(items.find((p) => p.id === "cigarettes_pack")!.taxShare * 100), 61);
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

test("every pot category and sub-category has a German and an English label", () => {
  for (const code of ["DE", ...places.map((p) => p.code)]) {
    for (const pot of buildYou(2024, 45_358, code).pots) {
      for (const cat of pot.categories) {
        assert.ok(cat.label.de && cat.label.en, `${code} ${pot.id} ${cat.id}`);
        for (const child of cat.children ?? []) {
          assert.ok(child.label.de && child.label.en, `${code} ${pot.id} ${cat.id} child`);
        }
      }
    }
  }
});

test("customs: 75 % to the EU, 25 % kept by the Federation as collection costs; nothing lost", () => {
  const g = buildGermany();
  const node = g.flow.nodes.find((n) => n.id === "t-STEUERARTZ10")!;
  const out = g.flow.edges.filter((edge) => edge.from === "t-STEUERARTZ10");
  assert.deepEqual(
    out.map((edge) => [edge.entity, Math.round((edge.value / node.value) * 100)]).sort(),
    [
      ["eu", 75],
      ["fed", 25],
    ],
  );
  close(out.reduce((sum, edge) => sum + edge.value, 0), node.value, 1);
});

test("Saxony: the care contribution split follows § 58 Abs. 3 SGB XI; the total contribution is unchanged", () => {
  const west = buildYou(2025, 54_066, "BY");
  const saxony = buildYou(2025, 54_066, "SN");
  close(saxony.payslip.deductions_employee.pv - west.payslip.deductions_employee.pv, 54_066 * 0.005, 0.01);
  close(west.payslip.employer_contributions.pv - saxony.payslip.employer_contributions.pv, 54_066 * 0.005, 0.01);
  const total = (you: typeof west) => you.payslip.deductions_employee.pv + you.payslip.employer_contributions.pv;
  close(total(saxony), total(west), 0.01);
});

test("your share: the federal pot keeps only what it does not pass on; the grants carry your euros to pension and health", () => {
  const you = buildYou(2025, 54_066, "DE");
  const fed = you.pots.find((pot) => pot.id === "pot-fed")!;
  close(ownShare(fed), 1 - fed.transferOut!.value / fed.total, 1e-12);
  assert.ok(ownShare(fed) < 0.75 && ownShare(fed) > 0.6, `the Federation passes on roughly a third: ${ownShare(fed)}`);
  const own = you.inflow["pot-fed"]! * ownShare(fed);
  const yours = fed.categories.reduce((sum, cat) => sum + own * (cat.value / fed.compositionBase), 0);
  close(yours, own, 0.01, "the category euros add up to what the pot keeps");
  for (const id of ["pot-pension", "pot-health"]) {
    const pot = you.pots.find((p) => p.id === id)!;
    assert.ok(pot.transferIn && pot.transferIn.from === "pot-fed");
    close(you.grantIn[id]!, you.inflow["pot-fed"]! * (pot.transferIn!.value / fed.total), 1e-6, id);
    close(potInflow(you, pot), you.inflow[id]! + you.grantIn[id]!, 1e-9);
  }
  // the pension scheme's own accounts, not the federal function total (which also funds other schemes)
  const pension = you.pots.find((p) => p.id === "pot-pension")!;
  assert.equal(bn(pension.transferIn!.value), 112.4);
  assert.ok(pension.transferIn!.value < fed.transferOut!.to.find((t) => t.pot === "pot-pension")!.value);
});

test("revenue bridge: the listed parts of social contributions and other revenue add up to the headline", () => {
  const g = buildGermany();
  const SY = String(g.stateYear);
  const contributions = g.bridge.find((b) => b.id === "contributions")!.value;
  const residual = aggregate("D61REC", SY) - aggregate("D611REC", SY) - aggregate("D613REC", SY);
  close(aggregate("D611REC", SY) + aggregate("D613REC", SY) + residual, contributions, 1e6);
  const other = g.bridge.find((b) => b.id === "other")!.value;
  const parts = ["P11_P12_P131", "D39REC", "D4REC", "D7REC", "D92REC", "D99REC"].reduce((sum, id) => sum + aggregate(id, SY), 0);
  close(parts, other, 1e6, "other revenue parts (without the capital taxes already under taxes)");
});

test("cigarettes: the tobacco tax of the selected year, not the newest one", () => {
  const share = (year: number) => Math.round(purchases(year).find((p) => p.id === "cigarettes_pack")!.taxShare * 1000) / 10;
  assert.equal(share(2024), 60.6);
  assert.equal(share(2025), 61.8);
  assert.equal(share(2026), 63.1);
  assert.match(purchases(2025).find((p) => p.id === "cigarettes_pack")!.label.en, /\(2025\)/);
  const excises = (await_import_free() as Record<string, { unit: string }>);
  for (const key of ["cigarettes_2024", "cigarettes_2025", "cigarettes_2026"]) {
    assert.match(excises[key]!.unit, new RegExp(`${(TOBACCO_AD_VALOREM * 100).toFixed(2)} %`), key);
  }
});

test("contributions one system pays to another: €46.0bn in 2024, €52.3bn in 2025 (lower bounds)", () => {
  assert.equal(bn(crossSystemTransfers(2024)), 46);
  assert.equal(bn(crossSystemTransfers(2025)), 52.3);
});
