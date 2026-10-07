# Mythoveya handoff

Updated October 7, 2026. Repository: `C:/Users/ASUS/Downloads/Mythoveya`, branch `main`.

## Recovery and current scope

The handoff began at `e8785fc` with a clean working tree. No incomplete edits or companion shimmer implementation existed. The four preceding feature commits were present: solid props (`fd6db4c`), battle arenas/formations/health bars/ultimate camera/damage numbers (`9143ee1`), species anatomy (`f88edf1`), and twelve new A/S creatures (`e8785fc`). These were preserved and checked rather than rebuilt. A read-only `git ls-remote` check confirmed GitHub `main` still points to `e8785fc`, so those four commits are published and this session has not pushed anything. The old Colyseus launch blocker is resolved: Node 24.19.0, npm 11.17.0, Colyseus server 0.17.51 / SDK 0.17.43.

The roster is 72 recruitable species (16 A, 16 S, ten each E through B), 16 evolved forms, 216 base actions, 72 passives and twelve body families. Havenreach already contains instanced woodland, birds, flowers, clouds, wildlife, cottages, shops, shore and mountains; islands and festival activities remain intact.

## Implemented this session

- Shimmering appearances have a 1-in-50 independent roll when a new owned companion is first created: starter, guide gift, recruitment, successful wild bond, or first guardian reward. All production acquisitions use server crypto randomness. Duplicate species grant shards without rerolling. A newly reacquired base species after evolution is a new companion and gets its own roll.
- Optional `Owned.shimmer` preserves old saves: a missing value means normal, with no retroactive roll. Evolution, formation, training, habitats and serialization retain it. Battle units and arena previews copy the cosmetic flag without stat, rarity, pity or battle-RNG changes.
- Deterministic alternate palettes and three gentle glints appear in battle, following, habitats, Journal previews/portraits, recruitment reveals, team/care screens and festival racers/ghosts. Model and portrait caches distinguish appearances. Reduced motion keeps glints still.
- Movement checks the entire step and each slide at 0.1 m intervals, preventing sprint/low-frame-rate tunnelling through thin props. Existing collision geometry, entrances, bridge and interactions remain shared with pathfinding.
- Settings entry points work from title, HUD and pause. Day/night now has its own correct label instead of a second Camera shake label.
- Journal portraits render near the viewport, at most one queued model per animation frame. Scrolling loads later rows. Panels, arena networking, islands and minigames load on demand; lightweight island marker data no longer imports whole scenes into the HUD.

## Key files

| System | Paths |
| --- | --- |
| Acquisition / saved appearance | `packages/shared/economy.ts`, `types.ts`; `apps/server/game.ts`, `store.ts` |
| Battles / multiplayer | `packages/shared/combat.ts`; `apps/server/rooms.ts`; `apps/client/src/Scene.tsx`, `Arena.tsx`, `BattleArena.tsx` |
| Creature anatomy / appearance | `apps/client/src/creature-dna.ts`, `models.ts`, `portraits.tsx` |
| Collection / recruitment | `apps/client/src/Panels.tsx`, `RecruitmentStage.tsx` |
| Habitat / festival variants | `apps/client/src/HomeIsland.tsx`, `FestivalGames.tsx`; `apps/server/festival-game.ts` |
| Collision / navigation / world life | `packages/shared/haven.ts`, `pathfind.ts`; `apps/client/src/HavenNature.tsx`, `HavenBirds.tsx`, `HavenWildlife.tsx` |
| Loading / settings | `apps/client/src/App.tsx`, `island-guide.ts`, `SettingsPanel.tsx`; `scripts/profile-loading.mjs` |
| Regression coverage | `tests/variants.test.ts`, `models.test.ts`, `store.test.ts`, `haven.test.ts`, `adventure.test.ts`; `tests/browser/variants.spec.ts`, `settings.spec.ts` |

## Launch and checks

```powershell
npm run dev                 # http://127.0.0.1:5173; API on 2567
npm run typecheck
npm test
npm run content:audit
npm run build
npm start                   # compiled game at http://127.0.0.1:2567
npm run test:e2e             # separate 5174/2568 services and browser-tests.sqlite
node scripts/smoke-production.mjs
node scripts/profile-loading.mjs current
```

Use Node 24. The compiled smoke/timing scripts use disposable saves. Browser fixtures touch only their dedicated test save. Player progress remains in ignored `data/mythoveya.sqlite`; do not reset it. Run Playwright suites sequentially because they share ports and output directories. Install Chromium with `npx playwright install chromium` if absent.

## Verification on October 7

- Typecheck and production build pass; content audit confirms 72 species / 216 actions / 72 passives.
- All 92 unit/network tests across 16 files passed, including real network sessions, acquisition boundaries, cache isolation, save/retry durability and evolution.
- All 15 browser scenarios passed in two sequential runs (6 focused + 9 regression): shimmer across scenes/reload, deferred portrait scrolling, settings, home building/travel, festival outfit/race, all models/ultimates, island navigation, mouse interactions, cache/fishing, desktop/touch HUD, the first PvE/recruitment journey, two human arena clients, and the real-time village garden/care cycle.
- Compiled smoke passed server startup, local assets, guest progression and two human arena connections.
- Visually reviewed shimmering Journal, follower/habitat, battle formations and health bars, and settings captures under ignored `artifacts/`. Model tests construct and animate all 88 forms in both appearances. Gallery tests cover all 72 base portraits and all 16 S-tier ultimate effects.
- Local compiled timing samples: initial JavaScript 1,584,572 -> 1,380,636 bytes (12.9% less). Journal opening 979 -> 277 ms with deferred chunks (138 ms in the portrait-only intermediate build); 15 near-screen portraits rendered initially versus 88. Title 156 -> 148 ms and world entry 344 -> 366 ms. These single-machine samples are diagnostic, not a cross-device benchmark; occasional long tasks remain. Raw reports: `artifacts/loading-{baseline,portraits,deferred}.json`.

## Remaining limits and exact next action

Requested work is implemented or verified as already present. No unfinished edits or blocking failures remain. The initial WebGL bundle still exceeds Vite's warning threshold. Physical-device ergonomics, subjective listening and long-term competitive balance are not established by these checks. See [KNOWN_ISSUES.md](KNOWN_ISSUES.md) for broader limits.

Eleven meaningful local commits include this documentation handoff (ten implementation/verification commits plus docs). Nothing was pushed or deployed, per the supplied instruction. The next action is user playtesting at http://127.0.0.1:5173/; `npm run dev` is responding on this machine. Relaunch it if stopped, and publish only on an explicit push request.

Earlier work is preserved in [the archived development history](docs/DEVELOPMENT_HISTORY.md).
