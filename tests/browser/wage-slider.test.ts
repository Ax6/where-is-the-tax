import assert from "node:assert/strict";
import test from "node:test";

import { chromium } from "playwright";

import { serveDist } from "./axe-audit.ts";

test("touch wage slider: chart updates never reset an unfocused active drag", { timeout: 120_000 }, async () => {
  const { server, url } = await serveDist();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
    await page.goto(`${url}#lang=en`, { waitUntil: "networkidle" });
    const result = await page.evaluate(async () => {
      const range = document.querySelector<HTMLInputElement>("#wage-range")!;
      const value = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!;
      const writes: string[] = [];
      Object.defineProperty(range, "value", {
        get: () => value.get!.call(range),
        set: (next: string) => { writes.push(next); value.set!.call(range, next); },
      });
      // Model Safari's touch control, which need not gain focus or report :active.
      const matches = range.matches.bind(range);
      range.matches = (selector) => selector === ":active" ? false : matches(selector);
      range.dispatchEvent(new PointerEvent("pointerdown", { pointerType: "touch", bubbles: true }));
      const figures: string[] = [];
      for (const wage of [160000, 80000]) {
        // Native thumb movement changes the value without calling the JS property setter.
        value.set!.call(range, String(wage));
        range.dispatchEvent(new Event("input", { bubbles: true }));
        await new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())));
        figures.push(document.querySelector("#wage-figure")!.textContent!);
      }
      range.dispatchEvent(new PointerEvent("pointerup", { pointerType: "touch", bubbles: true }));
      return { writes, figures, focused: document.activeElement === range };
    });
    assert.equal(result.focused, false);
    assert.deepEqual(result.figures, ["€160,000", "€80,000"]);
    assert.deepEqual(result.writes, [], "rendering must not write back to a native touch drag");
  } finally {
    await browser.close();
    server.close();
  }
});

test("touch wage slider: reaching maximum still allows dragging back", { timeout: 120_000 }, async () => {
  const { server, url } = await serveDist();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await page.goto(`${url}#lang=en&wage=80000`, { waitUntil: "networkidle" });
    const range = page.locator("#wage-range");
    const box = await range.boundingBox();
    assert.ok(box);
    const session = await page.context().newCDPSession(page);
    const left = box.x + 8;
    const right = box.x + box.width - 8;
    const y = box.y + box.height / 2;
    const xAt = (wage: number) => left + (wage - 8000) / (160000 - 8000) * (right - left);
    const touch = async (type: "touchStart" | "touchMove" | "touchEnd", x: number, offsetY = 0) => {
      await session.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y: y + offsetY }] });
      await page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))));
    };
    const checkWage = async (wage: number) => {
      assert.equal(await range.inputValue(), String(wage));
      assert.equal(await page.textContent("#wage-figure"), `€${wage.toLocaleString("en-US")}`);
      assert.equal(new URLSearchParams(new URL(page.url()).hash.slice(1)).get("wage"), String(wage));
    };
    await touch("touchStart", xAt(80000));
    await touch("touchMove", xAt(120000));
    await touch("touchMove", right);
    await checkWage(160000);
    // Reverse the same gesture, then start a fresh gesture from the maximum.
    await touch("touchMove", xAt(100000), 4);
    await checkWage(100000);
    await touch("touchEnd", xAt(100000));
    await touch("touchStart", xAt(100000));
    await touch("touchMove", right);
    await touch("touchEnd", right);
    await checkWage(160000);
    await touch("touchStart", right);
    await touch("touchMove", xAt(80000), 4);
    await checkWage(80000);
    await touch("touchMove", left);
    await checkWage(8000);
    await touch("touchEnd", left);
    assert.equal(await page.locator("#wage-bubble").isVisible(), false);
  } finally {
    await browser.close();
    server.close();
  }
});
