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

/** Chips to switch which budget is shown beyond the boundary. */
export function renderSpendingChips(entries: SpendingEntry[], activeKey: SpendingKey | null): string {
  if (entries.length < 2 && activeKey !== null) {
    return "";
  }
  return `<div class="spend-modes" role="group" aria-label="Choose which budget to show">
    ${entries
      .map(
        (entry) =>
          `<button type="button" data-spend-mode="${entry.key}" aria-pressed="${activeKey === entry.key}"><span class="spend-dot spend-dot-${entry.key}" aria-hidden="true"></span>${escapeHtml(
            entry.shortName,
          )} budget · ${escapeHtml(euros(entry.account.total_eur))}</button>`,
      )
      .join("")}
  </div>`;
}

/** One budget's actual spending by function — the display beyond the boundary. */
export function renderSpendingPanel(entry: SpendingEntry): string {
  const max = entry.account.groups[0]?.amount_eur ?? 1;
  const rows = entry.account.groups
    .map((group) => {
      const share = (group.amount_eur / entry.account.total_eur) * 100;
      return `
        <li class="spend-row" title="${escapeHtml(`${group.name_de} — ${group.description}`)}">
          <span class="spend-name">${escapeHtml(group.name)}</span>
          <span class="spend-value">${escapeHtml(euros(group.amount_eur))} · ${escapeHtml(share.toFixed(share >= 1 ? 1 : 2))}%</span>
          <span class="spend-bar"><span class="spend-seg spend-seg-${entry.key}" style="width: ${((group.amount_eur / max) * 100).toFixed(2)}%"></span></span>
        </li>`;
    })
    .join("");

  return `
    <div class="spending-account">
      <h4>${escapeHtml(entry.account.title)}</h4>
      <p class="spend-total">Whole budget: ${escapeHtml(euros(entry.account.total_eur))} — every euro of revenue paid for this together.</p>
      ${bridgeLine(entry)}
      <ol class="spend-list">${rows}</ol>
      <p class="spend-footnote">${escapeHtml(entry.account.basis)} ${
        entry.account.unassigned_eur > 0 ? `${escapeHtml(euros(entry.account.unassigned_eur))} carries no function code.` : ""
      } Source: <a href="${escapeHtml(entry.account.source.url)}" rel="noreferrer noopener" target="_blank">${escapeHtml(
        entry.account.source.label,
      )}</a>.</p>
    </div>`;
}
