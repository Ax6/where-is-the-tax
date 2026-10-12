import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { defineConfig, type Plugin } from "vite";

const staticContentPath = fileURLToPath(new URL("./.generated/static-content.html", import.meta.url));

/** Injects the build-time page (scripts/generate-static.ts) so the slide's data is readable without JavaScript. */
function buildTimeContent(): Plugin {
  return {
    name: "build-time-content",
    async transformIndexHtml(html) {
      const staticContent = await readFile(staticContentPath, "utf8");
      if (!html.includes("<!-- STATIC_CONTENT -->")) {
        throw new Error("index.html is missing the build-time content marker.");
      }
      return html.replace("<!-- STATIC_CONTENT -->", staticContent);
    },
  };
}

/**
 * Drops branches of data files the page never reads (other measures, sectors, years) from the bundle.
 * The data files themselves are untouched; tests run the same model on the full files.
 */
const PRUNE: Record<string, (data: Record<string, unknown>) => void> = {
  "data/de/laender/functions-2022.json": (data) => {
    const scopes = data.scopes_data as Record<string, Record<string, { measures: Record<string, unknown> }>>;
    delete scopes.municipal;
    for (const scope of Object.values(scopes)) {
      for (const entry of Object.values(scope)) {
        entry.measures = { adjusted: entry.measures.adjusted };
      }
    }
  },
  "data/de/government/cofog.json": (data) => {
    data.rows = (data.rows as { sector: string }[]).filter((row) => row.sector === "S13");
  },
  "data/de/citizen/household-indirect-taxes.json": (data) => {
    for (const cls of Object.values(data.classes as Record<string, Record<string, unknown>>)) {
      delete cls.items;
    }
  },
  "data/de/social-insurance/accounts.json": (data) => {
    for (const system of Object.values(data.systems as Record<string, { years: Record<string, unknown> }>)) {
      delete system.years["2025"];
    }
    data.transfers = (data.transfers as { year: number }[]).filter((tr) => tr.year === 2024);
  },
};

function pruneData(): Plugin {
  return {
    name: "prune-data",
    enforce: "pre",
    async load(id) {
      const path = Object.keys(PRUNE).find((candidate) => id.split("?")[0]!.endsWith(candidate));
      if (!path) {
        return null;
      }
      const data = JSON.parse(await readFile(id.split("?")[0]!, "utf8")) as Record<string, unknown>;
      PRUNE[path]!(data);
      return JSON.stringify(data);
    },
  };
}

// GitHub Pages serves the project at https://<owner>.github.io/where-is-the-tax/.
// BASE_PATH overrides it (e.g. "/" for a custom domain).
export default defineConfig(({ command, isPreview }) => ({
  base: command === "build" || isPreview ? (process.env.BASE_PATH ?? "/where-is-the-tax/") : "/",
  plugins: [pruneData(), buildTimeContent()],
  // data/ is imported as JSON; JSON.parse of a string literal is faster than an object literal
  json: { stringify: true },
  build: {
    chunkSizeWarningLimit: 1200,
  },
}));
