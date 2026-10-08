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
