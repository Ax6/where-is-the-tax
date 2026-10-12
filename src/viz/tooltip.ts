/** One shared tooltip. Content is set with textContent only (labels come from data files). */
import type { Status } from "../data/model.ts";
import { t, type Lang } from "../i18n.ts";

export interface TooltipContent {
  value?: string;
  title: string;
  lines?: string[];
  status?: Status;
  /** the pro rata* line, drawn with the hatch key */
  prorata?: string;
  body?: string;
  hint?: boolean;
}

let element: HTMLDivElement | null = null;

function ensure(): HTMLDivElement {
  if (!element) {
    element = document.createElement("div");
    element.className = "tip";
    element.setAttribute("role", "tooltip");
    element.hidden = true;
    document.body.append(element);
  }
  return element;
}

const STATUS_KEY = { law: "statusLaw", official: "statusOfficial", provisional: "statusProvisional", assumption: "statusAssumption", estimate: "statusEstimate" } as const;

export function statusLabel(status: Status, lang: Lang): string {
  return t(STATUS_KEY[status], lang);
}

export function tooltipText(content: TooltipContent, lang: Lang): string {
  return [content.value, content.title, ...(content.lines ?? []), content.prorata ?? "", content.status ? statusLabel(content.status, lang) : "", content.body ?? ""]
    .filter(Boolean)
    .join(". ");
}

function add(parent: HTMLElement, tag: string, className: string, text: string): HTMLElement {
  const el = document.createElement(tag);
  el.className = className;
  el.textContent = text;
  parent.append(el);
  return el;
}

export function showTooltip(content: TooltipContent, anchor: { x: number; y: number }, lang: Lang): void {
  const tip = ensure();
  tip.replaceChildren();
  if (content.value) {
    add(tip, "p", "tip-value", content.value);
  }
  add(tip, "p", "tip-title", content.title);
  for (const line of content.lines ?? []) {
    add(tip, "p", "tip-line", line);
  }
  if (content.prorata) {
    add(tip, "p", "tip-line tip-prorata", content.prorata);
  }
  if (content.status) {
    const badge = add(tip, "span", "badge", statusLabel(content.status, lang));
    badge.dataset.status = content.status;
  }
  if (content.body) {
    add(tip, "p", "tip-body", content.body);
  }
  if (content.hint) {
    add(tip, "p", "tip-hint", t("clickForDetails", lang));
  }
  tip.hidden = false;
  const margin = 14;
  const rect = tip.getBoundingClientRect();
  let x = anchor.x + margin;
  let y = anchor.y + margin;
  if (x + rect.width + margin > window.innerWidth) {
    x = Math.max(margin, anchor.x - rect.width - margin);
  }
  if (y + rect.height + margin > window.innerHeight) {
    y = Math.max(margin, anchor.y - rect.height - margin);
  }
  tip.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
}

export function hideTooltip(): void {
  if (element) {
    element.hidden = true;
  }
}
