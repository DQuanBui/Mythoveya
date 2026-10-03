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
