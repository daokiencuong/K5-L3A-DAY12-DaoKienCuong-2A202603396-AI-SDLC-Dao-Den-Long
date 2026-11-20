# ADR-003 · Lanterns consume fuel; survive until dawn

- Status: Accepted
- Date: 2026-11-20
- Contract: 1.2

## Context

Phase 2 ended immediately when every lantern was lit. Playtests showed that a skilled player could finish the objective early, removing pressure from the final part of the night. Ticket-03 replaces that win condition: lanterns burn out, Shades can drain low lanterns, and Mây must stay alive until the timer ends with at least 60% of lanterns lit.

## Decision

Each lantern stores integer `fuel_units` where 60 units equal one displayed fuel unit. This represents one tick (1/60 second) exactly and avoids accumulated floating-point drift. Snapshots convert units to fuel rounded to one decimal place. A lit lantern loses one unit per tick, plus five units per tick per draining Shade. At zero it turns off, clears `deposited`, retains `ever_lit`, and emits `lantern_out`.

First lighting costs ten motes and awards 50 deposit points plus 100 first-light points. Relighting costs five and awards 25 deposit points plus 40 relight points. Refueling an active lantern uses the ticket's ceiling rule, awards five per mote, and never gives points when the lantern is full. In `refuel`, `amount` is the number of motes consumed and `fuel` is the new fuel level. This keeps the event meaningful when tick decay creates a small gap that is rounded up to one mote but fuel clamping leaves the lamp at 100. Successful lights increase carrying capacity by two, capped at twenty.

Shades in `wander` choose the nearest weak lit lantern before an unlit lantern, with ID as the tie-breaker. They enter `drain` within two metres and leave that state for chase, stun, or wander under the ticket's transitions. Lit lanterns at 30 fuel or more protect their safe radius; low-fuel lights do not. Refueling a weak lantern to 30 or more pushes nearby Shades outward into a 30-tick recoil state.

The dawn check runs after every other update on the terminal tick. Zero flames always loses with `no_flames`; otherwise the player wins with `dawn_survived` when enough lanterns remain lit, or loses with `dawn`. Victory points come only from lit lantern fuel and remaining flames. The former all-lit early win and time-left bonus are removed.

## Consequences

- Snapshots and scenarios use the v1.2 lantern fields and include capacity.
- The old `all_lit` event/early end is removed; `game_over.reason` identifies dawn outcomes.
- Phase 2 scoring and durations are superseded. Phase 1–2 behavior unrelated to this change remains under regression tests.
- `scripts/verify_phase2.js` was updated where its old early-win and score expectations were directly replaced. A new `scripts/verify_phase3.js` tests the new fuel and dawn rules.

## Validation

Run `npm run verify`. Headless proof and the Phase 3 test trace are stored under `docs/proof/`.
