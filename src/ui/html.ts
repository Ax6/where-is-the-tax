/** HTML string helpers shared by the browser and the build-time static page. */
import type { EntityId, SourceLink, Status } from "../data/model.ts";
import { repoBlob } from "../data/sources.ts";
import { t, tr, type Lang } from "../i18n.ts";

export function esc(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

const STATUS_KEY = { law: "statusLaw", official: "statusOfficial", provisional: "statusProvisional", assumption: "statusAssumption", estimate: "statusEstimate" } as const;
export const badge = (status: Status, lang: Lang): string => `<span class="badge" data-status="${status}">${esc(t(STATUS_KEY[status], lang))}</span>`;

export const swatch = (entity?: EntityId, extra = ""): string =>
  `<span class="swatch ${extra}"${entity ? ` data-entity="${entity}" style="background:var(--e-${entity})"` : ""} aria-hidden="true"></span>`;

/** A horizontal 100 % bar from parts (HTML, no SVG): used in drawers and tables. */
export function splitBar(parts: { entity?: EntityId; share: number; cls?: string }[], height = 10): string {
  return `<span class="split-bar" style="height:${height}px" aria-hidden="true">${parts
    .filter((part) => part.share > 0)
    .map(
      (part) =>
        `<span class="split-seg ${part.cls ?? ""}"${part.entity ? ` data-entity="${part.entity}"` : ""} style="flex-grow:${part.share.toFixed(5)};${part.entity ? `background:var(--e-${part.entity})` : ""}"></span>`,
    )
    .join("")}</span>`;
}

export function sourceList(sources: SourceLink[], lang: Lang): string {
  const seen = new Set<string>();
  const items = sources.filter((source) => {
    const key = `${source.file}|${source.url ?? ""}|${source.coordinates ?? ""}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
  return `<ul class="source-list">${items
    .map(
      (source) => `<li>
        ${source.url ? `<a href="${esc(source.url)}" rel="noreferrer noopener" target="_blank">${esc(tr(source.label, lang))}</a>` : esc(tr(source.label, lang))}
        <span class="source-meta"><a href="${esc(repoBlob(source.file))}" rel="noreferrer noopener" target="_blank"><code>${esc(source.file)}</code></a>${
          source.coordinates ? ` · ${esc(source.coordinates)}` : ""
        }</span>
      </li>`,
    )
    .join("")}</ul>`;
}
