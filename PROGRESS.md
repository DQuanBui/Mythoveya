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
