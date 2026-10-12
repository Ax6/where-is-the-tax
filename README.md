# where-is-the-tax

An interactive fiscal graph that answers: **where does money paid in Germany go?** It follows
named taxes through their legal recipients, geographical clearing and equalisation, then marks the
budget boundary before showing each recipient's spending context. Every number links to exact
provenance and every accounting limit is explicit.

> Current status (2026-10-09): the **data layer** is built from locally stored raw sources
> (`research/`), rationalized into `data/` by reproducible scripts (`scripts/research/`) and
> reconciled against official totals; see `ROADMAP.md` for the honest state and
> `docs/research/RATIONALIZATION.md` for the constructs. The interface under `src/` still reads
> the older hard-coded figures and must be rewired to `data/` (see `docs/FRONTEND_PLAN.md` if
> present).

Run `npm install`, then `npm run dev` to inspect the prototype. `npm test`,
`npm run validate:fixture`, and `npm run build` verify the current synthetic implementation.

**→ [Deep research report](docs/research/GERMANY_FISCAL_GRAPH_2026-08-05.md)** — official-source
fiscal topology, exact data paths, limits, and implementation recommendation.

**→ [Project plan](PLAN.md)** — the fiscal-graph product contract, data model, and phases.
