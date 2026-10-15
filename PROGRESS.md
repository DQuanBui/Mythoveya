# Mythoveya handoff

Updated October 14, 2026. Workspace: `C:/Users/ASUS/Downloads/Mythoveya`; branch `main`. Wildbound Rescues began at `dda66de`. Preserve ignored `data/mythoveya.sqlite`.

## Implemented

- **Wildbound Rescues:** four independent, permanent incidents with Mira (Willowrun nursery, Havenreach), Oren (Bramblefall crossing, Whisperleaf), Tavi (Sunspade dig camp, Emberglass) and Edda (Snowbell shelter, Moonfrost). Each has authored dialogue, an observation, three companion tasks and two saved endings.
- **Field abilities:** Stone/Frost use Brace, Tide/Grove use Nurture, Flame/Light use Beacon, Storm/Shadow use Scout. Choose an active owned companion in the journal; all starter teams cover all four abilities. Tasks cost no items or currency and give the helper 2 friendship, capped at 100. Saved history retains each helper's species.
- **Changing scenery:** frames straighten, plants recover and lamps illuminate as tasks finish. Sheltered-rest endings add a canopy and close-roaming wildlife; open-route endings add flags and wider roaming. Both reward 70 Gold, 20 Diamonds and 25 XP once. There is no daily reset or repeat reward.
- **New companions:** Reedrake is a B-tier Tide healer with webbed coral wings, cattail horns and a paddle tail; Reedwater Rest heals and regenerates allies. Solmole is an A-tier Flame controller with plum fur, golden spade claws, a coral nose and three glowing back stones; Sunspade Sweep damages and weakens an enemy row. Both have authored palettes, anatomy and skill effects, plus normal shimmering variants.
- Complete two rescues in any order to welcome Reedrake, four to welcome Solmole; claim at any mainland rescue keeper. Claims are one-time and follow existing duplicate-shard and shimmer rules. Four completions award the Trailkeeper HUD badge.
- Four clearings, connecting paths, map markers, minimap targets and walking waypoints. Shared collision keeps structures outside existing trail corridors. Scenery releases its merged geometry when task state changes or regions unmount. Reduced-motion settings stop decorative beacon rotation.
- Entry points: **Adventure > Wildbound Rescues / Help wildlife with your companions**, Events, pause and map destinations. The journal supports mobile team selection, formation changes, recorded task results and ending/reward status. Existing gates still apply: six-companion team, two battle wins for Canyon and five for Hollow.
- Server validates site region, mainland presence, active-team ownership, elemental ability, expected task sequence, completion and reward eligibility. Database operation IDs protect retries. Optional profile state preserves old saves. Physical distance remains client-enforced.
- Roster: **90 base species + 16 evolved forms**, **270 actions**, **90 passives**, **12 model families**. Tier counts: E11, D11, C11, B18, A21, S18. Recruitment tier probabilities are unchanged.

## Key files

- Shared content and geometry: `packages/shared/rescue.ts`, `types.ts`, `roster.json`, `content.ts`, and the four regional geometry files.
- Server: `apps/server/rescue-game.ts`, mutation schema in `index.ts`, dispatch in `game.ts`.
- Client: `RescuePanel.tsx`, `RescueSites.tsx`, `Scene.tsx`, regional maps, `App.tsx`, `WorldHUD.tsx`, `haven.css`, `models.ts`, `creature-dna.ts`, `WildwoodEffects.tsx` under `apps/client/src/`.
- Tests: `rescue-server.test.ts`, `rescue-layout.test.ts`, model/combat contracts, `tests/browser/rescue.spec.ts` and the Rescue gallery case.
- Player guide: [docs/RESCUES.md](docs/RESCUES.md).

## Launch

```powershell
npm run dev                 # client 5173; API 2567
npm test
npm run content:audit
npm run build
node scripts/smoke-production.mjs
npm run test:e2e             # isolated services on 5174/2568
```

Node 24.19.0 and npm 11.17.0 verified. Browser tests must run sequentially because they share ports. Do not edit game source during browser acceptance (HMR can invalidate the run). Tests use separate/disposable SQLite files.

## Verified

- **147 unit/server tests in 32 files passed** on the final source, in 160.22 seconds. Log: ignored `artifacts/rescue-final-unit.log`.
- Content audit passed for 90 species, 270 actions, 90 passives and twelve families. Recruitment tier rates are unchanged.
- Four new server tests cover old saves, all three starter choices, local/mainland restrictions, active ownership, wrong abilities, stale task indices, free rejections, capped friendship, task/finale operation replay, both saved endings, milestone gates, durable companion claims and duplicate shimmer preservation.
- Layout checks verify all four approaches, connecting paths, route finding, foundations and a 0.9-metre corridor along every old/new trail. Visual review found the canyon resident's original anchor inside a rock column; all four resident anchors now have checked clear ground and room around their bodies. Three rescue layout tests pass.
- Normal/shimmer model checks and combat checks pass. Reedrake heals and regenerates allies without damaging enemies; Solmole damages and weakens only the selected enemy row. Visual review corrected Solmole's generic tail/nose and removed duplicate generic horns/tail from Reedrake. The final models and both six-group signature effects were inspected in browser screenshots.
- **The final rescue journey and gallery passed in 2.7 minutes**, with no page errors. The journey earns the actual five-win region unlock, walks to every keeper, surveys all four sites, rejects incompatible helper selection in the UI, completes all twelve field tasks, chooses both ending types, claims both companions and verifies saved histories/outcomes after reload. It exercises an actual task at 390-pixel width with no horizontal overflow and checks the Trailkeeper badge. Geometry disposal is verified during task updates and after all four region transitions. Log: ignored `artifacts/rescue-final-browser.log`.
- **Eight existing browser checks passed in 8.9 minutes:** Canyon restoration, three Haven journeys (routes/bridge, mouse interactions/house visit, cache/fishing), Hollow crafting/restoration, first-player battle/recruitment/formation/reload/settings, two isolated keepers completing a shared arena battle, and Meadow choir restoration. Log: ignored `artifacts/rescue-regressions.log`. These passed before the final creature-anatomy and resident-anchor polish; the final rescue journey then verified that polish across all regions.
- All four refreshed rescue world screenshots, mobile task selection, both creature previews and both signature previews were visually reviewed. The player guide includes final model and world captures.
- The local client and `/api/health` both returned HTTP 200. The ignored player database remains preserved; test saves are separate.

- Final production build and typecheck passed: 744 modules, initial JavaScript 1,532.28 kB / 452.08 kB gzip, CSS 69.19 kB / 16.19 kB gzip. The existing large-chunk warning remains. Log: ignored `artifacts/rescue-final-build.log`.
- Compiled smoke passed with process exit 0: local production assets, guest progression and two-human arena connections. The existing unregistered snapshot-message warning remains.

## Limits and next work

This update adds four outdoor clearings within existing map boundaries. Keepers reuse avatar bodies with field accessories. Incidents are personal saved activities, not synchronized live emergencies; elemental abilities are shared across species of an element. Endings change scenery and wildlife roaming, not later story branches. Public hosting/accounts, authoritative world movement, physical-device ergonomics and long-term reward/combat balance are not verified. See `KNOWN_ISSUES.md`.

Useful next work: walkable interiors, richer species-specific field behavior, and player testing of the accumulated activities before adding further rewards. Earlier handoffs are archived in `docs/DEVELOPMENT_HISTORY.md`.

Including the final handoff, this update contains **14 meaningful commits after `dda66de`**. Remote `main` was verified at `dda66de` on October 14; all 14 rescue-update commits remain local. No push or deployment was performed, following the original user's no-push handoff constraint.
