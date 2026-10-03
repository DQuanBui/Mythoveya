# Known limits and remaining work

## Presentation

- The 60 species have distinct procedural recipes and complete gameplay mappings, but some anatomical details are stylized approximations. They are not sixty individually sculpted, production-finished character assets. Further silhouette and material work would improve resemblance to every authored description.
- Havenreach now reaches a beach and a climbable mountain range with real ground height. Only Havenreach has elevation. The other regions keep their compact layouts and shared service stations, and longer regional stories remain future work.
- The six visitor-book houses have clickable porch visits and durable rewards. The nine village cottages, windmill, and well are decorative. Walkable interiors and house ownership are not implemented. Islanders follow simple day/night routines, and their greetings do not affect progress.
- Click-to-walk plans routes on a half-metre grid over the same collision rules as keyboard movement. Very narrow gaps can still make the keeper stop early; the walk then interacts if the target is within easy reach, or simply ends.
- Story chapters are fought with the existing battle system and roster; there are no chapter cutscenes or new creature models for bosses. Stage difficulty was calibrated with simulated auto-battles of the starter team, not with human playtesting. Chapter and dungeon battles do not offer wild bond attempts.
- Equipment has three slots and four rarities with fixed stat lines; there are no sets, random sub-stats, or trading. Equipment and skill levels deliberately do not apply in Tactical Arena.
- Habitat creatures provide ambient movement and calls using the existing roster. They are not new species or additional combat encounter types. The current wild-battle and bonding rules still apply through Ranger Tali and the existing encounter service.
- Creature family rigs support the requested states. Recruitment now has a staged 3D shrine entrance for every species; species-specific choreography, greet/victory responses, and keeper gestures remain simple.
- The battle effect system is bounded and includes ten distinct mythic recipes. Delayed outcomes are authoritative and telegraphed, but their presentation is attached to the round transition rather than a separate cinematic sequence. Further support-skill choreography would make multi-target healing and protection clearer.
- Music and voices are original Web Audio synthesis. Playback, settings and voice limits are checked programmatically; a subjective headphone/speaker listening pass has not been performed. Musical mixing and voice personality should be refined through listening before describing the sound as finished.
- The client is a substantial WebGL bundle. Graphics presets reduce decorative work, but laptop/GPU performance varies and no universal frame-rate claim is made. Exploration now includes a responsive mobile HUD and touch joystick; physical-device ergonomics and the full battle interface still need broader mobile review.

## Islands and the festival

- Festival multiplayer is asynchronous: you compete on shared leaderboards and race recorded ghosts of the day's best runs. There are no live minigame rooms or chat, and other keepers' home islands can't be visited.
- Festival games run on a daily seed, so every keeper plays the same course, and the server rescores each run from its recorded inputs. That stops edited scores and impossibly fast runs. It can't stop a perfectly scripted input sequence that takes at least the real game time.
- The lantern hunt trusts the client about where you are when you collect a lantern, as with Skyglass caches. Only today's lantern ids are accepted, once each.
- The ticket rewards, shop prices, habitat Gold rates and house costs were chosen by calculation and simulated runs, not long-term playtesting.
- There are four keeper outfits and three festival companion accessories. The wardrobe previews outfits on your keeper; companion accessories are previewed only once equipped.
- Island scenes reuse the Havenreach weather, and only Havenreach has wild encounters, regions and villagers. The islands are optional side content.

## Systems and scope

- Guest tokens are local development authentication. There is no account recovery, public hosting, global matchmaking population, chat, trading, or shared exploration world.
- Finished matches, progress and currencies are durable. Active matches remain in memory and are canceled if the server restarts, without competitive rating changes.
- A wild bond is offered after eligible victories at a fixed displayed 80% chance. There is no mid-battle capture or remaining-HP-dependent bonding model yet.
- Villagers offer 24 selectable conversation topics and 16 persistent missions. Dialogue choices reveal authored replies but do not change story outcomes. A longer branching campaign, expanded gathering materials and guided help overlays remain future work.
- Village helpers provide daily gifts. Autonomous harvesting, encounter-rate bonuses, purchasable abilities, craftable potions, and dusk-only tracking are not implemented. The weekly challenge rewards victories over existing region guardians; it does not yet introduce a rotating exclusive boss.
- The existing six-creature teams, eight elements, three actions, currency names, and server-owned saves remain intact. The brief's alternative 3v3 rules, five elements, four moves, renamed currencies, and manual local-storage imports have not replaced them.
- The first version needs wider balance testing, especially high-rarity status combinations and long-term recruitment progression. Automated rules tests establish behavior, not competitive balance.

See [PROGRESS.md](PROGRESS.md) for the exact automated and visual verification completed, and [the upgrade review](docs/UPGRADE_REVIEW.md) for proposed changes that affect existing combat and save rules.
