# Mythoveya: Call of the Wildbound

Browser 3D creature-collection RPG. React 19 + React Three Fiber/Three.js client, Express 5 + Colyseus 0.17 server, `node:sqlite` saves, Zod validation, TypeScript everywhere. Node **24** only (`engines`), npm 11. Windows is the main dev machine (PowerShell; CRLF working copy, LF in git).

Source-of-truth docs: `PROGRESS.md` (current handoff + verification record), `KNOWN_ISSUES.md` (limits/bugs), `PLAN.md` (original phases), `ASSETS.md` (art/audio provenance), `docs/*.md` (per-feature player guides), `docs/DEVELOPMENT_HISTORY.md` (archived handoffs). Read those before scanning code.

## Commands

```powershell
npm run dev              # tsx watch server :2567 + vite :5173 (proxies /api, /matchmake, /socket)
npm run typecheck        # tsc --noEmit (covers apps, packages, tests, scripts)
npm test                 # vitest, tests/**/*.test.ts, files run serially (~1-2 min)
npx vitest run tests/x.test.ts   # one file
npm run content:audit    # roster/actions/passives/families consistency
npm run balance          # 20,000 simulated battles -> docs/BALANCE.md
npm run build            # tsc + vite -> dist/client + esbuild server -> dist/server
npm start                # compiled game + API on :2567
node scripts/smoke-production.mjs   # compiled build + two-human arena smoke
npm run build:pages      # static standalone build -> dist/pages (base /Mythoveya/)
npm run preview:pages    # serve it at http://127.0.0.1:4173/Mythoveya/
node scripts/smoke-pages.mjs [url]  # Chromium smoke of the Pages build (or a deployed URL)
npm run test:e2e         # Playwright, tests/browser, own services on :5174/:2568, data/browser-tests.sqlite
```

`Play Mythoveya.cmd` -> `scripts/start-game.ps1`: health-checked launcher for normal play (5173/2567, `data/mythoveya.sqlite`).

Playwright runs are long (tens of minutes), single worker, and use `npm run dev` with HMR: **do not edit source while they run**. Run them from a separate `git worktree` (junction `node_modules`) if you need to keep working. Last full run: see `PROGRESS.md`. Verify UI changes with a throwaway Playwright script against `npm run preview:pages` (no backend needed); keep such scripts in ignored `artifacts/`.

## Layout

- `packages/shared/` — rules and content shared by client and server. `content.ts` (species, avatars, regions, STARTERS), `roster.json` (92 species + 16 evolved), `combat.ts` (battle engine, autoAction), `economy.ts` (pity, recruit, XP, daily reset), `types.ts` (`Profile` = the save), one module per feature (`town`, `haven`, `islands`, `festival*`, `canyon`, `hollow`, `meadow`, `wildwood`, `rally`, `conservancy`, `atlas`, `rescue`, `lodges`, `lodge-*`, `homes` (walk-in home interiors), `wild` (who turns up by time and weather, newcomer levels, Journal hints and the seen list), `lineups` (suggested team, recent lineups), `milestones` (keeper titles, read from the save), `looks` (keeper hair dyes; mutation in `apps/server/look-game.ts`), `seasons` (dated lantern festivals), `adventure`, `events`, `shops`, `weather`, `world-time`, `pathfind`, `audio-content`).
- `apps/server/` — `index.ts` (Express + Colyseus wiring only), `routes.ts` (Zod request schemas + handlers, shared with the browser build), `game.ts` (mutation dispatcher `mutate(p, kind, v)`, PvE battles in memory `pve` map, `finishPve`), `<feature>-game.ts` (per-feature mutations called from `game.ts`; `season-game.ts` handles `season-*`), `rooms.ts` (Colyseus `ArenaRoom` for human matches), `store.ts` (SQLite: profiles/operations/matches/festival_runs, `atomic`, `operation` replay guard), `new-profile.ts` (new guest defaults).
- Standalone browser build: `apps/server/browser-store.ts` (same API as `store.ts`, localStorage key `mythoveya-standalone-save`), `browser-crypto.ts` (node:crypto stand-in), `apps/client/src/local-server.ts` (maps api paths to `routes.ts`). Swapped in by the plugin in `vite.config.ts` only in `--mode pages`; other modes stub `./local-server` so Node-only code is never bundled.
- `apps/client/src/` — `main.tsx`, `App.tsx` (screens, panels, lazy chunks), `api.ts` (`api()`, `mutate()`, `STANDALONE`), `Scene.tsx` + region files (`Haven*`, `Meadow*`, `Canyon*`, `Hollow*`, `Rally*`, `Conservancy*`, `Atlas*`, `Rescue*`, `Lodge*`, `HomeScene`, `SeasonalLanterns`), `models.ts` + `creature-dna.ts` (procedural creature/keeper geometry; per-family skin surfaces, dragon membrane and bird feather wings; per-family gaits and battle motions in `animateCreature`; keeper idle habits in `animateAvatar`), battle FX `HitBurst.tsx` (impact, `SupportGlow`, `Confetti`) + `skill-path.ts` (element flight paths), `StatusAura.tsx` (battle statuses), `battle-labels.ts` (screen-reader text), `WaterGlints.tsx` (glints, raindrop rings, snow/dew follow mode), `IslandFringe.tsx` (per-region rim fringe), `Ambience.tsx` (lazy chunk: `RegionMotes`, `MorningMist`, `Puddles`, `GroundBirds`, snow and dew glints), `glyphs.ts` (camera-facing glyph sprites, soft dot; browser only), `Puffs.tsx` + `puff-buffer.ts` (breath, dust, sparkles, splashes), `carried.ts` (`useCarried`: lanterns and leaf umbrellas), `mount-turns.ts` (`useMountTurn`: costly props appear one at a time), `grid-slices.ts` (walk grids built between frames), `cloud-shadows.ts` + `cloud-pass.ts` (drifting cloud shadows; a material with its own `onBeforeCompile` must call `withCloudShadows`), `dialog-focus.ts` (modal panels), `gamepad.ts` + `gamepad-map.ts` (controller), `install-prompt.ts`, `whats-new.ts` (title screen list; update it with player-facing changes), `adaptive.ts` (frame-rate monitor, `perf.lite`, Decorative effects setting), `context-recovery.ts` (rebuild a Canvas after WebGL context loss), `PhotoMode.tsx` (P key; Explorer registers `photo.grab`), `BattleScene.tsx` (the battle stage, loaded with the battle screens), `Arena.tsx` (battle UI + human arena lobby), `Panels.tsx`, `WorldHUD.tsx`, `audio.ts` (Web Audio synthesis), CSS per area.
- `tests/*.test.ts` — vitest unit/server tests; server tests set `DB_PATH` to a temp file then dynamic-import `store`/`game`. `tests/standalone.test.ts` mocks `store` with `browser-store`. `tests/browser/*.spec.ts` — Playwright journeys.
- `scripts/` — content audit, smoke tests, launcher, layout/profile helpers.
- `apps/client/service-worker.js` — offline play in the Pages build only; `vite.config.ts` fills in its file list, and `scripts/make-icons.mjs` renders the app icons.
- `.github/workflows/pages.yml` — typecheck, standalone tests, `build:pages`, deploy to GitHub Pages on push to `main`. `.github/workflows/tests.yml` — typecheck, content audit, full vitest, both builds and `smoke-production` on pushes and PRs. Playwright is local only.
- Ignored: `data/` (saves), `dist/`, `artifacts/` (logs, screenshots), `test-results/`.

## How a gameplay action flows

Client calls `mutate(kind, data)` -> `POST /api/mutate` -> `routes.mutateRequest` (Zod `kind` enum + fields) -> `store.operation(token, requestId, ...)` (transaction; replays stored result for a repeated `requestId`) -> `game.mutate` switch -> feature module -> `save(p)`. **Adding a mutation kind**: add it to the enum in `routes.ts`, handle it in `game.ts` (or the feature's `*Mutation`), add a server test, call it from the client via `mutate`. A result `message` is only shown as a toast for kind prefixes listed in `run()` in `App.tsx`; add a new prefix there.

The server is authoritative for currencies, rewards, ownership, progression and dates; physical proximity is client-checked (documented limit). Daily resets use UTC (`utcDay`).

## Conventions

- Match surrounding style: terse functional TS, few comments, Prettier-ish formatting (some feature files are deliberately compact). No new dependencies without need.
- New optional `Profile` fields must be optional and initialised lazily (`xxxOf(p)` / `ensureTown(p)` pattern) so legacy saves load.
- Keep species IDs, mutation kinds, and localStorage keys stable (`mythoveya-session`, settings keys, `mythoveya-standalone-save`).
- Shared live state for HUD/audio lives in `village-materials.ts` (`worldFocus` keeper position, `worldHeading` yaw, `nightState`, `keeperEmote`, `companionJoy`, `companionRest`).
- Node tests can't import modules that pull in `audio.ts` (it touches `document` at load). Keep testable logic in small pure modules (`puff-buffer.ts`, `puddle-spots.ts`, `bird-flock.ts`, `mist.ts`, `battle-labels.ts`, `adaptive.ts`, `packages/shared/elements.ts`) next to the component that draws it. Watch the entry chunk: importing `combat.ts` into the scene once pulled the whole battle engine in. Weekly events: `packages/shared/events.ts` (`FEATURED_WEEKS`, ids start `w-` so they reset weekly).
- Client 3D objects own and dispose their geometry/materials; heavy panels and scenes are `lazy()` chunks.
- Use `import.meta.env.BASE_URL` for public assets (the Pages build lives under `/Mythoveya/`).
- Conventional Commits with a short what/why body. Update `PROGRESS.md` / `KNOWN_ISSUES.md` / player guides with each meaningful change.

## Do not break

- Old saves must load: never change the SQLite schema or `Profile` shape incompatibly; never commit or delete `data/mythoveya.sqlite`.
- Reward replay safety (`operation` + `requestId`, `matchRecorded`) and one-time claims.
- Local multiplayer (Colyseus `ArenaRoom`, `/matchmake`, `/socket` proxy) and the normal `npm run build` / `npm start` path.
- The Pages build: no `node:*` imports in modules reachable from `routes.ts` except via `store.ts`/`node:crypto` (which are aliased). Check with `npm run build:pages`.
- Do not weaken or delete existing tests to make them pass; explain first if a test is wrong.
- Accessibility features: keyboard play, Reduced Motion, touch joystick, 390 px layouts.
