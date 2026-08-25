# where-is-the-tax — Project Plan

An interactive **fiscal graph** that answers: *where does money paid in Germany actually go?*

It follows named taxes from the taxable event through their legal recipients — constitutional
splits, geographical clearing, Länder equalisation — then marks the **budget boundary** where
tax identity honestly ends, before showing each recipient's whole-budget spending context.
Every number links to exact provenance; every accounting limit is explicit.

This plan supersedes the earlier consolidated-ESA-first plan. The deep research pass
([docs/research/GERMANY_FISCAL_GRAPH_2026-08-05.md](docs/research/GERMANY_FISCAL_GRAPH_2026-08-05.md))
established that Germany's tax routing is legally exact up to the recipient budget, and only
becomes untraceable after it — so the product can be far more precise, and far more engaging,
than a two-sided aggregate view, without fabricating a single flow.

---

## 1. Product contract

### Primary user and outcome

An English-speaking non-expert — the primary scenario is *a person in Berlin* — who wants to
understand what happens to money they pay. Within a few minutes they should be able to:

- pick a concrete event they recognise (earning a wage, buying petrol, a business paying trade
  tax) and follow that money's **legal route** through real institutions;
- see exactly which shares are fixed by law, which are annual formula results, and which are
  pooled equalisation outcomes;
- understand where traceability honestly **ends** — the budget boundary — and why;
- explore what each recipient (Federation, Berlin, a social-insurance system) spends its
  complete budget on, clearly labelled as whole-budget context, not "your euro bought this";
- inspect the source, status, transformation, and caveats behind any number.

### The core explanatory insight

Ordinary language collapses three different questions. The product keeps them separate:

1. **Who legally receives this tax?** — usually exact (statute + official cash statistics).
2. **How is it cleared or redistributed geographically?** — answerable at aggregate level,
   sometimes only after an annual official calculation.
3. **What does the recipient spend its complete budget on?** — answerable from accounts, but
   not causally attributable to any particular tax.

Stages 1–2 are *routing* and may be drawn as flows. Stage 3 is *context after an accounting
boundary* and must look different. This transition is the product's centre of gravity.

### Principles

1. **No fabricated causality — but no false modesty either.** Draw every flow the law and the
   official statistics actually support; draw nothing past the budget boundary except clearly
   separated spending context. Documented statutory earmarks may appear as explicit exceptions.
2. **Every number is reproducible.** Exact table/API coordinates, release and retrieval dates,
   raw observation, transformation, evidence snapshot or checksum, review status.
3. **Plain English leads.** Official German names are preserved as secondary identifiers; the
   human explanation comes first, on hover and in detail panels.
4. **Uncertainty and vintage stay visible.** Final/provisional/estimate/forecast labels, visible
   reference years, no silent mixing of vintages inside one reconciled view.
5. **One accounting frame per additive view.** Alternate classifications (organizational,
   functional, economic) of the same money are views, never additive siblings.
6. **Fail closed.** No dataset publishes with unresolved provenance, licence, reconciliation, or
   verification gaps.
7. **Static and inspectable.** No backend, no tracking, no runtime AI or statistical-API calls.
   Data and research artifacts live in the repository.

### Explicit non-goals for v1

- A personal tax-return questionnaire (event presets, not salary inputs).
- Cross-country content or comparison.
- German-language UI or i18n infrastructure.
- Year-over-year comparison before two reconciled years exist.
- Claiming individual-level allocation where only aggregate official data exists (e.g. one
  person's municipal income-tax split).

---

## 2. Accounting and topology contract

### The fiscal topology

```text
taxable event
  → named tax
  → constitutional/statutory allocation        (Art. 106 GG and statutes)
  → geographical decomposition and clearing    (Zerlegung, VAT keys)
  → Länder equalisation / supplementary grants (pooled, not bilateral)
  → recipient budget or social-insurance account
  → BUDGET BOUNDARY: tax identity stops        (§8 BHO / LHO general coverage)
  → recipient's contextual spending composition
```

### Route facts the graph is built on (independently reproduced on 2026-08-05)

- Income tax: Federation 42.5% / Länder 42.5% / municipalities 15% (exact statute); wage tax
  decomposed to Land of residence (§7 ZerlegungsG); municipal share via statutory keys.
- Corporation tax: 50/50 Federation/Länder; Länder part decomposed by establishment payroll.
- VAT: national aggregate → annual vertical allocation (2024 effective: Federation 48.1010%,
  Länder 49.1088%, municipalities 2.7903%) → Länder pool with population allocation and
  fiscal-capacity equalisation; separate municipal key system (Berlin 2024–26: 0.042022533).
  VAT paid in Berlin does not stay in Berlin.
- Länder equalisation: pooled additions/deductions around the Länder VAT share — never
  bilateral wires. Berlin 2024: €6.526bn population-based share + €3.943bn equalisation
  addition + ~€1.860bn federal supplementary grants; 135% city-state weighting; BMF marks the
  2024/2025 calculations provisional.
- Berlin is Land **and** municipality; its boroughs are not tax recipients (global allocations
  inside the Berlin budget only).
- Berlin trade tax: Berlin pays the full levy (multiplier 35: 14.5 federal + 20.5 Land) under
  §6 GemFinRefG. The Land component is credited back inside equalisation because Berlin is also
  the Land. The same-assessment-year federal benchmark is `14.5 / 410 = 3.5366%` of gross at
  Berlin's 2024 rate (about €106.5m); the observed 2024 cash component is €108.573m because levy
  payments and prior-year settlements cross reporting periods.
- Federation-exclusive taxes: energy, tobacco, insurance, solidarity surcharge, etc.
  Länder taxes: inheritance, real-estate transfer, beer, betting. EU own resources are a
  federal-level transfer, not a traceable slice of an individual purchase.
- Social-insurance contributions are a parallel source branch (not taxes) into statutory
  systems that also receive federal grants (transfer edges, not double-counted spending).

### Reference years — two visibly labelled evidence modes

- **Route and recipient-account mode: 2024** — newest coherent year for cash receipts, vertical
  distribution, the Berlin tax account, the equalisation calculation (provisional), federal
  title-level actuals (XML), Berlin's annual account, and main social-insurance accounts.
- **Comparable public-system mode: 2021** — Destatis's latest comprehensive standardized
  Germany/Länder function publication; its lag is shown, never relabelled current.
- Newer observations (2025) may appear only as separately dated previews, never spliced into a
  reconciled 2024 route.

### Prohibited claims (hard rules; validator- and review-enforced)

One combined "Germany tax pool"; a seamless tax→programme Sankey; "VAT from a Berlin purchase
stays in Berlin"; bilateral Bavaria→Berlin equalisation wires; boroughs as tax recipients; an
individual's exact municipal income-tax allocation; named tax → named programme after a general
budget; a traceable EU slice of one purchase; calling Berlin's plan CSV actual spending; adding
alternate classification views; adding accounts without eliminating transfers; mixing vintages
silently; treating deficit as debt change.

### Reconciliation

Each recipient account reconciles separately:

```text
taxes + contributions + grants/transfers received + fees/other revenue + financing items
  = expenditure + transfers paid + closing/financing adjustments
```

Source-rounding bounds, not percentage tolerances. Transfers require a ledger entry
(`from_entity, to_entity, amount, year, basis, source, scope, transfer_or_terminal_spend`) so
federal grants, borough allocations, special funds, and social-system payments are never
double-counted.

---

## 3. Information design

### The hero: a stateful D3 fiscal graph

One page, one interactive graph that **changes topology with the selected event**. Event
presets cover wages, ordinary purchases, petrol, trade tax, and housing. Each renders that
route's true stages as proportional flows: event → named tax → statutory
split → clearing/equalisation → recipient budgets. Flow widths follow statutory shares or
official aggregates; every node and edge carries a plain-English hover explanation, an edge
kind, and an evidence status.

At the **budget boundary** the visual language changes: tax-coloured routing ribbons end at a
marked rule; the selected recipient's spending context appears beyond it in a different visual
treatment (ranked composition, muted palette), labelled *whole-budget spending context*.

**Place is a parameter, not a hard-coded scenario.** Berlin is only the example resident the
research extracted first. The target interaction is a clickable Germany map (BKG VG250
boundaries, Länder first, municipalities later): selecting a place re-parameterises every
place-dependent stage — Zerlegung destination, the Land's equalisation addition or deduction
(all 16 Länder are in the official BMF calculation), municipal keys and local tax amounts —
while the statutory splits stay fixed. The current implementation includes the official
all-16-Länder equalisation calculation; municipality-level selection remains future work.

**Beyond the boundary is a graph too, not a dead end.** The spending panel is unquantified only
until verified recipient accounts exist (federal 2024 XML title actuals; Berlin function
actuals). Then the panel becomes the entry to a spending drill-down per recipient budget —
whole-budget composition, clearly separated from the routing flows.

Planned coordinated views, phased: whole-map taxonomy (all tax families → recipients — shipped
as an interactive list in P0), tax-route flow (hero), Germany map selector re-splitting routes
per place, equalisation view (pooled additions/deductions on the map), recipient account
rebase, spending drill-down, borough service context inside the Berlin account.

### Interaction affordances

- **Hover/focus** on any node or ribbon: name (+ official German name), amount and share,
  edge kind in plain words ("fixed by constitution", "annual formula result", "pooled
  adjustment"), evidence-status badge, one-sentence description.
- **Click**: detail panel with the full explanation, exact amounts, statutory basis or source
  coordinates, status, caveats, and links — the same provenance affordance for every value.
- **Route switching**: animated re-layout between presets; state in the URL hash so every view
  is shareable.
- Visible states for loading, failure, and invalid routes; no partial view rendered as complete.

### Language, accessibility, fallback

English-only interface; German official names as secondary identifiers. Native controls,
semantic HTML, keyboard-reachable nodes with aria-labels, visible focus, reduced-motion
support. A build-time HTML summary and data table (genuinely pre-rendered, not JS-generated)
remains the no-JavaScript, screen-reader, and indexing fallback.

Desktop-first while the information model settles; a deliberate mobile pass (stacked stages,
tap-to-pin explanations, 375px legibility) gates public v1.

---

## 4. Data and provenance model

### Layout

```text
data/
├── index.json                    # discovery manifest, CI-verified
└── de/2024/
    ├── meta.json                 # year, modes, basis, status roll-up, review state
    ├── graph.json                # nodes, edges (kind, status), route definitions
    ├── accounts/…                # per-recipient spending compositions
    ├── transfers.json            # the transfer ledger
    ├── sources.json              # source identity + licence + attribution
    └── provenance.json           # per-observation records
research/evidence/de/2024/        # manifest + licensed raw responses/exports
```

Edge kinds: `exclusive_assignment · fixed_share · decomposition_adjustment · annual_formula ·
equalisation_adjustment · supplementary_grant · interbudget_transfer · budget_boundary ·
contextual_spending`. Evidence statuses: `exact_statute · calculated_official ·
provisional_official · formula_dependent · not_individually_traceable · budget_boundary ·
contextual_spending`.

Every observation/edge records: reference year and effective dates; actual/planned/provisional/
forecast status; accounting basis (cash/cameral, financial statistics, ESA accrual); entity,
geography, scope, consolidation; classification and unit; direct source, extraction
coordinates, retrieval date, licence; calculation expression and inputs for derived values.
Statutory percentages are recorded as `exact_statute` with their legal citation — they are law,
not statistics.

The preview may use independently reproduced core figures and clearly labelled, cross-checked
later additions under a **clear publication caveat**. It must not be presented as a production
data release until observation-level independent review, provenance, and evidence snapshots
complete the fail-closed publication bundle.

### Validation (PR gate + prebuild, fail closed)

Structural: files/columns/enums, unique ids, resolvable references, acyclic routes, agreeing
availability/amount. Semantic: every value has provenance; provenance points to a licensed
source; derived values recompute within source-rounding bounds; route stages respect the edge
grammar (nothing crosses a `budget_boundary` except `contextual_spending`); per-account
reconciliation; transfer-ledger completeness for consolidated views; status roll-up to
`meta.json`; prohibited-claim fixtures stay red. Validation catches structure and arithmetic;
independent source review remains required for truth.

---

## 5. Annual research system

The AI research run is a controlled collection-and-review process. Durable memory lives in
`docs/research/`: `RESEARCH_LEARNINGS.md` (stable accounting lessons), `SOURCE_CATALOG.md`
(current coordinates, cadence, access quirks, licences), `COLLECTION_PLAYBOOK.md` (exact
sequence), `RESEARCH_PROMPT.md` (paste-ready, binds the run to this contract), and dated logs.

Sequence: preflight (newest coherent year, statuses, licences) → extract (exact queries, raw
results) → map and reconcile (stable ids, explicit derivations, rounding bounds) → explain
(plain English, sourced claims) → **verify independently** (a second pass reproduces
coordinates, arithmetic, licences from raw evidence) → publish artifacts (dataset, provenance,
evidence manifest, log, learnings).

**Current status (updated 2026-08-25):** the core route claims were independently reproduced on
2026-08-05. The later all-Länder, spending-account, and social-insurance additions are collected
and cross-checked but still require the same observation-level independent pass. What remains
before publication is the fail-closed observation bundle with extraction records, evidence
snapshots, checksums, and completed per-observation review. Core verification results are in
[docs/research/logs/2026-08-05-independent-verification.md](docs/research/logs/2026-08-05-independent-verification.md).
Key access facts: Destatis GENESIS 71211 (named taxes before/after distribution; authenticated
REST since July 2025), Berlin 2024 tax account (official table), BMF 2024 equalisation PDF
(provisional), federal `rechnung_2024.xml` (title-level actuals), Berlin annual-account PDF
(function-level actuals; the open-data title CSV is plan data), Destatis 2021
Rechnungsergebnisse XLSX (comparable functions), BKG VG250 (map boundaries), plus
social-insurance carrier reports. Licences: mostly DL-DE-BY-2.0 / CC-BY; anything
`licence_unverified` is not redistributed.

---

## 6. Technical architecture

```text
src/
├── main.ts               # bootstrap: state → data → render
├── routes/               # route builders, places, taxonomy, hash state
├── format.ts             # Intl formatting
├── styles.css
├── data/                 # schema, load, model (graph + accounts), validator core
├── viz/
│   ├── fiscal-graph.ts   # the hero: staged flow layout, ribbons, boundary treatment
│   ├── land-map.ts       # clickable Länder selector
│   └── tooltip.ts        # shared hover/focus explanation layer
└── ui/                   # spending context, details, static shell
scripts/                  # generate-static.ts, validate-data.ts, import helpers
tests/                    # validator fixtures, model, state, UI/browser checks
```

Vite + TypeScript, static output, GitHub Pages via Actions (validate → typecheck → test →
build → deploy). D3 submodules only (`d3-selection`, `d3-shape`, `d3-scale`, and `d3-sankey`
or a custom staged layout where it fits the topology better); no framework, no router, no
runtime API calls. Build-time static generation feeds the fallback.

---

## 7. Delivery phases

**P0 — Fiscal-graph prototype — complete.** The one-screen workbench now has five routes,
budget-boundary treatment, hover/focus explanations, source details, and a prominent preview
banner that distinguishes independently reproduced core routes from later cross-checked additions.
The graph makes routing and the boundary explicit on desktop instead of reading as a landing-page
essay.

**P1 — Verification and first production dataset — core pass complete, full bundle incomplete.**
The independent pass reproduced the core figures and resolved the trade-tax discrepancy. Reproduce
the later account/Länder additions independently, then finish `data/de/2024/`
extraction/provenance records and evidence manifests before the preview banner can be removed.

**P2 — Recipient accounts — complete for federal and Berlin 2024.** Federal 2024 XML and Berlin
2024 function actuals now power reconciled post-boundary spending accounts.

**P3 — Germany map, Länder accounts, and social insurance — complete for the current scope.** The
clickable BKG Länder map re-parameterises all five routes; all-16-Länder equalisation, 2021
comparable accounts, and four social-insurance systems are loaded. Municipality-level selection
remains a later extension where Regionalstatistik data supports it.

**P4 — Desktop release hardening, then mobile/public v1.** Keep the current desktop one-screen
interaction stable; finish provenance/evidence gates and a small non-expert comprehension pass.
After the desktop run settles, do the deliberate narrow-screen, keyboard, screen-reader,
reduced-motion, and no-JS pass before deployment.

**P5 — Extensions (separately planned).** More taxes and purchase presets, Berlin borough
service view, a second year with definition-change mapping, embeds, translations.

---

## 8. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Route precision overclaimed (aggregate ≠ individual) | Edge statuses + explicit "aggregate route" language; prohibited-claims fixtures |
| Graph data model complexity stalls progress | P0 ships on a typed fixture; the contract grows only with each phase's real need |
| Verification bottleneck blocks everything | Statutory shares (law) need no statistical verification; prototype proceeds under banner |
| Vintage/framework mixing inside one view | Per-view single-frame rule; validator edge grammar; visible year labels |
| Double counting via transfers/special funds | Mandatory transfer ledger before any consolidated view |
| Licence missteps on raw redistribution | Per-source licence records; `licence_unverified` ⇒ recipe + checksum only |
| Expressive graph drifts into false causality | The boundary is a structural element (edge kind), not a styling choice; nothing renders across it |
| Annual runs drift from decisions | Durable research memory + binding prompt + deterministic checks + independent pass |

---

## 9. Definition of done — public v1

- The five current routes render from a fully provenanced, independently verified 2024 dataset;
  provisional values visibly badged.
- Recipient accounts reconcile under documented rounding bounds; transfers eliminated.
- A non-expert can follow a route, explain the budget boundary in their own words, and reach an
  official source for any number.
- Desktop and mobile pass keyboard, screen-reader, reduced-motion, and no-JS checks.
- Methodology, schema, licences, playbook, prompt, catalog, logs, and learnings are current.
- No tracking, no backend, deployed static to GitHub Pages.
