import "./styles.css";

import { buildRoutes, defaultRouteId, type Route } from "./routes/data.ts";
import { equalisationPerResident, getLandFigures, landFigures } from "./routes/equalisation.ts";
import { BERLIN, GERMANY, getPlace, type Place } from "./routes/places.ts";
import { getTaxEntry } from "./routes/taxonomy.ts";
import { renderFiscalGraph } from "./viz/fiscal-graph.ts";
import { mapAttribution, renderLandMap } from "./viz/land-map.ts";
import { hideTooltip } from "./viz/tooltip.ts";
import { renderEdgeDetail, renderNodeDetail, renderTaxDetail } from "./ui/route-detail.ts";
import {
  renderSpendingPanel,
  type RouteInflow,
  type SpendingAccount,
  type SpendingEntry,
  type SpendingKey,
} from "./ui/spending.ts";
import { escapeHtml, renderRouteBrief } from "./ui/static-page.ts";
import federalSpending from "../data/de/2024/accounts/federal-functions.json" with { type: "json" };
import berlinSpending from "../data/de/2024/accounts/berlin-functions.json" with { type: "json" };
import { getLandAccount, getLaenderAggregateAccount, getSocialAccount, socialSystemIds } from "./data/accounts.ts";

document.documentElement.classList.add("enhanced");

const mount = document.querySelector<HTMLElement>("#fiscal-graph-mount");
const routeTitle = document.querySelector<HTMLElement>("#route-title");
const routeBrief = document.querySelector<HTMLElement>("#route-brief");
const boundaryPanel = document.querySelector<HTMLElement>("#boundary-panel");
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
let comparisonKey: SpendingKey | null = null;
let socialKey: SpendingKey = "pension";

boundaryPanel?.addEventListener("change", (event) => {
  if (!(event.target instanceof HTMLSelectElement) || !currentRoute) {
    return;
  }
  const compare = event.target.closest<HTMLSelectElement>("[data-spend-compare]");
  if (compare) {
    comparisonKey = compare.value as SpendingKey;
    renderBoundary(currentRoute);
    return;
  }
  const system = event.target.closest<HTMLSelectElement>("[data-spend-system]");
  if (system) {
    socialKey = system.value as SpendingKey;
    renderBoundary(currentRoute);
  }
});

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
  const routeInflow = (nodeId: string): RouteInflow | undefined => {
    const sum = route.edges.filter((edge) => edge.to === nodeId).reduce((total, edge) => total + edge.weight, 0);
    if (sum <= 0) {
      return undefined;
    }
    const eur =
      route.unit === "million_eur" ? sum * 1e6 : route.routeTotalMeur ? sum * route.routeTotalMeur * 1e6 : undefined;
    return eur === undefined ? undefined : { eur, routeLabel: route.chipNote };
  };
  // Loaded spending accounts. Adding another audited account here also makes
  // it available to the comparison control below the bars.
  const entries: SpendingEntry[] = [
    {
      key: "berlin",
      shortName: "Berlin",
      account: berlinSpending as SpendingAccount,
      inflow: route.nodes.some((node) => node.id === "berlin_budget") ? routeInflow("berlin_budget") : undefined,
    },
    {
      key: "federation",
      shortName: "Federal",
      account: federalSpending as SpendingAccount,
      inflow: route.nodes.some((node) => node.id === "federal_budget") ? routeInflow("federal_budget") : undefined,
    },
  ];
  if (!currentPlace.national && currentPlace.code !== "BE") {
    const landAccount = getLandAccount(currentPlace.code, currentPlace.name);
    if (landAccount) {
      entries.push({ key: "land", shortName: currentPlace.name, account: landAccount });
      entries.push({ key: "laender", shortName: "All Länder", account: getLaenderAggregateAccount() });
    }
  }
  let systemPicker = "";
  if (route.id === "social") {
    for (const system of socialSystemIds) {
      const account = getSocialAccount(system.id);
      if (account) {
        entries.push({ key: system.id as SpendingKey, shortName: system.name, account });
      }
    }
    systemPicker = `<label class="spend-compare-control spend-system-control"><span>System</span><select data-spend-system aria-label="Choose a social-insurance system">${socialSystemIds
      .map(
        (system) =>
          `<option value="${escapeHtml(system.id)}"${system.id === socialKey ? " selected" : ""}>${escapeHtml(system.name)}</option>`,
      )
      .join("")}</select></label>`;
  }

  // The place selected on the left decides which spending account is shown;
  // the social route shows its own systems instead of a territorial budget.
  const defaultKey: SpendingKey | null =
    route.id === "social"
      ? socialKey
      : currentPlace.national
        ? "federation"
        : currentPlace.code === "BE"
          ? "berlin"
          : entries.some((entry) => entry.key === "land")
            ? "land"
            : "federation";
  const active = entries.find((entry) => entry.key === defaultKey);

  const fallback = `<ul class="boundary-examples" aria-label="What this budget funds as a whole">${route.boundary.examples
    .map((example) => `<li>${escapeHtml(example)}</li>`)
    .join("")}</ul>
    <p class="boundary-footnote">This budget's audited function-level actuals are not loaded yet.</p>`;

  // Comparisons only against same-vintage accounts — never across years.
  const comparisons = active
    ? entries.filter(
        (entry) =>
          entry.key !== active.key &&
          entry.account.reference_year === active.account.reference_year &&
          !socialSystemIds.some((system) => system.id === entry.key) &&
          (active.key !== "land" || entry.key === "laender"),
      )
    : [];
  const benchmark = comparisons.find((entry) => entry.key === comparisonKey) ?? comparisons[0];
  comparisonKey = benchmark?.key ?? null;
  const tail = active
    ? `${systemPicker}
       ${renderSpendingPanel(active, benchmark, comparisons)}
       <p class="boundary-footnote">${escapeHtml(
         active.account.reference_year === 2021
           ? "Shown from the 2021 comparable series — the newest function data published for all Länder. Audited 2024 accounts exist for Berlin and the Federation so far."
           : "More audited accounts load as they are collected and verified.",
       )}</p>`
    : fallback;
  boundaryPanel.innerHTML = `
    <p class="boundary-axis" aria-hidden="true">Tax joins the budget</p>
    ${tail}`;
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
    placeStats.innerHTML = `<strong>€${(shifted / 1000).toFixed(1)}bn rebalanced</strong><span>2024 · 4 Länder paid in · 12 received</span>`;
    return;
  }
  const figures = getLandFigures(currentPlace.code);
  if (!figures) {
    placeStats.replaceChildren();
    return;
  }
  const perResident = Math.round(equalisationPerResident(figures));
  const direction = figures.equalisationMeur >= 0 ? "received" : "paid in";
  const grants =
    figures.supplementaryGrantsMeur > 0
      ? ` · €${(figures.supplementaryGrantsMeur / 1000).toFixed(2)}bn federal grants`
      : "";
  placeStats.innerHTML = `<strong>${escapeHtml(direction)} €${(Math.abs(figures.equalisationMeur) / 1000).toFixed(2)}bn</strong><span>≈€${Math.abs(
    perResident,
  ).toLocaleString("en")} / resident · VAT slice €${((figures.vatBaseMeur + figures.equalisationMeur) / 1000).toFixed(2)}bn${escapeHtml(grants)}</span>`;
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
  if (routeBrief) {
    routeBrief.innerHTML = renderRouteBrief(route);
  }
  renderBoundary(route);
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
