/**
 * Browser interaction tests (needs `npm run build` and Playwright's Chromium): the global year control drives
 * every view, and the map is the place picker (click a Land, click it again for all Länder).
 */
import assert from "node:assert/strict";
import test from "node:test";

import { chromium } from "playwright";

import { serveDist } from "./axe-audit.ts";

test("year control: 2025 re-reads every view; a wage the reader set survives the switch", { timeout: 120_000 }, async () => {
  const { server, url } = await serveDist();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${url}#y=2024&lang=en`, { waitUntil: "networkidle" });
    assert.equal(await page.textContent("#title"), "Where taxes go · Germany 2024");
    assert.equal(await page.locator(".seg-year button").count(), 2);
    await page.click(".seg-year button[data-value='2025']");
    await page.waitForFunction(() => /y=2025/.test(window.location.hash));
    assert.equal(await page.textContent("#title"), "Where taxes go · Germany 2025");
    assert.equal(await page.title(), "Where taxes go · Germany 2025");
    // default wage follows the year's full-time median until the reader sets one
    assert.equal(await page.textContent("#wage-figure"), "€54,066");
    assert.equal(await page.textContent("#map-title"), "Fiscal equalisation 2025");
    assert.equal(await page.textContent("#taxes-title"), "All taxes 2025");
    const pots = await page.locator(".pot-labels").textContent();
    assert.match(pots ?? "", /Federal budget (· )?€493\.3bn/);
    assert.match(pots ?? "", /2025 provisional/);
    // the Länder functions are only published for 2022: their tag stays visible
    assert.match(pots ?? "", /2022/);
    // nothing on the page offers 2026 (only the payslip drawer's one line)
    assert.equal(await page.locator("[data-value='2026']").count(), 0);
    await page.click("#wage-figure");
    await page.fill("#wage-input", "70000");
    await page.press("#wage-input", "Enter");
    await page.click(".seg-year button[data-value='2024']");
    await page.waitForFunction(() => /y=2024/.test(window.location.hash));
    assert.equal(await page.textContent("#wage-figure"), "€70,000");
    assert.match(await page.locator(".pot-labels").textContent() ?? "", /Federal budget (· )?€465\.7bn/);
    // the payslip drawer carries the one 2026 line
    await page.locator(".hero-svg .node[role='button']").first().press("Enter");
    await page.waitForSelector("#drawer:not([hidden])");
    assert.match((await page.textContent("#drawer-body")) ?? "", /Same wage in 2026: €[\d,]+ net/);
  } finally {
    await browser.close();
    server.close();
  }
});

test("map as place picker: click a Land, click it again for all Länder", { timeout: 120_000 }, async () => {
  const { server, url } = await serveDist();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${url}#y=2024&lang=en`, { waitUntil: "networkidle" });
    assert.equal(await page.textContent("#map-place"), "All Länder · click a Land");
    assert.equal(await page.locator(".land.is-selected").count(), 0);
    await page.locator(".map-svg [aria-label^='Bavaria']").click();
    await page.waitForFunction(() => /land=BY/.test(window.location.hash));
    assert.equal(await page.locator(".land.is-selected").count(), 1);
    assert.match((await page.textContent("#map-place")) ?? "", /^Bavaria/);
    assert.match((await page.locator(".pot-labels").textContent()) ?? "", /Bavaria budget/);
    // keyboard on the selected Land deselects it
    await page.locator(".map-svg [aria-label^='Bavaria']").press("Enter");
    await page.waitForFunction(() => !/land=/.test(window.location.hash));
    assert.equal(await page.locator(".land.is-selected").count(), 0);
    assert.equal(await page.textContent("#map-place"), "All Länder · click a Land");
    // the ranking panel selects too
    await page.click(".map-panel [data-panel='ranking']");
    await page.waitForSelector("#drawer:not([hidden]) .land-bar");
    await page.locator(".land-bar", { hasText: "Saxony-Anhalt" }).click();
    await page.waitForFunction(() => /land=ST/.test(window.location.hash));
    assert.equal(await page.locator(".land-bar.is-selected").count(), 1);
  } finally {
    await browser.close();
    server.close();
  }
});

test("budget column: clicking a budget switches its composition and every row carries your euros", { timeout: 120_000 }, async () => {
  const { server, url } = await serveDist();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${url}#y=2025&lang=en&wage=31400`, { waitUntil: "networkidle" });
    // default: the federal budget, "of every €100", with a "≈ yours*" figure on each row
    assert.match((await page.locator(".composition .stage-label").textContent()) ?? "", /of every €100 · Federal budget/);
    const rows = await page.locator(".composition .comp-seg").count();
    assert.ok(rows > 3);
    assert.equal(await page.locator(".composition .comp-yours").count(), rows);
    // clicking the Länder budget switches the column and records it in the URL
    await page.click(".pot[data-pot='pot-land']");
    await page.waitForFunction(() => /pot=pot-land/.test(window.location.hash));
    assert.match((await page.locator(".composition .stage-label").textContent()) ?? "", /Länder budgets/);
    assert.equal(await page.locator(".pot.is-selected").getAttribute("data-pot"), "pot-land");
    // the budget drawer gives your euros for each sub-item too
    await page.click(".composition .panel-more");
    await page.waitForSelector("#drawer:not([hidden]) .dr-sub");
    assert.match((await page.locator("#drawer .dr-sub").first().textContent()) ?? "", /of yours\*/);
  } finally {
    await browser.close();
    server.close();
  }
});
