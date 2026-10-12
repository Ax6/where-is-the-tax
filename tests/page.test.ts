import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

import { buildGermany, buildYou, defaultWage, GERMANY_CODE } from "../src/data/model.ts";
import { REPO_URL } from "../src/data/sources.ts";
import { renderPage, type PageState } from "../src/ui/page.ts";

const base: PageState = { zoom: "you", wage: defaultWage(2024), land: GERMANY_CODE, year: 2024, lang: "en", pot: "pot-fed", unit: "bn", layer: "all" };

for (const lang of ["en", "de"] as const) {
  for (const zoom of ["you", "germany"] as const) {
    test(`static page renders (${lang}, ${zoom}) with no undefined or NaN`, () => {
      const state = { ...base, lang, zoom };
      const html = renderPage(state, buildYou(state.year, state.wage, state.land), buildGermany());
      assert.doesNotMatch(html, /undefined|NaN|\[object Object\]/);
      assert.match(html, lang === "en" ? /Where taxes go · Germany 2024/ : /Wohin Steuern fließen · Deutschland 2024/);
      assert.match(html, lang === "en" ? /€465\.7bn/ : /465,7 Mrd\. €/);
      assert.match(html, /<table class="data-table taxes">/);
    });
  }
}

test("every repository link in the static page points to an existing file", () => {
  const html = renderPage(base, buildYou(base.year, base.wage, base.land), buildGermany());
  const prefix = `${REPO_URL}/blob/main/`;
  const paths = new Set([...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]!).filter((href) => href.startsWith(prefix)).map((href) => href.slice(prefix.length)));
  assert.ok(paths.size > 10);
  for (const path of paths) {
    assert.ok(existsSync(new URL(`../${path}`, import.meta.url)), path);
  }
});

test("contestable items carry their marker: health rate *, payroll view *, purchase prices *", () => {
  const html = renderPage(base, buildYou(base.year, base.wage, base.land), buildGermany());
  assert.match(html, /Health contribution\*/);
  assert.match(html, /at €1\.75\*/);
  const germany = renderPage({ ...base, zoom: "germany" }, buildYou(base.year, base.wage, base.land), buildGermany());
  assert.match(germany, /Pension contributions\*/);
});
