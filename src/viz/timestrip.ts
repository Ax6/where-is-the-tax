/** Time strip: small multiples, one measure (and one axis) each. Ink tones only: hue is reserved for recipients. */
import { scaleLinear } from "d3-scale";
import { line } from "d3-shape";

import type { Series } from "../data/model.ts";
import { bn, num, t, tr, type Lang, type UiKey } from "../i18n.ts";
import { svgEl } from "./svg.ts";
import { hideTooltip, showTooltip } from "./tooltip.ts";

interface Panel {
  title: UiKey;
  series: { s: Series; cls: string; label: string }[];
  kind: "line" | "bars";
}

export function renderTimeStrip(container: HTMLElement, all: Series[], lang: Lang): void {
  container.replaceChildren();
  const get = (id: string) => all.find((s) => s.id === id)!;
  const panels: Panel[] = [
    {
      title: "timeRevenueSpending",
      kind: "line",
      series: [
        { s: get("TE"), cls: "line-a", label: t("spending", lang) },
        { s: get("TR"), cls: "line-b", label: t("revenue", lang) },
      ],
    },
    { title: "timeBalance", kind: "bars", series: [{ s: get("B9"), cls: "bars", label: tr(get("B9").label, lang) }] },
    { title: "timeDebt", kind: "line", series: [{ s: get("GD"), cls: "line-a", label: tr(get("GD").label, lang) }] },
    { title: "timeInterest", kind: "line", series: [{ s: get("D41PAY"), cls: "line-a", label: tr(get("D41PAY").label, lang) }] },
  ];
  for (const panel of panels) {
    const figure = document.createElement("figure");
    figure.className = "small-multiple";
    const caption = document.createElement("figcaption");
    caption.textContent = t(panel.title, lang);
    figure.append(caption);
    container.append(figure);
    drawPanel(figure, panel, lang);
  }
}

function drawPanel(figure: HTMLElement, panel: Panel, lang: Lang): void {
  const width = 300;
  const height = 150;
  const m = { top: 8, right: 44, bottom: 20, left: 38 };
  const points = panel.series.flatMap((s) => s.s.points);
  const years = points.map((p) => p.year);
  const values = points.map((p) => p.value / 1e9);
  const x = scaleLinear().domain([Math.min(...years), Math.max(...years)]).range([m.left, width - m.right]);
  const lo = Math.min(0, ...values);
  const hi = Math.max(0, ...values);
  const y = scaleLinear().domain([lo, hi]).nice(4).range([height - m.bottom, m.top]);
  const svg = svgEl(figure, "svg", { viewBox: `0 0 ${width} ${height}`, class: "sm-svg", role: "img", "aria-label": t(panel.title, lang) });
  for (const tick of y.ticks(4)) {
    svgEl(svg, "line", { x1: m.left, x2: width - m.right, y1: y(tick), y2: y(tick), class: tick === 0 ? "axis-zero" : "grid" });
    svgEl(svg, "text", { x: m.left - 5, y: y(tick) + 3.5, class: "tick", "text-anchor": "end" }, num(tick, lang));
  }
  const [y0, y1] = x.domain() as [number, number];
  const yearTicks = [y0, ...x.ticks(4).filter((v) => v - y0 >= 6 && y1 - v >= 6), y1];
  for (const year of yearTicks) {
    svgEl(svg, "text", { x: x(year), y: height - 5, class: "tick", "text-anchor": year === y0 ? "start" : year === y1 ? "end" : "middle" }, String(year));
  }
  if (panel.kind === "bars") {
    const s = panel.series[0]!.s;
    const bw = Math.max(2, (x(y0 + 1) - x(y0)) * 0.7);
    for (const p of s.points) {
      const v = p.value / 1e9;
      svgEl(svg, "rect", { x: x(p.year) - bw / 2, y: Math.min(y(v), y(0)), width: bw, height: Math.abs(y(v) - y(0)), class: v < 0 ? "bar-neg" : "bar-pos" });
    }
  } else {
    for (const series of panel.series) {
      const path = line<{ year: number; value: number }>()
        .x((p) => x(p.year))
        .y((p) => y(p.value / 1e9))(series.s.points);
      svgEl(svg, "path", { d: path ?? "", class: series.cls });
      const last = series.s.points[series.s.points.length - 1]!;
      svgEl(svg, "circle", { cx: x(last.year), cy: y(last.value / 1e9), r: 3, class: `${series.cls}-dot` });
      if (panel.series.length > 1) {
        svgEl(svg, "text", { x: x(last.year) + 5, y: y(last.value / 1e9) + (series.cls === "line-a" ? -2 : 9), class: "end-label" }, series.label);
      }
    }
  }
  // crosshair + tooltip: one readout lists every series at that year
  const cross = svgEl(svg, "line", { y1: m.top, y2: height - m.bottom, class: "crosshair", visibility: "hidden" });
  const hit = svgEl(svg, "rect", { x: m.left, y: m.top, width: width - m.left - m.right, height: height - m.top - m.bottom, class: "hit" });
  const readout = (clientX: number, clientY: number) => {
    const box = svg.getBoundingClientRect();
    const px = ((clientX - box.left) / box.width) * width;
    const year = Math.round(x.invert(px));
    const rows = panel.series
      .map((series) => ({ series, point: series.s.points.find((p) => p.year === year) }))
      .filter((row) => row.point);
    if (!rows.length) {
      return;
    }
    cross.setAttribute("x1", String(x(year)));
    cross.setAttribute("x2", String(x(year)));
    cross.setAttribute("visibility", "visible");
    showTooltip(
      {
        value: String(year),
        title: t(panel.title, lang),
        lines: rows.map((row) => `${row.series.label}: ${bn(row.point!.value, lang, 1)}${row.point!.provisional ? ` (${t("provisionalTag", lang)})` : ""}`),
      },
      { x: clientX, y: clientY },
      lang,
    );
  };
  hit.addEventListener("pointermove", (event) => readout(event.clientX, event.clientY));
  hit.addEventListener("pointerleave", () => {
    cross.setAttribute("visibility", "hidden");
    hideTooltip();
  });
}
