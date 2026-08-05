import {
  EDGE_KIND_LABELS,
  ENTITY_LABELS,
  STATUS_LABELS,
  type Route,
  type SourceRef,
} from "../routes/data.ts";
import { taxonomy } from "../routes/taxonomy.ts";
import { places } from "../routes/places.ts";

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderChips(routes: Route[], activeId: string): string {
  return routes
    .map(
      (route) => `
        <button type="button" class="route-chip" data-route-chip data-route-id="${escapeHtml(route.id)}" aria-pressed="${
          route.id === activeId ? "true" : "false"
        }">
          <span class="route-chip-title">${escapeHtml(route.chipTitle)}</span>
          <span class="route-chip-note">${escapeHtml(route.chipNote)}</span>
        </button>`,
    )
    .join("");
}

function renderFallbackRoute(route: Route): string {
  const nodesById = new Map(route.nodes.map((node) => [node.id, node]));
  const steps = route.edges
    .map((edge) => {
      const from = nodesById.get(edge.from);
      const to = nodesById.get(edge.to);
      return `<li><strong>${escapeHtml(from?.label ?? edge.from)} → ${escapeHtml(to?.label ?? edge.to)}</strong> (${escapeHtml(
        edge.shareLabel,
      )}; ${escapeHtml(EDGE_KIND_LABELS[edge.kind])}). ${escapeHtml(edge.description)}</li>`;
    })
    .join("");
  return `
    <details class="fg-fallback-route">
      <summary>${escapeHtml(route.chipTitle)} — ${escapeHtml(route.chipNote)}</summary>
      <p>${escapeHtml(route.lede)}</p>
      <ol>${steps}</ol>
    </details>`;
}

function renderBoundaryPanel(route: Route): string {
  const paragraphs = route.boundary.body.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("");
  const examples = route.boundary.examples.map((example) => `<li>${escapeHtml(example)}</li>`).join("");
  return `
    <p class="boundary-marker" aria-hidden="true">Budget boundary — tax identity ends here</p>
    <h3>${escapeHtml(route.boundary.heading)}</h3>
    ${paragraphs}
    <ul class="boundary-examples" aria-label="What this budget funds as a whole">${examples}</ul>
    <p class="boundary-footnote">Unquantified on purpose: no verified function-level actuals are published here yet.</p>`;
}

function renderAnnotations(route: Route): string {
  return route.annotations
    .map((annotation) => `<li><span aria-hidden="true">✳</span> ${escapeHtml(annotation.text)}</li>`)
    .join("");
}

function collectSources(routes: Route[]): SourceRef[] {
  const seen = new Map<string, SourceRef>();
  for (const route of routes) {
    for (const item of [...route.nodes, ...route.edges]) {
      for (const source of item.sources) {
        seen.set(source.url, source);
      }
    }
  }
  return [...seen.values()];
}

function renderTableRows(routes: Route[]): string {
  return routes
    .flatMap((route) => {
      const nodesById = new Map(route.nodes.map((node) => [node.id, node]));
      return route.edges.map((edge) => {
        const from = nodesById.get(edge.from);
        const to = nodesById.get(edge.to);
        const sources = edge.sources
          .map(
            (source) =>
              `<a href="${escapeHtml(source.url)}" rel="noreferrer noopener" target="_blank">${escapeHtml(source.label)}</a>`,
          )
          .join("; ");
        return `
          <tr id="record-${escapeHtml(route.id)}-${escapeHtml(edge.id)}">
            <th scope="row">${escapeHtml(route.chipTitle)}</th>
            <td>${escapeHtml(from?.label ?? edge.from)} → ${escapeHtml(to?.label ?? edge.to)}</td>
            <td class="numeric">${escapeHtml(edge.shareLabel)}</td>
            <td>${escapeHtml(EDGE_KIND_LABELS[edge.kind])}</td>
            <td>${escapeHtml(STATUS_LABELS[edge.status])}</td>
            <td>${sources}</td>
          </tr>`;
      });
    })
    .join("");
}

function renderTaxonomy(routes: Route[]): string {
  const routeTitles = new Map(routes.map((route) => [route.id, route.chipTitle]));
  return taxonomy
    .map((group) => {
      const entries = group.entries
        .map(
          (entry) => `
            <li>
              <button type="button" class="tax-entry" data-tax-id="${escapeHtml(entry.id)}">
                <span class="tax-entry-name">${escapeHtml(entry.name)}${
                  entry.official ? ` <em>${escapeHtml(entry.official)}</em>` : ""
                }</span>
                <span class="tax-entry-split">${escapeHtml(entry.split)}${
                  entry.routeId && routeTitles.has(entry.routeId) ? ` <span class="tax-entry-route">route ↗</span>` : ""
                }</span>
              </button>
            </li>`,
        )
        .join("");
      return `
        <article class="tax-group">
          <h3>${escapeHtml(group.title)}</h3>
          <p>${escapeHtml(group.blurb)}</p>
          <ul>${entries}</ul>
        </article>`;
    })
    .join("");
}

export function renderStaticPage(routes: Route[], defaultRouteId: string): string {
  const defaultRoute = routes.find((route) => route.id === defaultRouteId) ?? routes[0];
  if (!defaultRoute) {
    throw new Error("At least one route is required to render the page.");
  }
  const entityLegend = (Object.entries(ENTITY_LABELS) as [string, string][])
    .filter(([id]) => id !== "neutral")
    .map(
      ([id, label]) =>
        `<li class="legend-entity" data-entity="${escapeHtml(id)}"><span class="legend-swatch legend-${escapeHtml(id)}" aria-hidden="true"></span><span class="legend-entity-name">${escapeHtml(
          label,
        )}</span></li>`,
    )
    .join("");
  const kindLegend = Object.values(EDGE_KIND_LABELS)
    .map((label) => `<li>${escapeHtml(label)}</li>`)
    .join("");

  return `
    <a class="skip-link" href="#graph">Skip to the graph</a>
    <div class="prototype-banner" role="note">
      <strong>Internal prototype</strong>
      <span>Statutory shares are exact law. Euro figures were independently reproduced from official sources on 2026-08-05; the fully provenanced dataset is still in progress — treat as preview, not published data.</span>
    </div>

    <header class="site-header">
      <a class="wordmark" href="#top" aria-label="Where is the tax? Home">Where is the tax?</a>
      <nav aria-label="Page sections">
        <a href="#graph">The graph</a>
        <a href="#all-taxes">All taxes</a>
        <a href="#boundary">The boundary</a>
        <a href="#sources">Sources</a>
        <a href="#data-table">Data table</a>
      </nav>
    </header>

    <section class="hero" id="top" aria-labelledby="page-title">
      <p class="eyebrow">Germany · 2024 routes · all 16 Länder</p>
      <h1 id="page-title">Every euro you pay<br><em>takes a legal route.</em></h1>
      <p class="hero-lede">Pick something you actually pay and where you live — the map re-splits the wage and VAT routes for your Land. Follow your money through the constitution's splits, the clearing between Länder, and into real budgets, until the law itself says the trail ends.</p>
    </section>

    <section class="graph-section" id="graph" aria-labelledby="route-title">
      <div class="route-controls">
        <div class="route-controls-main">
          <p class="control-label">What do you pay?</p>
          <div class="route-chips" role="group" aria-label="Choose a route to follow">
            ${renderChips(routes, defaultRoute.id)}
          </div>
          <p class="control-label">Where do you live?</p>
          <label class="land-select-label">Place
            <select id="land-select">
              <option value="DE" selected>Germany (all)</option>
              ${places
                .map((place) => `<option value="${escapeHtml(place.code)}">${escapeHtml(place.name)}</option>`)
                .join("")}
            </select>
          </label>
          <p class="place-stats" id="place-stats"></p>
          <p class="place-note" id="place-note" hidden></p>
        </div>
        <div class="land-map-wrap">
          <div id="land-map" class="land-map"></div>
          <p class="map-attribution" id="map-attribution"></p>
        </div>
      </div>

      <div class="route-head">
        <h2 id="route-title">${escapeHtml(defaultRoute.chipTitle)}</h2>
        <p id="route-lede">${escapeHtml(defaultRoute.lede)}</p>
      </div>

      <div class="graph-frame">
        <figure class="graph-figure" aria-label="Interactive fiscal route graph">
          <div id="fiscal-graph-mount" class="fiscal-graph-mount">
            <div class="fg-fallback">
              <p><strong>The interactive graph needs JavaScript.</strong> The same routes, in words:</p>
              ${routes.map((route) => renderFallbackRoute(route)).join("")}
            </div>
          </div>
          <figcaption id="route-unit-note" class="graph-caption">${escapeHtml(defaultRoute.unitNote)} Hover any node or ribbon for a plain-English explanation; click for sources.</figcaption>
        </figure>
        <aside class="boundary-panel" id="boundary-panel" aria-label="Beyond the budget boundary">
          ${renderBoundaryPanel(defaultRoute)}
        </aside>
      </div>

      <ul class="route-annotations" id="route-annotations" aria-label="Route footnotes">
        ${renderAnnotations(defaultRoute)}
      </ul>

      <div class="graph-legend" aria-label="How to read the graph">
        <div>
          <p class="legend-title">Ribbons end in the budget that legally receives the money</p>
          <ul class="legend-entities">${entityLegend}</ul>
        </div>
        <div>
          <p class="legend-title">Every flow is one of these legal mechanisms</p>
          <ul class="legend-kinds">${kindLegend}</ul>
        </div>
        <div>
          <p class="legend-title">Texture &amp; status</p>
          <ul class="legend-kinds">
            <li>Hatched ribbon: aggregate route only — your personal euro is not individually traceable there.</li>
            <li>Every value carries an evidence badge, from “exact — written in law” to “official, marked provisional”.</li>
          </ul>
        </div>
      </div>
    </section>

    <section class="tax-map-section" id="all-taxes" aria-labelledby="all-taxes-title">
      <div class="section-heading">
        <p class="eyebrow">The whole map</p>
        <h2 id="all-taxes-title">All taxes at a glance</h2>
        <p>Every major named tax and who receives it by law. The four routes above are drawn end-to-end; the rest follow as the dataset grows. Click any tax for a short explanation and its legal basis.</p>
      </div>
      <div class="tax-map">${renderTaxonomy(routes)}</div>
    </section>

    <section class="boundary-section" id="boundary" aria-labelledby="boundary-title">
      <div class="section-heading">
        <p class="eyebrow">Why the trail ends</p>
        <h2 id="boundary-title">What can be answered — and what can't</h2>
      </div>
      <div class="guardrail-grid">
        <article><span>01</span><h3>Who legally receives this tax?</h3><p>Usually answerable exactly — from the constitution, statutes, and official cash statistics. This is what the ribbons draw.</p></article>
        <article><span>02</span><h3>How is it redistributed?</h3><p>Answerable at aggregate level: residence-based clearing, VAT keys, and a pooled equalisation calculation — never bilateral wires between Länder.</p></article>
        <article><span>03</span><h3>What does the recipient spend it on?</h3><p>Only answerable for the whole budget. Past the boundary, claiming your tax bought a named service would be fiction — so this site refuses to draw it.</p></article>
      </div>
    </section>

    <section class="sources-section" id="sources" aria-labelledby="sources-title">
      <div class="section-heading">
        <p class="eyebrow">Verification status</p>
        <h2 id="sources-title">Sources and verification</h2>
        <p>Deep-source research completed and independently verified on 2026-08-05: every euro figure shown here was reproduced from the official tables, PDFs and statutes by a second pass. The one open discrepancy was resolved on the way — Berlin's 2024 trade-tax levy line is the full statutory levy (35% multiplier, §6 GemFinRefG); the Land component returns to Berlin through the equalisation system. What remains before publication: the fully provenanced dataset bundle with evidence snapshots.</p>
      </div>
      <ul class="source-list">
        ${collectSources(routes)
          .map(
            (source) =>
              `<li><a href="${escapeHtml(source.url)}" rel="noreferrer noopener" target="_blank">${escapeHtml(source.label)}</a></li>`,
          )
          .join("")}
      </ul>
      <p class="source-more">Method &amp; contracts: <a href="https://github.com/Ax6/where-is-the-tax/blob/main/docs/research/GERMANY_FISCAL_GRAPH_2026-08-05.md" rel="noreferrer noopener" target="_blank">deep research report</a> · <a href="https://github.com/Ax6/where-is-the-tax/blob/main/PLAN.md" rel="noreferrer noopener" target="_blank">project plan</a></p>
    </section>

    <section class="data-table-section" id="data-table" aria-labelledby="data-table-title">
      <div class="section-heading">
        <p class="eyebrow">Inspect every flow</p>
        <h2 id="data-table-title">Data table</h2>
        <p>Written into the HTML at build time — available without JavaScript, with a source link on every flow.</p>
      </div>
      <div class="table-scroll" tabindex="0" aria-label="Scrollable route data table">
        <table>
          <caption>Every flow drawn by the graph, with legal mechanism, evidence status, and sources</caption>
          <thead><tr><th scope="col">Route</th><th scope="col">Flow</th><th scope="col">Share</th><th scope="col">Mechanism</th><th scope="col">Evidence</th><th scope="col">Sources</th></tr></thead>
          <tbody>${renderTableRows(routes)}</tbody>
        </table>
      </div>
    </section>

    <footer>
      <p><strong>Prototype boundary:</strong> this interface demonstrates the fiscal-graph contract on statutory shares and research-report figures. No figure here is published data until the independent verification pass completes.</p>
      <p>Every node, ribbon and table row links to its legal basis or official source.</p>
    </footer>

    <dialog id="detail-dialog" aria-labelledby="detail-title">
      <div data-dialog-content></div>
      <form method="dialog"><button type="submit" class="dialog-close">Close</button></form>
    </dialog>`;
}
