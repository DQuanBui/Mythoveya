# Presentation guide

## Visual language

Deep navy panels frame ivory type, teal interaction details, and restrained gold borders. World colors favor muted greens, weathered stone, and warm highlights. Havenreach and the meadow use soft vegetation; the canyon uses red stone and luminous crystal; the hollow uses pale ground and icy foliage. A single companion follows the keeper.

The procedural factory assembles twelve body families: quadruped, fox/canine, bird, serpent, shell, insect, amphibian, spirit, golem, dragon, aquatic, and antler. Species recipes add stable proportions, colors, markings, appendages and features derived from their authored descriptions. These are compact stylized models, not imported skeletal assets.

All portraits use the same model factory and one 192×192 offscreen renderer. Image URLs are cached by species for the browser session. The content matrix's `model-render:` mapping identifies this factory rather than a missing image file. Portraits do not create one WebGL canvas per card.

## Animation

The family rig exposes articulated limbs, wings, and tails. `animateCreature` handles idle, locomotion/hover, attack, active cast, ultimate cast, hit, defeat, entrance, victory, guard, and controlled states. Time comes from the render clock, rather than frame counts. Locomotion alternates legs, flaps wings, ripples serpent segments, or undulates fins. The human factory shares limb articulation and supplies clothing, skin, hair, and accessory differences.

The game drives idle/walk, attack/cast/ultimate, hit, and defeat in context. The companion's greet action uses a small victory-like bounce and a species call. The gallery can independently inspect every state. Some specialized entrances and victory poses remain simplified; see known issues.

Recruitment presents the selected Wildbound on a 3D shrine platform with an eased entrance, living pose, orbiting motes, and warm accents for A/S tiers. Each result card selects that species for the stage. Reduced motion presents the model immediately without the entrance spin. The gallery's paused effect timeline permits inspection of anticipation, impact, and recovery at a repeatable phase.

## Effects and timing

Server action events contain monotonic IDs, action/target identifiers, outcomes, timestamps, and bounded presentation durations. Basic/skill/ultimate windows are 700/1,200/2,200 ms; fast PvE uses 220 ms. PvP decisions start after the same server-defined window for both players. Presentation never computes rewards or damage.

The client deduplicates impact sounds by event ID and skips expired presentation on reconnect. HP deltas are held during anticipation and shown at the impact phase. Status labels include round durations, shields show numeric values, and delayed attacks appear in the battle log with a warning on the target.

Element recipes use warm ember motes, water ripples, leaf/vine forms, stone fragments, electric lines, ice shards, golden halos, and dark rings. Decorative counts are bounded; geometry is reused by the mounted effect component instead of accumulating scene objects.

The ten mythic compositions are: Solkarath's six-point sun crown; Thaloryx's broad water halo; Everbloom's radial root lattice; Orogantis's stone barricade; Zephyreon's rising storm eye; Iskavelle's crystal crown; Aurelith's golden feather fan; Nyxavorn's dark gate; Pelagryth's three expanding waves; and Vortalyx's open cyclone coils. Their short sound motifs vary by interval pattern and register. Tactical controls remain visible during these sequences.

## Audio buses and recipes

Master feeds a dynamics compressor. Music, SFX, Ambience, and Creature Voices have independent gain nodes. Preferences persist in `mythoveya-settings`. Audio starts after a deliberate gesture and suspends when the document is hidden.

Eight arrangements share a small original harmonic vocabulary while varying tempo, register, melody, oscillator choice, rhythmic density and bass percussion. Each complete cycle lasts 45–90 seconds. Scene transitions fade between music gain nodes; a single scheduler prevents duplicate music loops. Stingers duck the music bus, then restore its configured gain.

The manifest contains more than thirty distinct cue recipes: menu states, three surfaces, interaction, gathering, quest rewards, recruitment, swings/launches/impacts, shields, healing, status, defeat, all eight elements, victory, leveling, rare recruitment, pet response and ambient textures. Each recipe specifies waveform, frequency envelope, duration, noise blend, and harmony. All 60 species map call, attack and hurt variants to their family and species envelope. Lower voices accompany large guardians; smaller creatures use restrained chirps.

Sources stop after finite envelopes, disconnect on completion, and share a 40-voice cap. Repeated UI cues have a short debounce. Spatial panning is reserved for nearby world sounds; battle feedback is kept centered. No generated waveform is fetched from an outside server.

## Settings and review

Village characters reuse the eight keeper rigs with idle motion and small nearby speech labels. Their directory uses lightweight illustrated initials; only the selected conversation opens a 3D portrait. The market and garden use local procedural geometry, and garden growth follows the saved planting timestamp. Equipped ribbons and bells attach to the following companion's animated rig. The exploration renderer pauses behind panels and resumes its movement timers when the panel closes.

Reduced motion suppresses decorative animation and camera effects without affecting combat. Camera shake is optional and restrained. Graphics presets cap pixel ratio and reduce vegetation and effect density while keeping targeting information.

The development gallery is read-only: choose a species or avatar, rotate the model, pause, change its animation state, preview skills, and test the three vocalizations. Browser checks capture representative families, all keepers, and all mythic effects. The precise automated/visual/listening evidence is recorded in `PROGRESS.md`; browser playback checks do not establish subjective audio quality.
