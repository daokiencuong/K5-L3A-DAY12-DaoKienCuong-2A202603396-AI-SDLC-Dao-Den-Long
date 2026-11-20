# v1.0.0 · Web release bundle

This archive contains the production `dist/` build, `server.js`, and `package.json`. It needs Node.js 20.19+ and no runtime npm dependencies because React and Three.js are bundled into static assets.

1. Extract the archive.
2. From the extracted directory, run `node server.js`.
3. Open `http://localhost:4173` in Chrome or Edge.

The server writes the local leaderboard to `data/leaderboard.json`; export it with `node server.js --export-leaderboard out.json`. For development and the benchmark/soak harnesses, use the full source repository and follow its README.
