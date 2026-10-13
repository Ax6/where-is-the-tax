import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

import { buildGermany, buildYou, defaultWage, GERMANY_CODE } from "../src/data/model.ts";
import { REPO_URL } from "../src/data/sources.ts";
import { renderPage, type PageState } from "../src/ui/page.ts";

const base: PageState = { zoom: "you", wage: Math.round(defaultWage(2024)), wageSet: false, land: GERMANY_CODE, year: 2024, lang: "en", unit: "bn", estimate: true, highlight: null, theme: "auto", tex: false, pot: "pot-fed" };

for (const lang of ["en", "de"] as const) {
  for (const zoom of ["you", "germany"] as const) {
    test(`static page renders (${lang}, ${zoom}) with no undefined or NaN`, () => {
      const state = { ...base, lang, zoom };
      const html = renderPage(state, buildYou(state.year, state.wage, state.land), buildGermany());
      assert.doesNotMatch(html, /undefined|NaN|\[object Object\]/);
      assert.match(
        html,
        zoom === "you"
          ? lang === "en" ? /Where do my taxes go\? · Germany 2024/ : /Wohin gehen meine Steuern\? · Deutschland 2024/
          : lang === "en" ? /Where do everyone&#039;s taxes go\? · Germany 2024/ : /Wohin gehen alle Steuern\? · Deutschland 2024/,
      );
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

test("no-JS build keeps the equalisation section: provisional title, pooled note, all 16 Länder", () => {
  const html = renderPage(base, buildYou(base.year, base.wage, base.land), buildGermany(), { staticBuild: true });
  const section = html.slice(html.indexOf('id="equalisation-static"'), html.indexOf('id="taxes"'));
  assert.match(section, /Fiscal equalisation 2024 provisional/);
  assert.match(section, /no Land pays another/);
  assert.equal([...section.matchAll(/<tr><th scope="row">/g)].length, 16);
  // the interactive page has the map instead
  assert.doesNotMatch(renderPage(base, buildYou(base.year, base.wage, base.land), buildGermany()), /equalisation-static/);
});

test("the static 'of every €100' table uses the same 'yours' arithmetic as the chart: the pot splits only what it keeps", () => {
  const you = buildYou(2025, 54_066, "DE");
  const fed = you.pots.find((pot) => pot.id === "pot-fed")!;
  const html = renderPage({ ...base, year: 2025, wage: 54_066, land: "DE", pot: "pot-fed" } as typeof base, you, buildGermany());
  const own = (you.inflow["pot-fed"] ?? 0) * (1 - fed.transferOut!.value / fed.total);
  const first = fed.categories[0]!;
  const expected = Math.round(own * (first.value / fed.compositionBase));
  assert.match(html, new RegExp(`≈ €${expected.toLocaleString("en-US")}\\*`), `first federal category shows ≈ €${expected}`);
});
