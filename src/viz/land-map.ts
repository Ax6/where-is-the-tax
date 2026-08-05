import { geoMercator, geoPath } from "d3-geo";
import { select } from "d3-selection";

import laenderGeo from "../../data/geo/de-laender.json";
import { getPlace, type Place } from "../routes/places.ts";

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
const HEIGHT = 400;

export function renderLandMap(container: HTMLElement, selected: Place, onSelect: (place: Place) => void): void {
  container.replaceChildren();

  const projection = geoMercator().fitExtent(
    [
      [6, 6],
      [WIDTH - 6, HEIGHT - 6],
    ],
    collection as never,
  );
  const path = geoPath(projection);

  const svg = select(container)
    .append("svg")
    .attr("class", "land-map-svg")
    .attr("viewBox", `0 0 ${WIDTH} ${HEIGHT}`)
    .attr("role", "group")
    .attr("aria-label", "Choose your Land on the map of Germany");

  svg
    .selectAll<SVGPathElement, LandFeature>("path")
    .data(collection.features)
    .join("path")
    .attr("class", (feature) => `land-shape${feature.properties.code === selected.code ? " is-selected" : ""}`)
    .attr("d", (feature) => path(feature as never))
    .attr("tabindex", 0)
    .attr("role", "button")
    .attr("aria-pressed", (feature) => String(feature.properties.code === selected.code))
    .attr("aria-label", (feature) => `Select ${feature.properties.name}`)
    .on("click", (_event, feature) => {
      const place = getPlace(feature.properties.code);
      if (place) {
        onSelect(place);
      }
    })
    .on("keydown", (event: KeyboardEvent, feature) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        const place = getPlace(feature.properties.code);
        if (place) {
          onSelect(place);
        }
      }
    })
    .append("title")
    .text((feature) => feature.properties.name);
}

export const mapAttribution = collection.attribution;
