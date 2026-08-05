/**
 * Verified 2024 per-Land figures for the VAT/equalisation route.
 *
 * Extracted from the official BMF equalisation calculation (Abrechnung
 * Ausgleichsjahr 2024, Anlage 1) and the BMF April-2025 Monatsbericht (general
 * supplementary grants), and independently reproduced on 2026-08-05:
 * - vat_base_meur: row 10.3, Land share of VAT (population share + Festbetrag)
 * - equalisation_meur: row 15.10, Zu-/Abschläge im Finanzkraftausgleich
 * - supplementary_grants_meur: allgemeine Bundesergänzungszuweisungen
 * BMF describes the 2024 calculation as based on the provisional annual account.
 */

export interface LandFigures {
  code: string;
  vatBaseMeur: number;
  equalisationMeur: number;
  supplementaryGrantsMeur: number;
  /** Einwohner 30.06.2024 (Anlage 1, row 1). */
  population: number;
}

/** Total VAT allocated in 2024, € millions (incl. import VAT). */
export const VAT_TOTAL_MEUR = 302143.338;
/** Länder pool total, € millions (row 10.3 Insgesamt). */
export const VAT_LAENDER_POOL_MEUR = 148378.868;

export const landFigures: LandFigures[] = [
  { code: "NW", vatBaseMeur: 32022.578, equalisationMeur: 847.032, supplementaryGrantsMeur: 197, population: 18023024 },
  { code: "BY", vatBaseMeur: 23457.004, equalisationMeur: -9773.933, supplementaryGrantsMeur: 0, population: 13202127 },
  { code: "BW", vatBaseMeur: 19973.146, equalisationMeur: -5038.159, supplementaryGrantsMeur: 0, population: 11241334 },
  { code: "NI", vatBaseMeur: 14231.745, equalisationMeur: 1537.297, supplementaryGrantsMeur: 633, population: 8009945 },
  { code: "HE", vatBaseMeur: 11151.035, equalisationMeur: -3735.519, supplementaryGrantsMeur: 0, population: 6276052 },
  { code: "SN", vatBaseMeur: 7190.542, equalisationMeur: 3252.06, supplementaryGrantsMeur: 1483, population: 4046998 },
  { code: "RP", vatBaseMeur: 7337.142, equalisationMeur: 523.552, supplementaryGrantsMeur: 200, population: 4129508 },
  { code: "ST", vatBaseMeur: 3800.615, equalisationMeur: 1815.971, supplementaryGrantsMeur: 829, population: 2139071 },
  { code: "SH", vatBaseMeur: 5255.219, equalisationMeur: 267.475, supplementaryGrantsMeur: 93, population: 2957755 },
  { code: "TH", vatBaseMeur: 3745.931, equalisationMeur: 2043.494, supplementaryGrantsMeur: 937, population: 2108294 },
  { code: "BB", vatBaseMeur: 4539.874, equalisationMeur: 1441.715, supplementaryGrantsMeur: 649, population: 2555143 },
  { code: "MV", vatBaseMeur: 2799.396, equalisationMeur: 1427.788, supplementaryGrantsMeur: 653, population: 1575563 },
  { code: "SL", vatBaseMeur: 1799.847, equalisationMeur: 629.886, supplementaryGrantsMeur: 285, population: 1012994 },
  { code: "BE", vatBaseMeur: 6526.007, equalisationMeur: 3942.99, supplementaryGrantsMeur: 1797, population: 3672983 },
  { code: "HH", vatBaseMeur: 3300.13, equalisationMeur: -106.346, supplementaryGrantsMeur: 0, population: 1857387 },
  { code: "HB", vatBaseMeur: 1248.657, equalisationMeur: 924.696, supplementaryGrantsMeur: 424, population: 702772 },
];

/** Equalisation effect per resident, €/person (positive = receives). */
export function equalisationPerResident(figures: LandFigures): number {
  return (figures.equalisationMeur * 1_000_000) / figures.population;
}

export function getLandFigures(code: string): LandFigures | undefined {
  return landFigures.find((entry) => entry.code === code.toUpperCase());
}
