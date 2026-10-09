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
