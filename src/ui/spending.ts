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

/** Ranked composition of a recipient budget — the real data beyond the boundary. */
export function renderSpendingAccount(account: SpendingAccount): string {
  const max = account.groups[0]?.amount_eur ?? 1;
  const rows = account.groups
    .map((group) => {
      const width = ((group.amount_eur / max) * 100).toFixed(1);
      const share = ((group.amount_eur / account.total_eur) * 100).toFixed(1);
      return `
        <li class="spend-row" title="${escapeHtml(`${group.name_de} — ${group.description}`)}">
          <span class="spend-name">${escapeHtml(group.name)}</span>
          <span class="spend-value">${escapeHtml(formatMoney(group.amount_eur / 1e6, "million EUR"))} · ${escapeHtml(share)}%</span>
          <span class="spend-bar" aria-hidden="true"><span style="width: ${width}%"></span></span>
        </li>`;
    })
    .join("");

  return `
    <div class="spending-account">
      <h4>${escapeHtml(account.title)}</h4>
      <p class="spend-total">Whole budget: ${escapeHtml(formatMoney(account.total_eur / 1e6, "million EUR"))} — every euro of revenue paid for this together.</p>
      <ol class="spend-list">${rows}</ol>
      <p class="spend-footnote">${escapeHtml(account.basis)} ${
        account.unassigned_eur > 0
          ? `${escapeHtml(formatMoney(account.unassigned_eur / 1e6, "million EUR"))} carries no function code.`
          : ""
      } Source: <a href="${escapeHtml(account.source.url)}" rel="noreferrer noopener" target="_blank">${escapeHtml(
        account.source.label,
      )}</a>.</p>
    </div>`;
}
