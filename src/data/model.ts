import type { DatasetBundle } from "./load.ts";
import type { DatasetRow, ProvenanceRecord } from "./schema.ts";

export interface MoneyNode extends DatasetRow {
  amount: number;
  children: MoneyNode[];
  shareOfParent: number | null;
  shareOfSide: number | null;
}

export interface ExplorerSide {
  total: number;
  nodes: MoneyNode[];
  coverage: DatasetRow[];
  maxAmount: number;
}

export interface ExplorerModel {
  bundle: DatasetBundle;
  revenue: ExplorerSide;
  expenditure: ExplorerSide;
  balance: number;
  balanceLabel: "Net lending" | "Net borrowing" | "Balanced";
}

function displayedValue(provenance: ProvenanceRecord | undefined, id: string): number {
  if (!provenance || provenance.kind === "unavailable") {
    throw new Error(`Headline provenance ${id} has no displayed value.`);
  }
  return provenance.displayed_value;
}

function buildSide(rows: DatasetRow[], total: number): ExplorerSide {
  const coverage = rows.filter((row) => row.parent_id === null && row.availability !== "available");
  const available = rows.filter(
    (row): row is DatasetRow & { amount: number } => row.availability === "available" && row.amount !== null,
  );
  const nodes = new Map<string, MoneyNode>();

  for (const row of available) {
    if (nodes.has(row.id)) {
      throw new Error(`Duplicate row id ${row.id}.`);
    }
    nodes.set(row.id, {
      ...row,
      amount: row.amount,
      children: [],
      shareOfParent: null,
      shareOfSide: total === 0 ? null : row.amount / total,
    });
  }

  for (const node of nodes.values()) {
    if (node.parent_id === null) {
      continue;
    }
    const parent = nodes.get(node.parent_id);
    if (!parent) {
      throw new Error(`Available row ${node.id} has missing available parent ${node.parent_id}.`);
    }
    node.shareOfParent = parent.amount === 0 ? null : node.amount / parent.amount;
    parent.children.push(node);
  }

  for (const node of nodes.values()) {
    node.children.sort((left, right) => right.amount - left.amount || left.name.localeCompare(right.name));
  }

  const topLevel = [...nodes.values()]
    .filter((node) => node.parent_id === null)
    .sort((left, right) => right.amount - left.amount || left.name.localeCompare(right.name));

  return {
    total,
    nodes: topLevel,
    coverage,
    maxAmount: Math.max(0, ...topLevel.map(({ amount }) => Math.abs(amount))),
  };
}

export function buildExplorerModel(bundle: DatasetBundle): ExplorerModel {
  const provenance = new Map(bundle.provenance.map((record) => [record.id, record]));
  const revenueTotal = displayedValue(provenance.get(bundle.meta.headline.revenue_provenance_id), bundle.meta.headline.revenue_provenance_id);
  const expenditureTotal = displayedValue(
    provenance.get(bundle.meta.headline.expenditure_provenance_id),
    bundle.meta.headline.expenditure_provenance_id,
  );
  const balance = displayedValue(provenance.get(bundle.meta.headline.balance_provenance_id), bundle.meta.headline.balance_provenance_id);

  return {
    bundle,
    revenue: buildSide(bundle.revenue, revenueTotal),
    expenditure: buildSide(bundle.expenditure, expenditureTotal),
    balance,
    balanceLabel: balance < 0 ? "Net borrowing" : balance > 0 ? "Net lending" : "Balanced",
  };
}
