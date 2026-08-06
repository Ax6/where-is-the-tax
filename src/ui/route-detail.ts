import { formatMoney } from "../format.ts";
import {
  EDGE_KIND_LABELS,
  ENTITY_LABELS,
  STATUS_LABELS,
  type Route,
  type RouteEdge,
  type RouteNode,
  type SourceRef,
} from "../routes/data.ts";
import type { TaxEntry, TaxGroup } from "../routes/taxonomy.ts";
import { escapeHtml } from "./static-page.ts";

function weightLine(route: Route, weight: number): string {
  if (route.unit === "million_eur") {
    return `${formatMoney(weight, "million EUR")} (observed 2024)`;
  }
  const percent = weight * 100;
  return `${percent.toFixed(percent >= 10 ? 1 : 2)}% of this route`;
}

function sourceList(sources: SourceRef[]): string {
  const items = sources
    .map(
      (source) =>
        `<li><a href="${escapeHtml(source.url)}" rel="noreferrer noopener" target="_blank">${escapeHtml(source.label)}</a></li>`,
    )
    .join("");
  return `<ul class="detail-sources">${items}</ul>`;
}

function caveatList(caveats: string[] | undefined): string {
  if (!caveats || caveats.length === 0) {
    return "";
  }
  const items = caveats.map((caveat) => `<li>${escapeHtml(caveat)}</li>`).join("");
  return `
    <section class="detail-block detail-support detail-caveats-block">
      <h3>Caveats</h3>
      <ul class="detail-caveats">${items}</ul>
    </section>`;
}

function factsBlock(rows: [string, string][]): string {
  const items = rows
    .filter(([, value]) => value.length > 0)
    .map(([term, value]) => `<div><dt>${escapeHtml(term)}</dt><dd>${escapeHtml(value)}</dd></div>`)
    .join("");
  return `<dl class="detail-facts">${items}</dl>`;
}

export function renderNodeDetail(route: Route, node: RouteNode): string {
  return `
    <header class="dialog-header">
      <p class="eyebrow">${escapeHtml(route.chipTitle)} · node</p>
      <div class="dialog-title-row">
        <div>
          <h2 id="detail-title">${escapeHtml(node.label)}</h2>
          ${node.official ? `<p class="dialog-official">officially <em>${escapeHtml(node.official)}</em></p>` : ""}
        </div>
        <p class="dialog-summary">${escapeHtml(node.description)}</p>
      </div>
    </header>
    <div class="detail-grid">
      <section class="detail-block detail-facts-block">
        <h3>At a glance</h3>
        ${node.amountNote ? `<p class="detail-amount-note">${escapeHtml(node.amountNote)}</p>` : ""}
        ${factsBlock([
          ["Entity", route.entityLabels[node.entity]],
          ["Evidence", STATUS_LABELS[node.status]],
          ["Stage", route.stages[node.stage] ?? ""],
        ])}
      </section>
      <section class="detail-block detail-support detail-sources-block">
        <h3>Sources</h3>
        ${sourceList(node.sources)}
      </section>
      ${caveatList(node.caveats)}
    </div>`;
}

export function renderTaxDetail(group: TaxGroup, entry: TaxEntry, routeTitle?: string): string {
  return `
    <header class="dialog-header">
      <p class="eyebrow">${escapeHtml(group.title)}</p>
      <div class="dialog-title-row">
        <div>
          <h2 id="detail-title">${escapeHtml(entry.name)}</h2>
          ${entry.official ? `<p class="dialog-official">officially <em>${escapeHtml(entry.official)}</em></p>` : ""}
        </div>
        <p class="dialog-summary">${escapeHtml(entry.description)}</p>
      </div>
    </header>
    <div class="detail-grid">
      <section class="detail-block detail-facts-block">
        <h3>Where it goes, by law</h3>
        ${factsBlock([
          ["Split", entry.split],
          ["Amount", entry.amountNote ?? "National figure arrives with the verified dataset."],
        ])}
        ${
          entry.routeId && routeTitle
            ? `<p class="detail-route-link"><a href="#route/${escapeHtml(entry.routeId)}">Follow its full route: ${escapeHtml(routeTitle)} →</a></p>`
            : `<p class="detail-route-note">A full drawn route for this tax comes with a later dataset phase.</p>`
        }
      </section>
      <section class="detail-block detail-support detail-sources-block">
        <h3>Sources</h3>
        ${sourceList(entry.sources)}
      </section>
    </div>`;
}

export function renderEdgeDetail(route: Route, edge: RouteEdge, from: RouteNode, to: RouteNode): string {
  return `
    <header class="dialog-header">
      <p class="eyebrow">${escapeHtml(route.chipTitle)} · flow</p>
      <div class="dialog-title-row">
        <h2 id="detail-title">${escapeHtml(from.label)} → ${escapeHtml(to.label)}</h2>
        <p class="dialog-summary">${escapeHtml(edge.description)}</p>
      </div>
    </header>
    <div class="detail-grid">
      <section class="detail-block detail-facts-block">
        <h3>At a glance</h3>
        ${factsBlock([
          ["Share", edge.shareLabel],
          ["Weight", weightLine(route, edge.weight)],
          ["Kind", EDGE_KIND_LABELS[edge.kind]],
          ["Evidence", STATUS_LABELS[edge.status]],
        ])}
      </section>
      <section class="detail-block detail-support detail-sources-block">
        <h3>Sources</h3>
        ${sourceList(edge.sources)}
      </section>
      ${caveatList(edge.caveats)}
    </div>`;
}
