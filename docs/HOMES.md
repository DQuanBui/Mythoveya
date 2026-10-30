# Visitor-book homes

Each of Havenreach's six visitor-book homes has a porch panel (click the house). From the porch, **Step inside →** opens the interior.

| Home | Host | Resident | Signature corner | Daily gift |
| --- | --- | --- | --- | --- |
| Hearthcrumb Bakery | Hettie Crumb | Emberfox | Warm oven | 1 treat, 10 Gold |
| Maplewick Workshop | Tobin Maple | Cragpup | Workbench | 30 Gold |
| Sunpetal Glasshouse | Gardener Wren | Mossprig | Seedling bench | 2 Sunseed |
| Applebright Cottage | Rosalind Applebright | Thornhare | Preserve pantry | 1 treat, 10 keeper XP |
| Oldleaf Refuge | Elder Fen | Dawnfawn | Mossy hearth | 1 Sunseed, 20 keeper XP |
| Cloudwatch Lodge | Perrin | (opens the Wayfarer Lodge common room) | | |

Inside, walk around with WASD, the arrow keys, by clicking the floor, or with the touch pad.
- **Talk:** hear the host's stories.
- **Signature corner:** take the daily gift. Each home gives one gift per UTC day.
- **Visitor book:** sign it, exactly as on the porch.
- **Step outside:** return to the porch.

The room responds to your progress: a wrapped gift waits in the signature corner until you take today's gift. Once you've signed the visitor book, the host frames your stamp on the back wall. The resident creature strolls around the rug and table, pausing at each corner (it stays still with Reduced Motion).

Implementation notes:
- Content, furniture footprints, stations and walkability are in `packages/shared/homes.ts`.
- The gift mutation is `town-gift` in `apps/server/town-game.ts`. It stores `town.gifts` (optional, per UTC day).
- The scene is `apps/client/src/HomeScene.tsx`, a lazy chunk.
- Tests are in `tests/homes.test.ts`.
