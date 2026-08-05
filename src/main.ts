import "./styles.css";

import { defaultRouteId, getRoute, routes, type Route } from "./routes/data.ts";
import { getTaxEntry } from "./routes/taxonomy.ts";
import { renderFiscalGraph } from "./viz/fiscal-graph.ts";
import { hideTooltip } from "./viz/tooltip.ts";
import { renderEdgeDetail, renderNodeDetail, renderTaxDetail } from "./ui/route-detail.ts";
import { escapeHtml } from "./ui/static-page.ts";

document.documentElement.classList.add("enhanced");

const mount = document.querySelector<HTMLElement>("#fiscal-graph-mount");
const routeTitle = document.querySelector<HTMLElement>("#route-title");
const routeLede = document.querySelector<HTMLElement>("#route-lede");
const unitNote = document.querySelector<HTMLElement>("#route-unit-note");
const boundaryPanel = document.querySelector<HTMLElement>("#boundary-panel");
const annotationsList = document.querySelector<HTMLElement>("#route-annotations");
const chips = [...document.querySelectorAll<HTMLButtonElement>("[data-route-chip]")];
const dialog = document.querySelector<HTMLDialogElement>("#detail-dialog");
const dialogContent = dialog?.querySelector<HTMLElement>("[data-dialog-content]");

let currentRoute: Route | undefined;
let lastTrigger: Element | null = null;

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
    const routeTitle = found.entry.routeId ? getRoute(found.entry.routeId)?.chipTitle : undefined;
    dialogContent.innerHTML = renderTaxDetail(found.group, found.entry, routeTitle);
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
  const examples = route.boundary.examples.map((example) => `<li>${escapeHtml(example)}</li>`).join("");
  boundaryPanel.innerHTML = `
    <p class="boundary-marker" aria-hidden="true">Budget boundary — tax identity ends here</p>
    <h3>${escapeHtml(route.boundary.heading)}</h3>
    ${paragraphs}
    <ul class="boundary-examples" aria-label="What this budget funds as a whole">${examples}</ul>
    <p class="boundary-footnote">Unquantified on purpose: no verified function-level actuals are published here yet.</p>`;
}

function renderAnnotations(route: Route): void {
  if (!annotationsList) {
    return;
  }
  annotationsList.innerHTML = route.annotations
    .map((annotation) => `<li><span aria-hidden="true">✳</span> ${escapeHtml(annotation.text)}</li>`)
    .join("");
}

function selectRoute(routeId: string, options: { updateHash: boolean }): void {
  const route = getRoute(routeId) ?? getRoute(defaultRouteId);
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

  if (options.updateHash) {
    const hash = `#route/${route.id}`;
    if (window.location.hash !== hash) {
      history.replaceState(null, "", hash);
    }
  }
}

function routeIdFromHash(): string {
  const match = /^#route\/([\w-]+)$/.exec(window.location.hash);
  return match?.[1] ?? defaultRouteId;
}

for (const chip of chips) {
  chip.addEventListener("click", () => {
    const routeId = chip.dataset.routeId;
    if (routeId) {
      selectRoute(routeId, { updateHash: true });
    }
  });
}

window.addEventListener("hashchange", () => {
  if (routeIdFromHash() !== currentRoute?.id) {
    selectRoute(routeIdFromHash(), { updateHash: false });
  }
});

if (mount) {
  if (routes.length === 0) {
    mount.innerHTML = `<p class="fg-error">No routes are available. This prototype ships with a fixed set of routes — please file an issue.</p>`;
  } else {
    selectRoute(routeIdFromHash(), { updateHash: false });
  }
}
