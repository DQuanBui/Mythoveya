# Mythoveya handoff

Updated October 14, 2026. Workspace: `C:/Users/ASUS/Downloads/Mythoveya`; branch `main`. The Atlas of Echoes update began at `d39ee0c`. Player saves, previous regional quests, Wayfarer and Conservancy progress remain compatible.

## Implemented

- **The Atlas of Echoes:** an ordered four-chapter exploration story across Havenreach, Whisperleaf, Emberglass and Moonfrost. Aster, Fenn, Suri and Niva have connected dialogue and inscriptions about the lost sky-road. Each chapter requires discovering a tablet and arranging three written glyphs with its archivist. Clues persist in the journal; hints and incorrect attempts have no cost or timer.
- **Eight destinations:** four regional archives and four tablets, with map markers, minimap interactions, waypoint walking, approach paths and shared movement collision. The landmarks use different silhouettes: map pavilion, fern archive, sandstone orrery and aurora archive. Restoration adds an animated memory light and resident wildlife. Geometry is released when its site changes or unmounts; reduced-motion settings stop the light's decorative motion.
- **Saved chapter rewards:** 80 Gold, 25 Diamonds and 40 XP per chapter. Chapter two awards Cairnfin; chapter four awards Inkwisp. Return to Aster after four pages for 80 Diamonds, 80 XP and the Lorekeeper badge. Duplicate species give normal shards; normal level-up bonuses can add Diamonds.
- **Daily echo readings:** finishing the story unlocks one reading per region per UTC day. Questions rotate among the first, second and third glyph in that region's memory. A correct answer gives 20 Gold and 10 XP. Wrong answers cost nothing. Daily claims reset at 00:00 UTC; chapters and the finale never reset.
- **Cairnfin:** B-tier Stone tank, a sandstone ray with layered ochre fins, turquoise geodes and a copper tail. Cairn Shelter guards and shields allies. **Inkwisp:** A-tier Shadow support spirit with a pearl-violet bell, six teal tentacles and golden runes. Memory Wash cleanses, shields and hastens allies. Both have custom palettes, anatomy and signature effects.
- The roster now has **88 base species plus 16 evolved forms**, **264 actions**, **88 passives** and **12 model families**. Tier counts: E11, D11, C11, B17, A20, S18. Recruitment tier odds stay unchanged; B and A each contain one more species. Normal shimmer, friendship, equipment and training systems apply.
- Entry points: **Adventure > The Atlas of Echoes / A journey through four memories**, Events, pause, maps and archive interactions. The mobile journal uses a single-column glyph form and four chapter tabs. Six companions are required to begin; existing battle-win gates still govern region access (Canyon two, Hollow five).
- Server checks enforce chapter order, local sites, mainland presence, six-companion team, exact answers, current UTC day and one-time rewards. Database operation IDs replay safely. Optional profile state supports older saves. Physical proximity remains client-enforced.

## Key files

| System | Files |
| --- | --- |
| Story, inscriptions, daily prompts, destinations and collision | `packages/shared/atlas.ts`, `types.ts`, regional geometry modules |
| New companions and combat mappings | `packages/shared/roster.json`, `content.ts` |
| Saved story actions and API | `apps/server/atlas-game.ts`, `game.ts`, `index.ts` |
| Monuments, archivists and creature art | `AtlasSites.tsx`, `models.ts`, `creature-dna.ts`, `WildwoodEffects.tsx`, `Scene.tsx` |
| Journal, maps and HUD | `AtlasPanel.tsx`, `App.tsx`, regional map components, `WorldHUD.tsx`, `haven.css` |
| Acceptance | `tests/atlas-server.test.ts`, `atlas-layout.test.ts`, `signatures.test.ts`, `tests/browser/atlas.spec.ts`, `gallery.spec.ts` |

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

Node 24.19.0 and npm 11.17.0 were verified. Preserve ignored `data/mythoveya.sqlite`; tests use separate or disposable databases. Run browser suites sequentially because they share ports and output. See [the Atlas player guide](docs/ATLAS.md).

## Verified

- **138 unit/server tests in 30 files passed** in 131.98 seconds, including existing combat, network, regional layouts and persistence checks. Log: ignored `artifacts/atlas-final-unit.log`.
- Content audit passed for 88 species, 264 actions, 88 passives and twelve model families.
- Three Atlas server tests passed, covering old saves, ordered discovery, wrong-region/island actions, free wrong-answer retries, full story rewards, durable companions, chapter/finale operation replay, all three daily question positions in every region, rollover and duplicate/stale daily requests.
- The new layout check passed for all eight approaches, connecting trails, foundations and routes from the regional spawn. Initial placements overlapped an existing Havenreach cottage and two Canyon columns; positions were corrected before passing checks.
- Normal and shimmer models passed their checks. Both creature screenshots were reviewed; the Atlas gallery browser test passed with six effect groups rendered for each signature.
- Companion combat checks passed: Cairnfin guards and shields allies; Inkwisp removes burns, shields and hastens allies; neither damages opponents with those skills.
- The initial complete story browser journey passed in 3.3 minutes with no page errors: actual five-win regional unlock, all eight walking destinations, recorded clues, hints and wrong-answer retries, all chapter rewards, both companions, finale, daily reading and reload. All four landmarks, completed journal and mobile view were visually reviewed.
- The final Atlas browser rerun passed in 2.9 minutes after journal refinements. It additionally exercised an actual puzzle at 390-pixel width, verified geometry disposal on all four region transitions, checked the final journal opens on the current region, and confirmed only one travel button appears for another region. The story ending remains available to reread.
- Final production build and typecheck passed. Initial client JavaScript: 1,512.61 kB / 446.82 kB gzip. Vite retains its existing large-chunk warning. Log: ignored `artifacts/atlas-final-build.log`.
- Compiled production smoke passed with process exit 0: local assets, guest progression and two-human arena connections. It still logs the existing unregistered snapshot-message warning. A first PowerShell logging pipeline returned a nonzero wrapper status due to stderr; direct execution confirmed the successful process exit.
- Local client and API health endpoints both returned HTTP 200.
- The first regional regression pass found the Havenreach tablet base overlapping an older trail. The bases were moved beside the routes; an added regression sweeps a 0.9-metre corridor along every old and new trail in all four regions. All 27 targeted layout tests passed after correction. The final eight-journey browser run passed Atlas, Canyon, Havenreach, Moonfrost, first-player flow, Whisperleaf and Rally (seven passes in 14.6 minutes). Conservancy stopped during battle setup when an action arrived before the server allowed it. Log: ignored `artifacts/atlas-final-browser.log`.
- Conservancy then passed its complete journey in 3.9 minutes: gathering, crafting, dismantling, all four habitat restorations, mobile layout, companion awards and persistence after reload. Its fixture now retries only the server's pre-mutation early-action rejection, with a strict bound; all other errors still fail immediately. A separate isolated attempt timed out loading the title page, so navigation has a 60-second allowance while interaction assertions remain at 15 seconds. No gameplay timing rule was changed. Final fixture typecheck passed. Log: ignored `artifacts/atlas-conservancy-final.log`.
- All eight browser journeys therefore passed across the final regression run and targeted Conservancy rerun. Refreshed Meadow and Hollow guide screenshots were visually reviewed. The ignored player database remains present and was not replaced.

## Limits and next work

This update adds story destinations and paths inside current region boundaries. Archives have no interiors and archivists reuse existing avatar bodies. The story has a fixed ending and written glyph puzzles; daily readings are personal saved activities, not shared live events. Public accounts/hosting, authoritative shared-world movement, subjective audio quality, physical-device ergonomics and long-term balance remain outside verification. See `KNOWN_ISSUES.md`.

Useful next work: walkable interiors, field encounters that use companion abilities, deeper story choices, and balance/playtesting of the accumulated daily rewards. Earlier handoffs are archived in `docs/DEVELOPMENT_HISTORY.md`.

Including this handoff, the Atlas update contains **17 commits after `d39ee0c`**: 16 implementation, art, testing and documentation commits made during this work, plus the separately committed `01be14f` documentation update. Remote `main` was verified at `01be14f` on October 14; the final three commits (trail clearance, fixture reliability and this handoff) remain local. No push or deployment was performed by this continuation: the original user handoff requires a separate explicit request to push. The player's ignored save remains preserved.
