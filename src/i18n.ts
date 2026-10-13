/** UI strings (DE/EN) and number formatting. Data labels come from label.de/label.en in data/. */

export type Lang = "de" | "en";
export interface Bi {
  de: string;
  en: string;
}

export const bi = (de: string, en: string): Bi => ({ de, en });
export const tr = (text: Bi, lang: Lang): string => text[lang];

const ui = {
  title: bi("Wohin Steuern fließen · Deutschland 2024", "Where taxes go · Germany 2024"),
  description: bi(
    "Wohin Steuern und Abgaben in Deutschland fließen: vom eigenen Lohnzettel bis zum Staatshaushalt, aus amtlichen Quellen.",
    "Where taxes and contributions in Germany go: from your own payslip to the state's budget, from official sources.",
  ),
  wage: bi("Bruttolohn / Jahr", "Gross wage / year"),
  land: bi("Bundesland", "Land"),
  allLaender: bi("Alle Länder", "All Länder"),
  year: bi("Jahr", "Year"),
  zoom: bi("Ansicht", "View"),
  zoomYou: bi("Ich", "You"),
  zoomGermany: bi("Deutschland", "Germany"),
  language: bi("Sprache", "Language"),
  unit: bi("Einheit", "Unit"),
  unitBn: bi("Mrd. €", "€ bn"),
  unitDay: bi("€ pro Kopf und Tag", "€ per resident per day"),
  settings: bi("Einstellungen", "Settings"),
  close: bi("Schließen", "Close"),
  assumptions: bi(
    "Steuerklasse I · keine Kinder · keine Kirchensteuer · durchschnittlicher Zusatzbeitrag* · gesetzlich versichert · Arbeitnehmer (Beamte: anders)",
    "Tax class I · no children · no church tax · average additional health rate* · statutory insurance · employee (civil servants differ)",
  ),
  switchGermany: bi(
    "Alle Steuern und Beiträge, auch die, die niemand vom Lohn zahlt. Rechts: was der Staat eingenommen und ausgegeben hat.",
    "Every tax and contribution, including the ones not taken from wages. Right: what the state took in and spent.",
  ),
  stageGross: bi("Bruttolohn", "Gross wage"),
  stageDeductions: bi("Steuern und Beiträge", "Taxes and contributions"),
  stageRecipients: bi("Empfänger laut Gesetz", "Who receives it (by law)"),
  stagePots: bi("Haushalt, in den es fließt", "Total budget it goes into"),
  stageTaxes: bi("Eingenommene Steuern und Beiträge", "Taxes and contributions collected"),
  stateRevenue: bi("Einnahmen des Staates", "State revenue"),
  stateSpending: bi("Ausgaben des Staates", "State spending"),
  boundary: bi("Ab hier zusammengezählt mit dem Geld aller anderen", "From here summed with everyone else's money"),
  employerGhost: bi("zahlt Ihr Arbeitgeber zusätzlich", "paid on top by your employer"),
  netPay: bi("Netto: bleibt Ihnen", "Net pay: yours"),
  wageTax: bi("Lohnsteuer", "Wage tax"),
  soli: bi("Solidaritätszuschlag", "Solidarity surcharge"),
  joins: bi("fließen in", "goes into"),
  ofEvery100: bi("von je 100 €", "of every €100"),
  borrowed: bi("davon kreditfinanziert", "of which borrowed"),
  proRata: bi("anteilig*", "pro rata*"),
  proRataNote: bi(
    "* Annahme: Ihr Beitrag ist so aufgeteilt wie der ganze Topf „{pot}“.",
    "* Assuming your contribution is split the same way as the {pot}.",
  ),
  fenced: bi("nur für diese Versicherung (§ 30 SGB IV)", "only for this insurance (§ 30 SGB IV)"),
  generalBudget: bi("allgemeiner Haushalt", "general budget"),
  priceAssumed: bi("* Preis angenommen; Steuer je Einheit exakt nach Gesetz", "* price assumed; tax per unit exact by law"),
  taxShare: bi("Steuer", "tax"),
  statusLaw: bi("exakt nach Gesetz", "exact, by law"),
  statusOfficial: bi("amtlich", "official"),
  statusProvisional: bi("vorläufig", "provisional"),
  statusAssumption: bi("Annahme*", "assumption*"),
  statusEstimate: bi("Schätzung ≈*", "estimate ≈*"),
  clickForDetails: bi("Klicken: so funktioniert es, Aufschlüsselung, Quellen", "Click: how it works, breakdown, sources"),
  mechanism: bi("So funktioniert es", "How it works"),
  breakdown: bi("Eine Ebene tiefer", "One level deeper"),
  benchmarks: bi("Vergleich mit den anderen Ländern", "Compared with the other Länder"),
  sources: bi("Quellen", "Sources"),
  sourcesData: bi("Quellen und Daten", "Sources and data"),
  dataFile: bi("Datei", "File"),
  coordinates: bi("Fundstelle", "Where in the file"),
  mapTitle: bi("Finanzausgleich, € je Einwohner", "Fiscal equalisation, € per resident"),
  mapPays: bi("zahlt ein", "pays in"),
  mapReceives: bi("erhält", "receives"),
  mapNote: bi(
    "Die Umsatzsteuer-Verteilung plus alle Bundesergänzungszuweisungen. Eine gemeinsame Berechnung (kein Land zahlt an ein anderes).",
    "The VAT share-out plus all supplementary federal grants. One pooled calculation (no Land pays another).",
  ),
  mapNoteShort: bi("Eine gemeinsame Berechnung (kein Land zahlt an ein anderes).", "One pooled calculation (no Land pays another)."),
  mapClick: bi("Klick zeigt Ihren Fluss in diesem Land.", "Click to see your flow in this Land."),
  mapClickGermany: bi("Klick wählt das Land für die Ansicht „Ich“.", "Click to choose this Land for the “You” view."),
  taxesTitle: bi("Alle Steuern", "All taxes"),
  taxesCash: bi("Kassenmäßige Einnahmen vor Verteilung, Destatis 71211", "Cash receipts before distribution, Destatis 71211"),
  colTax: bi("Steuer", "Tax"),
  colSplit: bi("Gesetzliche Verteilung", "Legal split"),
  colKind: bi("Regel", "Rule"),
  showAll: bi("Alle Steuern zeigen", "Show all taxes"),
  timeTitle: bi("Über die Zeit", "Over time"),
  timeRevenueSpending: bi("Einnahmen und Ausgaben des Staates, Mrd. €", "State revenue and spending, € bn"),
  timeBalance: bi("Finanzierungssaldo, Mrd. €", "Net lending (+) / borrowing (−), € bn"),
  timeDebt: bi("Schuldenstand (Maastricht), Mrd. €", "Gross debt (Maastricht), € bn"),
  timeInterest: bi("Zinsausgaben, Mrd. €", "Interest paid, € bn"),
  revenue: bi("Einnahmen", "Revenue"),
  spending: bi("Ausgaben", "Spending"),
  esaNote: bi("Volkswirtschaftliche Gesamtrechnung (ESVG), Eurostat", "National accounts (ESA 2010), Eurostat"),
  footerStatus: bi(
    "Zahlen aus amtlichen Quellen, nachgerechnet und abgeglichen. * = Annahme oder bestreitbar · ≈ = Schätzung",
    "Figures from official sources, recomputed and reconciled. * = assumption or contestable · ≈ = estimate",
  ),
  repo: bi("Daten und Methode auf GitHub", "Data and method on GitHub"),
  perResidentDay: bi("pro Kopf und Tag", "per resident per day"),
  borrowedSeg: bi("Kredit", "Borrowed"),
  spendingTotal: bi("Ausgaben gesamt", "Total spending"),
  pooled: bi("Alle Einnahmen decken alle Ausgaben (§ 8 BHO)", "All revenue covers all spending (§ 8 BHO)"),
  legalShares: bi("Gesetzlicher Anteil", "Statutory share"),
  yours: bi("Ihr Anteil", "Your share"),
  amount: bi("Betrag", "Amount"),
  ticksMedian: bi("Median", "median"),
  ticksMinimumLong: bi("Mindestlohn, Vollzeit aufs Jahr gerechnet*", "Minimum wage, full-time per year*"),
  ticksMedianLong: bi("Median, Vollzeitbeschäftigte", "Median, full-time employees"),
  ticksAverageLong: bi("Durchschnitt, Vollzeitbeschäftigte", "Average, full-time employees"),
  estimateLabel: bi("≈ Steuern in dem, was Sie kaufen*", "≈ taxes in what you buy*"),
  estimateLegend: bi("gestrichelt ≈ = Schätzung* (Haushaltsklasse)", "dashed ≈ = estimate* (household class)"),
  receiptLabel: bi("Steuern in einem Kauf", "Taxes inside one purchase"),
  skip: bi("Zur Grafik springen", "Skip to the chart"),
  tableView: bi("Als Tabelle", "As a table"),
  pots: bi("Töpfe", "Pots"),
  employee: bi("Arbeitnehmer", "employee"),
  employer: bi("Arbeitgeber", "employer"),
  mapShort: bi("Finanzausgleich", "Fiscal equalisation"),
  mapAll: bi("Alle Länder · Land anklicken", "All Länder · click a Land"),
  mapDeselect: bi("nochmals klicken: alle Länder", "click again: all Länder"),
  ranking: bi("Rangfolge", "Ranking"),
  themeDarkName: bi("Dunkles Design", "Dark theme"),
  patternsName: bi("Muster statt nur Farben", "Patterns instead of colour alone"),
  shoppingChip: bi("Einkauf ≈", "Shopping ≈"),
  shoppingTitle: bi("Steuern in dem, was Sie kaufen", "Taxes in what you buy"),
  purchasesHeading: bi("Steuern in einem Einkauf*", "Taxes inside one purchase*"),
  purchasesCaption: bi("* Preis angenommen · Steuer je Einheit exakt nach Gesetz", "* price assumed · tax per unit exact by law"),
  yoursColumn: bi("≈ Ihr Anteil*", "≈ your share*"),
  ofYours: bi("von Ihren", "of yours"),
  proRataIfYour: bi(
    "Annahme: Ihre {eur} sind so aufgeteilt wie der ganze Topf „{pot}“.",
    "Assuming your {eur} are split the same way as the {pot}.",
  ),
  provisionalTag: bi("vorläufig", "provisional"),
  sameWage2026: bi("Gleicher Lohn 2026: {X} netto", "Same wage in 2026: {X} net"),
  wageType: bi("Genauen Bruttolohn eingeben", "Type an exact gross wage"),
  estimateToggle: bi("≈ Schätzung*", "≈ estimate*"),
  estimateToggleName: bi("Schätzung der Steuern auf Einkäufe zeigen", "Show the estimate of taxes on purchases"),
  highlightName: bi("Wege hervorheben: {X}", "Highlight flows: {X}"),
  ticksMinimumShort: bi("Min.*", "min*"),
  ticksAverageShort: bi("Ø", "avg"),
  euLeaves: bi("verlässt den deutschen Staat: EU-Haushalt", "leaves the German state: EU budget"),
};

export type UiKey = keyof typeof ui;
export const titleFor = (year: number, lang: Lang): string => (lang === "de" ? `Wohin Steuern fließen · Deutschland ${year}` : `Where taxes go · Germany ${year}`);
export const fill = (text: string, value: string): string => text.replace("{X}", value);

/**
 * Year/status tag, shown only when it differs from the selected year or the figure is provisional:
 * "2022", "2024", "2025 provisional". Same-year final figures get no tag (the drawer has it).
 */
export function yearTag(year: number, status: string, selectedYear: number, lang: Lang): string {
  const provisional = status === "provisional";
  if (year === selectedYear && !provisional) {
    return "";
  }
  return provisional ? `${year} ${ui.provisionalTag[lang]}` : String(year);
}
export const t = (key: UiKey, lang: Lang): string => ui[key][lang];

const locale = (lang: Lang): string => (lang === "de" ? "de-DE" : "en-GB");

const cache = new Map<string, Intl.NumberFormat>();
function nf(lang: Lang, min: number, max: number): Intl.NumberFormat {
  const key = `${lang}-${min}-${max}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale(lang), { minimumFractionDigits: min, maximumFractionDigits: max });
    cache.set(key, f);
  }
  return f;
}

export const num = (value: number, lang: Lang, digits = 0): string => nf(lang, digits, digits).format(value);

/** Whole euros: "€45,358" / "45.358 €". */
export function eur(value: number, lang: Lang, digits = 0): string {
  const sign = value < 0 ? "−" : "";
  const body = nf(lang, digits, digits).format(Math.abs(value));
  return lang === "de" ? `${sign}${body} €` : `${sign}€${body}`;
}

/** Billions from euros: "€465.7bn" / "465,7 Mrd. €". */
export function bn(valueEur: number, lang: Lang, digits = 1): string {
  const sign = valueEur < 0 ? "−" : "";
  const body = nf(lang, digits, digits).format(Math.abs(valueEur) / 1e9);
  return lang === "de" ? `${sign}${body} Mrd. €` : `${sign}€${body}bn`;
}

/** Compact money: bn above 1e9, m above 1e6, else whole euros. */
export function money(valueEur: number, lang: Lang): string {
  const abs = Math.abs(valueEur);
  if (abs >= 1e9) {
    return bn(valueEur, lang, abs >= 100e9 ? 1 : abs >= 10e9 ? 1 : 2);
  }
  if (abs >= 1e6) {
    const sign = valueEur < 0 ? "−" : "";
    const body = nf(lang, 0, 0).format(abs / 1e6);
    return lang === "de" ? `${sign}${body} Mio. €` : `${sign}€${body}m`;
  }
  return eur(valueEur, lang, abs < 10 ? 2 : 0);
}

export function pct(share: number, lang: Lang, digits = 1): string {
  const body = nf(lang, digits, digits).format(share * 100);
  return lang === "de" ? `${body} %` : `${body}%`;
}
