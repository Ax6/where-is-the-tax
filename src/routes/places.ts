/** The 16 Länder as selectable places. City-states are Land + municipality at once. */

export interface Place {
  code: string;
  name: string;
  cityState: boolean;
  /**
   * True where the municipal tax shares accrue to the Land itself
   * (§7 GemFinRefG: Berlin and Hamburg — not Bremen, whose two cities
   * are ordinary municipalities).
   */
  municipalMerged: boolean;
  /** True for the whole-Germany aggregate view. */
  national?: boolean;
}

export const GERMANY: Place = { code: "DE", name: "Germany", cityState: false, municipalMerged: false, national: true };

export const places: Place[] = [
  { code: "BW", name: "Baden-Württemberg", cityState: false , municipalMerged: false },
  { code: "BY", name: "Bayern", cityState: false , municipalMerged: false },
  { code: "BE", name: "Berlin", cityState: true , municipalMerged: true },
  { code: "BB", name: "Brandenburg", cityState: false , municipalMerged: false },
  { code: "HB", name: "Bremen", cityState: true , municipalMerged: false },
  { code: "HH", name: "Hamburg", cityState: true , municipalMerged: true },
  { code: "HE", name: "Hessen", cityState: false , municipalMerged: false },
  { code: "MV", name: "Mecklenburg-Vorpommern", cityState: false , municipalMerged: false },
  { code: "NI", name: "Niedersachsen", cityState: false , municipalMerged: false },
  { code: "NW", name: "Nordrhein-Westfalen", cityState: false , municipalMerged: false },
  { code: "RP", name: "Rheinland-Pfalz", cityState: false , municipalMerged: false },
  { code: "SL", name: "Saarland", cityState: false , municipalMerged: false },
  { code: "SN", name: "Sachsen", cityState: false , municipalMerged: false },
  { code: "ST", name: "Sachsen-Anhalt", cityState: false , municipalMerged: false },
  { code: "SH", name: "Schleswig-Holstein", cityState: false , municipalMerged: false },
  { code: "TH", name: "Thüringen", cityState: false , municipalMerged: false },
];

export function getPlace(code: string): Place | undefined {
  if (code.toUpperCase() === GERMANY.code) {
    return GERMANY;
  }
  return places.find((place) => place.code === code.toUpperCase());
}

export const BERLIN = getPlace("BE")!;
