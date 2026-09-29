# Known limits and remaining work

## Presentation

- The 60 species have distinct procedural recipes and complete gameplay mappings, but some anatomical details are stylized approximations. They are not sixty individually sculpted, production-finished character assets. Further silhouette and material work would improve resemblance to every authored description.
- Regions share a compact island layout with different palettes, vegetation, encounter rosters, and guardians. Bespoke canyon geography, reflective ice, denser village life, and longer region stories remain future work.
- Creature family rigs support the requested states. Recruitment uses portrait-card reveals rather than a full staged 3D entrance for every species. Greet/victory responses and keeper gestures are intentionally simple.
- The battle effect system is bounded and includes ten distinct mythic recipes. Delayed outcomes are authoritative and telegraphed, but their presentation is attached to the round transition rather than a separate cinematic sequence. Further support-skill choreography would make multi-target healing and protection clearer.
- Music and voices are original Web Audio synthesis. Playback, settings and voice limits are checked programmatically; a subjective headphone/speaker listening pass has not been performed. Musical mixing and voice personality should be refined through listening before describing the sound as finished.
- The client is a substantial WebGL bundle. Graphics presets reduce decorative work, but laptop/GPU performance varies and no universal frame-rate claim is made. Mobile movement controls are not included.

## Systems and scope

- Guest tokens are local development authentication. There is no account recovery, public hosting, global matchmaking population, chat, trading, or shared exploration world.
- Finished matches, progress and currencies are durable. Active matches remain in memory and are canceled if the server restarts, without competitive rating changes.
- A wild bond is offered after eligible victories at a fixed displayed 80% chance. There is no mid-battle capture or remaining-HP-dependent bonding model yet.
- Quests teach the core loop with concise text and a tracker. There is no branching dialogue system or fully authored 15–30 minute narrative campaign.
- The first version needs wider balance testing, especially high-rarity status combinations and long-term recruitment progression. Automated rules tests establish behavior, not competitive balance.

See [PROGRESS.md](PROGRESS.md) for the exact automated and visual verification completed. The next useful pass is listening review, individual species/animation refinement, and more varied region geography rather than adding another menu or currency.
