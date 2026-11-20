# Project instructions

- The game uses React UI, Three.js rendering, and a shared deterministic JavaScript simulation in `src/sim.js`.
- Install dependencies with `npm install`; build with `npm run build`.
- Headless contract: `node src/headless.js --seed 1 --night 1 --ticks 120 --out output.jsonl`.
- Run `npm run verify` after changing simulation or contract behavior.
- Keep tuning values synchronized across `src/sim.js` and `game.contract.json`.
- Controls: WASD follows the camera, Space jumps, E lights lanterns, F pulses light.
- Preserve the v1.0 JSONL protocol, 60 Hz ticks, stable seeded output, and scenario semantics.
