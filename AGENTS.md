# Project instructions

- Game stack: React UI, Three.js rendering, Node.js tooling, shared deterministic simulation in `src/sim.js`.
- Read `game.contract.json` and `docs/PHASE2-SPEC.md` before changing gameplay. The contract is v1.1.
- Install with `npm install`; build with `npm run build`; run acceptance checks with `npm run verify`.
- Headless usage: `node src/headless.js --seed 1 --night 1|2|3 --ticks 120 --out output.jsonl`.
- Preserve 60 Hz simulation, meter units, Y-up, deterministic seeds, JSONL output, and v1.1 snapshot/event schema.
- Keep `TUNING` in `src/sim.js` synchronized with `game.contract.json`.
- Inputs are edge-triggered for jump, dash, interaction, pulse, and pause. Movement is camera-relative: W forward, S backward, A left, D right. E deposits, F pulses, Shift dashes, Esc/P pauses.
- The simulation tick order in the Phase 2 spec is normative. Rendering must not change headless results.
- Phase 1 source is preserved in Git history. Do not recreate the `phase-1` tag; it was removed at the user's request. Phase 2 submission tag is `phase-2`.
- Record future agent and product decisions in `docs/PHASE2-SPEC.md` or the relevant phase notes.
