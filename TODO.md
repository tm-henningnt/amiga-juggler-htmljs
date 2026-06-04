# TODO

## Completed Foundations

- Reference screen anchors and physical cascade constants are committed in `src/motion-data.ts`.
- Reconstructed ball positions now use a Meatfighter-inspired ballistic cascade so the balls clear the body/head and each other in 3D.
- Reconstructed juggler motion now includes Meatfighter-inspired hips, torso, head, eyes, hair, legs, shoulders, and IK arms.
- Motion diagnostics now report ball/body clearance, ball/ball spacing, and hand-contact error.
- Frame-range rendering/export is implemented with absolute output-frame metadata.
- Named camera and source-cycle presets are available for inspecting historical motion phases.
- Source-frame labels now identify major cycle phases such as apex, left catch, and right catch.
- Animation frames now carry ball, wrist, clearance, camera, render-stat, and source-frame metadata.
- Animation JSON manifest export is available from the standalone browser UI.
- Render profiles now expose source-like, modern, and source-quirk mode indicators in the UI.
- Realtime wireframe and solid preview modes are available alongside the raytrace view.
- Preview mode supports mouse orbit, wheel zoom, camera height adjustment, group picking, and session-only group transforms.
- Display constraints now include RGB, OCS 12-bit, Extra Half-Brite-style 64-color, and approximate HAM6 modes.
- CPU rendering now has BVH sphere acceleration, tile/time-budget rendering for line-order-safe modes, and expanded render stats.
- CRT emulation now cycles between off, scanline, slot-mask, and soft-glow modes.
- Tests now cover physical cascade anchors, animated body pose, planted feet, body clearance, ball spacing, hand contact, motion metadata, JSON manifests, frame-range rendering, presets, phase labels, and unsupported-scene fallback.

## Historical Accuracy

- Decode or document the `movie.data` and `movie2.data` compressed HAM movie formats.
- Extract the full 24-frame historical movie sequence into a committed test/reference fixture if licensing and bundle size remain acceptable.
- Continue fitting the reconstructed juggling motion frame-by-frame against the historical frames.
- Continue refining robot body pose, hand timing, and ball arcs until key frames match the source output more closely.
- Add a side-by-side or overlay comparison mode for rendered frames versus historical reference frames.
- Preserve evidence for every source-truth decision in code comments or documentation.

## Rendering

- Continue validating camera setup, sphere hierarchy, material IDs, lighting, and reflections against known original frames.
- Add anti-aliasing as an optional modern mode while keeping source-like output available.
- Add Web Worker rendering for background progressive stills and live raytraced interaction.
- Add optional higher-quality shadows, area lights, depth of field, and motion blur as non-source modes.
- Investigate a WASM or direct C-port path for stricter renderer parity.

## Animation

- Use structured manifests to drive future source-frame comparison and motion-fitting tools.
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
