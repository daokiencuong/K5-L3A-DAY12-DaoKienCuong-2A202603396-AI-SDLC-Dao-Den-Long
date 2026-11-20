# Phase 3 · Ticket-03 · Contract 1.2

## Acceptance criteria

| Requirement | Acceptance criteria | Evidence |
|---|---|---|
| Fuel model | Lit lanterns lose exactly one 1/60 fuel unit each tick, plus five units per draining Shade. Zero fuel extinguishes the lamp and clears deposited count. | Integer-unit assertions in `scripts/verify_phase3.js` |
| Refuel and relight | Nearest eligible lantern wins; ID breaks equal-distance ties. First light costs 10, relight 5, active refuel follows the ceiling formula, full lamps produce no event or points. | Interaction cases and score assertions in `scripts/verify_phase3.js` |
| Shade drain | Wander chooses nearest weak light before an unlit light; drain starts within 2m, ends on chase/stun/wander conditions, and emits one `fuel_drain` audit event per 60 ticks per Shade. | Target, chase, pulse, aggregate fuel and audit-event scenarios |
| Safe lights and rescue | Lit fuel ≥30 protects its radius. Crossing from below 30 to ≥30 by refueling pushes nearby Shades into at most 30 recoil ticks without contact damage. | Boundary and recoil scenarios |
| Dawn ending | No early win. At timer end, alive with ceil(60% of lamps) wins; otherwise `dawn`. Zero flames wins precedence with `no_flames`, including the final tick. | Three end-reason scenarios and exact bonus assertion |
| Capacity and scoring | Capacity is min(20, 10 + 2 × successful lights); scenario pre-lit lamps do not increase it. All scores follow the ticket's replacement table. | Successful-light cap, scenario default, deposit/refuel/pulse/dawn scores |
| Color-distinguishable mode | Preference persists. Shade eyes/rim use #00B3FF; warnings use white and ⚠. Lamp off/on states differ by shape, flattening and tear mark; low fuel blinks at 1 Hz. | React settings, Three.js lamp/shade rendering, CSS and SVG map marks |
| Compatibility and artifacts | Ticket-03 replacements are documented; unaffected Phase 1/2 checks still run. | `npm run verify`, ADR-003, changelog, `docs/proof/phase3-verification.txt` |

## Intentional replacements

The earlier all-lanterns-lit ending, time-left award, active-lantern refusal, and permanently safe lantern zones are superseded by Ticket-03. The Phase 2 regression suite was updated for those exact replacements; unrelated Phase 2 behaviors remain asserted.

## Deterministic fuel representation

`fuel_units` is an integer count of 1/60 fuel. The public JSON snapshot exposes fuel rounded to one decimal place and never exposes the internal integer. Scenario fuel values are converted to integer units on load. If a scenario says `lit:true` without `fuel`, the lantern starts at 100; unlit lamps expose zero fuel.

## Reproduction

```sh
npm run verify
npm run build
node src/headless.js --seed 42 --night 3 --ticks 21600 --scenario docs/proof/phase3-perf-scenario.json --out docs/proof/phase3-night3.jsonl
```
