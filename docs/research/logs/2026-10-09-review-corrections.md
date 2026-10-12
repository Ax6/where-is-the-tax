# Corrections applied after the independent reviews — 2026-10-09

| Review | Finding | Action |
|---|---|---|
| A | `federal/budget-2024.json` key item "Tit. 636 8x" = 107,518.7 Mio is Funktion 221 (636 81-85 alone = 107,420.5) | label corrected to "all Titel with function 221; of which 636 81-85 = 107,420.5 Mio" |
| A | Eurostat TE 2024 flagged `provisional` in cofog.json, `final` in aggregates.json | unflagged Eurostat cells are now `unflagged`, not `final` (both files) |
| A | "392m before/after-distribution gap is a timing feature" unsourced | wording changed to "the GENESIS metadata does not explain the gap; both kept" |
| A | municipal 58 Mio residual unexplained | wording changed to "not explained in the workbook; its §5.2 applies the Bereinigung globally" |
| A | RATIONALIZATION §1 GF01 "transfers between levels" (GF0108 = 0 in S13); GF10 "health insurance benefits" | relabelled (interest on debt GF0107, basic research; sickness/disability cash benefits) |
| A | §3 VAT shown as "annual formula 48.1/49.1/2.8" | statute base shares 52.81/45.19/2.00 (§ 1 (1) FAG) added; realised split labelled as such |
| A | §3 trade-tax levy "35 % of base" | "35 % of the Messbetrag (≈ 8.8 % of receipts in 2024)" |
| A | §3 people-vs-company partition contestable | marked `*` with the reason |
| A | §2 ESA taxes vs §3 cash taxes without bridge | bridge sentence added |
| A | §6 Berlin VAT book 10,594 vs BMF 10,469 unmentioned | sentence added |
| A | §4/§7 two EU figures (Destatis 32,011 vs Commission 31,381) | sentence added in §7 |
| A | §8 "Health 7.3 + 1.45" is the statutory average | marked `*` with explanation |
| B | `zusatzbeitrag_used` marked `statute` although § 39b uses the insurer's own rate | status `assumption`; status legend extended; effect of 3.13 % quantified in the note |
| B | Soli onset "roughly €100,000" | corrected to €92,396 gross (2026, class I, childless) |
| B | `boundary_gaps_eur` mislabelled | renamed `boundary_floor_effect_eur` with note; true formula gaps recorded |
| B | PV 3.6 % 2026 inferred; 2024/2025 tariff constants from PAP, not BGBl.; "West ceilings" wording; 2024 Jan-Nov tariff | recorded in `review_notes` of payslip-parameters.json |
| C | M1 KJ1 2025 elimination residual differs by 90 m; M2 ledger #29/#45 coordinate names only Konto 04780; M3 false cent precision on the cross-system block | sent back to the social-insurance build for correction (see the extraction log's "corrections applied") |
| C | C1 §10 per-day figure (€27.44) repeats the inter-system double count | labelled gross; consolidated ≈ €25.9/day added, marked `*` approximate |
| C | C2 "withheld from wages" oversells a proxy | relabelled "contributions of compulsorily insured employees (employee + employer share)", proxy `*` with exclusions next to the number; file labels/scope sent to the build |
| C | C3 KVdR 27.3 includes § 106 SGB VI subsidies | stated as upper bound in §10 and in the ledger (build) |
| C | C4 46.0 bn is a lower bound | "at least" wording in §10 and in the file |
| C | C5 "contributions are not taxes" unsourced | heading softened; § 3 (1) AO fetched (`ao_3.html`) and cited; tax share of pension revenue stated |
| C | C6 ESA D61 comparison half right | replaced by "not comparable line by line" with the reasons |
| C | C7 AAG U1/U2 levies missing | mentioned in §10; build asked to list them as "not in total" |
| C | C8 ≈60 GKV Konto labels untranslated; "Wanderungsausgleich" opaque | build asked to add English labels |

All numeric re-derivations in reviews A and B reproduced the data files; no numeric correction was needed.
