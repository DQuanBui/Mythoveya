# Mythoveya handoff

Updated with the November 11 round; its commits are dated November 8, 2026 (round names ran ahead of the calendar and are kept as a sequence). Workspace: `C:/Users/ASUS/Downloads/Mythoveya`; branch `main`, pushed to `origin/main` (https://github.com/DQuanBui/Mythoveya). This handoff covers fourteen rounds: October 29 (from `4619fdc`), October 30 (from `b0d6c3d`), October 31 (from `3497bb3`), November 1 (from `3d8496d`) November 2 (from `9d221ef`), November 3 (from `933a869`), November 4 (from `d37297c`), November 5 (from `1e622b9`), November 6 (from `040b6f1`), November 7 (from `a9be583`) November 8 (from `7661c95`), November 9 (from `6657ade`), November 10 (from `6d40e46`) and November 11 (from `d03d7f8`). Earlier handoffs (October 28 online-build session, October 22 Wayfarer Lodges) are archived in [docs/DEVELOPMENT_HISTORY.md](docs/DEVELOPMENT_HISTORY.md). Preserve ignored `data/mythoveya.sqlite`. `CLAUDE.md` is the quick project map for new sessions.

## Next up

November 12 round (from `0c51d3c`). Done this round, newest last:
- Wild balance: newcomers fight at 60% of the usual level and two lopsided picks were swapped, after simulating every region at levels 3-20 (`specialLevel`, tested).
- Title count: `keeper-life.spec` reads the number of titles from `MILESTONES` instead of a fixed 13.

Next 3 tasks:
1. Finish this round: wild visitors in the world, smarter Auto, a smaller first download, the Journal's seen list.
2. Decide on the balance outliers in docs/BALANCE.md (Iskavelle still weak, Astravelle strong).
3. Physical checks: audio, a real phone, a real controller, a real install.

## Play

- **Online (single-player):** https://dquanbui.github.io/Mythoveya/. `.github/workflows/pages.yml` publishes it on every push to `main` (Pages source: GitHub Actions). Check a deployment with `node scripts/smoke-pages.mjs https://dquanbui.github.io/Mythoveya/`.
- **Local (full game, including the human arena):** `npm install`, then run `Play Mythoveya.cmd` or `npm run dev` and open http://127.0.0.1:5173/. For the compiled build, run `npm run build && npm start` and open http://127.0.0.1:2567/.

## Implemented November 11

- Companion space (`companion-space.ts`, tested): the follow distance grows with the creature's body, and when walked into it steps back and aside faster than the keeper walks. Walking straight at Thornhare got to about 0.5 m before and about 1.2 m after.
- Companion activities (`companion-idle.ts`, tested; new `sniff`, `dig` and `look` motions in `animateCreature`): while waiting, the companion explores and comes back, sniffs at ungathered resources within 7 m, laps the keeper, digs, pounces and looks about. Outings pause the nap timer; off with Reduced Motion. Watched in the browser.
- Wild by time and weather (`packages/shared/wild.ts`, tested; `wild-server.test.ts` at a fixed night): night, dawn, rain and mist bring up to two extra creatures into wild encounters, and one of them gets the bond offer. A keeper's first battle, guardians and practice are unchanged.
- Journal: where and when each creature is met, who is out now, and a When to meet filter. HUD chip when such creatures are out (hidden on phones with the other location chips). Night Watcher title for befriending five.
- Iskavelle fix: abilities that do no damage were assumed to help allies, so its stun and slow targeted its own side and did nothing. A dump of every ability shows it is the only one changed; `ability-targets.test.ts` guards both directions.
- Balance report: `npm run balance` plays 20,000 seeded auto-battles and writes `docs/BALANCE.md`.
- Problem reports (`diagnostics.ts`, tested), controller rumble on ultimates and knock-outs (follows Camera shake), Run by default setting (`run-rule.ts`, tested), Journal grid fixed on phones, What's new updated.

Verification:

- Typecheck and content audit pass. Vitest: 65 files, 317 tests pass. Both builds and both smokes pass; entry 483.5 kB, up about 9 kB.
- Playwright full run (43.1 min): 35 passed, 1 flaky, 1 failed. `keeper-life.spec` failed twice: it expects 13 titles and Night Watcher made 14. `lodges.spec` failed once (its script could not win five wild battles in twelve tries) and passed on retry. Simulation then showed why: the newcomers grow faster than the familiar six, so wild battles got far harder as keepers level up. Both are fixed at the start of the next round.

## Implemented November 10

- Cloud shadows (`cloud-shadows.ts`, `cloudField` and `cloudAmount` in `cloud-pass.ts`, tested): soft shadows drift over everything lit by dimming direct light at each point's world position. A hook on `Material.prototype` covers every lit material at once, which is what avoids the seams of the earlier attempt; materials with their own `onBeforeCompile` call `withCloudShadows`. By day under open sky; off with Reduced Motion, Low quality or Minimal effects. Replaces last round's whole-scene dimming. Measured 52-54 fps with and without.
- Dialogs (`dialog-focus.ts`): panels are modal dialogs named after their heading; Tab stays inside, and closing returns focus to whatever opened them. The old `aria-label` stays as a fallback, and journeys still select by it. In `keyboard.spec`.
- Stale tabs: a tab open across a deployment reloads once when a script file has gone, instead of showing the error screen (`vite:preloadError` in `main.tsx`; checked by serving a 404 for a panel's script).
- Controller (`gamepad.ts`, `gamepad-map.ts`, tested): analog walking, camera, sprint, use, emotes, menus by D-pad, A and B, and battles by face buttons. Buttons speak as the keyboard does, so there is one code path. In `gamepad.spec` with a stand-in pad; no physical controller has been tried.
- Offline and install: the online build stores every file through a generated service worker (`apps/client/service-worker.js`, list and version from `vite.config.ts`), with a manifest and icons (`scripts/make-icons.mjs`). Pages ask the network first. `smoke-pages.mjs` now cuts the network, reloads, continues the save and opens an on-demand panel.
- Install button (`install-prompt.ts`): Sound & settings offers an install when the browser does, and an accepted install asks for durable storage. Checked with a stand-in browser offer only.
- Backup reminder (`backupDue`, tested): an online keeper with five victories and no backup in two weeks gets one toast, at most weekly.
- Battle star (`Unit.dealt`, `battleStar`, tested): the result screen names the companion who did the most, or who fought hardest after a loss. The tally draws no random numbers.
- Companion list (`companionChoices`, tested): the formation panel filters by element and sorts by strength, level or name, from seven companions on.
- Element guide (`ElementGuide.tsx`, `elementGuide`, tested): a table in the Team panel and battle log, generated from `elementMultiplier`.
- Shortcuts: Q, J, T and M open and close Quests, Journal, Team and the map, shown as menu tooltips and in the Controls guide (in `keyboard.spec`). A controller's Back opens the Journal.
- What's new (`whats-new.ts`, tested): the title screen lists recent changes with an unread marker. Update its list and id with player-facing changes.
- Measured but left alone: Journal opens with about 0.6 s of long tasks the first time, a battle starts with about 0.7 s, other panels with none. The walk grid costs about 330 ms in total but now runs in slices. What remains on entering a region is mostly ordinary first-frame rendering.

Verification:

- Typecheck and content audit pass. Vitest: 58 files, 277 tests pass.
- `npm run build` and `build:pages` pass; entry 474.6 kB, up from 466.5 kB. `smoke-production` and `smoke-pages` pass locally.
- Playwright full run (39.7 min, 37 journeys, one retry allowed): all 37 passed first time, none flaky. The second clean run in a row since the route and stall fixes.
- Not checked: nothing has been listened to, tried on a physical phone, or played with a real controller, and the game has not been installed on a real device.

## Implemented November 9

- Flaky journeys, causes found: the "Route stopped" walkers were aimed at walls. The line from (-12, 15) to (-18, 8) crosses a fence, and the eight-way key driver can press into a house corner and never slide free, so both routes now keep clear of them (checked against `havenWalkable`). `atlas.spec`'s "Travel map" timeout fits a busy main thread: a click right after a reload took 5.4 s in the production build, and more in dev. The journey now waits for the world, and the stalls themselves were cut.
- Entering a region (profiled in Havenreach, production-style build): walk grids build in 5 ms slices (`startGrid` in `pathfind.ts`, `grid-slices.ts`, tested), `WarmShaders` starts all programs compiling together (time waiting on links about 1.2 s to 0.6 s), and wildlife models take turns appearing (`useMountTurn` in `mount-turns.ts`, one per 60 ms). Long main-thread tasks in the first seconds fell from about 4.6 s to about 2 s in total, and the longest from 1.3 s to 0.8 s. One machine, a few runs.
- Team panel: Suggest a team fills the slots with the strongest companions, keeping a tank and a healer when owned, sturdy ones in front; the panel shows team power (`suggestTeam`, `teamPower` in `packages/shared/lineups.ts`, tested). Nothing changes until Save formation.
- Recent lineups: the three newest saved teams appear with their power, read from the existing `savedFormations`; a team with a companion no longer owned is skipped. No save or server change (`recentLineups`, tested).
- Damage estimates: the target list and the chip beside it say about how much the chosen ability deals. `damageEstimate` and the engine share `hitDamage`, and 300 seeded autoplay battles matched the previous engine exactly. It leaves out critical hits and the random roll.
- Phone layout: all three formation slots of a line fit at 390 px without sideways scrolling.
- Title banner: earning a keeper title shows a banner, a chime and a happy companion, only for titles reached this session (`newlyEarned`, tested). It uses `aria-live`, not a second `role="status"`.
- Fight again: the result screen offers Practice again after practice and Try this stage again after a lost stage. Practice was checked through two battles on a phone; the stage retry shares that path but was not played.
- Larger interface text: a setting zooms panels and notices by 18% and keeps them on screen (`largeText`, older settings default to off; in `settings.spec`).
- Passing clouds: the daylight eases to half strength for several seconds about once a minute, by day under open sky, off with Reduced Motion (`cloud-pass.ts`, tested). The first version moved screen brightness by only 1-2%, so it was deepened to about 5% and compared in two frames.

Verification:

- Typecheck and content audit pass. Vitest: 54 files, 253 tests pass. The first full run this round took 98 minutes and two tests timed out (`network`, `models`) while the machine stalled; both passed when rerun alone, then the full suite passed in 2 minutes.
- `npm run build` and `build:pages` pass; entry 466.5 kB, up from 464 kB. `smoke-production` and `smoke-pages` pass locally.
- Playwright full run (39.5 min, 35 journeys, one retry allowed): all 35 passed first time, none flaky. That is one clean run, not proof the flakes are gone.
- Not checked: nothing has been listened to or tried on a physical device.

## Implemented November 8

- Test: `islands.spec` polls the minimap after sailing home instead of reading it the instant the location label changes (same 1.5 m assertion).
- Test environment: Playwright retries a failed journey once and reports it as flaky, so a machine hiccup in a long run no longer hides the result; assertions are unchanged.
- Matchup hints: the battle target list shows each creature's element and, for attacks, whether it is strong or resisted, and a chip beside the picker names the chosen target's matchup (`matchupWord` in `packages/shared/elements.ts`, tested).
- Battle keyboard: 1-3 pick an ability, left and right change the target, Enter uses it, A and F toggle Auto and Fast; key hints show on the ability buttons (hidden on touch and from screen readers). In `keyboard.spec`, the Controls guide and the player guide.
- Fast battles are remembered between visits (`mythoveya-battle-fast` in localStorage; Auto still starts off each battle).
- Damage words: a hit that an element decides shows "Strong!" or "Resisted" under its damage number (`FloatWord` in `Scene.tsx`).
- Battle result summary: the result screen adds the round the battle was settled in, companions still standing and foes calmed (`battleSummary`, tested).
- Team coverage: the formation panel lists which elements the chosen six strike strongly and which they have no advantage over, updating as slots change (`teamCoverage` in `packages/shared/elements.ts`, tested).
- Sounds for the new details: synthesized `splash` (a footstep in a puddle) and `flutter` (sparrows taking off, once per burst) cues; audio manifest regenerated. Checked for errors only, not by ear.
- Pages smoke: `smoke-pages.mjs` now accepts the guide's team, starts a practice battle and waits for a turn, so a crash in the battle UI fails the smoke (one such crash this round got past typecheck, build and the old smoke).
- Battle announcements: a visually hidden `aria-live` line speaks the latest battle event and, on the player's turn, who acts next (`battleAnnouncement`, tested; checked in `keyboard.spec`).
- Target ring: the selected enemy's ring on the battlefield turns green when the next attacker is strong against it and salmon when resisted (gold otherwise).

## Implemented November 7

- Keyboard play outdoors: E uses whatever is within reach (the same as clicking it), as homes and lodges already did; no prompt card is added on desktop. New browser journey `tests/browser/keyboard.spec.ts` gathers Sunseed with E.
- Controls guide: the pause menu's Controls list now includes E (use what is within reach), 1-4 emotes and P / G for photo mode and pose; README points to it.
- Decorative effects setting: Sound & graphics has Auto (pause on a slow device, the default), Full and Minimal; `applyEffects` in `adaptive.ts` applies it (tested). Stored with the other settings in `mythoveya-settings`; older settings default to Auto.
- Voices: Elian's humming habit floats ♪ and ♫ notes up from the head, and chatting islanders show a "…" bubble in turns (`keeper-voice` sprites made lazily in `animateAvatar`). Fixed along the way: the chatting flag could leave visibility as undefined. Tested.
- Ground birds (`GroundBirds.tsx`, logic in `bird-flock.ts`, tested): small flocks of sparrows (4 each, 2 on Low) hop and peck at the village green, the clearing and the orchard by day; within 3.2 m they burst up and away, returning about 20 s later. Hidden at night, in rain and when decorative effects pause.
- Morning mist (`MorningMist.tsx`, curve in `mist.ts`, tested): soft flat patches lie low over Havenreach and Whisperleaf around the keeper from 5:30, thickest at 7:00, gone by 9:30; thinned by rain, off without the day cycle or when effects pause.
- Night company: outdoors after dark the companion follows within about 1.15 m instead of 1.6 m, staying near the keeper's lantern.
- Perf: region motes, dawn mist, Moonfrost snow glints, puddles and ground birds load as one `Ambience` chunk (5.7 kB) after the world appears; the entry drops from 465.7 to 460.7 kB.
- Windy smoke: chimney smoke streams off lower and further sideways as rain (and its wind) builds, matching the grass and trees.
- Cold nights: outdoors in Moonfrost after dark, a keeper standing about hugs themselves and shivers for about a second every six (`userData.cold`, replacing the idle habit meanwhile). Tested.
- Wet footprints: after stepping in a puddle, the keeper's next six steps leave dark damp prints on any ground (`wet` prints in `Footprints.tsx`, which fill in like the others). Tested.
- Dawn dew: `WaterGlints` takes an `amount` scale; in Havenreach 30 pale-green sparkles glitter on the grass around the keeper while the morning mist lies (same dawn curve).
- Butterfly visitor: when the companion naps within 25 m of Sunpetal Clearing, one of the clearing's butterflies drifts over and perches on its head, wings slowly opening and closing (`companionRest` in `village-materials.ts`).
- Pollen sneezes: in Whisperleaf a waiting companion sneezes every 16-30 s (new `sneeze` motion: wind-up, snap forward, eyes shut, with a small puff); listed in the asset gallery; tested.
- Player guide: `docs/LIVING_WORLD.md` explains what the companion, keeper, villagers, wildlife, weather, time of day and battles do on their own, plus the effects setting and shortcuts; linked from the README.
- CLAUDE.md: the module map covers the new client modules (Ambience chunk, adaptive effects, carried items, context recovery, status auras, labels) and records two conventions learned: keep Node-tested logic out of modules that import `audio.ts`, and watch the entry chunk for heavy imports.
- Greeting nod: a watching villager, host or ranger gives one small nod when the keeper first comes within reach, then follows them with their eyes. Tested.
- Test: `settings.spec` now also picks Decorative effects → Minimal and checks it survives a reload.

## Implemented November 6

- Test environment: Playwright no longer records video (first tried `retain-on-failure`, which still encodes every journey); failure traces with step snapshots and failure screenshots remain.
- Adaptive effects (`adaptive.ts`): a frame-time monitor in the world scene sets `perf.lite` after 6 s below ~30 fps (and clears it after 20 s above ~50 fps); region motes, water glints and ripples, puddles, puffs and islet drift pause meanwhile. Gameplay feedback is untouched and no toast is shown. Tested in `tests/adaptive.test.ts`.
- Health trail: battle health bars keep a pale trail where health was lost, which drains away 0.45 s later (a CSS width transition; instant under Reduced Motion).
- Low health: battle health bars under a quarter turn red and pulse (`.unit-bar.low`), still under either reduced-motion setting.
- Puddle splashes: `puddles` / `inPuddle` in `puddle-spots.ts` share the live puddles; a keeper footstep inside a puddle that holds water throws up three small splashes (`splash` puff kind). Tested.
- Stretch before a nap: a new `stretch` motion (slow play-bow, eyes shut) plays over the 1.4 s before a waiting companion curls up to sleep; listed in the asset gallery; tested.
- Fireflies shelter from rain: their glow fades out as rain builds (gone at about 70% rain) and returns when it clears.
- Perf: puddle spots store their ground height once, so filling puddles no longer looks up 40 terrain heights every frame.
- Cheer along: villagers, hosts and rangers within 8 m now cheer (both arms up, little hops) while the keeper's cheer emote plays, as well as waving back. Tested.
- Accessibility: each battle creature's button label now reads its shield and lasting statuses in plain words, e.g. "Mossprig 20 of 61, shield 12, stunned for 1 round" (`battle-labels.ts`, tested).
- Companion splashes: the following companion throws up small splashes as it trots through a puddle that holds water.
- Refactor: `useCarried(model, limb, create)` (`carried.ts`) makes, attaches and disposes a held item; the keeper's and islanders' lanterns and umbrellas use it instead of repeating the wiring.
- Islander chats: strolling islanders who stop within 2.6 m of another standing islander turn to face them and talk with their hands, nodding along (`userData.chatting` in `animateAvatar`, which skips the idle habit meanwhile). Tested.
- Super-effective hits: when the attacker's element beats the target's (`elementMultiplier` above 1), the impact flash, ring and debris burst about 45% bigger and wider.
- Perf: `elementMultiplier` moved to `packages/shared/elements.ts` (still re-exported by `combat.ts`), so the battle scene's super-effective check no longer pulls the whole battle engine into the entry chunk (471 back to 461 kB).

## Implemented November 5

- Graphics context recovery (`context-recovery.ts`): the world, battle, lodge, home, home island and festival canvases mark a lost WebGL context as recoverable, log a warning, and rebuild the Canvas when the browser restores it. Verified by forcing a loss and restore with `WEBGL_lose_context` on the Pages build (the world came back). This may be what blanked the lodge room in full Playwright runs; the warning will show in future traces.
- Leaf umbrella: `createUmbrella` (models.ts) is a broad leaf on a stem held upright in the left hand; the keeper raises it outdoors when rain passes 0.35 (not in snow, not during emotes).
- Townsfolk umbrellas: strolling islanders hold up the same leaf umbrella in rain, lowering it while they wave with that hand.
- Shake dry: a new `shake` motion (fast, fading roll with squeezed eyes); when the companion stops after following the keeper in rain it shakes for 0.9 s and flings eight droplets (`drop` puff kind). Listed in the asset gallery; tested.
- Puddles (`Puddles.tsx`, spots from `puddle-spots.ts`): up to 40 glossy puddles (16 on Low) on level Havenreach trail ground fill over ~20 s of rain and dry over about a minute. Placement tested in `tests/puddles.test.ts`; seen in a dev screenshot with rain pinned.
- Raindrop ripples: every water body with glints (Havenreach pond and lake, Whisperleaf pond, Moonfrost lake, island ponds) also spawns expanding raindrop rings while it rains (a third of its glint count), and its sun glints dim under the overcast.
- Wave back: villagers, hosts and rangers marked with `watchKeeper` wave back while the keeper's wave emote plays within 8 m. Tested.
- Sniffing: a fourth idle quirk where a creature lowers its nose, sniffs along the ground with a little bob and looks down (the quirk cycle is now four kinds). Tested.
- Snow sparkle: `WaterGlints` takes a `color` and a `follow` ground function; in Moonfrost, 36 white-blue sparkles wink on the snow within 9 m of the keeper, sitting on the slopes (fewer and silver at night).
- Facing the target: during its action a battle creature turns toward the unit it targets (eased in and out over the event, the short way round), so diagonal strikes and lunges head for their target. `turnToward` in `Scene.tsx`.
- Winners face the camera: once the last event ends, the winning team's standing creatures turn round over ~0.6 of an event to celebrate toward the camera.
- Photo mode gains a seventh filter, Moonlit (cool, desaturated blue); README updated.
- Photo toolbar on phones: under 600 px it spans the screen (16 px gutters), so the seven filters wrap in two rows and Pose, Take photo and Done share a row, instead of a thin column covering half the view (checked at 390x844).
- Fix: the Moonlit filter now uses sepia then a 175° hue turn, giving a true cool blue (plain hue-rotate had turned the greens yellow); checked on the Pages build at 390x844.

## Implemented November 4

- Refactor: the hair dye swatch row is one `HairDyePicker` component used by the Lanternfair wardrobe and the keeper appearance panel.
- Accessibility: the hair dye radiogroup uses roving focus (only the chosen swatch is in the tab order; arrows, Home and End move focus; Enter or Space picks, since each pick may save). `islands.spec` checks it.
- Villagers watch the keeper: `watchKeeper(model)` marks an NPC whose head eases toward the keeper within 4.5 m (and back afterwards). Used for the village friends, strolling townsfolk, home and lodge hosts, and the Atlas, Conservancy, Rally, Rescue and region rangers. Tested in `creature-look.test.ts`.
- Companion gaze: `animateCreature` honours an optional `userData.gaze` while a creature is free to glance; the companion waiting within 2.4 m of the keeper looks up at them instead of darting its eyes about.
- Wind: Havenreach's instanced grass, tree crowns and pines sway in the vertex shader (`swaying` in `HavenNature.tsx`, shared `wind` uniforms), a little harder in rain; still under Reduced Motion. Checked for shader errors on the Pages build.
- Element debris on impact (`DEBRIS` in `HitBurst.tsx`): flame tongues rise, tide droplets fall, grove leaves flutter, stone chips drop hard, frost shards, storm bolts and light needles point along their flight, shadow wisps drift up. (Tried cloud shadows painted in the ground shader; reverted because the plaza, trails and place discs are separate meshes and would show seams.)
- Turn ring: the next creature to act has its ring gently pulse (with the battle's 50 ms refresh); still under Reduced Motion and once the battle is won.
- Knock-out jolt: when an event knocks a creature out, the battle camera gives a short, decaying ~3 px jolt as it topples (only with the camera shake setting on and Reduced Motion off).
- Shimmer trail: a shimmering lead companion leaves small golden sparkles (`sparkle` puff kind) that rise and fade behind it while it follows the keeper.
- Refactor: the keeper's lantern is built, swung and disposed by `createLantern`, `swingLantern` and `disposeLantern` in `models.ts`, ready for other carriers.
- Townsfolk lanterns: from dusk (night glow above 0.4) each strolling islander carries the same hand lantern as the keeper, swinging as they walk home.
- Glints in every region: Whisperleaf's pond (26) and Moonfrost's lake (32) sparkle like the Havenreach waters, placed in world coordinates so distance culling works.
- Keeper glances at the companion: `userData.watch` can be a point as well as the keeper (with `watchPaused` to look away smoothly); standing still, the keeper glances down at a companion beside them for ~2.6 s of every 7. Tested.
- Happy tails: creatures in the `victory` or `play` motion (battle wins, greetings, joy hops, cheering along) wag their tails hard; serpent body segments excluded, off under Reduced Motion. Tested.
- Landing dust: `KnockoutDust` became `LandingDust` (start time and length), still used for knock-outs, and each creature now lands with a small dust puff as the battle opens.

## Implemented November 3

- Test: `waitForScene` in `tests/browser/world-helpers.ts` polls until the canvas's React Three Fiber root holds the keeper; `walkRoute`, `clickWorld`, `haven.spec`'s walker and `lodges.spec`'s `playerPoint` wait on it (lodges, haven and keeper-life pass).
- Status effects in 3D (`StatusAura.tsx`, shared geometry and materials): stars circle stunned creatures (which also sway in the `stunned` motion), embers rise from burns, a frost ring with ice shards marks slows, green motes rise during regeneration and a red marker hovers over marked targets.
- Weary creatures: a new `weary` motion (heavy panting, droop, heavy-lidded eyes) plays for battle creatures under 25% health until the battle ends; listed in the dev asset gallery's motion picker.
- Region ambience (`RegionMotes.tsx`): flickering embers rise around the keeper in Emberglass and pollen drifts through Whisperleaf (48 motes, 16 on Low, in a 16 m box that follows the keeper; hidden under Reduced Motion).
- Companion paw prints: `leavePaw` in `Footprints.tsx` adds small round prints (same 48-print buffer, own left/right alternation) every 0.17-0.22 s while the companion follows over snow or sand.
- Fireflies and the lantern: every tenth firefly gradually drifts over to circle the keeper's lantern at night (`Fireflies lantern`, blended over a few seconds) and wanders back by day.
- Fish leap in Reedwater Lake: the pond's leaping fish is now a reusable `LeapingFish` (exported from `HavenWater.tsx`, with an optional `nudge` that keeps the pond's leaps off the bridge); a silver-blue fish leaps in the lake every ~6 s.
- Festival ghosts wear hair dyes: `fest-run` stores an optional `hair` in the run data beside avatar and outfit (absent when natural, so older runs render as before); the race, course and fishing keepers use `hairColor`. Tested in `festival-games.test.ts`.
- Hair dyes outside Lanternfair: the pause menu's Change keeper appearance panel has the same eight swatches; the preview shows the dye on the chosen keeper and Save appearance also saves a changed dye. `Avatar` and `Preview` take an optional `hair` colour.
- Companion joy: a successful gather, Skyglass cache, festival lantern, home gift or catch sets `companionJoy` (`village-materials.ts`) for 2.2 s, and the waiting companion hops in its victory motion (waking it from a nap).
- Performance: water glints hide and skip their per-frame update when the camera is over 60 m (plus the water's radius) away, leaping fish skip distant lakes, Low quality hangs half the rim fringe, and islets stop updating under Reduced Motion. FPS check (Pages build, Havenreach, 1280x800): Low, Medium and High all at the 60 fps cap.
- Ultimate charge-up (`ChargeAura` in `HitBurst.tsx`): for the first 40% of every ultimate, an element-coloured ring and turning hex rune open under the caster, a column of light rises and sparks stream up; static under Reduced Motion.
- Knock-out dust (`KnockoutDust` in `HitBurst.tsx`): a ring of soft dust puffs blooms where a creature topples when that event knocks it out (from 78% of the event for ~0.6 s; hidden under Reduced Motion).

## Implemented November 2

- Fix: evolving a shimmering companion now reveals the evolved form with its shimmer (`CompanionGrowth` passes `o.shimmer` to `RecruitmentStage`).
- Test: `keeper-life.spec` derives the expected badge title and record count from the save the guide created, so a shimmering guide companion (Starcatcher) no longer fails it.
- Sleeping Z's (`glyphs.ts` sprite helper; `sleep-zzz` group added lazily by `animateCreature`) over napping companions, sleeping wildlife and any other sleeper; static under Reduced Motion.
- Wildlife thought bubbles (`HabitatResident`): a "!" or "?" pops up when a creature first notices the keeper (reset once the keeper is 7 m away), and a heart every few seconds while it plays beside them.
- Support links (`SupportLink` in `HitBurst.tsx`): a glowing arc grows from the caster to each healed (green) or shielded (blue) ally, with a mote racing along it.
- Island fringe in every region: `IslandFringe` takes `edge`, `height` and a `look`; `RaisedTerrain` adds 100 pieces per region (roots and vines in Whisperleaf, icicles and snow-capped islets in Moonfrost, basalt drips and ember-lit islets in Emberglass).
- Keeper lantern after dark: a small lantern hangs plumb from the right hand outdoors once night glow passes 0.45 (`nightState` in `village-materials.ts`), and `DayNight keeperLight` adds one warm point light that follows the keeper, mounted with the other night lights.
- Frosty breath in Moonfrost: `Puffs.tsx` (32-puff ring buffer, camera-facing soft dots, `emitPuff`) draws little clouds from the keeper and companion every 1.1-1.8 s outdoors; hidden under Reduced Motion.
- Sprint kicks: each sprinting footstep on stone, paths or sand throws a tan dust puff behind the keeper, and in snow a white powder puff (`dust`/`snow` kinds in `puff-buffer.ts`, which the breath fix split out of `Puffs.tsx` so Node tests can import it).
- Water glints on the islands: the home island's placeable pond (9) and the Lanternfair pond (18); `WaterGlints` takes a `max` count, a third of it on Low.
- Battle opening: each creature drops onto its ring in turn (by side, column and row, ~1.3 s total) with a landing squash; `entrance` in `animateCreature` now drops from above.
- Hair dyes, server side: eight dyes in `packages/shared/looks.ts` (`HAIR_DYES`, `hairColor`), optional `Profile.hair`, new free mutation kind `look-hair` (`apps/server/look-game.ts`; `natural` clears the field), tested in `tests/looks.test.ts`.
- Hair dyes, client side: `createAvatar(index, hairColor)` (own geometry cache key), the explorer keeper and wardrobe mannequin wear the dye, the Lanternfair wardrobe has a radio row of eight swatches (`.hair-dyes`), `look-` results toast. `islands.spec` now also dyes and reloads.

## Implemented November 1

- Shimmering variants: iridescent skin (Medium/High) and three twinkling four-point stars (`spike` geometry, `skinFor(surface, shimmer)`).
- See-through Lanternmoth (veined ivory) and Frostmoth (frosted, rime-edged) wings via `glassPane`; Velvetmoth stays velvet.
- Dragons and serpents: gold-flecked irises with vertical slit pupils (`reptile` in `createCreature`).
- Evolved forms: a floating, turning bond circlet (`halo` geometry) above a breathing crest gem (`userData.crest`).
- Walking gaits per family: diagonal trot with footfall bob (four-legged), lumbering golems, hopping birds, buzzing insects, drifting spirits, and a head-to-tail slither wave through serpent segments (`userData.slither`).
- Battle motions: attacks wind up before the lunge (pounce, wing buffet, serpent strike, tail swipe, golem slam); casts rear up with wings spread; hits knock back with a squash and shut eyes; defeat topples over with closed eyes. Scene passes a settled phase to creatures knocked out in earlier turns.
- Support feedback (`SupportGlow` in `HitBurst.tsx`): healed allies get a green ground ring, spiralling motes and floating plus signs; shielded allies get a popping lattice bubble.
- Skill effects travel element paths (`skill-path.ts`, tested in `tests/skill-path.test.ts`): flame and stone lob, tide waves, storm zigzags, grove corkscrews, shadow dips and weaves, frost and light fly straight. A seven-dot trail follows on Medium/High. Reduced Motion flies straight.
- Keeper idle habits (`animateAvatar`), every ~9 s while standing: Kael hands on hips, Mira shades her eyes and scans, Rowan stretches, Sora bounces, Dax folds both arms, Nyra ponders, Elian sways, Vesper taps a foot. Village hosts and townsfolk reuse these models, so they show the same personalities. Off under Reduced Motion and during emotes.
- Habitat wildlife (`HabitatResident`, used in every region) stops to watch a keeper within 5 m and hops about within 2.4 m; turns are smoothed. Wandering now steers toward its path point at a capped speed, which fixes a jump when a creature resumed after each pause.
- Water glints (`WaterGlints.tsx`): instanced sun flecks wink across Willowmere pond and Reedwater Lake, warm by day and a few faint silver ones at night. Hidden under Reduced Motion; 14 on Low, 44 otherwise.
- Fix: rain splashes sat at a fixed height and vanished under hills and mountains. `WeatherEffects` now takes the region's `ground` and caches each splash's height per drop.
- Victory: once the final blow lands, the winning side plays `victory`, and confetti (`Confetti` in `HitBurst.tsx`) bursts over the viewer's team if it won. `BattleScene` takes an optional `side` (Arena passes the human side). Reduced Motion skips the confetti.
- Shimmer reveal (`RecruitmentStage.tsx`): a shimmering arrival ends in a prismatic starburst (eight rays and a ring), and the shrine's halo and crystals cycle through the rainbow. Reduced Motion skips the burst and holds the colours.
- Companion joins emotes: a hop at a wave, play during cheer and dance, and settling low beside a sitting keeper before dozing off after ~14 s.
- Island fringe (`IslandFringe.tsx`, in `HavenTerrain`): 140 roots and vines hang over Havenreach's rim as one merged mesh, and nine mossy islets bob around the island (two instanced meshes; still under Reduced Motion).
- Tests: `tests/creature-look.test.ts` (slit vs round pupils for every species, circlets only on evolved forms, glass moth wings, twinkling stars, serpent slither, hit and defeat, keeper habits).

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

## Verified

November 8 (final code commit `0867252`):
- typecheck and content audit pass;
- **50 test files, 236 passed**;
- both builds pass, entry 464 kB (160 kB gzipped); `smoke-production` passes, and `smoke-pages` now also reaches a battle turn;
- Playwright full run (49.4 min, 35 journeys, one retry allowed): all passed, 33 first time and 2 flaky on the retry (`atlas.spec` Travel map click, `haven.spec` "Route stopped").
- A crash in the battle screen (a variable used before it was declared, inside a callback, so TypeScript missed it) was caught by a throwaway Playwright script before commit; the Pages smoke now covers that path.

November 7 (final code commit `d1a575e`):
- typecheck and content audit pass;
- **50 test files, 232 passed** (new: `bird-flock.test.ts`, `morning-mist.test.ts`);
- both builds pass, entry 463 kB (159 kB gzipped); `smoke-production` and local `smoke-pages` pass;
- Playwright full run (49.3 min, now 34 journeys with `keyboard.spec`): 32 passed. `lodges.spec` hung for about 15 minutes and then got "Failed to fetch" during setup, so the dev server was unreachable, possibly while the machine slept; it did not reach any game step and has not been rerun since. `islands.spec` read the minimap dot just after sailing home, before it updated, and passed alone (1.7 min).

November 6 (final code commit `6b0aaf7`):
- typecheck and content audit pass;
- **48 test files, 223 passed** (new: `adaptive.test.ts`, `battle-labels.test.ts`; new cases for puddle splashes, stretching, cheering along and chatting);
- both builds pass, entry 461 kB (159 kB gzipped; a stray import briefly made it 471 kB and was fixed); `smoke-production` and local `smoke-pages` pass;
- **Playwright: all 33 journeys passed in one full run (29.2 min)**, down from 50.9 min with three failures in the previous round. The only test-environment change is that video recording is off.
- Visual checks: Pages-build world loads with no console errors after the carried-items refactor and the islander chats; a mid-battle screenshot after the health trail.

November 5 (final code commit `9ad83a0`):
- typecheck and content audit pass;
- **46 test files, 215 passed** (new: `puddles.test.ts`; new cases for shake, sniffing and waving back);
- both builds pass, entry 458 kB (157 kB gzipped); `smoke-production` and local `smoke-pages` pass;
- graphics context recovery checked by forcing a WebGL context loss and restore on the Pages build (the world came back);
- Playwright full run (50.9 min): 30 of 33 passed. `atlas.spec` and `canyon.spec` timed out clicking a visible Travel map button and `variants.spec` waited 13 minutes for its shimmer count; all three (four scenarios) passed together on a targeted rerun (4.9 min, variants in 9.4 s). A frame-rate probe on the dev build found about 52 fps whether day, night, clear or rain, so the extra effects are not the cause.
- Visual checks: gallery shots (umbrellas, ripples), dev-server shots with pinned hour and weather (puddles and umbrellas in rain), and the photo toolbar plus Moonlit filter at 390x844.

November 4 (final code commit `04fa944`):
- typecheck and content audit pass;
- **45 test files, 211 passed** (new cases for head-watching, gaze, weary, happy tails, sparkles and the hair dye radiogroup);
- both builds pass, entry 453 kB (156 kB gzipped); `smoke-production` and local `smoke-pages` pass;
- Playwright full run (43.1 min, slower than usual): 31 of 33 passed. `keeper-life.spec` stopped mid-walk ("Route stopped near -8.0, 11.9") and `lodges.spec` hit its blank-room failure again; both passed together on a targeted rerun (5.2 min), so all 33 have passing evidence. The `islands.spec` Lanternfair journey now also checks keyboard movement through the hair dye swatches.
- Visual checks: gallery screenshots per change (element debris, status auras), a Pages-build world check for shader errors after the wind sway, and a dev-server dusk screenshot with pinned hour and weather.

November 3 (final code commit `bc66a94`):
- typecheck and content audit pass;
- **45 test files, 206 passed**;
- both builds pass, entry 449 kB (154 kB gzipped); `smoke-production` and local `smoke-pages` pass;
- FPS check (Pages build, Havenreach, 1280x800, this machine's GPU): Low, Medium and High all at the 60 fps cap;
- Playwright full run (28.4 min): 32 of 33 passed. `lodges.spec` failed in the full run and again on an immediate rerun: the lodge room rendered blank and the `lodge-furnishings-waiting` mesh was missing from its scene (no page errors in the trace). A bisect over this round's commits found every tested commit passing, and the spec then passed at the final commit and again during game night (five passes in a row), so the cause is still open.
- Visual checks: gallery screenshots per change (status auras, weary pose, motes, charge ring, knock-out dust) and an in-game night screenshot showing the lantern light with fireflies circling the keeper.

November 2 (final code commit `307b579`):
- typecheck and content audit pass (92 species, 276 actions, 92 passives, 12 families);
- **45 test files, 203 passed** (new: `looks.test.ts`; new cases in `creature-look.test.ts` and `keeper-fx.test.ts`);
- both builds pass, entry 442 kB (152 kB gzipped); `smoke-production` and local `smoke-pages` pass;
- Playwright full run (33.8 min): 32 of 33 passed. `lodges.spec` failed once reading React Three Fiber's internal store right after "Return outdoors" (the helper raced the canvas mounting); it passed on a targeted rerun (3.7 min), so all 33 have passing evidence. `keeper-life.spec` no longer depends on the shimmer roll, and `islands.spec` now also picks a hair dye and checks it after a reload.
- Note: `945b3ca` (frosty breath) was pushed with `keeper-fx.test.ts` failing in Node because the scratch check script hid the vitest exit code; `1b51abd` fixed the test import and the script now stops on test failures.

November 1 (final code commit `44b0cbc`):
- typecheck and content audit pass (92 species, 276 actions, 92 passives, 12 families);
- **44 test files, 196 passed** (new: `skill-path.test.ts` 4, `creature-look.test.ts` 7);
- both builds pass with no warning, entry 434 kB (149 kB gzipped); `smoke-production` and `smoke-pages` (local and the deployed site) pass; GitHub Tests and Pages workflows green;
- Playwright full run (42.4 min): 32 of 33 passed. `keeper-life.spec` failed because the guide's random team included a shimmering companion, so the badge read "★ Starcatcher" instead of "★ Bondmaker" (1/50 per companion, roughly a 10% chance). It passed on a targeted rerun (43 s), so all 33 have passing evidence. The test itself was not changed.
- Visual checks used the git-excluded gallery (`gallery.tsx` with `shimmer`, `*` ids, `habits`, `water` and `island` modes; `gallery-hit.tsx` with `support` and `confetti`; new `gallery-shrine.html`), one screenshot per change in ignored `artifacts/`.

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
