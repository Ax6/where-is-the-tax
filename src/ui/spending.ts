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

export type SpendingKey = "federation" | "berlin";
export type SpendingMode = "combined" | SpendingKey;

export interface SpendingEntry {
  key: SpendingKey;
  shortName: string;
  account: SpendingAccount;
  inflow?: RouteInflow;
}

/** Neutral row labels for the combined view (per Funktionenplan Hauptfunktion). */
const COMBINED_LABELS: Record<string, string> = {
  "0": "General services & defence",
  "1": "Education, science & culture",
  "2": "Social security & family",
  "3": "Health, environment & sport",
  "4": "Housing & urban development",
  "5": "Food, agriculture & forests",
  "6": "Energy, business & services",
  "7": "Transport & communications",
  "8": "Interest, debt & financial assets",
  "9": "General financial management",
};

function euros(amount: number): string {
  return formatMoney(amount / 1e6, "million EUR");
}

function sharePercent(part: number, whole: number): string {
  const share = (part / whole) * 100;
  return `${share.toFixed(share >= 1 ? 1 : 2)}%`;
}

function bridgeLine(entry: SpendingEntry): string {
  if (!entry.inflow) {
    return "";
  }
  const share = (entry.inflow.eur / entry.account.total_eur) * 100;
  const digits = share >= 1 ? 1 : 2;
  return `<p class="spend-bridge"><span class="spend-dot spend-dot-${entry.key}" aria-hidden="true"></span>The route you followed (${escapeHtml(
    entry.inflow.routeLabel,
  )}) delivered ${escapeHtml(euros(entry.inflow.eur))} into the ${escapeHtml(entry.shortName)} budget — ${escapeHtml(
    share.toFixed(digits),
  )}% of it. The rest arrived from other taxes, transfers, fees and borrowing.</p>`;
}

/**
 * One combined composition for every loaded recipient budget of the route.
 * Stacked segments per function; click a budget chip (or segment) to isolate it.
 */
export function renderSpendingPanel(entries: SpendingEntry[], mode: SpendingMode): string {
  if (entries.length === 0) {
    return "";
  }
  const active = mode === "combined" ? entries : entries.filter((entry) => entry.key === mode);
  const shown = active.length > 0 ? active : entries;
  const grandTotal = shown.reduce((sum, entry) => sum + entry.account.total_eur, 0);

  const rows = new Map<string, { label: string; total: number; segments: { key: SpendingKey; amount: number; name: string }[] }>();
  for (const entry of shown) {
    for (const group of entry.account.groups) {
      const row = rows.get(group.code) ?? {
        label: shown.length > 1 ? (COMBINED_LABELS[group.code] ?? group.name) : group.name,
        total: 0,
        segments: [],
      };
      row.total += group.amount_eur;
      row.segments.push({ key: entry.key, amount: group.amount_eur, name: `${entry.shortName}: ${euros(group.amount_eur)}` });
      rows.set(group.code, row);
    }
  }
  const sorted = [...rows.values()].sort((a, b) => b.total - a.total);
  const max = sorted[0]?.total ?? 1;

  const chips =
    entries.length > 1
      ? `<div class="spend-modes" role="group" aria-label="Choose which budget to show">
          <button type="button" data-spend-mode="combined" aria-pressed="${mode === "combined"}">Both budgets · ${escapeHtml(
            euros(entries.reduce((sum, entry) => sum + entry.account.total_eur, 0)),
          )}</button>
          ${entries
            .map(
              (entry) =>
                `<button type="button" data-spend-mode="${entry.key}" aria-pressed="${mode === entry.key}"><span class="spend-dot spend-dot-${entry.key}" aria-hidden="true"></span>${escapeHtml(
                  entry.shortName,
                )} · ${escapeHtml(euros(entry.account.total_eur))}</button>`,
            )
            .join("")}
        </div>`
      : "";

  const caveat =
    shown.length > 1
      ? `<p class="spend-caveat">Adding the two budgets counts at least €1.86bn of federal grants to Berlin twice — netting comes with the transfer ledger.</p>`
      : "";

  const list = sorted
    .map((row) => {
      const segments = row.segments
        .map(
          (segment) =>
            `<button type="button" class="spend-seg spend-seg-${segment.key}" data-spend-mode="${
              shown.length > 1 ? segment.key : "combined"
            }" style="width: ${((segment.amount / max) * 100).toFixed(2)}%" title="${escapeHtml(segment.name)}" aria-label="${escapeHtml(
              `${row.label} — ${segment.name}`,
            )}"></button>`,
        )
        .join("");
      return `
        <li class="spend-row">
          <span class="spend-name">${escapeHtml(row.label)}</span>
          <span class="spend-value">${escapeHtml(euros(row.total))} · ${escapeHtml(sharePercent(row.total, grandTotal))}</span>
          <span class="spend-bar">${segments}</span>
        </li>`;
    })
    .join("");

  const footnotes = shown
    .map(
      (entry) =>
        `<p class="spend-footnote"><span class="spend-dot spend-dot-${entry.key}" aria-hidden="true"></span>${escapeHtml(
          entry.account.basis,
        )} Source: <a href="${escapeHtml(entry.account.source.url)}" rel="noreferrer noopener" target="_blank">${escapeHtml(
          entry.account.source.label,
        )}</a>.</p>`,
    )
    .join("");

  const heading =
    shown.length > 1
      ? `What the loaded budgets spent in 2024`
      : `${shown[0]!.shortName} budget — actual spending ${shown[0]!.account.reference_year}`;

  return `
    <div class="spending-account">
      <h4>${escapeHtml(heading)}</h4>
      ${chips}
      ${caveat}
      ${shown.map((entry) => bridgeLine(entry)).join("")}
      <ol class="spend-list">${list}</ol>
      ${footnotes}
    </div>`;
}
