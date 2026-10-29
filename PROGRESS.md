# Mythoveya handoff

Updated October 28, 2026. Workspace: `C:/Users/ASUS/Downloads/Mythoveya`; branch `main`, pushed to `origin/main` (https://github.com/DQuanBui/Mythoveya). This session started at `5df365a`. The October 22 Wayfarer Lodges handoff is archived in [docs/DEVELOPMENT_HISTORY.md](docs/DEVELOPMENT_HISTORY.md). Preserve ignored `data/mythoveya.sqlite`. `CLAUDE.md` is the quick project map for new sessions.

## Play

- **Online (single-player):** https://dquanbui.github.io/Mythoveya/. Published by `.github/workflows/pages.yml` on every push to `main` (Pages source: GitHub Actions). Verified loading and playable after deployment with `node scripts/smoke-pages.mjs https://dquanbui.github.io/Mythoveya/`.
- **Local (full game, incl. human arena):** `npm install`, then `Play Mythoveya.cmd` or `npm run dev` → http://127.0.0.1:5173/. Compiled: `npm run build && npm start` → http://127.0.0.1:2567/.

## Why the play link was broken, and the fix

README linked only `http://127.0.0.1:5173/`, which works only while local services run; nothing was deployed, and the client cannot play without its Express/SQLite backend. The fix adds a standalone build (`npm run build:pages`): the server's route handlers and game modules (`apps/server/routes.ts`, `game.ts`, feature modules) run in the page against `apps/server/browser-store.ts` (same API as `store.ts`, localStorage key `mythoveya-standalone-save`), swapped in by a Vite plugin only in `--mode pages`. Human arena matches still need the local Colyseus server; the lobby says so. Public assets use `import.meta.env.BASE_URL` for the `/Mythoveya/` base.

## Implemented this session

- Online build, Pages deploy, Tests workflow (typecheck, audit, vitest, both builds, production smoke on every push/PR).
- Online save backup: Sound & settings → Download save / Restore from file.
- Loading screen before the script runs; clear message when WebGL is unavailable.
- Settings: high-contrast interface, world brightness (70-140%); Reduced Motion now applies before audio unlocks.
- Featured Weeks: four rotating UTC-week themes with missions, chest and permanent event stamps (`FEATURED_WEEKS`, ids `w-f-*`, optional `events.stamps`).
- Mid-battle bonding in wild encounters (`POST /api/battle/bond`, `pveBond`, `bondChance` 20-90% by health, one token and the turn, E-C tiers).
- Riftgate chapter prologues/epilogues (`packages/shared/story.ts`, `StoryScene.tsx`), once per keeper, replayable.
- Looks: smoother creature/keeper geometry, sheen/clearcoat materials and baked soft shading (Medium/High; Low unchanged); keeper collar, belt and shoes; cottage dormers, shingles, weathervanes, laundry, nameplates; deeper Havenreach grass and plaza; mist fog kept beyond the keeper.
- Life and sound: villagers turn and wave; surface footsteps (wood, sand, stone, snow); day birdsong, night crickets, canyon wind, Moonfrost ice.
- UX: battles fit 390 px portrait; collapsible quest tracker; minimap arrow shows facing; panel tab rows wrap.
- Fixes: Astralynx ultimate had no mythic effect; lodge geometry test exceeded 5 s; network test start budget.
- Performance: 16 panels lazy-loaded; React and Three.js split into cached vendor chunks. Entry script 1,546 kB → 392 kB (457 → 133 kB gzipped).

## Verified (October 28)

| Check | Baseline (start) | Final |
| --- | --- | --- |
| Typecheck | pass | pass |
| Content audit | 92 species, 276 actions, 92 passives, 12 families | same |
| Unit/server (vitest) | 35 files: 158 passed, 1 failed (lodge geometry timeout), 1 skipped (network setup failed under load) | 38 files: **173 passed** |
| Production build | pass, 1,546 kB entry + chunk warning | pass, 392 kB entry, no warning |
| Production smoke (`smoke-production.mjs`) | not run | PASS |
| Pages smoke, local and deployed | n/a | PASS |
| Playwright (32 scenarios) | 31 passed, 1 failed (Astralynx mythic effect) | 28 passed in a run that stalled for ~5 h (machine sleep/server drop: fetch failures, timeouts); the 4 affected scenarios then passed in a targeted rerun (12.4 min). All 32 have passing evidence on `cdaa11d`. |

Logs are in ignored `artifacts/` (`baseline/`, `final-e2e*.log`, `final-unit.log`). Visual checks were made with throwaway Playwright scripts against `npm run preview:pages`, including 390 px phone layouts.

## Remaining and next

- Interiors for the six visitor-book homes, reusing the Wayfarer Lodges room system.
- Listening pass for new footsteps and wildlife ambience; physical-device testing.
- Balance of Featured Week rewards and mid-battle bond tokens (not playtested).
- Cloud saves or online human matches would need a hosted server and account (owner decision).
- A stashed, uncommitted README edit from before this session (`git stash list`, "pre-handover README edits") removes six feature descriptions; the owner should decide whether to keep or drop it.
