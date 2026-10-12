/** Taxes inside one purchase: a 100 % bar per example, segments coloured by legal recipient. */
import type { LayerId, Purchase } from "../data/model.ts";
import { eur, pct, t, tr, type Lang } from "../i18n.ts";
import { hideTooltip, showTooltip } from "./tooltip.ts";

export function renderReceipts(
  container: HTMLElement,
  items: Purchase[],
  options: { lang: Lang; layers: Set<LayerId>; isolated: LayerId | null; onOpen: (id: string) => void },
): void {
  const { lang } = options;
  container.replaceChildren();
  const shown = items.filter((item) => options.layers.has(item.layer));
  container.hidden = shown.length === 0;
  container.classList.toggle("is-isolated", options.isolated !== null && options.isolated !== "payday");
  const list = document.createElement("ul");
  list.className = "receipt-list";
  list.setAttribute("aria-label", t("receiptLabel", lang));
  for (const item of shown) {
    const li = document.createElement("li");
    li.className = "receipt";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "receipt-button";
    const name = document.createElement("span");
    name.className = "receipt-name";
    name.textContent = `${tr(item.label, lang)}*`;
    const share = document.createElement("span");
    share.className = "receipt-share num";
    share.textContent = `${pct(item.taxShare, lang, 0)} ${t("taxShare", lang)}`;
    const bar = document.createElement("span");
    bar.className = "receipt-bar";
    bar.setAttribute("aria-hidden", "true");
    for (const seg of item.segments) {
      const part = document.createElement("span");
      part.className = `receipt-seg${seg.entity ? "" : " is-price"}`;
      part.style.flexGrow = String(seg.value);
      if (seg.entity) {
        part.style.background = `var(--e-${seg.entity})`;
        part.dataset.entity = seg.entity;
      }
      bar.append(part);
    }
    const tax = item.segments.filter((seg) => seg.entity).reduce((sum, seg) => sum + seg.value, 0);
    const lines = item.segments.map((seg) => `${tr(seg.label, lang)}: ${eur(seg.value, lang, seg.value < 10 ? 2 : 0)}`);
    // accessible name starts with the visible text: "<purchase>* <share> tax"
    button.setAttribute("aria-label", `${name.textContent} ${share.textContent}. ${lines.join(". ")}. ${t("priceAssumed", lang)}`);
    const tip = (x: number, y: number) =>
      showTooltip({ value: `${eur(tax, lang, tax < 10 ? 2 : 0)} (${pct(item.taxShare, lang, 1)})`, title: tr(item.label, lang), lines, status: "law", body: `${t("priceAssumed", lang)}. ${t("vatPool", lang)}: ${lang === "de" ? "Ergebnis 2024" : "2024 outcome"}.` }, { x, y }, lang);
    button.addEventListener("pointerenter", (event) => tip(event.clientX, event.clientY));
    button.addEventListener("pointermove", (event) => tip(event.clientX, event.clientY));
    button.addEventListener("pointerleave", hideTooltip);
    button.addEventListener("focus", () => {
      const box = button.getBoundingClientRect();
      tip(box.left, box.bottom);
    });
    button.addEventListener("blur", hideTooltip);
    button.addEventListener("click", () => options.onOpen(item.id));
    button.append(name, bar, share);
    li.append(button);
    list.append(li);
  }
  const note = document.createElement("p");
  note.className = "receipt-note";
  note.textContent = `${t("receiptLabel", lang)} · ${t("priceAssumed", lang)}`;
  container.append(list, note);
}
