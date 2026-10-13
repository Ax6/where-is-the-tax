#!/usr/bin/env node
/** Renders the page at build time from data/ (default state, English) so it reads without JavaScript. */
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { buildGermany, buildYou, defaultWage, DEFAULT_PAGE_YEAR, GERMANY_CODE } from "../src/data/model.ts";
import { renderPage, type PageState } from "../src/ui/page.ts";

const state: PageState = {
  zoom: "you",
  wage: Math.round(defaultWage(DEFAULT_PAGE_YEAR)),
  wageSet: false,
  land: GERMANY_CODE,
  year: DEFAULT_PAGE_YEAR,
  lang: "en",
  unit: "bn",
  estimate: true,
  highlight: null,
  theme: "auto",
  tex: false,
  pot: "pot-fed",
};

const html = renderPage(state, buildYou(state.year, state.wage, state.land, { estimate: true }), buildGermany(state.year), { staticBuild: true });
const outputRoot = resolve(".generated");
await mkdir(outputRoot, { recursive: true });
await writeFile(resolve(outputRoot, "static-content.html"), `${html.trim()}\n`);
console.log("Generated build-time page HTML at .generated/static-content.html");
