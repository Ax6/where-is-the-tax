# Prior art

> Checked 2026-10-09 (HTTP reachability only; design observations are from earlier knowledge of
> these products and are marked *inferred* where not re-observed on that date).

| Product | Publisher | URL | Status 2026-10-09 | What it does | Worth taking | Avoid |
|---|---|---|---|---|---|---|
| Bundeshaushalt digital | BMF | https://www.bundeshaushalt.de/DE/Bundeshaushalt-digital/bundeshaushalt-digital.html | reachable (200) | Treemap/sunburst of the federal budget by Einzelplan and function, Soll and Ist, with downloadable XML/CSV (our federal raw source) | official, title-level drill-down; the download portal's reuse notice | federal core budget only (≈ a quarter of the state); no link from taxes to spending; German only (*inferred*) |
| OffenerHaushalt | Open Knowledge Foundation DE | https://offenerhaushalt.de/ | reachable (200) | Municipal and Land budgets visualised from uploaded data | per-municipality view idea | community-maintained vintages, not an official source; cannot be cited as truth |
| Where Does My Money Go? | Open Knowledge Foundation UK | https://wheredoesmymoneygo.org/ | **not reachable** (DNS failure) | Historic UK "daily bread" tool: enter a salary, see tax per day by function | the per-day, per-salary framing (we implement it from statute and COFOG) | depends on one consolidated pool; do not imply a tax finances a programme |
| USAFacts | USAFacts | https://usafacts.org/ | reachable (200) | US government finances explained from official data with sources per figure | source-per-number discipline; plain charts | US-specific |
| OECD Taxing Wages | OECD | https://www.oecd.org/en/publications/taxing-wages-2025_b3a95829-en.html | 403 for the fetcher (bot block), publication exists | Tax wedge on an average worker, comparable across countries | the "tax wedge" construct (employee + employer contributions + income tax over total labour cost) | OECD model assumptions differ from German statute details; secondary for our purposes |
| Steuerzahlergedenktag | Bund der Steuerzahler (lobby association) | https://www.steuerzahler.de/ (page moved; 404 on the old path) | page not found at the old URL | "Tax freedom day" style claim | none as a source | **contestable**: computed by an interest group with its own definitions; if ever cited, mark `*` and never present as official |

Lessons applied in this repository:

- Keep the budget boundary explicit (no tax → programme causality), unlike pool-based tools.
- Give every number a source and coordinates, like USAFacts, but from primary German sources.
- Implement the "my payslip / per day" entry point from statute and official totals rather than
  from an interest group's estimate.
