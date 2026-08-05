/** The 16 Länder as selectable places. City-states are Land + municipality at once. */

export interface Place {
  code: string;
  name: string;
  cityState: boolean;
}

export const places: Place[] = [
  { code: "BW", name: "Baden-Württemberg", cityState: false },
  { code: "BY", name: "Bayern", cityState: false },
  { code: "BE", name: "Berlin", cityState: true },
  { code: "BB", name: "Brandenburg", cityState: false },
  { code: "HB", name: "Bremen", cityState: true },
  { code: "HH", name: "Hamburg", cityState: true },
  { code: "HE", name: "Hessen", cityState: false },
  { code: "MV", name: "Mecklenburg-Vorpommern", cityState: false },
  { code: "NI", name: "Niedersachsen", cityState: false },
  { code: "NW", name: "Nordrhein-Westfalen", cityState: false },
  { code: "RP", name: "Rheinland-Pfalz", cityState: false },
  { code: "SL", name: "Saarland", cityState: false },
  { code: "SN", name: "Sachsen", cityState: false },
  { code: "ST", name: "Sachsen-Anhalt", cityState: false },
  { code: "SH", name: "Schleswig-Holstein", cityState: false },
  { code: "TH", name: "Thüringen", cityState: false },
];

export function getPlace(code: string): Place | undefined {
  return places.find((place) => place.code === code.toUpperCase());
}

export const BERLIN = getPlace("BE")!;
