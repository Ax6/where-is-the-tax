# Collection playbook

The long Germany research run is deliberately paused. Start it only after the validator skeleton
passes the synthetic bundle and the user authorizes the run.

## 1. Preflight

1. Copy `logs/TEMPLATE.md` to a dated run log and name collector and independent verifier.
2. Verify current official source identity, endpoint, metadata, status flags, and licence.
3. Inspect both revenue and expenditure before choosing a reference year.
4. Record the newest coherent candidate year, source vintages, and unresolved blockers.

Stop if either side, observation status, or reuse terms are unknown.

## 2. Extract

1. Save exact queries/filters and full statistical context in `extractions.json`.
2. Store raw evidence when licence and size allow; otherwise store its checksum, retrieval recipe,
   and the reason it is not redistributed.
3. Create one extraction per retrieval, not per row. Give every reported observation exact
   coordinates within that extraction.
4. Preserve raw values, flags, zeroes, missing markers, signs, and source rounding.

## 3. Map and reconcile

1. Map only compatible official classifications to the fixed top-level IDs.
2. Keep contextual cash or budget figures outside the additive hierarchy.
3. Declare each parent's child coverage as none, partial, or exhaustive.
4. Use structured linear derivations only; never embed executable formula text.
5. Reconcile exhaustive sets using recorded rounding increments and investigate every excess.

## 4. Explain

Write concise English descriptions, retain useful official German terms, and cite any factual
claim beyond a classification definition. State provisional/revision caveats visibly.

## 5. Verify independently

The verifier starts from raw evidence and queries—not the collector's conclusions—and reproduces
source identity, coordinates, contexts, mappings, arithmetic, status, descriptions, omissions,
and licence records. A disagreement remains `pending`; it is not averaged away.

## 6. Publish artifacts

- Update the bundle, evidence manifest, source catalog, data licences, dated log, and any stable
  learnings.
- Run validation, type checking, tests, static generation, and the production build.
- Inspect the rendered source panel and full hierarchy.

### Exit checklist

- [ ] Selected year is the newest coherent year and the choice is documented.
- [ ] Every displayed value has exact provenance and known status.
- [ ] All additive relationships share one compatible context.
- [ ] Headline totals and balance reproduce within source-rounding bounds.
- [ ] Missing, negative, and unavailable values retain their meaning.
- [ ] Each source has verified reuse terms and attribution.
- [ ] Independent review is `verified`, with disagreements resolved in the log.
- [ ] Deterministic checks and rendered inspection pass.
