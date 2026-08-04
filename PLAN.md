# where-is-the-tax — Project Plan

One page that answers, for your country and a given year: **where does tax money come from,
and where does it go?**

Starting with Germany as the case study, expanding country by country. Fully static,
open-source, open-data, hosted free on GitHub Pages.

---

## 1. Vision & principles

Official budget data exists, but it is scattered across statistical offices, written in
administrative jargon ("Solidaritätszuschlag", "COFOG division 10"), and almost never shows
both sides of the ledger in one place. This project puts the whole picture on one page.

Principles — these are commitments, not aspirations:

1. **Every number carries a source.** Each row in our data files has a URL pointing to the
   official publication it came from, plus the date it was retrieved. Every figure on the site
   is one click away from its source.
2. **Plain language first.** Every entry has a 1–3 sentence description a non-expert can
   understand. Official names are shown too ("officially: *Solidaritätszuschlag*"), but the
   explanation leads.
3. **Honest visualization.** No fabricated flows, no implied precision the data doesn't have.
   Provisional figures are badged as such. Deficits are shown, not hidden.
4. **Reproducible data pipeline.** Data is collected roughly once a year via AI deep-research
   sessions. The research prompts, collection playbook, and QA checklist live in this repo, so
   anyone can audit or reproduce a dataset.
5. **Data is a first-class citizen.** The `data/` directory sits at the repo root. Most
   contributors and users will care about the CSVs, not the TypeScript.
6. **Free and static.** No backend, no tracking, no accounts. Vite + TypeScript + D3, deployed
   to GitHub Pages.

## 2. Prior art & the gap

| Project | What it does well | What's missing |
|---|---|---|
| [bundeshaushalt.de](https://www.bundeshaushalt.de) (official, BMF) | Both revenue and expenditure, interactive, plain-language "Erklärwelt" section | **Federal budget only** — no states, municipalities, or social insurance (i.e., most of the money) |
| [steuertransparenz.de](https://steuertransparenz.de) | Personalized "where did my income tax + VAT go", federal + state | Expenditure only, personalized rather than the aggregate picture |
| offenerhaushalt.de (OKF Germany) | Federal expenditure treemap for citizens | Discontinued; expenditure only |
| [OpenSpending / Where Does My Money Go](https://app.wheredoesmymoneygo.org/) (UK) | Pioneered the citizen budget-viz pattern | Largely legacy/unmaintained |
| [USAFacts](https://usafacts.org/articles/tax-receipt/) / [National Priorities Project](https://www.nationalpriorities.org/interactive-data/taxday/) tax receipts | Personalized spending receipts | Spend side only, US federal only |

**The gap we fill:** no existing project combines (a) *general government* scope — all levels
of government plus social insurance, which is where most of the money actually is, (b) revenue
**and** expenditure linked in one view, (c) plain-language explanations, and (d) a
cross-country comparable category vocabulary. That combination is this project.

## 3. Scope & data model

### What counts as "the money"

**Consolidated general government** (ESA 2010 definition): federal + state + municipal
governments **plus social insurance funds**, with transfers between them netted out. Social
insurance contributions are included — they are ~40% of what leaves a German paycheck, and any
"where does my money go" picture that omits pensions and health insurance is misleading.
Expenditure is broken down by **function** (COFOG: health, education, defence, social
protection, …), not by ministry — functions are what people actually ask about, and they are
standardized across countries.

### Files

```
data/
├── index.json              # hand-edited list of available {country, year} datasets; CI-verified
└── de/
    └── 2024/
        ├── meta.json       # country, year, currency, population, expected totals, quality notes
        ├── revenue.csv     # where money comes from
        └── expenditure.csv # where money goes
```

Two CSVs per country-year with **identical columns** (the filename encodes the side). The two
sides come from different statistical tables and are researched separately; keeping them apart
keeps diffs clean and lets one side update without touching the other.

`meta.json` example:

```json
{
  "country": "DE",
  "country_name": "Germany",
  "year": 2024,
  "scope": "general_government",
  "currency": "EUR",
  "amount_unit": "millions",
  "population": 83500000,
  "population_source_url": "https://www.destatis.de/...",
  "gdp_millions": 4310000,
  "expected_total_revenue": 1978000,
  "expected_total_expenditure": 2083000,
  "data_quality_notes": "Final ESA figures; COFOG breakdown final as of the 2026 release.",
  "last_updated": "2026-08-05"
}
```

`expected_total_*` are the headline totals straight from the primary source; the validator
cross-checks them against the sum of top-level rows — the cheapest defense against a
fat-fingered zero. `population` powers the per-capita toggle; `gdp_millions` a future
%-of-GDP toggle.

### CSV schema

Hierarchy is a flat adjacency list: `id` + `parent_id`, maximum depth 3.
Level 1 = sankey nodes, levels 2–3 = treemap drill-down.

| Column | Type | Required | Meaning |
|---|---|---|---|
| `id` | slug | yes | Unique within file. **Stable across years** (enables future year-over-year comparison). |
| `parent_id` | slug | no | Empty = top-level (sankey) row. Must reference an existing `id`. |
| `name` | string | yes | Plain-English display name. |
| `name_official` | string | no | Official/native name (e.g. `Solidaritätszuschlag`), shown as "officially: …". |
| `amount` | number | yes | In **millions** of the dataset currency (declared in `meta.json`). |
| `description` | string | yes | 1–3 plain-language sentences: what this is, who pays / who benefits. **The soul of the project — the validator rejects empty descriptions.** |
| `quality` | enum | yes | `actual` \| `provisional` \| `estimate` \| `forecast`. The UI badges anything non-actual. |
| `source_name` | string | yes | Human-readable source, e.g. "Destatis, government finance statistics". |
| `source_url` | URL | yes | Deep link (https) to the page/table the number came from. One per row, no exceptions. |
| `source_date` | string | yes | Reference date/publication of the figure (`2024` or `2025-01`). |
| `retrieved_date` | ISO date | yes | When the researcher fetched it. |
| `notes` | string | no | Caveats: "cash basis", "includes X", consolidation decisions. |

**Amount semantics:** every row carries its own amount as reported by its source — parent
amounts are authoritative, never computed from children. Children must sum to ≤ parent (0.5%
tolerance, validator-enforced); any shortfall renders as a derived "Other / unallocated" tile.
This is honest about official breakdowns being incomplete, and it lets a solid parent total
ship before all children are researched.

### Fixed top-level vocabulary (the comparability anchor)

Level-1 `id`s and names are **fixed for all countries** and enforced by the validator.
National color only appears at level 2 and below.

- **Revenue** (ESA 2010-aligned, lay-friendly names): `income_wealth_taxes` (taxes on income &
  wealth), `production_import_taxes` (VAT & taxes on goods/production), `social_contributions`,
  `capital_taxes`, `other_revenue` (fees, sales, property income).
- **Expenditure**: the 10 COFOG divisions — `social_protection`, `health`, `education`,
  `economic_affairs`, `general_public_services`, `defence`, `public_order_safety`,
  `environment_protection`, `housing_community`, `recreation_culture_religion`.

Rule of thumb, enforced in the playbook: 5–10 top-level nodes per side; anything small nests
under an "other" category *in the data*, never lumped at render time.

### Example rows (illustrative magnitudes — real figures come from the collection phase)

`data/de/2024/revenue.csv`:

```csv
id,parent_id,name,name_official,amount,description,quality,source_name,source_url,source_date,retrieved_date,notes
income_wealth_taxes,,Taxes on income & wealth,Steuern auf Einkommen und Vermögen,510000,"Taxes on what people and companies earn and own — wage tax, assessed income tax, corporate tax, and smaller wealth-related taxes.",actual,Destatis government finance statistics,https://www.destatis.de/...,2024,2026-08-05,
lohnsteuer,income_wealth_taxes,Wage tax,Lohnsteuer,250000,"Income tax withheld directly from employees' paychecks by their employer. For most workers this is the main income tax they pay.",actual,BMF tax revenue statistics,https://www.bundesfinanzministerium.de/...,2025-01,2026-08-05,"Cash receipts; shared between federal, state and municipal levels by fixed quotas."
soli,income_wealth_taxes,Solidarity surcharge,Solidaritätszuschlag,13000,"A 5.5% surcharge on income and corporate tax, introduced in 1991 to fund German reunification. Since 2021 only high earners and companies pay it.",actual,BMF tax revenue statistics,https://www.bundesfinanzministerium.de/...,2025-01,2026-08-05,
social_contributions,,Social insurance contributions,Sozialbeiträge,790000,"Mandatory payroll contributions to pension, health, long-term care and unemployment insurance — split between employees and employers.",actual,Destatis government finance statistics,https://www.destatis.de/...,2024,2026-08-05,"Net social contributions, ESA 2010 D.61."
```

`data/de/2024/expenditure.csv`:

```csv
id,parent_id,name,name_official,amount,description,quality,source_name,source_url,source_date,retrieved_date,notes
social_protection,,Social protection,Soziale Sicherung,1080000,"The biggest block: pensions, unemployment benefits, family benefits, long-term care and social assistance.",actual,Eurostat COFOG (gov_10a_exp),https://ec.europa.eu/eurostat/...,2024,2026-08-05,"COFOG division 10."
pensions_old_age,social_protection,Pensions (old age),Alterssicherung,430000,"Payments to retirees, mostly from the statutory pension insurance (gesetzliche Rentenversicherung) plus civil-servant pensions.",actual,Eurostat COFOG (gov_10a_exp),https://ec.europa.eu/eurostat/...,2024,2026-08-05,
health,,Health,Gesundheit,380000,"Hospitals, doctors, medicines and public health — largely financed through statutory health insurance.",actual,Eurostat COFOG (gov_10a_exp),https://ec.europa.eu/eurostat/...,2024,2026-08-05,"COFOG division 07."
defence,,Defence,Verteidigung,75000,"The armed forces (Bundeswehr), including procurement funded via the special defence fund.",actual,Eurostat COFOG (gov_10a_exp),https://ec.europa.eu/eurostat/...,2024,2026-08-05,"Includes Sondervermögen Bundeswehr outlays."
```

### Internationalization

English-only to start. Later: sidecar overlay files (`revenue.de.csv` with columns
`id,name,description`) applied at load time — translations can lag data updates without
blocking them, and translation PRs never touch the primary data files. No per-language columns
in the main CSVs, ever.

## 4. Data collection playbook (annual)

Data collection is an AI deep-research session run once a year, following
`docs/COLLECTION_PLAYBOOK.md` and using the paste-ready prompt in `docs/RESEARCH_PROMPT.md`.
Every number must come back with a source URL, retrieval date, and quality flag.

### Which year to publish

**The newest year with complete, final data on both sides.** Revenue data is fast; the
standardized expenditure-by-function data lags ~14–15 months. We never mix reference years
inside one dataset — as of mid-2026, the newest complete year for Germany is **2024**; 2025
joins around early 2027 when its COFOG breakdown publishes. The year dropdown makes this
natural rather than stale.

### Collection calendar (two windows per year)

- **Spring, revenue window (year N−1 becomes available):**
  - Destatis final tax revenue by tax type: ~April, in the *Statistischer Bericht —
    Steuerhaushalt* (successor of the discontinued Fachserie 14 Reihe 4).
  - Destatis general-government ESA press release (~April): consolidated revenue, expenditure,
    deficit, and the social-insurance sub-sector totals.
  - BMF *Monatsbericht* cash tax figures (monthly, ~1 month lag) for early estimates if needed.
- **Spring, expenditure window (year N−2 becomes final):**
  - Eurostat COFOG dataset **`gov_10a_exp`** — legal transmission deadline is T+12 months, but
    the comparable EU-wide release has historically landed ~14–15 months after year-end. The
    10 divisions are mandatory for all countries; second-level groups are voluntary — verify
    granularity per country before promising level-2 detail.

### Key sources

| Source | Use | Timing |
|---|---|---|
| Destatis Steuereinnahmen / Statistischer Bericht Steuerhaushalt | Tax revenue by tax type (level 2 detail) | final ~April N+1 |
| Destatis general-government finance press release | ESA consolidated totals, social insurance sub-sector | ~April N+1 |
| BMF Monatsbericht | Cash tax revenue, early estimates | monthly, ~1 month lag |
| Eurostat `gov_10a_taxag` ([dataset](https://ec.europa.eu/eurostat/databrowser/product/page/gov_10a_taxag)) | Standardized revenue aggregates, all EU countries | T+9–10 months |
| Eurostat `gov_10a_exp` ([dataset](https://ec.europa.eu/eurostat/databrowser/view/gov_10a_exp/default/table?lang=en)) | COFOG expenditure, all EU countries — **level-1 source of truth** | ~14–15 months |
| BMAS Sozialbudget | Same-year social-spending narrative detail | fast, but see pitfall 2 |
| OECD Revenue Statistics + OECD COFOG Data Explorer | Non-EU expansion path later | ~similar lags |

Eurostat has a clean REST API usable during research sessions (or at build time later):
`https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/{code}?format=JSON&lang=EN`

### Pitfall rules (hard rules for every research session)

1. **Never sum government levels yourself.** Bund + Länder + Gemeinden + Sozialversicherung
   gross totals substantially exceed the consolidated figure (for 2025: €2,472bn summed vs
   €2,081bn consolidated) because of intra-government transfers (federal pension subsidies,
   VAT-share transfers, …). Use consolidated ESA figures only; record consolidation decisions
   in the `notes` column.
2. **Don't mix accounting frameworks.** Cash tax revenue (2025: €989.8bn), ESA
   general-government revenue (€2,081bn), and the BMAS Sozialbudget (€1,431bn) measure
   overlapping but different things. The site's frame is ESA consolidated; cash tax statistics
   provide tax-type detail at level 2; Sozialbudget is narrative color only (its ESSPROS
   categories are not COFOG, and its scope is broader than general government).
3. **Use Eurostat for the expenditure side, not the national functional table.** Destatis's
   national expenditure-by-function table lags ~4–5 years — far worse than Eurostat COFOG.
4. **Sozialversicherung figures come from Destatis's aggregation**, not from individual
   carriers (BMAS/BMG/BA data flows into it) — sourcing carriers individually invites
   double-counting.

Sanity anchors (Germany 2025, Destatis, for magnitude checks): general-government revenue
€2,081bn / expenditure €2,208bn / deficit €127.3bn; cash tax revenue €989.8bn (VAT €310.2bn,
Lohnsteuer €262.7bn); social insurance revenue €936.1bn (of which contributions €771.5bn).

## 5. Site architecture

### Repo layout

```
where-is-the-tax/
├── README.md                  # pitch, screenshot, live link, "add a country" pointer
├── PLAN.md                    # this document
├── LICENSE                    # MIT for code; data is CC-BY (noted in README)
├── index.html                 # single page, Vite entry
├── package.json / vite.config.ts / tsconfig.json
├── data/                      # ← the heart of the repo (see §3)
├── docs/
│   ├── DATA_SCHEMA.md         # column reference + fixed level-1 vocabulary
│   ├── COLLECTION_PLAYBOOK.md # annual collection steps, sources, QA checklist
│   └── RESEARCH_PROMPT.md     # paste-ready AI deep-research prompt template
├── scripts/
│   └── validate-data.ts       # schema + integrity checks (CI gate + prebuild)
├── src/
│   ├── main.ts                # bootstrap: state → load → render
│   ├── state.ts               # app state + URL hash sync
│   ├── format.ts              # Intl formatting (€ bn, per-capita, %)
│   ├── styles.css
│   ├── data/model.ts          # types, tree building, derived nodes (deficit, "other")
│   ├── data/load.ts           # fetch + parse meta.json and CSVs (d3-dsv)
│   ├── viz/sankey.ts          # hero view, horizontal + vertical (mobile) modes
│   ├── viz/treemap.ts         # drill-down view
│   ├── viz/tooltip.ts         # single shared tooltip
│   └── ui/controls.ts         # country/year selects, breadcrumb, toggles
└── .github/workflows/ci.yml   # validate (PR gate) + build + Pages deploy
```

~12 source files. Dependencies: `d3-sankey`, `d3-hierarchy`, `d3-selection`, `d3-scale`,
`d3-dsv` (submodules, not the d3 monolith), `vite`, `typescript`, `tsx`,
`vite-plugin-static-copy` (serves root-level `data/` in dev and copies it into `dist/`).
No framework, no router, no CSS framework, no state library.

### The sankey: a correctness rule, not just a chart

Left: top-level revenue categories. Center: **one "Total" node**. Right: the COFOG spending
divisions. **Never direct revenue→spending links.** General-government money is fungible —
with narrow exceptions there is no real earmarking of VAT to defence or wage tax to pensions.
A many-to-many sankey would fabricate flows that don't exist and turn the site into a
misinformation generator. The two-stage layout states the truth: everything goes into one pot,
everything comes out of it. This reasoning appears verbatim in the site's methodology section.

**Deficit/surplus:** revenue and expenditure won't balance. A derived pseudo-node — "Deficit
(new borrowing)" on the revenue side, or "Surplus" on the spending side — rendered visually
distinct (gray/hatched) with a tooltip explaining that the gap is covered by new government
debt. Computed in `model.ts`, never stored in CSV. For Germany this is a headline feature, not
an accounting nuisance.

Node order is fixed (by amount, descending — no relayout jitter). One cool color ramp for
revenue, one warm ramp for spending, neutral gray for Total and Deficit.

### Interactions

- **Hover** (node or link): display name (+ "officially: …" when the official name differs),
  amount (`€13.0 bn`), % of that side (`0.6% of revenue`), per-capita (`€156 per person`), the
  plain-language description, and a quality badge when not `actual`. Source shown as
  attribution text — clickable source links live in the detail view (clickable tooltips are a
  UX tarpit). Hover highlights the node + its link; everything else dims.
- **Click** a top-level node → treemap of its children replaces the sankey (crossfade), with
  breadcrumb `Germany 2024 › Spending › Social protection`. Escape, breadcrumb, or browser
  back returns. Tiles with children drill once more; a leaf shows a **detail card**: full
  description, exact amount, source dates, clickable source URL, notes. A childless top-level
  node goes straight to its detail card. Under-summing children produce a derived
  "Other / unallocated" tile.
- **State lives in the URL hash** (`#de/2024`, `#de/2024/expenditure/social_protection`):
  every view is shareable, and the back button exits drill-downs for free.
- **Country/year dropdowns** are native `<select>` elements populated from `data/index.json` —
  free accessibility and mobile UX.

### Mobile (<~700px)

Horizontal sankeys die on phones. Below ~700px the sankey **transposes to vertical** — revenue
at top flowing down through Total to spending at bottom (d3-sankey computes the layout; we swap
x/y and use a transposed link generator, ~30 lines). Vertical flows scroll naturally, labels
sit inside full-width nodes, and the "one pot" metaphor survives. Touch: first tap pins the
tooltip as an info card; second tap (or its "See breakdown" button) drills. The treemap is
naturally mobile-friendly.

### Accessibility

Nodes and tiles are focusable (`tabindex="0"`, `role="button"`) with aria-labels containing the
full tooltip text; Enter drills, Escape returns; visible focus outlines; color is never the
sole encoding. A `<details>` element below the chart renders the same data as a plain HTML
table — screen-reader fallback, no-JS fallback, and SEO in one move. `prefers-reduced-motion`
disables transitions.

### Data validation: a PR gate, not a runtime concern

Data only changes via commits, so merge time is when to catch bad data.
`scripts/validate-data.ts` (run via `tsx`; hand-rolled checks — explicit code gives better
error messages than a schema library for a 12-column CSV) validates every dataset:

1. Required columns present; no unknown columns.
2. `id` unique; `parent_id` references exist; no cycles; depth ≤ 3.
3. Amounts positive and finite; `quality` in enum; `source_url` is https; dates parse;
   `description` non-empty.
4. Level-1 ids match the fixed vocabulary; 5–10 top-level nodes per side.
5. Children sum ≤ parent within 0.5%.
6. Top-level sums match `meta.expected_total_*` within 1%.
7. `data/index.json` matches the directory tree exactly.

Errors print `file:line column message` and exit non-zero. Wired as `npm run validate`, run by
CI on every PR and as a `prebuild` step — broken data can neither merge nor deploy.

## 6. Build & deploy

One workflow, `.github/workflows/ci.yml`, two jobs:

- **validate** (every PR + push): `npm run validate` → `tsc --noEmit` → `npm run build` smoke
  test. Set as a required check via branch protection on `main`.
- **deploy** (pushes to `main` only, needs validate): build → `actions/configure-pages` →
  `actions/upload-pages-artifact` → `actions/deploy-pages`.

Setup notes: repo Settings → Pages → Source: "GitHub Actions". Vite needs
`base: '/where-is-the-tax/'` (project pages serve from a subpath; switch to `'/'` if a custom
domain arrives), and all data fetches are prefixed with `import.meta.env.BASE_URL`. A scheduled
workflow opens a "refresh the data" reminder issue each spring.

## 7. Roadmap

Each phase is independently shippable; the site is live and genuinely useful from Phase 2.

| Phase | Ships | Size |
|---|---|---|
| **0 — Scaffold** | Repo structure, Vite+TS+D3 hello-world, `ci.yml` deploying a placeholder to Pages, docs skeleton. Deploy pipeline proven before any real work. | ~1 day |
| **1 — Data foundation** | `DATA_SCHEMA.md` finalized (incl. fixed vocabulary), `validate-data.ts` complete, playbook + research prompt written, **Germany dataset (latest complete year, currently 2024) researched, sourced, committed, passing validation**. | ~3–5 days (research dominates) |
| **2 — Hero sankey: Germany live** | Data loading, two-stage sankey with deficit node, tooltips with descriptions/per-capita/%, formatting, desktop layout, data-table fallback. | ~3 days |
| **3 — Drill-down + shareable URLs** | Treemap, breadcrumb, detail cards with source links, hash routing (back button, deep links). | ~2 days |
| **4 — Mobile + accessibility** | Vertical sankey, touch interaction, keyboard navigation, focus/aria pass, 375px testing. | ~2 days |
| **5 — Second country** | Netherlands or Austria — mid-size, strong statistics office, proves the Eurostat-standardized path and stresses the playbook with non-German sources. Country dropdown becomes real. | ~2–3 days (mostly research) |
| **6 — Polish** | Per-capita & %-of-GDP toggles, i18n sidecar pilot (German), OG/social share image, methodology page, embed mode (`?embed=1`) for journalists. | ~3 days, individually shippable |

**Explicit v1 non-goals** (so nobody designs for them prematurely): year-over-year comparison
(the schema already supports it via stable ids — pure frontend work later), a personalized
"enter your salary" tax receipt (strong later feature; prior art shows demand), and i18n.

## 8. Risks & mitigations

1. **The sankey visually lies about earmarking.** The single worst failure mode — a chart that
   fabricates causality. → Two-stage Total-node layout as a hard architectural rule (no code
   path draws cross-links) + on-page methodology note.
2. **Cross-country incomparability.** National categories differ; naive data would make the
   country dropdown a comparison trap. → Fixed level-1 vocabulary (ESA 2010 + 10 COFOG
   divisions) enforced by the validator; Eurostat as level-1 source of truth; national sources
   only enrich level 2+.
3. **Double counting across government levels.** Inter-level transfers and gross-vs-consolidated
   mixups. → "Consolidated general government only" as a schema rule; `expected_total_*`
   cross-checks; consolidation decisions recorded per row in `notes`.
4. **Data lag disappoints** ("why is 2025 not up in 2026?"). → The year strategy ("newest year
   with complete, final data on both sides") is stated on-page; the ~15-month COFOG lag is a
   property of official statistics, not of this project.
5. **Trust erosion.** A transparency site with unsourced or stale numbers is worse than none.
   → `source_url` + `retrieved_date` + `quality` required on every row (validator-enforced);
   "last updated" display + provisional badges in the UI; annual refresh reminder workflow;
   every number one click from its official source.
