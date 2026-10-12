# Mythoveya handoff

Updated October 11, 2026. Workspace: `C:/Users/ASUS/Downloads/Mythoveya`; branch `main`. This Whisperleaf update began at `6493496`. Existing saves and the Havenreach, Emberglass and Moonfrost journeys are preserved.

## Implemented

- **Whisperleaf Meadow** now extends around Reedglass Pond, woodland trails, two cottages and a three-metre climb to the old heartroot. Six destinations share map, interaction and walking coordinates. Pond water, tree trunks, buildings and shrine props use shared collision rules. Clearings keep routes and interactions accessible. Building roof footprints are checked against the shoreline; the northern cottage was moved inland after map review.
- **The Forest Choir** opens from Adventure, the region map and pause menu. Form a team of six and visit Rowan's woodland lodge to begin. Whisperleaf retains its zero-win unlock.
- Three chime puzzles use Root, Rain and Wing. Read each verse and answer in the named order. Written labels, shapes, hints, selected-note text, undo and clear controls make sound optional. There is no timer; wrong answers spend nothing. Chime playback and melody replay use the existing SFX bus and global mute settings.
- Each choir grants 35 Gold once and makes its chimes glow. Return to Rowan after all three for Fernibble (or a duplicate shard), 150 Gold, 50 Diamonds, 100 XP and the **Grove Listener** badge. The heartroot blooms and decorative lights appear. Reduced motion stops their movement.
- Two optional wildlife notes grant 20 Gold each once. Six ambient residents use five existing species: Fernibble, Mossprig, Bubbloom, Glimlet and Sylvarion. They follow terrain/collision rules, rest at night and open observation cards. Rowan is clickable.
- The server validates region, team, journey order, shrine IDs, exact melody lengths and notes, and one-time rewards. SQL operations make duplicate request IDs replay safely. Completed choirs, notes and restoration are durable; old profiles create optional journey state only when needed. Unsubmitted melody selections are temporary.
- The woodland trail map includes tree clusters, contour lines and the heartroot landmark; the minimap, waypoint tracking and trailhead-return control cover the expanded region. Terrain uses the existing cached `RaisedTerrain` renderer; static scenery is merged into a vertex-colored mesh. The roster remains 80 base species plus 16 evolved forms, 240 actions, 80 passives and 12 model families.

## Key files

| System | Files |
| --- | --- |
| Layout, routes, verses and optional journey state | `packages/shared/meadow.ts`, `types.ts` |
| Saved actions and API | `apps/server/meadow-game.ts`, `game.ts`, `index.ts` |
| Terrain, scenery and residents | `MeadowTerrain.tsx`, `MeadowScenery.tsx`, `MeadowWildlife.tsx`, `Scene.tsx` |
| Journal, map, HUD and chimes | `MeadowPanel.tsx`, `MeadowMap.tsx`, `meadow-music.ts`, `App.tsx`, `WorldHUD.tsx`, `haven.css` |
| Tests | `tests/meadow.test.ts`, `meadow-server.test.ts`, `tests/browser/meadow.spec.ts` |

Client files above are under `apps/client/src/`.

## Launch

```powershell
npm run dev                 # http://127.0.0.1:5173; API on 2567
npm test
npm run content:audit
npm run build
node scripts/smoke-production.mjs
npm run test:e2e             # separate services on 5174/2568
```

Use Node 24 (verified 24.19.0, npm 11.17.0). Player progress remains in ignored `data/mythoveya.sqlite`; do not reset it. Tests use separate or disposable databases. Run browser suites sequentially because they share ports/output. See the [Whisperleaf guide](docs/WHISPERLEAF.md).

## Verified

- **120 unit/server tests in 24 files passed.** The six focused layout/server tests cover: all stops and signed trails remain reachable, wildlife anchors are walkable, foundations are level and roof footprints stay inland, slopes are gentle, water is blocked, legacy saves remain compatible, wrong melodies do not spend or change progress, and duplicate requests grant once.
- Production build and content audit passed. The initial client is 1,464.99 kB (432.00 kB gzip); Vite retains its large-chunk warning.
- The full Whisperleaf browser journey passed: normal team/region entry, walking routes, wrong-answer retry, undo, melody playback, all choirs, both notes, restoration, rendered chimes/blossoms, owned reward, reload, mobile overflow check and return to the trailhead. No page errors were reported.
- Visually reviewed lodge, pond, mobile puzzle and restored heartroot. All ten selected browser scenarios passed in one nine-minute run: Canyon, three Havenreach checks, Moonfrost, responsive HUD, first-session gameplay, two-player arena, Whisperleaf and settings. The final Whisperleaf rerun passed in 1.9 minutes after the presentation and cottage-placement corrections; it also checks the rendered chime symbols and selected-note separators.
- The final production build and compiled-server smoke passed after presentation and cottage-placement corrections, including local assets, guest progression and two-human arena connections. Both local client and API health endpoints returned HTTP 200.

## Limits and next work

This is a fixed regional exploration/puzzle journey, with no rhythm timer, randomized songs, generic material inventory, new combat mode or new recruitable species. Both cottages have exteriors only. Physical proximity is checked by the client; progression and rewards are checked by the server. Public accounts, hosting, shared exploration, real-time festival rooms, subjective audio quality, long-term balance and physical-device ergonomics remain outside this verification.

Next useful work is a cross-region campaign connecting the four restored places, reusable crafting materials or walkable interiors. Broader limits remain in `KNOWN_ISSUES.md`.

This update contains **12 meaningful local commits** after `6493496`, including browser acceptance coverage and the final documentation milestone. No push or deployment was performed; the original handoff requires a separate request to push. Remote `main` was checked at `6493496b8d4d64e17a2ee2582b8be9846dfa80b4`. Earlier handoffs are archived in `docs/DEVELOPMENT_HISTORY.md`.
