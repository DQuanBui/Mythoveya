# Archived development history

Historical notes through October 14, 2026. Counts and remaining-work statements below are snapshots, not the current status. See [PROGRESS.md](../PROGRESS.md) for the active handoff.

# Build progress

## Current playable build

### Weather, town shops, shore and mountains, the Skyferry and two new islands

Havenreach now has six-minute weather spells shared with the server. Rain brings more Skyfin and grows crops faster, and mist lets caches glimmer from farther away. Rain, wind and mist have their own visuals and sound. Two new shops sell daily stock: Brannoc's smithy and Mother Sage's apothecary. The island reaches Driftshore Beach, a lagoon, pier and lighthouse, and the Highcrag range, whose climbable trail leads up to a summit lookout. A Skyferry dock on the southern cliff sails to two new islands:

- **Hearthfall Isle** is a home island with a five-level house and land that grows from 14 to 30 m. You place decorations and elemental habitats on it. Companions living in habitats earn capped Gold, play together, sleep at night and can be greeted for friendship.
- **Lanternfair Isle** is a festival island with a daily lantern hunt, playable attractions, and three ticket games: a companion race, an obstacle course and a fishing tournament. The games have daily and all-time leaderboards, and today's best runs replay as ghosts. Tickets buy home decorations, keeper outfits, companion accessories and weekly supplies. Neither island is required for story progress.

The server validates every island action. Festival runs are rescored from recorded inputs and must take at least the real time they claim. Layouts, unlocks, tickets, outfits and personal bests are saved as optional profile fields.

Verification on October 3, 2026:

- Typecheck, production build and **83 unit tests across 14 files** pass. New tests cover:
  - weather and shop stock;
  - island travel and unlocks;
  - placement rules, house and land upgrades, and habitat income caps;
  - reachability of every hunt spot;
  - ticket shop limits;
  - the race, course and tournament simulations, and server scoring with the clock check;
  - leaderboards.
- All 12 browser scenarios pass. Four of them are new:
  - sailing to the home island, building, reloading and sailing back;
  - unlocking Lanternfair, collecting tickets, buying and wearing an outfit, and reloading;
  - a full race from the festival board to a ranked result;
  - the updated Havenreach map.
- Scripted browser runs played the race (29.7 s, pad boosts, no stumbles), the obstacle course and a tournament round (12 of 12 bites landed). For each, the client's live score matched the server's rescored result. Screenshots of every new area, panel and game were reviewed.
- With the real GPU in headless Chromium, both islands hold 60 fps (the vsync cap). Hearthfall draws about 85 calls and 33k triangles; Lanternfair about 42 calls and 20k.

Commits: `e0d9a0c` (Skyferry and Hearthfall), `f84645c`, `c365b61`, `f191371`, `b16c8f4` (festival rules, outfits and accessories, ticket decorations, Lanternfair), `064902d`, `067ade1` (race and course), `ea98f38`, `aa1416a` (tournament), `26940d3` (browser test), `a2c3a18` (island music), `282aa1d` (expressive companions).

### Point-and-click island, living village, and the Riftgate

Interaction is now fully mouse-driven: click the ground to walk along pathfinding routes, or click a villager, home, crystal, cache, or the dock to walk over and interact. Hovering shows a highlight ring and a tooltip. The desktop prompt card and controls strip below the keeper were removed; the pause menu has a controls reference, and touch screens keep a tap button.

Havenreach gained nine cottages, a windmill, a well, a fishing dock, a campfire, trail lamps, and six islanders who keep a day/night routine. An 18-minute day/night cycle adds moonlight, glowing windows, fireflies, and shadows that follow the keeper. New activities are eight hidden Skyglass caches and a fishing mini-game. The Riftgate opens five story chapters (twenty stages, five bosses) and three daily dungeons. Companions can level skills and ultimates and wear forgeable equipment. Saves gain only optional fields.

Verification on October 1, 2026:

- Typecheck, production build, and **49 unit tests across eight files** pass. New tests cover layout clearances, click-to-walk routes to every cache, porch, and the dock, cache and fishing rewards, chapter unlocks and stars, boss drops, dungeon limits and tiers, skill power, equipment bonuses (ignored in Tactical Arena), and elixirs.
- Stage and dungeon enemy levels were calibrated by simulating auto-battles of the starter team: about 75% wins at each recommended level and 60% for bosses. The first two stages are gentle enough for a new level-1 team with any starter. A real browser playthrough of Chapter 1-1 earned two stars and its rewards.
- All nine browser scenarios passed, including a new one that clicks the ground, hovers and opens a cache, and fishes at the dock. The first-journey scenario failed once for an undiagnosed reason, then passed three consecutive runs.
- In the software-rendered test browser, the village scene draws fewer calls than before (401 vs 484) at the same frame rate (4.25 vs 4.0 fps). Real GPU performance was not measured.

Commits: `183a343`, `c3333ca`, `b24526c`, `42a7cb3`, `912a811`.

### Broader Havenreach - starting-island expansion

Implemented the connected seven-place starting island, instanced woodland, pond and bridge, 17 roaming habitat companions, nine daily gathering nodes, trail map, sprint, camera reset, and village return. The latest extension adds six clickable houses with porches and a saved visitor stamp book. Clicking villagers, wildlife, resources, or labels replaces the E interaction. Existing saves receive only an optional stamps field; existing game progression is retained. All 39 tests across seven files pass, including the shared walking paths, house doors, duplicate stamp rewards, legacy saves, battle rules, and real network sessions. The production build, compiled smoke check, content audit (60 species / 180 actions / 60 passives), and dependency audit (zero vulnerabilities) pass. The full browser suite is in progress; all models and all ten paused mythic effects have passed so far.

Delivered commit milestones: world layout; expanded terrain and paths; instanced woodland; pond and bridge; exploration landmarks; habitat wildlife; local trail map; expanded gathering; movement and camera controls; browser verification and player documentation. Twelve meaningful commits have been made for this upgrade; the first eleven have been pushed. Final verification and player-guide changes will be committed and pushed together. New lands, creature tiers, and a redesigned mission system remain later work as requested.

### Village life upgrade - Phase 2

The village backend now includes eight named characters, 24 conversation topics, 16 ordered missions, eight unlockable daily helpers, daily market stock, a two-minute garden, treat crafting, friendship, nicknames, cosmetic accessories, daily sparring rewards, and weekly guardian bounties. Old profiles receive additive version-2 village state; existing companions, currencies, battles, and ratings retain their rules. Gathered Sunseed now also enters the supply bag.

Eight focused village tests passed: additive save migration, ordered and replay-safe rewards, daily stock and transaction rollback, durable garden timestamps, crafting/care/accessory ownership, battle-gated bounties, villager content, and integration with gathering, training, and travel. The village browser journey passed buying/selling, two helper unlocks, daily gifts, naming, feeding, equipped 3D accessories, reload persistence, mobile layout, and a real two-minute planting/harvest/crafting cycle. All eight world characters and the market/garden geometry were checked in the renderer. The services are accessible through **Quests → People & missions**, the pause menu, and nearby villagers.

The first-session journey and two isolated human arena clients passed. The responsive HUD check passed after correcting position updates when resuming the paused world. The model/audio gallery and all ten paused mythic effects also passed. Desktop directory, market, helper, and mobile garden screenshots were inspected. Milestones: backend `1153ea3`, playable village interface `6bded0c`. Final production build, all 30 gameplay/network tests, compiled smoke check, and dependency audit passed on September 30, 2026.

### Phase 1 verification record

Reviewed the supplied improvement brief and screenshot. Implemented a safe-area HUD with a complete bottom dock, persistent quest/map information on small screens, a three-step introduction, objective distance and world/minimap waypoints, fixed-size nearby labels, resource sparkles, currency explanations, and a touch movement joystick. No saved-profile or server schema changes were required.

The first milestone is committed as `66eb9bd`. The first-journey browser scenario passed, including victory, recruitment, saved formation edits, reload, and settings. The production build and all **22 tests across five files** passed. Seven viewport checks and an additional emulated touch-landscape check passed after correcting the inherited landscape rule and joystick spacing. Desktop, portrait, and landscape captures were inspected.

The supplied brief requested a checkpoint after Phase 1. The subsequent instruction to continue authorized the NPC, dialogue, and mission-services upgrade described above. See [the upgrade review](docs/UPGRADE_REVIEW.md) for implemented files, testing instructions, adaptations, and later proposals that affect existing systems.

Run `npm run dev` and open http://127.0.0.1:5173/. For a compiled build, run `npm run build`, then `npm start` and open http://127.0.0.1:2567/. SQLite progress remains independent of source updates. Repository: https://github.com/DQuanBui/Mythoveya.

The initial workspace was empty. The complete specification was read before implementation. Subsequent updates preserve the database and guest sessions.

## Milestones

1. **Playable foundation - implemented and checked.** Title, eight keepers, three starters, movement, interaction, six companions, PvE, rewards, and saves complete a playable first session.
2. **Progression - implemented and checked.** Story/daily rewards, recruitment, sequential pity, shards, training, collection, formations, and region unlocks use authoritative operations and replay protection.
3. **Multiplayer - implemented and checked.** Real human rooms, readiness, friendly codes, ranked queues, Power/Tactical rules, turn windows, reconnect, forfeits, and durable once-only Elo results. Practice is explicitly labeled computer play.
4. **Content - implemented with presentation limits.** All 60 species, ten per tier, 180 actions, 60 passives, twelve body families, eight keepers, three adventure regions, guardians, and species voices exist. Anatomy and geography remain stylized and compact.
5. **Presentation and verification - playable delivery, with documented limits.** Model portraits, articulated animations, eight music arrangements, 37 cues, ten mythic recipes, a 3D recruitment stage, region landmarks, settings, and a development gallery are connected. See [KNOWN_ISSUES.md](KNOWN_ISSUES.md) for the remaining work.

## Verification record

- TypeScript and production build passed. The large client bundle warning remains tracked.
- The latest gameplay/network suite passed **30 tests across six files**: content, economy replay safety, signature mechanics, quest navigation, village saves/services, a complete ranked human match, rejected turns, reconnect, immutable formations, once-only ratings, and persistence after server restart.
- Six browser scenarios passed across the regression runs: the complete first journey, two isolated human arena clients, all 60 unique model portraits/twelve families/eight keepers/bounded audio, ten mythic effects, responsive desktop/touch exploration, and the village market/garden/care journey.
- Gallery coverage is split into model/audio and mythic-effect scenarios. The strengthened mythic check passed for **all ten S-tier species**, asserting visible geometry in the renderer at a fixed paused impact phase. The resulting captures were visually inspected.
- Compiled-build smoke checks passed startup, local assets, guest progression, and human arena connection.
- The baseline compiled title, exploration, and journal layouts passed at **1280 x 720, 1440 x 900, and 1920 x 1080**, with no page errors or external asset requests. The current exploration HUD additionally passed seven viewport sizes and an emulated touch-landscape check. Village services were checked on desktop and at 390 x 844. Physical-device testing remains incomplete.
- The dependency audit reported **zero vulnerabilities**.

Screenshots were captured and inspected for title, exploration, battle, recruitment, journal, twelve families, eight keepers, and ten mythic previews. Browser gameplay recordings are under ignored `test-results/`. Playback and mixer limits were checked programmatically; subjective listening review has not been performed.

The initial playable delivery passed its production build after the paused-preview correction and comprises twelve meaningful commits across foundation, combat, saves, exploration, progression, multiplayer, presentation, and verification. Subsequent upgrade commits extend that baseline. Saves, guest tokens, recordings, and temporary test databases are excluded from Git.

## Recent refinements

- Kept world labels behind panels and focused gallery effects on their participants.
- Corrected mixed support targeting, shield expiry, delayed ordering, and once-per-battle revival.
- Added precise battle rewards and arena rating changes.
- Preserved camera tracking across HUD updates and activated companion/roamer locomotion.
- Separated a resource pickup from the training circle.
- Kept mythic geometry upright, added missing wing pairs, and corrected Solkarath's six-horn crown.
- Added a selectable 3D recruitment stage with rarity accents and reduced-motion support.
- Added canyon mesas and arch, hollow ice and crystal ridge, meadow flowers and water, village buildings, and landmark collision.
- Added a paused effect timeline with an explicit phase for reliable visual inspection.

## Reproducible checks

```powershell
npm run typecheck
npm test
npm run build
npm run content:audit
npm run test:e2e
node scripts/smoke-production.mjs
node scripts/verify-layouts.mjs
npm audit
```

Install browser tooling once with `npx playwright install chromium`. Browser tests use separate ports and a test database. Compiled smoke/layout checks create temporary databases. These checks do not reset player progress.

## Next work

Remaining work includes longer authored region stories, anatomical and animation refinement, subjective listening review, broader balance playtesting, and performance tuning. The current compact procedural presentation is a playable first version, not a claim that every production-polish requirement is finished.

The later improvement brief still has unimplemented features: evolution, day/night and weather, additional gatherables and potions, autonomous helper abilities, an exclusive rotating weekly boss, expanded guided onboarding, text-size/colorblind settings, and an in-game manual backup flow. Combat and currency replacements require a separate design decision; existing working rules and server-owned progress have been preserved. See [KNOWN_ISSUES.md](KNOWN_ISSUES.md) for the complete boundary.


## October 7, 2026 - shimmer and recovery handoff archive

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


## October 8, 2026 - Wildwood expansion handoff archive

# Mythoveya handoff

Updated October 8, 2026. Workspace: `C:/Users/ASUS/Downloads/Mythoveya`; branch `main`. This development update began at `c7ba20f`. Existing player saves and all prior features were preserved.

## Implemented

- Western Havenreach now connects Reedwater Lake, Windrest Lookout and Willow Field Station with walkable trails. It adds two cottages, a hillside telescope, lake reeds/lilies/dragonflies, six resident species and shared water/house collision. Cottage clearings keep the entrance views open. Existing mountains, shore, bridge, village and islands remain available.
- **The Silent Windmill** is a complete saved journey: begin at the mill, use Flame/Kindle, Tide/Flow and Grove/Bloom companions to recover three pieces, calm the Windrest guardian, return to restore the sails. Any owned companion of the correct element can help. Each piece grants 30 Gold and up to 5 friendship; the guardian grants 80 Gold and 90 XP once; restoration grants Galehart (or a duplicate shard), 200 Gold and 50 Diamonds. The mill stays restored after reload.
- The guardian alternates between half direct damage on odd rounds and double damage on even rounds. Its intent is visible before acting. Losses allow retries. Victories and rewards use the existing atomic operation/match records.
- Two cottage stories grant 20 Gold each once. Rain-written tracks and night-time Starglass grant 15 Diamonds each once, with actual server weather/time checks. Visual day/night settings cannot alter eligibility. Missing expedition data in old saves is read without mutation.
- The expedition journal is available from Adventure and pause. Field sites, houses and discoveries have markers and map routes. **Walk to waypoint** follows the same collision-aware route planner as ground clicks; manual steering cancels the walk.
- Six new recruitable species: Reedlet (Tide healer), Lanternmoth (Light support), Coppershell (Stone tank), Bloomanta (Grove healer), Galehart (Storm controller), Auroroc (Frost striker). Each has authored palettes, anatomy and signature skill effects; Auroroc has a separate aurora ultimate. Current roster: **78 base species + 16 evolutions, 234 base actions, 78 passives, 12 body families**. E through B have eleven species each; A and S have seventeen each. Base rarity probabilities and pity rules are unchanged.
- Gallery cameras now fit tall antlers, long wings and wide silhouettes at portrait and landscape sizes. Softer preview lighting preserves creature colors. The minimap shows Reedwater Lake.
- Creatures now blink, close their eyes while sleeping and use more family-specific locomotion. Attack displacement resets correctly on returning to idle, and authored tail fans retain their spread. Normal and shimmering appearances remain separate, deterministic caches.

## Key files

| System | Files |
| --- | --- |
| District, stops, weather discoveries | `packages/shared/wildwood.ts`, `world-time.ts`, `haven.ts` |
| Saved quest and guardian | `apps/server/expedition-game.ts`, `game.ts`, `index.ts`; `packages/shared/guardian.ts`, `combat.ts`, `types.ts` |
| Scenery and journey UI | `apps/client/src/WildwoodScenery.tsx`, `ExpeditionPanel.tsx`, `HavenMap.tsx`, `HavenVillage.tsx`, `Scene.tsx`, `WorldHUD.tsx` |
| Roster, anatomy and effects | `packages/shared/roster.ts`, `content.ts`; `apps/client/src/creature-dna.ts`, `models.ts`, `WildwoodEffects.tsx`, `UltimateEffects.tsx`, `preview-framing.ts` |
| Regression tests | `tests/expedition.test.ts`, `expedition-server.test.ts`, `models.test.ts`; `tests/browser/expedition.spec.ts`, `gallery.spec.ts` |

## Launch and verification commands

```powershell
npm run dev                 # http://127.0.0.1:5173; API on 2567
npm test
npm run typecheck
npm run content:audit
npm run build
node scripts/smoke-production.mjs
npm run test:e2e             # separate services on 5174/2568
```

Use Node 24. Player progress is in ignored `data/mythoveya.sqlite`; do not reset it. Unit/network fixtures use temporary databases, browser tests use `data/browser-tests.sqlite`, and compiled smoke uses a disposable save. Run Playwright suites sequentially because they share ports/output. `content:audit` refreshes tracked content/audio manifests.

## Verified

- `npm test`: **100 tests in 18 files passed**. Focused layout, model and expedition tests also passed after the final scenery and discovery changes. Coverage includes old-save compatibility, reward idempotency, companion eligibility, discovery windows, guardian combat, collision routes and preview framing.
- `npm run build`: passed, including TypeScript, Vite and the compiled backend. The initial JavaScript chunk is approximately 1.404 MB before compression (416 kB gzip); Vite still reports its large-chunk warning.
- `npm run content:audit`: passed with 78 base species, 234 actions, 78 passives and 12 body families. Updated content/audio manifests are committed.
- `node scripts/smoke-production.mjs`: passed compiled assets, guest progression and two-human arena connections using a disposable save.
- Browser verification: **all 17 distinct scenarios passed across the broad regression and targeted final reruns** (not a single uninterrupted clean suite run). The final cache/fishing rerun passed after correcting its keyboard approach. The windmill journey, all creature galleries, western routes, cottage visits, desktop/mobile journal layout and restoration after reload passed. The broader regression also exercised onboarding, recruitment, battles, home building, festival activities, settings, care, shimmering appearances, deferred portraits and two-human arena results. Test helpers now wait for canvas mounting before reading scene objects; the keyboard route to the cache uses the clear central path instead of clipping a village pebble.
- Reviewed screenshots of both cottages, Reedwater Lake, desktop/mobile expedition panels, all six new species and their attacks. Tall Galehart/Auroroc previews now fit completely. Two current world screenshots are included in `docs/screenshots/` and the starting-island guide.
- Local client on port 5173 and backend health on port 2567 both responded successfully. Open **Adventure > The Silent Windmill** to begin the new journey.

## Limits and further development

The full single-player windmill journey is the scope of this update. It does not add public hosting, account recovery, shared exploration, live minigame multiplayer or walkable house interiors. Those limits are detailed in `KNOWN_ISSUES.md`. Position checks for field interactions remain client-side, consistent with caches/lanterns; ownership, quest order, time eligibility and rewards are validated by the server. The guardian has fixed introductory difficulty. More advanced teams can outlevel it, and long-term combat balance is not established by automated checks.

The initial WebGL chunk remains larger than Vite's warning threshold. Further regional development can extend the compact canyon/hollow areas with their own authored routes and journeys, using this quest's saved-state and shared-layout approach.

This update contains 14 local commits after `c7ba20f`, including the final documentation and screenshot handoff. The remote `main` was checked at `c7ba20f914ddbaf10d30cc97bedeb07f84aca53e`; no push or deployment was performed. Earlier handoffs are archived in `docs/DEVELOPMENT_HISTORY.md`.


## October 9, 2026 - Emberglass Canyon handoff archive

# Mythoveya handoff

Updated October 9, 2026. Workspace: `C:/Users/ASUS/Downloads/Mythoveya`; branch `main`. This canyon development update began at `25b1410`. Existing saves and the Wildwood expansion are preserved.

## Implemented

- Emberglass Canyon has grown from a compact circular area into a connected region with western basalt terraces, an eastern hot-spring loop, Ashkeeper Camp and eight marked quest/survey stops. Terrain climbs to five metres, and shared layout rules keep walking routes clear of springs, columns, buildings and field props. Existing central services remain available.
- **Signals in the Stone** opens in the Adventure menu or pause journal. After the normal two-win region unlock, meet Ranger Senna, use owned Flame/Stone/Storm companions and written three-color inscriptions to tune three beacons, calm the Glass Sentinel, then return to camp. The starting team includes the required elements. Wrong patterns cost nothing.
- Each beacon grants 40 Gold and up to 5 friendship. The sentinel grants 90 Gold and 100 XP once; restoration grants Thermala (or a duplicate shard), 220 Gold and 60 Diamonds. Server transactions validate quest order, ownership, puzzle solutions and one-time rewards.
- The sentinel repeats three clearly announced phases: 35% reduced incoming direct damage, a 50% stronger direct attack, then 75% increased incoming direct damage. Losses allow another attempt. Damage-over-time and other ordinary status rules are unchanged.
- Three optional field notes describe the canyon's geology and wildlife, granting 15 Gold each. Returning to camp after all three grants 35 Diamonds and the Canyon Naturalist HUD badge. All notes, beacons, rewards and restoration survive reload.
- A regional trail map and minimap show the paths and springs. Set a waypoint and use **Walk to waypoint** for automatic routing; manual movement cancels it. The pause menu can return the keeper to the canyon trailhead.
- Two new recruitable species: **Cindervane**, a B-tier Flame mantis with amber forearm blades, ivory petal armor and violet wings; **Thermala**, an A-tier Tide salamander with coral spines, golden freckles and a pearl crescent tail. Their authored palettes, articulated details, signature effects and normal/shimmer appearances use the existing model system. The roster is now **80 base species plus 16 evolved forms, 240 actions and 80 passives**. Tier counts: E/D/C 11 each, B 12, A 18, S 17; rarity probabilities and pity remain unchanged.
- Eight habitat residents and the sentinel populate the canyon. Wildlife follows the terrain, respects collision, rests after dark and can be observed. Ranger Senna and field sites accept pointer interaction. Steam and other decorative motion respect reduced-motion settings.

## Key files

| System | Files |
| --- | --- |
| Shared terrain, trails, stops, quest state | `packages/shared/canyon.ts` |
| Quest transactions and sentinel | `apps/server/canyon-game.ts`, `game.ts`, `index.ts`; `packages/shared/guardian.ts`, `combat.ts` |
| World rendering and navigation | `apps/client/src/CanyonTerrain.tsx`, `CanyonScenery.tsx`, `CanyonWildlife.tsx`, `Scene.tsx`, `HavenWildlife.tsx` |
| Journal, trail map, HUD | `apps/client/src/CanyonPanel.tsx`, `CanyonMap.tsx`, `App.tsx`, `WorldHUD.tsx` |
| Species and presentation | `packages/shared/roster.json`, `content.ts`; `apps/client/src/creature-dna.ts`, `models.ts`, `WildwoodEffects.tsx` |
| New regression checks | `tests/canyon.test.ts`, `canyon-server.test.ts`, `models.test.ts`; `tests/browser/canyon.spec.ts`, `gallery.spec.ts` |

## Launch and verification

```powershell
npm run dev                 # http://127.0.0.1:5173; API on 2567
npm test
npm run content:audit
npm run build
node scripts/smoke-production.mjs
npm run test:e2e             # separate services on 5174/2568
```

Use Node 24. Player progress remains in ignored `data/mythoveya.sqlite`; do not reset it. Tests use temporary/disposable saves. Run browser suites sequentially because they share ports and output.

### Verified

- **108 unit/server tests across 20 files passed**, including collision routes, old-save compatibility, beacon validation, repeat-reward protection, guardian phases, models and persistence.
- **All 19 browser scenarios passed across the broad run and final targeted reruns**; this was not one uninterrupted clean suite. The broad run passed 17 scenarios. Its canyon reload keyboard race was replaced with the visible Adventure entry point; the windmill fixture now prepares its team through ordinary encounters and paid training, because an untouched level-one team can legitimately lose the guardian. Both final journey reruns passed together in 3.8 minutes.
- Browser coverage includes the entire canyon and windmill journeys, restored state after reload, all creature galleries and new signature effects, desktop/mobile exploration, navigation, gathering, fishing, houses, recruitment, formation, island building, festival racing, town care, settings, shimmering appearances, deferred portraits and two-human arena results. The canyon scenario checks for page errors and a 390-pixel journal without horizontal overflow.
- **Content audit passed**: 80 base species, 240 actions, 80 passives, 12 families. Generated content/audio manifests are committed.
- **Production build and compiled-server smoke passed**, including local assets, guest progression and the human arena. The initial production client bundle is 1,426.91 kB (422.26 kB gzip), retaining Vite's existing chunk-size warning.
- Reviewed canyon map, camp, hot springs, lit beacons, restored camp, mobile journal, and both new species and signature effects. Fixed the canyon map opening Skyferry, overlapping terrain surfaces, obstructing clouds, and map actions requiring unnecessary scrolling. The [canyon guide](docs/CANYON.md) includes map and spring screenshots.
- Local client `http://127.0.0.1:5173/` and API health on port 2567 responded successfully. Open **Adventure > Signals in the Stone**; Emberglass unlocks after two wins.

## Limits and next work

This update completes one regional journey, not the full long-term game roadmap. Public hosting, accounts, shared exploration, real-time minigame multiplayer and walkable house interiors remain outside this update. Physical proximity is checked by the client; server checks protect puzzle solutions, ownership, quest progression and one-time rewards. The sentinel has introductory fixed difficulty and can be outleveled. Long-term balance, subjective audio quality and physical mobile-device ergonomics remain unverified.

The initial WebGL bundle still exceeds Vite's warning threshold. Whisperleaf and Moonfrost retain compact layouts; a future development pass can give Moonfrost its own route network and narrative, or deepen crafting and progression with region-specific materials.

This update contains **15 meaningful local commits after `25b1410`**, including the final documentation handoff. Remote `main` was verified at `25b1410c3b88ed3c7604b4bd5a2de4cf024d63c6`; these canyon commits were not pushed or deployed, following the original handoff. The working tree is checked after the final commit. Earlier completed updates are archived in `docs/DEVELOPMENT_HISTORY.md`.


---

## October 11, 2026: Moonfrost Hollow update

# Mythoveya handoff

Updated October 11, 2026. Workspace: `C:/Users/ASUS/Downloads/Mythoveya`; branch `main`. This Moonfrost development update began at `968fff0`. Existing saves, companions, the Wildwood journey and Emberglass Canyon are preserved.

## Implemented

- **Moonfrost Hollow** has expanded into a connected snowy region with Moonmirror Lake, fir forests, mountain silhouettes, a six-metre climb to an observatory, Mira's workshop and an eastern refuge. Nine destinations share map, walking and interaction coordinates. Trails avoid the lake, buildings, crystals and tree trunks; the observatory has a level foundation.
- **The Lantern Road** opens from Adventure, the regional map or pause menu. After the existing five-win region unlock, begin with Mira. Use owned Flame, Grove and Tide companions to gather the three sites. The starting team contains every required element, and helping grants up to five friendship.
- Gathering supplies 6 Frostglass, 3 Moonreed and 3 Warmstone. At the workshop, each lantern consumes 2/1/1 materials without a Gold fee. Craft up to three, then carry them to the Lakeside, Observatory and Refuge posts. The journal shows inventory, recipe shortages, crafted totals and a suggested destination.
- Each installed lantern grants 25 Gold. Return to Mira after lighting all three for Rimeowl (or a duplicate shard), 200 Gold, 70 Diamonds, 120 XP and the **Lantern Keeper** badge. Lights remain lit and the aurora brightens. Optional Rimeowl/Frostwhisk field notes grant 20 Gold each once.
- Server transactions validate gathering site and companion ownership/element, available ingredients, the three-lantern limit, installation order and one-time rewards. Materials, carried lanterns, installations, discoveries and completion persist. Legacy profiles need no migration; their optional journey state is created on use.
- Eight ambient residents use six existing species: Snowmew, Frostwhisk, Rimeowl, Auroroc, Glimlet and Shadecko. They follow terrain/collision rules, rest after dark and open observation cards. Mira is clickable. Decorative aurora shimmer respects reduced motion; quality settings continue to cull distant wildlife.
- The Moonfrost map and minimap show trails and lake, completed map stops are marked, and automatic walking uses shared collision-aware routing. The pause menu returns the keeper to the Moonfrost trailhead. Workshop and landmark clearings keep nearby trees out of the main sightlines.
- Canyon and Moonfrost now share the cached `RaisedTerrain` renderer while keeping separate layout rules and palettes. The roster remains 80 base species plus 16 evolved forms, 240 actions, 80 passives and 12 model families.

## Key files

| System | Files |
| --- | --- |
| Terrain, routes, crafting recipe and optional journey state | `packages/shared/hollow.ts`, `types.ts` |
| Saved mutations and API | `apps/server/hollow-game.ts`, `game.ts`, `index.ts` |
| Terrain, scenery and habitats | `apps/client/src/RaisedTerrain.tsx`, `HollowTerrain.tsx`, `HollowScenery.tsx`, `HollowWildlife.tsx`, `Scene.tsx` |
| Journal, map and HUD | `apps/client/src/HollowPanel.tsx`, `HollowMap.tsx`, `App.tsx`, `WorldHUD.tsx`, `haven.css` |
| Regression checks | `tests/hollow.test.ts`, `hollow-server.test.ts`, `tests/browser/hollow.spec.ts`, `hollow-visual.spec.ts` |

## Launch

```powershell
npm run dev                 # http://127.0.0.1:5173; API on 2567
npm test
npm run content:audit
npm run build
node scripts/smoke-production.mjs
npm run test:e2e             # separate services on 5174/2568
```

Use Node 24. Player progress remains in ignored `data/mythoveya.sqlite`; do not reset it. Tests use separate or disposable databases. Run browser suites sequentially because they share ports/output. The [Moonfrost guide](docs/MOONFROST.md) explains the route, materials and rewards.

## Verified

- **114 unit/server tests in 22 files passed.** Route checks cover every stop and signed trail, gentle grades, blocked lake, wildlife anchors and level building foundations. Server checks cover legacy saves, companion eligibility, ingredient consumption, duplicate requests, installation and one-time rewards.
- **Production build passed**, including TypeScript and compiled backend. The initial client is 1,447.57 kB (427.96 kB gzip); Vite retains its large-chunk warning.
- **Content audit passed** at 80 species, 240 actions, 80 passives and 12 families. **Compiled-server smoke passed**, covering assets, guest progression and two-human arena connections.
- The complete Moonfrost browser journey passed its focused run in four minutes: normal five-win unlock, gathering, crafting, reload with carried lanterns, walking routes, all lights, both notes, restoration, reward ownership, return-to-trailhead, final reload and no page errors. The 390-pixel journal passed its horizontal-overflow check.
- The broad browser run passed 19 of 20 scenarios, including Moonfrost's rendered lanterns and strengthened aurora, both older galleries, windmill restoration, Havenreach routes, responsive HUD, islands, festival racing, first-session gameplay, human arena, settings, town care, shimmer persistence and deferred portraits. Canyon was interrupted by Chromium `ERR_NETWORK_IO_SUSPENDED` in the broad run and then passed its complete targeted rerun. The final Canyon and Moonfrost journey reruns both passed in 5.7 minutes. All 20 distinct gameplay scenarios therefore have passing evidence across runs, rather than one uninterrupted suite.
- An additional isolated aurora render check passed in 52.1 seconds after the final skyline adjustment. Its client-only restored-profile fixture checks visibility; the separate full journey test validates real progression and rewards.
- Local client and API health endpoints both returned HTTP 200.
- Visually reviewed the map, lake, workshop clearings, mobile journal, observatory and restored aurora skyline. The final production build and compiled-server smoke passed after the aurora placement fix.

## Limits and next work

This update completes a regional crafting journey. Its materials are finite and reserved for lanterns; there is no generic inventory, repeatable resource harvesting, extra recipe tree or new battle mode. Buildings have exteriors only. Physical proximity is checked by the client, while materials and progression are validated by the server. Public hosting, accounts, shared exploration, real-time festival rooms, subjective audio quality, long-term balance and physical-device ergonomics remain outside this verification. The initial WebGL bundle retains Vite's size warning.

Next useful work is a distinct Whisperleaf journey, reusable region-specific crafting, walkable interiors or a branching campaign. Broader limits remain in `KNOWN_ISSUES.md`.

This update contains **12 meaningful local commits** after `968fff0`, including the final documentation milestone. No push or deployment was performed. Remote main was verified at `968fff07d0064892ea854cb0c375611893fd319c`. The original handoff requires a separate request to push. Earlier handoffs are preserved in `docs/DEVELOPMENT_HISTORY.md`.


---

## October 11, 2026 - Whisperleaf Meadow

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


---

## October 12, 2026 - Wayfarer Rally

# Mythoveya handoff

Updated October 12, 2026. Workspace: `C:/Users/ASUS/Downloads/Mythoveya`; branch `main`. This Wayfarer Rally update began at `21840fe`. Existing saves and regional restoration journeys are preserved.

## Implemented

- **The Wayfarer Rally** connects Havenreach, Whisperleaf Meadow, Emberglass Canyon and Moonfrost Hollow with four themed camps. Piper, Nessa, Orrin and Edda have authored introductions, colored details and ambient featured companions. Each camp has a canopy, regional table props, a mapped destination and an approach trail. The current land boundaries remain unchanged.
- **Four new B-tier companions:** Sunquill (Light support), Bramblebun (Grove healer), Kilnback (Flame tank) and Frostmoth (Frost controller). New model recipes add gold crests and sun rings, leafy rabbit ears and berries, copper shell plates, and broad ice wings. Signature effects match these identities. Normal acquisition, duplicate shards, shimmer, friendship, equipment and training use the existing systems.
- The roster now has **84 base species plus 16 evolved forms**, **252 actions**, **84 passives** and **12 model families**. Tier counts are E11, D11, C11, B16, A18 and S17. Recruitment tier probabilities are unchanged; the B-tier pool contains four additional species.
- Each camp rotates between **companion care, trail survey and signal practice** on a shared UTC schedule. The starting six cover every care request. Written clues and signal labels require no audio or timer. Wrong answers spend nothing; temporary selections are keyed to the activity day. Daily completion gives 40 Gold, 10 Diamonds and 25 XP; care also adds up to five friendship.
- First completion in each region permanently stamps a passport and grants its featured companion (or a duplicate shard). Collect all four stamps and return to Piper for 200 Gold, 100 Diamonds, 150 XP and the **Wayfarer** badge. Daily activities reset at 00:00 UTC; stamps and the one-time passport reward never reset.
- Entry points are Adventure, Events, pause, map destinations and host interactions. Map markers, minimap points, waypoint tracking and click-to-walk use the same camp coordinates. Shelters have shared movement collision; paths clear obstructing trees through the existing region generators.
- Server checks cover region, six-companion team, activity day/type, owned care element, exact survey/signal answers and duplicate daily/first-visit/passport rewards. SQL operation IDs replay safely. Optional profile state preserves old-save compatibility. Client proximity gates interaction; there is no authoritative shared-world movement server.

## Key files

| System | Files |
| --- | --- |
| Hosts, activities, passport, paths and collision | `packages/shared/rally.ts`, `types.ts`, regional geometry modules |
| New species and combat mappings | `packages/shared/roster.json`, `content.ts` |
| Saved actions and API | `apps/server/rally-game.ts`, `game.ts`, `index.ts` |
| Camps, hosts and companion art | `RallyCamp.tsx`, `creature-dna.ts`, `models.ts`, `WildwoodEffects.tsx`, `Scene.tsx` |
| Journal, maps, HUD and navigation | `RallyPanel.tsx`, regional map components, `App.tsx`, `WorldHUD.tsx`, `haven.css` |
| Acceptance | `tests/rally.test.ts`, `rally-server.test.ts`, `tests/browser/rally.spec.ts`, `gallery.spec.ts` |

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

Use Node 24 (verified 24.19.0, npm 11.17.0). Player progress remains in ignored `data/mythoveya.sqlite`; do not reset it. Tests use separate or disposable databases. Run browser suites sequentially because they share ports/output. See the [Wayfarer guide](docs/WAYFARER.md).

## Verified

- **126 unit/server tests in 26 files passed.** Rally checks cover all four walking approaches, clear connecting paths, daily rotation and UTC rollover, old-profile defaults, wrong/stale requests, region restrictions, one-time passport rewards and replay-safe operations. Every rotating activity can be completed with the initial team.
- Production build and content audit passed. The initial client is 1,479.22 kB (436.74 kB gzip); Vite retains its large-chunk warning.
- The model/effect browser check passed for all four new species. All four creature screenshots were visually reviewed; Frostmoth's ice-shard effect was also inspected.
- The compiled production smoke passed: local assets, guest progression and two-human arena connections. The smoke logs the existing unregistered snapshot-message warning but completes successfully.

- The complete rally browser journey passed in 3.1 minutes: actual five-win region unlock, all four map destinations and walking routes, host stories, wrong-answer retries, daily rewards, owned companions, passport completion and reload. Mobile width 390 passed the overflow check. No page errors were reported. The four camps, mobile panel and completed passport were visually reviewed. Two early runs stopped on test selectors that omitted decorative arrows; selectors were corrected before the passing run.
- Both local client and API health endpoints returned HTTP 200.

- All ten selected regression scenarios passed across the initial run and targeted rerun: Canyon, three Havenreach checks, Moonfrost, responsive HUD, first-session gameplay, two-player arena, Whisperleaf and settings. The initial run passed eight; Canyon and the Havenreach exploration test stopped on outdated destination counts (8/30 rather than 9/31). Both passed after updating those expectations.
- Final browser rerun: Canyon, Havenreach exploration and the rally passed together in 5.6 minutes. The rally now checks actual disposal events for each camp's merged geometry on region changes, as well as returning to a freshly rendered Havenreach camp. Final rally duration was 2.1 minutes.
- Camp geometry now releases on unmount and its material allows normal renderer cleanup. The final production build/typecheck and compiled-server smoke passed after this correction. The gallery/model checks and complete unit suite ran before this client-only cleanup change.

## Limits and next work

Daily activities are three short authored interactions, not live multiplayer events. Hosts reuse existing avatar bodies; these are new NPC roles, not additional playable keepers. Camps have no interiors. This update adds stops, paths and wildlife within the current regional boundaries. Public accounts, hosting, shared exploration, real-time festival rooms, subjective audio quality, long-term balance and physical-device ergonomics remain outside verification. Broader limits remain in `KNOWN_ISSUES.md`.

Next useful work is a longer cross-region campaign, reusable crafting materials or walkable interiors. Earlier handoffs are archived in `docs/DEVELOPMENT_HISTORY.md`.


This update contains **13 meaningful local commits** after `21840fe`, including gameplay, art, paths, browser acceptance, graphics cleanup and this documentation milestone. No push or deployment was performed; the original handoff requires a separate request to push. Remote `main` was checked at `21840feb1bbe74bbb8ed75a55b2cb7257c5f259f`. The player's ignored save was preserved.


## October 13, 2026 - Wildhaven Conservancy handoff

# Mythoveya handoff

Updated October 13, 2026. Workspace: `C:/Users/ASUS/Downloads/Mythoveya`; branch `main`. This Wildhaven Conservancy update began at `d75b2d3`. Existing saves, regional quests and Wayfarer progress are preserved.

## Implemented

- **Wildhaven Conservancy** adds a refuge and three supply sites in each of Havenreach, Whisperleaf Meadow, Emberglass Canyon and Moonfrost Hollow: sixteen mapped destinations with approach trails, waypoint walking and shared collision. The current regional boundaries remain unchanged.
- **Four stewards:** Juniper, Tamsin, Daro and Elowen have authored stories and workshops. They reuse existing keeper bodies with regional details. Installing shelter, planter and lantern kits visibly changes each refuge; completing it adds flowers and resident wildlife.
- **Reusable crafting:** Fallen timber, Meadow fiber and Gleamstone replenish at twelve sites once per UTC day. Each grants three units. Shelter costs 2 timber + 1 fiber; planter costs 2 fiber + 1 crystal; lantern costs 2 crystal + 1 timber. Spare kits dismantle for all ingredients. Materials and kits persist across days and regions; caps are 999 per material and 99 per kit. This bag is separate from existing town and Moonfrost inventories.
- **Restoration and repeat visits:** installing all three pieces grants 80 Gold and 40 XP once per refuge. Daily tending consumes one spare planter for 25 Gold and 15 XP. Initial supplies cover restoration, so care may need another day's gathering. At Juniper, two completed refuges award Mossloom, 80 Diamonds and 50 XP; four award Astralynx, 150 Diamonds and 50 XP plus the Conservator badge. Duplicate companions follow normal shard rules. Level-up rewards can add Diamonds.
- **Two new companions:** Mossloom is an A-tier Grove support spider with eight jointed amber legs, a rose abdomen and soft leaf crown. Silken Sanctuary shields, cleanses and regenerates allies with woven-ring and petal effects. Astralynx is an S-tier Light striker with pearl-spotted midnight fur, golden ear tufts and three aurora tails. Constellation Pounce pierces and marks an enemy row with curved star trails.
- The roster now contains **86 base species plus 16 evolved forms**, **258 actions**, **86 passives** and **12 model families**. Tier counts: E11, D11, C11, B16, A19, S18. Recruitment tier probabilities remain unchanged; the A and S pools each gained one species. Existing shimmer, friendship, training and equipment rules apply.
- Entry points: **Adventure > Wildhaven Conservancy / Craft and restore habitats**, Events, pause, steward interactions and regional maps. The journal supports tracking supplies, regional travel, crafting, installation and claims. Mobile layout uses a single column at narrow widths.
- Server validation covers region, six-companion team, island exclusion, UTC day, recipe, inventory caps and spending, installed pieces, daily tending and permanent awards. SQL operation IDs replay safely. Optional profile state supports older saves. Physical interaction distance remains client-enforced.

## Key files

| System | Files |
| --- | --- |
| Refuges, supply nodes, recipes, paths and collision | `packages/shared/conservancy.ts`, `types.ts`, regional geometry modules |
| Species and combat | `packages/shared/roster.json`, `content.ts` |
| Durable actions and API | `apps/server/conservancy-game.ts`, `game.ts`, `index.ts` |
| Habitat scenery and creature art | `ConservancySites.tsx`, `creature-dna.ts`, `models.ts`, `WildwoodEffects.tsx`, `Scene.tsx` |
| Journal, maps and navigation | `ConservancyPanel.tsx`, regional map components, `App.tsx`, `WorldHUD.tsx`, `haven.css` |
| Acceptance | `tests/conservancy.test.ts`, `conservancy-server.test.ts`, `tests/browser/conservancy.spec.ts`, `gallery.spec.ts` |

Client files above live under `apps/client/src/`.

## Launch

```powershell
npm run dev                 # http://127.0.0.1:5173; API on 2567
npm test
npm run content:audit
npm run build
node scripts/smoke-production.mjs
npm run test:e2e             # separate services on 5174/2568
```

Use Node 24 (verified 24.19.0, npm 11.17.0). Preserve ignored `data/mythoveya.sqlite`. Tests use separate or disposable databases. Run browser suites sequentially because they share ports and output. See the [Conservancy player guide](docs/CONSERVANCY.md) for controls, recipes, rewards and reviewed screenshots.

## Verified

- **132 unit/server tests in 28 files passed**, including all sixteen approaches, complete connecting trail sweeps, supply and habitat collision, UTC rollover, old-profile defaults, invalid/stale/replayed actions, full crafting refunds, permanent restoration, milestone rewards and next-day tending. Log: ignored `artifacts/conservancy-unit-checks.log`.
- Content audit passed for 86 species, 258 actions, 86 passives and twelve model families. All normal and shimmer models passed the model checks.
- The new creature/effect browser check passed. Both companion models and signature effects were inspected; Mossloom's legs and crown were refined before the final passing gallery check.
- The complete Conservancy browser journey passed in 2.7 minutes with no page errors: real five-win regional unlock, all sixteen mapped destinations, steward stories, empty-inventory gates, daily gathering, crafting and full dismantling refund, all twelve installations, actual rendered habitat pieces, both companion claims and reload persistence. A 390-pixel viewport passed its overflow check. Four restored sites, mobile panel and completed journal screenshots were visually reviewed.
- Daily care and UTC rollover were exercised in server tests; the browser journey spent its initial materials restoring sites and did not wait for the following day.
- Final production build/typecheck passed after the art refinement. Initial JavaScript: 1,495.09 kB / 441.57 kB gzip; Vite retains its large-chunk warning.
- Compiled production smoke passed for assets, guest progression and two-human arena connections. It still logs the existing unregistered snapshot-message warning.
- Local client and API `/api/health` endpoints both returned HTTP 200.
- All six selected browser regressions passed together in 11.3 minutes: Canyon restoration, Havenreach exploration, Moonfrost gathering/crafting/restoration, the first-player journey, Whisperleaf choirs and the four-region Wayfarer Rally. Log: ignored `artifacts/conservancy-regressions.log`. An earlier run lost its API connection during Moonfrost setup and later timed out; the clean rerun supersedes that incomplete result.

## Limits and next work

This update adds paths and activities within current regional boundaries. Refuges have no interiors; stewards are new NPC roles, not new playable keepers. Daily gathering and care are personal saved activities, not shared-world building or live multiplayer events. Authoritative world movement, public hosting/accounts, long-term economy and combat balance, subjective audio quality and physical-device ergonomics remain outside verification. See `KNOWN_ISSUES.md`.

Useful next work: a longer cross-region story campaign, walkable interiors, broader mobile gameplay review, and deliberate A/S reward balance testing. Earlier handoffs are archived in `docs/DEVELOPMENT_HISTORY.md`.

This update contains **14 meaningful local commits** after `d75b2d3`. No push or deployment was performed: the original user handoff requires a separate request to push. Remote `main` was checked at `d75b2d3c0a6b6cba45e143b9036217700474023b`. The player's ignored save is preserved.


---

# Mythoveya handoff

Updated October 14, 2026. Workspace: `C:/Users/ASUS/Downloads/Mythoveya`; branch `main`. The Atlas of Echoes update began at `d39ee0c`. Player saves, previous regional quests, Wayfarer and Conservancy progress remain compatible.

## Implemented

- **The Atlas of Echoes:** an ordered four-chapter exploration story across Havenreach, Whisperleaf, Emberglass and Moonfrost. Aster, Fenn, Suri and Niva have connected dialogue and inscriptions about the lost sky-road. Each chapter requires discovering a tablet and arranging three written glyphs with its archivist. Clues persist in the journal; hints and incorrect attempts have no cost or timer.
- **Eight destinations:** four regional archives and four tablets, with map markers, minimap interactions, waypoint walking, approach paths and shared movement collision. The landmarks use different silhouettes: map pavilion, fern archive, sandstone orrery and aurora archive. Restoration adds an animated memory light and resident wildlife. Geometry is released when its site changes or unmounts; reduced-motion settings stop the light's decorative motion.
- **Saved chapter rewards:** 80 Gold, 25 Diamonds and 40 XP per chapter. Chapter two awards Cairnfin; chapter four awards Inkwisp. Return to Aster after four pages for 80 Diamonds, 80 XP and the Lorekeeper badge. Duplicate species give normal shards; normal level-up bonuses can add Diamonds.
- **Daily echo readings:** finishing the story unlocks one reading per region per UTC day. Questions rotate among the first, second and third glyph in that region's memory. A correct answer gives 20 Gold and 10 XP. Wrong answers cost nothing. Daily claims reset at 00:00 UTC; chapters and the finale never reset.
- **Cairnfin:** B-tier Stone tank, a sandstone ray with layered ochre fins, turquoise geodes and a copper tail. Cairn Shelter guards and shields allies. **Inkwisp:** A-tier Shadow support spirit with a pearl-violet bell, six teal tentacles and golden runes. Memory Wash cleanses, shields and hastens allies. Both have custom palettes, anatomy and signature effects.
- The roster now has **88 base species plus 16 evolved forms**, **264 actions**, **88 passives** and **12 model families**. Tier counts: E11, D11, C11, B17, A20, S18. Recruitment tier odds stay unchanged; B and A each contain one more species. Normal shimmer, friendship, equipment and training systems apply.
- Entry points: **Adventure > The Atlas of Echoes / A journey through four memories**, Events, pause, maps and archive interactions. The mobile journal uses a single-column glyph form and four chapter tabs. Six companions are required to begin; existing battle-win gates still govern region access (Canyon two, Hollow five).
- Server checks enforce chapter order, local sites, mainland presence, six-companion team, exact answers, current UTC day and one-time rewards. Database operation IDs replay safely. Optional profile state supports older saves. Physical proximity remains client-enforced.

## Key files

| System | Files |
| --- | --- |
| Story, inscriptions, daily prompts, destinations and collision | `packages/shared/atlas.ts`, `types.ts`, regional geometry modules |
| New companions and combat mappings | `packages/shared/roster.json`, `content.ts` |
| Saved story actions and API | `apps/server/atlas-game.ts`, `game.ts`, `index.ts` |
| Monuments, archivists and creature art | `AtlasSites.tsx`, `models.ts`, `creature-dna.ts`, `WildwoodEffects.tsx`, `Scene.tsx` |
| Journal, maps and HUD | `AtlasPanel.tsx`, `App.tsx`, regional map components, `WorldHUD.tsx`, `haven.css` |
| Acceptance | `tests/atlas-server.test.ts`, `atlas-layout.test.ts`, `signatures.test.ts`, `tests/browser/atlas.spec.ts`, `gallery.spec.ts` |

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

Node 24.19.0 and npm 11.17.0 were verified. Preserve ignored `data/mythoveya.sqlite`; tests use separate or disposable databases. Run browser suites sequentially because they share ports and output. See [the Atlas player guide](docs/ATLAS.md).

## Verified

- **138 unit/server tests in 30 files passed** in 131.98 seconds, including existing combat, network, regional layouts and persistence checks. Log: ignored `artifacts/atlas-final-unit.log`.
- Content audit passed for 88 species, 264 actions, 88 passives and twelve model families.
- Three Atlas server tests passed, covering old saves, ordered discovery, wrong-region/island actions, free wrong-answer retries, full story rewards, durable companions, chapter/finale operation replay, all three daily question positions in every region, rollover and duplicate/stale daily requests.
- The new layout check passed for all eight approaches, connecting trails, foundations and routes from the regional spawn. Initial placements overlapped an existing Havenreach cottage and two Canyon columns; positions were corrected before passing checks.
- Normal and shimmer models passed their checks. Both creature screenshots were reviewed; the Atlas gallery browser test passed with six effect groups rendered for each signature.
- Companion combat checks passed: Cairnfin guards and shields allies; Inkwisp removes burns, shields and hastens allies; neither damages opponents with those skills.
- The initial complete story browser journey passed in 3.3 minutes with no page errors: actual five-win regional unlock, all eight walking destinations, recorded clues, hints and wrong-answer retries, all chapter rewards, both companions, finale, daily reading and reload. All four landmarks, completed journal and mobile view were visually reviewed.
- The final Atlas browser rerun passed in 2.9 minutes after journal refinements. It additionally exercised an actual puzzle at 390-pixel width, verified geometry disposal on all four region transitions, checked the final journal opens on the current region, and confirmed only one travel button appears for another region. The story ending remains available to reread.
- Final production build and typecheck passed. Initial client JavaScript: 1,512.61 kB / 446.82 kB gzip. Vite retains its existing large-chunk warning. Log: ignored `artifacts/atlas-final-build.log`.
- Compiled production smoke passed with process exit 0: local assets, guest progression and two-human arena connections. It still logs the existing unregistered snapshot-message warning. A first PowerShell logging pipeline returned a nonzero wrapper status due to stderr; direct execution confirmed the successful process exit.
- Local client and API health endpoints both returned HTTP 200.
- The first regional regression pass found the Havenreach tablet base overlapping an older trail. The bases were moved beside the routes; an added regression sweeps a 0.9-metre corridor along every old and new trail in all four regions. All 27 targeted layout tests passed after correction. The final eight-journey browser run passed Atlas, Canyon, Havenreach, Moonfrost, first-player flow, Whisperleaf and Rally (seven passes in 14.6 minutes). Conservancy stopped during battle setup when an action arrived before the server allowed it. Log: ignored `artifacts/atlas-final-browser.log`.
- Conservancy then passed its complete journey in 3.9 minutes: gathering, crafting, dismantling, all four habitat restorations, mobile layout, companion awards and persistence after reload. Its fixture now retries only the server's pre-mutation early-action rejection, with a strict bound; all other errors still fail immediately. A separate isolated attempt timed out loading the title page, so navigation has a 60-second allowance while interaction assertions remain at 15 seconds. No gameplay timing rule was changed. Final fixture typecheck passed. Log: ignored `artifacts/atlas-conservancy-final.log`.
- All eight browser journeys therefore passed across the final regression run and targeted Conservancy rerun. Refreshed Meadow and Hollow guide screenshots were visually reviewed. The ignored player database remains present and was not replaced.

## Limits and next work

This update adds story destinations and paths inside current region boundaries. Archives have no interiors and archivists reuse existing avatar bodies. The story has a fixed ending and written glyph puzzles; daily readings are personal saved activities, not shared live events. Public accounts/hosting, authoritative shared-world movement, subjective audio quality, physical-device ergonomics and long-term balance remain outside verification. See `KNOWN_ISSUES.md`.

Useful next work: walkable interiors, field encounters that use companion abilities, deeper story choices, and balance/playtesting of the accumulated daily rewards. Earlier handoffs are archived in `docs/DEVELOPMENT_HISTORY.md`.

Including this handoff, the Atlas update contains **17 commits after `d39ee0c`**: 16 implementation, art, testing and documentation commits made during this work, plus the separately committed `01be14f` documentation update. Remote `main` was verified at `01be14f` on October 14; the final three commits (trail clearance, fixture reliability and this handoff) remain local. No push or deployment was performed by this continuation: the original user handoff requires a separate explicit request to push. The player's ignored save remains preserved.
