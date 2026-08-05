import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { renderSpendingAccount, type SpendingAccount } from "../src/ui/spending.ts";

async function loadAccount(): Promise<SpendingAccount & { unassigned_eur: number; source_sha256: string }> {
  const raw = await readFile("data/de/2024/accounts/federal-functions.json", "utf8");
  return JSON.parse(raw);
}

test("the federal spending account reconciles and carries provenance", async () => {
  const account = await loadAccount();

  assert.equal(account.reference_year, 2024);
  assert(account.total_eur > 400e9 && account.total_eur < 550e9, "total outside plausible range");
  const groupSum = account.groups.reduce((sum, group) => sum + group.amount_eur, 0) + account.unassigned_eur;
  assert(Math.abs(groupSum - account.total_eur) <= account.groups.length + 1, "groups must reconcile to total");
  assert(account.groups.length >= 8);
  assert(account.source_sha256.length === 64);
  assert(account.source.url.startsWith("https://www.bundeshaushalt.de/"));
  for (const group of account.groups) {
    assert(group.description.trim().length > 0, `${group.code}: description required`);
    assert(group.amount_eur > 0, `${group.code}: amounts must be positive`);
  }
  const [largest] = account.groups;
  assert(largest && largest.code === "2", "social security should be the largest federal block");
});

test("the spending renderer shows totals, shares, and the source", async () => {
  const account = await loadAccount();
  const html = renderSpendingAccount(account);

  assert.match(html, /Federal budget — actual spending 2024/);
  assert.match(html, /Social security/);
  assert.match(html, /bundeshaushalt\.de/);
  assert.match(html, /Whole budget: €475bn/);
  assert.doesNotMatch(html, /undefined/);
});
