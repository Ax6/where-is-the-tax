/**
 * The page as HTML strings. Used at build time (static fallback, works without JavaScript) and in the
 * browser (re-rendered on language change). Every figure comes from the model; every table row links to
 * its data file and source coordinates.
 */
import {
  allocationKinds,
  equalisation,
  equalisationSource,
  GERMANY_CODE,
  payslipYears,
  perResidentPerDay,
  places,
  POPULATION_2024,
  purchases,
  taxTable,
  minimumWageAssumption,
  wageTicks,
  type EntityId,
  type GermanyModel,
  type LayerId,
  type YouModel,
} from "../data/model.ts";
import { files, REPO_URL, raw, repoBlob } from "../data/sources.ts";
import { bn, eur, num, pct, t, tr, type Lang } from "../i18n.ts";
import { esc, sourceList, splitBar, swatch } from "./html.ts";

export interface PageState {
  zoom: "you" | "germany";
  wage: number;
  land: string;
  year: number;
  lang: Lang;
  pot: string;
  unit: "bn" | "day";
  layer: LayerId | "all";
  /** "auto" follows prefers-color-scheme */
  theme: "auto" | "light" | "dark";
  /** recipient textures (always on under forced colours) */
  tex: boolean;
}

export const WAGE_MIN = 6_000;
export const WAGE_MAX = 160_000;

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

function seg(name: string, options: { value: string; label: string }[], current: string, label: string): string {
  return `<fieldset class="seg" data-control="${name}"><legend class="sr-only">${esc(label)}</legend>${options
    .map(
      (option) =>
        `<button type="button" data-value="${esc(option.value)}" aria-pressed="${option.value === current}">${esc(option.label)}</button>`,
    )
    .join("")}</fieldset>`;
}

export function renderWageTicks(state: PageState): string {
  const { lang } = state;
  const ticks = wageTicks(state.year);
  const pos = (value: number) => ((value - WAGE_MIN) / (WAGE_MAX - WAGE_MIN)) * 100;
  const short: Record<string, string> = { minimum: t("ticksMinimum", lang), median: t("ticksMedian", lang), average: t("ticksAverage", lang), double: t("ticksDouble", lang) };
  const long: Record<string, string> = { minimum: t("ticksMinimumLong", lang), median: t("ticksMedianLong", lang), average: t("ticksAverageLong", lang), double: t("ticksDoubleLong", lang) };
  const assumption = minimumWageAssumption(state.year);
  return `<div class="ticks" id="wage-ticks">${ticks
    .map((tick, index) => {
      const year = tick.fromYear ? ` (${tick.fromYear})` : "";
      // accessible name starts with the visible label (WCAG 2.5.3), then the full description
      const description = `${short[tick.id]}${year}: ${eur(tick.value, lang)}. ${long[tick.id]}${tick.id === "minimum" && assumption ? `. * ${assumption}` : ""}`;
      // labels alternate between two rows so neighbours (median, average) never overlap
      return `<button type="button" class="tick-mark tick-${tick.id} row-${index % 2}" data-index="${index}" data-wage="${Math.round(tick.value)}" style="left:${pos(tick.value).toFixed(2)}%" title="${esc(description)}" aria-label="${esc(description)}"><span aria-hidden="true">${esc(`${short[tick.id]}${year}`)}</span></button>`;
    })
    .join("")}</div>`;
}

export function renderControls(state: PageState): string {
  const { lang } = state;
  return `<form class="controls" id="controls" aria-label="${esc(t("settings", lang))}">
    <div class="ctl ctl-wage ctl-you"${state.zoom === "you" ? "" : " hidden"}>
      <label for="wage-range" class="ctl-label">${esc(t("wage", lang))}</label>
      <div class="wage-row">
        <div class="range-wrap">
          <input type="range" id="wage-range" min="${WAGE_MIN}" max="${WAGE_MAX}" step="100" value="${Math.min(WAGE_MAX, Math.max(WAGE_MIN, state.wage))}" aria-describedby="wage-ticks" />
          ${renderWageTicks(state)}
        </div>
        <input type="number" id="wage-number" class="num" min="0" max="999999" step="1" value="${state.wage}" aria-label="${esc(t("wage", lang))}" />
      </div>
    </div>
    <div class="ctl ctl-you"${state.zoom === "you" ? "" : " hidden"}>
      <label for="land-select" class="ctl-label">${esc(t("land", lang))}</label>
      <select id="land-select">
        <option value="${GERMANY_CODE}"${state.land === GERMANY_CODE ? " selected" : ""}>${esc(t("allLaender", lang))}</option>
        ${places
          .map((place) => `<option value="${place.code}"${place.code === state.land ? " selected" : ""}>${esc(tr(place.name, lang))}</option>`)
          .join("")}
      </select>
    </div>
    <div class="ctl ctl-you"${state.zoom === "you" ? "" : " hidden"}><span class="ctl-label">${esc(t("year", lang))}</span>${seg(
      "year",
      payslipYears.map((year) => ({ value: String(year), label: String(year) })),
      String(state.year),
      t("year", lang),
    )}</div>
    <div class="ctl"><span class="ctl-label">${esc(t("zoom", lang))}</span>${seg(
      "zoom",
      [
        { value: "you", label: t("zoomYou", lang) },
        { value: "germany", label: t("zoomGermany", lang) },
      ],
      state.zoom,
      t("zoom", lang),
    )}</div>
    <div class="ctl ctl-unit"${state.zoom === "germany" ? "" : " hidden"}><span class="ctl-label">${esc(t("unit", lang))}</span>${seg(
      "unit",
      [
        { value: "bn", label: t("unitBn", lang) },
        { value: "day", label: t("unitDay", lang) },
      ],
      state.unit,
      t("unit", lang),
    )}</div>
    <div class="ctl"><span class="ctl-label">${esc(t("language", lang))}</span>${seg(
      "lang",
      [
        { value: "de", label: "DE" },
        { value: "en", label: "EN" },
      ],
      lang,
      t("language", lang),
    )}</div>
    <div class="ctl ctl-display"><span class="ctl-label">${esc(t("display", lang))}</span><div class="display-row">${seg(
      "theme",
      [
        { value: "light", label: t("themeLight", lang) },
        { value: "dark", label: t("themeDark", lang) },
      ],
      state.theme === "dark" ? "dark" : "light",
      t("display", lang),
    )}<button type="button" class="toggle" id="tex-toggle" aria-pressed="${state.tex}">${esc(t("patterns", lang))}</button></div></div>
  </form>`;
}

export function renderLayerChips(state: PageState): string {
  const { lang } = state;
  const chips: { id: LayerId; label: string }[] = [
    { id: "payday", label: t("layerPayday", lang) },
    { id: "shopping", label: t("layerShopping", lang) },
    { id: "fuel", label: t("layerFuel", lang) },
    { id: "home", label: t("layerHome", lang) },
  ];
  return `<div class="layers" role="group" aria-label="${esc(t("layersLabel", lang))}"${state.zoom === "you" ? "" : " hidden"}>${chips
    .map(
      (chip) =>
        `<button type="button" class="chip" data-layer="${chip.id}" aria-pressed="${state.layer === "all" || state.layer === chip.id}">${esc(chip.label)}</button>`,
    )
    .join("")}</div>`;
}

export function renderLegend(state: PageState): string {
  const { lang } = state;
  const entities: EntityId[] = state.zoom === "you" ? ["fed", "land", "muni", "pension", "health", "care", "unemp"] : ["fed", "land", "muni", "eu", "pension", "health", "care", "unemp"];
  return `<ul class="legend" aria-label="${esc(lang === "de" ? "Farben: gesetzlicher Empfänger" : "Colours: legal recipient")}">
    ${entities.map((entity) => `<li>${swatch(entity)}${esc(ENTITY_LABEL[entity][lang])}</li>`).join("")}
    ${state.zoom === "you" ? `<li>${swatch(undefined, "is-yours")}${esc(t("netPay", lang))}</li>` : ""}
    <li>${swatch(undefined, "is-borrowed")}${esc(t("borrowedSeg", lang))}</li>
    ${state.zoom === "you" && (state.layer === "all" || state.layer === "shopping") ? `<li>${swatch(undefined, "is-estimate")}${esc(t("estimateLegend", lang))}</li>` : ""}
    ${state.zoom === "you" ? `<li>${swatch(undefined, "is-hatch")}${esc(t("legendHatch", lang))}</li>` : ""}
  </ul>`;
}

/** No-JS summary of the hero (also the screen-reader-friendly table twin of the flow). */
export function renderHeroTable(state: PageState, you: YouModel, germany: GermanyModel): string {
  const { lang } = state;
  if (state.zoom === "germany") {
    const fmt = (v: number) => (state.unit === "day" ? eur(perResidentPerDay(v), lang, 2) : bn(v, lang));
    return `<table class="data-table compact"><caption>${esc(t("zoomGermany", lang))} 2024</caption>
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
        .map((c) => `<tr><th scope="row">${esc(tr(c.label, lang))}</th><td class="num">${esc(`${pct(c.value / germany.spendingTotal, lang, 1)} · ${fmt(c.value)}`)}</td></tr>`)
        .join("")}</tbody></table>`;
  }
  const p = you.payslip;
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
          `<tr><th scope="row">${swatch(pot.entity)}${esc(`${tr(pot.label, lang)} · ${pot.year}${pot.status === "provisional" ? "p" : ""}`)}</th><td class="num">${esc(bn(pot.total, lang))}</td></tr>`,
      )
      .join("")}</tbody></table>`;
}

export function renderTaxTable(lang: Lang, limit?: number): string {
  const rows = taxTable();
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
  const head = `<thead><tr><th scope="col">${esc(t("colTax", lang))}</th><th scope="col" class="num">${esc(t("colAmount", lang))}</th><th scope="col"><span class="sr-only">bar</span></th><th scope="col">${esc(
    t("colSplit", lang),
  )}</th><th scope="col">${esc(t("colKind", lang))}</th></tr></thead>`;
  const caption = `<caption>${esc(t("taxesCash", lang))}</caption>`;
  if (limit && rows.length > limit) {
    return `<div class="table-scroll" tabindex="0" role="region" aria-label="${esc(`${t("taxesTitle", lang)} · ${t("tableView", lang)}`)}"><table class="data-table taxes">${caption}${head}<tbody>${body(rows.slice(0, limit))}</tbody></table></div>
      <details class="more"><summary>${esc(t("showAll", lang))} (${rows.length})</summary><div class="table-scroll" tabindex="0" role="region" aria-label="${esc(`${t("taxesTitle", lang)} · ${t("showAll", lang)}`)}"><table class="data-table taxes">${head}<tbody>${body(rows.slice(limit))}</tbody></table></div></details>`;
  }
  return `<div class="table-scroll" tabindex="0" role="region" aria-label="${esc(`${t("taxesTitle", lang)} · ${t("tableView", lang)}`)}"><table class="data-table taxes">${caption}${head}<tbody>${body(rows)}</tbody></table></div>`;
}

export function renderEqualisationTable(lang: Lang): string {
  const lands = [...equalisation()].sort((a, b) => b.perResident - a.perResident);
  return `<details class="more"><summary>${esc(t("tableView", lang))}</summary><div class="table-scroll" tabindex="0" role="region" aria-label="${esc(`${t("mapTitle", lang)} · ${t("tableView", lang)}`)}"><table class="data-table">
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
    rows.push({ group: t("stateRevenue", lang), label: tr(b.label, lang), value: `${bn(b.value, lang)}${b.share !== undefined ? ` · ${pct(b.share, lang, 1)}` : ""}`, file: files.aggregates, where: "TR, D2REC, D5REC, D91REC, D61REC, B9 · 2024" });
  }
  for (const c of germany.cofog) {
    rows.push({ group: t("stateSpending", lang), label: tr(c.label, lang), value: `${pct(c.value / germany.spendingTotal, lang, 1)} · ${bn(c.value, lang)}`, file: files.cofog, where: `S13 · ${c.code} · 2024` });
  }
  rows.push({ group: t("stateSpending", lang), label: t("perResidentDay", lang), value: eur(perResidentPerDay(germany.spendingTotal), lang, 2), file: files.population, where: `${num(POPULATION_2024, lang)} ${t("germanyResidents", lang)} · 366` });
  for (const land of equalisation()) {
    rows.push({ group: t("mapTitle", lang), label: tr(land.name, lang), value: eur(land.perResident, lang), file: files.equalisation2024, where: "laender[].per_resident.fka_plus_bez" });
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

export function renderSources(lang: Lang): string {
  const datasets = Object.values(files).map((file) => ({ label: { de: file, en: file }, file }));
  return `${sourceList(equalisationSource(), lang)}
    <ul class="dataset-list">${datasets.map((d) => `<li><a href="${esc(repoBlob(d.file))}" rel="noreferrer noopener" target="_blank"><code>${esc(d.file)}</code></a></li>`).join("")}</ul>`;
}

export function renderPage(state: PageState, you: YouModel, germany: GermanyModel, options: { staticBuild?: boolean } = {}): string {
  const { lang } = state;
  return `
  <a class="skip-link" href="#hero">${esc(t("skip", lang))}</a>
  <header class="top">
    <h1 class="title" id="title">${esc(t("title", lang))}</h1>
    <button type="button" class="controls-toggle" id="controls-toggle" aria-expanded="false" aria-controls="controls">${esc(t("settings", lang))}</button>
    ${renderControls(state)}
  </header>
  <main id="main">
  <p class="sr-only" id="live" aria-live="polite" aria-atomic="true"></p>
  <section class="hero" id="hero" aria-labelledby="title">
    <div class="hero-bar">
      ${renderLayerChips(state)}
      <p class="hero-line" id="hero-line">${esc(state.zoom === "you" ? t("assumptions", lang) : t("switchGermany", lang))}</p>
    </div>
    <div class="flow" id="flow">${renderHeroTable(state, you, germany)}${
      options.staticBuild ? renderHeroTable({ ...state, zoom: state.zoom === "you" ? "germany" : "you" }, you, germany) : ""
    }</div>
    <div class="sr-only" id="flow-table"></div>
    <div class="receipts" id="receipts"></div>
    ${renderLegend(state)}
  </section>
  <section class="section" id="equalisation" aria-labelledby="eq-title">
    <h2 id="eq-title">${esc(t("mapTitle", lang))}</h2>
    <p class="section-note">${esc(t("mapNote", lang))}</p>
    <div class="eq-grid">
      <div class="map" id="map"></div>
      <div class="map-key" id="map-key"></div>
      <div class="land-bars-wrap" id="land-bars"></div>
    </div>
    ${renderEqualisationTable(lang)}
    <p class="attribution">${esc(String((raw.laenderGeo as unknown as { attribution: string }).attribution))} · ${esc(t("mapClick", lang))}</p>
  </section>
  <section class="section" id="taxes" aria-labelledby="taxes-title">
    <h2 id="taxes-title">${esc(t("taxesTitle", lang))}</h2>
    ${renderTaxTable(lang, 14)}
  </section>
  <section class="section" id="time" aria-labelledby="time-title">
    <h2 id="time-title">${esc(t("timeTitle", lang))}</h2>
    <p class="section-note">${esc(t("esaNote", lang))}</p>
    <div class="time-strip" id="time-strip"></div>
  </section>
  <section class="section" id="sources" aria-labelledby="sources-title">
    <h2 id="sources-title">${esc(t("sourcesData", lang))}</h2>
    ${renderDataTable(lang, you, germany)}
    <details class="more"><summary>${esc(lang === "de" ? "Datendateien" : "Data files")}</summary>${renderSources(lang)}</details>
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
