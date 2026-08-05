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

### Route facts the graph is built on (from the research report; pending independent reproduction)

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
- Berlin trade tax: municipal, with a statutory federal levy — Berlin remits only the federal
  component: `14.5 / 410 = 3.5366%` of gross (statutory calculation, not an observation).
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
presets — *You earn a wage in Berlin* · *You buy petrol* · *A Berlin business pays trade tax* —
each render that route's true stages as proportional flows: event → named tax → statutory
split → clearing/equalisation → recipient budgets. Flow widths follow statutory shares or
official aggregates; every node and edge carries a plain-English hover explanation, an edge
kind, and an evidence status.

At the **budget boundary** the visual language changes: tax-coloured routing ribbons end at a
marked rule; the selected recipient's spending context appears beyond it in a different visual
treatment (ranked composition, muted palette), labelled *whole-budget spending context*.

Planned coordinated views, phased: overview graph (all tax families → recipients),
tax-route flow (hero), equalisation view (pooled additions/deductions, later a Länder map),
recipient account rebase, spending drill-down, Berlin service view (borough context only after
the Berlin budget node).

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

The prototype phase may ship a **clearly-bannered internal fixture** of this shape using
statutory shares plus research-report figures marked "pending independent verification"; no
such figures are published as official until verification completes.

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

**Current status (2026-08-05):** collection complete; independent verification NOT performed;
no production dataset exists. The six verifier priorities are listed in
[docs/research/logs/2026-08-05-de-fiscal-graph.md](docs/research/logs/2026-08-05-de-fiscal-graph.md).
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
├── state.ts              # route/selection state + URL hash sync
├── format.ts             # Intl formatting
├── styles.css
├── data/                 # schema, load, model (graph + accounts), validator core
├── viz/
│   ├── fiscal-graph.ts   # the hero: staged flow layout, ribbons, boundary treatment
│   ├── spending.ts       # post-boundary contextual composition
│   └── tooltip.ts        # shared hover/focus explanation layer
└── ui/                   # presets, detail panel, summary, controls
scripts/                  # generate-static.ts, validate-data.ts, import helpers
tests/                    # validator fixtures, model, state, UI/browser checks
```

Vite + TypeScript, static output, GitHub Pages via Actions (validate → typecheck → test →
build → deploy). D3 submodules only (`d3-selection`, `d3-shape`, `d3-scale`, and `d3-sankey`
or a custom staged layout where it fits the topology better); no framework, no router, no
runtime API calls. Build-time static generation feeds the fallback.

---

## 7. Delivery phases

**P0 — Fiscal-graph prototype (now).** Rebuild the page around the D3 route visualization with
the three presets, budget-boundary treatment, hover explanations, and provenance details, using
statutory shares (exact law) plus research figures under a prominent "pending verification"
banner; spending context clearly illustrative. Exit: the graph makes the routing story and the
boundary unmistakable on desktop, and the page no longer reads as an essay.

**P1 — Verification and first production dataset.** Run the independent verification pass (six
logged priorities), then produce `data/de/2024/` for the three routes plus the Berlin tax
account and equalisation rows, with evidence manifest and full provenance. Exit: validator and
independent reproduction green; banner drops to "provisional where marked".

**P2 — Recipient accounts.** Ingest federal 2024 XML and Berlin 2024 function actuals as
reconciled accounts; real spending context replaces illustrative; detail drill-down.

**P3 — System completeness.** Transfer ledger + reconciliation validators wired end-to-end;
social-insurance branch; 2021 comparable mode; equalisation view with Länder map.

**P4 — Mobile, accessibility, public v1.** Narrow-screen adaptation, keyboard/screen-reader
pass, no-JS fallback verified, comprehension check with a handful of non-experts, deploy.

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

- The three routes render from a fully provenanced, independently verified 2024 dataset;
  provisional values visibly badged.
- Recipient accounts reconcile under documented rounding bounds; transfers eliminated.
- A non-expert can follow a route, explain the budget boundary in their own words, and reach an
  official source for any number.
- Desktop and mobile pass keyboard, screen-reader, reduced-motion, and no-JS checks.
- Methodology, schema, licences, playbook, prompt, catalog, logs, and learnings are current.
- No tracking, no backend, deployed static to GitHub Pages.
