# Project instructions

- Read `game.contract.json` and keep every tuning value synchronized with `src/headless.py`.
- Build/check syntax: `python -m compileall -q src`.
- Headless command: `python src/headless.py --seed 1 --night 1 --ticks 120 --out output.jsonl`.
- Keep headless deterministic, fixed at 60 ticks/second, and emit only contract JSONL on the output file.
- Run the browser build locally with `python -m http.server 8000`, then open `http://localhost:8000`.
- Do not invent successful evidence. Regenerate proof files by running the documented commands.
