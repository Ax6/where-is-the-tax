#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { defaultRouteId, routes } from "../src/routes/data.ts";
import { renderStaticPage } from "../src/ui/static-page.ts";

const outputRoot = resolve(".generated");
const outputPath = resolve(outputRoot, "static-content.html");

const html = renderStaticPage(routes, defaultRouteId);

await mkdir(outputRoot, { recursive: true });
await writeFile(outputPath, `${html.trim()}\n`);
console.log(`Generated build-time page HTML at ${outputPath}`);
