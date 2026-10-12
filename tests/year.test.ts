/**
 * Year switch: every view reads the selected year's vintage where it exists, and says which year it shows
 * where it does not (Länder functions 2022, municipal accounts 2024, the consolidated state 2024).
 */
import assert from "node:assert/strict";
import test from "node:test";

import { raw } from "../src/data/sources.ts";
import {
  buildGermany,
  buildYou,
  defaultWage,
  equalisation,
  GERMANY_CODE,
  householdEstimate,
  PAGE_YEARS,
  purchases,
  taxTable,
  vatSplit,
  wageTicks,
} from "../src/data/model.ts";
import { drawerContent } from "../src/ui/drawer-content.ts";
import { renderPage, type PageState } from "../src/ui/page.ts";
import { nextPlace } from "../src/viz/land-map.ts";
import { titleFor, yearTag } from "../src/i18n.ts";

type Row = { id: string; values_eur: Record<string, number | null> };
const byTax = (id: string, year: number) => (raw.byTax.rows as unknown as Row[]).find((row) => row.id === id)!.values_eur[String(year)]!;

test("the page offers 2024 and 2025 only; the default is 2024", () => {
  assert.deepEqual([...PAGE_YEARS], [2024, 2025]);
  assert.equal(titleFor(2025, "en"), "Where taxes go · Germany 2025");
  assert.equal(titleFor(2025, "de"), "Wohin Steuern fließen · Deutschland 2025");
});

test("You view: federal and social pots read their year; Länder, municipal and Berlin keep their latest vintage", () => {
  for (const year of PAGE_YEARS) {
    const you = buildYou(year, 50_000, "BY");
    const pot = (id: string) => you.pots.find((p) => p.id === id)!;
    assert.equal(you.year, year);
    assert.equal(pot("pot-fed").year, year);
    assert.equal(pot("pot-fed").status, "provisional");
    assert.equal(pot("pot-pension").year, year);
    assert.equal(pot("pot-health").year, year);
    assert.equal(pot("pot-land").year, 2022);
    assert.equal(pot("pot-muni").year, 2024);
  }
  assert.equal(buildYou(2024, 50_000, GERMANY_CODE).pots.find((p) => p.id === "pot-fed")!.total, 465_670_000_000);
  assert.equal(buildYou(2025, 50_000, GERMANY_CODE).pots.find((p) => p.id === "pot-fed")!.total, 493_278_000_000);
  assert.equal(buildYou(2025, 50_000, "BE").pots.find((p) => p.id === "pot-land")!.year, 2024);
  // the payslip itself is the year's law
  assert.notEqual(buildYou(2024, 50_000, "BY").payslip.totals.net, buildYou(2025, 50_000, "BY").payslip.totals.net);
});

test("Germany view: cash receipts of the year, the consolidated state of its latest year (2024)", () => {
  for (const year of PAGE_YEARS) {
    const germany = buildGermany(year);
    assert.equal(germany.year, year);
    assert.equal(germany.stateYear, 2024);
    const wageTax = germany.flow.nodes.find((node) => node.id === "t-STEUERARTG10")!;
    assert.equal(wageTax.value, byTax("STEUERARTG10", year));
  }
  assert.notEqual(buildGermany(2024).taxesTotal, buildGermany(2025).taxesTotal);
  assert.equal(buildGermany(2024).spendingTotal, buildGermany(2025).spendingTotal);
});

test("equalisation, tax table, VAT split, wage ticks and purchases read the year", () => {
  assert.equal(equalisation(2025).find((land) => land.code === "BY")!.perResident, -880.23);
  assert.notEqual(equalisation(2024).find((land) => land.code === "BY")!.perResident, -880.23);
  assert.equal(taxTable(2025).find((row) => row.id === "STEUERARTG10")!.amount, byTax("STEUERARTG10", 2025));
  assert.equal(taxTable(2024).find((row) => row.id === "STEUERARTG10")!.amount, byTax("STEUERARTG10", 2024));
  assert.notEqual(vatSplit(2024).fed / vatSplit(2024).total, vatSplit(2025).fed / vatSplit(2025).total);
  const petrolFed = (year: number) => purchases(year).find((p) => p.id === "petrol_litre")!.segments.find((s) => s.id === "vat-fed")!.value;
  assert.notEqual(petrolFed(2024), petrolFed(2025));
  assert.equal(defaultWage(2025), wageTicks(2025).find((tick) => tick.id === "median")!.value);
  assert.notEqual(defaultWage(2024), defaultWage(2025));
  // the household survey is 2024 in both years: the page tags it when 2025 is selected
  assert.equal(householdEstimate(30_000).year, 2024);
});

test("tags show only where the year differs or the figure is provisional", () => {
  assert.equal(yearTag(2025, "official", 2025, "en"), "");
  assert.equal(yearTag(2022, "official", 2024, "en"), "2022");
  assert.equal(yearTag(2025, "provisional", 2025, "en"), "2025 provisional");
  assert.equal(yearTag(2025, "provisional", 2025, "de"), "2025 vorläufig");
  assert.equal(yearTag(2024, "official", 2025, "en"), "2024");
});

test("rendered page and drawers follow the year; 2026 appears only as the payslip's one line", () => {
  const state: PageState = { zoom: "you", wage: 54_066, wageSet: false, land: GERMANY_CODE, year: 2025, lang: "en", unit: "bn", estimate: true, highlight: null, theme: "auto", tex: false, pot: "pot-fed" };
  const you = buildYou(2025, state.wage, state.land, { estimate: true });
  const germany = buildGermany(2025);
  const html = renderPage(state, you, germany);
  assert.match(html, /Where taxes go · Germany 2025/);
  assert.match(html, /All taxes 2025/);
  assert.match(html, /Fiscal equalisation 2025/);
  assert.match(html, /€493\.3bn/);
  assert.doesNotMatch(html, /data-value="2026"/);
  const ctx = { lang: "en" as const, zoom: "you" as const, year: 2025, land: GERMANY_CODE, you, germany, unit: "bn" as const };
  const payslip = drawerContent({ kind: "node", id: "gross" }, ctx);
  assert.match(payslip.html, /Same wage in 2026: €[\d,]+ net/);
  const wageTax = drawerContent({ kind: "node", id: "t-STEUERARTG10" }, { ...ctx, zoom: "germany" });
  assert.match(wageTax.html, /of all tax 2025 \(cash\)/);
  const vat = drawerContent({ kind: "node", id: "t-vat" }, { ...ctx, zoom: "germany" });
  assert.match(vat.html, /Outcome 2025 after the fixed amounts/);
  const cofog = drawerContent({ kind: "cofog", code: germany.cofog[0]!.code }, { ...ctx, zoom: "germany" });
  assert.match(cofog.html, /2024 ·/);
  const ranking = drawerContent({ kind: "panel", id: "ranking" }, ctx);
  assert.equal(ranking.title, "Fiscal equalisation 2025");
  const shopping = drawerContent({ kind: "panel", id: "shopping" }, ctx);
  // ten purchases, sorted by tax share, the 2026 cigarette rates tagged inline
  const shares = [...shopping.html.matchAll(/pr-share num">(\d+)% tax/g)].map((m) => Number(m[1]));
  assert.equal(shares.length, 10);
  assert.deepEqual(shares, [...shares].sort((a, b) => b - a));
  assert.match(shopping.html, /<span class="tag">2026<\/span>/);
});

test("map picker: clicking the selected Land returns to all Länder", () => {
  assert.equal(nextPlace(GERMANY_CODE, "BY"), "BY");
  assert.equal(nextPlace("BY", "BY"), GERMANY_CODE);
  assert.equal(nextPlace("BY", "HE"), "HE");
});
