# Mythoveya handoff

Updated October 22, 2026. Workspace: `C:/Users/ASUS/Downloads/Mythoveya`; branch `main`. Wayfarer Lodges began at `85860c3`. Preserve ignored `data/mythoveya.sqlite`.

## Implemented

- Four walkable regional interiors attached to existing buildings: Cloudwatch common room (Perrin, Havenreach), Fernrest kitchen (Junie, Whisperleaf), Copperkettle shelter (Saff, Emberglass), Snowquilt reading room (Nell, Moonfrost).
- A shared room floor plan with blocked furniture, five route-connected stations, floor-click navigation, WASD/arrows, camera reset, E interaction and mobile joystick/station navigation. Return outdoors walks to the exit; Leave lodge returns immediately to the doorstep.
- Regional floors/walls, window views, books, herb pots, fossil displays, a fireplace, kitchen, serving table and companion bench. Recipes place supper on the table; saved lantern/banner choices decorate the wall and add two guests. Room geometry is owned and released on changes/unmount. The room chunk loads on entry.
- Four finite gatherings: meet the host, choose the local recipe, help with an active companion's elemental ability, then choose a decoration. Cooking/help can be completed in either order. Hosts provide ingredients; errors consume nothing. Helpers gain 3 friendship capped at 100; each gathering grants 50 Gold, 15 Diamonds and 20 XP once.
- Lumeswallow: B-tier Light support, swept feather wings and a forked tail; Hearthflight shields and regenerates allies. Velvetmoth: A-tier Frost controller, eyespot wings and feathery antennae; Quietfall damages, slows and silences a selected enemy row. Authored models, palettes and six-group signature effects; persistent normal/shimmer variants use existing acquisition rules.
- Welcome Lumeswallow after any two gatherings and Velvetmoth after all four, once each from any lodge gathering book. Duplicate ownership grants a shard. Both enter existing recruitment tiers without changing tier probabilities.
- Server checks mainland region, prerequisites, active companion ownership/ability, recipe answers, saved decoration choices and milestone eligibility. Operation IDs protect retry rewards. Optional profile state preserves legacy saves. Indoor position is temporary; reload starts at the saved region's outdoor arrival, retaining room progress.
- Entrances and walking waypoints on all four maps, plus Adventure/Events/pause journal entry points. Map destination counts are now Haven 39, Meadow 15, Canyon 17 and Hollow 18. Existing battle-win regional gates remain.
- Roster: **92 base species + 16 evolved forms**, **276 actions**, **92 passives**, **12 families**. Tiers: E11, D11, C11, B19, A22, S18.

## Key files

- `packages/shared/lodges.ts`, `types.ts`, `roster.json`, `content.ts`.
- `apps/server/lodge-game.ts`, mutation schema/dispatch in `index.ts` and `game.ts`.
- `apps/client/src/LodgeScene.tsx`, `LodgePanel.tsx`, `LodgeDoors.tsx`, `lodge-art.ts`, `lodges.css`, `App.tsx`, `Scene.tsx`, four regional maps, creature model/DNA/effects files.
- `tests/lodge-server.test.ts`, `lodge-layout.test.ts`, `tests/browser/lodges.spec.ts`, gallery/model/combat coverage.
- Player guide: [docs/LODGES.md](docs/LODGES.md).

## Launch

```powershell
npm run dev                 # client 5173; API 2567
npm test
npm run content:audit
npm run build
node scripts/smoke-production.mjs
npm run test:e2e             # isolated services on 5174/2568
```

Node 24.19.0/npm 11.17.0 verified. Client/API health at `http://127.0.0.1:5173/api/health` returned ok during this update. Browser runs must be sequential; do not edit game source during them. Tests use separate/disposable databases.

## Link recovery

The October 16 continuation found no listeners on client 5173 or backend 2567. The local link was offline because the development services had stopped. Restarted both as hidden background processes; both health endpoints returned `ok: true`. Added `Play Mythoveya.cmd` and `scripts/start-game.ps1`: readiness checks, reuse of a healthy server, clear dependency/port errors, logs, normal play ports and save path, and optional `-NoBrowser` for verification. No startup scheduled task, public hosting or deployment was added.

The October 22 continuation verified that both normal-play services were still running and the launcher reused them successfully. The health endpoint returned `ok: true`. External commit `231ade9` captured the earlier pending tests/handoff and was already on GitHub; it remains intact.

## Verified

- Full unit/server suite: **157 tests across 34 files passed**, 114.79 seconds, `artifacts/lodge-unit.log` (ignored). Includes eight lodge save/layout tests, authored model anatomy and targeting assertions.
- Content audit passed for 92 species, 276 actions, 92 passives and 12 families.
- Final production build passed: 750 modules, lodge chunk 11.37 kB; existing main-bundle size warning remains. Evidence: `artifacts/lodge-final-build-oct22.log`. Ten focused model/layout tests also passed after visual polish.
- October 22 production smoke passed compiled assets, guest flow and two-human arena (`artifacts/lodge-production-oct22.log`); existing unregistered snapshot warning remains.
- Lodge gallery passed both creatures and both six-group signature effects with no page errors; screenshots inspected. First journey exposed a zero-height outer room container despite visible fixed children. The container and keyboard focus behavior were fixed in `ede3e29`.
- Final browser batch: nine scenarios passed, including all four lodges, saved rewards/reload, floor and keyboard movement, 390-pixel mobile layout, geometry disposal, creature/effect galleries, regional stories, first journey and two-player arena. Two Haven keyboard-route scenarios stalled (`artifacts/lodge-final-browser-oct16.log`). Their test driver now reads the live keeper position, follows waypoints more closely, and reasserts movement after focus loss; both targeted scenarios passed in 2.6 minutes (`artifacts/lodge-haven-final.log`). All eleven scenarios therefore have passing evidence across the batch and targeted rerun. Production collision geometry was unchanged.
- Reviewed final screenshots of all four furnished rooms and both creatures, including seated guests, readable bookshelves and mobile navigation; copies are in `docs/screenshots` and the lodge guide.
- October 22 typecheck passed. After the control-hint text correction, the complete four-lodge journey passed again in 3.5 minutes (`artifacts/lodge-journey-oct22-retry.log`), producing the final reviewed captures. Its preceding attempt lost a local fetch after a long interruption during battle setup and was stopped; it is not counted as a pass.
- Final normal-play browser check: HTTP 200, expected title and start button/canvas, zero page errors at `http://127.0.0.1:5173/`.

## Scope and remaining work

- Most buildings still have no interiors. These four rooms share a floor plan and use existing avatar bodies; they are personal finite gatherings, not shared multiplayer spaces or procedural/live events. Outdoor boundaries remain unchanged. Server-authoritative movement and long-term balance are future work.
- The user explicitly authorized committing and pushing on October 22, superseding the earlier no-push instruction. This continuing Wayfarer Lodges update spans fifteen development commits, including this illustrated handoff, plus the external `231ade9` commit after baseline `85860c3`. Publication target: `origin/main` at `https://github.com/DQuanBui/Mythoveya`. Recheck local and remote HEAD before the next continuation. Pre-existing README deletions/wording edits remain local; only this update's guide link and launcher instructions are included in the documentation commit.

## Next development candidates

Vary room floor plans and species-specific indoor behavior, add reusable regional crafting decisions, and balance the growing set of one-time rewards before adding more currency sources. Continue manual art/audio and device testing.
