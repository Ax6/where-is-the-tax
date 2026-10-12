import "./styles.css";

import { buildGermany, buildYou, defaultWage, equalisation, GERMANY_CODE, getPlace, payslipYears, purchases, timeSeries, type LayerId } from "./data/model.ts";
import { eur, t, type Lang } from "./i18n.ts";
import { drawerContent } from "./ui/drawer-content.ts";
import { renderHeroTable, renderLayerChips, renderLegend, renderPage, renderWageTicks, WAGE_MAX, WAGE_MIN, type PageState } from "./ui/page.ts";
import { renderGermany, renderYou, type DrawerTarget } from "./viz/hero.ts";
import { renderLandBars, renderLandMap } from "./viz/land-map.ts";
import { renderReceipts } from "./viz/receipts.ts";
import { renderGermanyStages, renderYouStages } from "./viz/stages.ts";
import { renderTimeStrip } from "./viz/timestrip.ts";
import { hideTooltip } from "./viz/tooltip.ts";

document.documentElement.classList.add("enhanced");

const app = document.querySelector<HTMLElement>("#app")!;
const germany = buildGermany();
const lands = equalisation();
const series = timeSeries();
const items = purchases();

interface State extends PageState {
  open: string | null;
}

const LAYERS: LayerId[] = ["payday", "shopping", "fuel", "home"];

function parseHash(): State {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const year = Number(params.get("year"));
  const validYear = payslipYears.includes(year) ? year : 2024;
  const wage = Number(params.get("wage"));
  const lang = params.get("lang") === "de" || params.get("lang") === "en" ? (params.get("lang") as Lang) : navigator.language.toLowerCase().startsWith("de") ? "de" : "en";
  const land = params.get("land")?.toUpperCase() ?? GERMANY_CODE;
  const layer = params.get("layer") as LayerId | null;
  return {
    zoom: params.get("zoom") === "germany" ? "germany" : "you",
    wage: Number.isFinite(wage) && wage > 0 && wage < 1e7 ? Math.round(wage) : defaultWage(validYear),
    year: validYear,
    land: land === GERMANY_CODE || getPlace(land) ? land : GERMANY_CODE,
    lang,
    pot: params.get("pot") ?? "pot-fed",
    unit: params.get("unit") === "day" ? "day" : "bn",
    layer: layer && LAYERS.includes(layer) ? layer : "all",
    theme: params.get("theme") === "dark" || params.get("theme") === "light" ? (params.get("theme") as "light" | "dark") : "auto",
    tex: params.get("tex") === "1",
    open: params.get("open"),
  };
}

function hashOf(s: State): string {
  const params = new URLSearchParams({
    zoom: s.zoom,
    wage: String(s.wage),
    land: s.land,
    year: String(s.year),
    lang: s.lang,
    pot: s.pot,
  });
  if (s.zoom === "germany") {
    params.set("unit", s.unit);
  }
  if (s.layer !== "all") {
    params.set("layer", s.layer);
  }
  if (s.theme !== "auto") {
    params.set("theme", s.theme);
  }
  if (s.tex) {
    params.set("tex", "1");
  }
  if (s.open) {
    params.set("open", s.open);
  }
  return `#${params.toString()}`;
}

let state = parseHash();
/** The Shopping layer carries the ≈* household estimate in the flow. */
const withEstimate = (s: State): boolean => s.zoom === "you" && (s.layer === "all" || s.layer === "shopping");
let you = buildYou(state.year, state.wage, state.land, { estimate: withEstimate(state) });
let lastTrigger: HTMLElement | null = null;

const isMobile = () => window.matchMedia("(max-width: 760px)").matches;
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
const effectiveTheme = (): "light" | "dark" => (state.theme === "auto" ? (prefersDark.matches ? "dark" : "light") : state.theme);

/** Theme and texture live on <html>; every colour is a CSS variable, so only JS-computed colours (map) re-render. */
function applyDisplay(): void {
  const root = document.documentElement;
  if (state.theme === "auto") {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = state.theme;
  }
  root.classList.toggle("textures", state.tex);
}

let liveTimer = 0;
/** Announce the payslip once the wage, Land or year settles (screen readers). */
function announce(): void {
  window.clearTimeout(liveTimer);
  liveTimer = window.setTimeout(() => {
    const live = document.querySelector<HTMLElement>("#live");
    if (!live || state.zoom !== "you") {
      return;
    }
    const p = you.payslip;
    const l = state.lang;
    live.textContent =
      l === "de"
        ? `Brutto ${eur(p.gross, l)}: netto ${eur(p.totals.net, l)}, Lohnsteuer ${eur(p.deductions_employee.lohnsteuer, l)}, Sozialbeiträge ${eur(p.totals.social_employee, l)}, Arbeitgeber zusätzlich ${eur(p.totals.social_employer, l)}.`
        : `Gross ${eur(p.gross, l)}: net ${eur(p.totals.net, l)}, wage tax ${eur(p.deductions_employee.lohnsteuer, l)}, social contributions ${eur(p.totals.social_employee, l)}, employer on top ${eur(p.totals.social_employer, l)}.`;
  }, 700);
}

function syncHash(): void {
  const hash = hashOf(state);
  if (window.location.hash !== hash) {
    history.replaceState(null, "", hash);
  }
}

function update(next: Partial<State>, options: { animate?: boolean; full?: boolean } = {}): void {
  const before = state;
  state = { ...state, ...next };
  if (state.year !== before.year || state.wage !== before.wage || state.land !== before.land || withEstimate(state) !== withEstimate(before)) {
    you = buildYou(state.year, state.wage, state.land, { estimate: withEstimate(state) });
    if (!you.pots.some((pot) => pot.id === state.pot)) {
      state.pot = "pot-fed";
    }
  }
  syncHash();
  if (state.theme !== before.theme || state.tex !== before.tex) {
    applyDisplay();
    renderMap();
  }
  if (options.full || state.lang !== before.lang) {
    prefersDark.addEventListener("change", () => {
  if (state.theme === "auto") {
    renderMap();
    syncControls();
  }
});

mountAll();
    return;
  }
  if (state.wage !== before.wage || state.land !== before.land || state.year !== before.year) {
    announce();
  }
  if (state.zoom !== before.zoom || state.layer !== before.layer) {
    refreshChrome();
  }
  if (state.year !== before.year) {
    refreshControls();
  }
  renderHero(options.animate ?? false);
  if (state.land !== before.land) {
    renderMap();
  }
  syncControls();
}

// ---------------------------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------------------------

function mountAll(): void {
  applyDisplay();
  document.documentElement.lang = state.lang;
  document.title = t("docTitle", state.lang);
  document.querySelector('meta[name="description"]')?.setAttribute("content", t("description", state.lang));
  app.innerHTML = renderPage(state, you, germany);
  wireControls();
  wireDrawer();
  renderHero(false);
  renderMap();
  renderTimeStrip(document.querySelector<HTMLElement>("#time-strip")!, series, state.lang);
  syncControls();
  if (state.open) {
    const target = decodeTarget(state.open);
    if (target) {
      openDrawer(target, null);
    }
  }
}

function refreshChrome(): void {
  const chips = document.querySelector(".layers");
  if (chips) {
    chips.outerHTML = renderLayerChips(state);
    wireChips();
  }
  const legend = document.querySelector(".legend");
  if (legend) {
    legend.outerHTML = renderLegend(state);
  }
  const line = document.querySelector<HTMLElement>("#hero-line");
  if (line) {
    line.textContent = state.zoom === "you" ? t("assumptions", state.lang) : t("switchGermany", state.lang);
  }
  document.querySelector<HTMLElement>(".ctl-unit")?.toggleAttribute("hidden", state.zoom !== "germany");
  for (const control of document.querySelectorAll<HTMLElement>(".ctl-you")) {
    control.toggleAttribute("hidden", state.zoom !== "you");
  }
}

function refreshControls(): void {
  // tick positions depend on the year (average earnings, ceilings)
  const ticks = document.querySelector("#wage-ticks");
  if (ticks) {
    ticks.outerHTML = renderWageTicks(state);
    wireTicks();
  }
}

function renderHero(animate: boolean): void {
  const flow = document.querySelector<HTMLElement>("#flow")!;
  const receipts = document.querySelector<HTMLElement>("#receipts")!;
  hideTooltip();
  const isolated = state.layer === "all" ? null : state.layer;
  // Fuel & energy and Home isolate the per-item receipts; Shopping keeps the flow and highlights the ≈ estimate
  const dimmed = state.zoom === "you" && (isolated === "fuel" || isolated === "home");
  flow.classList.toggle("is-mobile", isMobile());
  flow.classList.toggle("is-collapsed", dimmed);
  if (isMobile()) {
    if (state.zoom === "you") {
      renderYouStages(flow, you, { lang: state.lang, selectedPot: state.pot, onOpen: (target) => openDrawer(target, null), onSelectPot: (id) => update({ pot: id }) });
    } else {
      renderGermanyStages(flow, germany, { lang: state.lang, unit: state.unit, onOpen: (target) => openDrawer(target, null) });
    }
  } else {
    const options = {
      lang: state.lang,
      selectedPot: state.pot,
      dimmed,
      unit: state.unit,
      animate,
      onSelectPot: (id: string) => update({ pot: id }),
      onOpen: (target: DrawerTarget) => openDrawer(target, document.activeElement as HTMLElement),
    };
    if (state.zoom === "you") {
      renderYou(flow, you, options);
      flow.querySelector("svg")?.classList.toggle("focus-estimate", isolated === "shopping");
    } else {
      renderGermany(flow, germany, options);
    }
  }
  const twin = document.querySelector<HTMLElement>("#flow-table");
  if (twin) {
    twin.innerHTML = renderHeroTable(state, you, germany);
  }
  const layers = new Set<LayerId>(state.layer === "all" ? LAYERS : [state.layer]);
  if (state.zoom === "you" && !(isolated === "payday")) {
    receipts.hidden = false;
    renderReceipts(receipts, items, { lang: state.lang, layers, isolated, onOpen: (id) => openDrawer({ kind: "purchase", id }, document.activeElement as HTMLElement) });
  } else {
    receipts.hidden = true;
    receipts.replaceChildren();
  }
}

function renderMap(): void {
  const map = document.querySelector<HTMLElement>("#map");
  const bars = document.querySelector<HTMLElement>("#land-bars");
  const key = document.querySelector<HTMLElement>("#map-key");
  if (!map || !bars || !key) {
    return;
  }
  const onSelect = (code: string) => update({ land: code });
  renderLandMap(map, lands, { lang: state.lang, selected: state.land, onSelect });
  renderLandBars(bars, lands, { lang: state.lang, selected: state.land, onSelect });
  const max = Math.max(...lands.map((land) => Math.abs(land.perResident)));
  const money = (v: number) => (state.lang === "de" ? `${Math.round(v).toLocaleString("de-DE")} €` : `€${Math.round(v).toLocaleString("en-GB")}`);
  key.innerHTML = `<span class="key-ramp" aria-hidden="true"></span><span class="key-labels"><span>${t("mapPays", state.lang)} −${money(max)}</span><span>0</span><span>${t("mapReceives", state.lang)} +${money(max)}</span></span>`;
}

// ---------------------------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------------------------

function syncControls(): void {
  const range = document.querySelector<HTMLInputElement>("#wage-range");
  const number = document.querySelector<HTMLInputElement>("#wage-number");
  if (range && document.activeElement !== range) {
    range.value = String(Math.min(WAGE_MAX, Math.max(WAGE_MIN, state.wage)));
  }
  if (number && document.activeElement !== number) {
    number.value = String(state.wage);
  }
  const land = document.querySelector<HTMLSelectElement>("#land-select");
  if (land) {
    land.value = state.land;
  }
  for (const fieldset of document.querySelectorAll<HTMLElement>("fieldset.seg")) {
    const name = fieldset.dataset.control as keyof State;
    for (const button of fieldset.querySelectorAll<HTMLButtonElement>("button")) {
      button.setAttribute("aria-pressed", String(String(state[name]) === button.dataset.value));
    }
  }
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-control='theme'] button")) {
    button.setAttribute("aria-pressed", String(button.dataset.value === effectiveTheme()));
  }
  document.querySelector("#tex-toggle")?.setAttribute("aria-pressed", String(state.tex));
  const toggle = document.querySelector<HTMLButtonElement>("#controls-toggle");
  if (toggle) {
    const place = state.land === GERMANY_CODE ? t("allLaender", state.lang) : (getPlace(state.land)?.name[state.lang] ?? state.land);
    toggle.textContent = `${t("settings", state.lang)} · ${state.zoom === "you" ? `${eur(state.wage, state.lang)} · ${place} · ${state.year}` : t("zoomGermany", state.lang)}`;
  }
}

let rangeFrame = 0;
/** Tick labels: each goes to the first row where it does not touch its left neighbour (measured, ≤ 3 rows). */
function layoutTickLabels(): void {
  const ticks = [...document.querySelectorAll<HTMLButtonElement>(".tick-mark")].sort((a, b) => a.offsetLeft - b.offsetLeft);
  const rowEnds: number[] = [];
  const ROW = 12;
  for (const tick of ticks) {
    const label = tick.querySelector("span");
    tick.classList.remove("row-0", "row-1");
    if (!label) {
      continue;
    }
    label.style.top = "5px";
    const box = label.getBoundingClientRect();
    let row = rowEnds.findIndex((end) => box.left > end + 6);
    if (row === -1) {
      row = Math.min(rowEnds.length, 2);
    }
    rowEnds[row] = box.right;
    label.style.top = `${5 + row * ROW}px`;
    tick.style.height = "6px";
  }
  const holder = document.querySelector<HTMLElement>(".range-wrap");
  const box = document.querySelector<HTMLElement>("#wage-ticks");
  const height = `${20 + Math.max(0, rowEnds.length - 1) * ROW}px`;
  if (holder && box) {
    holder.style.paddingBottom = height;
    box.style.height = height;
  }
}

function wireTicks(): void {
  requestAnimationFrame(layoutTickLabels);
  for (const tick of document.querySelectorAll<HTMLButtonElement>(".tick-mark")) {
    tick.addEventListener("click", () => update({ wage: Number(tick.dataset.wage) }, { animate: true }));
  }
}

function wireChips(): void {
  for (const chip of document.querySelectorAll<HTMLButtonElement>(".chip")) {
    chip.addEventListener("click", () => {
      const layer = chip.dataset.layer as LayerId;
      const next = state.layer === layer ? "all" : layer;
      update({ layer: next });
      for (const other of document.querySelectorAll<HTMLButtonElement>(".chip")) {
        other.setAttribute("aria-pressed", String(next === "all" || next === other.dataset.layer));
      }
    });
  }
}

function wireControls(): void {
  // the controls are a <form> for grouping only; Enter in the wage field must not submit (reload) it
  document.querySelector<HTMLFormElement>("#controls")?.addEventListener("submit", (event) => event.preventDefault());
  const range = document.querySelector<HTMLInputElement>("#wage-range")!;
  const number = document.querySelector<HTMLInputElement>("#wage-number")!;
  range.addEventListener("input", () => {
    cancelAnimationFrame(rangeFrame);
    rangeFrame = requestAnimationFrame(() => {
      number.value = range.value;
      update({ wage: Number(range.value) });
    });
  });
  number.addEventListener("change", () => {
    const value = Math.round(Number(number.value));
    if (Number.isFinite(value) && value >= 0 && value < 1e7) {
      update({ wage: value }, { animate: true });
    }
  });
  document.querySelector<HTMLSelectElement>("#land-select")!.addEventListener("change", (event) => {
    update({ land: (event.target as HTMLSelectElement).value }, { animate: true });
  });
  for (const fieldset of document.querySelectorAll<HTMLElement>("fieldset.seg")) {
    const name = fieldset.dataset.control!;
    for (const button of fieldset.querySelectorAll<HTMLButtonElement>("button")) {
      button.addEventListener("click", () => {
        const value = button.dataset.value!;
        if (name === "year") {
          update({ year: Number(value) }, { animate: true });
        } else if (name === "zoom") {
          update({ zoom: value as State["zoom"] });
        } else if (name === "unit") {
          update({ unit: value as State["unit"] });
        } else if (name === "lang") {
          update({ lang: value as Lang });
        } else if (name === "theme") {
          update({ theme: value as State["theme"] });
        }
      });
    }
  }
  wireTicks();
  wireChips();
  document.querySelector<HTMLButtonElement>("#tex-toggle")?.addEventListener("click", () => update({ tex: !state.tex }));
  const toggle = document.querySelector<HTMLButtonElement>("#controls-toggle")!;
  toggle.addEventListener("click", () => {
    const open = !document.body.classList.contains("controls-open");
    document.body.classList.toggle("controls-open", open);
    toggle.setAttribute("aria-expanded", String(open));
  });
}

// ---------------------------------------------------------------------------------------------
// Drawer
// ---------------------------------------------------------------------------------------------

const encodeTarget = (target: DrawerTarget): string =>
  target.kind === "cofog" ? `cofog:${target.code}` : `${target.kind}:${"id" in target ? target.id : ""}`;

function decodeTarget(value: string): DrawerTarget | null {
  const [kind, id] = value.split(":") as [string, string | undefined];
  if (!id) {
    return null;
  }
  if (kind === "cofog") {
    return { kind, code: id };
  }
  if (kind === "node" || kind === "pot" || kind === "bridge" || kind === "purchase") {
    return { kind, id };
  }
  return null;
}

function openDrawer(target: DrawerTarget, trigger: HTMLElement | null): void {
  const drawer = document.querySelector<HTMLElement>("#drawer")!;
  const backdrop = document.querySelector<HTMLElement>("#drawer-backdrop")!;
  let content;
  try {
    content = drawerContent(target, { lang: state.lang, zoom: state.zoom, you, germany, unit: state.unit });
  } catch (error) {
    console.error(error);
    return;
  }
  if (!content.html) {
    return;
  }
  hideTooltip();
  lastTrigger = trigger ?? lastTrigger;
  document.querySelector("#drawer-title")!.textContent = content.title;
  document.querySelector("#drawer-body")!.innerHTML = content.html;
  drawer.hidden = false;
  backdrop.hidden = false;
  for (const region of document.querySelectorAll<HTMLElement>("#app > header, #app > main, #app > footer, .skip-link")) {
    region.inert = true;
  }
  requestAnimationFrame(() => drawer.classList.add("is-open"));
  document.querySelector<HTMLButtonElement>("#drawer-close")?.focus({ preventScroll: true });
  if (state.open !== encodeTarget(target)) {
    state = { ...state, open: encodeTarget(target) };
    syncHash();
  }
}

function closeDrawer(): void {
  const drawer = document.querySelector<HTMLElement>("#drawer");
  if (!drawer || drawer.hidden) {
    return;
  }
  drawer.classList.remove("is-open");
  drawer.hidden = true;
  for (const region of document.querySelectorAll<HTMLElement>("#app > header, #app > main, #app > footer, .skip-link")) {
    region.inert = false;
  }
  document.querySelector<HTMLElement>("#drawer-backdrop")!.hidden = true;
  state = { ...state, open: null };
  syncHash();
  lastTrigger?.focus?.({ preventScroll: true });
  lastTrigger = null;
}

function wireDrawer(): void {
  document.querySelector("#drawer-close")!.addEventListener("click", closeDrawer);
  document.querySelector("#drawer-backdrop")!.addEventListener("click", closeDrawer);
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeDrawer();
    document.body.classList.remove("controls-open");
  }
  // keep focus inside the open drawer
  const drawer = document.querySelector<HTMLElement>("#drawer");
  if (event.key === "Tab" && drawer && !drawer.hidden) {
    const focusable = [...drawer.querySelectorAll<HTMLElement>("a, button, summary, [tabindex='0']")].filter((el) => el.offsetParent !== null);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) {
      return;
    }
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});

window.addEventListener("hashchange", () => {
  const next = parseHash();
  const changed = (Object.keys(next) as (keyof State)[]).some((key) => next[key] !== state[key]);
  if (changed) {
    const open = next.open;
    update({ ...next, open: null }, { full: next.lang !== state.lang });
    if (open) {
      const target = decodeTarget(open);
      if (target) {
        openDrawer(target, null);
      }
    } else {
      closeDrawer();
    }
  }
});

let resizeTimer = 0;
let lastWidth = window.innerWidth;
window.addEventListener("resize", () => {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    if (window.innerWidth !== lastWidth) {
      lastWidth = window.innerWidth;
      renderHero(false);
    }
  }, 120);
});

mountAll();
