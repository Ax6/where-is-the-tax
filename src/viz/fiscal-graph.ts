import { select } from "d3-selection";

import { formatMoney } from "../format.ts";
import {
  EDGE_KIND_LABELS,
  type Route,
  type RouteEdge,
  type RouteNode,
} from "../routes/data.ts";
import { hideTooltip, showTooltip, tooltipText, type TooltipContent } from "./tooltip.ts";

export interface GraphCallbacks {
  onSelect: (kind: "node" | "edge", id: string) => void;
}

interface PlacedNode extends RouteNode {
  x: number;
  y: number;
  height: number;
  value: number;
  outCursor: number;
  inCursor: number;
}

interface PlacedEdge extends RouteEdge {
  path: string;
  thickness: number;
  sourceEntity: string;
  targetEntity: string;
}

const VIEW_WIDTH = 1160;
const VIEW_HEIGHT = 650;
const MARGIN = { top: 64, right: 10, bottom: 24, left: 10 };
const NODE_WIDTH = 12;
const NODE_GAP = 26;
const MIN_NODE_HEIGHT = 8;
const LABEL_GAP = 7;
const MAX_LABEL_SHIFT = 34;

interface CollisionLabel {
  element: SVGTextElement;
  node: PlacedNode;
  shift: number;
  minShift: number;
  maxShift: number;
}

function routeShareMeta(route: Route, weight: number): string {
  if (route.unit === "million_eur") {
    return formatMoney(weight, "million EUR");
  }
  const percent = weight * 100;
  const digits = percent >= 10 ? 1 : 2;
  return `${percent.toFixed(digits)}% of this route`;
}

function layout(route: Route): { nodes: PlacedNode[]; edges: PlacedEdge[] } {
  const stageCount = route.stages.length;
  const plotWidth = VIEW_WIDTH - MARGIN.left - MARGIN.right - NODE_WIDTH;
  const plotHeight = VIEW_HEIGHT - MARGIN.top - MARGIN.bottom;

  const nodes: PlacedNode[] = route.nodes.map((node) => {
    const inbound = route.edges.filter((edge) => edge.to === node.id).reduce((sum, edge) => sum + edge.weight, 0);
    const outbound = route.edges.filter((edge) => edge.from === node.id).reduce((sum, edge) => sum + edge.weight, 0);
    return { ...node, x: 0, y: 0, height: 0, value: Math.max(inbound, outbound), outCursor: 0, inCursor: 0 };
  });

  const byId = new Map(nodes.map((node) => [node.id, node]));

  let scale = Number.POSITIVE_INFINITY;
  for (let stage = 0; stage < stageCount; stage += 1) {
    const column = nodes.filter((node) => node.stage === stage);
    const total = column.reduce((sum, node) => sum + node.value, 0);
    const available = plotHeight - (column.length - 1) * NODE_GAP;
    if (total > 0) {
      scale = Math.min(scale, available / total);
    }
  }

  for (let stage = 0; stage < stageCount; stage += 1) {
    const column = nodes.filter((node) => node.stage === stage);
    const x = MARGIN.left + (stageCount === 1 ? 0 : (plotWidth / (stageCount - 1)) * stage);
    for (const node of column) {
      node.height = Math.max(MIN_NODE_HEIGHT, node.value * scale);
      node.x = x;
    }
    const columnHeight = column.reduce((sum, node) => sum + node.height, 0) + (column.length - 1) * NODE_GAP;
    let y = MARGIN.top + (plotHeight - columnHeight) / 2;
    for (const node of column) {
      node.y = y;
      y += node.height + NODE_GAP;
    }
  }

  const orderedEdges = [...route.edges].sort((a, b) => {
    const ay = byId.get(a.to)?.y ?? 0;
    const by = byId.get(b.to)?.y ?? 0;
    if (ay !== by) {
      return ay - by;
    }
    return (byId.get(a.from)?.y ?? 0) - (byId.get(b.from)?.y ?? 0);
  });

  const edges: PlacedEdge[] = [];
  for (const edge of orderedEdges) {
    const source = byId.get(edge.from);
    const target = byId.get(edge.to);
    if (!source || !target) {
      throw new Error(`Edge ${edge.id} references a missing node.`);
    }
    const sourceScale = source.value > 0 ? source.height / source.value : 0;
    const targetScale = target.value > 0 ? target.height / target.value : 0;
    const sourceThickness = edge.weight * sourceScale;
    const targetThickness = edge.weight * targetScale;
    const x0 = source.x + NODE_WIDTH;
    const x1 = target.x;
    const y0 = source.y + source.outCursor;
    const y1 = target.y + target.inCursor;
    source.outCursor += sourceThickness;
    target.inCursor += targetThickness;
    const mx = (x0 + x1) / 2;
    const path = [
      `M ${x0} ${y0}`,
      `C ${mx} ${y0} ${mx} ${y1} ${x1} ${y1}`,
      `L ${x1} ${y1 + targetThickness}`,
      `C ${mx} ${y1 + targetThickness} ${mx} ${y0 + sourceThickness} ${x0} ${y0 + sourceThickness}`,
      "Z",
    ].join(" ");
    edges.push({
      ...edge,
      path,
      thickness: Math.min(sourceThickness, targetThickness),
      sourceEntity: source.entity,
      targetEntity: target.entity,
    });
  }

  return { nodes, edges };
}

/**
 * SVG labels are centred on their nodes, which is ideal until two neighbouring
 * stages use the same horizontal lane. Measure the rendered text and gently
 * separate only the pairs that actually collide. Movement is capped so every
 * label remains visibly attached to its node.
 */
function resolveLabelCollisions(
  svg: SVGSVGElement,
  elements: SVGTextElement[],
  nodes: PlacedNode[],
): void {
  const svgRect = svg.getBoundingClientRect();
  if (svgRect.height <= 0 || elements.length !== nodes.length) {
    return;
  }
  const pixelsPerUnit = svgRect.height / VIEW_HEIGHT;
  const plotTop = svgRect.top + MARGIN.top * pixelsPerUnit;
  const plotBottom = svgRect.top + (VIEW_HEIGHT - MARGIN.bottom) * pixelsPerUnit;
  const labels: CollisionLabel[] = elements.map((element, index) => {
    const rect = element.getBoundingClientRect();
    return {
      element,
      node: nodes[index]!,
      shift: 0,
      minShift: Math.max(-MAX_LABEL_SHIFT, (plotTop - rect.top) / pixelsPerUnit),
      maxShift: Math.min(MAX_LABEL_SHIFT, (plotBottom - rect.bottom) / pixelsPerUnit),
    };
  });

  const move = (label: CollisionLabel, delta: number): number => {
    const previous = label.shift;
    label.shift = Math.max(label.minShift, Math.min(label.maxShift, previous + delta));
    if (Math.abs(label.shift) < 0.05) {
      label.element.removeAttribute("transform");
    } else {
      label.element.setAttribute("transform", `translate(0 ${label.shift.toFixed(2)})`);
    }
    return Math.abs(label.shift - previous);
  };

  for (let pass = 0; pass < 8; pass += 1) {
    let changed = false;
    for (let i = 0; i < labels.length; i += 1) {
      for (let j = i + 1; j < labels.length; j += 1) {
        const first = labels[i]!;
        const second = labels[j]!;
        const firstRect = first.element.getBoundingClientRect();
        const secondRect = second.element.getBoundingClientRect();
        const horizontalCollision =
          firstRect.left < secondRect.right + LABEL_GAP && secondRect.left < firstRect.right + LABEL_GAP;
        const verticalOverlap =
          Math.min(firstRect.bottom, secondRect.bottom) - Math.max(firstRect.top, secondRect.top);
        if (!horizontalCollision || verticalOverlap < -LABEL_GAP) {
          continue;
        }

        const needed = (verticalOverlap + LABEL_GAP) / pixelsPerUnit;
        let upper: CollisionLabel;
        let lower: CollisionLabel;
        if (first.node.stage === second.node.stage) {
          const firstCenter = firstRect.top + firstRect.height / 2;
          const secondCenter = secondRect.top + secondRect.height / 2;
          [upper, lower] = firstCenter <= secondCenter ? [first, second] : [second, first];
        } else {
          // Stagger labels from adjacent columns: the later-stage label rises,
          // while the earlier-stage label drops into the other half of the flow.
          [upper, lower] = first.node.stage > second.node.stage ? [first, second] : [second, first];
        }

        const upperMoved = move(upper, -needed / 2);
        const lowerMoved = move(lower, needed - upperMoved);
        const remainder = needed - upperMoved - lowerMoved;
        if (remainder > 0.05) {
          move(upper, -remainder);
        }
        changed = changed || upperMoved > 0.05 || lowerMoved > 0.05;
      }
    }
    if (!changed) {
      break;
    }
  }
}

function nodeTooltip(route: Route, node: PlacedNode): TooltipContent {
  return {
    title: node.label,
    official: node.official,
    meta: node.role === "event" ? undefined : routeShareMeta(route, node.value),
    status: node.status,
    description: node.description,
    amountNote: node.amountNote,
  };
}

function edgeTooltip(route: Route, edge: PlacedEdge): TooltipContent {
  return {
    title: edge.shareLabel,
    meta: routeShareMeta(route, edge.weight),
    kind: EDGE_KIND_LABELS[edge.kind],
    status: edge.status,
    description: edge.description,
  };
}

export function renderFiscalGraph(container: HTMLElement, route: Route, callbacks: GraphCallbacks): void {
  const { nodes, edges } = layout(route);
  container.replaceChildren();
  hideTooltip();

  const svg = select(container)
    .append("svg")
    .attr("class", "fiscal-graph")
    .attr("viewBox", `0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`)
    .attr("role", "group")
    .attr("aria-label", `Fiscal route: ${route.chipTitle}. ${route.unitNote}`);

  const defs = svg.append("defs");
  for (const edge of edges) {
    const source = nodes.find((node) => node.id === edge.from);
    const target = nodes.find((node) => node.id === edge.to);
    const gradient = defs
      .append("linearGradient")
      .attr("id", `fg-grad-${route.id}-${edge.id}`)
      .attr("gradientUnits", "userSpaceOnUse")
      .attr("x1", (source?.x ?? 0) + NODE_WIDTH)
      .attr("x2", target?.x ?? 0)
      .attr("y1", 0)
      .attr("y2", 0);
    gradient.append("stop").attr("offset", "0%").attr("class", `fg-stop-${edge.sourceEntity}`);
    gradient.append("stop").attr("offset", "100%").attr("class", `fg-stop-${edge.targetEntity}`);
  }

  const hatch = defs
    .append("pattern")
    .attr("id", `fg-hatch-${route.id}`)
    .attr("patternUnits", "userSpaceOnUse")
    .attr("width", 7)
    .attr("height", 7)
    .attr("patternTransform", "rotate(45)");
  hatch.append("rect").attr("width", 7).attr("height", 7).attr("class", "fg-hatch-bg");
  hatch.append("line").attr("x1", 0).attr("y1", 0).attr("x2", 0).attr("y2", 7).attr("class", "fg-hatch-line");

  const stageCount = route.stages.length;
  const plotWidth = VIEW_WIDTH - MARGIN.left - MARGIN.right - NODE_WIDTH;
  svg
    .append("g")
    .attr("class", "fg-stages")
    .selectAll("text")
    .data(route.stages)
    .join("text")
    .attr("x", (_, i) => {
      const x = MARGIN.left + (stageCount === 1 ? 0 : (plotWidth / (stageCount - 1)) * i);
      return i === 0 ? x : i === stageCount - 1 ? x + NODE_WIDTH : x + NODE_WIDTH / 2;
    })
    .attr("y", 26)
    .attr("text-anchor", (_, i) => (i === 0 ? "start" : i === stageCount - 1 ? "end" : "middle"))
    .attr("class", "fg-stage-label")
    .text((stage, i) => `${String(i + 1).padStart(2, "0")} — ${stage}`);

  const relatedByNode = new Map<string, Set<Element>>();
  const allInteractive: Element[] = [];

  const clearActive = () => {
    svg.classed("fg-has-focus", false);
    for (const el of allInteractive) {
      el.classList.remove("is-active");
    }
    hideTooltip();
  };

  const activate = (elements: Set<Element>) => {
    svg.classed("fg-has-focus", true);
    for (const el of allInteractive) {
      el.classList.toggle("is-active", elements.has(el));
    }
  };

  const edgeGroup = svg.append("g").attr("class", "fg-edges");
  const edgeSelection = edgeGroup
    .selectAll<SVGPathElement, PlacedEdge>("path")
    .data(edges)
    .join("path")
    .attr("class", (edge) => `fg-edge${edge.status === "not_individually_traceable" ? " fg-edge-hatched" : ""}`)
    .attr("d", (edge) => edge.path)
    .attr("fill", (edge) =>
      edge.status === "not_individually_traceable" ? `url(#fg-hatch-${route.id})` : `url(#fg-grad-${route.id}-${edge.id})`,
    )
    .attr("tabindex", 0)
    .attr("role", "button")
    .attr("aria-label", (edge) => tooltipText(edgeTooltip(route, edge)));

  const nodeGroup = svg.append("g").attr("class", "fg-nodes");
  const nodeSelection = nodeGroup
    .selectAll<SVGGElement, PlacedNode>("g")
    .data(nodes)
    .join("g")
    .attr("class", (node) => `fg-node fg-entity-${node.entity} fg-role-${node.role}`)
    .attr("transform", (node) => `translate(${node.x}, ${node.y})`)
    .attr("tabindex", 0)
    .attr("role", "button")
    .attr("aria-label", (node) => tooltipText(nodeTooltip(route, node)));

  nodeSelection
    .append("rect")
    .attr("width", NODE_WIDTH)
    .attr("height", (node) => node.height)
    .attr("rx", 2);

  const lastStage = stageCount - 1;
  const labels = nodeSelection
    .append("text")
    .attr("class", "fg-node-label")
    .attr("x", (node) => (node.stage === lastStage ? -12 : NODE_WIDTH + 12))
    .attr("y", (node) => Math.max(node.height / 2, 9))
    .attr("dominant-baseline", "middle")
    .attr("text-anchor", (node) => (node.stage === lastStage ? "end" : "start"));

  labels
    .append("tspan")
    .attr("class", "fg-node-name")
    .text((node) => node.label);

  labels
    .filter((node) => Boolean(node.official))
    .append("tspan")
    .attr("class", "fg-node-official")
    .attr("x", (node) => (node.stage === lastStage ? -12 : NODE_WIDTH + 12))
    .attr("dy", "1.35em")
    .text((node) => node.official ?? "");

  const svgElement = svg.node();
  if (svgElement) {
    resolveLabelCollisions(svgElement, labels.nodes(), labels.data());
  }

  edgeSelection.each(function (edge) {
    const related = new Set<Element>([this]);
    allInteractive.push(this);
    nodeSelection.each(function (node) {
      if (node.id === edge.from || node.id === edge.to) {
        related.add(this);
      }
    });
    select(this)
      .on("pointerenter", (event: PointerEvent) => {
        activate(related);
        showTooltip(edgeTooltip(route, edge), { x: event.clientX, y: event.clientY });
      })
      .on("pointermove", (event: PointerEvent) => {
        showTooltip(edgeTooltip(route, edge), { x: event.clientX, y: event.clientY });
      })
      .on("pointerleave", clearActive)
      .on("focus", function () {
        const box = this.getBoundingClientRect();
        activate(related);
        showTooltip(edgeTooltip(route, edge), { x: box.left + box.width / 2, y: box.top + box.height / 2 });
      })
      .on("blur", clearActive)
      .on("click", () => callbacks.onSelect("edge", edge.id))
      .on("keydown", (event: KeyboardEvent) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          callbacks.onSelect("edge", edge.id);
        }
      });
  });

  nodeSelection.each(function (node) {
    allInteractive.push(this);
    const related = new Set<Element>([this]);
    edgeSelection.each(function (edge) {
      if (edge.from === node.id || edge.to === node.id) {
        related.add(this);
        nodeSelection.each(function (other) {
          if (other.id === edge.from || other.id === edge.to) {
            related.add(this);
          }
        });
      }
    });
    relatedByNode.set(node.id, related);
    select(this)
      .on("pointerenter", (event: PointerEvent) => {
        activate(related);
        showTooltip(nodeTooltip(route, node), { x: event.clientX, y: event.clientY });
      })
      .on("pointermove", (event: PointerEvent) => {
        showTooltip(nodeTooltip(route, node), { x: event.clientX, y: event.clientY });
      })
      .on("pointerleave", clearActive)
      .on("focus", function () {
        const box = this.getBoundingClientRect();
        activate(related);
        showTooltip(nodeTooltip(route, node), { x: box.right, y: box.top });
      })
      .on("blur", clearActive)
      .on("click", () => callbacks.onSelect("node", node.id))
      .on("keydown", (event: KeyboardEvent) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          callbacks.onSelect("node", node.id);
        }
      });
  });
}
