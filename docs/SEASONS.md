# Seasonal festivals

For a few weeks each year, glowing lanterns are hidden around Havenreach. Walk up to one and click it to collect it.

| Festival | Dates (UTC) | Lantern | Each find | All eight |
| --- | --- | --- | --- | --- |
| Lantern Night | Oct 24 – Nov 7 | Carved glowgourd | 25 Gold, 1 treat | 120 Diamonds, 2 bond tokens, 60 keeper XP |
| Frostlight | Dec 18 – Jan 6 | Frost-glass star on a post | 25 Gold, 1 Sunseed | 120 Diamonds, 2 bond tokens, 60 keeper XP |

- **Events → festival tab** (shown first while a festival runs) lists a clue for every lantern and ticks off the ones you have found.
- Progress belongs to that year's run (`lantern-night-2026`, and so on). Next year the lanterns return and can be found again. Completed runs stay listed under "Festivals completed".
- Found lanterns keep glowing softly in the world but can't be collected again.

Implementation notes:
- Content and date windows are in `packages/shared/seasons.ts` (`SEASONS`, `activeSeason`, `seasonOf`).
- The `season-find` mutation is in `apps/server/season-game.ts`.
- The lanterns are drawn by `apps/client/src/SeasonalLanterns.tsx`.
- Saves gain an optional `seasons` field the first time a lantern is found.
- Tests are in `tests/seasons.test.ts`.
