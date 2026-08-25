# where-is-the-tax

An interactive fiscal graph that answers: **where does money paid in Germany go?** It follows
named taxes through their legal recipients, geographical clearing and equalisation, then marks the
budget boundary before showing each recipient's spending context. Every number links to exact
provenance and every accounting limit is explicit.

> Current status: the core Germany route figures have been independently reproduced from official
> sources. The later all-Länder, spending-account, and social-insurance additions are cross-checked
> but still await the same observation-level independent pass. Publication also waits on provenance
> records and evidence snapshots.

Run `npm ci`, then `npm run dev` to inspect the preview. `npm test`, `npm run typecheck`,
`npm run validate:fixture`, and `npm run build` verify the current implementation.

**→ [Deep research report](docs/research/GERMANY_FISCAL_GRAPH_2026-08-05.md)** — official-source
fiscal topology, exact data paths, limits, and implementation recommendation.

**→ [Project plan](PLAN.md)** — the fiscal-graph product contract, data model, and phases.
