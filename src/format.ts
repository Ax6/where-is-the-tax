const generalNumber = new Intl.NumberFormat("en", { maximumFractionDigits: 2 });
const millionsNumber = new Intl.NumberFormat("en", { maximumFractionDigits: 1 });
const billionsNumber = [0, 1, 2].map(
  (digits) => new Intl.NumberFormat("en", { minimumFractionDigits: digits, maximumFractionDigits: digits }),
);
const percentNumber = new Intl.NumberFormat("en", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function formatMoney(amount: number, amountUnit: string): string {
  if (amountUnit !== "million EUR") {
    return `${generalNumber.format(amount)} ${amountUnit}`;
  }

  const absolute = Math.abs(amount);
  const sign = amount < 0 ? "−" : "";

  if (absolute >= 1_000) {
    const digits = absolute >= 100_000 ? 0 : absolute >= 10_000 ? 1 : 2;
    const formatter = billionsNumber[digits];
    if (!formatter) {
      throw new Error(`Unsupported billion-format precision: ${digits}.`);
    }
    return `${sign}€${formatter.format(absolute / 1_000)}bn`;
  }

  return `${sign}€${millionsNumber.format(absolute)}m`;
}

export function formatShare(amount: number, total: number): string {
  if (total === 0) {
    return "—";
  }

  return percentNumber.format(amount / total);
}

export function formatStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1).replaceAll("_", " ");
}
