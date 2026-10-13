/**
 * Browser interaction tests (needs `npm run build` and Playwright's Chromium): the global year control drives
 * every view, and the map is the place picker (click a Land, click it again for all Länder).
 */
import assert from "node:assert/strict";
import test from "node:test";

import { chromium } from "playwright";

import { serveDist } from "./axe-audit.ts";

test("header: controls fit at breakpoints and mobile settings preserve state and focus", { timeout: 120_000 }, async () => {
  const { server, url } = await serveDist();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    for (const lang of ["en", "de"]) {
      for (const zoom of ["you", "germany"]) {
        await page.goto(`${url}#lang=${lang}&zoom=${zoom}`, { waitUntil: "networkidle" });
        for (const width of [320, 390, 760, 761, 1024, 1199, 1200, 1280, 1440]) {
          await page.setViewportSize({ width, height: 900 });
          if (width <= 760 && await page.getAttribute("#controls-toggle", "aria-expanded") === "false") {
            await page.click("#controls-toggle");
          }
          await page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))));
          const problems = await page.evaluate(() => {
            const groups = [...document.querySelectorAll<HTMLElement>(".title, .view-controls, .wage-ctl, .ctl-unit, .display-controls")]
              .map((el) => ({ name: el.className, rect: el.getBoundingClientRect() })).filter(({ rect }) => rect.width > 0);
            const problems: string[] = [];
            for (const { name, rect } of groups) {
              if (rect.left < 0 || rect.right > document.documentElement.clientWidth + 1) problems.push(`${name} overflows`);
            }
            for (let i = 0; i < groups.length; i++) {
              for (const other of groups.slice(i + 1)) {
                const { name, rect } = groups[i]!;
                if (Math.min(rect.right, other.rect.right) - Math.max(rect.left, other.rect.left) > 1 &&
                    Math.min(rect.bottom, other.rect.bottom) - Math.max(rect.top, other.rect.top) > 1) problems.push(`${name} overlaps ${other.name}`);
              }
            }
            return problems;
          });
          assert.deepEqual(problems, [], `${lang}, ${zoom}, ${width}px`);
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${url}#lang=en`, { waitUntil: "networkidle" });
    if (await page.getAttribute("#controls-toggle", "aria-expanded") === "false") await page.click("#controls-toggle");
    await page.click(".lang-toggle [data-lang='de']");
    assert.equal(await page.getAttribute("#controls-toggle", "aria-expanded"), "true");
    assert.equal(await page.locator("#wage-range").isVisible(), true);
    const node = page.locator(".stage-row").first();
    // the row is identified by its key: a redraw (fonts, resize) replaces the element but keeps the key
    const key = await node.getAttribute("data-key");
    for (const resize of [false, true]) {
      await node.focus();
      await page.keyboard.press("Enter");
      await page.locator("#drawer").waitFor({ state: "visible" });
      if (resize) {
        // A responsive redraw can replace the original trigger while the drawer is open.
        const originalNode = await node.elementHandle();
        await page.setViewportSize({ width: 400, height: 844 });
        await page.waitForFunction((element) => !element!.isConnected, originalNode);
      }
      await page.keyboard.press("Escape");
      // focus returns to the row (a frame later if the browser dropped the first focus() after `inert` was lifted)
      try {
        await page.waitForFunction((k) => (document.activeElement as HTMLElement | null)?.dataset?.key === k, key, { timeout: 5_000 });
      } catch (error) {
        const state = await page.evaluate(() => {
          const a = document.activeElement as HTMLElement | null;
          return { active: a ? `${a.tagName}#${a.id}.${a.className} key=${a.dataset?.key}` : null, drawerHidden: document.querySelector<HTMLElement>("#drawer")?.hidden };
        });
        throw new Error(`focus not restored to ${key} (resize=${resize}): ${JSON.stringify(state)}`, { cause: error });
      }
      assert.equal(await page.getAttribute("#controls-toggle", "aria-expanded"), "true");
    }
    await page.keyboard.press("Escape");
    assert.equal(await page.getAttribute("#controls-toggle", "aria-expanded"), "false");
    assert.equal(await page.evaluate(() => document.activeElement?.id), "controls-toggle");
    assert.equal(await page.locator("#wage-range").isVisible(), false);
  } finally {
    await browser.close();
    server.close();
  }
});

test("year control: 2025 is the default with and without JS; explicit years and wages survive", { timeout: 120_000 }, async () => {
  const { server, url } = await serveDist();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const staticPage = await browser.newPage({ javaScriptEnabled: false });
    await staticPage.goto(url, { waitUntil: "networkidle" });
    assert.equal(await staticPage.textContent("#title"), "Where taxes go · Germany 2025");
    assert.equal(await staticPage.getAttribute(".seg-year button[data-value='2025']", "aria-pressed"), "true");
    assert.equal(await staticPage.textContent("#wage-figure"), "€54,066");
    await staticPage.close();
    await page.goto(`${url}#lang=en`, { waitUntil: "networkidle" });
    assert.equal(await page.textContent("#title"), "Where taxes go · Germany 2025");
    assert.equal(await page.getAttribute(".seg-year button[data-value='2025']", "aria-pressed"), "true");
    assert.equal(await page.getAttribute(".seg-year button[data-value='2024']", "aria-pressed"), "false");
    assert.equal(await page.textContent("#wage-figure"), "€54,066");
    await page.goto(`${url}#y=2024&lang=en`, { waitUntil: "networkidle" });
    assert.equal(await page.textContent("#title"), "Where taxes go · Germany 2024");
    assert.equal(await page.locator(".seg-year button").count(), 2);
    await page.click(".seg-year button[data-value='2025']");
    await page.waitForFunction(() => /y=2025/.test(window.location.hash));
    assert.equal(await page.textContent("#title"), "Where taxes go · Germany 2025");
    assert.equal(await page.title(), "Where taxes go · Germany 2025");
    // default wage follows the year's full-time median until the reader sets one
    assert.equal(await page.textContent("#wage-figure"), "€54,066");
    // BMF settlement rests on the provisional annual accounts: the status stays visible
    assert.equal(await page.textContent("#map-title"), "Fiscal equalisation 2025 provisional");
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

test("old links: year=2026 opens the last page year, layer=payday keeps the purchase estimate off", { timeout: 120_000 }, async () => {
  const { server, url } = await serveDist();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${url}#year=2026&layer=payday&lang=en`, { waitUntil: "networkidle" });
    assert.equal(await page.textContent("#title"), "Where taxes go · Germany 2025");
    assert.equal(await page.getAttribute("#estimate-toggle", "aria-pressed"), "false");
  } finally {
    await browser.close();
    server.close();
  }
});

test("Shopping panel: each purchase row opens that purchase's own drawer", { timeout: 120_000 }, async () => {
  const { server, url } = await serveDist();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${url}#y=2025&lang=en`, { waitUntil: "networkidle" });
    await page.click(".chip-panel[data-panel='shopping']");
    await page.waitForSelector("#drawer:not([hidden]) .purchase-row");
    await page.click(".purchase-row[data-purchase='petrol_litre']");
    await page.waitForFunction(() => /open=purchase%3Apetrol_litre|open=purchase:petrol_litre/.test(window.location.hash));
    assert.equal(await page.getAttribute("#drawer", "data-kind"), "purchase");
    assert.match((await page.textContent("#drawer-title")) ?? "", /petrol/i);
    // closing returns focus to the Shopping chip, not to a row that no longer exists
    await page.click("#drawer-close");
    assert.equal(await page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.panel), "shopping");
  } finally {
    await browser.close();
    server.close();
  }
});
