/**
 * The master flow (desktop): GROSS WAGE → TAXES & CONTRIBUTIONS → WHO RECEIVES IT ‖ THE POT IT JOINS,
 * and the Germany zoom: NAMED TAXES & CONTRIBUTIONS → RECIPIENTS ‖ THE CONSOLIDATED STATE.
 */
import {
  perResidentPerDay,
  type EntityId,
  type GermanyModel,
  type Pot,
  type YouModel,
} from "../data/model.ts";
import { bn, eur, num, pct, t, tr, type Lang } from "../i18n.ts";
import { layoutFlow, layoutPots, lerp, resolveColumn, ribbonPath, spreadLabels, type FlowLayout, type LayoutNode } from "./flow-layout.ts";
import { multiline, svgEl, textWidth, wrap } from "./svg.ts";
import { hideTooltip, showTooltip, tooltipText, type TooltipContent } from "./tooltip.ts";

export type DrawerTarget =
  | { kind: "node"; id: string }
  | { kind: "pot"; id: string }
  | { kind: "cofog"; code: string }
  | { kind: "bridge"; id: string }
  | { kind: "purchase"; id: string };

export interface HeroOptions {
  lang: Lang;
  selectedPot: string;
  dimmed: boolean;
  unit: "bn" | "day";
  animate: boolean;
  onSelectPot: (id: string) => void;
  onOpen: (target: DrawerTarget) => void;
}

const reducedMotion = (): boolean => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const entityFill = (entity: EntityId | undefined): string => (entity ? `var(--e-${entity})` : "var(--flow-neutral)");

interface Geometry {
  rects: Map<string, { y: number; h: number }>;
  ribbons: Map<string, { y0: number; y1: number; t: number }>;
}
const previous = new WeakMap<HTMLElement, Geometry>();

function interactive(
  el: SVGElement,
  lang: Lang,
  content: () => TooltipContent,
  onActivate: () => void,
  onHover?: (on: boolean) => void,
): void {
  el.setAttribute("tabindex", "0");
  el.setAttribute("role", "button");
  el.setAttribute("aria-label", tooltipText(content(), lang));
  el.addEventListener("pointerenter", (event) => {
    onHover?.(true);
    showTooltip(content(), { x: event.clientX, y: event.clientY }, lang);
  });
  el.addEventListener("pointermove", (event) => showTooltip(content(), { x: event.clientX, y: event.clientY }, lang));
  el.addEventListener("pointerleave", () => {
    onHover?.(false);
    hideTooltip();
  });
  el.addEventListener("focus", () => {
    onHover?.(true);
    const box = el.getBoundingClientRect();
    showTooltip(content(), { x: box.right, y: box.top }, lang);
  });
  el.addEventListener("blur", () => {
    onHover?.(false);
    hideTooltip();
  });
  el.addEventListener("click", onActivate);
  el.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onActivate();
    }
  });
}

function defs(svg: SVGSVGElement): void {
  const d = svgEl(svg, "defs");
  const hatch = svgEl(d, "pattern", { id: "hatch", patternUnits: "userSpaceOnUse", width: 6, height: 6, patternTransform: "rotate(45)" });
  svgEl(hatch, "rect", { width: 6, height: 6, class: "hatch-bg" });
  svgEl(hatch, "line", { x1: 0, y1: 0, x2: 0, y2: 6, class: "hatch-line" });
}

function stageLabel(svg: SVGSVGElement, x: number, text: string, anchor: "start" | "end" | "middle" = "start"): void {
  svgEl(svg, "text", { x, y: 14, class: "stage-label", "text-anchor": anchor }, text);
}

function boundary(svg: SVGSVGElement, x: number, top: number, bottom: number, lang: Lang): void {
  const g = svgEl(svg, "g", { class: "boundary" });
  svgEl(g, "line", { x1: x, x2: x, y1: top - 6, y2: bottom, class: "boundary-line" });
  svgEl(g, "text", { x: x - 6, y: top, class: "boundary-label", transform: `rotate(-90 ${x - 6} ${top})`, "text-anchor": "end" }, t("boundary", lang));
}

/** Animate rect heights/positions and ribbons from the previous render (respects reduced motion). */
function tween(container: HTMLElement, svg: SVGSVGElement, animate: boolean): void {
  const before = previous.get(container);
  const rects = new Map<string, { y: number; h: number }>();
  const ribbons = new Map<string, { y0: number; y1: number; t: number }>();
  const rectEls = [...svg.querySelectorAll<SVGRectElement>("rect[data-key]")];
  const pathEls = [...svg.querySelectorAll<SVGPathElement>("path[data-ribbon]")];
  for (const el of rectEls) {
    rects.set(el.dataset.key!, { y: Number(el.getAttribute("y")), h: Number(el.getAttribute("height")) });
  }
  for (const el of pathEls) {
    const [x0, x1, y0, y1, th] = el.dataset.ribbon!.split(",").map(Number) as [number, number, number, number, number];
    ribbons.set(el.dataset.key!, { y0, y1, t: th });
    el.dataset.x = `${x0},${x1}`;
  }
  previous.set(container, { rects, ribbons });
  if (!before || !animate || reducedMotion()) {
    return;
  }
  const start = performance.now();
  const duration = 320;
  const frame = (now: number) => {
    const k = Math.min(1, (now - start) / duration);
    const e = 1 - (1 - k) ** 3;
    for (const el of rectEls) {
      const from = before.rects.get(el.dataset.key!);
      const to = rects.get(el.dataset.key!);
      if (from && to) {
        el.setAttribute("y", String(lerp(from.y, to.y, e)));
        el.setAttribute("height", String(Math.max(0, lerp(from.h, to.h, e))));
      }
    }
    for (const el of pathEls) {
      const from = before.ribbons.get(el.dataset.key!);
      const to = ribbons.get(el.dataset.key!);
      if (from && to) {
        const [x0, x1] = el.dataset.x!.split(",").map(Number) as [number, number];
        el.setAttribute("d", ribbonPath({ x0, x1, y0: lerp(from.y0, to.y0, e), y1: lerp(from.y1, to.y1, e), t: lerp(from.t, to.t, e) }));
      }
    }
    if (k < 1) {
      requestAnimationFrame(frame);
    }
  };
  requestAnimationFrame(frame);
}

function ribbon(parent: Element, key: string, edge: { x0: number; x1: number; y0: number; y1: number; t: number }, className: string, fill: string): SVGPathElement {
  return svgEl(parent, "path", {
    d: ribbonPath(edge),
    class: className,
    fill,
    "data-key": key,
    "data-ribbon": `${edge.x0},${edge.x1},${edge.y0},${edge.y1},${edge.t}`,
  });
}

function nodeRect(parent: Element, node: LayoutNode, className: string, fill: string): SVGRectElement {
  return svgEl(parent, "rect", { x: node.x, y: node.y, width: node.w, height: node.h, rx: 2, class: className, fill, "data-key": `n-${node.id}` });
}

interface LabelSpec {
  key: string;
  name: string;
  value: string;
  /** x of the node edge the label hangs from */
  anchorX: number;
  nodeY: number;
  nodeH: number;
}

interface LabelOptions {
  side: "left" | "right";
  maxWidth: number;
  top: number;
  bottom: number;
  /** minimum vertical gap between label blocks */
  gap: number;
  /** nodes shorter than this get a one-line label ("name value") */
  compactBelow: number;
  maxLines?: number;
  /** paper-coloured plate behind the text where labels sit over ribbons */
  backdrop?: boolean;
}

/**
 * Direct labels for one column: big nodes get "name / value" blocks, small nodes one line; blocks keep a
 * minimum gap and stay near their node, with a leader line when they had to move.
 */
function placeLabels(parent: Element, specs: LabelSpec[], o: LabelOptions): Map<string, SVGGElement> {
  const lineH = 13.5;
  const blocks = specs.map((spec) => {
    const valueWidth = textWidth(spec.value, 12, 650);
    // one line for small nodes when it fits; tiny nodes always get one line (ellipsised if needed)
    const fits = textWidth(spec.name, 12, 500) + 6 + valueWidth <= o.maxWidth;
    const compact = spec.nodeH < o.compactBelow && (fits || spec.nodeH < 6);
    const lines = compact ? [wrap(spec.name, o.maxWidth - valueWidth - 6, 12, 500, 1)[0] ?? ""] : wrap(spec.name, o.maxWidth, 12, 500, o.maxLines ?? 2);
    const h = compact ? lineH : (lines.length + 1) * lineH;
    return { spec, compact, lines, h, y: spec.nodeY + spec.nodeH / 2 - h / 2, width: Math.max(valueWidth, ...lines.map((line) => textWidth(line, 12, 500))) + (compact ? valueWidth + 6 : 0) };
  });
  resolveColumn(blocks, o.top, o.bottom, o.gap);
  const out = new Map<string, SVGGElement>();
  const dir = o.side === "right" ? 1 : -1;
  for (const block of blocks) {
    const { spec } = block;
    const g = svgEl(parent, "g", { class: "label-block" });
    const x = spec.anchorX + dir * 8;
    const centre = spec.nodeY + spec.nodeH / 2;
    const blockCentre = block.y + block.h / 2;
    if (Math.abs(blockCentre - centre) > Math.max(spec.nodeH / 2, 3)) {
      svgEl(g, "path", { d: `M${spec.anchorX + dir},${centre}L${x - dir * 3},${blockCentre}`, class: "leader" });
    }
    if (o.backdrop) {
      svgEl(g, "rect", {
        x: o.side === "right" ? x - 3 : x - block.width - 3,
        y: block.y - 1,
        width: block.width + 6,
        height: block.h + 2,
        rx: 2,
        class: "label-backdrop",
      });
    }
    const anchor = o.side === "right" ? undefined : "end";
    if (block.compact) {
      const text = svgEl(g, "text", { x, y: block.y + 10.5, class: "node-label", "text-anchor": anchor });
      svgEl(text, "tspan", {}, `${block.lines[0]} `);
      svgEl(text, "tspan", { class: "num strong" }, spec.value);
    } else {
      multiline(g, [...block.lines, spec.value], { x, y: block.y + 10.5, class: "node-label", "text-anchor": anchor }, lineH, (i) => (i === block.lines.length ? "num strong" : undefined));
    }
    out.set(spec.key, g);
  }
  return out;
}

// =============================================================================================
// You zoom
// =============================================================================================

export function renderYou(container: HTMLElement, model: YouModel, options: HeroOptions): void {
  const { lang } = options;
  const W = Math.max(720, container.clientWidth);
  const H = Math.max(420, container.clientHeight || 540);
  const top = 30;
  const bottom = H - 6;
  const plotH = bottom - top;
  const leftLabel = Math.min(132, W * 0.095);
  const x0 = leftLabel;
  const x1 = W * 0.235;
  const x2 = W * 0.4;
  const xb = W * 0.565;
  const xp = W * 0.59;
  const potW = 14;
  const lane = 10;
  const potLabelX = xp + potW + lane + 6;
  const panelX = W * 0.755;
  const nodeW = 12;

  container.replaceChildren();
  const svg = svgEl(container, "svg", {
    class: `hero-svg${options.dimmed ? " is-dimmed" : ""}`,
    width: W,
    height: H,
    viewBox: `0 0 ${W} ${H}`,
    role: "group",
    "aria-label": `${t("stageGross", lang)} → ${t("stageDeductions", lang)} → ${t("stageRecipients", lang)} → ${t("stagePots", lang)}`,
  });
  defs(svg);

  // ---- pots (right of the boundary), laid out first: recipients align to them
  const potGap = 12;
  const potLayout = layoutPots(model.pots, top + 4, plotH - 8, potGap);
  const potById = new Map(potLayout.pots.map((p) => [p.pot.id, p]));
  const centers: Record<string, number> = {};
  for (const p of potLayout.pots) {
    for (const recipient of p.pot.recipients) {
      centers[recipient] = p.y + p.h / 2;
    }
  }
  // Bremen: two recipients join one pot; offset them around the pot centre.
  for (const p of potLayout.pots) {
    if (p.pot.recipients.length > 1) {
      p.pot.recipients.forEach((id, index) => {
        centers[id] = p.y + p.h / 2 + (index - (p.pot.recipients.length - 1) / 2) * 24;
      });
    }
  }

  const flow: FlowLayout = layoutFlow(model.flow, {
    stageX: [x0, x1, x2],
    top,
    height: plotH,
    nodeWidth: nodeW,
    gap: 7,
    gapAfter: { gross: 18 },
    centers,
  });
  const nodeById = new Map(flow.nodes.map((node) => [node.id, node]));

  stageLabel(svg, 0, t("stageGross", lang));
  stageLabel(svg, x1, t("stageDeductions", lang));
  stageLabel(svg, x2, t("stageRecipients", lang));
  stageLabel(svg, xp, wrap(t("stagePots", lang), panelX - xp - 16, 11, 400, 1)[0] ?? "");

  const ribbons = svgEl(svg, "g", { class: "ribbons" });
  const joins = svgEl(svg, "g", { class: "joins" });
  const nodes = svgEl(svg, "g", { class: "nodes" });
  const labels = svgEl(svg, "g", { class: "labels" });

  const related = new Map<string, Set<Element>>();
  const relate = (key: string, el: Element) => {
    if (!related.has(key)) {
      related.set(key, new Set());
    }
    related.get(key)!.add(el);
  };
  const highlight = (keys: string[], on: boolean) => {
    svg.classList.toggle("has-focus", on);
    for (const el of svg.querySelectorAll(".is-lit")) {
      el.classList.remove("is-lit");
    }
    if (on) {
      for (const key of keys) {
        for (const el of related.get(key) ?? []) {
          el.classList.add("is-lit");
        }
      }
    }
  };

  // ---- ribbons left of the boundary
  for (const edge of flow.edges) {
    const cls = `ribbon${edge.ghost ? " is-ghost" : ""}${edge.entity ? "" : " is-neutral"}${edge.to === "net" ? " is-yours" : ""}`;
    const path = ribbon(ribbons, `e-${edge.id}`, edge, cls, entityFill(edge.entity));
    relate(edge.from, path);
    relate(edge.to, path);
    relate(`edge:${edge.id}`, path);
    const from = nodeById.get(edge.from)!;
    const to = nodeById.get(edge.to)!;
    interactive(
      path,
      lang,
      () => ({
        value: eur(edge.value, lang),
        title: `${tr(from.label, lang)} → ${tr(to.label, lang)}`,
        lines: edge.share !== undefined && edge.share < 1 ? [`${pct(edge.share, lang, 1)} ${t("legalShares", lang).toLowerCase()}`] : undefined,
        status: edge.status,
        hint: true,
      }),
      () => options.onOpen({ kind: "node", id: edge.from === "gross" || edge.from === "employer" ? edge.to : edge.from }),
      (on) => highlight([`edge:${edge.id}`, edge.from, edge.to], on),
    );
  }

  // ---- recipient → pot: the stream keeps its width to the boundary, then joins the pot
  for (const p of potLayout.pots) {
    for (const recipientId of p.pot.recipients) {
      const r = nodeById.get(recipientId);
      if (!r || r.h <= 0) {
        continue;
      }
      const stream = svgEl(joins, "path", {
        d: `M${r.x + r.w},${r.y}L${xb},${r.y}L${xb},${r.y + r.h}L${r.x + r.w},${r.y + r.h}Z`,
        class: "join-stream",
        fill: entityFill(r.entity),
      });
      const mid = (xb + xp) / 2;
      const wedge = svgEl(joins, "path", {
        d: `M${xb},${r.y}C${mid},${r.y} ${mid},${p.y} ${xp},${p.y}L${xp},${p.y + p.h}C${mid},${p.y + p.h} ${mid},${r.y + r.h} ${xb},${r.y + r.h}Z`,
        class: "join-wedge",
        fill: entityFill(r.entity),
      });
      relate(recipientId, stream);
      relate(recipientId, wedge);
      relate(p.pot.id, stream);
      relate(p.pot.id, wedge);
    }
  }
  boundary(svg, xb, top + 6, bottom, lang);

  // ---- nodes left of the boundary
  for (const node of flow.nodes) {
    if (node.h <= 0) {
      continue;
    }
    const cls = `node node-${node.kind}`;
    const fill = node.kind === "yours" ? "var(--flow-yours)" : node.kind === "ghost" ? "var(--flow-ghost)" : entityFill(node.entity);
    const rect = nodeRect(nodes, node, cls, fill);
    relate(node.id, rect);
    interactive(
      rect,
      lang,
      () => ({
        value: eur(node.value, lang, node.value < 100 ? 2 : 0),
        title: `${tr(node.label, lang)}${node.star ? "" : ""}`,
        lines: node.stage === 1 && node.id !== "net" ? [`${pct(node.value / model.gross, lang, 1)} ${t("ofEvery100", lang)} ${lang === "de" ? "brutto" : "gross"}`] : undefined,
        status: node.status,
        body: node.mechanism ? tr(node.mechanism, lang) : node.star ? tr(STAR_HEALTH, lang) : undefined,
        hint: true,
      }),
      () => options.onOpen({ kind: "node", id: node.id }),
      (on) => highlight([node.id], on),
    );
  }

  // ---- node labels: minimum spacing, one line for small nodes, leader lines where a label had to move
  for (const stage of [0, 1, 2]) {
    const column = flow.nodes.filter((node) => node.stage === stage && node.h > 0);
    const placed = placeLabels(
      labels,
      column.map((node) => ({
        key: node.id,
        name: `${tr(node.label, lang)}${node.star ? "*" : ""}`,
        value: eur(node.value, lang, node.value < 100 ? 2 : 0),
        anchorX: stage === 0 ? node.x : node.x + node.w,
        nodeY: stage === 0 ? node.y : node.y,
        nodeH: stage === 0 ? Math.min(node.h, 80) : node.h,
      })),
      {
        side: stage === 0 ? "left" : "right",
        maxWidth: stage === 0 ? leftLabel - 14 : stage === 1 ? x2 - x1 - 22 : xb - x2 - nodeW - 18,
        top: top + 4,
        bottom,
        gap: 7,
        compactBelow: stage === 0 ? 0 : 24,
        maxLines: stage === 0 ? 3 : 2,
        backdrop: stage > 0,
      },
    );
    for (const [id, g] of placed) {
      relate(id, g);
    }
  }

  // ---- pots
  const potGroup = svgEl(svg, "g", { class: "pots" });
  const potLabelGroup = svgEl(svg, "g", { class: "pot-labels" });
  const selected = potById.get(options.selectedPot) ?? potLayout.pots[0]!;
  for (const p of potLayout.pots) {
    const isSelected = p === selected;
    const g = svgEl(potGroup, "g", { class: `pot${isSelected ? " is-selected" : ""}`, "data-pot": p.pot.id });
    const rect = svgEl(g, "rect", { x: xp, y: p.y, width: potW, height: p.h, rx: 2, fill: entityFill(p.pot.entity), class: "pot-bar", "data-key": `p-${p.pot.id}` });
    if (p.pot.borrowed) {
      const h = p.pot.borrowed * potLayout.scale;
      svgEl(g, "rect", { x: xp, y: p.y, width: potW, height: h, class: "pot-borrowed" });
    }
    if (p.pot.transferOut) {
      const h = p.pot.transferOut.value * potLayout.scale;
      svgEl(g, "rect", { x: xp + 0.75, y: p.y + p.h - h + 0.75, width: potW - 1.5, height: Math.max(0, h - 1.5), class: "pot-transfer", stroke: entityFill(p.pot.entity) });
    }
    relate(p.pot.id, rect);
    interactive(
      g as unknown as SVGElement,
      lang,
      () => potTooltip(p.pot, model.inflow[p.pot.id] ?? 0, lang),
      () => options.onSelectPot(p.pot.id),
      (on) => highlight([p.pot.id, ...p.pot.recipients], on),
    );
  }
  // transfer connectors: federal grants to pension and health insurance
  const fed = potLayout.pots.find((p) => p.pot.id === "pot-fed");
  if (fed?.pot.transferOut) {
    const laneX = xp + potW + lane / 2 + 1;
    const startY = fed.y + fed.h - (fed.pot.transferOut.value * potLayout.scale) / 2;
    for (const target of fed.pot.transferOut.to) {
      const tp = potById.get(target.pot);
      if (!tp) {
        continue;
      }
      const endY = tp.y + Math.min(tp.h / 2, (target.value * potLayout.scale) / 2 + 2);
      svgEl(potGroup, "path", {
        d: `M${xp + potW},${startY}H${laneX}V${endY}H${xp + potW + 2}`,
        class: "transfer-line",
        stroke: "var(--e-fed)",
        "marker-end": "",
      });
    }
  }

  // pot labels: name (≤ 2 lines) + total and year, pushed apart where pots are small
  const lineH = 13.5;
  const potLabelWidth = panelX - potLabelX - 14;
  const potBlocks = potLayout.pots.map((p) => {
    const name = wrap(tr(p.pot.label, lang), potLabelWidth, 12, 600, 2);
    const yearTag = `${p.pot.year}${p.pot.status === "provisional" ? "p" : ""}`;
    const lines = [...name, `${bn(p.pot.total, lang)} · ${yearTag}`];
    const h = lines.length * lineH;
    return { p, lines, nameLines: name.length, h, y: p.y + p.h / 2 - h / 2 };
  });
  resolveColumn(potBlocks, top + 4, bottom, 12);
  for (const block of potBlocks) {
    const { p } = block;
    const g = svgEl(potLabelGroup, "g", { class: `pot-label${p === selected ? " is-selected" : ""}` });
    const centre = p.y + p.h / 2;
    const blockCentre = block.y + block.h / 2;
    if (Math.abs(blockCentre - centre) > p.h / 2 + 2) {
      svgEl(g, "path", { d: `M${xp + potW + lane + 2},${centre}L${potLabelX - 2},${blockCentre}`, class: "leader" });
    }
    multiline(g, block.lines, { x: potLabelX, y: block.y + 10, class: "pot-text" }, lineH, (i) => (i < block.nameLines ? "pot-name" : "num muted"));
    g.addEventListener("click", () => options.onSelectPot(p.pot.id));
    relate(p.pot.id, g);
  }

  // ---- composition panel of the selected pot
  renderComposition(svg, selected.pot, model.inflow[selected.pot.id] ?? 0, {
    x: panelX,
    width: W - panelX,
    top,
    bottom,
    lang,
    onOpen: () => options.onOpen({ kind: "pot", id: selected.pot.id }),
  });

  tween(container, svg, options.animate);
}

const STAR_HEALTH = {
  de: "* Mit dem durchschnittlichen Zusatzbeitrag (§ 242a SGB V); jede Kasse erhebt ihren eigenen.",
  en: "* With the average additional rate (§ 242a SGB V); each insurer charges its own.",
};

function potTooltip(pot: Pot, inflow: number, lang: Lang): TooltipContent {
  const lines = [
    `${tr(pot.basis, lang)}`,
    inflow > 0 ? `${eur(inflow, lang)} ${t("joins", lang)} ${bn(pot.total, lang)}` : "",
    pot.fenced ? t("fenced", lang) : t("generalBudget", lang),
  ].filter(Boolean);
  return { value: bn(pot.total, lang), title: tr(pot.label, lang), lines, status: pot.status, hint: true };
}

interface PanelOptions {
  x: number;
  width: number;
  top: number;
  bottom: number;
  lang: Lang;
  onOpen: () => void;
}

/** The selected pot's composition: a 100 % bar with direct labels, in % (exact); € only pro rata* on hover. */
export function renderComposition(svg: SVGSVGElement, pot: Pot, inflow: number, o: PanelOptions): void {
  const { lang } = o;
  const g = svgEl(svg, "g", { class: "composition" });
  svgEl(g, "text", { x: o.x, y: 14, class: "stage-label" }, `${t("ofEvery100", lang)} · ${tr(pot.label, lang)}`);
  const headerLines = wrap(`${bn(pot.compositionBase, lang)} ${tr(pot.compositionLabel, lang)}`, o.width - 8, 11.5, 400, 2);
  multiline(g, headerLines, { x: o.x, y: o.top + 10, class: "panel-sub" }, 13);
  const barTop = o.top + 14 + headerLines.length * 13;
  const footer = (pot.transferOut ? 30 : 0) + (pot.borrowed ? 30 : 0) + 18;
  const barBottom = o.bottom - footer;
  const barH = barBottom - barTop;
  const barW = 12;
  const gap = 2;
  const cats = pot.categories;
  const usable = barH - gap * (cats.length - 1);
  let y = barTop;
  const segs = cats.map((cat) => {
    const h = Math.max(1, (cat.value / pot.compositionBase) * usable);
    const seg = { cat, y, h };
    y += h + gap;
    return seg;
  });
  const labelX = o.x + barW + 10;
  const placed = spreadLabels(
    segs.map((s) => s.y + s.h / 2),
    30,
    barTop + 6,
    barBottom,
  );
  segs.forEach((s, index) => {
    const share = s.cat.value / pot.compositionBase;
    const segG = svgEl(g, "g", { class: "comp-seg" });
    svgEl(segG, "rect", { x: o.x, y: s.y, width: barW, height: s.h, rx: 1.5, fill: entityFill(pot.entity), class: "comp-bar" });
    const hatch = svgEl(segG, "rect", { x: o.x, y: s.y, width: barW, height: s.h, fill: "url(#hatch)", class: "comp-hatch" });
    hatch.setAttribute("opacity", "0");
    const ly = placed[index]!;
    if (Math.abs(ly - (s.y + s.h / 2)) > s.h / 2) {
      svgEl(segG, "path", { d: `M${o.x + barW + 1},${s.y + s.h / 2}L${labelX - 2},${ly - 4}`, class: "leader" });
    }
    const nameLines = wrap(`${tr(s.cat.label, lang)}${s.cat.star ? "*" : ""}`, o.width - barW - 72, 12, 400, 2);
    const ty = ly - 1 - (nameLines.length - 1) * 6.5;
    svgEl(segG, "text", { x: labelX, y: ty, class: "comp-pct num strong" }, pct(share, lang, 1));
    multiline(segG, nameLines, { x: labelX + 50, y: ty, class: "comp-name" }, 13);
    interactive(
      segG as unknown as SVGElement,
      lang,
      () => ({
        value: pct(share, lang, 1),
        title: tr(s.cat.label, lang),
        lines: [`${bn(s.cat.value, lang)} ${lang === "de" ? "von" : "of"} ${bn(pot.compositionBase, lang)}`],
        prorata: inflow > 0 ? `${t("proRata", lang)}: ${eur(inflow, lang)} × ${pct(share, lang, 1)} = ${eur(inflow * share, lang)}` : undefined,
        status: pot.status,
        body: inflow > 0 ? tr(PRO_RATA, lang) : undefined,
        hint: true,
      }),
      o.onOpen,
      (on) => hatch.setAttribute("opacity", on ? "1" : "0"),
    );
  });
  let fy = barBottom + 16;
  if (pot.transferOut) {
    const lines = wrap(`${tr(pot.transferOut.label, lang)}: ${bn(pot.transferOut.value, lang)}`, o.width - 20, 11.5, 400, 2);
    svgEl(g, "rect", { x: o.x + 0.75, y: fy - 9, width: barW - 1.5, height: 9, class: "pot-transfer", stroke: entityFill(pot.entity) });
    multiline(g, lines, { x: labelX, y: fy, class: "panel-note" }, 13);
    fy += 30;
  }
  if (pot.borrowed) {
    svgEl(g, "rect", { x: o.x, y: fy - 9, width: barW, height: 9, class: "pot-borrowed" });
    svgEl(g, "text", { x: labelX, y: fy, class: "panel-note" }, `${t("borrowed", lang)}: ${bn(pot.borrowed, lang)} (${lang === "de" ? "Nettokreditaufnahme" : "net borrowing"})`);
  }
  const more = svgEl(g, "text", { x: o.x, y: o.bottom - 2, class: "panel-more" }, lang === "de" ? "Details, Vergleich und Quellen ›" : "Details, comparison and sources ›");
  more.setAttribute("tabindex", "0");
  more.setAttribute("role", "button");
  more.addEventListener("click", o.onOpen);
  more.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      o.onOpen();
    }
  });
}

const PRO_RATA = {
  de: "* Anteilig: wenn Ihr Beitrag so verteilt wäre wie dieser Haushalt. Geld im Haushalt trägt keine Herkunft.",
  en: "* Pro rata: if your contribution were spread like this budget. Money in a budget carries no origin.",
};

// =============================================================================================
// Germany zoom
// =============================================================================================

export function renderGermany(container: HTMLElement, model: GermanyModel, options: HeroOptions): void {
  const { lang, unit } = options;
  const W = Math.max(720, container.clientWidth);
  const H = Math.max(420, container.clientHeight || 540);
  const top = 30;
  const bottom = H - 6;
  const plotH = bottom - top;
  const nodeW = 12;
  const x0 = W * 0.215;
  const x1 = W * 0.385;
  const xb = W * 0.545;
  const xr = W * 0.585;
  const xc = W * 0.75;
  const value = (eurValue: number, digits?: number): string =>
    unit === "day" ? `${eur(perResidentPerDay(eurValue), lang, 2)} ${t("perResidentDay", lang)}` : bn(eurValue, lang, digits ?? 1);
  const short = (eurValue: number): string => (unit === "day" ? eur(perResidentPerDay(eurValue), lang, 2) : bn(eurValue, lang, 1));

  container.replaceChildren();
  const svg = svgEl(container, "svg", { class: "hero-svg", width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "group", "aria-label": t("zoomGermany", lang) });
  defs(svg);

  // one € scale for both sides, so sizes compare; the right side (spending) is the tallest
  const scale = (plotH - 44) / model.spendingTotal;
  const flow = layoutFlow(model.flow, { stageX: [x0, x1], top: top + 20, height: plotH - 40, nodeWidth: nodeW, gap: 9, gapAfter: { "t-STEUERARTZ10": 22, "r-eu": 22 }, scale, minHeight: 2 });
  const nodeById = new Map(flow.nodes.map((node) => [node.id, node]));

  stageLabel(svg, x0 + nodeW, t("stageTaxes", lang), "end");
  stageLabel(svg, x1, t("stageRecipients", lang));
  stageLabel(svg, xr, t("stateRevenue", lang));
  stageLabel(svg, xc, t("stateSpending", lang));

  const ribbons = svgEl(svg, "g", { class: "ribbons" });
  const nodes = svgEl(svg, "g", { class: "nodes" });
  const labels = svgEl(svg, "g", { class: "labels" });
  for (const edge of flow.edges) {
    const path = ribbon(ribbons, `e-${edge.id}`, edge, `ribbon${edge.entity ? "" : " is-neutral"}`, entityFill(edge.entity));
    const from = nodeById.get(edge.from)!;
    const to = nodeById.get(edge.to)!;
    interactive(
      path,
      lang,
      () => ({ value: value(edge.value), title: `${tr(from.label, lang)} → ${tr(to.label, lang)}`, lines: edge.share !== undefined ? [pct(edge.share, lang, 1)] : undefined, status: edge.status, hint: true }),
      () => options.onOpen({ kind: "node", id: edge.from }),
    );
  }
  for (const node of flow.nodes) {
    const rect = nodeRect(nodes, node, `node node-${node.kind}`, entityFill(node.entity));
    interactive(
      rect,
      lang,
      () => ({
        value: value(node.value),
        title: `${tr(node.label, lang)}`,
        lines: node.stage === 0 && node.id.startsWith("t-") ? [`${pct(node.value / model.taxesTotal, lang, 1)} ${lang === "de" ? "aller Steuern (Kasse)" : "of all tax (cash)"}`] : undefined,
        status: node.status,
        body: node.mechanism ? tr(node.mechanism, lang) : node.id === "r-eu" ? t("euLeaves", lang) : node.star ? tr(STAR_PAYROLL, lang) : undefined,
        hint: true,
      }),
      () => options.onOpen({ kind: "node", id: node.id }),
    );
  }
  // labels: taxes to the left of their nodes (outside the ribbons), recipients to the right
  for (const stage of [0, 1]) {
    placeLabels(
      labels,
      flow.nodes
        .filter((node) => node.stage === stage)
        .map((node) => ({
          key: node.id,
          name: `${tr(node.label, lang)}${node.star ? "*" : ""}`,
          value: short(node.value),
          anchorX: stage === 0 ? node.x : node.x + node.w,
          nodeY: node.y,
          nodeH: node.h,
        })),
      {
        side: stage === 0 ? "left" : "right",
        maxWidth: stage === 0 ? x0 - 14 : xb - x1 - nodeW - 18,
        top: top + 8,
        bottom: bottom - 4,
        gap: 5,
        compactBelow: stage === 0 ? 30 : 24,
        maxLines: 2,
        backdrop: stage === 1,
      },
    );
  }

  boundary(svg, xb, top + 6, bottom, lang);
  // recipient streams to the boundary
  for (const node of flow.nodes.filter((n) => n.stage === 1)) {
    svgEl(svg, "path", { d: `M${node.x + node.w},${node.y}H${xb}V${node.y + node.h}H${node.x + node.w}Z`, class: "join-stream", fill: entityFill(node.entity) });
  }

  // revenue bridge and spending: same height (spending = revenue + borrowing)
  const right = svgEl(svg, "g", { class: "state" });
  const total = model.spendingTotal;
  const barH = total * scale;
  const yTop = top + 20;
  let y = yTop;
  const segGap = 2;
  const bridgeSegs = model.bridge.map((seg) => {
    const h = seg.value * scale - segGap;
    const item = { seg, y, h };
    y += seg.value * scale;
    return item;
  });
  // pooled band
  svgEl(right, "path", { d: `M${xr + nodeW},${yTop}L${xc},${yTop}L${xc},${yTop + barH}L${xr + nodeW},${yTop + barH}Z`, class: "pooled" });
  svgEl(right, "text", { x: (xr + nodeW + xc) / 2, y: yTop - 6, class: "pooled-label", "text-anchor": "middle" }, t("pooled", lang));
  for (const b of bridgeSegs) {
    const r = svgEl(right, "rect", { x: xr, y: b.y, width: nodeW, height: Math.max(1, b.h), rx: 1.5, class: `bridge bridge-${b.seg.id}` });
    const labelLines =
      b.seg.id === "borrowed"
        ? [tr(b.seg.label, lang), short(b.seg.value)]
        : [tr(b.seg.label, lang), `${pct(b.seg.share ?? 0, lang, 1)} ${lang === "de" ? "der Einnahmen" : "of revenue"}`];
    multiline(right, labelLines, { x: xr + nodeW + 8, y: b.y + Math.min(b.h / 2, 30) - 4, class: "node-label" }, 14, (i) => (i === 1 ? "num strong" : undefined));
    interactive(
      r,
      lang,
      () => ({
        value: b.seg.share !== undefined ? pct(b.seg.share, lang, 1) : short(b.seg.value),
        title: tr(b.seg.label, lang),
        lines: [`${value(b.seg.value)} (${t("esaNote", lang)})`],
        status: "official",
        body: b.seg.id === "taxes" ? tr(ESA_CASH, lang) : undefined,
        hint: true,
      }),
      () => options.onOpen({ kind: "bridge", id: b.seg.id }),
    );
  }

  // COFOG spending: neutral (functions are not recipients), direct labels, % and €
  let cy = yTop;
  const cofogSegs = model.cofog.map((fn) => {
    const h = fn.value * scale - segGap;
    const item = { fn, y: cy, h };
    cy += fn.value * scale;
    return item;
  });
  const placed = spreadLabels(
    cofogSegs.map((s) => s.y + s.h / 2),
    16,
    yTop,
    yTop + barH,
  );
  cofogSegs.forEach((s, index) => {
    const g = svgEl(right, "g", { class: "cofog-seg" });
    svgEl(g, "rect", { x: xc, y: s.y, width: nodeW, height: Math.max(1, s.h), rx: 1.5, class: "cofog-bar" });
    const ly = placed[index]!;
    if (Math.abs(ly - (s.y + s.h / 2)) > s.h / 2) {
      svgEl(g, "path", { d: `M${xc + nodeW + 1},${s.y + s.h / 2}L${xc + nodeW + 7},${ly - 4}`, class: "leader" });
    }
    const share = s.fn.value / total;
    svgEl(g, "text", { x: xc + nodeW + 10, y: ly, class: "num strong comp-pct" }, unit === "day" ? eur(perResidentPerDay(s.fn.value), lang, 2) : pct(share, lang, 1));
    svgEl(g, "text", { x: xc + nodeW + 66, y: ly, class: "comp-name" }, wrap(tr(s.fn.label, lang), W - xc - nodeW - 70, 12, 400, 1)[0] ?? "");
    interactive(
      g as unknown as SVGElement,
      lang,
      () => ({
        value: pct(share, lang, 1),
        title: tr(s.fn.label, lang),
        lines: [bn(s.fn.value, lang), `${eur(perResidentPerDay(s.fn.value), lang, 2)} ${t("perResidentDay", lang)}`],
        status: "provisional",
        hint: true,
      }),
      () => options.onOpen({ kind: "cofog", code: s.fn.code }),
    );
  });
  svgEl(right, "text", { x: xc, y: yTop + barH + 18, class: "panel-note" }, `${t("spendingTotal", lang)} ${bn(total, lang)} = ${eur(perResidentPerDay(total), lang, 2)} ${t("perResidentDay", lang)}`);
  tween(container, svg, options.animate);
}

const STAR_PAYROLL = {
  de: "* Beiträge versicherungspflichtig Beschäftigter (Arbeitnehmer- und Arbeitgeberanteil), Näherung. Ohne Beiträge von Rentnern, Selbständigen und öffentlichen Stellen.",
  en: "* Contributions of compulsorily insured employees (employee and employer share), a proxy. Without contributions of pensioners, the self-employed and public bodies.",
};
const ESA_CASH = {
  de: "Volkswirtschaftliche Abgrenzung (periodengerecht). Die kassenmäßigen Steuereinnahmen links sind eine andere Abgrenzung; nie addieren.",
  en: "National-accounts basis (accrual). The cash tax receipts on the left are a different basis; never add the two.",
};

export const formatShortNumber = (value: number, lang: Lang): string => num(value, lang);
