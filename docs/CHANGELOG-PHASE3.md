# Changelog · Phase 3

## Breaking changes from contract 1.1 to 1.2

- Lanterns now have fuel, `ever_lit`, and `relit_count`; a lit lantern without scenario fuel starts at 100. Fuel at or below zero turns the lamp off and clears deposited motes.
- `lantern_lit` adds `relight`; `refuel`, `lantern_out`, and periodic `fuel_drain` events are added. `game_over.reason` is `dawn_survived`, `dawn`, or `no_flames`. The early `all_lit` ending is removed.
- Shade state adds `drain`, and shade snapshots include `target_lantern_id`.
- Player snapshots add dynamic `capacity`, increasing by two per successful light up to twenty. Scenarios can set `successful_lights`.
- Night durations change to 240/270/300 seconds. Victory is checked only at dawn and requires at least 60% of lanterns still lit. Flame depletion has priority on the last tick.
- Score rules are replaced: deposits +5 per mote, first light +100, relight +40, normal pulse hit +5, drain pulse hit +15 total; dawn adds 50 plus floor(fuel) per lit lantern and 50 per remaining flame. There is no time bonus.
- Contract version and snapshot version advance to 1.2. The old Phase 2 scoring/early-win assertions were revised in the Phase 2 regression script because Ticket-03 explicitly replaces those rules.
- Settings add a persisted color-distinguishable palette with non-color lamp shapes, white warning text and a warning icon.

Design rationale: [`ADR-003-lantern-fuel.md`](ADR-003-lantern-fuel.md).
