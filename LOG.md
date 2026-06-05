# Development Log

This document chronicles the rebuild of the Amiga Juggler HTML/JS project from a one-shot browser prototype into a structured, source-aware raytracer and animation tool.

## 2026-06-03: Source Discovery And Direction

The work began by reading `the-juggler.prd`, inspecting the existing one-shot `index.html`, and following the PRD back to the original source archive:

https://github.com/AlphaPixel/Eric-Graham-1987-Juggler-Raytracer-1.0

The first investigation established the project direction:

- Preserve the original Eric Graham scene data where possible.
- Replace the one-shot implementation with a maintainable TypeScript architecture.
- Keep the output capable of compiling to a single standalone `index.html`.
- Avoid a backend or server requirement.
- Treat historical accuracy as more important than adding modern rendering features too early.

The original archive and Ernie Wright notes showed that `robot.dat`, `ele.dat`, and `dragon.dat` are static scene descriptions. They contain camera, sphere group, material, lamp, sky, and ground data, but no embedded animation or camera path tracks.

## Architecture Rebuild

The first implementation pass replaced the ad hoc browser code with a small TypeScript codebase built around namespaces and a single-file output pipeline.

Major pieces added:

- Shared render and scene contracts in `src/types.ts`.
- Vector math helpers in `src/math.ts`.
- Original `.dat` scene parsing in `src/parser.ts`.
- Scene expansion and observer/camera setup in `src/scenes.ts`.
- CPU raytracing in `src/renderer.ts`.
- Source-like HAM output in `src/ham.ts`.
- Render profiles in `src/profiles.ts`.
- Browser UI and render loop in `src/app.ts`.
- A standalone build script in `scripts/build-single.mjs`.
- TypeScript config for app and tests.

The original scene text files were also preserved under `src/original/` and embedded in `src/original-data.ts` so the standalone bundle can load them without fetching external files.

## Parser And Renderer Baseline

The parser was built to read the original scene grammar, including:

- Observer position.
- Altitude, azimuth, and focal length.
- Sphere groups and interpolation counts.
- Surface/material type normalization.
- Lamps.
- Ground, sky, and ambient illumination vectors.

The renderer then implemented:

- Primary camera rays.
- Sphere intersections.
- Ground plane intersections.
- Checkerboard floor selection.
- Sky gradient.
- Diffuse lighting.
- Shadows.
- Bright-sphere glints.
- Recursive mirror reflections.
- Source-like HAM quantization.

Tests were added to lock down the original robot scene expansion. One important baseline was that `robot.dat` expands to 70 renderable spheres.

## Rendering Corrections

After comparing browser screenshots with reference images in `tmp/`, the sphere rendering was corrected. The most important finding was that the source reflection path had a quirk that made the juggling balls render too dark in the modern reconstruction.

Render profiles were split so each behavior is explicit:

- `reference`: source-like HAM output with standard reflection.
- `wright-rgb`: modern RGB output with standard reflection.
- `source-quirk`: source-like HAM output with the original reflection quirk preserved for study.

This made the mirror balls read correctly while still keeping the historically interesting source behavior available.

## Camera Animation And Export

Animation support was then added around camera paths and frame queues.

Implemented camera paths:

- Static `.dat` camera.
- 360 degree orbit.
- Orbit arc.
- Dolly.
- Custom JSON keyframes.

Implemented animation tooling:

- Frame count and FPS controls.
- Progressive frame rendering.
- Timeline scrubbing.
- Play, pause, and stop controls.
- PNG frame export.
- Browser-supported WebM and MP4 export through `MediaRecorder`.

This established the rendering pipeline needed for animation, but initially only the camera moved. The robot and balls remained a static scene.

## Finding The Real Juggler Motion

The next investigation focused on whether the actual juggling motion existed in the source data.

Findings:

- The `.dat` files are static and contain no motion tracks.
- `movie.data` and `movie2.data` are compressed rendered movie frame payloads.
- The movie headers indicate a 24-frame, 320 x 200 source sequence.
- The original archive contains historical movie output, not reusable parametric animation data.
- The `ssg` executable appears related to scene generation, but its source and motion input data are not present in the archive.

This shifted the animation work from "parse hidden motion" to "reconstruct source-like motion from historical output."

## Reconstructed Juggling Motion

A new `Juggler.Motion` namespace was added in `src/motion.ts`.

The first pass introduced:

- `SceneMotionId` and `SceneMotionSettings`.
- Static motion mode.
- Reconstructed 24-frame juggling mode.
- Per-frame world resolution before rendering.
- Ball-group motion for the three mirror spheres.
- Arm pose updates so the robot reads as juggling rather than standing still.
- Motion metadata on rendered frames.
- UI controls for motion mode and source frame.

The animation renderer now resolves both:

- Camera pose for each output frame.
- Scene world for each output frame.

That made it possible to render the robot actually juggling the spheres, not just orbit a static pose.

## Frame Analysis Tooling

Later work added local analysis scripts:

- `scripts/probe-frames.py` inspects frame dimensions, visible content, and sampled colors.
- `scripts/analyze-frames.py` detects juggling balls in 24 reference frames, back-projects them into approximate 3D positions, and emits candidate motion paths.

These scripts use local `tmp/frames` material and OpenCV. The generated frame/debug material stays ignored in `tmp/`.

The resulting committed motion path moved from rough hand-authored positions to a more source-fitted 24-entry `BALL_PATH`, with group offsets of `0`, `8`, and `16` for the three balls.

## Workbench 1.3 Inspired UI

The UI was later restyled around a Commodore Amiga Workbench 1.3 direction.

Changes included:

- Workbench-like screen bar.
- Window title bars and gadgets.
- A retro palette and pixel-oriented typography.
- CRT scanline toggle.
- Reworked control layout.
- Smaller, more period-appropriate labels and controls.

The GUI was then made collapsible so dense camera, animation, and source panels do not dominate the render stage.

## Documentation And Repository Setup

The original PRD was converted into `TODO.md`, and a full `README.md` was written.

The README now documents:

- Current project status.
- Source material.
- The source-truth note that the original `.dat` files are static.
- How to run, test, and build.
- Module architecture.
- Manual verification steps.
- Attribution expectations.

The TODO now tracks:

- Historical movie decoding.
- Motion fitting.
- Renderer parity.
- Animation/export improvements.
- Future scene and JSON data formats.
- Longer-term WebGPU/WASM research.

The initial rebuild was committed and pushed as:

- `2e94a6e feat: rebuild juggler raytracer`

Subsequent commits visible in history:

- `b86e16f workbench 1.3 inspired gui`
- `1765530 made the gui collapsible`
- `16441fe reconstructed juggle motion`

## Verification Record

Checks run during development:

```bash
npm test
npm run build:single
```

Browser smoke verification opened the generated `index.html` directly from disk in Chrome and confirmed:

- Classic Source rendered a nonblank 320 x 200 source-like worker frame.
- Modern Studio switched to Live Raytrace with modern indicators and Live FX caps.
- Reference Compare overlay and side-by-side modes loaded embedded PNG data URLs and tracked source-frame labels.
- Live Raytrace completed a nonblank live frame and updated live telemetry.
- Live playback advanced reconstructed source frames and reported skipped stale frames.
- A two-frame low-resolution buffered animation completed and updated animation telemetry/reference sync.
- No runtime errors appeared in the console; the only warning came from verification-time canvas readbacks.

Browser smoke checks included:

- Opening `index.html` directly from disk.
- Rendering the default robot scene.
- Rendering a short animation sequence.
- Confirming frames were nonblank.
- Confirming source-frame metadata advanced during motion playback.
- Confirming browser-supported video export controls appeared.

## Current State

The project currently supports:

- File-loadable standalone `index.html`.
- Original scene data loading.
- Source-like and modern render profiles.
- Static and camera-path animation.
- Reconstructed source-frame juggling motion.
- Workbench 1.3 inspired browser UI.
- Tests for parser, expansion, rendering basics, profiles, camera paths, motion, animation queueing, and HAM encoding.

At the time this log was written, the working tree also contained uncommitted refinements to `src/motion.ts` and the generated `index.html` around arm throw timing. Those changes were left untouched while creating this document.

## 2026-06-03–04: Reference-Fitted Ball Path And Arm Alignment

### Motivation

The reconstructed juggling motion in `src/motion.ts` used a `BALL_PATH` that was either hand-authored or produced by an automated detector. Either way, the result was visually wrong: balls clustered on the left side with limited vertical range, and arm throw timing was not tied to where the balls actually were.

### Reference Video Extraction

The AlphaPixel archive includes `media/Juggler.mp4` — a modern export of the original 24-frame HAM movie. That file was downloaded and probed:

```bash
ffmpeg -i tmp/Juggler.mp4 -frames:v 24 -vsync 0 tmp/frames/frame_%02d.png
```

The video is 1462×1080 at 30 fps, stretched from the original 320×200 (scale factors 4.57× / 5.4×). The 24 extracted frames were confirmed to show a fixed-camera juggling sequence, not a camera orbit.

### Automated Ball Detection

`scripts/analyze-frames.py` was written to detect balls via background subtraction and heatmap peaks. After five iterations the detector ran cleanly on all 24 frames, but the resulting 3D positions were unreliable because:

- Diff-image blobs give only partial radius measurements, making depth-from-radius unstable.
- Robot arm movement creates large diff regions that compete with ball signal.

A fixed nominal depth (`A_NOM = 0.6 × 0.98 × 320 / 18 ≈ 10.45`) was adopted instead, relying on the fact that all balls remain within ±5 % of that depth throughout the cycle. Detection improved to 24/24 frames, but tracker identity still jumped between balls at mid-arc.

### Manual Labeling

A self-contained browser labeling tool was generated (`tmp/ball_labeler.html`) with all 24 reference frames embedded as base64 PNGs. The tool allows click-to-label for three ball identities per frame, auto-advances the selector, supports undo, and exports coordinates as JSON.

The user manually labeled all 24 frames, producing consistent pixel positions for three balls across the full sequence with clear identity: one ball falling from apex, one rising from throw, one transitioning at hand level.

### Back-Projection And Path Reconstruction

Each labeled pixel position `(i, j)` in 320×200 was back-projected to world 3D using the known camera:

```python
xv = (i - 160) * (1/320)
yv = (100 - j) * (0.75/200)
k  = A_NOM / EFF_FOCAL
P  = observer + A_NOM·viewDir + k·xv·uhat + k·yv·vhat
```

The three tracked balls showed clean continuity at their cycle boundaries:

- Ball 0 (falling) frame 24 → Ball 1 (transition) frame 1: 0.24 world units
- Ball 1 (transition) frame 24 → Ball 2 (rising) frame 1: 0.16 world units
- Ball 2 (rising) frame 24 → Ball 0 (falling) frame 1: 0.16 world units

This confirmed that the three labeled balls trace one complete single-ball cycle across three 24-frame segments. The `BALL_PATH` was constructed by concatenating all three segments (72 entries total) and resampling at every third entry to keep the existing 24-entry structure:

```
BALL_PATH[0..7]  = Ball 0 frames 1,4,7,10,13,16,19,22  (apex → left hand, falling)
BALL_PATH[8..15] = Ball 1 frames 1,4,7,10,13,16,19,22  (left hand → right area, transition)
BALL_PATH[16..23]= Ball 2 frames 1,4,7,10,13,16,19,22  (right area → apex, rising)
```

The seam at index 23→0 is 0.155 world units — imperceptible through the smoothstep interpolation.

`BALL_GROUPS` offsets were updated from `{0, 7, 3}` to `{0, 8, 16}`:

- Group 0 (offset 0): at source frame 0 samples `path[0]` = apex position.
- Group 1 (offset 8): at source frame 0 samples `path[8]` = left-hand position.
- Group 2 (offset 16): at source frame 0 samples `path[16]` = right-throw position.

### Arm Animation Alignment

The previous `armControls` used a mirrored `side × y` formula that assumed symmetric hand positions. The reference data showed the two hands are not mirror images:

- Left hand (path index 8): `[-1.001, +1.191, 3.330]`
- Right hand (path index 16): `[-0.382, -0.570, 3.212]`

The function was rewritten to handle each arm separately. Both arms now pulse at source frames 0, 8, and 16 — the three moments in the 24-frame cycle when a ball arrives at a hand.

At throw (pulse = 1):
- Left wrist: `[-1.0, +1.2, 3.3]` — matches ball group 1 hand position.
- Right wrist: `[-0.4, -0.6, 3.2]` — matches ball group 2 hand position.

At rest (pulse = 0):
- Left wrist: `[-0.85, +1.5, 4.0]` — arm extended downward and outward, natural hanging.
- Right wrist: `[-0.7, -1.3, 4.0]` — same on the opposite side.

### Tests Updated

The test assertions in `src/tests.ts` that verified specific `BALL_PATH[0]` coordinates were updated to the new values. The cascade-motion test now checks that ball group 0 is at the apex at source frame 0 (z ≈ 7.19) and descends visibly over 6 frames (Δz > 1.0).

All tests pass. `npm run build:single` produces a valid standalone `index.html`.

### Remaining Open Items From This Pass

- The hand-level balls (z ≈ 3.2–3.3) are at hip/upper-leg height in the robot's coordinate frame. Some visual overlap with the lower body occurs during the hand-to-hand transition (path indices 9–15), which mirrors the original animation behavior. Further refinement would require per-ball paths rather than the single shared `BALL_PATH`.
- The arm group indices (11 = right, 12 = left) have not been cross-checked against robot.dat geometry; the assignment may need swapping.
- The later depth-correction pass moved path data out of `src/motion.ts`; older inline-path cleanup notes are now superseded.

## Open Questions

- Can `movie.data` and `movie2.data` be decoded directly in TypeScript?
- Should historical reference frames be embedded in the standalone app, or kept as optional forensic fixtures?
- How close should the renderer aim to get to pixel parity before adding more modern render features?
- Should the reconstructed motion model remain hand-authored/fitted, or move to a richer keyframe data format?
- Should the Workbench UI stay purely CSS/HTML, or should period-correct icons and bitmap assets be introduced?

## 2026-06-04: 3D Ball Clearance Correction

The next correction addressed a specific failure in the reference-fitted ball path: the path matched source-frame screen positions, but because it used a fixed-depth back-projection, several balls passed through the robot head and torso in 3D.

The fix keeps the reference-frame pixel alignment but changes the physical depth:

- Moved the raw reference-derived path into `src/motion-data.ts`.
- Treated those raw points as source camera ray anchors, not final 3D positions.
- Applied a depth correction scale of `0.85` along the original camera rays.
- Preserved projection through `Motion.projectToSourcePixel()`.
- Added body/head clearance diagnostics with `Motion.frameBodyClearance()` and `Motion.diagnostics()`.
- Made arm wrist targets derive from corrected ball contact positions.
- Added animation-frame `motionClearance` metadata.
- Exposed compact clearance/contact facts in the Workbench UI.

Regression tests now verify that corrected points still reproject to the original source pixels, all source-frame balls clear the robot body/head, and hand-contact frames remain close to the arm endpoints.

## 2026-06-04: Frame Range And Animation Metadata

The animation workflow now supports rendering a selected output-frame range instead of always rendering the full timeline.

Implemented changes:

- Added first-frame and last-frame controls to the animation panel.
- Clamped and normalized frame ranges in the UI, including reversed ranges and frame-count changes.
- Updated `AnimationRenderer` to render only the requested range while keeping absolute output-frame indices.
- Kept motion sampling tied to the full animation timeline, so rendering frames 3-5 of an 8-frame animation samples the same motion/camera positions as the full render.
- Added render profile and ball/body clearance metadata to each completed frame.
- Updated PNG and video export filenames to use absolute frame numbers.
- Added UI facts for selected range, duration, render profile, source frame, clearance, hand contact, and minimum clearance.

Verification:

```bash
npm test
npm run build:single
```

## 2026-06-04: Animation Manifest Export

The next animation slice added structured metadata export so future motion-fitting work can inspect the exact rendered frames without reverse-engineering state from the UI.

Implemented changes:

- Added `MotionObjectSample` metadata for reconstructed ball positions and wrist endpoints.
- Stored per-frame ball samples, hand samples, body clearance, ball spacing, camera pose, render profile, render timing, and ray stats on rendered animation frames.
- Added `Animation.createManifest()` with a stable `amiga-juggler-animation-manifest` format identifier and version.
- Added a `JSON` export button to the Animation panel, enabled alongside PNG/video exports once frames are buffered.
- Updated the README and TODO to treat manifest export as completed foundation work.

Verification:

```bash
npm test
npm run build:single
```

The test suite now checks that animation frames record three ball samples and two wrist samples, and that generated manifests contain source-frame labels, render profile data, motion samples, and defensive copies of sampled positions.

Browser smoke verification opened the generated `index.html` directly from disk, rendered a three-frame 160 x 100 source-camera animation, and confirmed:

- The UI reported `Animation ready: 3 frames`.
- The `JSON` export button became enabled after rendering.
- Animation facts reported `JSON manifest available`.
- The rendered canvas was nonblank.
- No console errors appeared.

## 2026-06-04: Ballistic Cascade And Ball Spacing

A visual review showed that the previous screen-ray fitted ball path still produced physically impossible motion: balls could overlap the juggler in projection and, more concretely, the three mirrored balls passed through each other. The minimum measured ball/ball surface clearance in that model was negative.

The Meatfighter Juggler writeup and final Java source were used as the model for this correction. That implementation controls the balls with two parabolic arcs: a high hand-to-hand arc and a lower crossing arc, with the three balls placed at fixed phase offsets.

Implemented changes:

- Kept the manually labeled historical screen anchors as evidence in `src/motion-data.ts`.
- Added explicit physical cascade constants: hand ball centers, shared ball plane, high apex, and low crossing apex.
- Replaced rendered ball placement with a two-arc ballistic cascade inspired by Meatfighter's `JUGGLE_*` constants.
- Added `Motion.frameBallClearance()` and `minBallClearance` diagnostics.
- Added ball spacing metadata to rendered animation frames and exposed it in the UI facts/status text.
- Changed arm targeting to follow the nearest ball to each hand instead of pulsing against fixed source-frame indices.

Verification:

```bash
npm test
npm run build:single
```

The tests now assert source frame 1 has one apex ball, one left-hand ball, and one right-hand ball; they also require positive body/head clearance and positive ball/ball spacing across the reconstructed cycle.

Browser smoke verification opened the generated `index.html` from disk. The scene facts reported `Ball clearance 0.62` and `Ball spacing 0.25`. A 160 x 100 source-camera render of frames 1-3 produced nonblank frames; scrubbing reported positive per-frame clearance and ball spacing for each frame.

The test suite now includes a regression that renders frames 3-5 of an 8-frame sequence and verifies the returned frames keep absolute indices 3-5 and sample the correct absolute source frame.

Browser smoke verification opened the generated `index.html` directly from disk, rendered an 8-frame static-camera animation range of frames 3-5 at 160 x 100, and confirmed:

- The UI reported `Animation ready: 3 frames`.
- The timeline exposed three buffered frames (`max = 2`).
- Scrubbing reported absolute output frames 3, 4, and 5.
- Source frames advanced as 7/24, 10/24, and 13/24.
- Each canvas frame was nonblank, and adjacent frames differed by thousands of pixels.
- No runtime errors appeared in the console; the only warning came from verification-time canvas readbacks.

## 2026-06-04: Camera And Cycle Presets

The animation panel now has presets for inspection workflows that were previously manual combinations of path and range controls.

Implemented changes:

- Added named camera presets for the historical source camera, source-height orbit, left-catch arc, right-catch arc, overhead clearance orbit, and source-view dolly.
- Added source-cycle presets for the full 24-frame cycle and the three major reconstructed motion phases: apex to left catch, left catch to right catch, and right catch to apex.
- Added source-frame phase labels so statuses and facts can report frames as `apex`, `left catch`, `right catch`, or the in-between travel phases.
- Animation facts now show the active camera preset, cycle preset, output range, and source range.
- Editing camera or range controls marks the corresponding preset as custom and clears stale buffered animation frames.

Verification:

```bash
npm test
npm run build:single
```

The test suite now checks camera preset application, cycle preset ranges, source-frame labels, and source-range label formatting.

Browser smoke verification opened the generated `index.html` from disk, applied the overhead clearance camera preset and apex-to-left source-cycle preset, then rendered a shortened 1-3 range at 160 x 100. Scrubbing confirmed source labels advanced from `1/24 apex` to `2/24 falling to left catch` and `3/24 falling to left catch`, each frame was nonblank, and adjacent frames differed by more than 7,800 pixels.

## 2026-06-04: Render Profile Mode Indicators

The render panel now makes the selected profile's historical/modern behavior visible without requiring the user to remember what each profile means.

Implemented changes:

- Added `Profiles.modeTags()` to expose profile semantics as structured tags.
- Added Workbench-style profile indicators under the render profile selector.
- Tags distinguish HAM source output, RGB modern output, standard reflections, and source reflection quirk mode.
- Changing render profile refreshes the tags and clears stale animation frames, since buffered frames are profile-specific.

Verification:

```bash
npm test
npm run build:single
```

The test suite now checks that each profile advertises the expected mode tags.

Browser smoke verification switched all three render profiles in the generated `index.html` and confirmed the visible tags update as expected:

- `reference`: HAM source output, standard reflections, epsilon `0.00001`
- `wright-rgb`: RGB modern output, standard reflections, epsilon `0.00001`
- `source-quirk`: HAM source output, source reflection quirk, epsilon `0.001`

## 2026-06-04: CRT Emulation Modes

The screen-bar CRT control now cycles through multiple display overlays instead of only toggling scanlines on and off.

Implemented changes:

- Added body-level CRT modes: `off`, `scanlines`, `slot-mask`, and `soft-glow`.
- Kept scanlines as the default mode to preserve the existing look.
- Added a slot-mask overlay with vertical grille structure and scanline darkening.
- Added a soft-glow mode with subtle vignette, light scanlines, saturation, and contrast lift.
- Updated the screen-bar button label and active state as the user cycles modes.

Verification:

```bash
npm test
npm run build:single
```

Browser smoke verification opened the generated `index.html` from disk and confirmed the screen-bar button cycles through `scanlines`, `slot-mask`, `soft-glow`, `off`, then back to `scanlines`, with matching button labels and active states.

## 2026-06-04: Meatfighter-Style Body Motion

The previous reconstructed motion only moved the balls and posed the arms toward catches. That made the robot look like a static body with flapping arms, while the Meatfighter reimplementation animates the full juggler pose.

Implemented changes:

- Added a Meatfighter-inspired hips oscillator scaled to the 24-frame reconstructed source cycle.
- Rebuilt torso, neck, head, eyes, and hair controls from the animated hips/body frame each source frame.
- Added planted-leg IK so the hips move while the feet stay grounded.
- Replaced fixed-shoulder arm posing with moving shoulders and two-bone IK arms.
- Kept the existing ballistic ball cascade and clearance diagnostics intact.
- Updated README and TODO to document the Meatfighter body-motion source and the completed body-pose slice.

Verification:

```bash
npm test
npm run build:single
```

The test suite now checks that the head sways, torso bobs, shoulders and hips follow the body pose, and feet remain planted while the existing ball/body clearance and hand-contact checks keep passing.

Browser smoke verification opened the generated `index.html` directly from disk and confirmed:

- Reconstructed world positions report head sway, torso bob, moving shoulders, moving hips, and planted feet.
- Motion diagnostics remain positive with body clearance `0.63`, ball spacing `0.25`, and hand contact `0.11`.
- A 6-frame 160 x 100 source-camera render completed with nonblank output.
- No console errors appeared.

## 2026-06-04: README And Technical Notes Split

The README was rewritten to describe the project in functional terms instead of tracking implementation status.

Implemented changes:

- Removed the status-heavy README structure.
- Added a shorter README focused on the Juggler's origins, source material, standalone use, and attribution.
- Referenced the AlphaPixel GitHub archive as the recovered source base.
- Called out Ernie Wright's notes, Meatfighter's Java reimplementation, and historical frame/movie material as reconstruction sources.
- Moved build, architecture, runtime, and verification notes into `TECHNICAL.md`.

Verification:

```bash
git diff --check
```

## 2026-06-04: About Panel Copy

The collapsed GUI source note was renamed to `About` and rewritten to match the current source-truth story.

Implemented changes:

- Renamed the `Source` panel to `About`.
- Updated the copy to credit AlphaPixel's GitHub archive of Eric Graham's 1987 source.
- Clarified that the original `.dat` files provide static scene data, while juggler motion is reconstructed from historical movie output, Ernie Wright's notes, and Meatfighter's Java reimplementation.

Verification:

```bash
npm run build:single
```

## 2026-06-04: Realtime Preview Modes

The first TODO ideas pass added fast inspection render modes without changing the existing raytracer default.

Implemented changes:

- Added a `View` selector with `Raytrace`, `Wireframe`, and `Solid` modes.
- Added a `Preview` module that projects resolved world spheres through the current observer.
- Wireframe mode draws projected sphere outlines directly to the canvas.
- Solid mode draws flat material-colored projected spheres with simple depth sorting.
- Kept `Raytrace` as the default high-quality render path.

Verification:

```bash
npm test
npm run build:single
```

Browser smoke verification opened the generated `index.html` directly from disk, switched to 160 x 100 wireframe and solid previews, confirmed both were nonblank, and found no console errors.

## 2026-06-04: Mouse Camera And Group Transforms

The second TODO ideas pass made preview mode interactive while keeping edits session-only.

Implemented changes:

- Added an `Interactive` control window with mouse tool selection, selected group facts, transform offsets, and reset controls.
- Added mouse orbit control for preview modes, with wheel zoom and camera height offset support.
- Added group picking in preview mode and selected-group highlighting.
- Added session-only group transforms that apply after motion resolution and before preview, still renders, and animation frames.
- Added a pure transform helper so original parsed scene data and base worlds are not mutated.

Verification:

```bash
npm test
npm run build:single
```

Browser smoke verification opened the generated `index.html` directly from disk, switched to solid preview, confirmed a nonblank canvas, used a wheel event to change orbit radius and redraw the preview, and found no console errors.

## 2026-06-04: Amiga Display Constraints

The final TODO ideas pass added explicit display constraints that can be applied to both fast previews and raytraced output.

Implemented changes:

- Added a `Display` selector to the render panel.
- Added display constraint modes for exact RGB, OCS 12-bit RGB quantization, Extra Half-Brite-style 64-color output, and approximate HAM6 output.
- Applied the selected display constraint as a post-render pixel pass in the raytracer.
- Applied the same color constraints to wireframe and solid preview colors for fast inspection.
- Stored the selected display constraint on rendered animation frames and JSON manifests.
- Added profile indicator and animation fact text so buffered output provenance is visible in the UI.
- Removed the completed ideas from `TODO.md`.

Verification:

```bash
npm test
npm run build:single
```

Browser smoke verification opened the generated `index.html` directly from disk and confirmed:

- Solid preview redraws were nonblank for RGB, OCS 12-bit, EHB 64, and HAM6 approx display modes.
- A 160 x 100 OCS 12-bit raytrace completed with nonblank output.
- Profile indicators and animation facts reported the active display constraint.
- No runtime errors appeared in the console; the only warning came from verification-time canvas readbacks.

## 2026-06-04: CPU Renderer Acceleration

The first modern rendering pass improved the current CPU raytracer without changing the legacy/source-like output defaults.

Implemented changes:

- Added BVH sphere acceleration for primary, shadow, and reflection rays.
- Kept a brute-force acceleration mode for parity testing.
- Added tile rendering and a time-budget API for modes that do not depend on left-to-right HAM line state.
- Kept source-HAM and HAM6 approximate display output row-sequential so historical output remains deterministic.
- Added render stats for sphere tests, BVH node tests, rendered pixels, and tiles.
- Updated TODO/technical notes to mark spatial acceleration and tile rendering as completed foundations.

Verification:

```bash
npm test
npm run build:single
```

The test suite now renders the same modern RGB frame through brute-force rows, BVH rows, and BVH tiles, then asserts the pixel buffers match exactly while BVH performs fewer sphere tests.

## 2026-06-04: Standalone Worker Rendering

The second modern rendering pass moved still raytraces off the main thread when browser support is available, while preserving the file-loadable standalone HTML workflow.

Implemented changes:

- Added a dedicated TypeScript worker entrypoint that uses the existing parser-free scene state, motion resolver, transforms, observer setup, and `FrameRenderer`.
- Added a worker build output and inlined it into `index.html` as text during `npm run build:single`.
- Added app-side worker creation through a Blob URL, with automatic fallback to the existing main-thread renderer when workers are unavailable.
- Added abort cleanup so stale worker jobs terminate before later renders can write to the canvas.
- Kept worker rendering single-file compatible; no backend, dev server, or external worker file is required.
- Updated TODO and technical notes to mark standalone worker still rendering as completed foundation work.

Verification:

```bash
npm test
npm run build:single
```

Browser smoke verification opened the generated `index.html` directly from disk, rendered a 160 x 100 still frame through the worker, and confirmed:

- The status reported `Done ... worker`.
- The canvas was nonblank.
- The inline worker source was embedded in the standalone file.
- No runtime errors appeared in the console; the only warning came from verification-time canvas readbacks.

## 2026-06-04: Modern Quality And Anti-Aliasing

The third modern rendering pass added opt-in modern sampling while keeping the legacy/source-like render path unchanged by default.

Implemented changes:

- Added render quality modes: Legacy, Interactive fast, and Modern quality.
- Added anti-aliasing modes: Off, Ordered 2x, and Adaptive 2x.
- Kept Legacy and Interactive quality forced to AA Off so source-like defaults remain stable.
- Enabled AA controls only when Modern quality is selected.
- Added quality and AA provenance to animation frames and JSON manifests.
- Added tests for AA ray-count behavior and manifest metadata.
- Updated TODO and technical notes to mark optional modern anti-aliasing as completed.

Verification:

```bash
npm test
npm run build:single
```

Browser smoke verification opened the generated `index.html` directly from disk, selected Modern quality with Ordered 2x AA, rendered a 160 x 100 worker-backed still frame, and confirmed:

- The render completed with nonblank output.
- Profile indicators reported `Quality Modern quality` and `AA Ordered 2x`.
- AA controls were enabled in Modern quality mode.
- The render traced more rays than the non-AA baseline.
- No runtime errors appeared in the console; the only warning came from verification-time canvas readbacks.

## 2026-06-04: Live Raytrace And Free Camera

The fourth modern rendering pass connected the faster CPU renderer to interactive scene work.

Implemented changes:

- Added a `Live Raytrace` view mode beside Raytrace, Wireframe, and Solid.
- Added a `Free camera` mouse tool.
- Added camera position and target controls plus a reset-to-source-camera action.
- Added session-only free camera pose state that overrides source/orbit camera for stills, previews, live raytrace, and worker renders.
- Implemented free-camera rotation, Shift-drag strafing, and wheel dolly.
- Added adaptive live render resolution while dragging, followed by an idle refinement render after pointer release.
- Kept orbit camera, wireframe/solid previews, group picking, group transforms, and legacy still raytrace behavior intact.
- Updated TODO and technical notes to mark live raytrace and free camera movement as completed foundation work.

Verification:

```bash
npm test
npm run build:single
```

Browser smoke verification opened the generated `index.html` directly from disk and confirmed:

- Live Raytrace rendered a nonblank 160 x 100 frame.
- Editing the camera pose switched camera facts to free mode and redrew a nonblank live raytrace.
- Free-camera wheel dolly redrew a nonblank live raytrace.
- No runtime errors appeared in the console; the only warning came from verification-time canvas readbacks.

## 2026-06-04: Modern Studio, Viewport Controls, And Live Playback

This pass turned the growing set of render controls into an opt-in experience model while keeping the Workbench shell and Classic Source path intact.

Implemented changes:

- Added Classic Source and Modern Studio presets, with Custom selected automatically after manual advanced edits.
- Moved the primary flow into a compact command strip for Experience, View, Live playback, Render Still, and Abort.
- Reorganized dense controls into collapsible Workbench windows for Scene, Camera, Render Details, Modern Effects, Animation, and Diagnostics.
- Replaced the old mouse-tool selector with normal viewport controls: drag orbit, Shift/right-drag pan, wheel dolly, and explicit Scene Edit mode for group movement/depth movement.
- Added deterministic non-source render effects: soft shadows, contact ambient occlusion, depth of field, and live motion-blur accumulation.
- Added Live Raytrace source-frame playback that targets the selected animation FPS and skips stale frames while a render is still active.
- Recorded modern effect settings in rendered frames and JSON manifests.

Verification:

```bash
npm test
npm run build:single
```

Browser smoke verification was attempted against the generated standalone `index.html`, but browser automation was unavailable in this execution environment. No workaround browser path was used.

## 2026-06-05: TODO Triage And Documentation Split

The TODO file had become a mix of completed history, architecture notes, validation habits, and actual future work. This pass split those concerns back into the project docs:

- Moved the current capability snapshot into `README.md`.
- Added the experience preset and canvas-control model to `TECHNICAL.md`.
- Removed completed foundations from `TODO.md`.
- Reframed TODO as a forward-looking backlog with near-term priorities, historical accuracy work, rendering/performance work, animation/data work, and deferred ideas.
- Marked GIF export, batch PNG zip packaging, WebGPU, and additional content pages as deferred until there is a stronger reason to prioritize them.

## 2026-06-05: Fly View And Mouse-Control Clarification

The canvas drag controls were technically attached to the render canvas, but camera drag used internal render-pixel deltas. That made Live Raytrace drags feel inconsistent when the visible canvas was much larger than the interactive render resolution. Pointer capture also meant drags continued after leaving the canvas, which could feel like the whole browser window was being controlled.

Implemented changes:

- Camera drag now uses visible CSS-pixel deltas.
- Scene/object picking still uses render-pixel coordinates for accurate group selection.
- Added Fly View as a top-level command-strip toggle and Camera window option.
- Fly View switches still Raytrace view to Live Raytrace, uses pointer lock for mouse look, and supports WASD/arrow movement plus Q/E or Shift/Space vertical movement.
- Added optional gamepad polling in Fly View: left stick moves, right stick looks, and triggers/face buttons move vertically.
- Added camera diagnostics and canvas hints for Fly View state, pointer lock, fly speed, and gamepad status.
- Added tests for mouse-look and fly-movement camera math.

Verification:

```bash
npm test
npm run build:single
```

Browser smoke remains queued in `TODO.md` because browser automation is unavailable in this execution environment.

## 2026-06-05: Reference Compare, Telemetry, And Inspection Pass

Implemented changes:

- Added a generated `src/reference-frames.ts` fixture with 24 source-resolution PNG frames extracted from `tmp/Juggler.mp4`.
- Added `scripts/extract-reference-frames.mjs` to regenerate that fixture from the archived movie when the local source file is present.
- Added Reference Compare controls for off, overlay, and side-by-side historical-frame comparison.
- Synced the reference frame with still renders, Live Raytrace playback, source-frame scrubbing, and buffered animation timeline playback.
- Added long animation progress text with output frame, sampled source frame, row progress, elapsed time, and ETA.
- Added still/live/animation render telemetry to Diagnostics.
- Added material and lighting inspection facts for the selected group without changing source-like render defaults.
- Added live-mode modern effect caps: soft-shadow samples are limited and depth of field is disabled for Live Raytrace, while still/animation renders keep selected settings.
- Documented the TypeScript-first renderer stance and moved completed near-term/rendering items out of TODO.

Verification:

```bash
npm test
npm run build:single
```

## 2026-06-05: Anatomical Left-Leg Pose Correction

The screen-right leg is the character's anatomical left leg because the robot faces the source camera. A visual review showed that this leg read as bending backward during the reconstructed hip bob.

Source validation:

- `robot.dat` group 10 is the screen-right planted leg.
- Meatfighter's reconstruction notes describe the juggler as standing with his right foot forward and left foot back, with the left leg almost straight while the right knee is slightly bent.

Implemented changes:

- Renamed the animated leg constants around anatomical right/left instead of misleading internal screen names.
- Gave the anatomical-left/screen-right leg separate effective IK lengths so it remains nearly straight during the hip bob.
- Added a regression test asserting the anatomical left leg stays much straighter than the anatomical right leg at the mid-cycle hip dip.

Verification:

```bash
npm test
npm run build:single
```

## 2026-06-05: Source-Fit Diagnostics And Live Double Buffering

This pass tightened the historical-fidelity loop before further modern experiments.

The Live Raytrace flicker diagnosis was that live rendering wrote partially completed frame data directly into the visible canvas on every time-budget tick. Starting a live render also resized the canvas up front, which cleared the visible bitmap before the replacement frame was ready.

Implemented changes:

- Changed Live Raytrace and Fly View rendering to keep the current visible canvas unchanged while a new live frame renders into the renderer back buffer.
- Added a completed-frame commit helper that swaps live display data only after the frame is done, with live motion blur applied before the swap.
- Preserved stale-frame skipping and live playback telemetry.
- Added source-fit data structures for projected ball error, source camera/focal/aperture facts, physical clearances, hand contact error, and left/right leg-bend sanity.
- Added Source Fit facts to Diagnostics.
- Stored per-frame `sourceFit` data on rendered animation frames and JSON manifests, plus a manifest `diagnostics.sourceFit` summary.
- Documented that source fit is evidence-guided rather than pixel-perfect because the available movie fixture has been converted and recompressed.
- Checked the workspace for `movie.data` and `movie2.data`; neither file is present in the committed tree, so direct HAM movie decoding remains dependent on adding those archive files locally.

Verification:

```bash
npm test
npm run build:single
```

Browser smoke opened the rebuilt standalone `index.html` directly from disk and confirmed the Classic Source canvas was nonblank, Source Fit diagnostics were populated, and no console messages were present after reload. A brief Live playback smoke confirmed a completed live render updates telemetry while stale frames are skipped instead of queued.

## 2026-06-05: Archival Movie Calibration Pass

The new local `reference/` material includes the recovered AlphaPixel archive, Ernie Wright material, Meatfighter reference material, the original 320 x 200 AVI conversion, and the compressed `movie.data` / `movie2.data` payloads.

Findings:

- The checked-in `src/original/robot.dat`, `ele.dat`, and `dragon.dat` match the recovered AlphaPixel archive copies byte for byte.
- `juggler.avi` is the preferred frame fixture source because it is already 320 x 200, while `Juggler.mp4` is an upscaled transcode.
- `movie.data` and `movie2.data` both report 24 frames at 320 x 200, share the same 16-entry raw 4-bit RGB palette, and contain compressed payloads averaging roughly 11 to 12 KB per frame.
- Automated ball detection from converted movie frames is useful for inspection but not reliable enough for hard identity tracking when balls overlap hands/body or cross paths.

Implemented changes:

- Updated `scripts/extract-reference-frames.mjs` to prefer the local archival `juggler.avi`, while still accepting an explicit movie path and falling back to MP4 copies.
- Regenerated `src/reference-frames.ts` from `juggler.avi` instead of the upscaled MP4.
- Added `scripts/probe-movie-data.mjs` to verify recovered `movie.data` headers, dimensions, palette, and payload sizes without claiming to decode the compressed HAM frames.
- Changed Source Fit ball comparison to choose the best assignment between the three rendered balls and three source anchors per frame, avoiding false error from arbitrary image-derived ball identity swaps.
- Documented the updated reference workflow and moved the completed movie-header probe out of TODO.

Verification:

```bash
node scripts/probe-movie-data.mjs
node scripts/extract-reference-frames.mjs
npm test
npm run build:single
git diff --check
```

Browser smoke reloaded the standalone `index.html` directly from disk and confirmed the embedded reference source is `juggler.avi`, the 320 x 200 render canvas is nonblank, source-fit data covers all 24 frames with three unique ball-anchor assignments, and no console messages are present.

## 2026-06-05: Fly View Keyboard Focus Fix

Diagnosis:

- Fly View could be entered from the toolbar button or checkbox while that control retained browser focus.
- `handleFlyKeyDown` treated buttons as typing targets, so WASD/QE keydown events were ignored even though pointer-lock mouse look still worked.

Implemented changes:

- Made the render canvas focusable and moved focus to it when Fly View starts, when pointer lock is requested, and when the canvas is clicked.
- Kept fly key suppression for real text-entry controls and editable content, but no longer suppresses keys just because a toolbar button has focus.
- Added regression assertions that fly keys are not suppressed for `BUTTON` or `CANVAS`, while `INPUT`, `TEXTAREA`, and editable elements remain protected.

Verification:

```bash
npm test
npm run build:single
git diff --check
```

Browser automation was unavailable for this pass because the browser tool rejected further actions after the local diagnosis snapshot.

## 2026-06-05: Classic Source Calibration Harness And Fixed-Camera Defaults

The default animation/camera behavior was still biased toward an inspection orbit, which made the Classic Source experience start from the wrong family of views compared with the archival Juggler movie. The Classic Source display path also applied the source-HAM render profile and then an approximate HAM display constraint, effectively double-encoding the source-like output.

Implemented changes:

- Added a `Calibration` namespace with Eric Graham source-equivalent pixel-ray math, Classic Source render options, 24-frame render helpers, and frame/summary comparison metrics.
- Added `scripts/classic-calibration.mjs` plus `npm run calibrate:classic` to build the non-UI calibration bundle, decode the local archival `juggler.avi` with `ffmpeg`, render all 24 Classic Source frames at 320 x 200, and print per-frame comparison metrics.
- Changed Classic Source to use the source-HAM render profile with a neutral RGB display constraint so HAM-like output is not encoded twice.
- Changed default animation settings and Classic Source preset application to use the fixed source camera and full reconstructed 24-frame source cycle instead of a 360 degree orbit.
- Tuned the ballistic cascade constants against the archival movie while preserving positive ball/body and ball/ball clearance.
- Recorded `classicCalibrationReference: "juggler-avi-320x200"` in Classic Source animation manifests.
- Tightened tests so source-equivalent calibration rays match renderer pixel rays and the reconstructed ball fit stays within the current calibrated error bounds.

Verification:

```bash
npm test
npm run calibrate:classic
```

The calibration run used `reference/Eric-Graham-1987-Juggler-Raytracer-1.0/media/juggler.avi`. The 24-frame summary reported mean ball pixel error `24.04`, max ball pixel error `51.06`, foreground overlap `0.879`, and mean framing error `2.71` pixels. Whole-frame color error remains high because the available reference has conversion/compression history and the renderer is still a source-aware TypeScript reconstruction, not a direct C/HAM movie decoder.
