import { formatMoney, formatShare, formatStatus } from "../format.ts";
import type { ExplorerModel, ExplorerSide } from "../data/model.ts";
import type { DatasetRow, DatasetSide, ProvenanceRecord } from "../data/schema.ts";

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function detailHref(side: DatasetSide, id: string): string {
  return `#record-${side}-${id}`;
}

function renderRankedRows(
  sideName: DatasetSide,
  side: ExplorerSide,
  amountUnit: string,
): string {
  return side.nodes
    .map((node, index) => {
      const width = side.maxAmount === 0 ? 0 : Math.max(0, (Math.abs(node.amount) / side.maxAmount) * 100);
      return `
        <li class="rank-row">
          <a class="rank-link" href="${detailHref(sideName, node.id)}" data-detail-side="${sideName}" data-detail-id="${escapeHtml(node.id)}">
            <span class="rank-number" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span>
            <span class="rank-copy">
              <span class="rank-name">${escapeHtml(node.name)}</span>
              <span class="rank-bar" aria-hidden="true"><span style="--bar-width: ${width.toFixed(2)}%"></span></span>
            </span>
            <span class="rank-value">
              <strong>${escapeHtml(formatMoney(node.amount, amountUnit))}</strong>
              <small>${escapeHtml(formatShare(node.amount, side.total))}</small>
            </span>
          </a>
        </li>`;
    })
    .join("");
}

function renderPoolList(sideName: DatasetSide, side: ExplorerSide, amountUnit: string): string {
  return side.nodes
    .map(
      (node) => `
        <li>
          <a href="${detailHref(sideName, node.id)}" data-detail-side="${sideName}" data-detail-id="${escapeHtml(node.id)}">
            <span>${escapeHtml(node.name)}</span>
            <strong>${escapeHtml(formatMoney(node.amount, amountUnit))}</strong>
          </a>
        </li>`,
    )
    .join("");
}

function renderCoverage(sideName: DatasetSide, rows: DatasetRow[]): string {
  if (rows.length === 0) {
    return "";
  }
  const items = rows
    .map(
      (row) => `<li><a href="${detailHref(sideName, row.id)}" data-detail-side="${sideName}" data-detail-id="${escapeHtml(row.id)}">${escapeHtml(row.name)}</a> — ${escapeHtml(formatStatus(row.availability))}</li>`,
    )
    .join("");
  return `<aside class="coverage-note" aria-label="Unavailable ${sideName} categories"><strong>Coverage note</strong><ul>${items}</ul><p>These categories are known to the dataset but excluded from bars, totals, and percentages.</p></aside>`;
}

function sourceLabelForProvenance(model: ExplorerModel, provenance: ProvenanceRecord | undefined): string {
  if (!provenance) {
    return "Missing provenance";
  }
  if (provenance.kind === "derived") {
    return "Derived from listed inputs";
  }
  if (provenance.extraction_id === null) {
    return "Unavailable observation";
  }
  const extraction = model.bundle.extractions.find(({ id }) => id === provenance.extraction_id);
  const source = extraction ? model.bundle.sources.find(({ id }) => id === extraction.source_id) : undefined;
  return source ? `${source.institution} — ${source.title}` : "Source record unavailable";
}

function renderTableRows(
  model: ExplorerModel,
  sideName: DatasetSide,
  rows: DatasetRow[],
): string {
  return rows
    .map((row) => {
      const amount = row.amount === null ? formatStatus(row.availability) : formatMoney(row.amount, model.bundle.meta.amount_unit);
      const quality = row.quality === null ? "—" : formatStatus(row.quality);
      const provenance = model.bundle.provenance.find(({ id }) => id === row.provenance_id);
      return `
        <tr id="record-${sideName}-${escapeHtml(row.id)}">
          <th scope="row">${escapeHtml(row.name)}</th>
          <td>${escapeHtml(sideName === "revenue" ? "Revenue" : "Expenditure")}</td>
          <td class="numeric">${escapeHtml(amount)}</td>
          <td>${escapeHtml(quality)}</td>
          <td>${escapeHtml(provenance ? formatStatus(provenance.kind) : "Unknown")}</td>
          <td>${escapeHtml(sourceLabelForProvenance(model, provenance))}</td>
        </tr>`;
    })
    .join("");
}

function renderHeadlineRow(
  model: ExplorerModel,
  id: string,
  label: string,
  side: string,
): string {
  const provenance = model.bundle.provenance.find((record) => record.id === id);
  if (!provenance || provenance.kind === "unavailable") {
    throw new Error(`Headline ${id} must have an available provenance record.`);
  }
  return `
    <tr id="record-headline-${escapeHtml(side.toLowerCase().replaceAll(" ", "-"))}" class="headline-table-row">
      <th scope="row">${escapeHtml(label)}</th>
      <td>${escapeHtml(side)}</td>
      <td class="numeric">${escapeHtml(formatMoney(provenance.displayed_value, model.bundle.meta.amount_unit))}</td>
      <td>${escapeHtml(formatStatus(provenance.quality))}</td>
      <td>${escapeHtml(formatStatus(provenance.kind))}</td>
      <td>${escapeHtml(sourceLabelForProvenance(model, provenance))}</td>
    </tr>`;
}

function balanceExplanation(model: ExplorerModel): string {
  if (model.balance < 0) {
    return `Spending exceeds revenue by ${formatMoney(Math.abs(model.balance), model.bundle.meta.amount_unit)} in this fixture.`;
  }
  if (model.balance > 0) {
    return `Revenue exceeds spending by ${formatMoney(model.balance, model.bundle.meta.amount_unit)} in this fixture.`;
  }
  return "Revenue and spending are equal in this fixture.";
}

function summaryCard(
  label: string,
  amount: string,
  note: string,
  provenanceId: string,
  tone: "revenue" | "expenditure" | "balance",
  fallbackHref: string,
): string {
  return `
    <article class="summary-item summary-${tone}">
      <p>${escapeHtml(label)}</p>
      <a href="${escapeHtml(fallbackHref)}" data-provenance-id="${escapeHtml(provenanceId)}" aria-label="Inspect provenance for ${escapeHtml(label)}">
        <strong>${escapeHtml(amount)}</strong>
        <span>Inspect source</span>
      </a>
      <small>${escapeHtml(note)}</small>
    </article>`;
}

export function renderStaticPage(model: ExplorerModel): string {
  const { bundle } = model;
  const { meta } = bundle;
  const balanceAmount = formatMoney(model.balance, meta.amount_unit);
  const revenueRows = renderRankedRows("revenue", model.revenue, meta.amount_unit);
  const expenditureRows = renderRankedRows("expenditure", model.expenditure, meta.amount_unit);
  const tableRows = [
    renderHeadlineRow(model, meta.headline.revenue_provenance_id, "Total revenue", "Revenue total"),
    renderHeadlineRow(model, meta.headline.expenditure_provenance_id, "Total expenditure", "Expenditure total"),
    renderHeadlineRow(model, meta.headline.balance_provenance_id, model.balanceLabel, "Balance"),
    renderTableRows(model, "revenue", bundle.revenue),
    renderTableRows(model, "expenditure", bundle.expenditure),
  ].join("");

  return `
    <a class="skip-link" href="#explorer">Skip to the data</a>
    <div class="prototype-banner" role="note">
      <strong>Internal explanation prototype</strong>
      <span>Every figure on this page is invented test data—not a claim about Germany.</span>
    </div>

    <header class="site-header">
      <a class="wordmark" href="#top" aria-label="Where is the tax? Home">Where is the tax?</a>
      <nav aria-label="Page sections">
        <a href="#explorer">Explore</a>
        <a href="#methodology">How to read this</a>
        <a href="#data-table">Data table</a>
      </nav>
    </header>

    <section class="hero" id="top" aria-labelledby="page-title">
      <p class="eyebrow">Germany · ${meta.reference_year} · synthetic fixture</p>
      <h1 id="page-title">Public money,<br><em>without the maze.</em></h1>
      <p class="hero-lede">See where general-government revenue comes from and what public money is spent on—inside one consistent accounting frame.</p>
      <p class="hero-rule"><strong>Read the two sides together, but never as direct flows.</strong> A named tax is not being matched to a named service.</p>
    </section>

    <section class="summary" aria-labelledby="summary-title">
      <div class="section-heading">
        <p class="eyebrow">The whole system</p>
        <h2 id="summary-title">Three numbers set the frame</h2>
      </div>
      <div class="summary-grid">
        ${summaryCard("Total revenue", formatMoney(model.revenue.total, meta.amount_unit), "Money received across consolidated general government", meta.headline.revenue_provenance_id, "revenue", "#record-headline-revenue-total")}
        ${summaryCard("Total expenditure", formatMoney(model.expenditure.total, meta.amount_unit), "Spending across consolidated general government", meta.headline.expenditure_provenance_id, "expenditure", "#record-headline-expenditure-total")}
        ${summaryCard(model.balanceLabel, balanceAmount, `${balanceExplanation(model)} Not the change in debt.`, meta.headline.balance_provenance_id, "balance", "#record-headline-balance")}
      </div>
      <dl class="scope-line">
        <div><dt>Scope</dt><dd>ESA 2010 · S.13</dd></div>
        <div><dt>Coverage</dt><dd>Consolidated general government</dd></div>
        <div><dt>Source status</dt><dd>${escapeHtml(formatStatus(meta.publication_status))} (simulated)</dd></div>
      </dl>
    </section>

    <section class="explorer" id="explorer" aria-labelledby="explorer-title">
      <div class="explorer-head">
        <div class="section-heading">
          <p class="eyebrow">One system, two classifications</p>
          <h2 id="explorer-title">Where it comes from. Where it goes.</h2>
        </div>
        <div class="view-switch" aria-label="Choose an explanation view" hidden>
          <button type="button" data-view="ranked" aria-pressed="true">Ranked</button>
          <button type="button" data-view="pool" aria-pressed="false">System pool</button>
        </div>
      </div>

      <div class="non-earmarking-note" role="note">
        <span aria-hidden="true">↔</span>
        <p><strong>No category-to-category links.</strong> Revenue is largely pooled; the right side classifies spending by purpose.</p>
      </div>

      <div class="view" data-view-panel="ranked">
        <div class="ledger-grid">
          <article class="ledger ledger-revenue" aria-labelledby="revenue-title">
            <header>
              <div><p class="side-label">Where it comes from</p><h3 id="revenue-title">Revenue</h3></div>
              <strong>${escapeHtml(formatMoney(model.revenue.total, meta.amount_unit))}</strong>
            </header>
            <ol class="rank-list">${revenueRows}</ol>
            ${renderCoverage("revenue", model.revenue.coverage)}
          </article>
          <article class="ledger ledger-expenditure" aria-labelledby="expenditure-title">
            <header>
              <div><p class="side-label">Where it goes</p><h3 id="expenditure-title">Expenditure</h3></div>
              <strong>${escapeHtml(formatMoney(model.expenditure.total, meta.amount_unit))}</strong>
            </header>
            <ol class="rank-list">${expenditureRows}</ol>
            ${renderCoverage("expenditure", model.expenditure.coverage)}
          </article>
        </div>
        <p class="view-caption">Bars are ranked within each side. Percentages use that side's total; bar lengths use the largest category on that side.</p>
      </div>

      <div class="view pool-view" data-view-panel="pool" hidden>
        <div class="pool-grid">
          <article class="pool-side pool-revenue">
            <p class="side-label">Sources of revenue</p>
            <ul>${renderPoolList("revenue", model.revenue, meta.amount_unit)}</ul>
            ${renderCoverage("revenue", model.revenue.coverage)}
          </article>
          <article class="system-pool" aria-labelledby="pool-title">
            <p class="eyebrow">Accounting-safe alternative</p>
            <h3 id="pool-title">The public-finance pool</h3>
            <p>Revenue enters a shared system. Expenditure leaves it classified by function. The gap is recorded as ${model.balanceLabel.toLowerCase()}.</p>
            <dl>
              <div><dt>In</dt><dd>${escapeHtml(formatMoney(model.revenue.total, meta.amount_unit))}</dd></div>
              <div><dt>Out</dt><dd>${escapeHtml(formatMoney(model.expenditure.total, meta.amount_unit))}</dd></div>
              <div><dt>Gap</dt><dd>${escapeHtml(balanceAmount)}</dd></div>
            </dl>
            <strong class="pool-warning">No implied earmarking</strong>
          </article>
          <article class="pool-side pool-expenditure">
            <p class="side-label">Purposes of spending</p>
            <ul>${renderPoolList("expenditure", model.expenditure, meta.amount_unit)}</ul>
            ${renderCoverage("expenditure", model.expenditure.coverage)}
          </article>
        </div>
        <p class="view-caption">This composition is more expressive, but deliberately draws no lines between individual categories.</p>
      </div>
    </section>

    <section class="methodology" id="methodology" aria-labelledby="methodology-title">
      <div class="section-heading">
        <p class="eyebrow">How to read this</p>
        <h2 id="methodology-title">Three guardrails against a tidy but false story</h2>
      </div>
      <div class="guardrail-grid">
        <article><span>01</span><h3>One accounting frame</h3><p>Both totals cover consolidated general government under ESA 2010, sector S.13. Internal transfers are not added twice.</p></article>
        <article><span>02</span><h3>No tax receipt fiction</h3><p>The categories answer different questions. They do not trace a euro from a specific tax into a specific service.</p></article>
        <article><span>03</span><h3>Balance is not debt change</h3><p>Revenue minus expenditure gives net lending or borrowing. Debt can also move through financial transactions and valuation effects.</p></article>
      </div>
    </section>

    <section class="data-table-section" id="data-table" aria-labelledby="data-table-title">
      <div class="section-heading">
        <p class="eyebrow">Inspect the fixture</p>
        <h2 id="data-table-title">Data table</h2>
        <p>This table is written into the HTML at build time. It remains available without JavaScript and makes the source status explicit.</p>
      </div>
      <div class="table-scroll" tabindex="0" aria-label="Scrollable synthetic data table">
        <table>
          <caption>Synthetic category observations for the interface prototype</caption>
          <thead><tr><th scope="col">Category</th><th scope="col">Side</th><th scope="col">Amount</th><th scope="col">Status</th><th scope="col">Origin</th><th scope="col">Source</th></tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    </section>

    <footer>
      <p><strong>Prototype boundary:</strong> the interface is being tested before official Germany research begins. ${escapeHtml(meta.quality_notes.join(" "))}</p>
      <p>Every displayed category carries status and provenance metadata.</p>
    </footer>

    <dialog id="detail-dialog" aria-labelledby="detail-title">
      <div data-dialog-content></div>
      <form method="dialog"><button type="submit" class="dialog-close">Close</button></form>
    </dialog>`;
}
