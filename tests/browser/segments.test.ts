import assert from "node:assert/strict";
import test from "node:test";
import { chromium } from "playwright";
import { serveDist } from "./axe-audit.ts";

const segment = (pot: string, kind: string) => `.pot[data-pot='pot-${pot}'] [data-segment='${kind}']`;

test("budget segments: exact amounts, selective focus, dismissal and source navigation", { timeout: 120_000 }, async () => {
  const { server, url } = await serveDist();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
    for (const theme of ["light", "dark"]) {
      await page.goto(`${url}#lang=en&y=2025&land=BY&theme=${theme}`, { waitUntil: "networkidle" });
      const pension = page.locator(segment("pension", "outgoing"));
      const before = await pension.boundingBox();
      await pension.hover();
      assert.equal(await page.textContent(".tip-value"), "€30.6bn");
      assert.equal(await page.textContent(".tip-title"), "Pensioners’ health insurance*");
      assert.match(await page.textContent(".tip-body") ?? "", /privately insured pensioners/);
      assert.deepEqual(await pension.boundingBox(), before, "hover must not change the represented amount");
      const styles = await page.evaluate(() => {
        const opacity = (selector: string) => getComputedStyle(document.querySelector(selector)!).opacity;
        return {
          active: opacity(".is-segment-active"), flow: opacity(".hero-svg .ribbons"),
          context: opacity(".pot-label.is-segment-context"), other: opacity(".pot-label:not(.is-segment-context)"),
          untouched: ["header", ".legend", "#map", ".composition"].map(opacity),
          fill: getComputedStyle(document.querySelector(".is-segment-active")!).fill,
          budgetFill: getComputedStyle(document.querySelector(".pot[data-pot='pot-pension'] .pot-bar")!).fill,
        };
      });
      assert.equal(styles.active, "1");
      assert.equal(styles.context, "1");
      assert.ok(Number(styles.flow) < 0.5 && Number(styles.other) < 1);
      assert.deepEqual(styles.untouched, ["1", "1", "1", "1"]);
      assert.equal(styles.fill, styles.budgetFill);
      // Moving into the parent budget body restores its total tooltip without selecting it.
      await page.locator(".pot[data-pot='pot-pension'] .pot-bar").hover();
      assert.equal(await page.textContent(".tip-value"), "€421.3bn");
      assert.equal(await page.locator(".has-segment-focus").count(), 0);
      assert.equal(await page.locator(".pot.is-selected").getAttribute("data-pot"), "pot-fed");

      // The three grant rectangles share context, but each keeps its own amount and tooltip.
      for (const [pot, kind, amount] of [["fed", "outgoing", "€132.4bn"], ["pension", "incoming", "€112.4bn"], ["health", "incoming", "€17.6bn"]] as const) {
        await page.locator(segment(pot, kind)).hover();
        assert.equal(await page.textContent(".tip-value"), amount);
        assert.equal(await page.locator(".pot .is-segment-active").count(), 1);
        assert.equal(await page.locator(".pot .is-segment-related").count(), 2);
        assert.equal(await page.locator(".transfer-line.is-segment-related").count(), 2);
        assert.equal(await page.locator(".pot-label.is-segment-related").count(), 2);
        const related = page.locator(".pot .is-segment-related").first();
        assert.equal(await related.evaluate((el) => getComputedStyle(el).opacity), "0.8");
        assert.equal(await related.evaluate((el) => getComputedStyle(el).fill), await pension.evaluate((el) => getComputedStyle(el).fill), "related rectangles stay hollow like the inactive transfer");
        assert.equal(await page.locator(".transfer-line").first().evaluate((el) => getComputedStyle(el).opacity), "1");
      }
      await pension.hover();
      assert.equal(await page.locator(".is-segment-related").count(), 0, "pension health payments are a separate relationship");

      for (const [pot, kind, amount] of [
        ["pension", "incoming", "€112.4bn"], ["health", "incoming", "€17.6bn"],
        ["health", "outgoing", "€3.8bn"], ["care", "outgoing", "€4.8bn"],
        ["unemp", "outgoing", "€12.7bn"], ["fed", "outgoing", "€132.4bn"], ["fed", "borrowed", "€66.9bn"],
      ] as const) {
        // Even segments smaller than their old outline remain focusable and explain their own amount.
        await page.locator(segment(pot, kind)).focus();
        assert.equal(await page.textContent(".tip-value"), amount, `${pot} ${kind}`);
        assert.equal(await page.locator(".is-segment-active").count(), 1);
      }
      await page.keyboard.press("Escape");
      assert.equal(await page.locator(".tip").isVisible(), false);
      assert.equal(await page.locator(".has-segment-focus").count(), 0);
      assert.equal(await page.locator(".is-segment-related").count(), 0);
      await pension.focus();
      await page.keyboard.press("Enter");
      await page.locator("#drawer").waitFor({ state: "visible" });
      assert.equal(await page.locator(".has-segment-focus").count(), 0);
      assert.match(await page.textContent("#drawer-body") ?? "", /privately insured pensioners/);
      assert.ok(await page.locator("#drawer a[href^='http']").count() > 0);
      await page.setViewportSize({ width: 1300, height: 800 });
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => (document.activeElement as SVGElement)?.dataset.key === "p-pot-pension-outgoing");
      await page.keyboard.press("Tab");
      assert.equal(await page.locator(".is-segment-active").getAttribute("data-segment"), "incoming");
      await page.locator("#theme-toggle").focus();
      assert.equal(await page.locator(".has-segment-focus").count(), 0);
      await page.setViewportSize({ width: 1280, height: 800 });
    }
    await page.goto(`${url}#lang=de&y=2024&theme=light`, { waitUntil: "networkidle" });
    await page.locator(segment("pension", "outgoing")).focus();
    assert.equal(await page.textContent(".tip-value"), "27,3 Mrd. €");
    assert.equal(await page.textContent(".tip-title"), "Krankenversicherung von Rentnern*");
    await page.locator(segment("unemp", "outgoing")).focus();
    assert.doesNotMatch(await page.textContent(".tip-body") ?? "", /Bundeshaushalt/);
    await page.click("#tex-toggle");
    await page.locator(segment("pension", "outgoing")).focus();
    assert.equal(await page.locator(".is-segment-active").count(), 1);
    await page.emulateMedia({ forcedColors: "active" });
    await page.locator(segment("pension", "incoming")).focus();
    assert.equal(await page.locator(".tip").isVisible(), true);
    assert.equal(await page.locator(".is-segment-active").evaluate((el) => getComputedStyle(el).forcedColorAdjust), "none");
  } finally {
    await browser.close();
    server.close();
  }
});
