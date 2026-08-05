import assert from "node:assert/strict";
import test from "node:test";

import { defaultRouteId, routes } from "../src/routes/data.ts";
import { escapeHtml, renderStaticPage } from "../src/ui/static-page.ts";

test("renders the banner, chips, boundary panel, legend, and table at build time", () => {
  const html = renderStaticPage(routes, defaultRouteId);

  assert.match(html, /pending independent verification/);
  assert.equal(html.match(/data-route-chip/g)?.length, routes.length);
  assert.match(html, /Budget boundary — tax identity ends here/);
  assert.match(html, /Ribbons end in the budget that legally receives the money/);
  assert.match(html, /<table>/);
  assert.match(html, /gesetze-im-internet\.de/);
  assert.match(html, /id="record-trade-trade-federation"/);
});

test("renders a textual no-JavaScript fallback for every route", () => {
  const html = renderStaticPage(routes, defaultRouteId);
  assert.equal(html.match(/fg-fallback-route/g)?.length, routes.length);
  assert.match(html, /The interactive graph needs JavaScript/);
});

test("escapes text inserted into build-time HTML", () => {
  assert.equal(escapeHtml(`<script>alert("x")</script>`), "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
});
