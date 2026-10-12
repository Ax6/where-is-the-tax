/**
 * Statutory payslip engine (tax class I/IV, no church tax, statutory insurance in all four branches).
 *
 * Every constant is read from data/de/citizen/payslip-parameters.json. Arithmetic is done in integer
 * cents (BigInt) so the statute's roundings (§ 32a EStG, § 4 SolzG, PAP Vorsorgepauschale) are exact.
 * tests/payslip.test.ts reproduces every row of data/de/citizen/payslip-examples.json.
 */

export interface PayslipParameters {
  years: Record<string, YearParameters>;
}

interface Valued {
  value: number;
}

interface YearParameters {
  tariff: { zones: { zone: number; from: number; to: number | null; formula: string; y?: string; z?: string }[] };
  soli: { rate: Valued; freigrenze: Valued; milderungszone_factor: Valued };
  wage_tax_allowances: {
    arbeitnehmer_pauschbetrag: Valued;
    sonderausgaben_pauschbetrag: Valued;
    vorsorgepauschale: { rule: string; kv_rate_used: Valued; zusatzbeitrag_used: Valued };
  };
  social_insurance: {
    rv: { employee_share: number; employer_share: number; ceiling_annual: Valued };
    alv: { employee_share: number; employer_share: number };
    kv: { employee_share: number; employer_share: number; ceiling_annual: Valued; zusatzbeitrag_average: Valued };
    pv: { employee_share: number; employer_share: number; childless_surcharge: Valued };
  };
}

export interface PayslipRow {
  gross: number;
  deductions_employee: { lohnsteuer: number; soli: number; rv: number; alv: number; kv: number; pv: number };
  employer_contributions: { rv: number; alv: number; kv: number; pv: number };
  totals: { taxes: number; social_employee: number; social_employer: number; net: number; employer_total_cost: number };
  effective_rates: {
    lohnsteuer_pct: number;
    soli_pct: number;
    social_employee_pct: number;
    deductions_total_pct: number;
    net_pct: number;
    social_employer_pct_of_gross: number;
  };
  per_100_gross: { lohnsteuer: number; soli: number; rv: number; alv: number; kv: number; pv: number; net: number };
  intermediate: {
    arbeitnehmer_pauschbetrag: number;
    sonderausgaben_pauschbetrag: number;
    vorsorgepauschale: number;
    vorsorgepauschale_rv: number;
    vorsorgepauschale_kv_pv: number;
    vorsorgepauschale_rule: string;
    zu_versteuernder_jahresbetrag: number;
    contribution_base_rv_alv: number;
    contribution_base_kv_pv: number;
  };
}

/**
 * The Vorsorgepauschale caps live only in the prose `rule` of the parameters file (no structured field):
 * 2024/2025 "12 % of the wage, at most 1 900 EUR"; 2026 "KV/PV + ALV share, together capped at 1 900 EUR".
 * tests/payslip.test.ts asserts that the rule text still states these values.
 */
export const VORSORGE_MIN_RATE_MILLI = 12_000n; // 12 %, in thousandths of a percent
export const VORSORGE_CAP_CENTS = 190_000n; // 1 900 EUR

const RATE_DEN = 100_000n; // rates are held as thousandths of a percent: 9.3 % -> 9300

const rate = (percent: number): bigint => BigInt(Math.round(percent * 1000));
const cents = (euros: number): bigint => BigInt(Math.round(euros * 100));
const min = (a: bigint, b: bigint): bigint => (a < b ? a : b);
const max = (a: bigint, b: bigint): bigint => (a > b ? a : b);

/** base × rate, truncated to the cent (ROUND_DOWN). */
const floorCent = (baseCents: bigint, r: bigint): bigint => (baseCents * r) / RATE_DEN;
/** base × rate, commercially rounded to the cent (ROUND_HALF_UP). */
const roundCent = (baseCents: bigint, r: bigint): bigint => (baseCents * r + RATE_DEN / 2n) / RATE_DEN;
/** Cents rounded up / down to full euros, returned in cents. */
const ceilEur = (c: bigint): bigint => ((c + 99n) / 100n) * 100n;
const floorEur = (c: bigint): bigint => (c / 100n) * 100n;
const eur = (c: bigint): number => Number(c) / 100;

/** "954.80" -> 95480n (cents). */
function decimalCents(text: string): bigint {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(text.trim());
  if (!match) {
    throw new Error(`Unexpected tariff constant "${text}".`);
  }
  return BigInt(match[1]!) * 100n + BigInt((match[2] ?? "").padEnd(2, "0"));
}

interface Tariff {
  zones: { to: bigint | null; eval: (x: bigint) => bigint }[];
}

/** Parses the five § 32a zones from their formula strings. Values are whole euros. */
function parseTariff(zones: YearParameters["tariff"]["zones"]): Tariff {
  return {
    zones: zones.map((zone) => {
      const to = zone.to === null ? null : BigInt(zone.to);
      if (zone.formula.trim() === "0") {
        return { to, eval: () => 0n };
      }
      const progressive = /^\(([\d.]+) \* ([yz]) \+ ([\d.]+)\) \* \2(?: \+ ([\d.]+))?$/.exec(zone.formula.trim());
      if (progressive) {
        const offsetText = (progressive[2] === "y" ? zone.y : zone.z) ?? "";
        const offsetMatch = /^\(x - (\d+)\) \/ 10000$/.exec(offsetText.trim());
        if (!offsetMatch) {
          throw new Error(`Unexpected zone offset "${offsetText}".`);
        }
        const a = decimalCents(progressive[1]!);
        const b = decimalCents(progressive[3]!);
        const c = progressive[4] ? decimalCents(progressive[4]) : 0n;
        const lower = BigInt(offsetMatch[1]!);
        // (a·d/10⁴ + b)·d/10⁴ + c with a, b, c in cents: ((a·d + b·10⁴)·d + c·10⁸) / 10¹⁰, floored to euros.
        return { to, eval: (x: bigint) => (((a * (x - lower) + b * 10_000n) * (x - lower)) + c * 100_000_000n) / 10_000_000_000n };
      }
      const linear = /^([\d.]+) \* x - ([\d.]+)$/.exec(zone.formula.trim());
      if (linear) {
        const r = decimalCents(linear[1]!);
        const c = decimalCents(linear[2]!);
        return { to, eval: (x: bigint) => (r * x - c) / 100n };
      }
      throw new Error(`Unexpected tariff formula "${zone.formula}".`);
    }),
  };
}

/** Tarifliche Einkommensteuer for taxable income x (whole euros), § 32a Abs. 1 EStG. */
function tariffTax(tariff: Tariff, x: bigint): bigint {
  for (const zone of tariff.zones) {
    if (zone.to === null || x <= zone.to) {
      return zone.eval(x);
    }
  }
  throw new Error("Tariff zones do not cover the income.");
}

/**
 * Python's round(value, 2): correct rounding of the binary value, ties to even.
 * Ties at two decimals exist only for multiples of 1/8 with an odd numerator (x.125, x.375, ...).
 */
export function pyRound2(value: number): number {
  const eighths = value * 8;
  if (Number.isInteger(eighths) && Math.abs(eighths % 2) === 1) {
    const hundredths = Math.floor(value * 100); // exact: value has at most three decimals
    const lower = hundredths % 2 === 0 ? hundredths : hundredths + 1;
    return lower / 100;
  }
  return Number(value.toFixed(2));
}

export interface PayslipOptions {
  /** Childless employee aged 23+ pays the PV surcharge (§ 55 Abs. 3 SGB XI). Default true. */
  childless?: boolean;
}

export function availableYears(params: PayslipParameters): number[] {
  return Object.keys(params.years).map(Number).sort((a, b) => a - b);
}

export function computePayslip(params: PayslipParameters, year: number, grossEuros: number, options: PayslipOptions = {}): PayslipRow {
  const p = params.years[String(year)];
  if (!p) {
    throw new Error(`No payslip parameters for ${year}.`);
  }
  const childless = options.childless ?? true;
  const si = p.social_insurance;
  const allowances = p.wage_tax_allowances;
  const vspRule = allowances.vorsorgepauschale.rule;

  const wage = cents(grossEuros);
  const baseRv = min(wage, cents(si.rv.ceiling_annual.value));
  const baseKv = min(wage, cents(si.kv.ceiling_annual.value));

  const pvEmployee = rate(si.pv.employee_share) + (childless ? rate(si.pv.childless_surcharge.value) : 0n);

  // Vorsorgepauschale (§ 39b Abs. 2 S. 5 Nr. 3 EStG via PAP): KV uses the reduced rate's employee half.
  const kvVsp = rate(allowances.vorsorgepauschale.kv_rate_used.value) + rate(allowances.vorsorgepauschale.zusatzbeitrag_used.value) / 2n;
  const vspRv = floorCent(baseRv, rate(si.rv.employee_share));
  const vspKvPv = floorCent(baseKv, kvVsp + pvEmployee);
  const vspMain = ceilEur(vspKvPv + vspRv);
  let vspAlternative: bigint;
  let ruleLabel: string;
  if (/12 % of the wage/.test(vspRule)) {
    const minimum = min(floorCent(baseRv, VORSORGE_MIN_RATE_MILLI), VORSORGE_CAP_CENTS);
    vspAlternative = ceilEur(vspRv + minimum);
    ruleLabel = "rv + max(kv+pv, min(12% wage, 1900))";
  } else if (/unemployment contribution/.test(vspRule)) {
    const vspAlv = floorCent(baseRv, rate(si.alv.employee_share));
    vspAlternative = ceilEur(vspRv + min(vspAlv + vspKvPv, VORSORGE_CAP_CENTS));
    ruleLabel = "rv + max(kv+pv, min(kv+pv+alv, 1900))";
  } else {
    throw new Error(`Unrecognised Vorsorgepauschale rule for ${year}.`);
  }
  const vsp = max(vspMain, vspAlternative);

  const anp = min(cents(allowances.arbeitnehmer_pauschbetrag.value), ceilEur(wage));
  const sap = cents(allowances.sonderausgaben_pauschbetrag.value);
  const zve = wage - anp - sap - vsp;
  const x = zve >= 100n ? floorEur(zve) : 0n;
  const lohnsteuer = tariffTax(parseTariff(p.tariff.zones), x / 100n) * 100n;

  const freigrenze = cents(p.soli.freigrenze.value);
  const soli =
    lohnsteuer <= freigrenze
      ? 0n
      : min(floorCent(lohnsteuer, rate(p.soli.rate.value)), floorCent(lohnsteuer - freigrenze, rate(p.soli.milderungszone_factor.value)));

  const employee = {
    rv: roundCent(baseRv, rate(si.rv.employee_share)),
    alv: roundCent(baseRv, rate(si.alv.employee_share)),
    kv: roundCent(baseKv, rate(si.kv.employee_share)),
    pv: roundCent(baseKv, pvEmployee),
  };
  const employer = {
    rv: roundCent(baseRv, rate(si.rv.employer_share)),
    alv: roundCent(baseRv, rate(si.alv.employer_share)),
    kv: roundCent(baseKv, rate(si.kv.employer_share)),
    pv: roundCent(baseKv, rate(si.pv.employer_share)),
  };
  const socialEmployee = employee.rv + employee.alv + employee.kv + employee.pv;
  const socialEmployer = employer.rv + employer.alv + employer.kv + employer.pv;
  const taxes = lohnsteuer + soli;
  const net = wage - taxes - socialEmployee;

  const per100 = (c: bigint): number => pyRound2((eur(c) / grossEuros) * 100);

  return {
    gross: grossEuros,
    deductions_employee: {
      lohnsteuer: eur(lohnsteuer),
      soli: eur(soli),
      rv: eur(employee.rv),
      alv: eur(employee.alv),
      kv: eur(employee.kv),
      pv: eur(employee.pv),
    },
    employer_contributions: { rv: eur(employer.rv), alv: eur(employer.alv), kv: eur(employer.kv), pv: eur(employer.pv) },
    totals: {
      taxes: eur(taxes),
      social_employee: eur(socialEmployee),
      social_employer: eur(socialEmployer),
      net: eur(net),
      employer_total_cost: eur(wage + socialEmployer),
    },
    effective_rates: {
      lohnsteuer_pct: per100(lohnsteuer),
      soli_pct: per100(soli),
      social_employee_pct: per100(socialEmployee),
      deductions_total_pct: per100(taxes + socialEmployee),
      net_pct: per100(net),
      social_employer_pct_of_gross: per100(socialEmployer),
    },
    per_100_gross: {
      lohnsteuer: per100(lohnsteuer),
      soli: per100(soli),
      rv: per100(employee.rv),
      alv: per100(employee.alv),
      kv: per100(employee.kv),
      pv: per100(employee.pv),
      net: per100(net),
    },
    intermediate: {
      arbeitnehmer_pauschbetrag: eur(anp),
      sonderausgaben_pauschbetrag: eur(sap),
      vorsorgepauschale: eur(vsp),
      vorsorgepauschale_rv: eur(vspRv),
      vorsorgepauschale_kv_pv: eur(vspKvPv),
      vorsorgepauschale_rule: ruleLabel,
      zu_versteuernder_jahresbetrag: eur(x),
      contribution_base_rv_alv: eur(baseRv),
      contribution_base_kv_pv: eur(baseKv),
    },
  };
}
