/**
 * Equalisation map: € per resident (fiscal capacity equalisation + all supplementary federal grants) of the
 * selected year. It is also the place picker: click a Land to see your flow there, click it again for all Länder.
 * Diverging brown (pays in) ↔ teal (receives) around a neutral grey; the poles are not recipient hues.
 * No bilateral wires: the system is one pooled calculation.
 */
import { geoMercator, geoPath } from "d3-geo";
import { interpolateLab } from "d3-interpolate";
import { scaleLinear } from "d3-scale";

import { equalisationStatus, GERMANY_CODE, type EqualisationLand, type Status } from "../data/model.ts";
import { raw } from "../data/sources.ts";
import { eur, money, t, tr, type Lang } from "../i18n.ts";
import { svgEl } from "./svg.ts";
import { hideTooltip, showTooltip } from "./tooltip.ts";

interface LandFeature {
  type: "Feature";
  properties: { code: string; name: string };
  geometry: unknown;
}
const geo = raw.laenderGeo as unknown as { features: LandFeature[]; attribution: string };
export const mapAttribution = geo.attribution;

/**
 * Diverging scale from the theme's tokens (--map-pays / --map-mid / --map-receives in styles.css): light and
 * dark have their own validated steps, so colours are read at render time.
 */
export function mapScale(lands: EqualisationLand[]): (value: number) => string {
  const max = Math.max(...lands.map((land) => Math.abs(land.perResident)));
  const css = getComputedStyle(document.documentElement);
  const token = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  const scale = scaleLinear<string>()
    .domain([-max, 0, max])
    .range([token("--map-pays", "#6b4f2a"), token("--map-mid", "#c8c9c2"), token("--map-receives", "#0e6e74")])
    .interpolate(interpolateLab);
  return (value: number) => scale(value);
}

export interface MapOptions {
  lang: Lang;
  year: number;
  selected: string;
  zoom: "you" | "germany";
  onSelect: (code: string, trigger: SVGElement) => void;
}

interface MapInstance {
  year: number;
  lang: Lang;
  svg: SVGSVGElement;
  paths: Map<string, SVGPathElement>;
  selected: string;
  zoom: "you" | "germany";
  onSelect: MapOptions["onSelect"];
}
const instances = new WeakMap<HTMLElement, MapInstance>();

const landLabel = (land: EqualisationLand, selected: boolean, lang: Lang): string =>
  `${tr(land.name, lang)}: ${land.perResident >= 0 ? t("mapReceives", lang) : t("mapPays", lang)} ${eur(Math.abs(land.perResident), lang)}${selected ? `. ${t("mapDeselect", lang)}` : ""}`;

/**
 * Draws the map once per year and language; a change of selection, view or theme updates the paths in place,
 * so the outline and colours transition (styles.css) instead of redrawing. The selected Land is painted last:
 * neighbours' hairlines never cut into its outline. A hovered Land is raised the same way while the pointer is on it.
 */
export function renderLandMap(container: HTMLElement, lands: EqualisationLand[], options: MapOptions): void {
  const { lang } = options;
  const byCode = new Map(lands.map((land) => [land.code, land]));
  const existing = instances.get(container);
  const inst =
    existing && existing.year === options.year && existing.lang === lang && existing.svg.isConnected
      ? Object.assign(existing, { selected: options.selected, zoom: options.zoom, onSelect: options.onSelect })
      : build(container, lands, options);
  const color = mapScale(lands);
  for (const [code, shape] of inst.paths) {
    const land = byCode.get(code)!;
    const selected = code === inst.selected;
    shape.setAttribute("fill", color(land.perResident));
    shape.classList.toggle("is-selected", selected);
    shape.setAttribute("aria-pressed", String(selected));
    shape.setAttribute("aria-label", landLabel(land, selected, lang));
  }
  raiseSelected(inst);
}

/** Paint a Land last. Only moves it when needed: a DOM move re-fires pointerenter and would detach a click's target. */
const raise = (svg: SVGSVGElement, shape: SVGPathElement | undefined): void => {
  if (shape && shape !== svg.lastElementChild) {
    svg.append(shape);
  }
};
const raiseSelected = (inst: MapInstance): void => raise(inst.svg, inst.paths.get(inst.selected));

function build(container: HTMLElement, lands: EqualisationLand[], options: MapOptions): MapInstance {
  const { lang } = options;
  container.replaceChildren();
  const status: Status = equalisationStatus(options.year).startsWith("provisional") ? "provisional" : "official";
  const byCode = new Map(lands.map((land) => [land.code, land]));
  const width = 300;
  const height = 400;
  const projection = geoMercator().fitExtent(
    [
      [4, 4],
      [width - 4, height - 4],
    ],
    geo as never,
  );
  const path = geoPath(projection);
  const svg = svgEl(container, "svg", { class: "map-svg", viewBox: `0 0 ${width} ${height}`, role: "group", "aria-label": `${t("mapTitle", lang)} · ${options.year}` });
  const inst: MapInstance = { year: options.year, lang, svg, paths: new Map(), selected: options.selected, zoom: options.zoom, onSelect: options.onSelect };
  instances.set(container, inst);
  for (const feature of geo.features) {
    const code = feature.properties.code;
    const land = byCode.get(code);
    if (!land) {
      continue;
    }
    const shape = svgEl(svg, "path", { d: path(feature as never) ?? "", class: "land", tabindex: 0, role: "button" });
    inst.paths.set(code, shape);
    const select = () => inst.onSelect(nextPlace(inst.selected, code), shape);
    shape.addEventListener("click", select);
    shape.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        select();
      }
    });
    const tip = (x: number, y: number) =>
      showTooltip(
        {
          value: `${land.perResident >= 0 ? "+" : "−"}${eur(Math.abs(land.perResident), lang)}`,
          title: tr(land.name, lang),
          lines: [
            `${lang === "de" ? "Finanzkraftausgleich" : "Equalisation within VAT"}: ${land.fka >= 0 ? "+" : ""}${money(land.fka, lang)}`,
            `${lang === "de" ? "Bundesergänzungszuweisungen" : "Supplementary federal grants"}: ${money(land.bez, lang)}`,
          ],
          status,
          body: code === inst.selected ? t("mapDeselect", lang) : t(inst.zoom === "you" ? "mapClick" : "mapClickGermany", lang),
        },
        { x, y },
        lang,
      );
    shape.addEventListener("pointerenter", (event) => {
      // on top while hovered, so its outline is whole; the selected Land returns to the top on leave
      raise(svg, shape);
      tip(event.clientX, event.clientY);
    });
    shape.addEventListener("pointermove", (event) => tip(event.clientX, event.clientY));
    shape.addEventListener("pointerleave", () => {
      hideTooltip();
      raiseSelected(inst);
    });
    shape.addEventListener("blur", hideTooltip);
  }
  return inst;
}

/** Clicking the selected Land goes back to all Länder; any other Land becomes the selection. */
export const nextPlace = (selected: string, clicked: string): string => (clicked === selected ? GERMANY_CODE : clicked);

/** Sorted diverging bars (ranking panel): the readable twin of the colours. */
export function renderLandBars(
  container: HTMLElement,
  lands: EqualisationLand[],
  options: { lang: Lang; selected: string; onSelect: (code: string) => void },
): void {
  const { lang } = options;
  container.replaceChildren();
  const color = mapScale(lands);
  const max = Math.max(...lands.map((land) => Math.abs(land.perResident)));
  const sorted = [...lands].sort((a, b) => b.perResident - a.perResident);
  const list = document.createElement("ol");
  list.className = "land-bars";
  for (const land of sorted) {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = `land-bar${land.code === options.selected ? " is-selected" : ""}`;
    button.setAttribute("aria-pressed", String(land.code === options.selected));
    const name = document.createElement("span");
    name.className = "land-bar-name";
    name.textContent = tr(land.name, lang);
    const track = document.createElement("span");
    track.className = "land-bar-track";
    const fill = document.createElement("span");
    fill.className = "land-bar-fill";
    const share = Math.abs(land.perResident) / max / 2;
    fill.style.width = `${share * 100}%`;
    fill.style.left = land.perResident >= 0 ? "50%" : `${(0.5 - share) * 100}%`;
    fill.style.background = color(land.perResident);
    track.append(fill);
    const value = document.createElement("span");
    value.className = "land-bar-value num";
    value.textContent = `${land.perResident >= 0 ? "+" : "−"}${eur(Math.abs(land.perResident), lang)}`;
    button.append(name, track, value);
    button.addEventListener("click", () => options.onSelect(nextPlace(options.selected, land.code)));
    li.append(button);
    list.append(li);
  }
  container.append(list);
}
