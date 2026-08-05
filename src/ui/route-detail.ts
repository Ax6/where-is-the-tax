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
    <section class="detail-block">
      <h3>Caveats</h3>
      <ul class="detail-caveats">${items}</ul>
    </section>`;
}

function factsBlock(rows: [string, string][]): string {
  const items = rows
    .filter(([, value]) => value.length > 0)
    .map(([term, value]) => `<div><dt>${escapeHtml(term)}</dt><dd>${escapeHtml(value)}</dd></div>`)
    .join("");
  return `<dl>${items}</dl>`;
}

export function renderNodeDetail(route: Route, node: RouteNode): string {
  return `
    <header class="dialog-header">
      <p class="eyebrow">${escapeHtml(route.chipTitle)} · node</p>
      <h2 id="detail-title">${escapeHtml(node.label)}</h2>
      ${node.official ? `<p class="dialog-official">officially <em>${escapeHtml(node.official)}</em></p>` : ""}
      <p>${escapeHtml(node.description)}</p>
    </header>
    <section class="detail-block">
      <h3>What we can say</h3>
      ${node.amountNote ? `<p>${escapeHtml(node.amountNote)}</p>` : ""}
      ${factsBlock([
        ["Entity", route.entityLabels[node.entity]],
        ["Evidence", STATUS_LABELS[node.status]],
        ["Stage", route.stages[node.stage] ?? ""],
      ])}
    </section>
    <section class="detail-block">
      <h3>Sources</h3>
      ${sourceList(node.sources)}
    </section>
    ${caveatList(node.caveats)}`;
}

export function renderTaxDetail(group: TaxGroup, entry: TaxEntry, routeTitle?: string): string {
  return `
    <header class="dialog-header">
      <p class="eyebrow">${escapeHtml(group.title)}</p>
      <h2 id="detail-title">${escapeHtml(entry.name)}</h2>
      ${entry.official ? `<p class="dialog-official">officially <em>${escapeHtml(entry.official)}</em></p>` : ""}
      <p>${escapeHtml(entry.description)}</p>
    </header>
    <section class="detail-block">
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
    <section class="detail-block">
      <h3>Sources</h3>
      ${sourceList(entry.sources)}
    </section>`;
}

export function renderEdgeDetail(route: Route, edge: RouteEdge, from: RouteNode, to: RouteNode): string {
  return `
    <header class="dialog-header">
      <p class="eyebrow">${escapeHtml(route.chipTitle)} · flow</p>
      <h2 id="detail-title">${escapeHtml(from.label)} → ${escapeHtml(to.label)}</h2>
      <p>${escapeHtml(edge.description)}</p>
    </header>
    <section class="detail-block">
      <h3>What we can say</h3>
      ${factsBlock([
        ["Share", edge.shareLabel],
        ["Weight", weightLine(route, edge.weight)],
        ["Kind", EDGE_KIND_LABELS[edge.kind]],
        ["Evidence", STATUS_LABELS[edge.status]],
      ])}
    </section>
    <section class="detail-block">
      <h3>Sources</h3>
      ${sourceList(edge.sources)}
    </section>
    ${caveatList(edge.caveats)}`;
}
