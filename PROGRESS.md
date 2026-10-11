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
