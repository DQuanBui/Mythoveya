# Build progress

## Current playable build

Run `npm run dev` and open http://127.0.0.1:5173/. For a compiled build, run `npm run build`, then `npm start` and open http://127.0.0.1:2567/. SQLite progress remains independent of source updates. Repository: https://github.com/DQuanBui/Mythoveya.

The initial workspace was empty. The complete specification was read before implementation. Subsequent updates preserve the database and guest sessions.

## Milestones

1. **Playable foundation - implemented and checked.** Title, eight keepers, three starters, movement, interaction, six companions, PvE, rewards, and saves complete a playable first session.
2. **Progression - implemented and checked.** Story/daily rewards, recruitment, sequential pity, shards, training, collection, formations, and region unlocks use authoritative operations and replay protection.
3. **Multiplayer - implemented and checked.** Real human rooms, readiness, friendly codes, ranked queues, Power/Tactical rules, turn windows, reconnect, forfeits, and durable once-only Elo results. Practice is explicitly labeled computer play.
4. **Content - implemented with presentation limits.** All 60 species, ten per tier, 180 actions, 60 passives, twelve body families, eight keepers, three adventure regions, guardians, and species voices exist. Anatomy and geography remain stylized and compact.
5. **Presentation and verification - playable delivery, with documented limits.** Model portraits, articulated animations, eight music arrangements, 37 cues, ten mythic recipes, a 3D recruitment stage, region landmarks, settings, and a development gallery are connected. See [KNOWN_ISSUES.md](KNOWN_ISSUES.md) for the remaining work.

## Verification record

- TypeScript and production build passed. The large client bundle warning remains tracked.
- The latest gameplay/network suite passed **19 tests across four files**: content, economy replay safety, signature mechanics, a complete ranked human match, rejected turns, reconnect, immutable formations, once-only ratings, and persistence after server restart.
- Browser checks passed the complete first journey (including edited formation persistence and the 3D recruitment stage), two isolated human arena clients, all 60 unique model portraits, twelve model families, eight keepers, and bounded audio playback.
- Gallery coverage is split into model/audio and mythic-effect scenarios. The strengthened mythic check passed for **all ten S-tier species**, asserting visible geometry in the renderer at a fixed paused impact phase. The resulting captures were visually inspected.
- Compiled-build smoke checks passed startup, local assets, guest progression, and human arena connection.
- Compiled title, exploration, and journal layouts passed at **1280 x 720, 1440 x 900, and 1920 x 1080**, with no page errors or external asset requests. Visual fixtures also captured all three adventure-region landmarks without changing player saves.
- The dependency audit reported **zero vulnerabilities**.

Screenshots were captured and inspected for title, exploration, battle, recruitment, journal, twelve families, eight keepers, and ten mythic previews. Browser gameplay recordings are under ignored `test-results/`. Playback and mixer limits were checked programmatically; subjective listening review has not been performed.

The final production build passed after the paused-preview correction. The project has twelve meaningful commits across foundation, combat, saves, exploration, progression, multiplayer, presentation, and verification. Saves, guest tokens, recordings, and temporary test databases are excluded from Git.

## Recent refinements

- Kept world labels behind panels and focused gallery effects on their participants.
- Corrected mixed support targeting, shield expiry, delayed ordering, and once-per-battle revival.
- Added precise battle rewards and arena rating changes.
- Preserved camera tracking across HUD updates and activated companion/roamer locomotion.
- Separated a resource pickup from the training circle.
- Kept mythic geometry upright, added missing wing pairs, and corrected Solkarath's six-horn crown.
- Added a selectable 3D recruitment stage with rarity accents and reduced-motion support.
- Added canyon mesas and arch, hollow ice and crystal ridge, meadow flowers and water, village buildings, and landmark collision.
- Added a paused effect timeline with an explicit phase for reliable visual inspection.

## Reproducible checks

```powershell
npm run typecheck
npm test
npm run build
npm run content:audit
npm run test:e2e
node scripts/smoke-production.mjs
node scripts/verify-layouts.mjs
npm audit
```

Install browser tooling once with `npx playwright install chromium`. Browser tests use separate ports and a test database. Compiled smoke/layout checks create temporary databases. These checks do not reset player progress.

## Next work

Remaining work includes longer authored region stories, anatomical and animation refinement, subjective listening review, broader balance playtesting, and performance tuning. The current compact procedural presentation is a playable first version, not a claim that every production-polish requirement is finished.
