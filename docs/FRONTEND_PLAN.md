# Front-end plan: the interactive slide

Status: **v3 (2026-10-09)**. History:
- v1 was my own plan.
- v2 merged in the good ideas from the existing prototype.
- v3 applies an independent critique.

A data contract section is added once the new `data/` layer lands.

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
GROSS WAGE → TAXES & CONTRIBUTIONS → WHO RECEIVES IT (by law) ‖ boundary ‖ THE POT IT JOINS
```

- **Gross wage** is one bar. Employer contributions sit beside it as a ghost bar labelled
  "paid on top by your employer", because they are set by law (OECD *Taxing Wages* does the same).
- **Routing ribbons** are scaled in euros and coloured by legal recipient:
  - Federation, your Land, municipalities in your Land (one merged node for Berlin and Hamburg);
  - the Länder VAT pool (it is a formula, not a budget, so it has no spending breakdown);
  - pension, health, care and unemployment insurance.

  The EU is not a recipient at You zoom. Its VAT-based payment can't be traced from a purchase,
  so it appears inside the federal pot.
- **The boundary** is a labelled rule ("joins the budget · tax identity ends here"). Every ribbon,
  taxes and contributions alike, ends in **a pot drawn at its true size**: "your €4,100 joins
  €466 bn". The pot's composition sits beside it **in %**, which is exact.
- **Social systems are fenced pools, not traced money.**
  - §30 SGB IV fences each system to its own tasks, but inside the fence contributions mix with
    federal grants, the Gesundheitsfonds, and reserve movements.
  - So the honest contrast is **"fenced pool vs. general budget"**, never "traceable vs. not".
- **Personal € beyond the boundary** ("your €4,100 × this budget's composition") appears only on
  hover or in the drawer, marked **pro rata\***. The wording is "if your contribution were spread
  like this budget", never "your tax paid for".
- **Remove transfers at every scale.** Federal grants to pension and health insurance are a
  transfer edge, not federal spending. The federal pot's composition excludes them, so the same
  euro never appears twice.
- **Show the breakdown only for the selected pot.** Every other pot shows a muted total, so each
  pot needs at most ~8 categories and there are no 2 px slivers.
- **Borrowing** shows as a neutral, solid "borrowed" segment on the pot (federal 2024 ~€33 bn).
  It is never textured.

## Encoding rules (one meaning each)

| Channel | Meaning |
|---|---|
| Hue | Legal recipient. Fixed per entity, max 8, validated with the dataviz palette validator. |
| Texture (hatch) | Only "not individually traceable / pro rata\*" |
| `≈` prefix | Estimate (indirect taxes, any modelled value) |
| Badge | Status of the source: exact law · official · provisional |

The map's diverging palette must not reuse recipient hues.

## Interaction

- **One control row:** gross-wage slider with ticks (minimum wage, median, average, 2× average) ·
  Land dropdown · zoom (You | Germany) · DE | EN.
- **The payslip assumptions are stated in one muted line:** tax class I, no children, no church
  tax, average Zusatzbeitrag, statutory insurance, employee (civil servants differ).
- **Layer chips:** Payday · Shopping ≈ · Fuel & energy ≈ · Rent ≈. All are on by default.
  Clicking one isolates its route and dims the rest.
- **Hover or focus:** amount, share, mechanism in plain words, status badge.
- **Click opens a drawer as an overlay**, not a permanent rail. It shows:
  - the mechanism mini-diagram (VAT pool, wage-tax decomposition, trade-tax levy);
  - a one-level-deeper breakdown of the pot;
  - benchmarks against other Länder;
  - sources.
- **The URL hash holds all state.** Animated re-layout respects reduced motion.

## Secondary views (below the hero, short)

1. **Equalisation map:** Länder, € per resident, diverging, pooled, with no bilateral wires.
   Clicking a Land sets the place.
2. **All taxes table:** the 2024 amount, legal split and recipient for every named tax, with an
   inline bar.
3. **Time strip:** revenue and spending over time as small multiples (never dual axis), only if
   the data exists.
4. **Sources and data table:** a build-time static fallback, with every number linked to its raw
   file and coordinates.

The data year is labelled per value. A Land whose spending data is 2021 says so on the pot.

## Visual language and text

- **Type:** serif headings and mono stage labels, kept from the prototype. All numbers are sans,
  including the hero.
- **Title:** plain ("Where taxes go · Germany 2024" / "Wohin Steuern fließen · Deutschland 2024").
- **Status:** a quiet footer line plus per-number badges, instead of the yellow banner.
- **No slogans and no essays.** The only words are the boundary label, the `*` and `≈` notes, and
  the assumptions line.

## Layout

- **Desktop 1440×900:** the control row, plus the master flow at full width (~1380 px), fits
  without scrolling. The drawer overlays from the right.
- **Mobile 375 px:** don't rotate the Sankey. Each stage becomes one 100 % stacked bar, with a
  tappable list under it showing amount and share. Controls collapse into a sheet.
- **No JavaScript:** a static summary and table.
- **Hosting:** GitHub Pages via Actions, with a correct Vite `base`.

## Data contract (v3.1, after the data layer landed)

The front end reads **only** `data/` (index: `data/manifest.json`; rules: `data/README.md`). The
constructs and their verified arithmetic are in `docs/research/RATIONALIZATION.md`. Use its
numbers and its `*` markers as given.

| View element | File(s) | Notes |
|---|---|---|
| Payslip (You zoom) | `de/citizen/payslip-parameters.json` | Computed in the browser from the parameters. **A unit test must reproduce every row of `payslip-examples.json` exactly.** Default year 2024 so it matches the pots, with a 2025 and 2026 toggle; the pot year stays visibly labelled. |
| Employer ghost bar | same | |
| Legal split of each tax | `de/taxes/legal-allocation.json` | Wage tax 42.5/42.5/15; VAT annual formula |
| Purchase layers ≈ | `de/citizen/purchase-taxes.json` | Rates are law; prices carry `*` |
| Federal pot | `de/federal/budget-2024.json`, `overview.json` | Total **€465.7bn** (reconciled). Show grants to social insurance as a transfer, not as federal spending. Borrowing comes from `overview.json`. |
| Land pot | `de/laender/functions-2022.json`; `de/berlin/functions-2024.json` for Berlin | Year labelled per Land (2022 vs 2024) |
| Municipal pot | `de/municipal/functions-2024.json` | |
| Social pots | `de/social-insurance/accounts.json` | Fenced pools. Payroll view €529.3bn (`*` proxy). The transfer ledger removes inter-system flows. Federal grants are a transfer edge. |
| Germany zoom | `de/government/cofog.json` (S13, 2024p), `aggregates.json` | Revenue bridge: taxes 49.7 / contributions 37.4 / other 12.9 + deficit €115.3bn; €69.95 per resident per day |
| Named-tax drawer and table | `de/taxes/by-tax.json`, `by-recipient.json` | Cash basis. Never add these to ESA figures. |
| Equalisation map | `de/equalisation/2024.json`, `de/population.json`, `data/geo/de-laender.json` | All BEZ types included |
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
