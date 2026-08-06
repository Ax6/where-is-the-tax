import { formatMoney } from "../format.ts";
import { escapeHtml } from "./static-page.ts";

export interface SpendingGroup {
  code: string;
  name_de: string;
  name: string;
  description: string;
  amount_eur: number;
}

export interface SpendingAccount {
  title: string;
  reference_year: number;
  basis: string;
  source: { label: string; url: string };
  total_eur: number;
  unassigned_eur: number;
  groups: SpendingGroup[];
}

export interface RouteInflow {
  /** € the followed route delivered into this budget (2024). */
  eur: number;
  routeLabel: string;
}

export type SpendingKey =
  | "federation"
  | "berlin"
  | "land"
  | "laender"
  | "pension"
  | "health"
  | "ltc"
  | "unemployment";

export interface SpendingEntry {
  key: SpendingKey;
  shortName: string;
  account: SpendingAccount;
  inflow?: RouteInflow;
}

function euros(amount: number): string {
  return formatMoney(amount / 1e6, "million EUR");
}

function bridgeLine(entry: SpendingEntry): string {
  if (!entry.inflow) {
    return "";
  }
  const share = (entry.inflow.eur / entry.account.total_eur) * 100;
  const digits = share >= 1 ? 1 : 2;
  return `<p class="spend-bridge">The route you followed (${escapeHtml(entry.inflow.routeLabel)}) delivered ${escapeHtml(
    euros(entry.inflow.eur),
  )} into this budget — ${escapeHtml(share.toFixed(digits))}% of it. The rest arrived from other taxes, transfers, fees and borrowing.</p>`;
}

/**
 * One budget's actual spending by function — the display beyond the boundary.
 * Bars encode the share of this budget; the optional benchmark draws a tick at
 * the same category's share of the other budget (percent-vs-percent, never €).
 */
export function renderSpendingPanel(
  entry: SpendingEntry,
  benchmark?: SpendingEntry,
  comparisonOptions: SpendingEntry[] = benchmark ? [benchmark] : [],
): string {
  const shareOf = (group: SpendingGroup, account: SpendingAccount) => (group.amount_eur / account.total_eur) * 100;
  const benchmarkShares = new Map<string, number>();
  if (benchmark) {
    for (const group of benchmark.account.groups) {
      benchmarkShares.set(group.code, shareOf(group, benchmark.account));
    }
  }
  const scaleMax = Math.max(
    ...entry.account.groups.map((group) => shareOf(group, entry.account)),
    ...(benchmark ? [...benchmarkShares.values()] : [0]),
  );
  const rows = entry.account.groups
    .map((group) => {
      const share = shareOf(group, entry.account);
      const bench = benchmarkShares.get(group.code);
      const comparison =
        bench === undefined
          ? ""
          : `<span class="spend-bar spend-bar-comparison" aria-label="${escapeHtml(
               `${benchmark!.shortName} budget: ${bench.toFixed(bench >= 1 ? 1 : 2)}% of its spending goes here`,
             )}"><span class="spend-seg spend-seg-${benchmark!.key}" style="width: ${((bench / scaleMax) * 100).toFixed(2)}%"></span></span>
             <span class="spend-compare-value">${escapeHtml(benchmark!.shortName)} ${escapeHtml(
               bench.toFixed(bench >= 1 ? 1 : 2),
             )}%</span>`;
      return `
        <li class="spend-row" title="${escapeHtml(`${group.name_de} — ${group.description}`)}">
          <span class="spend-name">${escapeHtml(group.name)}</span>
          <span class="spend-value">${escapeHtml(euros(group.amount_eur))} · ${escapeHtml(share.toFixed(share >= 1 ? 1 : 2))}%</span>
          <span class="spend-bar spend-bar-primary"><span class="spend-seg spend-seg-${entry.key}" style="width: ${((share / scaleMax) * 100).toFixed(2)}%"></span></span>
          ${comparison}
        </li>`;
    })
    .join("");

  const benchNote = benchmark
    ? `<div class="spend-comparison-note">
         <label class="spend-compare-control"><span>Compare bars with</span><select data-spend-compare aria-label="Compare spending bars with another budget">${comparisonOptions
           .map(
             (option) =>
               `<option value="${option.key}"${option.key === benchmark.key ? " selected" : ""}>${escapeHtml(
                 option.shortName,
               )} budget</option>`,
           )
           .join("")}</select></label>
         <p class="spend-series-key"><span><i class="spend-key-swatch spend-key-${entry.key}" aria-hidden="true"></i>${escapeHtml(
           entry.shortName,
         )}</span><span><i class="spend-key-swatch spend-key-${benchmark.key}" aria-hidden="true"></i>Compared with ${escapeHtml(
           benchmark.shortName,
         )}</span></p>
         <p>The bars use the same scale. Budget responsibilities differ—for example, pensions are federal while schools are Länder business.</p>
       </div>`
    : "";

  return `
    <div class="spending-account">
      <h4>${escapeHtml(entry.shortName)} spending · ${escapeHtml(String(entry.account.reference_year))}</h4>
      <p class="spend-total">Total budget: ${escapeHtml(euros(entry.account.total_eur))}</p>
      ${bridgeLine(entry)}
      <ol class="spend-list">${rows}</ol>
      ${benchNote}
      <p class="budget-boundary-explainer"><strong>What changes here:</strong> once the tax reaches the budget, it is combined with all other revenue. These bars show how the whole budget was spent—not where this exact tax euro went.</p>
      <p class="spend-footnote">${escapeHtml(entry.account.basis)} ${
        entry.account.unassigned_eur > 0 ? `${escapeHtml(euros(entry.account.unassigned_eur))} carries no function code.` : ""
      } Source: <a href="${escapeHtml(entry.account.source.url)}" rel="noreferrer noopener" target="_blank">${escapeHtml(
        entry.account.source.label,
      )}</a>.</p>
    </div>`;
}
