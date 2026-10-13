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
