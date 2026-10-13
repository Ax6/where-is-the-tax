/**
 * Accessibility audit: serves dist/ (run `npm run build` first) and runs axe-core in Chromium on both views,
 * both languages, both themes, the texture mode, an open drawer and mobile.
 * Used by tests/browser/a11y.test.ts and runnable on its own: `node --experimental-strip-types tests/browser/axe-audit.ts`.
 */
import { readFile, stat } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { createRequire } from "node:module";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const DIST = join(ROOT, "dist");
const BASE = "/where-is-the-tax/";
const require = createRequire(import.meta.url);
const AXE_SOURCE = await readFile(require.resolve("axe-core/axe.min.js"), "utf8");

export interface Scenario {
  name: string;
  hash: string;
  width: number;
  height: number;
  colorScheme?: "light" | "dark";
  forcedColors?: "active" | "none";
  action?: "open-settings";
}

export const SCENARIOS: Scenario[] = [];
for (const zoom of ["you", "germany"]) {
  for (const lang of ["en", "de"]) {
    for (const theme of ["light", "dark"] as const) {
      SCENARIOS.push({ name: `${zoom}-${lang}-${theme}-1440`, hash: `#zoom=${zoom}&lang=${lang}&theme=${theme}`, width: 1440, height: 900, colorScheme: theme });
    }
  }
  SCENARIOS.push({ name: `${zoom}-en-light-390`, hash: `#zoom=${zoom}&lang=en`, width: 390, height: 844 });
  SCENARIOS.push({ name: `${zoom}-en-dark-390`, hash: `#zoom=${zoom}&lang=en&theme=dark`, width: 390, height: 844, colorScheme: "dark" });
}
SCENARIOS.push({ name: "you-en-drawer-1440", hash: "#zoom=you&lang=en&land=BY&open=pot:pot-land", width: 1440, height: 900 });
SCENARIOS.push({ name: "you-en-2025-land-1440", hash: "#y=2025&lang=en&land=BE", width: 1440, height: 900 });
SCENARIOS.push({ name: "germany-de-2025-dark-1440", hash: "#y=2025&zoom=germany&lang=de&theme=dark", width: 1440, height: 900, colorScheme: "dark" });
SCENARIOS.push({ name: "you-en-highlight-1440", hash: "#y=2024&lang=en&hl=pension", width: 1440, height: 900 });
SCENARIOS.push({ name: "you-en-shopping-panel-1440", hash: "#y=2024&lang=en&open=panel:shopping", width: 1440, height: 900 });
SCENARIOS.push({ name: "you-de-ranking-panel-dark-1440", hash: "#y=2025&lang=de&theme=dark&land=BY&open=panel:ranking", width: 1440, height: 900, colorScheme: "dark" });
SCENARIOS.push({ name: "you-en-land-pot-drawer-1440", hash: "#y=2025&lang=en&land=HH&pot=pot-land&open=pot:pot-land", width: 1440, height: 900 });
SCENARIOS.push({ name: "you-en-payslip-drawer-1440", hash: "#y=2025&lang=en&open=node:gross", width: 1440, height: 900 });
SCENARIOS.push({ name: "you-en-shopping-panel-390", hash: "#y=2024&lang=en&open=panel:shopping", width: 390, height: 844 });
SCENARIOS.push({ name: "you-de-drawer-dark-1440", hash: "#zoom=you&lang=de&theme=dark&open=node:wagetax", width: 1440, height: 900, colorScheme: "dark" });
SCENARIOS.push({ name: "you-en-textures-1440", hash: "#zoom=you&lang=en&tex=1", width: 1440, height: 900 });
SCENARIOS.push({ name: "you-en-forced-colors-1440", hash: "#zoom=you&lang=en", width: 1440, height: 900, forcedColors: "active" });
SCENARIOS.push({ name: "you-de-settings-sheet-390", hash: "#zoom=you&lang=de", width: 390, height: 844, action: "open-settings" });

export interface Violation {
  scenario: string;
  id: string;
  impact: string;
  nodes: number;
  help: string;
  targets: string[];
}

const TYPES: Record<string, string> = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".woff2": "font/woff2" };

export async function serveDist(): Promise<{ server: Server; url: string }> {
  await stat(join(DIST, "index.html"));
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent((req.url ?? "/").split("?")[0]!);
    const rel = path.startsWith(BASE) ? path.slice(BASE.length) : path.replace(/^\//, "");
    const file = join(DIST, rel || "index.html");
    try {
      const body = await readFile(file);
      res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return { server, url: `http://127.0.0.1:${port}${BASE}` };
}

export async function audit(scenarios: Scenario[] = SCENARIOS): Promise<Violation[]> {
  const { server, url } = await serveDist();
  const browser = await chromium.launch();
  const out: Violation[] = [];
  try {
    for (const scenario of scenarios) {
      const context = await browser.newContext({
        viewport: { width: scenario.width, height: scenario.height },
        colorScheme: scenario.colorScheme ?? "light",
        forcedColors: scenario.forcedColors ?? "none",
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      await page.goto(url + scenario.hash, { waitUntil: "networkidle" });
      await page.waitForTimeout(300);
      if (scenario.action === "open-settings") {
        await page.click("#controls-toggle");
      }
      await page.addScriptTag({ content: AXE_SOURCE });
      const result = (await page.evaluate(async () => {
        const axe = (window as unknown as { axe: { run: (ctx: unknown, opts: unknown) => Promise<unknown> } }).axe;
        return axe.run(document, { resultTypes: ["violations"] });
      })) as { violations: { id: string; impact: string; help: string; nodes: { target: string[] }[] }[] };
      for (const violation of result.violations) {
        out.push({
          scenario: scenario.name,
          id: violation.id,
          impact: violation.impact,
          nodes: violation.nodes.length,
          help: violation.help,
          targets: violation.nodes.slice(0, 3).map((node) => node.target.join(" ")),
        });
      }
      await context.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const violations = await audit();
  const byRule = new Map<string, { impact: string; scenarios: number; nodes: number; help: string; example: string }>();
  for (const v of violations) {
    const entry = byRule.get(v.id) ?? { impact: v.impact, scenarios: 0, nodes: 0, help: v.help, example: v.targets[0] ?? "" };
    entry.scenarios += 1;
    entry.nodes += v.nodes;
    byRule.set(v.id, entry);
  }
  console.log(`${SCENARIOS.length} scenarios, ${violations.length} violations (rule × scenario)`);
  for (const [id, entry] of byRule) {
    console.log(`${entry.impact.padEnd(9)} ${id.padEnd(28)} scenarios ${String(entry.scenarios).padStart(2)} nodes ${String(entry.nodes).padStart(4)}  ${entry.help}  e.g. ${entry.example}`);
  }
}
