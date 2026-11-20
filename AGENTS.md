# Project instructions

- Stack: React, Three.js, Node.js; shared deterministic simulation in `src/sim.js`.
- Read `game.contract.json`, `docs/PHASE3-SPEC.md`, and `docs/ADR-003-lantern-fuel.md` before changing gameplay. Release contract is v1.3; gameplay snapshots intentionally remain v1.2.
- Install with `npm install`; build with `npm run build`; run all phase checks with `npm run verify`.
- Headless usage: `node src/headless.js --seed 1 --night 1|2|3 --ticks 21600 --out output.jsonl`.
- Preserve 60 Hz, meters, Y-up, deterministic seeds, JSONL output, and the v1.2 event/snapshot schema.
- Keep `TUNING` in `src/sim.js` synchronized with `game.contract.json`.
- Inputs are edge-triggered for jump, dash, interaction, pulse, and pause. WASD is camera-relative; E lights/relights/refuels; F pulses; Shift dashes; Esc/P pauses.
- Follow Ticket-02 tick order with Ticket-03 fuel processing at step 2 and dawn adjudication last. Rendering must not change headless behavior.
- Phase 3 replaces Phase 2 lamp lifetime, early win, time bonus, and scoring; consult ADR-003 and the changelog before changing those rules.
- Keep the deleted `phase-1` tag deleted. `phase-2` history/tag is retained; Phase 3 submission tag is `phase-3`.
- Record follow-up product/agent decisions in the relevant phase spec or ADR.
- Do not change the deterministic benchmark fixture or its 200 Shades, 100 motes, 3 lit lamps, 3-second warm-up, or camera orbit. Run `npm run bench -- --seed 42 --duration 30 --out bench.json` to refresh its measured evidence.
- Keep `bench.json` and `soak.json` as submission evidence; user leaderboard data in `data/leaderboard.json` stays ignored and local.
