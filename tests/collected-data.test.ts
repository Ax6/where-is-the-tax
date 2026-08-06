import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { getLandAccount, getLaenderAggregateAccount, getSocialAccount, socialSystemIds } from "../src/data/accounts.ts";
import { buildRoutes } from "../src/routes/data.ts";
import { getPlace, places } from "../src/routes/places.ts";

test("per-Land 2024 taxes: 16 Länder, levy identity, plausible national sums", async () => {
  const data = JSON.parse(await readFile("data/de/2024/taxes-by-land.json", "utf8"));
  assert.equal(data.laender.length, 16);
  const gross = data.laender.reduce((s: number, l: { gross_trade_tax_meur: number }) => s + l.gross_trade_tax_meur, 0);
  assert(gross > 74000 && gross < 80000, `national gross trade tax implausible: ${gross}`);
  for (const land of data.laender) {
    assert(land.trade_tax_levy_meur > 0 && land.trade_tax_levy_meur < land.gross_trade_tax_meur, land.code);
  }
  const berlin = data.laender.find((l: { code: string }) => l.code === "BE");
  assert.equal(berlin.gross_trade_tax_meur, 3011.215);
});

test("Länder 2021 accounts tile and load for every place", async () => {
  for (const place of places) {
    const account = getLandAccount(place.code, place.name);
    assert(account, place.code);
    const sum = account.groups.reduce((s, g) => s + g.amount_eur, 0);
    assert(Math.abs(sum - account.total_eur) < 1e6, `${place.code} does not tile`);
    assert.equal(account.reference_year, 2021);
  }
  const aggregate = getLaenderAggregateAccount();
  assert(aggregate.total_eur > 600e9);
});

test("social-insurance accounts reconcile and the social route conserves flow", () => {
  assert.equal(socialSystemIds.length, 4);
  for (const { id } of socialSystemIds) {
    const account = getSocialAccount(id);
    assert(account, id);
    const sum = account.groups.reduce((s, g) => s + g.amount_eur, 0);
    assert(Math.abs(sum - account.total_eur) < 1e6, `${id} does not reconcile`);
  }
  const social = buildRoutes(getPlace("DE")!).find((route) => route.id === "social");
  assert(social);
  const pensionIn = social.edges.filter((e) => e.to === "pension").reduce((s, e) => s + e.weight, 0);
  assert(Math.abs(pensionIn - (305336 + 87773)) < 1);
});

test("Bremen is not treated like Berlin/Hamburg (§7 GemFinRefG)", () => {
  const bremen = buildRoutes(getPlace("HB")!);
  const wage = bremen.find((route) => route.id === "wage");
  assert(wage?.nodes.some((node) => node.id === "municipal_budget"), "HB wage route must keep a separate municipal node");
  const trade = bremen.find((route) => route.id === "trade");
  assert(trade?.nodes.some((node) => node.id === "municipal_budgets"), "HB trade route must keep municipalities separate");
  const hamburg = buildRoutes(getPlace("HH")!);
  const hhTrade = hamburg.find((route) => route.id === "trade");
  assert(!hhTrade?.nodes.some((node) => node.id === "municipal_budgets"), "HH merges municipal into the Land");
});
