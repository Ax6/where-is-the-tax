import "./styles.css";

import { buildRoutes, defaultRouteId, type Route } from "./routes/data.ts";
import { equalisationPerResident, getLandFigures, landFigures } from "./routes/equalisation.ts";
import { BERLIN, GERMANY, getPlace, type Place } from "./routes/places.ts";
import { getTaxEntry } from "./routes/taxonomy.ts";
import { renderFiscalGraph } from "./viz/fiscal-graph.ts";
import { mapAttribution, renderLandMap } from "./viz/land-map.ts";
import { hideTooltip } from "./viz/tooltip.ts";
import { renderEdgeDetail, renderNodeDetail, renderTaxDetail } from "./ui/route-detail.ts";
import { renderSpendingAccount, type RouteInflow, type SpendingAccount } from "./ui/spending.ts";
import { escapeHtml } from "./ui/static-page.ts";
import federalSpending from "../data/de/2024/accounts/federal-functions.json" with { type: "json" };
import berlinSpending from "../data/de/2024/accounts/berlin-functions.json" with { type: "json" };

document.documentElement.classList.add("enhanced");

const mount = document.querySelector<HTMLElement>("#fiscal-graph-mount");
const routeTitle = document.querySelector<HTMLElement>("#route-title");
const routeLede = document.querySelector<HTMLElement>("#route-lede");
const unitNote = document.querySelector<HTMLElement>("#route-unit-note");
const boundaryPanel = document.querySelector<HTMLElement>("#boundary-panel");
const annotationsList = document.querySelector<HTMLElement>("#route-annotations");
const placeNote = document.querySelector<HTMLElement>("#place-note");
const landSelect = document.querySelector<HTMLSelectElement>("#land-select");
const landMapMount = document.querySelector<HTMLElement>("#land-map");
const attributionEl = document.querySelector<HTMLElement>("#map-attribution");
const legendPlaceName = document.querySelector<HTMLElement>('[data-entity="berlin"] .legend-entity-name');
const chips = [...document.querySelectorAll<HTMLButtonElement>("[data-route-chip]")];
const dialog = document.querySelector<HTMLDialogElement>("#detail-dialog");
const dialogContent = dialog?.querySelector<HTMLElement>("[data-dialog-content]");

const placeStats = document.querySelector<HTMLElement>("#place-stats");

let currentPlace: Place = GERMANY;
let currentRoutes: Route[] = buildRoutes(currentPlace);
let currentRoute: Route | undefined;
let lastTrigger: Element | null = null;

if (attributionEl) {
  attributionEl.textContent = mapAttribution;
}

function findRoute(id: string): Route | undefined {
  return currentRoutes.find((route) => route.id === id);
}

function openDetail(kind: "node" | "edge", id: string): void {
  if (!dialog || !dialogContent || !currentRoute) {
    return;
  }
  lastTrigger = document.activeElement;
  if (kind === "node") {
    const node = currentRoute.nodes.find((candidate) => candidate.id === id);
    if (!node) {
      return;
    }
    dialogContent.innerHTML = renderNodeDetail(currentRoute, node);
  } else {
    const edge = currentRoute.edges.find((candidate) => candidate.id === id);
    const from = edge && currentRoute.nodes.find((candidate) => candidate.id === edge.from);
    const to = edge && currentRoute.nodes.find((candidate) => candidate.id === edge.to);
    if (!edge || !from || !to) {
      return;
    }
    dialogContent.innerHTML = renderEdgeDetail(currentRoute, edge, from, to);
  }
  hideTooltip();
  dialog.showModal();
}

for (const taxButton of document.querySelectorAll<HTMLButtonElement>("[data-tax-id]")) {
  taxButton.addEventListener("click", () => {
    const taxId = taxButton.dataset.taxId;
    const found = taxId ? getTaxEntry(taxId) : undefined;
    if (!found || !dialog || !dialogContent) {
      return;
    }
    lastTrigger = taxButton;
    const routeTitleText = found.entry.routeId ? findRoute(found.entry.routeId)?.chipTitle : undefined;
    dialogContent.innerHTML = renderTaxDetail(found.group, found.entry, routeTitleText);
    dialog.showModal();
  });
}

dialog?.addEventListener("close", () => {
  if (lastTrigger instanceof HTMLElement || lastTrigger instanceof SVGElement) {
    lastTrigger.focus();
  }
  lastTrigger = null;
});

function renderBoundary(route: Route): void {
  if (!boundaryPanel) {
    return;
  }
  const paragraphs = route.boundary.body.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("");
  const routeInflow = (nodeId: string): RouteInflow | undefined => {
    const sum = route.edges.filter((edge) => edge.to === nodeId).reduce((total, edge) => total + edge.weight, 0);
    if (sum <= 0) {
      return undefined;
    }
    const eur =
      route.unit === "million_eur" ? sum * 1e6 : route.routeTotalMeur ? sum * route.routeTotalMeur * 1e6 : undefined;
    return eur === undefined ? undefined : { eur, routeLabel: route.chipNote };
  };
  const hasFederal = route.nodes.some((node) => node.id === "federal_budget");
  const hasBerlin = route.nodes.some((node) => node.id === "berlin_budget");
  const blocks: string[] = [];
  if (hasBerlin) {
    blocks.push(renderSpendingAccount(berlinSpending as SpendingAccount, routeInflow("berlin_budget")));
  }
  if (hasFederal) {
    blocks.push(renderSpendingAccount(federalSpending as SpendingAccount, routeInflow("federal_budget")));
  }
  const tail =
    blocks.length > 0
      ? `${blocks.join("\n")}
       <p class="boundary-footnote">Other Länder and municipal accounts follow as their audited actuals are loaded.</p>`
      : `<ul class="boundary-examples" aria-label="What this budget funds as a whole">${route.boundary.examples
          .map((example) => `<li>${escapeHtml(example)}</li>`)
          .join("")}</ul>
       <p class="boundary-footnote">Unquantified on purpose: this budget's audited function-level actuals are not loaded yet.</p>`;
  boundaryPanel.innerHTML = `
    <p class="boundary-marker" aria-hidden="true">Budget boundary — tax identity ends here</p>
    <h3>${escapeHtml(route.boundary.heading)}</h3>
    ${paragraphs}
    ${tail}`;
}

function renderAnnotations(route: Route): void {
  if (!annotationsList) {
    return;
  }
  annotationsList.innerHTML = route.annotations
    .map((annotation) => `<li><span aria-hidden="true">✳</span> ${escapeHtml(annotation.text)}</li>`)
    .join("");
}

function updatePlaceNote(route: Route): void {
  if (!placeNote) {
    return;
  }
  if (!route.placeAware && currentPlace.code !== BERLIN.code) {
    placeNote.textContent = currentPlace.national
      ? "This route uses Berlin as a concrete example; other places follow as the dataset grows."
      : `This route still shows the Berlin example — ${currentPlace.name} figures follow as the dataset grows. The wage and VAT routes already adjust to ${currentPlace.name}.`;
    placeNote.hidden = false;
  } else {
    placeNote.hidden = true;
  }
}

function updatePlaceStats(): void {
  if (!placeStats) {
    return;
  }
  if (currentPlace.national) {
    const shifted = landFigures
      .filter((entry) => entry.equalisationMeur > 0)
      .reduce((sum, entry) => sum + entry.equalisationMeur, 0);
    placeStats.textContent = `2024 equalisation: €${(shifted / 1000).toFixed(1)}bn shifted between Länder — 4 paid in, 12 received.`;
    return;
  }
  const figures = getLandFigures(currentPlace.code);
  if (!figures) {
    placeStats.textContent = "";
    return;
  }
  const perResident = Math.round(equalisationPerResident(figures));
  const direction = figures.equalisationMeur >= 0 ? "received" : "paid in";
  const grants =
    figures.supplementaryGrantsMeur > 0
      ? ` Plus €${(figures.supplementaryGrantsMeur / 1000).toFixed(2)}bn federal grants.`
      : "";
  placeStats.textContent = `${currentPlace.name} 2024: VAT slice €${((figures.vatBaseMeur + figures.equalisationMeur) / 1000).toFixed(2)}bn · ${direction} €${(
    Math.abs(figures.equalisationMeur) / 1000
  ).toFixed(2)}bn via equalisation (≈€${Math.abs(perResident)} per resident).${grants}`;
}

function syncHash(): void {
  const hash = `#route/${currentRoute?.id ?? defaultRouteId}/${currentPlace.code}`;
  if (window.location.hash !== hash) {
    history.replaceState(null, "", hash);
  }
}

function renderCurrentRoute(routeId: string): void {
  const route = findRoute(routeId) ?? findRoute(defaultRouteId);
  if (!route || !mount) {
    return;
  }
  if (dialog?.open) {
    dialog.close();
  }
  currentRoute = route;

  for (const chip of chips) {
    chip.setAttribute("aria-pressed", String(chip.dataset.routeId === route.id));
  }
  if (routeTitle) {
    routeTitle.textContent = route.chipTitle;
  }
  if (routeLede) {
    routeLede.textContent = route.lede;
  }
  if (unitNote) {
    unitNote.textContent = `${route.unitNote} Hover any node or ribbon for a plain-English explanation; click for sources.`;
  }
  renderBoundary(route);
  renderAnnotations(route);
  updatePlaceNote(route);

  mount.classList.add("is-switching");
  const draw = () => {
    renderFiscalGraph(mount, route, { onSelect: openDetail });
    mount.classList.remove("is-switching");
  };
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    draw();
  } else {
    window.setTimeout(draw, 120);
  }
}

function selectPlace(place: Place, options: { updateHash: boolean }): void {
  currentPlace = place;
  currentRoutes = buildRoutes(place);
  if (landSelect && landSelect.value !== place.code) {
    landSelect.value = place.code;
  }
  if (legendPlaceName) {
    legendPlaceName.textContent = place.national ? "Selected Land" : place.name;
  }
  if (landMapMount) {
    renderLandMap(landMapMount, place, (next) => selectPlace(next, { updateHash: true }));
  }
  updatePlaceStats();
  renderCurrentRoute(currentRoute?.id ?? defaultRouteId);
  if (options.updateHash) {
    syncHash();
  }
}

function selectRoute(routeId: string, options: { updateHash: boolean }): void {
  renderCurrentRoute(routeId);
  if (options.updateHash) {
    syncHash();
  }
}

function parseHash(): { routeId: string; place: Place } {
  const match = /^#route\/([\w-]+)(?:\/([A-Za-z]{2}))?$/.exec(window.location.hash);
  const routeId = match?.[1] ?? defaultRouteId;
  const place = (match?.[2] && getPlace(match[2])) || GERMANY;
  return { routeId, place };
}

for (const chip of chips) {
  chip.addEventListener("click", () => {
    const routeId = chip.dataset.routeId;
    if (routeId) {
      selectRoute(routeId, { updateHash: true });
    }
  });
}

landSelect?.addEventListener("change", () => {
  const place = getPlace(landSelect.value);
  if (place) {
    selectPlace(place, { updateHash: true });
  }
});

window.addEventListener("hashchange", () => {
  const { routeId, place } = parseHash();
  if (place.code !== currentPlace.code) {
    currentPlace = place;
    currentRoutes = buildRoutes(place);
    selectPlace(place, { updateHash: false });
  }
  if (routeId !== currentRoute?.id) {
    selectRoute(routeId, { updateHash: false });
  }
});

if (mount) {
  const { routeId, place } = parseHash();
  currentRoute = undefined;
  currentPlace = place;
  currentRoutes = buildRoutes(place);
  if (landMapMount) {
    renderLandMap(landMapMount, place, (next) => selectPlace(next, { updateHash: true }));
  }
  if (landSelect) {
    landSelect.value = place.code;
  }
  if (legendPlaceName) {
    legendPlaceName.textContent = place.national ? "Selected Land" : place.name;
  }
  updatePlaceStats();
  selectRoute(routeId, { updateHash: false });
}
