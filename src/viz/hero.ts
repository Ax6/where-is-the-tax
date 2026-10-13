/**
 * The master flow (desktop): GROSS WAGE → TAXES & CONTRIBUTIONS → WHO RECEIVES IT ‖ TOTAL BUDGET IT GOES INTO → OF EVERY €100,
 * and the Germany zoom: NAMED TAXES & CONTRIBUTIONS → RECIPIENTS ‖ THE CONSOLIDATED STATE.
 */
import {
  cofogRows,
  perResidentPerDay,
  purchases,
  type EntityId,
  type GermanyModel,
  type Pot,
  type YouModel,
} from "../data/model.ts";
import { bi, bn, eur, num, pct, t, tr, yearTag, type Lang } from "../i18n.ts";
import { layoutFlow, layoutPots, lerp, resolveColumn, ribbonPath, spreadLabels, type FlowLayout, type LayoutNode } from "./flow-layout.ts";
import { multiline, svgEl, textWidth, wrap } from "./svg.ts";
import { hideTooltip, showTooltip, tooltipText, type TooltipContent } from "./tooltip.ts";

export type PanelId = "shopping" | "ranking";

export type DrawerTarget =
  | { kind: "node"; id: string }
  | { kind: "pot"; id: string }
  | { kind: "cofog"; code: string }
  | { kind: "bridge"; id: string }
  | { kind: "purchase"; id: string }
  | { kind: "panel"; id: PanelId };

export interface HeroOptions {
  lang: Lang;
  /** the page's selected year: tags show only where a figure's year differs */
  year: number;
  unit: "bn" | "day";
  animate: boolean;
  /** recipient highlighted from the legend */
  highlight: EntityId | null;
  /** the budget whose composition the right-hand column shows */
  selectedPot: string;
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
  options: { pointerOnly?: boolean; visible?: string } = {},
): void {
  if (options.pointerOnly) {
    // duplicates what the focusable nodes say: hover detail for the mouse, hidden from assistive tech and
    // out of the tab order (Chromium otherwise tabs to SVG shapes with listeners)
    el.setAttribute("aria-hidden", "true");
    el.setAttribute("tabindex", "-1");
  } else {
    el.setAttribute("tabindex", "0");
    el.setAttribute("role", "button");
    // the accessible name starts with the visible text (WCAG 2.5.3)
    el.setAttribute("aria-label", [options.visible, tooltipText(content(), lang)].filter(Boolean).join(". "));
  }
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

/**
 * Patterns: the pro-rata hatch (single 45° line) and one texture per recipient, used in the opt-in pattern
 * mode and under forced colours (styles.css), so identity never relies on colour alone.
 */
const TEXTURES: Record<EntityId, { size: number; transform?: string; draw: (p: SVGPatternElement, size: number) => void }> = {
  fed: { size: 5, transform: "rotate(-45)", draw: (p, n) => void svgEl(p, "line", { x1: 0, y1: 0, x2: 0, y2: n, class: "tex-ink", "stroke-width": 1.4 }) },
  land: { size: 5, draw: (p, n) => void svgEl(p, "line", { x1: 0.7, y1: 0, x2: 0.7, y2: n, class: "tex-ink", "stroke-width": 1.4 }) },
  muni: { size: 6, draw: (p, n) => void svgEl(p, "path", { d: `M0,0L${n},${n}M${n},0L0,${n}`, class: "tex-ink", "stroke-width": 1 }) },
  eu: { size: 5, draw: (p) => void svgEl(p, "circle", { cx: 2.5, cy: 2.5, r: 1.1, class: "tex-ink", "stroke-width": 0 }) },
  pension: { size: 5, draw: (p, n) => void svgEl(p, "line", { x1: 0, y1: 0.7, x2: n, y2: 0.7, class: "tex-ink", "stroke-width": 1.4 }) },
  health: { size: 5, draw: (p, n) => void svgEl(p, "path", { d: `M0,0.5H${n}M0.5,0V${n}`, class: "tex-ink", "stroke-width": 1 }) },
  care: { size: 8, draw: (p) => void svgEl(p, "circle", { cx: 4, cy: 4, r: 1.9, class: "tex-ink", "stroke-width": 0 }) },
  unemp: {
    size: 6,
    draw: (p) => {
      svgEl(p, "rect", { x: 0, y: 0, width: 3, height: 3, class: "tex-ink", "stroke-width": 0 });
      svgEl(p, "rect", { x: 3, y: 3, width: 3, height: 3, class: "tex-ink", "stroke-width": 0 });
    },
  },
};

function defs(svg: SVGSVGElement): void {
  const d = svgEl(svg, "defs");
  const hatch = svgEl(d, "pattern", { id: "hatch", patternUnits: "userSpaceOnUse", width: 6, height: 6, patternTransform: "rotate(45)" });
  svgEl(hatch, "rect", { width: 6, height: 6, class: "hatch-bg" });
  svgEl(hatch, "line", { x1: 0, y1: 0, x2: 0, y2: 6, class: "hatch-line" });
  for (const [entity, texture] of Object.entries(TEXTURES) as [EntityId, (typeof TEXTURES)[EntityId]][]) {
    const pattern = svgEl(d, "pattern", { id: `tex-${entity}`, patternUnits: "userSpaceOnUse", width: texture.size, height: texture.size, patternTransform: texture.transform });
    svgEl(pattern, "rect", { width: texture.size, height: texture.size, class: "tex-bg", fill: `var(--e-${entity})` });
    texture.draw(pattern, texture.size);
  }
}

/** Marks filled with a recipient hue carry data-entity, so CSS can swap the fill for its texture. */
function tagEntities(svg: SVGSVGElement): void {
  for (const el of svg.querySelectorAll<SVGElement>("[fill^='var(--e-']")) {
    const match = /var\(--e-(\w+)\)/.exec(el.getAttribute("fill") ?? "");
    if (match && !el.closest("pattern")) {
      el.dataset.entity = match[1]!;
    }
  }
}

/** Column heading (mono 11 px); wraps to two lines above the plot when it does not fit `maxWidth`. */
function stageLabel(svg: SVGSVGElement, x: number, text: string, anchor: "start" | "end" | "middle" = "start", maxWidth = Infinity): void {
  const charW = 6.7;
  if (text.length * charW <= maxWidth) {
    svgEl(svg, "text", { x, y: 14, class: "stage-label", "text-anchor": anchor }, text);
    return;
  }
  // a slightly smaller single line reads better than a wrapped header that crowds the chart
  const size = (11 * maxWidth) / (text.length * charW);
  if (size >= 9.5) {
    svgEl(svg, "text", { x, y: 14, class: "stage-label", "text-anchor": anchor, style: `font-size:${size.toFixed(2)}px` }, text);
    return;
  }
  const words = text.split(" ");
  let first = "";
  while (words.length && `${first} ${words[0]}`.trim().length * charW <= maxWidth) {
    first = `${first} ${words.shift()}`.trim();
  }
  multiline(svg, [first, words.join(" ")], { x, y: 8, class: "stage-label", "text-anchor": anchor }, 12);
}

function boundary(svg: SVGSVGElement, x: number, top: number, bottom: number, lang: Lang, key: "boundary" | "boundaryGermany" = "boundary", onOpen?: () => void): void {
  const g = svgEl(svg, "g", { class: "boundary" });
  svgEl(g, "line", { x1: x, x2: x, y1: top - 6, y2: bottom, class: "boundary-line" });
  // just right of the dotted line, clear of the recipient labels that end at the line
  const label = svgEl(g, "text", { x: x + 12, y: top, class: "boundary-label", transform: `rotate(-90 ${x + 12} ${top})`, "text-anchor": "end" }, t(key, lang));
  if (onOpen) {
    // the Germany label explains what joins the pot on hover; Enter or click opens the "other revenue" drawer
    interactive(label, lang, () => ({ title: t("onePotTitle", lang), body: t("onePot", lang), hint: true }), onOpen, undefined, { visible: t(key, lang) });
  }
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
  /** extra height kept free under the block (for a line drawn by the caller) */
  reserve?: number;
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
interface PlacedLabel {
  g: SVGGElement;
  /** text x and the block's top / height (without the reserve) */
  x: number;
  y: number;
  h: number;
}

function placeLabels(parent: Element, specs: LabelSpec[], o: LabelOptions): Map<string, PlacedLabel> {
  const lineH = 13.5;
  const blocks = specs.map((spec) => {
    const valueText = spec.value.replace("\n", " ");
    const valueWidth = textWidth(valueText, 12, 650);
    // a value too wide for the column breaks at its "\n" (the exact euros, then the ≈ estimate)
    const valueLines = valueWidth <= o.maxWidth ? [valueText] : spec.value.split("\n").flatMap((part) => wrap(part, o.maxWidth, 12, 650, 2));
    // one line for small nodes when it fits; tiny nodes always get one line (ellipsised if needed)
    const fits = textWidth(spec.name, 12, 500) + 6 + valueWidth <= o.maxWidth;
    const compact = spec.nodeH < o.compactBelow && (fits || spec.nodeH < 6);
    const lines = compact ? [wrap(spec.name, o.maxWidth - valueWidth - 6, 12, 500, 1)[0] ?? ""] : wrap(spec.name, o.maxWidth, 12, 500, o.maxLines ?? 2);
    const h = (compact ? lineH : (lines.length + valueLines.length) * lineH) + (spec.reserve ?? 0);
    return { spec, compact, lines, valueText, valueLines, h, y: spec.nodeY + spec.nodeH / 2 - h / 2, width: Math.max(...valueLines.map((line) => textWidth(line, 12, 650)), ...lines.map((line) => textWidth(line, 12, 500))) + (compact ? valueWidth + 6 : 0) };
  });
  resolveColumn(blocks, o.top, o.bottom, o.gap);
  const out = new Map<string, PlacedLabel>();
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
        height: block.h - (spec.reserve ?? 0) + 2,
        rx: 2,
        class: "label-backdrop",
      });
    }
    const anchor = o.side === "right" ? undefined : "end";
    if (block.compact) {
      const text = svgEl(g, "text", { x, y: block.y + 10.5, class: "node-label", "text-anchor": anchor });
      svgEl(text, "tspan", {}, `${block.lines[0]} `);
      svgEl(text, "tspan", { class: "num strong" }, block.valueText);
    } else {
      multiline(g, [...block.lines, ...block.valueLines], { x, y: block.y + 10.5, class: "node-label", "text-anchor": anchor }, lineH, (i) => (i >= block.lines.length ? "num strong" : undefined));
    }
    out.set(spec.key, { g, x, y: block.y, h: block.h - (spec.reserve ?? 0) });
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
  const leftLabel = Math.min(124, W * 0.1);
  const x0 = leftLabel;
  const x1 = W * 0.215;
  const x2 = W * 0.37;
  const xb = W * 0.525;
  const xp = W * 0.55;
  const potW = 14;
  const lane = 10;
  const potLabelX = xp + potW + lane + 6;
  const panelX = Math.max(W * 0.72, W - 340);
  const nodeW = 12;

  container.replaceChildren();
  const svg = svgEl(container, "svg", {
    class: "hero-svg",
    width: W,
    height: H,
    viewBox: `0 0 ${W} ${H}`,
    role: "group",
    "aria-label": `${t("stageGross", lang)} → ${t("stageDeductions", lang)} → ${t("stageRecipients", lang)} → ${t("stagePots", lang)}`,
  });
  if (options.highlight) {
    svg.dataset.highlight = options.highlight;
  }
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

  stageLabel(svg, 0, t("stageGross", lang), "start", x1 - 8);
  stageLabel(svg, x1, t("stageDeductions", lang), "start", x2 - x1 - 8);
  stageLabel(svg, x2, t("stageRecipients", lang), "start", xb - x2 - 10);
  stageLabel(svg, xp, t("stagePots", lang), "start", panelX - xp - 14);

  const ribbons = svgEl(svg, "g", { class: "ribbons" });
  const joins = svgEl(svg, "g", { class: "joins" });
  const nodes = svgEl(svg, "g", { class: "nodes" });
  const labels = svgEl(svg, "g", { class: "labels", "aria-hidden": "true" });

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
    const cls = `ribbon${edge.ghost ? " is-ghost" : ""}${edge.estimate ? " is-estimate" : ""}${edge.entity ? "" : " is-neutral"}${edge.to === "net" ? " is-yours" : ""}`;
    const path = ribbon(ribbons, `e-${edge.id}`, edge, cls, entityFill(edge.entity));
    relate(edge.from, path);
    relate(edge.to, path);
    relate(`edge:${edge.id}`, path);
    const from = nodeById.get(edge.from)!;
    const to = nodeById.get(edge.to)!;
    interactive(
      path,
      lang,
      () =>
        edge.estimate && model.estimate
          ? {
              value: `≈ ${eur(edge.value, lang)}*`,
              title: `${t("estimateLabel", lang)} → ${tr(to.label, lang)}`,
              lines: [tr(model.estimate.label, lang)],
              status: "estimate" as const,
              body: tr(ESTIMATE_NOTE, lang),
              hint: true,
            }
          : {
              value: eur(edge.value, lang),
              title: `${tr(from.label, lang)} → ${tr(to.label, lang)}`,
              lines: edge.share !== undefined && edge.share < 1 ? [`${pct(edge.share, lang, 1)} ${t("legalShares", lang).toLowerCase()}`] : undefined,
              status: edge.status,
              hint: true,
            },
      () => options.onOpen({ kind: "node", id: edge.estimate ? "estimate" : edge.from === "gross" || edge.from === "employer" ? edge.to : edge.from }),
      (on) => highlight([`edge:${edge.id}`, edge.from, edge.to], on),
      { pointerOnly: true },
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
    // ≈* band: the part of a recipient's euros that comes from the household estimate
    for (const edge of flow.edges.filter((e) => e.estimate && e.to === node.id)) {
      const band = svgEl(nodes, "rect", { x: node.x + 0.75, y: edge.y1 + 0.75, width: node.w - 1.5, height: Math.max(0, edge.t - 1.5), class: "node-estimate", stroke: entityFill(node.entity) });
      relate(node.id, band);
    }
    const exact = node.value - (node.estimate ?? 0);
    interactive(
      rect,
      lang,
      () => ({
        value: eur(exact, lang, exact < 100 ? 2 : 0),
        title: `${tr(node.label, lang)}${node.star ? "" : ""}`,
        lines: [
          ...(node.stage === 1 && node.id !== "net" ? [`${pct(node.value / model.gross, lang, 1)} ${lang === "de" ? "des Bruttolohns" : "of the gross wage"}`] : []),
          ...(node.estimate ? [`+ ≈ ${eur(node.estimate, lang)}* ${lang === "de" ? "aus Ihren Einkäufen (Schätzung)" : "from your purchases (estimate)"}`] : []),
          ...(node.id === "net" && model.estimate ? [`≈ ${eur(model.estimate.total, lang)}* ${lang === "de" ? "davon als Steuer beim Einkaufen (Schätzung)" : "of it back as tax when spent (estimate)"}`] : []),
        ],
        status: node.status,
        body: node.mechanism ? tr(node.mechanism, lang) : node.star ? tr(STAR_HEALTH, lang) : undefined,
        hint: true,
      }),
      () => options.onOpen({ kind: "node", id: node.id }),
      (on) => highlight([node.id], on),
    );
  }

  // ---- node labels: minimum spacing, one line for small nodes, leader lines where a label had to move
  const estimateEdges = flow.edges.filter((edge) => edge.estimate);
  for (const stage of [0, 1, 2]) {
    const column = flow.nodes.filter((node) => node.stage === stage && node.h > 0);
    const specs: LabelSpec[] = column.map((node) => {
      const exact = node.value - (node.estimate ?? 0);
      const exactText = eur(exact, lang, exact < 100 ? 2 : 0);
      return {
        key: node.id,
        name: `${tr(node.label, lang)}${node.star ? "*" : ""}`,
        // never one total: the exact payslip euros, then the ≈ estimate
        value: node.estimate ? `${exactText}\n+ ≈${eur(node.estimate, lang)} ${lang === "de" ? "aus\u00a0Einkäufen" : "from\u00a0shopping"}*` : exactText,
        anchorX: stage === 0 ? node.x : node.x + node.w,
        nodeY: node.y,
        nodeH: stage === 0 ? Math.min(node.h, 80) : node.h,
      };
    });
    const hookLines = hookLinesFor(options.year, lang, x2 - x1 - 22);
    if (stage === 1 && model.estimate && estimateEdges.length) {
      // the ≈ input sits beside the exact payslip, where its ribbons leave net pay
      const net = column.find((node) => node.id === "net")!;
      const top0 = Math.min(...estimateEdges.map((edge) => edge.y0));
      const bottom0 = Math.max(...estimateEdges.map((edge) => edge.y0 + edge.t));
      specs.unshift({
        key: "estimate",
        name: t("estimateLabel", lang),
        // the survey year shows when it differs from the selected year
        value: `≈ ${eur(model.estimate.total, lang)} ${lang === "de" ? "im Jahr" : "a year"}${model.estimate.year !== options.year ? ` · ${model.estimate.year}` : ""}`,
        anchorX: net.x + net.w,
        nodeY: top0,
        nodeH: bottom0 - top0,
        reserve: 14 * hookLines.length,
      });
    }
    const placed = placeLabels(
      labels,
      specs,
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
    for (const [id, label] of placed) {
      relate(id, label.g);
    }
    const hook = placed.get("estimate");
    if (hook) {
      // muted second line: two everyday purchases, opening the Shopping panel
      const text = shoppingHook(options.year, lang);
      const hookG = svgEl(nodes, "g", { class: "hook" });
      svgEl(hookG, "rect", { x: hook.x - 3, y: hook.y + hook.h, width: Math.max(...hookLines.map((line) => textWidth(line, 11.5, 400))) + 6, height: 14 * hookLines.length, rx: 2, class: "label-backdrop" });
      const el = multiline(hookG, hookLines, { x: hook.x, y: hook.y + hook.h + 11, class: "label-hook" }, 13.5);
      interactive(
        el,
        lang,
        () => ({ title: t("shoppingTitle", lang), lines: [t("purchasesHeading", lang)], status: "law" as const, hint: true }),
        () => options.onOpen({ kind: "panel", id: "shopping" }),
        undefined,
        { visible: text.replace(/ ›$/, "") },
      );
    }
  }

  // ---- pots
  const potGroup = svgEl(svg, "g", { class: "pots" });
  const potLabelGroup = svgEl(svg, "g", { class: "pot-labels", "aria-hidden": "true" });
  const selected = potLayout.pots.find((p) => p.pot.id === options.selectedPot) ?? potLayout.pots[0]!;
  for (const p of potLayout.pots) {
    const g = svgEl(potGroup, "g", { class: `pot${p === selected ? " is-selected" : ""}`, "data-pot": p.pot.id });
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
      { visible: potText(p.pot, lang) },
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

  // pot labels: "Name · €bn" (wrapped to ≤ 2 lines), then a muted tag only when the year differs or is provisional
  const lineH = 13.5;
  const potLabelWidth = panelX - potLabelX - 18;
  const potBlocks = potLayout.pots.map((p) => {
    const lines = potLines(p.pot, potLabelWidth, lang);
    const tag = yearTag(p.pot.year, p.pot.status, options.year, lang);
    const h = (lines.length + (tag ? 1 : 0)) * lineH - (tag ? 1.5 : 0);
    return { p, lines, tag, h, y: p.y + p.h / 2 - h / 2 };
  });
  resolveColumn(potBlocks, top + 4, bottom, 10);
  for (const block of potBlocks) {
    const { p } = block;
    const g = svgEl(potLabelGroup, "g", { class: `pot-label${p === selected ? " is-selected" : ""}` });
    const centre = p.y + p.h / 2;
    const blockCentre = block.y + block.h / 2;
    if (Math.abs(blockCentre - centre) > p.h / 2 + 2) {
      svgEl(g, "path", { d: `M${xp + potW + lane + 2},${centre}L${potLabelX - 2},${blockCentre}`, class: "leader" });
    }
    multiline(g, block.lines, { x: potLabelX, y: block.y + 10, class: "pot-text pot-name" }, lineH);
    if (block.tag) {
      svgEl(g, "text", { x: potLabelX, y: block.y + 10 + block.lines.length * lineH - 1.5, class: "tag-text" }, block.tag);
    }
    g.addEventListener("click", () => options.onSelectPot(p.pot.id));
    relate(p.pot.id, g);
  }

  // ---- composition of the selected budget, with your euros pro rata* per row
  renderComposition(svg, selected.pot, model.inflow[selected.pot.id] ?? 0, {
    x: panelX,
    width: W - panelX,
    top,
    bottom,
    lang,
    onOpen: () => options.onOpen({ kind: "pot", id: selected.pot.id }),
  });

  tagEntities(svg);
  tween(container, svg, options.animate);
}

const ESTIMATE_NOTE = {
  de: "Schätzung*: Umsatz- und Verbrauchsteuern eines Haushalts dieser Nettoeinkommensklasse (Destatis LWR 2024 × Steuersätze). Nicht Teil des exakten Lohnzettels; Klasse aus Ihrem Netto ÷ 12 (ein Verdiener)*.",
  en: "Estimate*: VAT and excise of a household in this net-income class (Destatis LWR 2024 × tax rates). Not part of the exact payslip; class from your net ÷ 12 (one earner)*.",
};

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

/** Pot label lines: "Federal budget · €465.7bn" on one line when it fits, else name (≤ 2 lines) and amount. */
function potLines(pot: Pot, width: number, lang: Lang): string[] {
  const full = potText(pot, lang);
  if (textWidth(full, 12, 600) <= width) {
    return [full];
  }
  const name = wrap(tr(pot.label, lang), width, 12, 600, 2);
  const last = `${name[name.length - 1]} · ${bn(pot.total, lang)}`;
  if (textWidth(last, 12, 600) <= width) {
    return [...name.slice(0, -1), last];
  }
  // the amount on its own line: no dangling separator
  return [...name, bn(pot.total, lang)];
}

const potText = (pot: Pot, lang: Lang): string => `${tr(pot.label, lang)} · ${bn(pot.total, lang)}`;

/** "e.g. petrol 53 % · cigarettes 63 % ›", from the purchase data. */
const HOOK_ITEMS = [
  { id: "petrol_litre", label: bi("Benzin", "petrol") },
  { id: "cigarettes_pack", label: bi("Zigaretten", "cigarettes") },
];
export function shoppingHook(year: number, lang: Lang): string {
  return hookParts(year, lang).join(" ");
}

/** The hook as breakable parts: "e.g. petrol 53 % ·" | "cigarettes 63 % ›". */
function hookParts(year: number, lang: Lang): string[] {
  const items = purchases(year);
  const parts = HOOK_ITEMS.map((hook) => {
    const item = items.find((candidate) => candidate.id === hook.id);
    return item ? `${tr(hook.label, lang)} ${pct(item.taxShare, lang, 0)}` : "";
  }).filter(Boolean);
  return parts.map((part, index) => `${index === 0 ? `${lang === "de" ? "z. B." : "e.g."} ` : ""}${part}${index < parts.length - 1 ? " ·" : " ›"}`);
}

function hookLinesFor(year: number, lang: Lang, width: number): string[] {
  const full = shoppingHook(year, lang);
  return textWidth(full, 11.5, 400) <= width ? [full] : hookParts(year, lang);
}

interface PanelOptions {
  x: number;
  width: number;
  top: number;
  bottom: number;
  lang: Lang;
  onOpen: () => void;
}

/** "≈ €950" for a pro rata* share of your euros; "< €1" below one euro. */
const yoursText = (value: number, lang: Lang): string => (value < 1 ? `< ${eur(1, lang)}` : `≈ ${eur(value, lang)}`);

/**
 * The selected budget's composition: a 100 % bar with direct labels in % (exact), and on each row your euros
 * pro rata* (your euros into this budget × the row's share). Clicking a budget switches the column.
 */
export function renderComposition(svg: SVGSVGElement, pot: Pot, inflow: number, o: PanelOptions): void {
  const { lang } = o;
  const g = svgEl(svg, "g", { class: "composition" });
  svgEl(g, "text", { x: o.x, y: 14, class: "stage-label" }, `${t("ofEvery100", lang)} · ${tr(pot.label, lang)}`);
  const headerLines = wrap(`${bn(pot.compositionBase, lang)} ${tr(pot.compositionLabel, lang)}`, o.width - 8, 11.5, 400, 2);
  multiline(g, headerLines, { x: o.x, y: o.top + 10, class: "panel-sub" }, 13);
  const yours = inflow > 0;
  const yoursW = yours ? 62 : 0;
  if (yours) {
    svgEl(g, "text", { x: o.x + o.width - 4, y: o.top + 14 + headerLines.length * 13 + 6, class: "panel-sub", "text-anchor": "end" }, t("yoursColumn", lang));
  }
  const barTop = o.top + 14 + headerLines.length * 13 + (yours ? 14 : 0);
  const noteLines = yours ? wrap(`* ${t("proRataIfYour", lang).replace("{eur}", eur(inflow, lang)).replace("{pot}", tr(pot.label, lang))}`, o.width - 8, 11, 400, 2) : [];
  const footer = (pot.transferOut ? 30 : 0) + (pot.borrowed ? 30 : 0) + noteLines.length * 13 + (yours ? 6 : 0) + 18;
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
  // long category names get a third line when every row still fits; otherwise two lines with "…"
  const nameWidth = o.width - barW - 72 - yoursW;
  const nameOf = (cat: (typeof cats)[number], lines: number) => wrap(`${tr(cat.label, lang)}${cat.star ? "*" : ""}`, nameWidth, 12, 400, lines);
  let names = cats.map((cat) => nameOf(cat, 3));
  let rowGap = names.some((lines) => lines.length > 2) ? 43 : 30;
  if (cats.length * rowGap > barBottom - barTop - 6) {
    names = cats.map((cat) => nameOf(cat, 2));
    rowGap = 30;
  }
  const placed = spreadLabels(
    segs.map((s) => s.y + s.h / 2),
    rowGap,
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
    const nameLines = names[index]!;
    const ty = ly - 1 - (nameLines.length - 1) * 6.5;
    svgEl(segG, "text", { x: labelX, y: ty, class: "comp-pct num strong" }, pct(share, lang, 1));
    multiline(segG, nameLines, { x: labelX + 50, y: ty, class: "comp-name" }, 13);
    const mine = inflow * share;
    if (yours) {
      svgEl(segG, "text", { x: o.x + o.width - 4, y: ty, class: "comp-yours num", "text-anchor": "end" }, `${yoursText(mine, lang)}*`);
    }
    interactive(
      segG as unknown as SVGElement,
      lang,
      () => ({
        value: pct(share, lang, 1),
        title: tr(s.cat.label, lang),
        lines: [`${bn(s.cat.value, lang)} ${lang === "de" ? "von" : "of"} ${bn(pot.compositionBase, lang)}`],
        prorata: yours ? `${t("proRata", lang)}: ${eur(inflow, lang)} × ${pct(share, lang, 1)} = ${eur(mine, lang)}` : undefined,
        status: pot.status,
        body: yours ? t("proRataNote", lang).replace("{pot}", tr(pot.label, lang)) : undefined,
        hint: true,
      }),
      o.onOpen,
      (on) => hatch.setAttribute("opacity", on ? "1" : "0"),
      { visible: `${pct(share, lang, 1)} ${nameLines.join(" ")}${yours ? ` ${yoursText(mine, lang)}*` : ""}` },
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
    fy += 30;
  }
  if (noteLines.length) {
    multiline(g, noteLines, { x: o.x, y: fy - 6, class: "panel-note" }, 13);
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
  // left side: cash receipts of the selected year; right side: the consolidated state of its latest year
  const Y = model.year;
  const SY = model.stateYear;
  const value = (eurValue: number, digits?: number, year = Y): string =>
    unit === "day" ? `${eur(perResidentPerDay(eurValue, year), lang, 2)} ${t("perResidentDay", lang)}` : bn(eurValue, lang, digits ?? 1);
  const short = (eurValue: number, year = Y): string => (unit === "day" ? eur(perResidentPerDay(eurValue, year), lang, 2) : bn(eurValue, lang, 1));
  const revenueTag = yearTag(SY, "final", options.year, lang);
  const spendingTag = yearTag(SY, cofogRows.find((row) => row.sector === "S13" && row.code === "TOTAL")?.status[String(SY)] ?? "final", options.year, lang);

  container.replaceChildren();
  const svg = svgEl(container, "svg", { class: "hero-svg", width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "group", "aria-label": t("zoomGermany", lang) });
  if (options.highlight) {
    svg.dataset.highlight = options.highlight;
  }
  defs(svg);

  // one € scale for both sides, so sizes compare; the right side (spending) is the tallest
  const scale = (plotH - 44) / model.spendingTotal;
  const flow = layoutFlow(model.flow, { stageX: [x0, x1], top: top + 20, height: plotH - 40, nodeWidth: nodeW, gap: 9, gapAfter: { "t-STEUERARTZ10": 22, "r-eu": 22 }, scale, minHeight: 2 });
  const nodeById = new Map(flow.nodes.map((node) => [node.id, node]));

  stageLabel(svg, x1, t("stageRecipients", lang));
  stageLabel(svg, x0 + nodeW, `${t("stageTaxes", lang)} ${Y}`, "end");
  stageLabel(svg, xr, `${t("stateRevenue", lang)}${revenueTag ? ` · ${revenueTag}` : ""}`, "start", xc - xr - 12);
  stageLabel(svg, xc, `${t("stateSpending", lang)}${spendingTag ? ` · ${spendingTag}` : ""}`, "start", W - xc);

  const ribbons = svgEl(svg, "g", { class: "ribbons" });
  const nodes = svgEl(svg, "g", { class: "nodes" });
  const labels = svgEl(svg, "g", { class: "labels", "aria-hidden": "true" });
  for (const edge of flow.edges) {
    const path = ribbon(ribbons, `e-${edge.id}`, edge, `ribbon${edge.entity ? "" : " is-neutral"}`, entityFill(edge.entity));
    const from = nodeById.get(edge.from)!;
    const to = nodeById.get(edge.to)!;
    interactive(
      path,
      lang,
      () => ({ value: value(edge.value), title: `${tr(from.label, lang)} → ${tr(to.label, lang)}`, lines: edge.share !== undefined ? [pct(edge.share, lang, 1)] : undefined, status: edge.status, hint: true }),
      () => options.onOpen({ kind: "node", id: edge.from }),
      undefined,
      { pointerOnly: true },
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
        lines: node.stage === 0 && node.id.startsWith("t-") ? [`${pct(node.value / model.taxesTotal, lang, 1)} ${lang === "de" ? `aller eingenommenen Steuern ${Y}` : `of all taxes collected ${Y}`}`] : undefined,
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

  boundary(svg, xb, top + 6, bottom, lang, "boundaryGermany", () => options.onOpen({ kind: "bridge", id: "other" }));
  // recipient streams to the boundary
  for (const node of flow.nodes.filter((n) => n.stage === 1)) {
    // streams go under the labels (ribbon layer), so text stays on top
    svgEl(ribbons, "path", { d: `M${node.x + node.w},${node.y}H${xb}V${node.y + node.h}H${node.x + node.w}Z`, class: "join-stream", fill: entityFill(node.entity) });
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
        ? [tr(b.seg.label, lang), short(b.seg.value, SY)]
        : [tr(b.seg.label, lang), `${pct(b.seg.share ?? 0, lang, 1)} ${lang === "de" ? "der Einnahmen" : "of revenue"}`];
    multiline(right, labelLines, { x: xr + nodeW + 8, y: b.y + Math.min(b.h / 2, 30) - 4, class: "node-label" }, 14, (i) => (i === 1 ? "num strong" : undefined));
    interactive(
      r,
      lang,
      () => ({
        value: b.seg.share !== undefined ? pct(b.seg.share, lang, 1) : short(b.seg.value, SY),
        title: `${tr(b.seg.label, lang)} ${SY}`,
        lines: [`${value(b.seg.value, 1, SY)} (${t("esaNote", lang)})`],
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
    svgEl(g, "text", { x: xc + nodeW + 10, y: ly, class: "num strong comp-pct" }, unit === "day" ? eur(perResidentPerDay(s.fn.value, SY), lang, 2) : pct(share, lang, 1));
    svgEl(g, "text", { x: xc + nodeW + 66, y: ly, class: "comp-name" }, wrap(tr(s.fn.label, lang), W - xc - nodeW - 70, 12, 400, 1)[0] ?? "");
    interactive(
      g as unknown as SVGElement,
      lang,
      () => ({
        value: pct(share, lang, 1),
        title: `${tr(s.fn.label, lang)} ${SY}`,
        lines: [bn(s.fn.value, lang), `${eur(perResidentPerDay(s.fn.value, SY), lang, 2)} ${t("perResidentDay", lang)}`],
        status: "provisional",
        hint: true,
      }),
      () => options.onOpen({ kind: "cofog", code: s.fn.code }),
      undefined,
      { visible: `${unit === "day" ? eur(perResidentPerDay(s.fn.value, SY), lang, 2) : pct(share, lang, 1)} ${wrap(tr(s.fn.label, lang), W - xc - nodeW - 70, 12, 400, 1)[0] ?? ""}` },
    );
  });
  const totalLines = wrap(`${t("spendingTotal", lang)} ${SY}: ${bn(total, lang)} = ${eur(perResidentPerDay(total, SY), lang, 2)} ${t("perResidentDay", lang)}`, W - xc - 4, 11.5, 400, 2);
  multiline(right, totalLines, { x: xc, y: yTop + barH + 16, class: "panel-note" }, 13);
  tagEntities(svg);
  tween(container, svg, options.animate);
}

const STAR_PAYROLL = {
  de: "* Beiträge versicherungspflichtig Beschäftigter (Arbeitnehmer- und Arbeitgeberanteil), Näherung. Ohne Beiträge von Rentnern, Selbständigen und öffentlichen Stellen.",
  en: "* Contributions of compulsorily insured employees (employee and employer share), a proxy. Without contributions of pensioners, the self-employed and public bodies.",
};
const ESA_CASH = {
  de: "Nach Eurostat-Methode gezählt, nicht als Kasseneinnahmen. Nicht zur linken Seite addieren.",
  en: "Counted the Eurostat way, not as cash collected. Don't add it to the left side.",
};

export const formatShortNumber = (value: number, lang: Lang): string => num(value, lang);
