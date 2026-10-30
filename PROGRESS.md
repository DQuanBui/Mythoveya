# Mythoveya handoff

Updated October 29, 2026. Workspace: `C:/Users/ASUS/Downloads/Mythoveya`; branch `main`, pushed to `origin/main` (https://github.com/DQuanBui/Mythoveya). This session started at `4619fdc`. Earlier handoffs (October 28 online-build session, October 22 Wayfarer Lodges) are archived in [docs/DEVELOPMENT_HISTORY.md](docs/DEVELOPMENT_HISTORY.md). Preserve ignored `data/mythoveya.sqlite`. `CLAUDE.md` is the quick project map for new sessions.

## Play

- **Online (single-player):** https://dquanbui.github.io/Mythoveya/. `.github/workflows/pages.yml` publishes it on every push to `main` (Pages source: GitHub Actions). Check a deployment with `node scripts/smoke-pages.mjs https://dquanbui.github.io/Mythoveya/`.
- **Local (full game, including the human arena):** `npm install`, then run `Play Mythoveya.cmd` or `npm run dev` and open http://127.0.0.1:5173/. For the compiled build, run `npm run build && npm start` and open http://127.0.0.1:2567/.

## Implemented this session

- **Creature looks** (`apps/client/src/models.ts`):
  - Eyes have an iris rim, a lit lower iris, two catchlights and a soft upper lid. They glance to a new spot every ~2 s.
  - Smiles: a "w" mouth on four-legged creatures, a small smile on the others.
  - Cheek tufts and a chest bib on soft-coated families. Toes on paws.
  - Per-family surface materials (fur, scale, wet, chitin, stone), each with a silhouette light term scaled by the incoming diffuse light.
  - Dragons have extruded scalloped membrane wings with finger bones. Birds have six fanned flight feathers and toes.
  - Idle quirks (stretch, wiggle with tail wag, hop and flap).
  - Medium/High only where noted. Low keeps plain materials.
- **Keeper looks:** squared shoulders, button placket, fold-point collar, waist-hugging belt, sleeve and trouser cuffs, slimmer soles, mitten hands with thumbs, iris rim, lashes, blink, side-swept fringe and a hair highlight. The limb order is unchanged.
- **Lantern Night and Frostlight** (`packages/shared/seasons.ts`, `apps/server/season-game.ts`, `SeasonalLanterns.tsx`, [docs/SEASONS.md](docs/SEASONS.md)):
  - Dated UTC festivals with eight lanterns each in Havenreach.
  - New mutation kind `season-find`, saved in optional `Profile.seasons`.
  - The Events panel gets a festival tab with clues.
  - Lantern Night is live now (Oct 24 – Nov 7).
- **Home interiors** (`packages/shared/homes.ts`, `HomeScene.tsx`, [docs/HOMES.md](docs/HOMES.md)):
  - "Step inside →" on five porches opens a walkable room with a host, a resident, a signature corner and a daily gift.
  - New mutation kind `town-gift`, saved in optional `town.gifts`.
  - Cloudwatch Lodge's porch opens the existing Wayfarer Lodge room.
- **Indoor sound:** homes and lodges play the "indoors" scene: the Hearthfall Isle theme plus fire crackle. A `WalkArea.step` override gives wooden footsteps.
- **Photo mode** (`PhotoMode.tsx`):
  - Opened with P or the ◉ button; hides the HUD and name tags.
  - Six filters, a captioned vignette frame, and PNG download.
  - Explorer registers `photo.grab`, which renders and reads the frame in one task.
- **Companion naps** after ~14 s standing still.
- **Fixes:**
  - Seasonal finds now show their toast. `run()` in `App.tsx` only toasts listed kind prefixes; this is now noted in CLAUDE.md.
  - Indoor music reuses an existing theme, because `tests/signatures.test.ts` pins ten music themes.

## Verified (October 29)

| Check | Session start (`4619fdc`) | Final |
| --- | --- | --- |
| Typecheck | pass | pass |
| Content audit | 92 species, 276 actions, 92 passives, 12 families | same |
| Unit/server (vitest) | 38 files, 173 passed | 40 files, **180 passed** (new: `seasons.test.ts` 4, `homes.test.ts` 3) |
| Production build | pass, 392 kB entry | pass, 415 kB entry (142 kB gzipped), no warning |
| Pages build | pass | pass |
| Playwright | 32 scenarios with passing evidence | **33 passed** in one full run (41.6 min), including the new `keeper-life.spec.ts` |

New browser journey `tests/browser/keeper-life.spec.ts` covers:
- photo mode, including a real PNG download;
- the festival tab and collecting a Lantern Night lantern;
- stepping into Maplewick Workshop, taking its gift, talking to the host and stepping outside.

Its world drivers are in `tests/browser/world-helpers.ts`, copied from `haven.spec.ts`, which is unchanged.

Visual checks used a throwaway model gallery: `apps/client/gallery*.html` and `src/gallery*.tsx`, excluded in `.git/info/exclude`, served by `npx vite --port 5190`. Screenshots are in ignored `artifacts/`.

## Remaining and next

- **Listening pass:** footsteps, wildlife, indoor fire. Then test on physical phones and tablets.
- **Balance** (not playtested): festival rewards, home gifts, mid-battle bond tokens and Featured Week rewards.
- **Visual follow-ups:**
  - a dragon-specific head and snout;
  - interiors that change with progress (e.g. the visitor's stamp framed on the wall);
  - more seasonal decorations beyond the eight lanterns.
- **Owner decision:** cloud saves or online human matches need a hosted server and account.
- **Owner decision:** a stashed, uncommitted README edit from before the October 28 session (`git stash list`, "pre-handover README edits") removes six feature descriptions. Keep it or drop it.
