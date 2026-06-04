# TODO

## Completed Foundations

- Source-ray motion anchors are committed in `src/motion-data.ts`.
- Reconstructed ball positions now preserve source-frame projection while clearing the robot body/head in 3D.
- Motion diagnostics now report ball/body clearance and hand-contact error.
- Frame-range rendering/export is implemented with absolute output-frame metadata.
- Named camera and source-cycle presets are available for inspecting historical motion phases.
- Source-frame labels now identify major cycle phases such as apex, left catch, and right catch.
- Render profiles now expose source-like, modern, and source-quirk mode indicators in the UI.
- Tests now cover projection preservation, body clearance, hand contact, motion metadata, frame-range rendering, presets, phase labels, and unsupported-scene fallback.

## Historical Accuracy

- Decode or document the `movie.data` and `movie2.data` compressed HAM movie formats.
- Extract the full 24-frame historical movie sequence into a committed test/reference fixture if licensing and bundle size remain acceptable.
- Continue fitting the reconstructed juggling motion frame-by-frame against the historical frames.
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

- Add richer per-frame inspection/export metadata once a structured manifest format is added.
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

## Ideas
- Realtime preview / wireframe / solid rendering modes.
- Mouse controlled camera placement / scene rotation
- Mouse controlled object placement
- Interactive mode with real-time rendering and free form movement
