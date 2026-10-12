/**
 * Staged flow layout (kept from the prototype's custom D3 layout): columns of nodes, ribbons scaled in
 * euros with one scale for every column left of the boundary. Pure geometry, no DOM.
 */
import type { Flow, FlowEdge, FlowNode, Pot } from "../data/model.ts";

export interface LayoutNode extends FlowNode {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LayoutEdge extends FlowEdge {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  /** thickness at source and target (equal: one scale) */
  t: number;
}

export interface FlowLayout {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  scale: number;
}

export interface FlowLayoutOptions {
  stageX: number[];
  top: number;
  height: number;
  nodeWidth: number;
  gap: number;
  minHeight?: number;
  /** extra gap after a node id (e.g. between gross wage and employer ghost) */
  gapAfter?: Record<string, number>;
  /** fixed px-per-euro scale; otherwise the tallest column fills the height */
  scale?: number;
  /** desired vertical centre per node id (aligned columns, e.g. recipients to their pots) */
  centers?: Record<string, number>;
}

const columnOf = (flow: Flow, stage: number): FlowNode[] => flow.nodes.filter((node) => node.stage === stage);

export function fitScale(flow: Flow, options: Omit<FlowLayoutOptions, "scale" | "centers">): number {
  let scale = Number.POSITIVE_INFINITY;
  const stages = Math.max(...flow.nodes.map((node) => node.stage)) + 1;
  for (let stage = 0; stage < stages; stage += 1) {
    const column = columnOf(flow, stage);
    const total = column.reduce((sum, node) => sum + node.value, 0);
    const gaps = column.reduce((sum, node, index) => sum + (index < column.length - 1 ? (options.gapAfter?.[node.id] ?? options.gap) : 0), 0);
    if (total > 0) {
      scale = Math.min(scale, (options.height - gaps) / total);
    }
  }
  return scale;
}

/** Push rectangles apart (min gap) while staying close to their desired positions, within [top, bottom]. */
export function resolveColumn(items: { y: number; h: number }[], top: number, bottom: number, gap: number): void {
  for (let i = 1; i < items.length; i += 1) {
    const prev = items[i - 1]!;
    const item = items[i]!;
    item.y = Math.max(item.y, prev.y + prev.h + gap);
  }
  const last = items[items.length - 1];
  if (last && last.y + last.h > bottom) {
    last.y = bottom - last.h;
    for (let i = items.length - 2; i >= 0; i -= 1) {
      const next = items[i + 1]!;
      const item = items[i]!;
      item.y = Math.min(item.y, next.y - gap - item.h);
    }
  }
  const first = items[0];
  if (first && first.y < top) {
    first.y = top;
    for (let i = 1; i < items.length; i += 1) {
      const prev = items[i - 1]!;
      items[i]!.y = Math.max(items[i]!.y, prev.y + prev.h + gap);
    }
  }
}

export function layoutFlow(flow: Flow, options: FlowLayoutOptions): FlowLayout {
  const minHeight = options.minHeight ?? 1.5;
  const scale = options.scale ?? fitScale(flow, options);
  const stages = options.stageX.length;
  const nodes: LayoutNode[] = [];
  for (let stage = 0; stage < stages; stage += 1) {
    const column = columnOf(flow, stage).map((node) => ({
      ...node,
      x: options.stageX[stage]!,
      y: 0,
      w: options.nodeWidth,
      h: node.value > 0 ? Math.max(minHeight, node.value * scale) : 0,
    }));
    const gaps = column.reduce((sum, node, index) => sum + (index < column.length - 1 ? (options.gapAfter?.[node.id] ?? options.gap) : 0), 0);
    const height = column.reduce((sum, node) => sum + node.h, 0) + gaps;
    if (options.centers && column.every((node) => options.centers?.[node.id] !== undefined)) {
      for (const node of column) {
        node.y = options.centers[node.id]! - node.h / 2;
      }
      resolveColumn(column, options.top, options.top + options.height, Math.min(options.gap, 4));
    } else {
      let y = options.top + Math.max(0, (options.height - height) / 2);
      for (const node of column) {
        node.y = y;
        y += node.h + (options.gapAfter?.[node.id] ?? options.gap);
      }
    }
    nodes.push(...column);
  }

  const byId = new Map(nodes.map((node) => [node.id, node]));
  const outCursor = new Map<string, number>();
  const inCursor = new Map<string, number>();
  const order = [...flow.edges].sort((a, b) => {
    const ta = byId.get(a.to)?.y ?? 0;
    const tb = byId.get(b.to)?.y ?? 0;
    return ta - tb || (byId.get(a.from)?.y ?? 0) - (byId.get(b.from)?.y ?? 0);
  });
  // Incoming ribbons stack by source position so they do not cross inside a node.
  const inOrder = [...flow.edges].sort((a, b) => (byId.get(a.from)?.y ?? 0) - (byId.get(b.from)?.y ?? 0));
  const inOffset = new Map<string, number>();
  for (const edge of inOrder) {
    const target = byId.get(edge.to);
    if (!target) {
      continue;
    }
    const cursor = inCursor.get(edge.to) ?? 0;
    inOffset.set(edge.id, cursor);
    inCursor.set(edge.to, cursor + edge.value * scale);
  }
  const edges: LayoutEdge[] = [];
  for (const edge of order) {
    const source = byId.get(edge.from);
    const target = byId.get(edge.to);
    if (!source || !target) {
      throw new Error(`Edge ${edge.id} references a missing node.`);
    }
    const t = edge.value * scale;
    const out = outCursor.get(edge.from) ?? 0;
    outCursor.set(edge.from, out + t);
    // Nodes drawn at a minimum height spread their ribbons proportionally.
    const sourceFactor = source.value > 0 ? source.h / (source.value * scale) : 1;
    const targetFactor = target.value > 0 ? target.h / (target.value * scale) : 1;
    edges.push({
      ...edge,
      x0: source.x + source.w,
      x1: target.x,
      y0: source.y + out * Math.min(1, sourceFactor) + (sourceFactor > 1 ? (source.h - source.value * scale) / 2 : 0),
      y1: target.y + (inOffset.get(edge.id) ?? 0) * Math.min(1, targetFactor) + (targetFactor > 1 ? (target.h - target.value * scale) / 2 : 0),
      t,
    });
  }
  return { nodes, edges, scale };
}

export function ribbonPath(edge: { x0: number; x1: number; y0: number; y1: number; t: number }): string {
  const t = Math.max(edge.t, 0.6);
  const mx = (edge.x0 + edge.x1) / 2;
  return [
    `M${edge.x0},${edge.y0}`,
    `C${mx},${edge.y0} ${mx},${edge.y1} ${edge.x1},${edge.y1}`,
    `L${edge.x1},${edge.y1 + t}`,
    `C${mx},${edge.y1 + t} ${mx},${edge.y0 + t} ${edge.x0},${edge.y0 + t}`,
    "Z",
  ].join("");
}

// ---------------------------------------------------------------------------------------------
// Pots: drawn at their true size on one € bn scale
// ---------------------------------------------------------------------------------------------

export interface PotLayout {
  pot: Pot;
  y: number;
  h: number;
}

export function layoutPots(pots: Pot[], top: number, height: number, gap: number): { pots: PotLayout[]; scale: number } {
  const total = pots.reduce((sum, pot) => sum + pot.total, 0);
  const scale = (height - gap * (pots.length - 1)) / total;
  let y = top;
  const out = pots.map((pot) => {
    const h = Math.max(2, pot.total * scale);
    const item = { pot, y, h };
    y += h + gap;
    return item;
  });
  return { pots: out, scale };
}

/** Place labels near desired y without overlapping (min distance `spacing`), inside [top, bottom]. */
export function spreadLabels(desired: number[], spacing: number, top: number, bottom: number): number[] {
  const items = desired.map((y, index) => ({ index, y: y - spacing / 2, h: spacing }));
  const sorted = [...items].sort((a, b) => a.y - b.y);
  resolveColumn(sorted, top, bottom, 0);
  const out = new Array<number>(desired.length);
  for (const item of sorted) {
    out[item.index] = item.y + spacing / 2;
  }
  return out;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
