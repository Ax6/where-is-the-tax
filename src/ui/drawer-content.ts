/** Drawer content: mechanism mini-diagram, one level deeper, benchmarks, sources. HTML strings, data escaped. */
import {
  aggregate,
  aggregatesSource,
  allocation,
  allocationKinds,
  allocationSource,
  byRecipientRows,
  byRecipientSource,
  byTaxRows,
  byTaxSource,
  cofogRows,
  cofogSource,
  equalisation,
  equalisationFile,
  equalisationSource,
  equalisationStatus,
  euRoundTrip,
  householdCaveats,
  householdEstimate,
  householdSource,
  tradeTaxLevy,
  euSource,
  payrollViewOf,
  payslip,
  payslipParams,
  payslipYears,
  payslipSource,
  perResidentPerDay,
  populationSource,
  purchaseSource,
  purchases,
  taxSeries,
  vatSplit,
  type EntityId,
  type GermanyModel,
  type Pot,
  type SourceLink,
  type YouModel,
} from "../data/model.ts";
import { files, raw } from "../data/sources.ts";
import { bi, bn, eur, fill, money, pct, t, tr, yearTag, type Bi, type Lang } from "../i18n.ts";
import type { DrawerTarget } from "../viz/hero.ts";
import { badge, esc, sourceList, splitBar, swatch } from "./html.ts";
import { renderEqualisationTable } from "./page.ts";

export interface DrawerContext {
  lang: Lang;
  zoom: "you" | "germany";
  /** the page's selected year */
  year: number;
  /** selected place (DE = all Länder) */
  land: string;
  you: YouModel;
  germany: GermanyModel;
  unit: "bn" | "day";
}

export interface DrawerContent {
  title: string;
  html: string;
}

const section = (title: string, body: string): string => `<section class="drawer-section"><h3>${esc(title)}</h3>${body}</section>`;

function rows(items: { label: string; value: string; share?: number; entity?: EntityId; sub?: string; cls?: string }[], max?: number): string {
  const top = max ?? Math.max(...items.map((item) => item.share ?? 0), 0.0001);
  return `<ul class="drawer-rows">${items
    .map(
      (item) => `<li class="${item.cls ?? ""}">
        <span class="dr-label">${item.entity ? swatch(item.entity) : ""}${esc(item.label)}${item.sub ? `<span class="dr-sub">${esc(item.sub)}</span>` : ""}</span>
        <span class="dr-value num">${esc(item.value)}</span>
        ${item.share !== undefined ? `<span class="dr-bar" aria-hidden="true"><span${item.entity ? ` data-entity="${item.entity}"` : ""} style="width:${Math.max(0, Math.min(1, item.share / top)) * 100}%;${item.entity ? `background:var(--e-${item.entity})` : ""}"></span></span>` : ""}
      </li>`,
    )
    .join("")}</ul>`;
}

function spark(points: { year: number; value: number }[], lang: Lang, label: string): string {
  if (points.length < 2) {
    return "";
  }
  const w = 320;
  const h = 70;
  const xs = points.map((p) => p.year);
  const vs = points.map((p) => p.value);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const lo = Math.min(0, ...vs);
  const hi = Math.max(...vs);
  const sx = (x: number) => 4 + ((x - x0) / (x1 - x0)) * (w - 60);
  const sy = (v: number) => h - 14 - ((v - lo) / (hi - lo || 1)) * (h - 22);
  const d = points.map((p, i) => `${i ? "L" : "M"}${sx(p.year).toFixed(1)},${sy(p.value).toFixed(1)}`).join("");
  const last = points[points.length - 1]!;
  return `<figure class="spark"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">
    <line x1="4" x2="${w - 56}" y1="${sy(0)}" y2="${sy(0)}" class="axis-zero"/>
    <path d="${d}" class="line-a"/>
    <circle cx="${sx(last.year)}" cy="${sy(last.value)}" r="3" class="line-a-dot"/>
    <text x="${sx(last.year) + 6}" y="${sy(last.value) + 4}" class="end-label">${esc(money(last.value, lang))}</text>
    <text x="4" y="${h - 2}" class="tick">${x0}</text><text x="${w - 56}" y="${h - 2}" class="tick" text-anchor="end">${x1}</text>
  </svg></figure>`;
}

const quotes = (id: string, lang: Lang): string =>
  `<ul class="quotes">${allocation(id)
    .legal_basis.map((basis) => `<li><span class="quote-section">${esc(basis.section)}</span> <q lang="de">${esc(basis.quote)}</q></li>`)
    .join("")}</ul>${allocation(id).note ? `<p class="drawer-note">${esc(tr(allocation(id).note!, lang))}</p>` : ""}`;

const header = (value: string, sub: string, status: Parameters<typeof badge>[0], lang: Lang): string =>
  `<p class="drawer-value num">${esc(value)}</p><p class="drawer-sub">${esc(sub)} ${badge(status, lang)}</p>`;

// ---------------------------------------------------------------------------------------------

export function drawerContent(target: DrawerTarget, ctx: DrawerContext): DrawerContent {
  const { lang } = ctx;
  switch (target.kind) {
    case "pot":
      return potDrawer(ctx.you.pots.find((pot) => pot.id === target.id) ?? ctx.you.pots[0]!, ctx);
    case "cofog":
      return cofogDrawer(target.code, ctx);
    case "bridge":
      return bridgeDrawer(target.id, ctx);
    case "purchase":
      return purchaseDrawer(target.id, ctx);
    case "panel":
      return target.id === "shopping" ? shoppingPanel(ctx) : rankingPanel(ctx);
    case "node":
      return ctx.zoom === "you" ? youNodeDrawer(target.id, ctx) : germanyNodeDrawer(target.id, ctx);
  }
  return { title: tr(bi("Details", "Details"), lang), html: "" };
}

// --- You zoom nodes ------------------------------------------------------------------------

function payslipTable(ctx: DrawerContext): string {
  const { lang } = ctx;
  const p = ctx.you.payslip;
  const d = p.deductions_employee;
  const er = p.employer_contributions;
  const line = (label: string, value: number, cls = "") => `<tr class="${cls}"><th scope="row">${esc(label)}</th><td class="num">${esc(eur(value, lang, 2))}</td></tr>`;
  return `<table class="payslip"><tbody>
    ${line(t("stageGross", lang), p.gross, "strong")}
    ${line(`− ${t("wageTax", lang)}`, d.lohnsteuer)}
    ${line(`− ${t("soli", lang)}`, d.soli)}
    ${line(`− ${lang === "de" ? "Rentenversicherung" : "Pension insurance"}`, d.rv)}
    ${line(`− ${lang === "de" ? "Arbeitslosenversicherung" : "Unemployment insurance"}`, d.alv)}
    ${line(`− ${lang === "de" ? "Krankenversicherung*" : "Health insurance*"}`, d.kv)}
    ${line(`− ${lang === "de" ? "Pflegeversicherung (inkl. Kinderlosenzuschlag)" : "Care insurance (incl. childless surcharge)"}`, d.pv)}
    ${line(t("netPay", lang), p.totals.net, "strong")}
    ${line(`${t("employerGhost", lang)}`, p.totals.social_employer)}
    ${line(lang === "de" ? "Kosten des Arbeitsplatzes" : "Cost of the job", p.totals.employer_total_cost, "strong")}
  </tbody></table>${
    payslipYears.includes(2026) && ctx.you.year !== 2026
      ? `<p class="drawer-next">${esc(fill(t("sameWage2026", lang), eur(payslip(2026, p.gross).totals.net, lang)))}</p>`
      : ""
  }
  <p class="drawer-note">${esc(t("assumptions", lang))}. ${esc(
    lang === "de"
      ? `Jahreslohnsteuer nach Programmablaufplan ${ctx.you.year}; die Veranlagung kann abweichen.`
      : `Annual wage-tax withholding per the ${ctx.you.year} Programmablaufplan; the final assessment can differ.`,
  )}</p>`;
}

function youNodeDrawer(id: string, ctx: DrawerContext): DrawerContent {
  const { lang, you } = ctx;
  const p = you.payslip;
  const params = payslipParams.years[String(you.year)]!;
  const node = you.flow.nodes.find((n) => n.id === id);
  const title = node ? tr(node.label, lang) : id;
  if (id === "estimate") {
    return estimateDrawer(ctx);
  }
  if (id === "gross" || id === "employer" || id === "net") {
    const estimate = householdEstimate(p.totals.net);
    const extra =
      id === "net"
        ? section(
            t("estimateLabel", lang),
            `<p class="drawer-note">${esc(
              `≈ ${eur(estimate.total, lang)}* ${lang === "de" ? "im Jahr für einen Haushalt mit" : "a year for a household with"} ${tr(estimate.label, lang)}*. ${
                lang === "de" ? "Schätzung, nicht Teil des Lohnzettels." : "Estimate, not part of the payslip."
              }`,
            )}</p>` +
              rows(purchases(ctx.year).map((item) => ({ label: `${tr(item.label, lang)}*`, value: pct(item.taxShare, lang, 0), share: item.taxShare })), 1),
          )
        : "";
    return {
      title: lang === "de" ? "Ihr Lohnzettel" : "Your payslip",
      html: `${header(eur(p.gross, lang), `${lang === "de" ? "Brutto" : "Gross"} ${you.year} · ${pct(p.totals.net / p.gross, lang, 1)} ${lang === "de" ? "netto" : "net"}`, "law", lang)}
        ${section(lang === "de" ? "Gesetzlich berechnet" : "Computed from the law", payslipTable(ctx))}${extra}
        ${section(t("sources", lang), sourceList(payslipSource(), lang))}`,
    };
  }
  if (id === "wagetax") {
    const shares = allocation("STEUERARTG10").shares!;
    const merged = you.place?.merged ?? false;
    const parts = merged
      ? [
          { entity: "fed" as EntityId, share: shares.federation ?? 0, label: tr(bi("Bund", "Federation"), lang) },
          { entity: "land" as EntityId, share: (shares.laender ?? 0) + (shares.municipalities ?? 0), label: tr(you.place!.name, lang) },
        ]
      : [
          { entity: "fed" as EntityId, share: shares.federation ?? 0, label: tr(bi("Bund", "Federation"), lang) },
          { entity: "land" as EntityId, share: shares.laender ?? 0, label: you.place ? tr(you.place.name, lang) : tr(bi("Ihr Land", "Your Land"), lang) },
          { entity: "muni" as EntityId, share: shares.municipalities ?? 0, label: tr(bi("Gemeinden", "Municipalities"), lang) },
        ];
    const i = p.intermediate;
    return {
      title,
      html: `${header(eur(p.deductions_employee.lohnsteuer, lang), `${pct(p.effective_rates.lohnsteuer_pct / 100, lang, 2)} ${lang === "de" ? "des Bruttolohns" : "of gross wage"}`, "law", lang)}
      ${section(
        t("mechanism", lang),
        `${splitBar(parts, 14)}${rows(parts.map((part) => ({ label: `${part.label} · ${pct(part.share, lang, 1)}`, value: eur(p.deductions_employee.lohnsteuer * part.share, lang), entity: part.entity })))}
        ${rows([
          { label: lang === "de" ? "Bruttolohn" : "Gross wage", value: eur(p.gross, lang) },
          { label: lang === "de" ? "− Arbeitnehmer-Pauschbetrag" : "− Employee lump sum", value: eur(i.arbeitnehmer_pauschbetrag, lang) },
          { label: lang === "de" ? "− Sonderausgaben-Pauschbetrag" : "− Special-expenses lump sum", value: eur(i.sonderausgaben_pauschbetrag, lang) },
          { label: lang === "de" ? "− Vorsorgepauschale" : "− Provision allowance (Vorsorgepauschale)", value: eur(i.vorsorgepauschale, lang) },
          { label: lang === "de" ? "= zu versteuern" : "= taxable", value: eur(i.zu_versteuernder_jahresbetrag, lang), cls: "strong" },
          { label: lang === "de" ? "Tarif § 32a EStG → Lohnsteuer" : "Tariff § 32a EStG → wage tax", value: eur(p.deductions_employee.lohnsteuer, lang), cls: "strong" },
        ])}
        ${quotes("STEUERARTG10", lang)}`,
      )}
      ${section(t("sources", lang), sourceList([...allocationSource("STEUERARTG10"), ...payslipSource()], lang))}`,
    };
  }
  if (id === "soli") {
    return {
      title,
      html: `${header(eur(p.deductions_employee.soli, lang, 2), lang === "de" ? "geht an den Bund" : "goes to the Federation", "law", lang)}
      ${section(
        t("mechanism", lang),
        rows([
          { label: lang === "de" ? "Satz" : "Rate", value: `${params.soli.rate.value} % ${lang === "de" ? "der Lohnsteuer" : "of wage tax"}` },
          { label: lang === "de" ? "Freigrenze (Jahreslohnsteuer)" : "Exemption limit (annual wage tax)", value: eur(params.soli.freigrenze.value, lang) },
          { label: lang === "de" ? "Ihre Lohnsteuer" : "Your wage tax", value: eur(p.deductions_employee.lohnsteuer, lang) },
        ]),
      )}
      ${section(t("sources", lang), sourceList([...allocationSource("STEUERARTB80"), ...payslipSource()], lang))}`,
    };
  }
  if (id.startsWith("c-") || id.startsWith("r-")) {
    const entity = id.slice(2) as EntityId;
    const key = ({ pension: "rv", health: "kv", care: "pv", unemp: "alv" } as Record<string, "rv" | "kv" | "pv" | "alv">)[entity];
    const pot = you.pots.find((candidate) => candidate.recipients.includes(`r-${entity}`));
    if (key) {
      const emp = p.deductions_employee[key];
      const er = p.employer_contributions[key];
      const si = params.social_insurance;
      const ceiling = key === "rv" || key === "alv" ? si.rv.ceiling_annual.value : si.kv.ceiling_annual.value;
      const empRate = { rv: si.rv.employee_share, alv: si.alv.employee_share, kv: si.kv.employee_share, pv: si.pv.employee_share + si.pv.childless_surcharge.value }[key];
      const erRate = { rv: si.rv.employer_share, alv: si.alv.employer_share, kv: si.kv.employer_share, pv: si.pv.employer_share }[key];
      return {
        title: node && node.stage === 2 ? title : `${title}${key === "kv" ? "*" : ""}`,
        html: `${header(eur(emp + er, lang), `${lang === "de" ? "Sie" : "You"} ${eur(emp, lang)} + ${lang === "de" ? "Arbeitgeber" : "employer"} ${eur(er, lang)}`, key === "kv" ? "assumption" : "law", lang)}
        ${section(
          t("mechanism", lang),
          `${splitBar(
            [
              { entity, share: emp / (emp + er) },
              { entity, share: er / (emp + er), cls: "is-ghost" },
            ],
            14,
          )}${rows([
            { label: `${t("employee", lang)} · ${empRate.toLocaleString(lang === "de" ? "de-DE" : "en-GB")} %`, value: eur(emp, lang), entity },
            { label: `${t("employer", lang)} · ${erRate.toLocaleString(lang === "de" ? "de-DE" : "en-GB")} %`, value: eur(er, lang) },
            { label: lang === "de" ? "Beitragsbemessungsgrenze" : "Contribution ceiling", value: eur(ceiling, lang) },
          ])}
          <p class="drawer-note">${esc(
            key === "kv"
              ? lang === "de"
                ? `* Mit dem durchschnittlichen Zusatzbeitrag ${si.kv.zusatzbeitrag_average.value} % (§ 242a SGB V); jede Kasse erhebt ihren eigenen.`
                : `* With the average additional rate of ${si.kv.zusatzbeitrag_average.value} % (§ 242a SGB V); each insurer charges its own.`
              : key === "pv"
                ? lang === "de"
                  ? `Kinderlose ab 23 zahlen ${si.pv.childless_surcharge.value} Prozentpunkte allein.`
                  : `Childless employees aged 23+ pay ${si.pv.childless_surcharge.value} percentage points alone.`
                : "",
          )}</p>
          <p class="drawer-note">${esc(t("fenced", lang))}: ${esc(
            lang === "de" ? "Beiträge finanzieren nur die Aufgaben dieses Systems; dort mischen sie sich mit Bundeszuschüssen und Rücklagen." : "Contributions finance only this system's tasks; inside, they mix with federal grants and reserves.",
          )}</p>`,
        )}
        ${pot ? section(tr(pot.label, lang), `<p class="drawer-note">${esc(`${eur(emp + er, lang)} ${t("joins", lang)} ${bn(pot.total, lang)}.`)}</p>`) : ""}
        ${section(t("sources", lang), sourceList([...payslipSource(), ...(pot?.sources ?? [])], lang))}`,
      };
    }
    // tax recipients
    if (pot) {
      return potDrawer(pot, ctx);
    }
  }
  return { title, html: "" };
}

function estimateDrawer(ctx: DrawerContext): DrawerContent {
  const { lang, you } = ctx;
  const e = householdEstimate(you.payslip.totals.net);
  const exciseNames: Record<string, Bi> = {
    tobacco_tax: bi("Tabaksteuer", "Tobacco tax"),
    alcohol_taxes: bi("Alkohol-, Bier-, Schaumweinsteuer", "Alcohol, beer and sparkling-wine taxes"),
    electricity_tax: bi("Stromsteuer", "Electricity tax"),
    energy_tax_heating: bi("Energiesteuer, Heizen", "Energy tax, heating"),
    energy_tax_fuel: bi("Energiesteuer, Kraftstoff", "Energy tax, motor fuel"),
  };
  const parts = [
    { label: lang === "de" ? "Umsatzsteuer" : "VAT", value: e.vat },
    ...Object.entries(e.excises).map(([key, value]) => ({ label: tr(exciseNames[key] ?? bi(key, key), lang), value })),
  ].sort((a, b) => b.value - a.value);
  const recipients = [
    { entity: "fed" as EntityId, label: lang === "de" ? "Bund" : "Federation", value: e.recipients.fed },
    { entity: "land" as EntityId, label: lang === "de" ? "Länder (Umsatzsteuer-Topf, Biersteuer)" : "Länder (VAT pool, beer tax)", value: e.recipients.land },
    { entity: "muni" as EntityId, label: lang === "de" ? "Gemeinden" : "Municipalities", value: e.recipients.muni },
  ];
  return {
    title: t("estimateLabel", lang),
    html: `${header(`≈ ${eur(e.total, lang)}`, `${lang === "de" ? "im Jahr" : "a year"} · ${tr(e.label, lang)}*${e.year !== ctx.year ? ` · ${e.year}` : ""}`, "estimate", lang)}
      <p class="drawer-note">${esc(
        lang === "de"
          ? `Ihr Netto ${eur(you.payslip.totals.net, lang)} ÷ 12 = ${eur(e.monthlyNet, lang)} im Monat ordnet Sie dieser Haushaltsklasse zu* (ein Verdiener; bei Paaren beide Netto addieren). Konsum der Klasse ≈ ${eur(e.consumptionMonth, lang)} im Monat; davon ≈ ${pct(e.shareOfConsumption, lang, 1)} Steuern.`
          : `Your net ${eur(you.payslip.totals.net, lang)} ÷ 12 = ${eur(e.monthlyNet, lang)} a month places you in this household class* (one earner; couples add both nets). The class spends ≈ ${eur(e.consumptionMonth, lang)} a month; ≈ ${pct(e.shareOfConsumption, lang, 1)} of it is tax.`,
      )}</p>
      ${section(t("mechanism", lang), `${splitBar(recipients.map((r) => ({ entity: r.entity, share: r.value / e.total })), 14)}${rows(recipients.map((r) => ({ label: r.label, value: `≈ ${eur(r.value, lang)}`, entity: r.entity })))}`)}
      ${section(t("breakdown", lang), rows(parts.map((part) => ({ label: part.label, value: `≈ ${eur(part.value, lang)}`, share: part.value / e.total }))))}
      ${section(lang === "de" ? "Grenzen der Schätzung" : "Limits of the estimate", `<ul class="quotes">${householdCaveats.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>`)}
      ${section(t("sources", lang), sourceList(householdSource(), lang))}`,
  };
}

// --- pots ------------------------------------------------------------------------------------

/** "≈ €8 of yours*": a pro rata* share of your euros into this budget. */
const yours = (value: number, lang: Lang): string => `${value < 1 ? `< ${eur(1, lang)}` : `≈ ${eur(value, lang)}`} ${t("ofYours", lang)}*`;

function potDrawer(pot: Pot, ctx: DrawerContext): DrawerContent {
  const { lang } = ctx;
  const inflow = ctx.you.inflow[pot.id] ?? 0;
  const estimateIn = pot.recipients.reduce((sum, id) => sum + (ctx.you.flow.nodes.find((n) => n.id === id)?.estimate ?? 0), 0);
  const tag = yearTag(pot.year, pot.status, 0, lang);
  const breakdown = pot.categories
    .map((cat) => {
      const share = cat.value / pot.compositionBase;
      const children = (cat.children ?? []).slice(0, 8);
      return `<details class="cat"${cat === pot.categories[0] ? " open" : ""}><summary>${rows([
        {
          label: tr(cat.label, lang),
          value: `${pct(share, lang, 1)} · ${bn(cat.value, lang)}`,
          share,
          entity: pot.entity,
          sub: inflow > 0 ? yours(inflow * share, lang) : undefined,
        },
      ], 1)}</summary>${
        children.length
          ? rows(
              children.map((child) => ({
                label: tr(child.label, lang),
                value: bn(child.value, lang),
                share: child.value / cat.value,
                sub: inflow > 0 ? yours((inflow * child.value) / pot.compositionBase, lang) : undefined,
              })),
              1,
            )
          : ""
      }</details>`;
    })
    .join("");
  const transfers = [
    pot.transferOut ? { label: `${tr(pot.transferOut.label, lang)}${pot.transferOut.star ? "" : ""}`, value: bn(pot.transferOut.value, lang) } : undefined,
    pot.transferIn ? { label: tr(pot.transferIn.label, lang), value: bn(pot.transferIn.value, lang) } : undefined,
    pot.borrowed ? { label: t("borrowed", lang), value: bn(pot.borrowed, lang) } : undefined,
  ].filter((row): row is { label: string; value: string } => Boolean(row));
  return {
    title: tr(pot.label, lang),
    html: `${header(bn(pot.total, lang), `${tag} · ${tr(pot.basis, lang)}`, pot.status, lang)}
      ${inflow > 0 ? `<p class="drawer-joins">${esc(`${eur(inflow, lang)} ${t("joins", lang)} ${bn(pot.total, lang)}${estimateIn > 0 ? ` · + ≈ ${eur(estimateIn, lang)}* ${lang === "de" ? "aus Ihren Einkäufen (Schätzung)" : "from your purchases (estimate)"}` : ""}`)}</p>` : ""}
      ${section(`${t("breakdown", lang)} · ${t("ofEvery100", lang)} ${tr(pot.compositionLabel, lang)}`, breakdown)}
      ${
        lang === "en" && pot.categories.some((cat) => cat.children?.some((child) => child.label.en.endsWith(" (DE)")))
          ? `<p class="drawer-note">${esc("(DE): sub-function name published in German only.")}</p>`
          : ""
      }
      ${inflow > 0 ? `<p class="drawer-note prorata">${esc(t("proRataNote", lang))}</p>` : ""}
      ${transfers.length ? section(lang === "de" ? "Transfers und Kredit" : "Transfers and borrowing", rows(transfers)) : ""}
      ${pot.note ? `<p class="drawer-note">${esc(tr(pot.note, lang))}</p>` : ""}
      ${pot.benchmark ? section(t("benchmarks", lang), benchmarkHtml(pot, ctx)) : ""}
      ${section(t("sources", lang), sourceList(pot.sources, lang))}`,
  };
}

function benchmarkHtml(pot: Pot, ctx: DrawerContext): string {
  const { lang } = ctx;
  const b = pot.benchmark!;
  const meta = raw.laenderMeta.laender as unknown as { code: string; name: Bi }[];
  const name = (code: string) => tr(meta.find((land) => land.code === code)?.name ?? bi(code, code), lang);
  const w = 300;
  const strip = (group: (typeof b.groups)[number]) => {
    const max = Math.max(...b.groups.flatMap((g) => g.shares.map((s) => s.share)));
    const sx = (v: number) => 6 + (v / max) * (w - 60);
    const highlight = group.shares.find((s) => s.code === b.highlight);
    return `<li><span class="bm-label">${esc(tr(group.label, lang))}</span>
      <svg viewBox="0 0 ${w} 18" class="bm-strip" role="img" aria-label="${esc(
        group.shares.map((s) => `${name(s.code)} ${pct(s.share, lang, 1)}`).join(", "),
      )}"><line x1="6" x2="${w - 54}" y1="9" y2="9" class="grid"/>${group.shares
        .map((s) => `<circle cx="${sx(s.share).toFixed(1)}" cy="9" r="${s.code === b.highlight ? 5 : 3}" class="${s.code === b.highlight ? "bm-dot is-selected" : "bm-dot"}"><title>${esc(`${name(s.code)}: ${pct(s.share, lang, 1)}`)}</title></circle>`)
        .join("")}${highlight ? `<text x="${w - 50}" y="13" class="num end-label">${esc(pct(highlight.share, lang, 1))}</text>` : ""}</svg></li>`;
  };
  return `<p class="drawer-note">${esc(tr(b.scope, lang))}. ${esc(lang === "de" ? "Jeder Punkt ein Land" : "Each dot is one Land")}${
    b.highlight ? `; ${esc(name(b.highlight))} ${esc(lang === "de" ? "hervorgehoben" : "highlighted")}` : ""
  }.</p><ul class="bm-list">${b.groups.map(strip).join("")}</ul>`;
}

// --- Germany nodes ---------------------------------------------------------------------------

const GROUP_CHILDREN: Record<string, string> = { "t-STEUERNVB20": "STEUERNVB20", "t-STEUERNVL20": "STEUERNVL20", "t-municipal-other": "STEUERNVK20" };

function germanyNodeDrawer(id: string, ctx: DrawerContext): DrawerContent {
  const { lang, germany } = ctx;
  const node = germany.flow.nodes.find((n) => n.id === id);
  const title = node ? tr(node.label, lang) : id;
  const Y = String(germany.year);
  const fmt = (v: number) => (ctx.unit === "day" ? `${eur(perResidentPerDay(v, germany.year), lang, 2)} ${t("perResidentDay", lang)}` : bn(v, lang));
  if (!node) {
    return { title, html: "" };
  }
  const outEdges = germany.flow.edges.filter((edge) => edge.from === id);
  const splitParts = outEdges.map((edge) => ({ entity: edge.entity, share: edge.value / node.value }));
  if (id === "r-eu") {
    const eu = euRoundTrip(germany.year);
    return {
      title,
      html: `${header(fmt(node.value), lang === "de" ? "Zölle, per Gesetz direkt an die EU" : "Customs duties, by law straight to the EU", "official", lang)}
      ${section(
        lang === "de" ? `Die Rundreise ${Y} (EU-Kommission)` : `The round trip ${Y} (European Commission)`,
        rows([
          { label: lang === "de" ? "Deutschland zahlt (alle Eigenmittel)" : "Germany pays (all own resources)", value: bn(eu.paid, lang), share: eu.paid, entity: "eu" },
          { label: lang === "de" ? "EU-Ausgaben in Deutschland" : "EU spending in Germany", value: bn(eu.spentInGermany, lang), share: eu.spentInGermany },
          { label: "NextGenerationEU", value: bn(eu.ngeu, lang), share: eu.ngeu },
        ]) +
          `<p class="drawer-note">${esc(
            lang === "de"
              ? "Mehrwertsteuer-, BNE- und Plastik-Eigenmittel zahlt der Bund aus seinem Anteil. Ein „Nettobeitrag“ ist eine abgeleitete Größe* und wird hier nicht berechnet: EU-weite Ausgaben sind keinem Land zugeordnet."
              : "VAT-, GNI- and plastics-based own resources are paid by the Federation from its share. A “net contribution” is a derived construct* and is not computed here: EU-wide spending is not allocated to any country.",
          )}</p>`,
      )}
      ${section(t("sources", lang), sourceList([euSource(), ...allocationSource("STEUERARTZ10")], lang))}`,
    };
  }
  if (id.startsWith("c-")) {
    const system = { "c-pension": "pension", "c-health": "health", "c-care": "ltc", "c-unemp": "unemployment" }[id]!;
    const byYear = (raw.socialInsurance as unknown as { contributions_by_payer_all_systems: Record<string, Record<string, unknown>> }).contributions_by_payer_all_systems;
    const payerYear = byYear[Y] ? Y : "2024";
    const payers = byYear[payerYear]!;
    const payerRows = Object.entries(payers)
      .filter(([, value]) => typeof value === "object" && value !== null && "by_system" in (value as object))
      .map(([key, value]) => ({ key, amount: ((value as { by_system: Record<string, number> }).by_system[system] ?? 0) }))
      .filter((row) => row.amount > 0);
    const total = payerRows.reduce((sum, row) => sum + row.amount, 0);
    const payerLabel: Record<string, Bi> = {
      payroll_employee_employer_combined: bi("Beschäftigte und Arbeitgeber*", "Employees and employers*"),
      employer_only_levies: bi("Umlagen nur der Arbeitgeber", "Employer-only levies"),
      members_self_employed_voluntary_other: bi("Selbständige, freiwillig Versicherte, andere", "Self-employed, voluntary, others"),
      pensioners_own_share_and_pension_insurers: bi("Rentner und Rentenversicherung", "Pensioners and pension insurers"),
      federal_budget: bi("Bundeshaushalt", "Federal budget"),
      bundesagentur_for_benefit_recipients: bi("Bundesagentur für Arbeit", "Federal Employment Agency"),
      health_and_care_insurance_for_benefit_recipients: bi("Kranken- und Pflegeversicherung", "Health and care insurance"),
    };
    return {
      title,
      html: `${header(fmt(node.value), lang === "de" ? "Beiträge auf Löhne, Näherung*" : "Contributions on wages, a proxy*", "official", lang)}
      ${section(
        lang === "de" ? `Wer Beiträge zahlt (alle Zahler ${payerYear})` : `Who pays contributions (all payers ${payerYear})`,
        rows(payerRows.map((row) => ({ label: tr(payerLabel[row.key] ?? bi(row.key, row.key), lang), value: bn(row.amount, lang), share: row.amount / total, entity: node.entity }))) +
          `<p class="drawer-note">${esc(tr(payrollViewOf(germany.year).label, lang))}. ${esc(
            lang === "de"
              ? "Mindestens 46,0 Mrd. € der Beiträge aller vier Systeme zahlt ein System an ein anderes; im Bild zählt jeder Euro einmal."
              : "At least €46.0bn of all four systems' contributions is paid by one system to another; in the picture each euro counts once.",
          )}</p>`,
      )}
      ${section(t("sources", lang), sourceList([{ label: bi(`Sozialversicherung ${payerYear}, Beiträge nach Zahlern`, `Social insurance ${payerYear}, contributions by payer`), file: files.socialInsurance }], lang))}`,
    };
  }
  if (id.startsWith("r-")) {
    const entity = id.slice(2);
    const recipientRow = { fed: "STEUERNVB10", land: "STEUERNVL10", muni: "STEUERNVK10" }[entity as "fed" | "land" | "muni"];
    const after = recipientRow ? byRecipientRows.find((row) => row.id === recipientRow) : undefined;
    const children = after ? byRecipientRows.filter((row) => row.parent === after.id && (row.values_eur[Y] ?? 0) !== 0) : [];
    const inEdges = germany.flow.edges.filter((edge) => edge.to === id);
    return {
      title,
      html: `${header(fmt(node.value), lang === "de" ? "per Gesetz, vor Ausgleich und Transfers" : "by law, before equalisation and transfers", "official", lang)}
      ${section(
        lang === "de" ? "Aus welchen Steuern" : "From which taxes",
        rows(
          inEdges
            .sort((a, b) => b.value - a.value)
            .map((edge) => ({ label: tr(germany.flow.nodes.find((n) => n.id === edge.from)!.label, lang), value: fmt(edge.value), share: edge.value / node.value, entity: node.entity })),
        ),
      )}
      ${
        after
          ? section(
              lang === "de" ? `Nach Verteilung: ${bn(after.values_eur[Y] ?? 0, lang)}` : `After distribution: ${bn(after.values_eur[Y] ?? 0, lang)}`,
              rows(children.map((row) => ({ label: tr(row.label, lang), value: bn(row.values_eur[Y] ?? 0, lang) }))) +
                `<p class="drawer-note">${esc(lang === "de" ? `Kasse ${Y}, Destatis 71211-0002. Negative Zeilen: Zahlungen an EU oder Länder.` : `Cash ${Y}, Destatis 71211-0002. Negative rows: payments to the EU or the Länder.`)}</p>`,
            )
          : ""
      }
      ${section(t("sources", lang), sourceList([byRecipientSource(), byTaxSource()], lang))}`,
    };
  }
  // taxes
  const taxId = id.slice(2);
  let mechanism = "";
  let srcs: SourceLink[] = [byTaxSource()];
  let series: { year: number; value: number }[] = [];
  if (taxId === "vat") {
    const statutory = (equalisationFile(germany.year) as unknown as { totals: { vat: { statutory_shares_pct: Record<string, number> } } }).totals.vat.statutory_shares_pct;
    const split = vatSplit(germany.year);
    mechanism =
      `<p class="drawer-note">${esc(lang === "de" ? "Grundanteile nach § 1 Abs. 1 FAG" : "Base shares, § 1 (1) FAG")}</p>${splitBar([
        { entity: "fed", share: statutory.bund! },
        { entity: "land", share: statutory.laender! },
        { entity: "muni", share: statutory.gemeinden! },
      ])}
      <p class="drawer-note">${esc(lang === "de" ? `Ergebnis ${Y} nach den festen Beträgen` : `Outcome ${Y} after the fixed amounts`)}</p>${splitBar([
        { entity: "fed", share: split.fed },
        { entity: "land", share: split.laender },
        { entity: "muni", share: split.muni },
      ])}${rows([
        { label: tr(bi("Bund", "Federation"), lang), value: `${pct(split.fed / split.total, lang, 2)} · ${bn(split.fed, lang)}`, entity: "fed" },
        { label: tr(bi("Länder-Topf", "Länder pool"), lang), value: `${pct(split.laender / split.total, lang, 2)} · ${bn(split.laender, lang)}`, entity: "land" },
        { label: tr(bi("Gemeinden", "Municipalities"), lang), value: `${pct(split.muni / split.total, lang, 2)} · ${bn(split.muni, lang)}`, entity: "muni" },
      ])}
      <p class="drawer-note">${esc(
        lang === "de"
          ? "Der Länder-Topf ist eine Formel, kein Haushalt: verteilt nach Einwohnern, dann Zu- und Abschläge nach Finanzkraft (Karte)."
          : "The Länder pool is a formula, not a budget: shared by population, then supplements and deductions by fiscal capacity (map).",
      )}</p>${quotes("STEUERARTG60", lang)}`;
    srcs = [byTaxSource(), ...equalisationSource(germany.year), ...allocationSource("STEUERARTG60")];
    series = taxSeries("STEUERARTG60").map((p, i) => ({ year: p.year, value: p.value + (taxSeries("STEUERARTG70")[i]?.value ?? 0) }));
  } else if (GROUP_CHILDREN[id]) {
    const parent = GROUP_CHILDREN[id]!;
    const children = byTaxRows
      .filter((row) => row.parent === parent && row.id !== "STEUERARTK30" && (row.values_eur[Y] ?? 0) > 0)
      .sort((a, b) => (b.values_eur[Y] ?? 0) - (a.values_eur[Y] ?? 0));
    mechanism = rows(children.map((row) => ({ label: tr(row.label, lang), value: bn(row.values_eur[Y] ?? 0, lang, 2), share: (row.values_eur[Y] ?? 0) / node.value, entity: node.entity })));
    series = taxSeries(parent);
  } else if (id === "t-capital") {
    mechanism = rows(["STEUERARTG30", "STEUERARTG40"].map((tid) => ({ label: `${tr(allocation(tid).label, lang)} · ${Object.values(allocation(tid).shares ?? {}).map((s) => pct(s, lang, 0)).join(" / ")}`, value: bn(byTaxRows.find((row) => row.id === tid)?.values_eur[Y] ?? 0, lang) })));
    srcs = [byTaxSource(), ...allocationSource("STEUERARTG30"), ...allocationSource("STEUERARTG40")];
  } else {
    const kind = allocation(taxId).kind;
    mechanism = `${splitBar(splitParts, 14)}${rows(
      outEdges.map((edge) => ({
        label: `${tr(germany.flow.nodes.find((n) => n.id === edge.to)!.label, lang)}${edge.share !== undefined ? ` · ${pct(edge.share, lang, 1)}` : ""}`,
        value: fmt(edge.value),
        entity: edge.entity,
      })),
    )}<p class="drawer-note">${esc(tr(allocationKinds[kind] ?? bi(kind, kind), lang))}</p>${
      taxId === "STEUERARTK30"
        ? `<p class="drawer-note">${esc(`${tr(tradeTaxLevy.label, lang)}: ${tr(tradeTaxLevy.formula, lang)} (${tradeTaxLevy.multipliers.legal_basis}). ${tr(tradeTaxLevy.effective_share_of_gross_note, lang)}. ${tr(tradeTaxLevy.city_states, lang)}.`)}</p>`
        : ""
    }${quotes(taxId, lang)}`;
    srcs = [
      byTaxSource(),
      ...allocationSource(taxId),
      ...(taxId === "STEUERARTK30"
        ? [{ label: bi("§ 6 (3) GemFinRefG, Vervielfältiger", "§ 6 (3) GemFinRefG, multipliers"), file: files.legalAllocation, url: tradeTaxLevy.multipliers.source.url, coordinates: tradeTaxLevy.multipliers.source.coordinates }]
        : []),
    ];
    series = taxSeries(taxId);
  }
  return {
    title,
    html: `${header(fmt(node.value), `${pct(node.value / germany.taxesTotal, lang, 1)} ${lang === "de" ? `aller Steuern ${Y} (Kasse)` : `of all tax ${Y} (cash)`}`, "official", lang)}
      ${section(t("mechanism", lang), mechanism)}
      ${series.length ? section(lang === "de" ? "1999–2025" : "1999–2025", spark(series, lang, title)) : ""}
      ${section(t("sources", lang), sourceList(srcs, lang))}`,
  };
}

// --- consolidated state ----------------------------------------------------------------------

function cofogDrawer(code: string, ctx: DrawerContext): DrawerContent {
  const { lang, germany } = ctx;
  const fn = germany.cofog.find((item) => item.code === code)!;
  const row = cofogRows.find((r) => r.sector === "S13" && r.code === code)!;
  const series = Object.entries(row.values_meur)
    .filter(([, v]) => v !== null)
    .map(([year, v]) => ({ year: Number(year), value: (v ?? 0) * 1e6 }));
  return {
    title: tr(fn.label, lang),
    html: `${header(bn(fn.value, lang), `${germany.stateYear} · ${pct(fn.value / germany.spendingTotal, lang, 1)} · ${eur(perResidentPerDay(fn.value, germany.stateYear), lang, 2)} ${t("perResidentDay", lang)}`, "provisional", lang)}
      ${section(t("breakdown", lang), rows(fn.children.map((child) => ({ label: tr(child.label, lang), value: bn(child.value, lang), share: child.value / fn.value }))))}
      <p class="drawer-note">${esc(
        lang === "de"
          ? "Konsolidiert: Zahlungen zwischen Bund, Ländern, Gemeinden und Sozialversicherung sind herausgerechnet. Die Aufgabenbereiche sagen, wofür ausgegeben wird, nicht welche Steuer es bezahlt."
          : "Consolidated: payments between Federation, Länder, municipalities and social insurance are removed. The functions say what money is spent on, not which tax paid for it.",
      )}</p>
      ${section(lang === "de" ? "Seit 1995" : "Since 1995", spark(series, lang, tr(fn.label, lang)))}
      ${section(t("sources", lang), sourceList([cofogSource(), populationSource()], lang))}`,
  };
}

function bridgeDrawer(id: string, ctx: DrawerContext): DrawerContent {
  const { lang, germany } = ctx;
  const seg = germany.bridge.find((b) => b.id === id)!;
  const SY = String(germany.stateYear);
  const agg = (aid: string, label?: Bi) => ({ label: label ? tr(label, lang) : aid, value: bn(aggregate(aid, SY), lang) });
  const parts: Record<string, { label: string; value: string }[]> = {
    taxes: [agg("D2REC", bi("Produktions- und Importabgaben", "Taxes on production and imports")), agg("D5REC", bi("Einkommen- und Vermögensteuern", "Taxes on income and wealth")), agg("D91REC", bi("Vermögenswirksame Steuern", "Capital taxes"))],
    contributions: [agg("D611REC", bi("Tatsächliche Arbeitgeberbeiträge", "Employers' actual contributions")), agg("D613REC", bi("Beiträge der Haushalte", "Households' actual contributions"))],
    other: [
      agg("P11_P12_P131", bi("Verkäufe, Gebühren", "Sales and fees")),
      agg("D4REC", bi("Vermögenseinkommen", "Property income")),
      agg("D7REC", bi("Laufende Transfers", "Current transfers")),
      agg("D9REC", bi("Vermögenstransfers", "Capital transfers")),
    ],
    borrowed: [agg("GD", bi(`Schuldenstand Ende ${SY} (Maastricht)`, `Gross debt end-${SY} (Maastricht)`)), agg("D41PAY", bi(`Zinsausgaben ${SY}`, `Interest paid ${SY}`))],
  };
  return {
    title: tr(seg.label, lang),
    html: `${header(bn(seg.value, lang), `${SY} · ${seg.share !== undefined ? `${pct(seg.share, lang, 1)} ${lang === "de" ? "der Staatseinnahmen" : "of state revenue"}` : `${eur(seg.value / (raw.population.germany as Record<string, number>)[SY]!, lang)} ${lang === "de" ? "je Einwohner" : "per resident"}`}`, "official", lang)}
      ${section(t("breakdown", lang), rows(parts[id] ?? []))}
      <p class="drawer-note">${esc(
        lang === "de"
          ? "Volkswirtschaftliche Gesamtrechnung, Staat konsolidiert. Nicht mit den kassenmäßigen Steuereinnahmen links addieren."
          : "National accounts, general government consolidated. Never add to the cash tax receipts on the left.",
      )}</p>
      ${section(t("sources", lang), sourceList([aggregatesSource()], lang))}`,
  };
}

function purchaseDrawer(id: string, ctx: DrawerContext): DrawerContent {
  const { lang } = ctx;
  const item = purchases(ctx.year).find((p) => p.id === id)!;
  const total = item.price;
  return {
    title: `${tr(item.label, lang)}*`,
    html: `${header(`${pct(item.taxShare, lang, 1)} ${t("taxShare", lang)}`, t("priceAssumed", lang), "law", lang)}
      ${section(
        t("mechanism", lang),
        `${splitBar(item.segments.map((seg) => ({ entity: seg.entity, share: seg.value / total, cls: seg.entity ? "" : "is-price" })), 14)}${rows(
          item.segments.map((seg) => ({ label: tr(seg.label, lang), value: eur(seg.value, lang, seg.value < 10 ? 4 : 2), entity: seg.entity })),
        )}<p class="drawer-note">* ${esc(item.assumption)}</p>`,
      )}
      ${section(t("sources", lang), sourceList([purchaseSource(), ...equalisationSource(ctx.year)], lang))}`,
  };
}

export const equalisationLands = equalisation;

// --- panels --------------------------------------------------------------------------------

const ENTITY_NAME: Record<EntityId, Bi> = {
  fed: bi("Bund", "Federation"),
  land: bi("Länder", "Länder"),
  muni: bi("Gemeinden", "Municipalities"),
  eu: bi("EU", "EU"),
  pension: bi("Rentenversicherung", "Pension insurance"),
  health: bi("Krankenversicherung", "Health insurance"),
  care: bi("Pflegeversicherung", "Care insurance"),
  unemp: bi("Arbeitslosenversicherung", "Unemployment insurance"),
};

/** Tax inside one purchase, by recipient; the row label without its trailing "(2026)" vintage. */
function purchaseParts(id: string, year: number) {
  const item = purchases(year).find((candidate) => candidate.id === id)!;
  const tax = item.segments.filter((seg) => seg.entity);
  const byEntity = new Map<EntityId, number>();
  for (const seg of tax) {
    byEntity.set(seg.entity!, (byEntity.get(seg.entity!) ?? 0) + seg.value);
  }
  const vintage = /\s*\((\d{4})\)$/.exec(item.label.en)?.[1];
  const order: EntityId[] = ["fed", "land", "muni", "eu", "pension", "health", "care", "unemp"];
  const sorted = [...byEntity.entries()].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
  return { item, taxEur: tax.reduce((sum, seg) => sum + seg.value, 0), byEntity: sorted, vintage: vintage ? Number(vintage) : undefined };
}

/** Hover / focus text of one purchase row: € tax per unit, recipient split, legal basis. */
export function purchaseDetail(id: string, year: number, lang: Lang): { value: string; title: string; lines: string[] } {
  const { item, taxEur, byEntity } = purchaseParts(id, year);
  return {
    value: `${eur(taxEur, lang, taxEur < 10 ? 2 : 0)} ${lang === "de" ? "Steuer" : "tax"}`,
    title: `${tr(item.label, lang)}*`,
    lines: [
      byEntity.map(([entity, value]) => `${tr(ENTITY_NAME[entity], lang)} ${eur(value, lang, value < 10 ? 2 : 0)}`).join(" · "),
      item.laws.join(" · "),
      `* ${item.assumption}`,
    ],
  };
}

function shoppingPanel(ctx: DrawerContext): DrawerContent {
  const { lang } = ctx;
  const estimate = estimateDrawer(ctx);
  const items = purchases(ctx.year).sort((a, b) => b.taxShare - a.taxShare);
  const purchaseRows = items
    .map((item) => {
      const { taxEur, byEntity, vintage } = purchaseParts(item.id, ctx.year);
      const label = tr(item.label, lang).replace(/\s*\(\d{4}\)$/, "");
      const detail = purchaseDetail(item.id, ctx.year, lang);
      const segs = byEntity
        .map(([entity, value]) => `<span class="pr-seg" data-entity="${entity}" style="width:${((value / item.price) * 100).toFixed(2)}%;background:var(--e-${entity})"></span>`)
        .join("");
      return `<li><button type="button" class="purchase-row" data-purchase="${esc(item.id)}" aria-haspopup="dialog" aria-describedby="pd-${esc(item.id)}">
        <span class="pr-label">${esc(`${label}*`)}${vintage && vintage !== ctx.year ? ` <span class="tag">${vintage}</span>` : ""}</span>
        <span class="pr-track" aria-hidden="true">${segs}</span>
        <span class="pr-share num">${esc(`${pct(item.taxShare, lang, 0)} ${lang === "de" ? "Steuer" : "tax"}`)}</span>
        <span class="sr-only" id="pd-${esc(item.id)}">${esc(`${detail.value}. ${detail.lines.join(". ")}`)}</span>
      </button></li>`;
    })
    .join("");
  return {
    title: t("shoppingTitle", lang),
    html: `<section class="drawer-section panel-estimate"><h3>${esc(estimate.title)}</h3>${estimate.html}</section>
      <section class="drawer-section"><h3>${esc(t("purchasesHeading", lang))}</h3>
        <ul class="purchase-rows">${purchaseRows}</ul>
        <p class="drawer-note">${esc(t("purchasesCaption", lang))}</p>
        ${sourceList([purchaseSource(), ...equalisationSource(ctx.year)], lang)}
      </section>`,
  };
}

function rankingPanel(ctx: DrawerContext): DrawerContent {
  const { lang } = ctx;
  const status = equalisationStatus(ctx.year).startsWith("provisional") ? "provisional" : "official";
  return {
    title: `${t("mapShort", lang)} ${ctx.year}`,
    html: `<p class="drawer-sub">${esc(`${t("ranking", lang)} · ${lang === "de" ? "€ je Einwohner: Finanzkraftausgleich + Bundesergänzungszuweisungen" : "€ per resident: equalisation within VAT + supplementary federal grants"}`)} ${badge(status, lang)}</p>
      <div id="rank-bars" class="rank-bars"></div>
      ${renderEqualisationTable(lang, ctx.year)}
      <p class="drawer-note">${esc(
        lang === "de"
          ? "Ein gemeinsamer Ausgleich, keine Zahlungen von Land zu Land. Klick auf ein Land zeigt Ihren Fluss dort; nochmals klicken: alle Länder."
          : "One pooled calculation, no payments from Land to Land. Click a Land to see your flow there; click again for all Länder.",
      )}</p>
      ${section(t("sources", lang), sourceList(equalisationSource(ctx.year), lang))}`,
  };
}
