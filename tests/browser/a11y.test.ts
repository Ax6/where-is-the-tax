/**
 * Browser accessibility tests (needs `npm run build` and Playwright's Chromium):
 * - axe-core on both views, both languages, both themes, textures, forced colours, drawer and mobile;
 *   fails on any violation not listed in axe-baseline.json;
 * - keyboard: a flow node opens the drawer, focus moves into it, the page behind is inert, Escape returns focus.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { chromium } from "playwright";

import { audit, serveDist } from "./axe-audit.ts";

const baseline = JSON.parse(await readFile(new URL("./axe-baseline.json", import.meta.url), "utf8")) as { accepted: string[] };

test("no new axe violations in any scenario", { timeout: 600_000 }, async () => {
  const violations = await audit();
  const fresh = violations.filter((v) => !baseline.accepted.includes(`${v.scenario}/${v.id}`));
  assert.deepEqual(
    fresh.map((v) => `${v.scenario}/${v.id} (${v.impact}, ${v.nodes} nodes): ${v.help} — ${v.targets.join(" | ")}`),
    [],
  );
});

test("keyboard: drawer takes focus, makes the page inert, Escape returns focus", { timeout: 120_000 }, async () => {
  const { server, url } = await serveDist();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${url}#y=2024&lang=en`, { waitUntil: "networkidle" });
    // the first focusable marks of the flow are its nodes, in stage order, with names
    const node = page.locator(".hero-svg .node[role='button']").first();
    await node.focus();
    const name = await node.getAttribute("aria-label");
    assert.match(name ?? "", /Gross wage/);
    await page.keyboard.press("Enter");
    await page.waitForSelector("#drawer:not([hidden])");
    assert.equal(await page.evaluate(() => document.activeElement?.id), "drawer-close");
    assert.equal(await page.evaluate(() => (document.querySelector("#app > main") as HTMLElement).inert), true);
    assert.match(await page.evaluate(() => document.querySelector("#drawer")?.getAttribute("aria-labelledby") ?? ""), /drawer-title/);
    await page.keyboard.press("Escape");
    await page.waitForSelector("#drawer[hidden]", { state: "attached" });
    assert.equal(await page.evaluate(() => (document.querySelector("#app > main") as HTMLElement).inert), false);
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("data-key")), "n-gross");
    // ribbons are pointer-only and hidden from assistive tech
    assert.equal(await page.locator(".hero-svg .ribbon:not([tabindex='-1'])").count(), 0);
    // tab order: legend row, then the map (place picker) and its ranking link, then the flow's first node
    await page.locator(".map-panel [data-panel='ranking']").focus();
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("data-key")), "n-gross");
    // the slider moves in whole €1,000 steps by keyboard and snaps to a reference wage within €500
    await page.locator("#wage-range").focus();
    await page.keyboard.press("ArrowRight");
    await page.waitForFunction(() => document.querySelector("#wage-figure")?.textContent === "€53,000");
    await page.keyboard.press("ArrowLeft");
    await page.waitForFunction(() => document.querySelector("#wage-figure")?.textContent === "€52,159");
    assert.match((await page.locator("#wage-range").getAttribute("aria-valuetext")) ?? "", /€52,159 · median/);
    // click-to-type on the wage figure; the live region announces the payslip
    await page.click("#wage-figure");
    await page.fill("#wage-input", "60000");
    await page.press("#wage-input", "Enter");
    assert.equal(await page.evaluate(() => document.activeElement?.id), "wage-figure");
    await page.waitForFunction(() => /€60,000/.test(document.querySelector("#live")?.textContent ?? ""), undefined, { timeout: 5000 });
  } finally {
    await browser.close();
    server.close();
  }
});
