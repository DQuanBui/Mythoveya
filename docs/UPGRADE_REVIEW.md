# Havenreach clarity upgrade

## Review

The supplied screenshot communicates the pastel world well, but it gives equal visual weight to resources, destinations, and quests. Distant labels become tiny while nearby resource labels grow large. The visible screen edges cut through the HUD, and the bottom menu is only partially shown. The current mobile stylesheet also removes the quest and minimap instead of adapting them.

Phase 1 addresses orientation and usability before adding more destinations. The art palette, character models, economy, saved progress, and existing combat remain compatible.

## Phase 1 implementation

| Area | Change | Source |
| --- | --- | --- |
| Safe layout | One inset HUD rectangle, 24px desktop and 16px mobile minimum margins, device safe-area support, complete bottom dock | `apps/client/src/world-hud.css`, `apps/client/index.html` |
| Objectives | Three introductory steps, next objective, distance, a gold world beacon and matching minimap diamond; reward claims point to the quest panel | `apps/client/src/world-guide.ts`, `WorldHUD.tsx`, `Scene.tsx` |
| World labels | Fixed 12px text, 160px width cap, fade after 4.5m, disappear at 8m, occlusion against scene geometry, adjusted building-label heights | `apps/client/src/Scene.tsx`, `world-guide.ts`, `world-hud.css` |
| Resources | Small 3D sparkles replace floating resource text; depleted nodes no longer offer gathering; successful gathering explains the reward | `apps/client/src/Scene.tsx`, `App.tsx` |
| Currency clarity | Names displayed with quantities; hover, keyboard-focus, and touch explanations of earning and spending | `apps/client/src/WorldHUD.tsx` |
| Small screens | Compact quest and minimap, complete seven-entry menu, six-companion strip, drag-to-walk joystick, tappable interaction prompt | `apps/client/src/WorldHUD.tsx`, `world-hud.css`, `Scene.tsx` |

The implementation is in the linked source project. Phase 1 required no profile migration; Phase 2 adds village state to existing profiles without replacing their saved progression.

## Verification

`tests/browser/hud.spec.ts` checks safe bounds and overlaps at 1280x720, 1440x900, 1920x1080, 2560x1440, 390x844, 360x780, and 844x390. It also checks currency explanations, the map button, nearby-label filtering, and joystick movement/release. It captures desktop, portrait-mobile, and landscape screenshots. `tests/world-guide.test.ts` covers objective transitions. The existing first-journey test checks that progression, recruitment, formation editing, and reload still work. Final results are recorded in `PROGRESS.md`.

```powershell
npm run dev
# Open http://127.0.0.1:5173/ and continue your saved journey.
npm run typecheck
npx vitest run tests/world-guide.test.ts
npm run test:e2e -- --grep "exploration HUD|first journey"
npm run build
```

## Review checkpoint and subsequent phases

The supplied brief ends with: “Start with Phase 1, then wait for my confirmation before Phase 2.” Phase 1 was completed and checked; the subsequent instruction to continue authorized work on Phase 2.

Phase 2 adds a data-driven cast of Liora, Sella, Bram, Kael, Oren, Tali, Pip, and Wren, with 24 selectable conversation topics, 16 ordered missions, and daily helper rewards. Their services include a rotating market, server-timed garden, crafting, friendship, nicknames, cosmetic accessories, daily sparring, and weekly guardian bounties. These compatible additions preserve the existing six-companion combat system. Weather, evolution, larger regions, and fuller guided tutorials remain later work.

The roster and mission definitions are in `packages/shared/town.ts`; authoritative transactions are in `apps/server/town-game.ts`. `TownPanels.tsx` provides conversations, missions, and services, while `TownScenery.tsx` provides the market, garden, and companion accessories. `tests/town.test.ts` checks save and economy rules; `tests/browser/town.spec.ts` follows the actual market, helper, naming, feeding, reload, planting, harvest, and crafting journey.

To review this phase, open **Quests → People & missions**. Each character has Conversation, Missions, and Services tabs. Plant a Sunseed with Wren, browse Pip's stock while it grows, then return after two minutes to harvest. Claim both Pip or Wren mission rewards to unlock a daily helper. Run `npx vitest run tests/town.test.ts` and `npx playwright test tests/browser/town.spec.ts` to reproduce the focused checks.

Verified captures: [village directory](screenshots/village.png), [completed missions and daily helper](screenshots/helpers.png), and [mobile garden](screenshots/garden-mobile.png).

This implementation adapts some proposed services to the established rules: helpers give daily supplies, Bram teaches the existing actions through dialogue and practice, and Kael offers a weekly bounty for current guardians. Autonomous helpers, ability purchases, potions, dusk-only tracking, and a rotating exclusive boss remain incomplete. No companion-release feature was added; renaming and party management are available.

Three later proposals require an explicit design choice because they change existing systems:

- The current game uses six-creature teams, eight elements, and three actions plus a passive. Replacing that with 3v3, five elements, and four actions affects every roster entry, formation, battle, and arena ruleset. A separate expedition mode is a possible compatible approach.
- SQLite currently owns progression and competitive results. Local-storage or manual imports must not let one player overwrite authoritative competitive progress; a local backup/export flow needs a defined scope.
- Diamonds and Gold retain their existing names. Renaming them to Rift Shards and Sun Coins should be applied consistently across the journal, recruitment, rewards, and documentation after approval. Creature shards already exist, so a second “shards” currency also needs careful wording.

No universal 60-fps claim is made. Browser layout and behavior checks do not measure a representative physical laptop or touch device; hardware performance and physical-device ergonomics remain review work.
