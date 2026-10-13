# Front-end plan: the interactive slide

Status: **v4 (2026-10-12)**. History:
- v1 was my own plan.
- v2 merged in the good ideas from the existing prototype.
- v3 applies an independent critique; v3.1 added the data contract.
- v4 applies the site owner's redesign with a designer's decisions: one global year control
  (2024 | 2025), the map as place picker beside the flow, the Shopping panel instead of the
  purchase strip, a merged legend/chip row, and tags only where a year differs.
- v4.1 (2026-10-12) corrects a miscommunication in v4. v4 replaced the selected budget's "of every €100"
  column with a cross-budget "your € per year" list. The owner wanted the column kept, with your euros
  added. The column is back, and each row and each drawer sub-item now shows "≈ €X of yours\*".

## The question, at two zooms

> Where does the money a person in Germany pays go?

| Zoom | Unit | Left column |
|---|---|---|
| **You** (default) | € per year | One person's bill at a chosen gross wage. Each tax and contribution is computed exactly from the law for that year. Indirect taxes are shown separately as ≈ estimates. |
| **Germany** | € bn, or € per resident per day (unit toggle) | All named taxes and all contributions. A revenue bridge shows that spending = taxes + contributions + other revenue + borrowing. |

The Germany zoom is not just the You zoom scaled up. It adds taxes a person doesn't pay directly
(corporation tax, trade tax…), and its spending side is the consolidated state. The switch must
say so in one line.

## The master flow (left → right)

```
GROSS WAGE → TAXES & CONTRIBUTIONS → WHO RECEIVES IT (by law) ‖ boundary ‖ TOTAL BUDGET IT GOES INTO → OF EVERY €100 (selected budget, ≈ yours*)
```

- **Gross wage** is one bar. Employer contributions sit beside it as a ghost bar labelled
  "paid on top by your employer", because they are set by law (OECD *Taxing Wages* does the same).
- **Routing ribbons** are scaled in euros and coloured by legal recipient:
  - Federation, your Land, municipalities in your Land (one merged node for Berlin and Hamburg);
  - the Länder VAT pool (it is a formula, not a budget, so it has no spending breakdown);
  - pension, health, care and unemployment insurance.

  The EU is not a recipient at You zoom. Its VAT-based payment can't be traced from a purchase,
  so it appears inside the federal pot.
- **The boundary** is a labelled rule ("From here on, mixed with all other income"). Every ribbon,
  taxes and contributions alike, ends in **a pot drawn at its true size**, labelled
  "Federal budget · €465.7bn" (v4). Clicking a pot opens its drawer (composition in %, exact).
- **Social systems are fenced pools, not traced money.**
  - §30 SGB IV fences each system to its own tasks, but inside the fence contributions mix with
    federal grants, the Gesundheitsfonds, and reserve movements.
  - So the honest contrast is **"fenced pool vs. general budget"**, never "traceable vs. not".
- **Personal € beyond the boundary (v4.1):** the right-hand column shows the selected budget's
  composition, "of every €100 · Federal budget". Clicking a budget switches it, and the URL keeps
  it as `pot=`. Each row shows the exact % plus "≈ €X\*" under a "≈ yours\*" header: your euros
  into this budget × the row's share. A footnote reads "if your €1,117 a year were spread like
  this budget". The budget drawer repeats this for every sub-item ("Defence (federal only) €67.0bn ·
  ≈ €207 of yours\*").
  - Each budget is shown on its own, so there is no cross-budget category mapping. The ≈\*
    household estimate stays out of these euros.
  - Never "your tax paid for".
- **Remove transfers at every scale.** Federal grants to pension and health insurance are a
  transfer edge, not federal spending. The federal pot's composition excludes them, so the same
  euro never appears twice.
- **No pot selection (v4).** Pots show "name · total"; the composition of each budget is in its
  drawer.
- **Borrowing** shows as a neutral, solid "borrowed" segment on the pot (federal 2024 ~€33 bn).
  It is never textured.

## Encoding rules (one meaning each)

| Channel | Meaning |
|---|---|
| Hue | Legal recipient. Fixed per entity, max 8, validated with the dataviz palette validator. |
| Texture | Recipient identity in pattern mode and under forced colours only |
| `≈` prefix | Estimate (indirect taxes, any modelled value, pro rata\* amounts) |
| Year tag (v4) | 11 px muted, always visible, only where a figure's year differs from the selected year or is provisional ("2022", "2024", "2025 provisional") |
| Badge | Status of the source (exact law · official · provisional · estimate), in tooltips and drawers only |

The map's diverging palette must not reuse recipient hues.

## Interaction

- **One control row (v4):** title · year `2024 | 2025` (28 px segmented control; drives every
  view; default 2025; hash `y=2024` preserves the previous year; the title follows the year) · gross wage (figure, click to
  type; slider in €1,000 steps that snaps to a reference wage within €500, value bubble while
  dragging; ticks `min* · median · avg`, full name and definition on hover) · zoom (You |
  Germany) · unit (Germany only) · `DE | EN` · theme and pattern icon buttons. No number box, no
  Land dropdown, no 2× average tick. 2026 appears only as one line in the payslip drawer ("Same
  wage in 2026: €X net").
- **The payslip assumptions are stated in one muted line:** tax class I, no children, no church
  tax, average Zusatzbeitrag, statutory insurance, employee (civil servants differ).
- **Legend row above the charts (v4):** "Shopping ≈ ›" (opens the Shopping panel) · recipient
  swatches (click to highlight that recipient's flows, click again to clear) · "≈ estimate\*"
  (toggles the household estimate) · borrowed. The Payday / Fuel / Home chips are gone.
- **Map as place picker (v4):** left of the flow (240 px). "All Länder · click a Land" until a Land
  is clicked; clicking the selected Land returns to all Länder. "Ranking ›" opens the sorted bars
  in a side panel (they select too).
- **Shopping panel (v4):** today's household estimate, then "Taxes inside one purchase\*": ten
  rows sorted by tax share, a 200 px track stacked by recipient, "53 % tax" in ink, tooltip with €
  tax per unit, recipient split and legal basis; one caption "\* price assumed · tax per unit exact
  by law"; off-year rates tagged inline (cigarettes 2026). A muted hook under the ≈ label in the
  flow ("e.g. petrol 53 % · cigarettes 63 % ›") opens it.
- **Hover or focus:** amount, share, mechanism in plain words, status badge.
- **Click opens a drawer as an overlay**, not a permanent rail. It shows:
  - the mechanism mini-diagram (VAT pool, wage-tax decomposition, trade-tax levy);
  - a one-level-deeper breakdown of the pot;
  - benchmarks against other Länder;
  - sources.
- **The URL hash holds all state.** Animated re-layout respects reduced motion.

## Secondary views (below the hero, short)

1. **Equalisation map:** moved into the hero as the place picker (v4); its ranking is a panel.
2. **All taxes table:** the selected year's amount, legal split and recipient for every named
   tax, with an inline bar.
3. **Time strip:** revenue and spending over time as small multiples (never dual axis), only if
   the data exists.
4. **Sources and data table:** a build-time static fallback, with every number linked to its raw
   file and coordinates.

The data year is labelled per value. A Land whose spending data is 2021 says so on the pot.

## Visual language and text

- **Type:** serif headings and mono stage labels, kept from the prototype. All numbers are sans,
  including the hero.
- **Title:** plain and following the year ("Where taxes go · Germany 2025" / "Wohin Steuern
  fließen · Deutschland 2025").
- **Status:** a quiet footer line plus per-number badges, instead of the yellow banner.
- **No slogans and no essays.** The only words are the boundary label, the `*` and `≈` notes, and
  the assumptions line.

## Layout

- **Desktop 1440×900:** the control row, the legend row, the map (240 px) and the master flow
  (~1,130 px) fit without scrolling. Drawers and panels overlay from the right.
- **Mobile 390 px:** don't rotate the Sankey. Each stage becomes one 100 % stacked bar, with a
  tappable list under it showing amount and share. Budgets are selectable, and the last stage is the
  selected budget's composition with "≈ €X of yours\*" per row. The map
  sits at the top beside its key; year and all controls collapse into the settings sheet; panels
  are full-height sheets with 48 px purchase rows (label above the bar).
- **No JavaScript:** a static summary and table.
- **Hosting:** GitHub Pages via Actions, with a correct Vite `base`.

## Data contract (v3.1, after the data layer landed)

The front end reads **only** `data/` (index: `data/manifest.json`; rules: `data/README.md`). The
constructs and their verified arithmetic are in `docs/research/RATIONALIZATION.md`. Use its
numbers and its `*` markers as given.

| View element | File(s) | Notes |
|---|---|---|
| Payslip (You zoom) | `de/citizen/payslip-parameters.json` | Computed in the browser from the parameters. **A unit test must reproduce every row of `payslip-examples.json` exactly.** Year 2024 or 2025 from the global control; 2026 only as the drawer's one line. |
| Year (v4) | all files below | 2025 is read where it exists: federal budget (Ist, reconciled to €493.3bn, "2025 provisional"), social insurance, equalisation (provisional), named taxes, EU, wage references, population. Not published for 2025: Länder functions (2022), Berlin and municipal accounts (2024), COFOG/ESA state side (2024), household survey (2024): these keep their year tag. `tests/year.test.ts` checks every view. |
| Employer ghost bar | same | |
| Legal split of each tax | `de/taxes/legal-allocation.json` | Wage tax 42.5/42.5/15; VAT annual formula |
| Purchase layers ≈ | `de/citizen/purchase-taxes.json` | Rates are law; prices carry `*` |
| Federal pot | `de/federal/budget-2024.json`, `budget-2025.json`, `overview.json` | Total **€465.7bn** (2024) / **€493.3bn** (2025), both provisional closings. Show grants to social insurance as a transfer, not as federal spending. Borrowing comes from `overview.json`. |
| Land pot | `de/laender/functions-2022.json`; `de/berlin/functions-2024.json` for Berlin | Year labelled per Land (2022 vs 2024) |
| Municipal pot | `de/municipal/functions-2024.json` | |
| Social pots | `de/social-insurance/accounts.json` | Fenced pools. Payroll view €529.3bn (`*` proxy). The transfer ledger removes inter-system flows. Federal grants are a transfer edge. |
| Germany zoom | `de/government/cofog.json` (S13, 2024p), `aggregates.json` | Revenue bridge: taxes 49.7 / contributions 37.4 / other 12.9 + deficit €115.3bn; €69.95 per resident per day |
| Named-tax drawer and table | `de/taxes/by-tax.json`, `by-recipient.json` | Cash basis. Never add these to ESA figures. |
| Equalisation map | `de/equalisation/2024.json`, `2025.json`, `de/population.json`, `data/geo/de-laender.json` | All BEZ types included; 2025 provisional |
| Time strip | `de/government/aggregates.json`, `de/taxes/by-tax.json` | Small multiples |
| EU | `de/eu/round-trip.json` | Any "net contribution" is `*` |

## Build order

1. **Data adapter:** read only the rationalized `data/` files and delete the figures hard-coded in
   `src/routes`. Fix every number flagged in the research review.
2. **You zoom:** statutory payslip, routing ribbons, boundary and pots.
3. **Pot composition and drawer:** pro rata\* on hover, transfers removed.
4. **Germany zoom:** revenue bridge, consolidated spending, € per resident per day.
5. **Secondary views:** map, all-taxes table, time strip.
6. **Finish:** DE/EN, a11y, mobile layout, static fallback, Pages deploy, screenshots.
7. **v4 redesign:** year control, map picker, pro rata\* column, Shopping and ranking panels,
   legend row, tags; tests for the year switch, the pro-rata sum and the map's deselect.
