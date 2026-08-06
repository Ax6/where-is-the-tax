import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { renderSpendingChips, renderSpendingPanel, type SpendingAccount, type SpendingEntry } from "../src/ui/spending.ts";

async function loadAccount(path: string): Promise<SpendingAccount & { unassigned_eur: number; source_sha256?: string }> {
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw);
}

async function loadEntries(): Promise<SpendingEntry[]> {
  const berlin = await loadAccount("data/de/2024/accounts/berlin-functions.json");
  const federal = await loadAccount("data/de/2024/accounts/federal-functions.json");
  return [
    { key: "berlin", shortName: "Berlin", account: berlin, inflow: { eur: 2902642000, routeLabel: "Gewerbesteuer" } },
    { key: "federation", shortName: "Federal", account: federal },
  ];
}

test("the federal spending account reconciles and carries provenance", async () => {
  const account = await loadAccount("data/de/2024/accounts/federal-functions.json");

  assert.equal(account.reference_year, 2024);
  assert(account.total_eur > 400e9 && account.total_eur < 550e9, "total outside plausible range");
  const groupSum = account.groups.reduce((sum, group) => sum + group.amount_eur, 0) + account.unassigned_eur;
  assert(Math.abs(groupSum - account.total_eur) <= account.groups.length + 1, "groups must reconcile to total");
  assert(account.groups.length >= 8);
  assert(account.source_sha256?.length === 64);
  assert(account.source.url.startsWith("https://www.bundeshaushalt.de/"));
  for (const group of account.groups) {
    assert(group.description.trim().length > 0, `${group.code}: description required`);
    assert(group.amount_eur > 0, `${group.code}: amounts must be positive`);
  }
  const [largest] = account.groups;
  assert(largest && largest.code === "2", "social security should be the largest federal block");
});

test("the Berlin spending account reconciles to the cent, including subgroups", async () => {
  const account = (await loadAccount("data/de/2024/accounts/berlin-functions.json")) as SpendingAccount & {
    unassigned_eur: number;
    groups: (SpendingAccount["groups"][number] & { children?: { amount_eur: number }[] })[];
  };

  assert.equal(account.total_eur, 40463642070.51);
  const groupSum = account.groups.reduce((sum, group) => sum + group.amount_eur, 0);
  assert(Math.abs(groupSum - account.total_eur) < 0.02, "groups must reconcile to the cent");
  for (const group of account.groups) {
    if (group.children) {
      const childSum = group.children.reduce((sum, child) => sum + child.amount_eur, 0);
      assert(Math.abs(childSum - group.amount_eur) < 0.02, `${group.code}: children must reconcile`);
    }
    assert(group.description.trim().length > 0);
  }
  const [largest] = account.groups;
  assert(largest && largest.code === "2", "social security should be Berlin's largest block");
});

test("the benchmark tick compares shares against the other budget, percent only", async () => {
  const [berlin, federal] = await loadEntries();
  const html = renderSpendingPanel(berlin!, federal!);

  assert.match(html, /spend-tick spend-tick-federation/);
  assert.match(html, /\(fed \d+(\.\d+)?%\)/);
  assert.match(html, /Marker: the same category's share of the Federal budget/);
  assert.doesNotMatch(html, /fed €/);
});

test("the panel shows one budget with its bridge, total, and source", async () => {
  const [berlin] = await loadEntries();
  const html = renderSpendingPanel(berlin!);

  assert.match(html, /Berlin budget — actual spending 2024/);
  assert.match(html, /Whole budget: €40\.5bn/);
  assert.match(html, /Gewerbesteuer.*delivered €2\.90bn.*7\.2% of it/);
  assert.match(html, /spend-seg-berlin/);
  assert.doesNotMatch(html, /spend-seg-federation/);
  assert.match(html, /parlament-berlin\.de/);
  assert.doesNotMatch(html, /undefined/);
});

test("chips offer both budgets and mark the active one", async () => {
  const entries = await loadEntries();
  const html = renderSpendingChips(entries, "berlin");

  assert.match(html, /data-spend-mode="berlin" aria-pressed="true"/);
  assert.match(html, /data-spend-mode="federation" aria-pressed="false"/);
  assert.match(html, /Berlin budget · €40\.5bn/);
  assert.match(html, /Federal budget · €475bn/);
});
