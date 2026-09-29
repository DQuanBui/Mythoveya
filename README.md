# Mythoveya: Call of the Wildbound

**Find your wild. Forge your six.**

Become a Riftkeeper in a world of floating islands, forgotten waystones, and extraordinary companions. Begin in Havenreach, choose the creature that speaks to you, and build a team of six Wildbound. Explore the reaches, discover new species, face their guardians, and challenge another keeper in the Rift Arena.

Mythoveya is a locally playable, browser-based 3D creature-collection RPG. Its world, characters, portraits, music, and effects are created from assets and recipes included in this project. Once installed, it plays without third-party asset downloads or an online service.

## The game

- **60 Wildbound:** ten species in each rarity from E to S, eight elements, twelve body families, 180 actions, and 60 passives.
- **Eight keepers:** choose a recognizable character and change your appearance later without losing progress.
- **Your own six:** three front slots and three rear slots, with drag-and-drop or click-to-place formation editing.
- **Four destinations:** Havenreach, Whisperleaf Meadow, Emberglass Canyon, and Moonfrost Hollow, with resources, roaming encounters, and enhanced region guardians.
- **Tactical battles:** elemental advantages, energy, cooldowns, shields, healing, status effects, delayed attacks, revivals, and a visible turn queue. Manual and automatic controls are available in PvE.
- **A growing collection:** recruit with earned diamonds, bond with wild creatures, train companions, collect shards, and claim story and daily rewards.
- **Human arena battles:** friendly room codes and ranked matchmaking, separate Power and Tactical ratings, authoritative turns, and reconnect support.
- **A living presentation:** articulated creatures and keepers, model-rendered portraits, eight synthesized music arrangements, elemental effects, species voices, and ten mythic ultimate recipes.
- **Saved adventures:** SQLite stores profiles, formations, inventory, currency, pity counters, quests, completed results, and competitive ratings.

This first playable version uses a compact procedural art style. See [KNOWN_ISSUES.md](KNOWN_ISSUES.md) for presentation and scope limits, and [PROGRESS.md](PROGRESS.md) for the verification record.

## Install and play

Tested on **Windows, Node.js 24.19.0, npm 11.17.0**. Use Node 24 LTS. Python, Docker, an external database, and API keys are not needed to play.

Open a terminal in this folder:

```powershell
npm install
npm run dev
```

Open **http://127.0.0.1:5173/**. Keep the terminal open while playing. The command starts the game client and local server together; press **Ctrl+C** to stop them.

The default server address is `http://127.0.0.1:2567`. Both services bind to localhost. If a port is occupied, choose another pair before launching:

```powershell
$env:CLIENT_PORT="5175"
$env:SERVER_PORT="2569"
npm run dev
```

The terminal prints the selected game URL. Close that terminal or remove the environment variables to return to the defaults.

For a compiled local build:

```powershell
npm run build
npm start
```

Open **http://127.0.0.1:2567/** for the compiled build. This command serves the built game and its backend from one port. The development asset gallery is omitted from the compiled interface.

## Your first five minutes

1. Select **Begin your journey**, enter your keeper name, and choose an avatar.
2. Choose **Emberfox**, **Ripplefin**, or **Thornhare** as your starter.
3. Walk toward **Warden Liora** and press **E**. Accept Cindermite, Puddlepip, Mossprig, Pebblit, and Zippinch to complete your first six.
4. Approach the **Wild encounter** marker. Use basic attacks freely; skills cost 2 energy and ultimates cost 5. Front companions protect the rear slot behind them. PvE **Auto** and **Fast** controls are optional.
5. After winning, open **Quests** and claim your 600-diamond tutorial reward. Visit **Recruit**, make a bond, and open **Team** to save your formation.

Training costs 50 gold and stores creature XP even when the account-level cap prevents an immediate level. Three species shards purchase a 2% stat upgrade, up to five upgrades. Tactical Arena ignores these shard bonuses. Stars mark favorites; there is no selling or creature deletion.

Win more encounters to open the canyon and hollow. Each region guardian has an enhanced roster model; first-time guardian victories grant a configured A-tier companion. Boss variants are not extra collectible species.

## Controls and comfort

| Control | Action |
| --- | --- |
| WASD or arrow keys | Move your keeper |
| Mouse drag | Rotate the camera |
| Mouse wheel | Zoom |
| E | Interact with the nearest marked object |
| Esc | Open pause menu or close a panel |
| Heart beside the party | Greet your following companion |
| Click a battle model or target selector | Choose an ability target |

Use **Sound & settings** on the title screen or the settings button in the world. Master, Music, Sound effects, Ambience, and Creature voices each have their own slider. Mute, reduced motion, camera shake, and graphics quality are saved in the browser. Audio starts after a deliberate click; use **Play sound test** to resume a suspended browser audio context. Background audio suspends when the tab is hidden.

Low quality reduces decorative scenery and particles. Quality changes take full effect on the next scene entry. Desktop keyboard-and-mouse play is supported; touch movement controls are not included.

## Play against another keeper

Keep the server running. Open the game in a second browser profile or a private window; regular tabs share the same guest token and therefore the same keeper.

1. Give both keepers a full team of six.
2. Open **Arena** and choose **Power Arena** or **Tactical Arena**.
3. For a friendly match, select **Create friendly room**, copy its code into the second session, and select **Join room**. Both keepers select **Ready to battle**.
4. For a ranked match, have both sessions select **Find ranked opponent** in the same mode.

Power Arena uses earned levels and upgrades. Tactical Arena normalizes stat budgets by role and uses level 10 stats. Each mode has a separate rating, starting at 1000 after the first ranked result. Friendly rooms and computer practice never change competitive ratings. Every third completed ranked match grants 50 diamonds.

Each PvP decision allows 20 seconds after the shared presentation window. A timeout chooses a legal basic attack; three consecutive missed decisions forfeit the match. A dropped connection has a 30-second reconnection allowance. Refreshing can reconnect to an active room. A server restart cancels unfinished matches without rating changes; completed results remain saved.

Two local sessions demonstrate real multiplayer. Cross-internet play requires a reachable backend and a separate production hosting/account design. This project does not deploy a public service.

## Recruitment and daily adventures

A single bond costs 100 diamonds; ten cost 1,000 and require confirmation. Base rarity rates are E 30%, D 30%, C 22%, B 12%, A 5%, and S 1%, with equal selection among the ten species in each tier.

After 29 pulls without A/S, the next pull guarantees A or S at normalized 5:1 weights. After 89 without S, the next pull guarantees S. S takes priority when both guarantees coincide and resets both counters. Ten-pulls resolve in order. Duplicate requests cannot spend or grant twice; duplicate creatures become species shards.

Daily objectives reset at **00:00 UTC using server time**: win three PvE battles, train once, and gather three resources. Completing all three unlocks a 100-diamond chest. Selected encounters offer one bond-token attempt at an encountered E–C creature; the displayed chance comes from the server and the attempt cannot be retried by reloading.

## Saves, backup, and test profiles

The default save is **`data/mythoveya.sqlite`**. The browser stores an opaque session token under `mythoveya-session`; the server owns the profile ID and all gameplay state. This is local guest authentication, without password recovery.

To back up progress, stop the server with Ctrl+C and copy the entire `data` folder to a safe location. Keep the original browser profile, or privately back up its `mythoveya-session` local-storage value as well. That value grants access to your local keeper and should not be shared. Restore the folder with the server stopped.

To start an independent test keeper, use a private window. To intentionally begin a new keeper in the current browser, remove only `mythoveya-session` from that site's browser storage and reload. The previous profile remains in SQLite; retain its token if you want to return. To start a completely separate save database, set `DB_PATH` before launch:

```powershell
$env:DB_PATH="data/sandbox.sqlite"
npm run dev
```

The app requires the server for profile creation, saves, progression, recruitment, battles, and rankings. Audio and graphics settings are browser-local. Saves and tokens are excluded from Git.

## Tests and development

```powershell
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run content:audit
```

The Playwright browser download is a one-time installation. Browser checks use ports **5174/2568** and a separate **`data/browser-tests.sqlite`** database. Network tests start an isolated server on port **27861** with a temporary database. They can take several minutes because ranked battles respect real presentation windows. Screenshots are written to `artifacts`; Playwright videos and failure traces are in `test-results`.

In `npm run dev`, press **Esc → Asset gallery** to inspect species, keeper models, animation states, voices, and skills without granting inventory or changing rankings. Search for a mythic species and select **Preview ultimate**. This is the primary read-only rare-content inspection tool.

| Folder | Purpose |
| --- | --- |
| `apps/client/src` | World, characters, interface, presentation, audio |
| `apps/server` | Authenticated operations, SQLite, authoritative battles and rooms |
| `packages/shared` | Stable roster data, combat rules, economy and sound recipes |
| `tests` | Content, economy, combat, network and browser verification |
| `docs` | Content matrix, audio manifest and presentation guide |

Add or balance creatures in `packages/shared/roster.json` and `content.ts`; avatars and regions also live in `content.ts`. Economy curves and pity rules live in `economy.ts`. Server reward and quest configuration lives in `apps/server/game.ts`. Keep species IDs stable to preserve existing collections.

Next development priorities are individual creature-art refinement, richer region layouts and stories, deeper balance playtesting, and a dedicated listening pass on the synthesized score. Longer-term ideas include evolution, sanctuaries, cooperative guardians, and additional chapters.
