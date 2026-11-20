# Phase 2 · Contract 1.1

This document records the Phase 2 acceptance criteria, implementation decisions, and reproducible evidence for Đảo Đèn Lồng.

## Acceptance criteria

| Ticket requirement | Acceptance criteria | Verification |
|---|---|---|
| Shared standardized rules | Browser and headless use the same 60 Hz JavaScript simulation, meter units, Y-up coordinates, tuning, event order, and seeded spawns. | `scripts/verify_phase2.js`; `game.contract.json` |
| Three maps | Night 1 has 1 radius-40 island, 5 lanterns, 24 motes. Night 2 has radius-28 islands at x=0/70, bamboo span x=26..44, 6 lanterns, jump pads, and 24 motes. Night 3 has a radius-45 island with 0/3/6 m tiers, ramps, bell tower, jump pad, 7 lanterns, and 30 motes. | Map fixture assertions; Three.js map selection by `--night` browser state |
| Score and lanterns | Deposit awards 10 points per deposited mote and 100 per lamp. Each Shade hit gives 5 points on each pulse, including already stunned shades. Win bonus is `floor(seconds_left)*2 + 50*flames_left`. | `scripts/verify_phase2.js`; scoring path in `src/sim.js` |
| Ordered simulation | Inputs/pause, counters, movement/fall, pickups, lantern interaction, safe zones, pulse, enemy movement, contacts (drifter first), timed spawns, result, snapshot. Paused frames advance wall tick only. | Pause, fall, pulse and contact scenarios in `scripts/verify_phase2.js` |
| Shade state and schedule | States use `spawning`, `wander`, `chase`, `recoil`, and `stunned`. Night 1 spawns 2 at tick 300, then every 480 ticks; later nights use 420/360 tick intervals and caps 8/10. | Scenario/assertions and seeded headless run |
| Drifter and charm | Drifter idle/chase/flee transitions, one-time steal of up to 3, pulse drop, timed removal; charm grants 600 ticks and respawns after 2700. | Theft, drop, and charm pickup scenarios in `scripts/verify_phase2.js` |
| Mote return loop | Picked map motes return to their original point after 600 ticks so the listed finite map placements can supply all required lantern deposits. | Respawn scenario in `scripts/verify_phase2.js`; tuning `mote_respawn_s` |
| Wind | Night 3 uses a deterministic seeded wind direction; scheduled gusts push at 2 m/s. Scenario can disable wind. | `wind_enabled:false` scenario check |
| Three-night loop | Menu → narrated intro → play → result → next night; night 3 ends at Dawn. Loss can replay the current night. Pause offers continue/replay/settings/menu. | React menu and result states in `ui/App.jsx` |
| Settings and HUD | Volume/sensitivity persist in local storage. HUD exposes flame count, clock urgency, lit lamps, score, ten mote cells/slots, abilities, nearby interaction prompt and objective. | React component and localStorage path |
| Headless contract | `--night` accepts 1, 2, or 3; snapshots contain player timers, wind, motes, drifters, charms; full-night run is bounded to 21,600 ticks. | `src/headless.js`; 21,600-tick benchmark recorded in `docs/proof/phase2-verification.txt` |
| Audio and settings | Synthesized night melody and sound cues are volume controlled; volume and mouse sensitivity persist between reloads. | `game.js` Web Audio cues; React settings and localStorage |
| Render performance | The browser target is average 30 FPS at 1280×720. It has not been measured in this headless environment. | Requires browser/device measurement |
| Python removal | Runtime and tooling are Node/React/Three.js. No Python source or project virtual environment remains. | `rg --files -g '*.py' -g '*.pyc'`; git status |

## Explicit implementation assumptions

The ticket says “tuning must match Part 1” but does not include the referenced Part 1 numeric table. Values inherited from Phase 1 are kept when stated in the existing v1.0 contract. Capacity and lamp cost are set to 10 because the Phase 2 HUD explicitly says `x/10` and each lamp requires depositing ten motes. Ticket-provided scoring replaces old score values.

The following values were absent, so they are implementation assumptions: night durations 300/360/360 seconds (keeping every full-night headless run within 21,600 ticks); jump speed 8.5 m/s; gravity 20 m/s²; dash cooldown 3 seconds; dropped-mote lifetime 10 seconds; map-mote respawn interval 10 seconds. Dash speed/duration, charm duration/respawn, shade speed, pulse tuning, flame count and other v1.0 values are recorded in `game.contract.json`.

The ticket refers to an RGB palette table but the supplied attachment contains no RGB entries. The game retains its existing deep blue, jade, and warm-gold visual palette; no numeric RGB compliance claim is made.

## Reproduction

```sh
npm run verify
npm run build
node src/headless.js --seed 42 --night 3 --ticks 21600 --scenario docs/proof/phase2-perf-scenario.json --out night3.jsonl
```

The Phase 1 completion record remains in `docs/PHASE1-NOTES.md`. The old `phase-1` tag was intentionally removed on the user's instruction; this phase does not recreate it.
