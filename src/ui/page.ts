/**
 * The page as HTML strings. Used at build time (static fallback, works without JavaScript) and in the
 * browser (re-rendered on language or year change). Every figure comes from the model; every table row links
 * to its data file and source coordinates.
 */
import {
  allocationKinds,
  ENTITY_ORDER,
  equalisation,
  equalisationSource,
  equalisationStatus,
  GERMANY_CODE,
  PAGE_YEARS,
  perResidentPerDay,
  populationOf,
  purchases,
  taxTable,
  minimumWageAssumption,
  wageTicks,
  type EntityId,
  type GermanyModel,
  type YouModel,
} from "../data/model.ts";
import { files, REPO_URL, raw, repoBlob } from "../data/sources.ts";
import { bn, eur, fill, num, pct, t, titleFor, tr, yearTag, type Lang } from "../i18n.ts";
import { esc, sourceList, splitBar, swatch } from "./html.ts";

export interface PageState {
  zoom: "you" | "germany";
  wage: number;
  /** false while the wage follows the year's median (not set by the reader) */
  wageSet: boolean;
  land: string;
  year: number;
  lang: Lang;
  unit: "bn" | "day";
  /** show the ≈* household estimate in the You flow */
  estimate: boolean;
  /** recipient whose flows are highlighted from the legend */
  highlight: EntityId | null;
  /** budget whose composition the right-hand column shows */
  pot: string;
  /** "auto" follows prefers-color-scheme */
  theme: "auto" | "light" | "dark";
  /** recipient textures (always on under forced colours) */
  tex: boolean;
}

export const WAGE_MIN = 6_000;
export const WAGE_MAX = 160_000;
export const WAGE_STEP = 1_000;

const ENTITY_LABEL: Record<EntityId, { de: string; en: string }> = {
  fed: { de: "Bund", en: "Federation" },
  land: { de: "Land / Länder", en: "Land / Länder" },
  muni: { de: "Gemeinden", en: "Municipalities" },
  eu: { de: "EU", en: "EU" },
  pension: { de: "Rentenversicherung", en: "Pension insurance" },
  health: { de: "Krankenversicherung", en: "Health insurance" },
  care: { de: "Pflegeversicherung", en: "Care insurance" },
  unemp: { de: "Arbeitslosenversicherung", en: "Unemployment insurance" },
};
export const entityName = (entity: EntityId, lang: Lang): string => ENTITY_LABEL[entity][lang];

export { yearTag };

function seg(name: string, options: { value: string; label: string }[], current: string, label: string, extra = ""): string {
  return `<fieldset class="seg ${extra}" data-control="${name}"><legend class="sr-only">${esc(label)}</legend>${options
    .map(
      (option) =>
        `<button type="button" data-value="${esc(option.value)}" aria-pressed="${option.value === current}">${esc(option.label)}</button>`,
    )
    .join("")}</fieldset>`;
}

const ICON_THEME = `<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M13.5 12.8A6 6 0 0 1 7.2 6.5a6 6 0 0 1 .9-3.2A7 7 0 1 0 16.7 12a6 6 0 0 1-3.2.8z"/></svg>`;
const ICON_PATTERNS = `<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><rect x="3" y="3" width="14" height="14" rx="1.5" fill="none"/><path d="M3 9 9 3M3 15 15 3M7 17 17 7M13 17l4-4"/></svg>`;

export function renderWageTicks(state: PageState): string {
  const { lang } = state;
  const ticks = wageTicks(state.year);
  const pos = (value: number) => ((value - WAGE_MIN) / (WAGE_MAX - WAGE_MIN)) * 100;
  const short: Record<string, string> = { minimum: t("ticksMinimumShort", lang), median: t("ticksMedian", lang), average: t("ticksAverageShort", lang) };
  const long: Record<string, string> = { minimum: t("ticksMinimumLong", lang), median: t("ticksMedianLong", lang), average: t("ticksAverageLong", lang) };
  const assumption = minimumWageAssumption(state.year);
  return `<div class="ticks" id="wage-ticks">${ticks
    .map((tick) => {
      const year = tick.fromYear ? ` (${tick.fromYear})` : "";
      // short text on the slider; the full name and definition on hover / in the accessible name
      const description = `${short[tick.id]}${year}: ${eur(tick.value, lang)}. ${long[tick.id]}${year}${tick.id === "minimum" && assumption ? `. * ${assumption}` : ""}`;
      return `<button type="button" class="tick-mark tick-${tick.id}" data-wage="${Math.round(tick.value)}" data-name="${esc(short[tick.id]!)}" style="left:${pos(tick.value).toFixed(2)}%" title="${esc(description)}" aria-label="${esc(description)}"><span aria-hidden="true">${esc(`${short[tick.id]}${year}`)}</span></button>`;
    })
    .join("")}</div>`;
}

export function renderControls(state: PageState): string {
  const { lang } = state;
  const sliderValue = Math.min(WAGE_MAX, Math.max(WAGE_MIN, state.wage));
  return `<div class="controls" id="controls" role="group" aria-label="${esc(t("settings", lang))}">
    <div class="view-controls">
      ${seg("zoom", [{ value: "you", label: t("zoomYou", lang) }, { value: "germany", label: t("zoomGermany", lang) }], state.zoom, t("zoom", lang), "seg-view")}
      ${seg("year", PAGE_YEARS.map((year) => ({ value: String(year), label: String(year) })), String(state.year), t("year", lang), "seg-year")}
    </div>
    <div class="wage-ctl"${state.zoom === "you" ? "" : " hidden"}>
      <div class="wage-head">
        <span class="ctl-label" id="wage-label">${esc(t("wage", lang))}</span>
        <button type="button" class="wage-figure num" id="wage-figure" aria-label="${esc(`${t("wageType", lang)}: ${eur(state.wage, lang)}`)}">${esc(eur(state.wage, lang))}</button>
        <input type="number" class="wage-input num" id="wage-input" min="0" max="999999" step="1" value="${state.wage}" aria-label="${esc(t("wageType", lang))}" hidden />
      </div>
      <div class="range-wrap">
        <input type="range" id="wage-range" min="${WAGE_MIN}" max="${WAGE_MAX}" step="${WAGE_STEP}" value="${Math.round(sliderValue / WAGE_STEP) * WAGE_STEP}" aria-labelledby="wage-label" aria-valuetext="${esc(eur(state.wage, lang))}" />
        <output class="bubble num" id="wage-bubble" for="wage-range" hidden></output>
        ${renderWageTicks(state)}
      </div>
    </div>
    <div class="ctl-unit"${state.zoom === "germany" ? "" : " hidden"}>${seg(
      "unit",
      [
        { value: "bn", label: t("unitBn", lang) },
        { value: "day", label: t("unitDay", lang) },
      ],
      state.unit,
      t("unit", lang),
    )}</div>
    <div class="display-controls">
      <div class="lang-toggle" role="group" aria-label="${esc(t("language", lang))}"><button type="button" data-lang="de" lang="de" aria-pressed="${lang === "de"}">DE</button><button type="button" data-lang="en" lang="en" aria-pressed="${lang === "en"}">EN</button></div>
      <button type="button" class="icon-btn" id="theme-toggle" aria-label="${esc(t("themeDarkName", lang))}" title="${esc(t("themeDarkName", lang))}" aria-pressed="${state.theme === "dark"}">${ICON_THEME}</button>
      <button type="button" class="icon-btn" id="tex-toggle" aria-label="${esc(t("patternsName", lang))}" title="${esc(t("patternsName", lang))}" aria-pressed="${state.tex}">${ICON_PATTERNS}</button>
    </div>
  </div>`;
}

export function renderTitle(year: number, lang: Lang): string {
  const [name, context] = titleFor(year, lang).split(" · ");
  return `<span class="title-name">${esc(name!)}</span><span class="title-context"><span class="sr-only"> · </span>${esc(context!)}</span>`;
}

/** One row above the charts: the Shopping panel, the recipients (click to highlight), the marker notes. */
export function renderLegendRow(state: PageState): string {
  const { lang } = state;
  const entities: EntityId[] = state.zoom === "you" ? ENTITY_ORDER.filter((e) => e !== "eu") : ENTITY_ORDER;
  return `<div class="legend-row">
    ${
      state.zoom === "you"
        ? `<button type="button" class="chip chip-panel" data-panel="shopping" aria-haspopup="dialog">${esc(t("shoppingChip", lang))} <span aria-hidden="true">›</span></button>`
        : ""
    }
    <ul class="legend" aria-label="${esc(lang === "de" ? "Farben: gesetzlicher Empfänger" : "Colours: legal recipient")}">
      ${entities
        .map(
          (entity) =>
            `<li><button type="button" class="legend-item" data-entity-key="${entity}" aria-pressed="${state.highlight === entity}" aria-label="${esc(fill(t("highlightName", lang), ENTITY_LABEL[entity][lang]))}">${swatch(entity)}${esc(ENTITY_LABEL[entity][lang])}</button></li>`,
        )
        .join("")}
      ${
        state.zoom === "you"
          ? `<li><button type="button" class="legend-item legend-note" id="estimate-toggle" aria-pressed="${state.estimate}" aria-label="${esc(`${t("estimateToggle", lang)} ${t("estimateToggleName", lang)}`)}" title="${esc(t("estimateLegend", lang))}">${swatch(undefined, "is-estimate")}${esc(t("estimateToggle", lang))}</button></li>`
          : ""
      }
      <li class="legend-note" title="${esc(lang === "de" ? "Kreditfinanzierter Teil" : "Part financed by borrowing")}">${swatch(undefined, "is-borrowed")}${esc(t("borrowedSeg", lang))}</li>
    </ul>
  </div>`;
}

export function renderHeroTable(state: PageState, you: YouModel, germany: GermanyModel): string {
  const { lang } = state;
  if (state.zoom === "germany") {
    const fmt = (v: number) => (state.unit === "day" ? eur(perResidentPerDay(v, germany.year), lang, 2) : bn(v, lang));
    return `<table class="data-table compact"><caption>${esc(t("zoomGermany", lang))} ${germany.year}</caption>
      <thead><tr><th scope="col">${esc(t("stageTaxes", lang))}</th><th scope="col" class="num">${esc(t("amount", lang))}</th></tr></thead>
      <tbody>${germany.flow.nodes
        .filter((n) => n.stage === 0)
        .map((n) => `<tr><th scope="row">${swatch(n.entity)}${esc(`${tr(n.label, lang)}${n.star ? "*" : ""}`)}</th><td class="num">${esc(fmt(n.value))}</td></tr>`)
        .join("")}</tbody>
      <thead><tr><th scope="col">${esc(t("stageRecipients", lang))}</th><th scope="col" class="num">${esc(t("amount", lang))}</th></tr></thead>
      <tbody>${germany.flow.nodes
        .filter((n) => n.stage === 1)
        .map((n) => `<tr><th scope="row">${swatch(n.entity)}${esc(tr(n.label, lang))}</th><td class="num">${esc(fmt(n.value))}</td></tr>`)
        .join("")}</tbody>
      <thead><tr><th scope="col">${esc(t("stateSpending", lang))}</th><th scope="col" class="num">${esc(t("amount", lang))}</th></tr></thead>
      <tbody>${germany.cofog
        .map((c) => `<tr><th scope="row">${esc(`${tr(c.label, lang)} (${germany.stateYear})`)}</th><td class="num">${esc(`${pct(c.value / germany.spendingTotal, lang, 1)} · ${state.unit === "day" ? eur(perResidentPerDay(c.value, germany.stateYear), lang, 2) : bn(c.value, lang)}`)}</td></tr>`)
        .join("")}</tbody></table>`;
  }
  const p = you.payslip;
  const selected = you.pots.find((pot) => pot.id === state.pot) ?? you.pots[0]!;
  const inflow = you.inflow[selected.id] ?? 0;
  return `<table class="data-table compact"><caption>${esc(`${t("stageGross", lang)} ${eur(p.gross, lang)} · ${you.year}`)}</caption>
    <thead><tr><th scope="col">${esc(t("stageDeductions", lang))}</th><th scope="col" class="num">${esc(t("amount", lang))}</th></tr></thead>
    <tbody>${you.flow.nodes
      .filter((n) => n.stage === 1)
      .map((n) => `<tr><th scope="row">${swatch(n.entity)}${esc(`${tr(n.label, lang)}${n.star ? "*" : ""}`)}</th><td class="num">${esc(eur(n.value, lang))}</td></tr>`)
      .join("")}</tbody>
    <thead><tr><th scope="col">${esc(t("stageRecipients", lang))}</th><th scope="col" class="num">${esc(t("amount", lang))}</th></tr></thead>
    <tbody>${you.flow.nodes
      .filter((n) => n.stage === 2)
      .map((n) => `<tr><th scope="row">${swatch(n.entity)}${esc(tr(n.label, lang))}</th><td class="num">${esc(eur(n.value - (n.estimate ?? 0), lang))}</td></tr>`)
      .join("")}</tbody>
    ${
      you.estimate
        ? `<thead><tr><th scope="col">${esc(t("estimateLabel", lang))} · ${esc(tr(you.estimate.label, lang))}*</th><th scope="col" class="num">${esc(t("amount", lang))}</th></tr></thead>
    <tbody>${(
      [
        ["fed", lang === "de" ? "Bund" : "Federation", you.estimate.recipients.fed],
        ["land", "Länder", you.estimate.recipients.land],
        ["muni", lang === "de" ? "Gemeinden" : "Municipalities", you.estimate.recipients.muni],
      ] as const
    )
      .map(([entity, name, value]) => `<tr><th scope="row">${swatch(entity)}${esc(name)}</th><td class="num">${esc(`≈ ${eur(value, lang)}`)}</td></tr>`)
      .join("")}</tbody>`
        : ""
    }
    <thead><tr><th scope="col">${esc(t("stagePots", lang))}</th><th scope="col" class="num">${esc(t("amount", lang))}</th></tr></thead>
    <tbody>${you.pots
      .map(
        (pot) =>
          `<tr><th scope="row">${swatch(pot.entity)}${esc(`${tr(pot.label, lang)} · ${yearTag(pot.year, pot.status, 0, lang)}`)}</th><td class="num">${esc(bn(pot.total, lang))}</td></tr>`,
      )
      .join("")}</tbody>
    <thead><tr><th scope="col">${esc(`${t("ofEvery100", lang)} · ${tr(selected.label, lang)}`)}</th><th scope="col" class="num">${esc(inflow > 0 ? t("yoursColumn", lang) : t("amount", lang))}</th></tr></thead>
    <tbody>${selected.categories
      .map((cat) => {
        const share = cat.value / selected.compositionBase;
        const mine = inflow * share;
        return `<tr><th scope="row">${esc(`${pct(share, lang, 1)} · ${tr(cat.label, lang)}${cat.star ? "*" : ""}`)}</th><td class="num">${esc(inflow > 0 ? `${mine < 1 ? `< ${eur(1, lang)}` : `≈ ${eur(mine, lang)}`}*` : bn(cat.value, lang))}</td></tr>`;
      })
      .join("")}</tbody></table>${inflow > 0 ? `<p class="section-note">${esc(`* ${t("proRataIfYour", lang).replace("{eur}", eur(inflow, lang)).replace("{pot}", tr(selected.label, lang))}`)}</p>` : ""}`;
}

export function renderTaxTable(lang: Lang, year: number, limit?: number): string {
  const rows = taxTable(year);
  const max = rows[0]?.amount ?? 1;
  const body = (list: typeof rows) =>
    list
      .map(
        (row) => `<tr>
        <th scope="row">${esc(tr(row.label, lang))}</th>
        <td class="num">${esc(row.amount !== null ? bn(row.amount, lang, row.amount < 1e9 ? 2 : 1) : "—")}</td>
        <td class="bar-cell"><span class="inline-bar" style="width:${(((row.amount ?? 0) / max) * 100).toFixed(2)}%"></span></td>
        <td>${row.shares ? splitBar(row.shares.map((s) => ({ entity: s.entity, share: s.share })), 8) : ""}<span class="split-text">${esc(
          row.shares ? row.shares.map((s) => `${ENTITY_LABEL[s.entity][lang].split(" / ")[0]} ${pct(s.share, lang, s.share * 100 % 1 ? 1 : 0)}`).join(" · ") : "",
        )}${row.outcome ? `<span class="split-outcome">${esc(tr(row.outcome, lang))}</span>` : ""}</span></td>
        <td class="muted">${esc(tr(allocationKinds[row.kind] ?? { de: row.kind, en: row.kind }, lang))}</td>
      </tr>`,
      )
      .join("");
  const head = `<thead><tr><th scope="col">${esc(t("colTax", lang))}</th><th scope="col" class="num">${year}</th><th scope="col"><span class="sr-only">bar</span></th><th scope="col">${esc(
    t("colSplit", lang),
  )}</th><th scope="col">${esc(t("colKind", lang))}</th></tr></thead>`;
  const caption = `<caption>${esc(t("taxesCash", lang))}</caption>`;
  if (limit && rows.length > limit) {
    return `<div class="table-scroll" tabindex="0" role="region" aria-label="${esc(`${t("taxesTitle", lang)} · ${t("tableView", lang)}`)}"><table class="data-table taxes">${caption}${head}<tbody>${body(rows.slice(0, limit))}</tbody></table></div>
      <details class="more"><summary>${esc(t("showAll", lang))} (${rows.length})</summary><div class="table-scroll" tabindex="0" role="region" aria-label="${esc(`${t("taxesTitle", lang)} · ${t("showAll", lang)}`)}"><table class="data-table taxes">${head}<tbody>${body(rows.slice(limit))}</tbody></table></div></details>`;
  }
  return `<div class="table-scroll" tabindex="0" role="region" aria-label="${esc(`${t("taxesTitle", lang)} · ${t("tableView", lang)}`)}"><table class="data-table taxes">${caption}${head}<tbody>${body(rows)}</tbody></table></div>`;
}

export function renderEqualisationTable(lang: Lang, year: number): string {
  const lands = [...equalisation(year)].sort((a, b) => b.perResident - a.perResident);
  return `<details class="more"><summary>${esc(t("tableView", lang))}</summary><div class="table-scroll" tabindex="0" role="region" aria-label="${esc(`${t("mapShort", lang)} ${year} · ${t("tableView", lang)}`)}"><table class="data-table">
    <thead><tr><th scope="col">${esc(t("land", lang))}</th><th scope="col" class="num">€ / ${esc(lang === "de" ? "Einw." : "resident")}</th><th scope="col" class="num">${esc(
      lang === "de" ? "Finanzkraftausgleich" : "Equalisation in VAT",
    )}</th><th scope="col" class="num">${esc(lang === "de" ? "BEZ" : "Federal grants")}</th></tr></thead>
    <tbody>${lands
      .map(
        (land) =>
          `<tr><th scope="row">${esc(tr(land.name, lang))}</th><td class="num">${esc(`${land.perResident >= 0 ? "+" : "−"}${eur(Math.abs(land.perResident), lang)}`)}</td><td class="num">${esc(
            bn(land.fka, lang, 2),
          )}</td><td class="num">${esc(bn(land.bez, lang, 2))}</td></tr>`,
      )
      .join("")}</tbody></table></div></details>`;
}

/** Every figure the slide shows, with the file it is read from. */
export function renderDataTable(lang: Lang, you: YouModel, germany: GermanyModel): string {
  const year = you.year;
  type Row = { group: string; label: string; value: string; file: string; where: string };
  const rows: Row[] = [];
  const p = you.payslip;
  const y = you.year;
  for (const [key, value] of Object.entries(p.deductions_employee)) {
    rows.push({ group: `${t("stageGross", lang)} ${eur(p.gross, lang)} (${y})`, label: key, value: eur(value, lang, 2), file: files.payslipParameters, where: lang === "de" ? "berechnet im Browser; Test gegen payslip-examples.json" : "computed in the browser; tested against payslip-examples.json" });
  }
  for (const pot of you.pots) {
    rows.push({ group: t("stagePots", lang), label: tr(pot.label, lang), value: `${bn(pot.total, lang)} (${pot.year})`, file: pot.sources[0]?.file ?? "", where: pot.sources[0]?.coordinates ?? "" });
    for (const cat of pot.categories) {
      rows.push({ group: tr(pot.label, lang), label: tr(cat.label, lang), value: `${pct(cat.value / pot.compositionBase, lang, 1)} · ${bn(cat.value, lang)}`, file: pot.sources[0]?.file ?? "", where: "" });
    }
  }
  for (const node of germany.flow.nodes) {
    rows.push({ group: t("zoomGermany", lang), label: tr(node.label, lang), value: bn(node.value, lang), file: node.id.startsWith("c-") ? files.socialInsurance : files.byTax, where: node.id.startsWith("r-") ? files.legalAllocation : "" });
  }
  for (const b of germany.bridge) {
    rows.push({ group: t("stateRevenue", lang), label: tr(b.label, lang), value: `${bn(b.value, lang)}${b.share !== undefined ? ` · ${pct(b.share, lang, 1)}` : ""}`, file: files.aggregates, where: `TR, D2REC, D5REC, D91REC, D61REC, B9 · ${germany.stateYear}` });
  }
  for (const c of germany.cofog) {
    rows.push({ group: t("stateSpending", lang), label: tr(c.label, lang), value: `${pct(c.value / germany.spendingTotal, lang, 1)} · ${bn(c.value, lang)}`, file: files.cofog, where: `S13 · ${c.code} · ${germany.stateYear}` });
  }
  rows.push({ group: t("stateSpending", lang), label: t("perResidentDay", lang), value: eur(perResidentPerDay(germany.spendingTotal, germany.stateYear), lang, 2), file: files.population, where: `${num(populationOf(germany.stateYear), lang)} · ${germany.stateYear}` });
  for (const land of equalisation(year)) {
    rows.push({ group: `${t("mapShort", lang)} ${year}`, label: tr(land.name, lang), value: eur(land.perResident, lang), file: year >= 2025 ? files.equalisation2025 : files.equalisation2024, where: "laender[].per_resident.fka_plus_bez" });
  }
  for (const item of purchases()) {
    rows.push({ group: t("receiptLabel", lang), label: `${tr(item.label, lang)}*`, value: pct(item.taxShare, lang, 1), file: files.purchaseTaxes, where: `examples[id=${item.id}]` });
  }
  return `<details class="more data-details"><summary>${esc(lang === "de" ? "Alle Zahlen dieser Seite mit Datei" : "Every figure on this page, with its file")} (${rows.length})</summary>
    <div class="table-scroll" tabindex="0" role="region" aria-label="${esc(lang === "de" ? "Alle Zahlen mit Datei" : "Every figure with its file")}"><table class="data-table">
      <thead><tr><th scope="col">${esc(lang === "de" ? "Gruppe" : "Group")}</th><th scope="col">${esc(lang === "de" ? "Zahl" : "Figure")}</th><th scope="col" class="num">${esc(t("amount", lang))}</th><th scope="col">${esc(
        t("dataFile", lang),
      )}</th><th scope="col">${esc(t("coordinates", lang))}</th></tr></thead>
      <tbody>${rows
        .map(
          (row) =>
            `<tr><td class="muted">${esc(row.group)}</td><th scope="row">${esc(row.label)}</th><td class="num">${esc(row.value)}</td><td>${
              row.file ? `<a href="${esc(repoBlob(row.file))}" rel="noreferrer noopener" target="_blank"><code>${esc(row.file)}</code></a>` : ""
            }</td><td class="muted">${esc(row.where)}</td></tr>`,
        )
        .join("")}</tbody></table></div></details>`;
}

export function renderSources(lang: Lang, year: number): string {
  const datasets = Object.values(files).map((file) => ({ label: { de: file, en: file }, file }));
  return `${sourceList(equalisationSource(year), lang)}
    <ul class="dataset-list">${datasets.map((d) => `<li><a href="${esc(repoBlob(d.file))}" rel="noreferrer noopener" target="_blank"><code>${esc(d.file)}</code></a></li>`).join("")}</ul>`;
}

/** "Fiscal equalisation 2025 provisional": the settlement's status stays visible (designer's tag rule). */
export const mapTitleFor = (year: number, lang: Lang): string =>
  `${t("mapShort", lang)} ${yearTag(year, equalisationStatus(year).startsWith("provisional") ? "provisional" : "final", 0, lang)}`;

export function renderPage(state: PageState, you: YouModel, germany: GermanyModel, options: { staticBuild?: boolean } = {}): string {
  const { lang } = state;
  return `
  <a class="skip-link" href="#hero">${esc(t("skip", lang))}</a>
  <header class="top">
    <h1 class="title" id="title" aria-label="${esc(titleFor(state.year, lang))}">${renderTitle(state.year, lang)}</h1>
    <button type="button" class="controls-toggle" id="controls-toggle" aria-expanded="false" aria-controls="controls"><span>${esc(t("settings", lang))}</span><span class="controls-summary num" id="controls-summary"></span></button>
    ${renderControls(state)}
  </header>
  <main id="main">
  <p class="sr-only" id="live" aria-live="polite" aria-atomic="true"></p>
  <section class="hero" id="hero" aria-labelledby="title">
    ${renderLegendRow(state)}
    <div class="hero-grid">
      <aside class="map-panel" aria-labelledby="map-title">
        <h2 class="map-title" id="map-title">${esc(mapTitleFor(state.year, lang))}</h2>
        <div class="map" id="map"></div>
        <div class="map-key" id="map-key"></div>
        <p class="map-note">${esc(t("mapNoteShort", lang))}</p>
        <p class="map-place" id="map-place">${esc(t("mapAll", lang))}</p>
        <button type="button" class="link-btn" data-panel="ranking" aria-haspopup="dialog">${esc(t("ranking", lang))} <span aria-hidden="true">›</span></button>
      </aside>
      <div class="flow-wrap">
        <div class="flow" id="flow">${renderHeroTable(state, you, germany)}${
          options.staticBuild ? renderHeroTable({ ...state, zoom: state.zoom === "you" ? "germany" : "you" }, you, germany) : ""
        }</div>
        <div class="sr-only" id="flow-table"></div>
      </div>
    </div>
    <p class="hero-line" id="hero-line">${esc(state.zoom === "you" ? t("assumptions", lang) : t("switchGermany", lang))}</p>
  </section>
  ${
    options.staticBuild
      ? `<section class="section static-only" id="equalisation-static" aria-labelledby="equalisation-static-title">
    <h2 id="equalisation-static-title">${esc(mapTitleFor(state.year, lang))}</h2>
    <p class="section-note">${esc(t("mapNote", lang))}</p>
    ${renderEqualisationTable(lang, state.year).replace('<details class="more">', '<details class="more" open>')}
  </section>`
      : ""
  }
  <section class="section" id="taxes" aria-labelledby="taxes-title">
    <h2 id="taxes-title">${esc(`${t("taxesTitle", lang)} ${state.year}`)}</h2>
    ${renderTaxTable(lang, state.year, 14)}
  </section>
  <section class="section" id="time" aria-labelledby="time-title">
    <h2 id="time-title">${esc(t("timeTitle", lang))}</h2>
    <p class="section-note">${esc(t("esaNote", lang))}</p>
    <div class="time-strip" id="time-strip"></div>
  </section>
  <section class="section" id="sources" aria-labelledby="sources-title">
    <h2 id="sources-title">${esc(t("sourcesData", lang))}</h2>
    ${renderDataTable(lang, you, germany)}
    <details class="more"><summary>${esc(lang === "de" ? "Datendateien" : "Data files")}</summary>${renderSources(lang, state.year)}</details>
    <p class="attribution">${esc(String((raw.laenderGeo as unknown as { attribution: string }).attribution))}</p>
  </section>
  </main>
  <footer class="foot">
    <p>${esc(t("footerStatus", lang))}</p>
    <p><a href="${esc(REPO_URL)}" rel="noreferrer noopener" target="_blank">${esc(t("repo", lang))}</a> · <a href="${esc(repoBlob("docs/research/RATIONALIZATION.md"))}" rel="noreferrer noopener" target="_blank">RATIONALIZATION.md</a> · <a href="${esc(repoBlob("DATA_LICENSES.md"))}" rel="noreferrer noopener" target="_blank">DATA_LICENSES.md</a></p>
  </footer>
  <div class="drawer-backdrop" id="drawer-backdrop" hidden></div>
  <div class="drawer" id="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" hidden>
    <div class="drawer-head"><h2 id="drawer-title"></h2><button type="button" class="drawer-close" id="drawer-close" aria-label="${esc(t("close", lang))}">×</button></div>
    <div class="drawer-body" id="drawer-body"></div>
  </div>`;
}

export const defaultLand = GERMANY_CODE;
