# Mythoveya handoff

Updated October 31, 2026. Workspace: `C:/Users/ASUS/Downloads/Mythoveya`; branch `main`, pushed to `origin/main` (https://github.com/DQuanBui/Mythoveya). This handoff covers three rounds: October 29 (from `4619fdc`), October 30 (from `b0d6c3d`) and October 31 (from `3497bb3`). Earlier handoffs (October 28 online-build session, October 22 Wayfarer Lodges) are archived in [docs/DEVELOPMENT_HISTORY.md](docs/DEVELOPMENT_HISTORY.md). Preserve ignored `data/mythoveya.sqlite`. `CLAUDE.md` is the quick project map for new sessions.

## Next up (November 1 round: creatures, characters, visuals)

Done so far, newest last:
- Shimmering variants: iridescent skin (Medium/High) and three twinkling four-point stars (`spike` geometry, `skinFor(surface, shimmer)`).
- See-through Lanternmoth (veined ivory) and Frostmoth (frosted, rime-edged) wings via `glassPane`; Velvetmoth stays velvet.
- Dragons and serpents: gold-flecked irises with vertical slit pupils (`reptile` in `createCreature`).

Next 3 tasks:
1. Glowing bond sigil and pulsing crest gem on evolved forms.
2. Per-family walking gaits (slither, hop, waddle, drift).
3. Family-specific attack, cast and hit reactions.

## Play

- **Online (single-player):** https://dquanbui.github.io/Mythoveya/. `.github/workflows/pages.yml` publishes it on every push to `main` (Pages source: GitHub Actions). Check a deployment with `node scripts/smoke-pages.mjs https://dquanbui.github.io/Mythoveya/`.
- **Local (full game, including the human arena):** `npm install`, then run `Play Mythoveya.cmd` or `npm run dev` and open http://127.0.0.1:5173/. For the compiled build, run `npm run build && npm start` and open http://127.0.0.1:2567/.

## Implemented October 31

- **Creatures:**
  - clear, veined, iridescent insect wings (`glassMaterial`);
  - golem stone slabs and chest runes, plus moss on grove golems;
  - tortoise scutes and a rim on shells (`hex` geometry);
  - spirit glow, wisp tail and motes (`ghostMaterial`);
  - amphibian webbed feet and throat pouch.
- **Emotes:**
  - Keys 1-4 or the ☺ menu: wave, cheer, dance, sit.
  - The emote lives in `keeperEmote`/`playEmote` (`village-materials.ts`); `animateAvatar` takes an `emote` argument.
  - The companion plays along.
- **Weather:** lightning flashes and thunder in full rain (`Weather.tsx`, `audio.thunder`).
- **Footprints** in snow and sand (`Footprints.tsx`, ring buffer).
- **Lantern sense:** a HUD chip within 14 m or 6 m of an unfound festival lantern. It uses `aria-live`, not `role="status"`. The toast must stay the page's only status, because tests rely on it.
- **Performance:** PhotoMode, MilestonesPanel and SeasonalLanterns are lazy chunks; photo state lives in `photo.ts`. Entry 431 → 424 kB. In `Scene.tsx`, any `lazy()` call must come after all imports: in dev, Vite turns the React import into a plain variable.
- **Tests:** `tests/keeper-fx.test.ts`; `keeper-life.spec` also covers emotes and the Keeper Record.

## Implemented October 30

- **Dragons and serpents:**
  - Dragons have a reptile muzzle with a pale jaw, nostrils, fangs, brow ridges and a grin.
  - Serpents taper from a pointed tail tip, with belly scales and a dorsal ridge.
- **Sea creatures:** ribbed pectoral fins (the membrane shape with rays), a forked tail fin that sways, and a dorsal fin.
- **Festival dressing:**
  - Drifting leaves (Lantern Night) or snow (Frostlight), as instanced particles following the keeper.
  - Gourds or star lanterns on every visitor-book home's step. These are not interactive.
- **Homes that show your visits:**
  - A wrapped gift waits until today's gift is taken.
  - Your stamp is framed on the back wall once the book is signed.
  - The resident walks `homeResidentRoute`.
  - The pantry is now an open dresser.
- **Battle:** `HitBurst.tsx` adds an element-tinted flash, ring and sparks on damage, drawn on top and timed from the event.
- **Keeper titles** (`packages/shared/milestones.ts`, `MilestonesPanel.tsx`):
  - 13 milestones derived from the save; nothing is stored.
  - The best title shows on the keeper badge, which opens the Keeper Record.
- **Sky** (`Atmosphere.tsx`):
  - A rainbow after rain, placed ahead of the viewer and visible when the camera is tilted toward the horizon.
  - Shooting stars on clear nights.
- **Photo mode:** Pose (G).
- **Greeting:** hearts float up from the companion (`Hearts.tsx`).
- **Sound cues:** `lantern`, `gift` and `shutter`. The audio manifest is regenerated.

## Implemented October 29

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

October 31 (final `HEAD`):
- typecheck and content audit pass;
- 42 test files, **185 passed**;
- both builds pass, entry 424 kB (146 kB gzipped);
- Playwright, first full run: 27 of 33 passed. Five failures came from the new lantern chip taking `role="status"`. The sixth, `haven.spec` "mouse picking", couldn't find the 3D scene's internal store.
- After the fix, the five affected files (8 scenarios) all passed, including the "mouse picking" scenario, so all 33 have passing evidence.

October 30:
- typecheck and content audit pass;
- **41 test files, 182 passed** (new: `milestones.test.ts`);
- both builds pass with no warning, entry 426 kB (146 kB gzipped);
- Playwright: the full run (52 min) passed 31 of 33. `canyon.spec` lost one of the two auto-battles it must win, and `conservancy.spec` had its page reload mid-setup; both passed on a targeted rerun (7.1 min), so all 33 have passing evidence on `36d5e6a`.

October 29:

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
