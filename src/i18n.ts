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
  docTitle: bi("Wohin Steuern fließen", "Where taxes go"),
  description: bi(
    "Wohin Steuern und Abgaben in Deutschland fließen: vom eigenen Lohnzettel bis zum Staatshaushalt, aus amtlichen Quellen.",
    "Where taxes and contributions in Germany go: from your own payslip to the state's budget, from official sources.",
  ),
  wage: bi("Bruttolohn / Jahr", "Gross wage / year"),
  land: bi("Bundesland", "Land"),
  allLaender: bi("Alle Länder", "All Länder"),
  year: bi("Lohnjahr", "Payslip year"),
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
  switchYou: bi(
    "Ein Lohn, nach Gesetz berechnet. Die Töpfe rechts: Haushalte, die dieses Geld aufnehmen.",
    "One wage, computed from the law. The pots on the right: the budgets this money joins.",
  ),
  switchGermany: bi(
    "Alle Steuern und Beiträge, auch die, die niemand direkt vom Lohn zahlt. Rechts: der ganze Staat, konsolidiert.",
    "All taxes and contributions, including those no one pays from a wage. Right: the whole state, consolidated.",
  ),
  stageGross: bi("Bruttolohn", "Gross wage"),
  stageDeductions: bi("Steuern und Beiträge", "Taxes and contributions"),
  stageRecipients: bi("Wer es bekommt (per Gesetz)", "Who receives it (by law)"),
  stagePots: bi("Gesamthaushalt, in den es fließt", "Total budget it goes into"),
  stageTaxes: bi("Steuern und Beiträge (Kasse)", "Taxes and contributions (cash)"),
  stateRevenue: bi("Einnahmen des Staates", "State revenue"),
  stateSpending: bi("Ausgaben des Staates", "State spending"),
  boundary: bi("Ab hier mit allen anderen Einnahmen vermischt", "From here on, mixed with all other income"),
  employerGhost: bi("zahlt Ihr Arbeitgeber zusätzlich", "paid on top by your employer"),
  netPay: bi("Netto: bleibt Ihnen", "Net pay: yours"),
  wageTax: bi("Lohnsteuer", "Wage tax"),
  soli: bi("Solidaritätszuschlag", "Solidarity surcharge"),
  contribution: bi("Beitrag", "contribution"),
  joins: bi("fließen in", "joins"),
  ofEvery100: bi("von je 100 €", "of every €100"),
  transferOut: bi("weitergereicht an Renten- und Krankenversicherung", "passed on to pension and health insurance"),
  transferIn: bi("aus dem Bundeshaushalt", "from the federal budget"),
  transferToOthers: bi("an andere Sozialversicherungen", "paid to other social insurers"),
  borrowed: bi("davon kreditfinanziert", "of which borrowed"),
  proRata: bi("anteilig*", "pro rata*"),
  proRataNote: bi(
    "* anteilig: wenn Ihr Beitrag so verteilt wäre wie dieser Haushalt. Geld im Haushalt trägt keine Herkunft.",
    "* pro rata: if your contribution were spread like this budget. Money in a budget carries no origin.",
  ),
  fenced: bi("zweckgebundener Topf (§ 30 SGB IV)", "fenced pool (§ 30 SGB IV)"),
  generalBudget: bi("allgemeiner Haushalt", "general budget"),
  layerPayday: bi("Lohn", "Payday"),
  layerShopping: bi("Einkauf ≈", "Shopping ≈"),
  layerFuel: bi("Sprit und Strom ≈", "Fuel & energy ≈"),
  layerHome: bi("Wohnung ≈", "Home ≈"),
  layersLabel: bi("Ebenen", "Layers"),
  priceAssumed: bi("* Preis angenommen; Steuer je Einheit exakt nach Gesetz", "* price assumed; tax per unit exact by law"),
  taxShare: bi("Steuer", "tax"),
  priceRest: bi("Preis ohne Steuer", "price before tax"),
  vatPool: bi("Umsatzsteuer: Bund / Länder-Topf / Gemeinden", "VAT: Federation / Länder pool / municipalities"),
  statusLaw: bi("exakt nach Gesetz", "exact law"),
  statusOfficial: bi("amtlich", "official"),
  statusProvisional: bi("vorläufig", "provisional"),
  statusAssumption: bi("Annahme*", "assumption*"),
  statusEstimate: bi("Schätzung ≈*", "estimate ≈*"),
  clickForDetails: bi("Klicken: Mechanismus, Aufschlüsselung, Quellen", "Click: mechanism, breakdown, sources"),
  mechanism: bi("Mechanismus", "Mechanism"),
  breakdown: bi("Eine Ebene tiefer", "One level deeper"),
  benchmarks: bi("Vergleich mit den anderen Ländern", "Compared with the other Länder"),
  sources: bi("Quellen", "Sources"),
  sourcesData: bi("Quellen und Daten", "Sources and data"),
  dataFile: bi("Datei", "File"),
  coordinates: bi("Fundstelle", "Coordinates"),
  mapTitle: bi("Finanzausgleich, € je Einwohner", "Fiscal equalisation, € per resident"),
  mapPays: bi("zahlt ein", "pays in"),
  mapReceives: bi("erhält", "receives"),
  mapNote: bi(
    "Finanzkraftausgleich in der Umsatzsteuerverteilung plus alle Bundesergänzungszuweisungen. Ein gemeinsamer Topf: keine Zahlung von Land zu Land.",
    "Fiscal capacity equalisation inside the VAT distribution plus all supplementary federal grants. One pooled calculation: no payment from one Land to another.",
  ),
  mapClick: bi("Klick zeigt Ihren Fluss in diesem Land.", "Click to see your flow in this Land."),
  taxesTitle: bi("Alle Steuern", "All taxes"),
  taxesCash: bi("Kassenmäßige Einnahmen vor Verteilung, Destatis 71211", "Cash receipts before distribution, Destatis 71211"),
  colTax: bi("Steuer", "Tax"),
  colAmount: bi("2024", "2024"),
  colSplit: bi("Gesetzliche Verteilung", "Legal split"),
  colKind: bi("Regel", "Rule"),
  showAll: bi("Alle Steuern zeigen", "Show all taxes"),
  timeTitle: bi("Über die Zeit", "Over time"),
  timeRevenueSpending: bi("Einnahmen und Ausgaben des Staates, Mrd. €", "State revenue and spending, € bn"),
  timeBalance: bi("Finanzierungssaldo, Mrd. €", "Net lending (+) / borrowing (−), € bn"),
  timeDebt: bi("Schuldenstand (Maastricht), Mrd. €", "Gross debt (Maastricht), € bn"),
  timeInterest: bi("Zinsausgaben, Mrd. €", "Interest paid, € bn"),
  timeTaxes: bi("Steuereinnahmen (Kasse), Mrd. €", "Tax receipts (cash), € bn"),
  revenue: bi("Einnahmen", "Revenue"),
  spending: bi("Ausgaben", "Spending"),
  esaNote: bi("Volkswirtschaftliche Gesamtrechnung (ESVG), Eurostat", "National accounts (ESA 2010), Eurostat"),
  footerStatus: bi(
    "Zahlen aus amtlichen Quellen, nachgerechnet und abgeglichen. * = Annahme oder bestreitbar · ≈ = Schätzung",
    "Figures from official sources, recomputed and reconciled. * = assumption or contestable · ≈ = estimate",
  ),
  repo: bi("Daten und Methode auf GitHub", "Data and method on GitHub"),
  noscript: bi("Die interaktive Ansicht braucht JavaScript. Alle Zahlen stehen in den Tabellen.", "The interactive view needs JavaScript. All figures are in the tables."),
  perResidentDay: bi("pro Kopf und Tag", "per resident per day"),
  borrowedSeg: bi("Kredit", "Borrowed"),
  taxesSeg: bi("Steuern", "Taxes"),
  contributionsSeg: bi("Sozialbeiträge", "Social contributions"),
  otherRevenueSeg: bi("Sonstige Einnahmen", "Other revenue"),
  spendingTotal: bi("Ausgaben gesamt", "Total spending"),
  pooled: bi("Alle Einnahmen decken alle Ausgaben (§ 8 BHO)", "All revenue covers all spending (§ 8 BHO)"),
  legalShares: bi("Gesetzlicher Anteil", "Statutory share"),
  yours: bi("Ihr Anteil", "Your share"),
  amount: bi("Betrag", "Amount"),
  share: bi("Anteil", "Share"),
  ticksMinimum: bi("Mindestlohn*", "min. wage*"),
  ticksMedian: bi("Median", "median"),
  ticksAverage: bi("Durchschnitt", "average"),
  ticksDouble: bi("2× Durchschnitt", "2× average"),
  ticksMinimumLong: bi("Mindestlohn, Vollzeit aufs Jahr gerechnet*", "Minimum wage, full-time per year*"),
  ticksMedianLong: bi("Median, Vollzeitbeschäftigte", "Median, full-time employees"),
  ticksAverageLong: bi("Durchschnitt, Vollzeitbeschäftigte", "Average, full-time employees"),
  ticksDoubleLong: bi("2× Durchschnitt, Vollzeitbeschäftigte", "2× average, full-time employees"),
  estimateLabel: bi("≈ Steuern in dem, was Sie kaufen*", "≈ taxes in what you buy*"),
  estimateLegend: bi("gestrichelt ≈ = Schätzung* (Haushaltsklasse)", "dashed ≈ = estimate* (household class)"),
  estimateLine: bi("≈ {X} im Jahr an Umsatz- und Verbrauchsteuern auf Ihre Einkäufe*", "≈ {X} a year in VAT and excise on what you buy*"),
  receiptLabel: bi("Steuern in einem Kauf", "Taxes inside one purchase"),
  skip: bi("Zur Grafik springen", "Skip to the chart"),
  tableView: bi("Als Tabelle", "As a table"),
  pots: bi("Töpfe", "Pots"),
  legendHatch: bi("schraffiert = anteilig*, nicht einzeln zuordenbar", "hatched = pro rata*, not individually traceable"),
  totalLabel: bi("gesamt", "total"),
  germanyResidents: bi("Einwohner 31.12.2024", "residents 31 Dec 2024"),
  selectPot: bi("Topf wählen", "Select pot"),
  employee: bi("Arbeitnehmer", "employee"),
  employer: bi("Arbeitgeber", "employer"),
  display: bi("Darstellung", "Display"),
  themeLight: bi("Hell", "Light"),
  themeDark: bi("Dunkel", "Dark"),
  patterns: bi("Muster", "Patterns"),
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
  proRataHeading: bi("≈ Ihre € im Jahr, anteilig*", "≈ Your € per year, pro rata*"),
  proRataShares: bi("Anteile", "shares"),
  proRataIf: bi("wenn verteilt wie diese Haushalte", "if spread like these budgets"),
  provisionalTag: bi("vorläufig", "provisional"),
  sameWage2026: bi("Gleicher Lohn 2026: {X} netto", "Same wage in 2026: {X} net"),
  wageType: bi("Genauen Bruttolohn eingeben", "Type an exact gross wage"),
  estimateToggle: bi("≈ Schätzung*", "≈ estimate*"),
  estimateToggleName: bi("Schätzung der Steuern auf Einkäufe zeigen", "Show the estimate of taxes on purchases"),
  proRataLegend: bi("anteilig*", "pro rata*"),
  highlightName: bi("Wege hervorheben: {X}", "Highlight flows: {X}"),
  ticksMinimumShort: bi("Mindestl.*", "min*"),
  ticksAverageShort: bi("Durchschn.", "avg"),
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
