/**
 * Mobile layout: the Sankey is not rotated. Each stage becomes one 100 % stacked bar with a tappable list
 * (amount and share) under it.
 */
import { cofogRows, perResidentPerDay, type EntityId, type GermanyModel, type YouModel } from "../data/model.ts";
import { bn, eur, pct, t, tr, yearTag, type Bi, type Lang } from "../i18n.ts";
import { shoppingHook, type DrawerTarget } from "./hero.ts";

interface Row {
  key: string;
  /** part of `value` paid by the employer on top of the gross wage (drawn as a lighter split) */
  employerPart?: number;
  sub?: string;
  /** share base for this row; rows without one show no share (e.g. contributions next to cash taxes) */
  shareBase?: number;
  label: string;
  value: number;
  display: string;
  entity?: EntityId;
  kind?: "yours" | "neutral" | "borrowed";
  target?: DrawerTarget;
  select?: string;
  selected?: boolean;
}

function stage(parent: HTMLElement, title: string, rows: Row[], options: { lang: Lang; onOpen: (target: DrawerTarget) => void; onSelect?: (id: string) => void; note?: string; base?: number; mixedBases?: boolean; rows?: boolean }): void {
  const section = document.createElement("section");
  section.className = "stage";
  const h = document.createElement("h2");
  h.className = "stage-title";
  h.textContent = title;
  const bar = document.createElement("div");
  bar.className = "stage-bar";
  bar.hidden = Boolean(options.rows);
  bar.setAttribute("aria-hidden", "true");
  const total = options.base ?? rows.reduce((sum, row) => sum + row.value, 0);
  for (const row of rows) {
    const parts = row.employerPart ? [row.value - row.employerPart, row.employerPart] : [row.value];
    parts.forEach((part, index) => {
      const seg = document.createElement("span");
      seg.className = `stage-seg${row.kind ? ` is-${row.kind}` : ""}${row.selected ? " is-selected" : ""}${index === 1 ? " is-employer" : ""}`;
      seg.style.flexGrow = String(part);
      if (row.entity) {
        seg.style.background = `var(--e-${row.entity})`;
        seg.dataset.entity = row.entity;
      }
      bar.append(seg);
    });
  }
  const list = document.createElement("ul");
  list.className = "stage-list";
  for (const row of rows) {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = `stage-row${row.selected ? " is-selected" : ""}`;
    const swatch = document.createElement("span");
    swatch.className = `swatch${row.kind ? ` is-${row.kind}` : ""}`;
    if (row.entity) {
      swatch.style.background = `var(--e-${row.entity})`;
      swatch.dataset.entity = row.entity;
    }
    const name = document.createElement("span");
    name.className = "stage-name";
    name.textContent = row.label;
    if (row.sub) {
      const sub = document.createElement("span");
      sub.className = "stage-sub";
      sub.textContent = row.sub;
      name.append(sub);
    }
    const value = document.createElement("span");
    value.className = "stage-value num";
    value.textContent = row.display;
    const share = document.createElement("span");
    share.className = "stage-share num";
    const base = options.mixedBases ? row.shareBase : total;
    share.textContent = base && base > 0 ? pct(row.value / base, options.lang, 1) : "";
    button.append(swatch, name, value, share);
    if (options.rows) {
      // true-size bars, no shares: these budgets are separate pots (different levels, years, transfers between them)
      const max = Math.max(...rows.map((r) => r.value));
      const track = document.createElement("span");
      track.className = "stage-row-bar";
      const fill = document.createElement("span");
      fill.style.width = `${(row.value / max) * 100}%`;
      if (row.entity) {
        fill.dataset.entity = row.entity;
        fill.style.background = `var(--e-${row.entity})`;
      }
      track.append(fill);
      button.append(track);
    }
    button.addEventListener("click", () => {
      if (row.select && options.onSelect) {
        options.onSelect(row.select);
      } else if (row.target) {
        options.onOpen(row.target);
      }
    });
    li.append(button);
    list.append(li);
  }
  section.append(h, bar, list);
  if (options.note) {
    const p = document.createElement("p");
    p.className = "stage-note";
    p.textContent = options.note;
    section.append(p);
  }
  parent.append(section);
}

const label = (bi: Bi, lang: Lang) => tr(bi, lang);

export function renderYouStages(
  container: HTMLElement,
  model: YouModel,
  options: { lang: Lang; year: number; selectedPot: string; onOpen: (target: DrawerTarget) => void; onSelectPot: (id: string) => void },
): void {
  const { lang } = options;
  container.replaceChildren();
  const p = model.payslip;
  // Contributions are shown employee + employer, as in "Who receives it": both lists add up to the cost of the job.
  const employerOf = (id: string) => model.flow.edges.find((edge) => edge.from === "employer" && edge.to === id)?.value ?? 0;
  const deductions: Row[] = model.flow.nodes
    .filter((n) => n.stage === 1)
    .map((n) => {
      const employer = employerOf(n.id);
      return {
        key: n.id,
        label: `${label(n.label, lang)}${n.star ? "*" : ""}`,
        value: n.value,
        employerPart: employer || undefined,
        sub: employer ? `${t("employee", lang)} ${eur(n.value - employer, lang)} · ${t("employer", lang)} ${eur(employer, lang)}` : undefined,
        display: eur(n.value, lang),
        entity: n.entity,
        kind: n.kind === "yours" ? ("yours" as const) : n.kind === "neutral" ? ("neutral" as const) : undefined,
        target: { kind: "node" as const, id: n.id },
      };
    });
  const jobCost = p.totals.employer_total_cost;
  stage(
    container,
    lang === "de"
      ? `Kosten des Arbeitsplatzes ${eur(jobCost, lang)} = brutto ${eur(model.gross, lang)} + Arbeitgeber ${eur(p.totals.social_employer, lang)}`
      : `Cost of the job ${eur(jobCost, lang)} = gross ${eur(model.gross, lang)} + employer ${eur(p.totals.social_employer, lang)}`,
    deductions,
    {
      lang,
      onOpen: options.onOpen,
      note: lang === "de" ? "Hellere Teile: Arbeitgeberanteil. Anteile: an den Kosten des Arbeitsplatzes." : "Lighter parts: employer share. Shares: of the cost of the job.",
    },
  );
  const recipients: Row[] = model.flow.nodes
    .filter((n) => n.stage === 2 && n.value > 0)
    .map((n) => {
      const employer = employerOf(`c-${n.entity}`);
      return {
        key: n.id,
        label: label(n.label, lang),
        value: n.value - (n.estimate ?? 0),
        employerPart: employer || undefined,
        display: eur(n.value - (n.estimate ?? 0), lang),
        entity: n.entity,
        target: { kind: "node" as const, id: n.id },
      };
    });
  const recipientsTotal = recipients.reduce((sum, row) => sum + row.value, 0);
  stage(container, `${t("stageRecipients", lang)} · ${eur(recipientsTotal, lang)}`, recipients, {
    lang,
    onOpen: options.onOpen,
    note:
      lang === "de"
        ? `${eur(recipientsTotal, lang)} = Steuern ${eur(p.totals.taxes, lang)} + Beiträge ${eur(p.totals.social_employee + p.totals.social_employer, lang)}; netto ${eur(p.totals.net, lang)} bleibt Ihnen.`
        : `${eur(recipientsTotal, lang)} = taxes ${eur(p.totals.taxes, lang)} + contributions ${eur(p.totals.social_employee + p.totals.social_employer, lang)}; net ${eur(p.totals.net, lang)} stays yours.`,
  });
  if (model.estimate) {
    const e = model.estimate;
    const parts: Row[] = [
      { key: "est-fed", label: lang === "de" ? "Bund" : "Federation", value: e.recipients.fed, display: `≈ ${eur(e.recipients.fed, lang)}`, entity: "fed", target: { kind: "node", id: "estimate" } },
      { key: "est-land", label: lang === "de" ? "Länder" : "Länder", value: e.recipients.land, display: `≈ ${eur(e.recipients.land, lang)}`, entity: "land", target: { kind: "node", id: "estimate" } },
      { key: "est-muni", label: lang === "de" ? "Gemeinden" : "Municipalities", value: e.recipients.muni, display: `≈ ${eur(e.recipients.muni, lang)}`, entity: "muni", target: { kind: "node", id: "estimate" } },
    ];
    stage(container, `${t("estimateLabel", lang)} · ≈ ${eur(e.total, lang)} ${lang === "de" ? "im Jahr" : "a year"}${e.year !== options.year ? ` · ${e.year}` : ""}`, parts, {
      lang,
      onOpen: options.onOpen,
      note: `${tr(e.label, lang)}*. ${lang === "de" ? "Schätzung, nicht Teil des Lohnzettels." : "Estimate, not part of the payslip."}`,
    });
    const hook = document.createElement("button");
    hook.type = "button";
    hook.className = "link-btn stage-hook";
    hook.textContent = shoppingHook(options.year, lang);
    hook.addEventListener("click", () => options.onOpen({ kind: "panel", id: "shopping" }));
    container.lastElementChild?.append(hook);
  }
  const pots: Row[] = model.pots.map((pot) => ({
    key: pot.id,
    label: label(pot.label, lang),
    sub: yearTag(pot.year, pot.status, options.year, lang) || undefined,
    value: pot.total,
    display: bn(pot.total, lang),
    entity: pot.entity,
    select: pot.id,
    selected: pot.id === options.selectedPot,
  }));
  stage(container, `${t("stagePots", lang)} · ${t("boundary", lang)}`, pots, { lang, onOpen: options.onOpen, onSelect: options.onSelectPot, rows: true, mixedBases: true });
  // the selected budget: of every €100, with your euros pro rata* per row
  const selected = model.pots.find((pot) => pot.id === options.selectedPot) ?? model.pots[0]!;
  const inflow = model.inflow[selected.id] ?? 0;
  const comp: Row[] = selected.categories.map((cat) => {
    const mine = (inflow * cat.value) / selected.compositionBase;
    return {
      key: cat.id,
      label: `${label(cat.label, lang)}${cat.star ? "*" : ""}`,
      sub: inflow > 0 ? `${mine < 1 ? `< ${eur(1, lang)}` : `≈ ${eur(mine, lang)}`} ${t("ofYours", lang)}*` : undefined,
      value: cat.value,
      display: bn(cat.value, lang),
      entity: selected.entity,
      target: { kind: "pot" as const, id: selected.id },
    };
  });
  stage(container, `${t("ofEvery100", lang)} · ${label(selected.label, lang)}`, comp, {
    lang,
    onOpen: options.onOpen,
    base: selected.compositionBase,
    note: `${bn(selected.compositionBase, lang)} ${label(selected.compositionLabel, lang)}.${inflow > 0 ? ` * ${t("proRataIfYour", lang).replace("{eur}", eur(inflow, lang))}` : ""}`,
  });
}

export function renderGermanyStages(
  container: HTMLElement,
  model: GermanyModel,
  options: { lang: Lang; unit: "bn" | "day"; onOpen: (target: DrawerTarget) => void },
): void {
  const { lang, unit } = options;
  container.replaceChildren();
  const fmt = (v: number, year = model.year) => (unit === "day" ? eur(perResidentPerDay(v, year), lang, 2) : bn(v, lang));
  const SY = model.stateYear;
  const revenueTag = yearTag(SY, "final", model.year, lang);
  const spendingTag = yearTag(SY, cofogRows.find((row) => row.sector === "S13" && row.code === "TOTAL")?.status[String(SY)] ?? "final", model.year, lang);
  const col = (stageIndex: number): Row[] =>
    model.flow.nodes
      .filter((n) => n.stage === stageIndex)
      .map((n) => ({
        key: n.id,
        label: `${label(n.label, lang)}${n.star ? "*" : ""}`,
        value: n.value,
        display: fmt(n.value),
        entity: n.entity,
        kind: n.entity ? undefined : ("neutral" as const),
        target: { kind: "node" as const, id: n.id },
        shareBase: n.id.startsWith("t-") || ["r-fed", "r-land", "r-muni", "r-eu"].includes(n.id) ? model.taxesTotal : undefined,
      }));
  const shareNote = lang === "de" ? "Anteile: an allen Steuern (Kasse). Beiträge sind ein anderer Topf, ohne Anteil." : "Shares: of all tax (cash). Contributions are a separate pool, shown without a share.";
  stage(container, `${t("stageTaxes", lang)} ${model.year}`, col(0), { lang, onOpen: options.onOpen, mixedBases: true, note: shareNote });
  stage(container, t("stageRecipients", lang), col(1), { lang, onOpen: options.onOpen, mixedBases: true });
  stage(
    container,
    `${t("stateRevenue", lang)}${revenueTag ? ` · ${revenueTag}` : ""}`,
    model.bridge.map((b) => ({
      key: b.id,
      label: label(b.label, lang),
      value: b.value,
      display: fmt(b.value, SY),
      kind: b.id === "borrowed" ? ("borrowed" as const) : ("neutral" as const),
      target: { kind: "bridge" as const, id: b.id },
      // shares of revenue (the construct); borrowing is shown in euros only
      shareBase: b.id === "borrowed" ? undefined : model.revenueTotal,
    })),
    { lang, onOpen: options.onOpen, mixedBases: true, note: t("esaNote", lang) },
  );
  stage(
    container,
    `${t("stateSpending", lang)}${spendingTag ? ` · ${spendingTag}` : ""}`,
    model.cofog.map((c) => ({ key: c.code, label: label(c.label, lang), value: c.value, display: fmt(c.value, SY), kind: "neutral" as const, target: { kind: "cofog" as const, code: c.code } })),
    { lang, onOpen: options.onOpen, note: `${t("spendingTotal", lang)} ${bn(model.spendingTotal, lang)} = ${eur(perResidentPerDay(model.spendingTotal, SY), lang, 2)} ${t("perResidentDay", lang)}` },
  );
}
