# Art and sound sources

## Project assets

- `apps/client/src/models.ts`: original procedural Wildbound and keeper geometry, materials, articulated limbs, and animation recipes.
- `apps/client/src/Scene.tsx`: original floating-island scenery, buildings, ruins, vegetation, crystals, world markers, and battle presentation.
- `apps/client/src/UltimateEffects.tsx`: ten original mythic effect compositions.
- `apps/client/public/emblem.svg`: original six-point bond emblem.
- Collection portraits are rendered from those same Three.js creature models by one on-demand renderer, then cached for the session. They are not hotlinked pictures or separate concept art.
- `packages/shared/audio-content.ts`: original oscillator, envelope, chord, melody, percussion, and noise recipes. `apps/client/src/audio.ts` synthesizes them locally. No sampled commercial music, outside voice recordings, or paid audio service is used.
- Typography uses locally available system fonts: Segoe UI, Arial, Georgia, and Times New Roman. Font files are not redistributed.
- Interface symbols use Unicode and the original emblem. No external icon pack is required.

The original project assets are included with the project for its owner's use and development. No claim of trademark exclusivity is made for the proposed Mythoveya name.

## Libraries

React, React DOM, Three.js, React Three Fiber, Drei, Colyseus, Express, Zod, Vite, TypeScript, Vitest, Playwright, and supporting packages retain their respective upstream licenses. Their license files are distributed in installed packages; exact versions and dependency resolutions are in `package-lock.json`. They are not proprietary character or art sources.

See `docs/AUDIO_MANIFEST.json` for every arrangement and cue, and `docs/CONTENT_MATRIX.csv` for per-species visual, animation, voice, passive, and action mappings.
