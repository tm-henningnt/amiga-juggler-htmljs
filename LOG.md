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

Browser smoke verification opened the generated `index.html` from disk and confirmed the screen-bar button cycles through `scanlines`, `slot-mask`, `soft-glow`, `off`, then back to `scanlines`, with matching button labels and active states.

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
