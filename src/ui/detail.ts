import type { DatasetBundle } from "../data/load.ts";
import type { DatasetRow, DatasetSide, ProvenanceRecord } from "../data/schema.ts";
import { formatMoney, formatStatus } from "../format.ts";
import { escapeHtml } from "./static-page.ts";

export interface DetailRequest {
  provenanceId?: string;
  side?: DatasetSide;
  rowId?: string;
}

function definitionList(entries: Array<[string, string]>): string {
  return entries
    .map(([term, description]) => `<div><dt>${escapeHtml(term)}</dt><dd>${escapeHtml(description)}</dd></div>`)
    .join("");
}

function listOrNone(values: string[]): string {
  return values.length === 0 ? "None recorded" : values.join("; ");
}

function findRow(bundle: DatasetBundle, side: DatasetSide | null, rowId: string | null): DatasetRow | null {
  if (!side || !rowId) {
    return null;
  }
  const rows = side === "revenue" ? bundle.revenue : side === "expenditure" ? bundle.expenditure : [];
  return rows.find(({ id }) => id === rowId) ?? null;
}

function provenanceSummary(bundle: DatasetBundle, provenance: ProvenanceRecord): string {
  if (provenance.kind === "derived") {
    const terms = provenance.formula.terms
      .map(({ provenance_id: id, coefficient }) => {
        const input = bundle.provenance.find((record) => record.id === id);
        const inputValue = input && input.kind !== "unavailable" ? formatMoney(input.displayed_value, bundle.meta.amount_unit) : "unavailable";
        const operation = coefficient === 1 ? "+" : coefficient === -1 ? "−" : `× ${coefficient}`;
        return `<li><code>${escapeHtml(id)}</code> <span>${escapeHtml(operation)}</span> ${escapeHtml(inputValue)}</li>`;
      })
      .join("");
    const constant = provenance.formula.constant === 0
      ? ""
      : `<li><code>constant</code> ${escapeHtml(formatMoney(provenance.formula.constant, bundle.meta.amount_unit))}</li>`;

    return `
      <section class="detail-block">
        <h3>Calculation</h3>
        <p>This value is calculated from compatible, separately provenanced observations.</p>
        <ul class="formula-list">${terms}${constant}</ul>
        <dl>${definitionList([
          ["Formula", provenance.formula.operator.replaceAll("_", " ")],
          ["Constant", formatMoney(provenance.formula.constant, bundle.meta.amount_unit)],
          ["Rounding", `${provenance.rounding_rule.mode} to ${provenance.rounding_rule.increment}`],
          ["Sign convention", provenance.sign_convention],
          ["Caveats", listOrNone(provenance.caveats)],
          ["Review", formatStatus(provenance.review.status)],
        ])}</dl>
      </section>`;
  }

  if (provenance.kind === "unavailable") {
    return `
      <section class="detail-block">
        <h3>Why no value appears</h3>
        <p>${escapeHtml(provenance.reason)}</p>
        <dl>${definitionList([
          ["Availability", formatStatus(provenance.availability)],
          ["Coordinates", listOrNone(Object.entries(provenance.coordinates).map(([key, value]) => `${key}=${value}`))],
          ["Caveats", listOrNone(provenance.caveats)],
          ["Review", formatStatus(provenance.review.status)],
        ])}</dl>
      </section>`;
  }

  const extraction = bundle.extractions.find(({ id }) => id === provenance.extraction_id);
  const source = extraction ? bundle.sources.find(({ id }) => id === extraction.source_id) : undefined;
  const coordinates = Object.entries(provenance.coordinates)
    .map(([key, value]) => `${key}=${value}`)
    .join(", ");

  return `
    <section class="detail-block">
      <h3>Exact source observation</h3>
      ${
        source
          ? `<p class="source-title"><strong>${escapeHtml(source.institution)}</strong><br>${escapeHtml(source.title)}</p>
             <p><a href="${escapeHtml(source.landing_page)}" target="_blank" rel="noreferrer">Open source landing page <span aria-hidden="true">↗</span></a></p>`
          : "<p>Source identity could not be resolved.</p>"
      }
      <dl>${definitionList([
        ["Dataset", extraction?.dataset_id ?? "Unknown"],
        ["Coordinates", coordinates || "—"],
        ["Raw value", String(provenance.raw_value)],
        ["Unit", extraction?.context.unit ?? bundle.meta.amount_unit],
        ["Reference period", extraction?.context.reference_period ?? String(bundle.meta.reference_year)],
        ["Accounting frame", extraction ? `${extraction.context.accounting_basis}; ${extraction.context.sector}; ${extraction.context.consolidation}` : "Unknown"],
        ["Vintage", extraction?.context.vintage ?? "Unknown"],
        ["Official flags", listOrNone(provenance.official_status_flags)],
        ["Mapping", formatStatus(provenance.mapping)],
        ["Sign convention", provenance.sign_convention],
        ["Release", extraction?.release_date ?? "Unknown"],
        ["Retrieved", extraction?.retrieved_at ?? "Unknown"],
        ["Caveats", listOrNone([...extraction?.caveats ?? [], ...provenance.caveats])],
        ["Review", formatStatus(provenance.review.status)],
      ])}</dl>
      ${
        source
          ? `<p class="licence-note"><strong>Reuse:</strong> ${escapeHtml(source.licence.name)} · ${escapeHtml(source.licence.attribution)}</p>`
          : ""
      }
    </section>`;
}

export function renderDetail(
  bundle: DatasetBundle,
  request: DetailRequest,
): string {
  const row = findRow(bundle, request.side ?? null, request.rowId ?? null);
  const provenanceId = request.provenanceId ?? row?.provenance_id;
  const provenance = bundle.provenance.find(({ id }) => id === provenanceId);

  if (!provenance) {
    return `<header class="dialog-header"><p class="eyebrow">Source detail</p><h2 id="detail-title">Detail unavailable</h2><p>The requested provenance record could not be found.</p></header>`;
  }

  const title = row?.name ?? (provenance.id === bundle.meta.headline.revenue_provenance_id
    ? "Total revenue"
    : provenance.id === bundle.meta.headline.expenditure_provenance_id
      ? "Total expenditure"
      : "Net lending / net borrowing");
  const displayedValue = provenance.kind === "unavailable" ? formatStatus(provenance.availability) : formatMoney(provenance.displayed_value, bundle.meta.amount_unit);
  const status = provenance.kind === "unavailable" ? provenance.availability : provenance.quality;

  return `
    <header class="dialog-header">
      <p class="eyebrow">${escapeHtml(formatStatus(provenance.kind))} · ${escapeHtml(formatStatus(status))}</p>
      <h2 id="detail-title">${escapeHtml(title)}</h2>
      <strong class="dialog-amount">${escapeHtml(displayedValue)}</strong>
      ${row ? `<p>${escapeHtml(row.description)}</p>` : ""}
    </header>
    ${provenanceSummary(bundle, provenance)}
    <p class="prototype-dialog-note"><strong>Synthetic fixture:</strong> this provenance demonstrates the interface contract; it is not official evidence.</p>`;
}
