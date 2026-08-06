import { geoMercator, geoPath } from "d3-geo";
import { select } from "d3-selection";

import laenderGeo from "../../data/geo/de-laender.json";
import { equalisationPerResident, getLandFigures } from "../routes/equalisation.ts";
import { GERMANY, getPlace, type Place } from "../routes/places.ts";

interface LandFeature {
  type: "Feature";
  properties: { code: string; name: string };
  geometry: { type: "MultiPolygon"; coordinates: number[][][][] };
}

const collection = laenderGeo as unknown as {
  type: "FeatureCollection";
  attribution: string;
  features: LandFeature[];
};

const WIDTH = 300;
const MAP_HEIGHT = 400;
const KEY_HEIGHT = 52;

const PAPER: [number, number, number] = [0xf3, 0xf0, 0xe8];
const RECEIVES: [number, number, number] = [0x12, 0x80, 0x5e];
const PAYS: [number, number, number] = [0xa4, 0x69, 0x0e];
const MAX_PER_RESIDENT = 1350;

function mix(from: [number, number, number], to: [number, number, number], t: number): string {
  const channel = (a: number, b: number) => Math.round(a + (b - a) * t);
  return `rgb(${channel(from[0], to[0])}, ${channel(from[1], to[1])}, ${channel(from[2], to[2])})`;
}

/** Choropleth fill: equalisation effect per resident (green = receives, ochre = pays in). */
function landFill(code: string): string {
  const figures = getLandFigures(code);
  if (!figures) {
    return mix(PAPER, PAPER, 0);
  }
  const perResident = equalisationPerResident(figures);
  const t = 0.12 + 0.88 * Math.sqrt(Math.min(1, Math.abs(perResident) / MAX_PER_RESIDENT));
  return perResident >= 0 ? mix(PAPER, RECEIVES, t) : mix(PAPER, PAYS, t);
}

function landTitle(feature: LandFeature): string {
  const figures = getLandFigures(feature.properties.code);
  if (!figures) {
    return feature.properties.name;
  }
  const perResident = Math.round(equalisationPerResident(figures));
  const direction = perResident >= 0 ? "receives" : "pays in";
  return `${feature.properties.name} — equalisation 2024: ${direction} ≈€${Math.abs(perResident)} per resident`;
}

export function renderLandMap(container: HTMLElement, selected: Place, onSelect: (place: Place) => void): void {
  container.replaceChildren();

  const projection = geoMercator().fitExtent(
    [
      [6, 6],
      [WIDTH - 6, MAP_HEIGHT - 6],
    ],
    collection as never,
  );
  const path = geoPath(projection);

  const svg = select(container)
    .append("svg")
    .attr("class", "land-map-svg")
    .attr("viewBox", `0 0 ${WIDTH} ${MAP_HEIGHT}`)
    .attr("role", "group")
    .attr(
      "aria-label",
      "Map of Germany, coloured by 2024 fiscal equalisation per resident. Click a Land to select it; click it again for all of Germany.",
    );

  svg
    .selectAll<SVGPathElement, LandFeature>("path")
    .data(collection.features)
    .join("path")
    .attr("class", (feature) => `land-shape${feature.properties.code === selected.code ? " is-selected" : ""}`)
    .attr("d", (feature) => path(feature as never))
    .attr("fill", (feature) => landFill(feature.properties.code))
    .attr("tabindex", 0)
    .attr("role", "button")
    .attr("aria-pressed", (feature) => String(feature.properties.code === selected.code))
    .attr("aria-label", (feature) => landTitle(feature))
    .on("click", (_event, feature) => {
      const next = feature.properties.code === selected.code ? GERMANY : getPlace(feature.properties.code);
      if (next) {
        onSelect(next);
      }
    })
    .on("keydown", (event: KeyboardEvent, feature) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        const next = feature.properties.code === selected.code ? GERMANY : getPlace(feature.properties.code);
        if (next) {
          onSelect(next);
        }
      }
    })
    .append("title")
    .text((feature) => landTitle(feature));

  const keySvg = select(container)
    .append("svg")
    .attr("class", "land-map-key-svg")
    .attr("viewBox", `0 0 ${WIDTH} ${KEY_HEIGHT}`)
    .attr("aria-hidden", "true");
  renderKey(keySvg);
}

/** Diverging scale key: what the Land colours mean, with € anchors. */
function renderKey(svg: ReturnType<typeof select<SVGSVGElement, unknown>>): void {
  const barX = 2;
  const barWidth = WIDTH - 2 * barX;
  const barY = 24;
  const barHeight = 9;

  const gradient = svg
    .append("defs")
    .append("linearGradient")
    .attr("id", "map-key-gradient")
    .attr("x1", "0%")
    .attr("x2", "100%");
  for (let i = 0; i <= 20; i += 1) {
    const value = -MAX_PER_RESIDENT + (i / 20) * 2 * MAX_PER_RESIDENT;
    const t = 0.12 + 0.88 * Math.sqrt(Math.min(1, Math.abs(value) / MAX_PER_RESIDENT));
    gradient
      .append("stop")
      .attr("offset", `${i * 5}%`)
      .attr("stop-color", value >= 0 ? mix(PAPER, RECEIVES, t) : mix(PAPER, PAYS, t));
  }

  const key = svg.append("g").attr("class", "map-key").attr("aria-hidden", "true");
  key
    .append("text")
    .attr("class", "map-key-title")
    .attr("x", barX)
    .attr("y", barY - 8)
    .text("Fiscal equalisation 2024, € per resident");
  key
    .append("rect")
    .attr("x", barX)
    .attr("y", barY)
    .attr("width", barWidth)
    .attr("height", barHeight)
    .attr("fill", "url(#map-key-gradient)")
    .attr("stroke", "currentColor")
    .attr("stroke-width", 0.4);
  key
    .append("line")
    .attr("x1", barX + barWidth / 2)
    .attr("x2", barX + barWidth / 2)
    .attr("y1", barY - 2)
    .attr("y2", barY + barHeight + 2)
    .attr("class", "map-key-zero");

  const labels: [number, string, string][] = [
    [barX, "start", `pays −€${MAX_PER_RESIDENT.toLocaleString("en")}`],
    [barX + barWidth / 2, "middle", "0"],
    [barX + barWidth, "end", `receives +€${MAX_PER_RESIDENT.toLocaleString("en")}`],
  ];
  for (const [x, anchor, text] of labels) {
    key
      .append("text")
      .attr("class", "map-key-label")
      .attr("x", x)
      .attr("y", barY + barHeight + 12)
      .attr("text-anchor", anchor)
      .text(text);
  }
}

export const mapAttribution = collection.attribution;
