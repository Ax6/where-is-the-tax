#!/usr/bin/env node
/** Renders the page at build time from data/ (default state, English) so it reads without JavaScript. */
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { buildGermany, buildYou, defaultWage, GERMANY_CODE } from "../src/data/model.ts";
import { renderPage, type PageState } from "../src/ui/page.ts";

const state: PageState = {
  zoom: "you",
  wage: defaultWage(2024),
  land: GERMANY_CODE,
  year: 2024,
  lang: "en",
  pot: "pot-fed",
  unit: "bn",
  layer: "all",
  theme: "auto",
  tex: false,
};

const html = renderPage(state, buildYou(state.year, state.wage, state.land), buildGermany(), { staticBuild: true });
const outputRoot = resolve(".generated");
await mkdir(outputRoot, { recursive: true });
await writeFile(resolve(outputRoot, "static-content.html"), `${html.trim()}\n`);
console.log("Generated build-time page HTML at .generated/static-content.html");
