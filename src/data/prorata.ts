/**
 * "Your € per year, pro rata*": your exact euros into each budget × that budget's own spending shares, summed
 * across budgets by common category (src/data/categories.ts). The ≈* household estimate is kept as a separate
 * part, never mixed into the exact amounts. Always worded conditionally: "if spread like these budgets".
 */
import type { Bi } from "../i18n.ts";
import { COMMON, type CommonId } from "./categories.ts";
import type { EntityId, YouModel } from "./model.ts";

export interface ProRataPart {
  potId: string;
  entity: EntityId;
  label: Bi;
  year: number;
  exact: number;
  estimate: number;
}

export interface ProRataRow {
  id: CommonId;
  label: Bi;
  exact: number;
  estimate: number;
  byPot: ProRataPart[];
  /** categories folded into this row (only for "other") */
  merged?: CommonId[];
}

export interface ProRata {
  rows: ProRataRow[];
  total: number;
  estimateTotal: number;
  years: [number, number];
}

/** Share of each common category in a pot's own spending (shares sum to 1). */
export function potShares(spending: { value: number; common: CommonId }[]): Map<CommonId, number> {
  const total = spending.reduce((sum, line) => sum + line.value, 0);
  const shares = new Map<CommonId, number>();
  for (const line of spending) {
    shares.set(line.common, (shares.get(line.common) ?? 0) + line.value / total);
  }
  return shares;
}

export function proRata(you: YouModel, cap = 6): ProRata {
  const rows = new Map<CommonId, ProRataRow>(COMMON.map((c) => [c.id, { id: c.id, label: c.label, exact: 0, estimate: 0, byPot: [] }]));
  const years: number[] = [];
  let total = 0;
  let estimateTotal = 0;
  for (const pot of you.pots) {
    const exact = you.inflow[pot.id] ?? 0;
    const estimate = pot.recipients.reduce((sum, id) => sum + (you.flow.nodes.find((node) => node.id === id)?.estimate ?? 0), 0);
    if (exact <= 0 && estimate <= 0) {
      continue;
    }
    years.push(pot.year);
    total += exact;
    estimateTotal += estimate;
    for (const [common, share] of potShares(pot.spending)) {
      const row = rows.get(common)!;
      row.exact += exact * share;
      row.estimate += estimate * share;
      row.byPot.push({ potId: pot.id, entity: pot.entity, label: pot.label, year: pot.year, exact: exact * share, estimate: estimate * share });
    }
  }
  // biggest first; beyond `cap` rows, categories fold into "other"
  const sorted = [...rows.values()].filter((row) => row.id !== "other" && row.exact + row.estimate > 0).sort((a, b) => b.exact - a.exact);
  const kept = sorted.slice(0, cap);
  const other = rows.get("other")!;
  const folded = sorted.slice(cap);
  const otherRow: ProRataRow = {
    ...other,
    exact: other.exact + folded.reduce((sum, row) => sum + row.exact, 0),
    estimate: other.estimate + folded.reduce((sum, row) => sum + row.estimate, 0),
    byPot: [...other.byPot, ...folded.flatMap((row) => row.byPot)],
    merged: folded.map((row) => row.id),
  };
  return {
    rows: otherRow.exact + otherRow.estimate > 0 ? [...kept, otherRow] : kept,
    total,
    estimateTotal,
    years: [Math.min(...years), Math.max(...years)],
  };
}
