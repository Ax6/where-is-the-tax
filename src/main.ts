import "./styles.css";

import { buildGermany, buildYou, defaultWage, DEFAULT_PAGE_YEAR, ENTITY_ORDER, equalisation, GERMANY_CODE, getPlace, PAGE_YEARS, timeSeries, type EntityId } from "./data/model.ts";
import { assumptionsText, eur, fill, type Lang, pct, t, titleFor, tr } from "./i18n.ts";
import { drawerContent, purchaseDetail } from "./ui/drawer-content.ts";
import { mapTitleFor, renderDataTable, renderHeroTable, renderLegendRow, renderPage, renderSources, renderTaxTable, renderTitle, renderWageTicks, WAGE_MAX, WAGE_MIN, WAGE_STEP, type PageState } from "./ui/page.ts";
import { renderGermany, renderYou, type DrawerTarget, type PanelId } from "./viz/hero.ts";
import { renderLandBars, renderLandMap } from "./viz/land-map.ts";
import { renderGermanyStages, renderYouStages } from "./viz/stages.ts";
import { renderTimeStrip } from "./viz/timestrip.ts";
import { hideTooltip, showTooltip } from "./viz/tooltip.ts";

// Measure diagram labels in the chosen typeface; keep the system fallback if the font cannot load.
await document.fonts.load('400 14px "IBM Plex Sans"').catch(() => []);

document.documentElement.classList.add("enhanced");

const app = document.querySelector<HTMLElement>("#app")!;
const series = timeSeries();

interface State extends PageState {
  open: string | null;
}

const DEFAULT_POT = "pot-fed";

const isPageYear = (year: number): boolean => (PAGE_YEARS as readonly number[]).includes(year);

function parseHash(): State {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const yearParam = Number(params.get("y") ?? params.get("year"));
  // old links: a payslip year past the page's last year (2026) opens that last year
  const lastYear = PAGE_YEARS[PAGE_YEARS.length - 1]!;
  const year = isPageYear(yearParam) ? yearParam : Number.isFinite(yearParam) && yearParam > lastYear ? lastYear : DEFAULT_PAGE_YEAR;
  const wage = Number(params.get("wage"));
  const wageSet = params.has("wage") && Number.isFinite(wage) && wage > 0 && wage < 1e7;
  const lang = params.get("lang") === "de" || params.get("lang") === "en" ? (params.get("lang") as Lang) : navigator.language.toLowerCase().startsWith("de") ? "de" : "en";
  const land = params.get("land")?.toUpperCase() ?? GERMANY_CODE;
  const highlight = params.get("hl") as EntityId | null;
  return {
    zoom: params.get("zoom") === "germany" ? "germany" : "you",
    wage: wageSet ? Math.round(wage) : Math.round(defaultWage(year)),
    wageSet,
    year,
    land: land === GERMANY_CODE || getPlace(land) ? land : GERMANY_CODE,
    lang,
    unit: params.get("unit") === "day" ? "day" : "bn",
    // old links: "layer=payday" isolated the payslip, so the purchase estimate stays off
    estimate: params.has("est") ? params.get("est") !== "0" : params.get("layer") !== "payday",
    highlight: highlight && ENTITY_ORDER.includes(highlight) ? highlight : null,
    theme: params.get("theme") === "dark" || params.get("theme") === "light" ? (params.get("theme") as "light" | "dark") : "auto",
    tex: params.get("tex") === "1",
    pot: params.get("pot") ?? DEFAULT_POT,
    open: params.get("open"),
  };
}

function hashOf(s: State): string {
  const params = new URLSearchParams({ y: String(s.year), lang: s.lang });
  if (s.zoom === "germany") {
    params.set("zoom", "germany");
  }
  if (s.wageSet) {
    params.set("wage", String(s.wage));
  }
  if (s.land !== GERMANY_CODE) {
    params.set("land", s.land);
  }
  if (!s.estimate) {
    params.set("est", "0");
  }
  if (s.highlight) {
    params.set("hl", s.highlight);
  }
  if (s.theme !== "auto") {
    params.set("theme", s.theme);
  }
  if (s.tex) {
    params.set("tex", "1");
  }
  if (s.zoom === "you" && s.pot !== DEFAULT_POT) {
    params.set("pot", s.pot);
  }
  if (s.open) {
    params.set("open", s.open);
  }
  return `#${params.toString()}`;
}

let state = parseHash();
const withEstimate = (s: State): boolean => s.zoom === "you" && s.estimate;
let you = buildYou(state.year, state.wage, state.land, { estimate: withEstimate(state) });
if (!you.pots.some((pot) => pot.id === state.pot)) {
  state.pot = DEFAULT_POT;
}
let germany = buildGermany(state.year);
let lands = equalisation(state.year);
let lastTrigger: HTMLElement | SVGElement | null = null;

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
        ? `${state.year}, brutto ${eur(p.gross, l)}: netto ${eur(p.totals.net, l)}, Lohnsteuer ${eur(p.deductions_employee.lohnsteuer, l)}, Sozialbeiträge ${eur(p.totals.social_employee, l)}, Arbeitgeber zusätzlich ${eur(p.totals.social_employer, l)}.`
        : `${state.year}, gross ${eur(p.gross, l)}: net ${eur(p.totals.net, l)}, wage tax ${eur(p.deductions_employee.lohnsteuer, l)}, social contributions ${eur(p.totals.social_employee, l)}, employer on top ${eur(p.totals.social_employer, l)}.`;
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
  if (state.year !== before.year && !state.wageSet) {
    // the default wage follows the year's median until the reader sets one
    state.wage = Math.round(defaultWage(state.year));
  }
  if (state.year !== before.year) {
    germany = buildGermany(state.year);
    lands = equalisation(state.year);
  }
  if (state.year !== before.year || state.wage !== before.wage || state.land !== before.land || withEstimate(state) !== withEstimate(before)) {
    you = buildYou(state.year, state.wage, state.land, { estimate: withEstimate(state) });
    if (!you.pots.some((pot) => pot.id === state.pot)) {
      state.pot = DEFAULT_POT;
    }
  }
  syncHash();
  if (state.theme !== before.theme || state.tex !== before.tex) {
    applyDisplay();
    renderMap();
  }
  if (options.full || state.lang !== before.lang) {
    mountAll();
    return;
  }
  if (state.wage !== before.wage || state.land !== before.land || state.year !== before.year) {
    announce();
  }
  if (state.year !== before.year) {
    refreshYear();
  }
  if (state.zoom !== before.zoom || state.estimate !== before.estimate || state.highlight !== before.highlight || state.year !== before.year) {
    refreshChrome();
  }
  renderHero(options.animate ?? false, { crossfade: state.zoom !== before.zoom ? (state.zoom === "germany" ? "out" : "in") : undefined });
  if (state.land !== before.land || state.year !== before.year || state.zoom !== before.zoom) {
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
  document.title = titleFor(state.year, state.lang, state.zoom);
  document.querySelector('meta[name="description"]')?.setAttribute("content", t("description", state.lang));
  app.innerHTML = renderPage(state, you, germany);
  wireControls();
  wireChrome();
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

function refreshTitle(): void {
  const { lang, year, zoom } = state;
  document.title = titleFor(year, lang, zoom);
  document.querySelector("#title")!.innerHTML = renderTitle(year, lang, zoom);
  document.querySelector("#title")!.setAttribute("aria-label", titleFor(year, lang, zoom));
}

/** Year change: everything that names or reads a year, without rebuilding the controls (focus stays). */
function refreshYear(): void {
  const { lang, year } = state;
  refreshTitle();
  document.querySelector("#map-title")!.textContent = mapTitleFor(year, lang);
  const ticks = document.querySelector("#wage-ticks");
  if (ticks) {
    ticks.outerHTML = renderWageTicks(state);
    wireTicks();
  }
  document.querySelector("#taxes-title")!.textContent = `${t("taxesTitle", lang)} ${year}`;
  const taxes = document.querySelector<HTMLElement>("#taxes")!;
  for (const old of taxes.querySelectorAll(":scope > :not(h2)")) {
    old.remove();
  }
  taxes.insertAdjacentHTML("beforeend", renderTaxTable(lang, year, 14));
  const sources = document.querySelector<HTMLElement>("#sources")!;
  sources.querySelector(".data-details")!.outerHTML = renderDataTable(lang, you, germany);
  const files = sources.querySelector<HTMLElement>(".data-details + details");
  if (files) {
    files.innerHTML = `<summary>${lang === "de" ? "Datendateien" : "Data files"}</summary>${renderSources(lang, year)}`;
  }
}

function refreshChrome(): void {
  const row = document.querySelector(".legend-row");
  if (row) {
    const focused = document.activeElement?.closest(".legend-row") ? (document.activeElement as HTMLElement).dataset.entityKey ?? document.activeElement.id : null;
    row.outerHTML = renderLegendRow(state);
    wireChrome();
    if (focused) {
      document.querySelector<HTMLElement>(`.legend-row [data-entity-key="${focused}"], .legend-row #${CSS.escape(focused)}`)?.focus({ preventScroll: true });
    }
  }
  const line = document.querySelector<HTMLElement>("#hero-line");
  if (line) {
    line.textContent = state.zoom === "you" ? assumptionsText(state.lang, state.year) : t("switchGermany", state.lang);
  }
  refreshTitle();
  // Germany view: the map column shrinks to a dormant, grey, inert thumbnail and the flow takes the width.
  // The grid animates; the hero is drawn at its final width, measured with the transition switched off.
  const grid = document.querySelector<HTMLElement>(".hero-grid");
  const wide = state.zoom === "germany";
  if (grid && grid.classList.contains("is-wide") !== wide) {
    grid.classList.add("no-transition");
    grid.classList.toggle("is-wide", wide);
    heroWidth = document.querySelector<HTMLElement>("#flow")?.clientWidth;
    grid.classList.toggle("is-wide", !wide);
    void grid.offsetWidth;
    grid.classList.remove("no-transition");
    grid.classList.toggle("is-wide", wide);
  }
  document.querySelector<HTMLElement>(".map-panel")?.toggleAttribute("inert", wide);
  document.querySelector<HTMLElement>(".wage-ctl")?.toggleAttribute("hidden", state.zoom !== "you");
  requestAnimationFrame(layoutTickLabels);
}

/**
 * Draws the hero. On a view switch ("crossfade": zooming out to Germany or back in to You) the old chart stays as a
 * ghost that lifts away while the new one rises in (styles.css: flow-out / flow-in); nothing to tween between the two.
 */
/** width the hero should be drawn at while the grid is still animating towards it */
let heroWidth: number | undefined;

function renderHero(animate: boolean, options: { crossfade?: "out" | "in" } = {}): void {
  const flow = document.querySelector<HTMLElement>("#flow")!;
  const focusedKey = flow.contains(document.activeElement) ? (document.activeElement as HTMLElement).dataset.key : undefined;
  hideTooltip();
  flow.querySelector(".flow-ghost")?.remove();
  const ghost = options.crossfade && !window.matchMedia("(prefers-reduced-motion: reduce)").matches ? (flow.firstElementChild?.cloneNode(true) as HTMLElement | null) : null;
  flow.classList.toggle("is-mobile", isMobile());
  const onOpen = (target: DrawerTarget, trigger?: HTMLElement) => openDrawer(target, trigger ?? document.activeElement as HTMLElement);
  const onSelectPot = (id: string) => update({ pot: id });
  if (isMobile()) {
    if (state.zoom === "you") {
      renderYouStages(flow, you, { lang: state.lang, year: state.year, selectedPot: state.pot, onOpen, onSelectPot });
    } else {
      renderGermanyStages(flow, germany, { lang: state.lang, unit: state.unit, onOpen });
    }
    flow.dataset.highlight = state.highlight ?? "";
  } else {
    const options = { lang: state.lang, year: state.year, unit: state.unit, animate, highlight: state.highlight, selectedPot: state.pot, onSelectPot, onOpen, width: heroWidth };
    if (state.zoom === "you") {
      renderYou(flow, you, options);
    } else {
      renderGermany(flow, germany, options);
    }
  }
  heroWidth = undefined;
  const twin = document.querySelector<HTMLElement>("#flow-table");
  if (twin) {
    twin.innerHTML = renderHeroTable(state, you, germany);
  }
  if (focusedKey) {
    flow.querySelector<HTMLElement>(`[data-key="${CSS.escape(focusedKey)}"]`)?.focus({ preventScroll: true });
  }
  if (ghost) {
    ghost.classList.add("flow-ghost");
    ghost.setAttribute("aria-hidden", "true");
    ghost.inert = true;
    flow.dataset.enter = options.crossfade;
    flow.append(ghost);
    const done = () => {
      ghost.remove();
      delete flow.dataset.enter;
    };
    ghost.addEventListener("animationend", done, { once: true });
    window.setTimeout(done, 600);
  }
}

function renderMap(): void {
  const map = document.querySelector<HTMLElement>("#map");
  const key = document.querySelector<HTMLElement>("#map-key");
  const place = document.querySelector<HTMLElement>("#map-place");
  if (!map || !key || !place) {
    return;
  }
  const { lang } = state;
  // a phone cannot hit Berlin or Bremen: there the map only shows, the select picks
  map.inert = isMobile();
  const select = document.querySelector<HTMLSelectElement>("#land-select");
  if (select) {
    if (!select.options.length) {
      const byName = [...lands].sort((a, b) => tr(a.name, lang).localeCompare(tr(b.name, lang), lang));
      select.innerHTML = [`<option value="${GERMANY_CODE}">${t("allLaender", lang)}</option>`, ...byName.map((land) => `<option value="${land.code}">${tr(land.name, lang)}</option>`)].join("");
    }
    select.value = state.land;
  }
  renderLandMap(map, lands, {
    lang,
    year: state.year,
    selected: state.land,
    zoom: state.zoom,
    onSelect: (code, trigger) => {
      update({ land: code }, { animate: true });
      // in the Germany view the map is not a place picker: a click shows the ranking with this Land marked
      if (state.zoom === "germany") {
        openDrawer({ kind: "panel", id: "ranking" }, trigger);
      }
    },
  });
  const money = (v: number) => (lang === "de" ? `${Math.round(v).toLocaleString("de-DE")} €` : `€${Math.round(v).toLocaleString("en-GB")}`);
  key.innerHTML = mapKeyHtml();
  const selected = lands.find((land) => land.code === state.land);
  place.textContent = selected
    ? `${tr(selected.name, lang)} · ${selected.perResident >= 0 ? "+" : "−"}${money(Math.abs(selected.perResident))} ${lang === "de" ? "je Einw." : "per resident"}`
    : t("mapAll", lang);
  place.classList.toggle("is-selected", Boolean(selected));
  renderRanking();
}

/** Ranking panel (drawer): sorted bars; clicking selects the Land (again: all Länder). */
function mapKeyHtml(): string {
  const { lang } = state;
  const max = Math.max(...lands.map((land) => Math.abs(land.perResident)));
  const money = (v: number) => (lang === "de" ? `${Math.round(v).toLocaleString("de-DE")} €` : `€${Math.round(v).toLocaleString("en-GB")}`);
  return `<span class="key-ramp" aria-hidden="true"></span><span class="key-labels"><span>${t("mapPays", lang)} <span class="nowrap">−${money(max)}</span></span><span>${t("mapReceives", lang)} <span class="nowrap">+${money(max)}</span></span></span>`;
}

/** A drawer that carries the map (#drawer-map): draw it, its key, and wire its ranking link. */
function wireDrawerMap(body: HTMLElement): void {
  const map = body.querySelector<HTMLElement>("#drawer-map");
  if (!map) {
    return;
  }
  // phone: the ranking right under it is the picker
  map.inert = isMobile();
  renderLandMap(map, lands, {
    lang: state.lang,
    year: state.year,
    selected: state.land,
    zoom: "germany",
    onSelect: (code, trigger) => {
      update({ land: code });
      openDrawer({ kind: "panel", id: "ranking" }, trigger);
    },
  });
  const key = body.querySelector<HTMLElement>("#drawer-map-key");
  if (key) {
    key.innerHTML = mapKeyHtml();
  }
  for (const button of body.querySelectorAll<HTMLButtonElement>("[data-panel]")) {
    button.addEventListener("click", () => openDrawer({ kind: "panel", id: button.dataset.panel as PanelId }, button));
  }
}

function renderRanking(): void {
  const bars = document.querySelector<HTMLElement>("#rank-bars");
  if (bars) {
    renderLandBars(bars, lands, { lang: state.lang, selected: state.land, onSelect: (code) => update({ land: code }, { animate: true }) });
  }
}

// ---------------------------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------------------------

const tickNames = (): { value: number; name: string }[] =>
  [...document.querySelectorAll<HTMLButtonElement>(".tick-mark")].map((tick) => ({ value: Number(tick.dataset.wage), name: tick.dataset.name ?? "" }));

/** The slider stops at whole €1,000; a reference wage within €500 of the stop wins (snap). */
function snapWage(sliderValue: number): { wage: number; tick?: string } {
  const tick = tickNames().find((candidate) => Math.abs(candidate.value - sliderValue) < WAGE_STEP / 2);
  return tick ? { wage: tick.value, tick: tick.name } : { wage: sliderValue };
}

const wageText = (wage: number): string => {
  const tick = tickNames().find((candidate) => candidate.value === wage);
  return `${eur(wage, state.lang)}${tick ? ` · ${tick.name}` : ""}`;
};

let wageDragging = false;

function syncControls(): void {
  const range = document.querySelector<HTMLInputElement>("#wage-range");
  if (range) {
    // iOS touch drags need not focus the range or match :active; writing value can interrupt them.
    if (!wageDragging && !range.matches(":active") && document.activeElement !== range) {
      range.value = String(Math.min(WAGE_MAX, Math.max(WAGE_MIN, Math.round(state.wage / WAGE_STEP) * WAGE_STEP)));
    }
    range.setAttribute("aria-valuetext", wageText(state.wage));
    sliceRange(range);
  }
  const cut = document.querySelector<HTMLElement>("#wage-cut");
  if (cut) {
    const p = you.payslip;
    const share = (p.gross - p.totals.net) / p.gross;
    cut.innerHTML = `<span class="cut-swatch" aria-hidden="true"></span><span class="cut-text"><span>${pct(share, state.lang, 0)} ${t("deductions", state.lang)}</span><span class="cut-eur">${eur(p.gross - p.totals.net, state.lang)}</span></span>`;
    cut.title = fill(t("deductionsName", state.lang), eur(p.gross - p.totals.net, state.lang));
  }
  const figure = document.querySelector<HTMLButtonElement>("#wage-figure");
  if (figure) {
    figure.textContent = eur(state.wage, state.lang);
    figure.setAttribute("aria-label", `${t("wageType", state.lang)}: ${eur(state.wage, state.lang)}`);
  }
  for (const tick of document.querySelectorAll<HTMLButtonElement>(".tick-mark")) {
    tick.classList.toggle("is-current", Number(tick.dataset.wage) === state.wage);
  }
  for (const fieldset of document.querySelectorAll<HTMLElement>("fieldset.seg")) {
    const name = fieldset.dataset.control as keyof State;
    for (const button of fieldset.querySelectorAll<HTMLButtonElement>("button")) {
      button.setAttribute("aria-pressed", String(String(state[name]) === button.dataset.value));
    }
  }
  document.querySelector("#theme-toggle")?.setAttribute("aria-pressed", String(effectiveTheme() === "dark"));
  document.querySelector("#tex-toggle")?.setAttribute("aria-pressed", String(state.tex));
  document.querySelector("#menu-toggle")?.setAttribute("aria-expanded", String(document.body.classList.contains("menu-open")));
}

/** Phone: the menu (language, theme, patterns) opens under its button; it closes on Escape or a tap elsewhere. */
function setMenu(open: boolean, options: { focus?: boolean } = {}): void {
  document.body.classList.toggle("menu-open", open);
  const toggle = document.querySelector<HTMLButtonElement>("#menu-toggle");
  toggle?.setAttribute("aria-expanded", String(open));
  if (options.focus) {
    (open ? document.querySelector<HTMLButtonElement>("#display-controls button") : toggle)?.focus({ preventScroll: true });
  }
}

/**
 * Phone, You view: the header is sticky with a negative top, so the title and the view row scroll away
 * and only the wage (figure and slider) stays pinned. Germany view: no slider, nothing pinned.
 */
function pinHeader(): void {
  const header = document.querySelector<HTMLElement>(".top");
  const wage = document.querySelector<HTMLElement>(".wage-ctl");
  if (!header || !wage) {
    return;
  }
  const pinned = isMobile() && !wage.hidden;
  header.classList.toggle("is-pinned", pinned);
  if (pinned) {
    header.style.setProperty("--pin", `${Math.round(header.getBoundingClientRect().top - wage.getBoundingClientRect().top + 8)}px`);
  }
}
const headerObserver = new ResizeObserver(pinHeader);

/** Tick labels: each goes to the first row where it does not touch its left neighbour (measured, ≤ 3 rows). */
function layoutTickLabels(): void {
  const ticks = [...document.querySelectorAll<HTMLButtonElement>(".tick-mark")].sort((a, b) => a.offsetLeft - b.offsetLeft);
  const rowEnds: number[] = [];
  const ROW = 12;
  for (const tick of ticks) {
    const label = tick.querySelector("span");
    if (!label) {
      continue;
    }
    label.style.top = "5px";
    const box = label.getBoundingClientRect();
    if (box.width === 0) {
      return;
    }
    let row = rowEnds.findIndex((end) => box.left > end + 6);
    if (row === -1) {
      row = Math.min(rowEnds.length, 2);
    }
    rowEnds[row] = box.right;
    label.style.top = `${5 + row * ROW}px`;
  }
  const holder = document.querySelector<HTMLElement>(".range-wrap");
  const box = document.querySelector<HTMLElement>("#wage-ticks");
  const height = `${18 + Math.max(0, rowEnds.length - 1) * ROW}px`;
  if (holder && box) {
    holder.style.paddingBottom = height;
    box.style.height = height;
  }
}

function wireTicks(): void {
  requestAnimationFrame(layoutTickLabels);
  for (const tick of document.querySelectorAll<HTMLButtonElement>(".tick-mark")) {
    tick.addEventListener("click", () => update({ wage: Number(tick.dataset.wage), wageSet: true }, { animate: true }));
  }
}

/** The slider's filled part is the gross; its stripes at the thumb end are what comes off it (styles.css). */
function sliceRange(range: HTMLInputElement): void {
  const p = you.payslip;
  range.style.setProperty("--p", String((Number(range.value) - Number(range.min)) / (Number(range.max) - Number(range.min))));
  range.style.setProperty("--cut", String(Math.max(0, Math.min(1, (p.gross - p.totals.net) / p.gross))));
}

let rangeFrame = 0;
function wireWage(): void {
  wageDragging = false;
  const range = document.querySelector<HTMLInputElement>("#wage-range")!;
  const bubble = document.querySelector<HTMLOutputElement>("#wage-bubble")!;
  const figure = document.querySelector<HTMLButtonElement>("#wage-figure")!;
  const input = document.querySelector<HTMLInputElement>("#wage-input")!;
  const placeBubble = () => {
    const min = Number(range.min);
    const max = Number(range.max);
    const thumb = 16;
    const x = ((Number(range.value) - min) / (max - min)) * (range.clientWidth - thumb) + thumb / 2;
    bubble.textContent = wageText(state.wage);
    const half = bubble.offsetWidth / 2;
    bubble.style.left = `${Math.max(half, Math.min(range.clientWidth - half, x))}px`;
  };
  range.addEventListener("pointerdown", () => {
    wageDragging = true;
    bubble.hidden = false;
    placeBubble();
  });
  const release = () => {
    wageDragging = false;
    bubble.hidden = true;
  };
  range.addEventListener("pointerup", release);
  range.addEventListener("pointercancel", release);
  range.addEventListener("blur", release);
  range.addEventListener("input", () => {
    sliceRange(range);
    cancelAnimationFrame(rangeFrame);
    rangeFrame = requestAnimationFrame(() => {
      const { wage } = snapWage(Number(range.value));
      update({ wage, wageSet: true });
      if (wageDragging) {
        placeBubble();
      }
    });
  });
  // click-to-type: the figure becomes a number field; Enter or leaving commits, Escape cancels
  const close = (commit: boolean) => {
    if (input.hidden) {
      return;
    }
    const value = Math.round(Number(input.value));
    input.hidden = true;
    figure.hidden = false;
    if (commit && Number.isFinite(value) && value > 0 && value < 1e7 && value !== state.wage) {
      update({ wage: value, wageSet: true }, { animate: true });
    }
    figure.focus({ preventScroll: true });
  };
  figure.addEventListener("click", () => {
    input.value = String(state.wage);
    figure.hidden = true;
    input.hidden = false;
    input.focus();
    input.select();
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      close(true);
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close(false);
    }
  });
  input.addEventListener("blur", () => close(true));
}

function wireControls(): void {
  wireWage();
  for (const fieldset of document.querySelectorAll<HTMLElement>("fieldset.seg")) {
    const name = fieldset.dataset.control!;
    for (const button of fieldset.querySelectorAll<HTMLButtonElement>("button")) {
      button.addEventListener("click", () => {
        const value = button.dataset.value!;
        if (name === "year") {
          update({ year: Number(value) }, { animate: true });
        } else if (name === "zoom") {
          update({ zoom: value as State["zoom"] });
        }
      });
    }
  }
  for (const button of document.querySelectorAll<HTMLButtonElement>(".lang-toggle button")) {
    button.addEventListener("click", () => {
      if (button.dataset.lang !== state.lang) {
        update({ lang: button.dataset.lang as Lang });
        document.querySelector<HTMLButtonElement>(`.lang-toggle [data-lang="${state.lang}"]`)?.focus({ preventScroll: true });
      }
    });
  }
  document.querySelector<HTMLButtonElement>("#theme-toggle")?.addEventListener("click", () => {
    const next = effectiveTheme() === "dark" ? "light" : "dark";
    // back to "auto" when the choice matches the system setting
    update({ theme: next === (prefersDark.matches ? "dark" : "light") ? "auto" : next });
  });
  document.querySelector<HTMLButtonElement>("#tex-toggle")?.addEventListener("click", () => update({ tex: !state.tex }));
  wireTicks();
  document.querySelector<HTMLButtonElement>("#menu-toggle")?.addEventListener("click", (event) => {
    setMenu(!document.body.classList.contains("menu-open"), { focus: event.detail === 0 });
  });
  document.querySelector<HTMLSelectElement>("#land-select")?.addEventListener("change", (event) => {
    update({ land: (event.target as HTMLSelectElement).value }, { animate: true });
  });
  headerObserver.disconnect();
  headerObserver.observe(document.querySelector<HTMLElement>(".top")!);
  for (const button of document.querySelectorAll<HTMLButtonElement>(".map-panel [data-panel]")) {
    button.addEventListener("click", () => openDrawer({ kind: "panel", id: button.dataset.panel as PanelId }, button));
  }
}

/** The row above the charts: Shopping panel, recipient highlight, ≈ estimate toggle. */
function wireChrome(): void {
  for (const button of document.querySelectorAll<HTMLButtonElement>(".legend-row [data-panel]")) {
    button.addEventListener("click", () => openDrawer({ kind: "panel", id: button.dataset.panel as PanelId }, button));
  }
  for (const button of document.querySelectorAll<HTMLButtonElement>(".legend-item[data-entity-key]")) {
    button.addEventListener("click", () => {
      const entity = button.dataset.entityKey as EntityId;
      update({ highlight: state.highlight === entity ? null : entity });
    });
  }
  document.querySelector<HTMLButtonElement>("#estimate-toggle")?.addEventListener("click", () => update({ estimate: !state.estimate }, { animate: true }));
}

// ---------------------------------------------------------------------------------------------
// Drawer and panels
// ---------------------------------------------------------------------------------------------

const encodeTarget = (target: DrawerTarget): string => (target.kind === "cofog" ? `cofog:${target.code}` : `${target.kind}:${target.id}`);

function decodeTarget(value: string): DrawerTarget | null {
  const [kind, id] = value.split(":") as [string, string | undefined];
  if (!id) {
    return null;
  }
  if (kind === "cofog") {
    return { kind, code: id };
  }
  if (kind === "panel") {
    return id === "shopping" || id === "ranking" ? { kind, id } : null;
  }
  if (kind === "node" || kind === "pot" || kind === "bridge" || kind === "purchase") {
    return { kind, id };
  }
  return null;
}

function wirePurchaseRows(body: HTMLElement): void {
  for (const row of body.querySelectorAll<HTMLElement>(".purchase-row")) {
    const show = (x: number, y: number) => {
      const detail = purchaseDetail(row.dataset.purchase!, state.year, state.lang);
      showTooltip({ ...detail, status: "law" }, { x, y }, state.lang);
    };
    row.addEventListener("pointerenter", (event) => show(event.clientX, event.clientY));
    row.addEventListener("pointermove", (event) => show(event.clientX, event.clientY));
    row.addEventListener("pointerleave", hideTooltip);
    row.addEventListener("focus", () => {
      const box = row.getBoundingClientRect();
      show(box.left + 40, box.bottom);
    });
    row.addEventListener("blur", hideTooltip);
    // the row opens that purchase's own drawer: price before tax and each tax inside it
    row.addEventListener("click", () => openDrawer({ kind: "purchase", id: row.dataset.purchase! }, null));
  }
}

function openDrawer(target: DrawerTarget, trigger: HTMLElement | SVGElement | null): void {
  const drawer = document.querySelector<HTMLElement>("#drawer")!;
  const backdrop = document.querySelector<HTMLElement>("#drawer-backdrop")!;
  let content;
  try {
    content = drawerContent(target, { lang: state.lang, zoom: state.zoom, year: state.year, land: state.land, you, germany, unit: state.unit });
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
  const body = document.querySelector<HTMLElement>("#drawer-body")!;
  body.innerHTML = content.html;
  body.scrollTop = 0;
  drawer.dataset.kind = target.kind === "panel" ? target.id : target.kind;
  if (target.kind === "panel" && target.id === "ranking") {
    renderRanking();
  }
  if (target.kind === "panel" && target.id === "shopping") {
    wirePurchaseRows(body);
  }
  wireDrawerMap(body);
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
  hideTooltip();
  drawer.classList.remove("is-open");
  drawer.hidden = true;
  for (const region of document.querySelectorAll<HTMLElement>("#app > header, #app > main, #app > footer, .skip-link")) {
    region.inert = false;
  }
  document.querySelector<HTMLElement>("#drawer-backdrop")!.hidden = true;
  document.querySelector<HTMLElement>("#drawer-body")!.replaceChildren();
  state = { ...state, open: null };
  syncHash();
  // Responsive redraws can replace the trigger while the drawer is open.
  const trigger = lastTrigger?.isConnected ? lastTrigger : lastTrigger?.dataset.key
    ? document.querySelector<HTMLElement>(`#flow [data-key="${CSS.escape(lastTrigger.dataset.key)}"]`)
    : null;
  const target = trigger ?? document.querySelector<HTMLElement>(".legend-row button");
  target?.focus({ preventScroll: true });
  // a focus() in the same task that lifted `inert` can be dropped (seen in CI): retry once next frame,
  // but only while nothing else has taken focus in the meantime
  if (target) {
    requestAnimationFrame(() => {
      const nowhere = !document.activeElement || document.activeElement === document.body;
      if (nowhere && target.isConnected) {
        target.focus({ preventScroll: true });
      }
    });
  }
  lastTrigger = null;
}

function wireDrawer(): void {
  document.querySelector("#drawer-close")!.addEventListener("click", closeDrawer);
  document.querySelector("#drawer-backdrop")!.addEventListener("click", closeDrawer);
}

document.addEventListener("pointerdown", (event) => {
  if (document.body.classList.contains("menu-open") && !(event.target as Element).closest("#display-controls, #menu-toggle")) {
    setMenu(false);
  }
});

document.addEventListener("keydown", (event) => {
  const drawer = document.querySelector<HTMLElement>("#drawer");
  if (event.key === "Escape") {
    hideTooltip();
    if (drawer && !drawer.hidden) {
      closeDrawer();
      return;
    }
    if (document.body.classList.contains("menu-open")) {
      setMenu(false, { focus: true });
    }
  }
  // keep focus inside the open drawer
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

prefersDark.addEventListener("change", () => {
  if (state.theme === "auto") {
    renderMap();
    syncControls();
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
      renderMap();
      layoutTickLabels();
      pinHeader();
    }
  }, 120);
});

mountAll();
