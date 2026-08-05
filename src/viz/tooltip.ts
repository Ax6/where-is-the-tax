import { STATUS_LABELS, type EvidenceStatus } from "../routes/data.ts";

export interface TooltipContent {
  title: string;
  official?: string;
  meta?: string;
  kind?: string;
  status: EvidenceStatus;
  description: string;
  amountNote?: string;
}

let element: HTMLDivElement | null = null;

function ensureElement(): HTMLDivElement {
  if (element) {
    return element;
  }
  element = document.createElement("div");
  element.className = "fg-tooltip";
  element.setAttribute("role", "status");
  element.hidden = true;
  document.body.append(element);
  return element;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function tooltipText(content: TooltipContent): string {
  const parts = [content.title];
  if (content.official) {
    parts.push(`officially ${content.official}`);
  }
  if (content.meta) {
    parts.push(content.meta);
  }
  if (content.kind) {
    parts.push(content.kind);
  }
  parts.push(STATUS_LABELS[content.status]);
  parts.push(content.description);
  if (content.amountNote) {
    parts.push(content.amountNote);
  }
  return parts.join(". ");
}

export function showTooltip(content: TooltipContent, anchor: { x: number; y: number }): void {
  const tip = ensureElement();
  tip.innerHTML = `
    <p class="fg-tooltip-title">${escapeHtml(content.title)}${
      content.official ? ` <em>· ${escapeHtml(content.official)}</em>` : ""
    }</p>
    ${content.meta ? `<p class="fg-tooltip-meta">${escapeHtml(content.meta)}</p>` : ""}
    <p class="fg-tooltip-badges">${
      content.kind ? `<span class="fg-badge fg-badge-kind">${escapeHtml(content.kind)}</span>` : ""
    }<span class="fg-badge fg-badge-status" data-status="${escapeHtml(content.status)}">${escapeHtml(
      STATUS_LABELS[content.status],
    )}</span></p>
    <p class="fg-tooltip-body">${escapeHtml(content.description)}</p>
    ${content.amountNote ? `<p class="fg-tooltip-note">${escapeHtml(content.amountNote)}</p>` : ""}
    <p class="fg-tooltip-hint">Click for sources &amp; caveats</p>`;
  tip.hidden = false;

  const margin = 14;
  const { innerWidth, innerHeight } = window;
  const rect = tip.getBoundingClientRect();
  let x = anchor.x + margin;
  let y = anchor.y + margin;
  if (x + rect.width + margin > innerWidth) {
    x = Math.max(margin, anchor.x - rect.width - margin);
  }
  if (y + rect.height + margin > innerHeight) {
    y = Math.max(margin, anchor.y - rect.height - margin);
  }
  tip.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
}

export function hideTooltip(): void {
  if (element) {
    element.hidden = true;
  }
}
