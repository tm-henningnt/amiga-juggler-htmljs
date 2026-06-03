# TODO

## Historical Accuracy

- Decode or document the `movie.data` and `movie2.data` compressed HAM movie formats.
- Extract the full 24-frame historical movie sequence into a test/reference fixture.
- Fit the reconstructed juggling motion frame-by-frame against the historical frames.
- Refine robot body pose, hand timing, and ball arcs until key frames match the source output more closely.
- Add a side-by-side or overlay comparison mode for rendered frames versus historical reference frames.
- Preserve evidence for every source-truth decision in code comments or documentation.

## Rendering

- Continue validating camera setup, sphere hierarchy, material IDs, lighting, and reflections against known original frames.
- Add anti-aliasing as an optional modern mode while keeping source-like output available.
- Improve performance with tiling, spatial acceleration, or Web Workers.
- Add optional higher-quality shadows, area lights, depth of field, and motion blur as non-source modes.
- Investigate a WASM or direct C-port path for stricter renderer parity.

## Animation

- Add named camera presets that reproduce useful historical inspection angles.
- Support frame-range rendering and export.
- Add clearer per-frame metadata: source frame, camera pose, render profile, elapsed render time, and motion mode.
- Add GIF export if a browser-compatible encoder is introduced.
- Add batch PNG export packaging once archive/zip support is added.

## Scene And Data Formats

- Keep supporting original `.dat` files.
- Define a future JSON scene format for explicit geometry, materials, lamps, cameras, and animation tracks.
- Add import/export tools for reconstructed motion keyframes.
- Add validation errors that explain malformed scene or motion data.

## UI

- Add material and lighting inspection controls without making source-like defaults ambiguous.
- Add camera position/target editing for exact pose work.
- Add small visual indicators for source-like versus modern render modes.
- Improve progress reporting for long animation renders.
- Keep the standalone file-load workflow intact.

## Validation Targets

- Match a known original Juggler frame visually at 320 x 200.
- Render a 24-frame juggling cycle without crashes.
- Render a 360-frame orbit animation without crashes.
- Export browser-supported WebM successfully.
- Keep `npm test` passing after every source change.
- Keep `npm run build:single` producing a file-loadable `index.html`.

## Longer-Term Research

- WebGPU renderer.
- Full forensic port of the original Amiga/C/BASIC render path.
- Original HAM movie decoder in TypeScript.
- Data-driven reconstruction of the original animation pipeline.
- Additional historical scenes and comparison pages.
