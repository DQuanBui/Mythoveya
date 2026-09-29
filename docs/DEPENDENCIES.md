# Runtime choices

Tested on Windows with Node 24.19.0 and npm 11.17.0. React 19 is paired with React Three Fiber 9 and Drei 10. Three.js 0.180 provides procedural geometry. SQLite uses the Node 24 built-in `node:sqlite` module.

Colyseus core 0.17.51, WebSocket transport 0.17.13 and SDK 0.17.43 are pinned together. Reconnection uses the 0.17 `onDrop` / `onReconnect` lifecycle. The older 0.16 branch required an outdated default-export dependency; it was replaced after a real server startup caught that incompatibility. The lockfile contains the tested resolution. Nanoid is overridden to compatible 3.3.18 for its security fixes.

Official references checked during implementation:

- https://r3f.docs.pmnd.rs/getting-started/introduction
- https://docs.colyseus.io/room/lifecycle
- https://docs.colyseus.io/room/reconnection
- https://docs.colyseus.io/sdk
- https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html

No external service is called during normal gameplay. Dependency and browser installation need a network connection. Web Audio synthesis and Three.js model generation run locally.
