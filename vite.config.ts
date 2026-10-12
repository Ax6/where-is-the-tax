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
/** Federal budget: the page reads the functional tree, the official total, status and the source links. */
const pruneFederal = (data: Record<string, unknown>): void => {
  for (const key of Object.keys(data)) {
    if (!["schema_version", "id", "year", "status", "official_total_eur", "hauptfunktionen", "key_items", "sources"].includes(key)) {
      delete data[key];
    }
  }
};

/** Equalisation: per Land only the totals the map, ranking and drawers read; no Destatis comparison block. */
const pruneEqualisation = (data: Record<string, unknown>): void => {
  delete data.destatis_comparison;
  type V = { value: number } | undefined;
  data.laender = (data.laender as Record<string, Record<string, Record<string, V> | unknown>>[]).map((land) => {
    const fka = land.fka as Record<string, V>;
    const bez = land.bez as Record<string, V>;
    const bases = land.tax_bases as Record<string, V>;
    const vat = land.vat_share as Record<string, V>;
    return {
      code: land.code,
      name: land.name,
      city_state: land.city_state,
      population: { value: (land.population as { value: number }).value },
      per_resident: { fka_plus_bez: (land.per_resident as { fka_plus_bez: number }).fka_plus_bez },
      vat_share: { total: vat.total },
      fka: { adjustment: fka.adjustment, fiscal_strength_after_fka_pct: fka.fiscal_strength_after_fka_pct },
      bez: { total: bez.total, fiscal_strength_after_sobez_pct: bez.fiscal_strength_after_sobez_pct },
      tax_bases: { fiscal_strength_before_fka_pct: bases.fiscal_strength_before_fka_pct },
    };
  });
};

const PRUNE: Record<string, (data: Record<string, unknown>) => void> = {
  "data/de/federal/budget-2024.json": pruneFederal,
  "data/de/federal/budget-2025.json": pruneFederal,
  "data/de/equalisation/2024.json": pruneEqualisation,
  "data/de/equalisation/2025.json": pruneEqualisation,
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
    // the page shows 2024 and 2025 (year control); older years are not read
    for (const system of Object.values(data.systems as Record<string, { years: Record<string, unknown> }>)) {
      for (const year of Object.keys(system.years)) {
        if (Number(year) < 2024) {
          delete system.years[year];
        }
      }
    }
    data.transfers = (data.transfers as { year: number }[]).filter((tr) => tr.year >= 2024);
    // health: the page reads the sickness funds' lines and the consolidated total only
    for (const year of Object.values((data.systems as Record<string, { years: Record<string, Record<string, unknown>> }>).health!.years)) {
      delete year.gesundheitsfonds;
      const consolidated = year.consolidated as { expenditure_total_eur?: number } | undefined;
      year.consolidated = { expenditure_total_eur: consolidated?.expenditure_total_eur };
    }
    delete data.checks;
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
    // the bundle carries the data the page reads; no code splitting needed for one page
    chunkSizeWarningLimit: 1400,
  },
}));
