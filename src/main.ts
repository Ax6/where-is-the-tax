import "./styles.css";

import { demoBundle } from "./demo.ts";
import type { DatasetSide } from "./data/schema.ts";
import { renderDetail, type DetailRequest } from "./ui/detail.ts";

document.documentElement.classList.add("enhanced");

const viewButtons = [...document.querySelectorAll<HTMLButtonElement>("[data-view]")];
const viewPanels = [...document.querySelectorAll<HTMLElement>("[data-view-panel]")];
document.querySelector<HTMLElement>(".view-switch")?.removeAttribute("hidden");

for (const button of viewButtons) {
  button.addEventListener("click", () => {
    const selectedView = button.dataset.view;
    for (const candidate of viewButtons) {
      candidate.setAttribute("aria-pressed", String(candidate === button));
    }
    for (const panel of viewPanels) {
      panel.hidden = panel.dataset.viewPanel !== selectedView;
    }
  });
}

const dialog = document.querySelector<HTMLDialogElement>("#detail-dialog");
const dialogContent = dialog?.querySelector<HTMLElement>("[data-dialog-content]");
let detailTrigger: HTMLElement | null = null;

function datasetSide(value: string | undefined): DatasetSide | undefined {
  return value === "revenue" || value === "expenditure" ? value : undefined;
}

function openDetail(trigger: HTMLElement, request: DetailRequest): void {
  if (!dialog || !dialogContent) {
    return;
  }
  detailTrigger = trigger;
  dialogContent.innerHTML = renderDetail(demoBundle, request);
  dialog.showModal();
}

document.querySelector<HTMLElement>("#app")?.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) {
    return;
  }
  const trigger = event.target.closest<HTMLElement>("[data-detail-id], [data-provenance-id]");
  if (!trigger) {
    return;
  }
  event.preventDefault();
  openDetail(trigger, trigger.dataset.detailId
    ? { side: datasetSide(trigger.dataset.detailSide), rowId: trigger.dataset.detailId }
    : { provenanceId: trigger.dataset.provenanceId });
});

dialog?.addEventListener("close", () => {
  detailTrigger?.focus();
  detailTrigger = null;
});
