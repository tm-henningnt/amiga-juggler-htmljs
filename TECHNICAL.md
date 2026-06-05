# Technical Notes

This document describes how the browser reconstruction is organized. It is intentionally high level; source files remain the authority for exact implementation details.

## Runtime Shape

The app is written in TypeScript and built into a single standalone `index.html`.

The standalone file contains:

- Compiled JavaScript.
- An inline worker script for background raytracing when browser support is available.
- CSS for the Workbench-style interface and CRT display modes.
- Embedded original `.dat` scene text.
- Reconstructed motion data and browser UI code.

The generated file is designed to open directly from disk in a browser. No backend, package server, or local dev server is required to use it.

## Source Data

The preserved AlphaPixel archive supplies the original static scene descriptions and historical media. The `.dat` files define cameras, sphere groups, materials, lamps, sky, and ground settings.

The original recovered scene descriptions are static. Juggler motion is reconstructed separately from:

- Historical rendered movie/frame material.
- Ernie Wright's documentation of the original raytracer and output.
- Meatfighter's Java reimplementation, especially its body pose and juggling-ball motion patterns.
- Manual and scripted frame analysis kept outside the standalone bundle.

The project keeps source-derived constants and reconstruction notes close to the motion code so future fitting work can be audited.

`scripts/extract-reference-frames.mjs` extracts the first 24 frames from the best local historical movie source and writes `src/reference-frames.ts` as embedded PNG data URLs. It prefers `reference/Eric-Graham-1987-Juggler-Raytracer-1.0/media/juggler.avi`, the archived 320 x 200 AVI conversion, then falls back to local MP4 copies. The generated fixture is checked in so the standalone HTML can compare against historical frames without fetching external assets.

`scripts/probe-movie-data.mjs` verifies recovered `movie.data` and `movie2.data` headers when the local `reference/` archive is present. Both payloads report 24 frames at 320 x 200 with the same 16-entry raw 4-bit RGB palette. The script intentionally stops at header/palette/payload-size inspection; decoding the compressed HAM frame payload remains future work.

`scripts/classic-calibration.mjs` builds a small non-UI bundle, decodes the preferred archival movie with `ffmpeg`, renders the reconstructed 24-frame Juggler cycle at 320 x 200 through the Classic Source path, and prints per-frame comparison metrics. The harness is used to tune source-frame camera defaults, cascade ball height, source-fit bounds, and future renderer/lighting corrections against `juggler.avi`.

Source-fit diagnostics are evidence-guided, not pixel-perfect. The reference movie frames have passed through conversion and recompression, so the app reports projected pixel error against the reference-derived ball anchors, camera/focal/aperture facts, physical clearance, hand contact, and leg-bend sanity instead of treating the encoded movie as an exact oracle. Ball error uses a best-assignment match between the three rendered balls and the three source anchors for each frame, avoiding false error spikes from arbitrary ball identity swaps in the image-derived reference.

## Rendering Pipeline

The renderer expands parsed sphere controls into renderable sphere lists, then raytraces the scene in the browser.

At a high level it supports:

- Primary camera rays.
- Sphere and ground intersections.
- Sky and checkerboard floor shading.
- Direct lighting, shadows, highlights, and mirror reflections.
- BVH sphere acceleration for ray/sphere queries.
- Tile and time-budget rendering for line-order-safe modes.
- Worker-backed still rendering with main-thread fallback.
- Source-like HAM output and modern RGB output paths.
- Classic Source uses the source-HAM render profile with a neutral RGB display constraint. This avoids applying an approximate HAM display pass on top of pixels that have already gone through the source-like HAM renderer.
- Opt-in modern quality anti-aliasing.
- Deterministic non-source soft shadows, contact ambient occlusion, and depth of field through `ModernEffectsSettings`.
- Live motion-blur accumulation for source-frame playback.
- Live-render effect caps: soft-shadow samples are limited and depth of field is disabled for Live Raytrace, while still and buffered animation renders keep the selected effect settings.
- Double-buffered Live Raytrace display: live and Fly View renders write into a back buffer and swap the visible canvas only after a full frame is complete. Progress updates continue while incomplete frames are hidden to avoid visible flicker from partial tile/row data or canvas resizing.
- Optional RGB, OCS 12-bit, Extra Half-Brite-style, and approximate HAM6 display constraints.
- Render profiles that make historically relevant quirks explicit.
- Fast wireframe and solid previews for interactive scene inspection.
- Live raytraced previews for session camera and transform work.

## Animation Pipeline

Animation resolves two things for each frame:

- Camera pose.
- Scene pose.

Camera motion can use static, orbit, dolly, arc, or custom keyframe paths. The default animation camera is the recovered fixed source camera rather than an orbit, so Classic Source and a freshly opened standalone file begin from the same camera family as the historical movie. Scene motion for the juggler is reconstructed from source-frame phase data, ballistic ball arcs, Meatfighter-style body motion, and limb posing.

Rendered animation frames retain metadata for inspection and export, including source-frame labels, camera pose, render profile, modern effects, ball positions, wrist positions, clearances, source-fit diagnostics, timing, and render statistics.

Long animation renders report the buffered frame index, sampled source frame, row progress, elapsed time, and expected remaining time in the status strip. Final animation telemetry aggregates render statistics across the buffered frame set.

Live Raytrace playback is separate from buffered animation playback. It advances reconstructed source frames at the selected FPS and starts a new interactive-quality raytrace only when the previous live render is no longer active. If the clock falls behind, stale source frames are skipped and counted in diagnostics instead of queued.

Animation manifests include a `sourceFit` object per rendered frame and a `diagnostics.sourceFit` summary for the exported frame set. The source-fit data includes projected ball pixel errors against the reference-derived anchors, the source camera/focal/aperture values, physical clearance, hand contact error, and left-leg bend ratio.

Modern effects are explicit non-source metadata. Classic Source applies disabled effect settings; Modern Studio enables conservative soft shadow and contact AO defaults while keeping DOF and motion blur available as advanced opt-ins.

## UI And Experience Model

The UI keeps a Workbench 1.3 inspired shell while separating the first-run flow from dense render controls.

The primary command strip exposes:

- Experience preset.
- View mode.
- Fly View.
- Live playback.
- Still render.
- Abort.

Detailed controls are grouped into collapsible Workbench windows for Scene, Camera, Render Details, Modern Effects, Animation, and Diagnostics.

Reference Compare is a separate collapsed Workbench window. It can keep the historical reference frame synchronized with the currently displayed source frame, or unlock the reference slider for manual comparison. Overlay mode draws the reference frame over the render canvas with adjustable opacity; side-by-side mode keeps both images at the same 16:10 source aspect.

Diagnostics includes render telemetry for the latest still, live, and buffered animation render, source-fit facts for the reconstructed Juggler cycle, plus material and lighting inspection facts for the selected scene group. The inspection pane reports selected group material/source type, color, control count, rendered sphere bounds, lamp position/color, exposure, and ambient/sky values.

Experience presets are high-level defaults, not locked modes:

- Classic Source selects still Raytrace, the reference/source-like profile, legacy quality, AA off, source camera, scanline CRT, and disabled modern effects.
- Modern Studio selects Live Raytrace, modern RGB output, modern quality, adaptive AA, editable orbit/free camera behavior, soft-glow CRT, and conservative non-source effects.
- Any manual advanced edit marks the experience as Custom.

Canvas interaction follows a standard viewport model. Normal mode uses drag to orbit, Shift/right-drag to pan, and wheel to dolly. Camera drags use visible CSS-pixel deltas so pointer feel stays stable across live render resolutions; object picking still maps to render-pixel coordinates.

Fly View is an explicit camera mode for navigating like a small scene drone. It switches still Raytrace view to Live Raytrace, uses pointer lock for mouse look after a canvas click, accepts WASD/arrow movement plus Q/E or Shift/Space vertical movement, and polls the first connected gamepad when gamepad input is enabled. Gamepad left stick moves, right stick looks, and trigger/face-button pairs move vertically. Scene Edit mode is disabled while Fly View is active.

Scene Edit mode uses click/drag for group movement in the view plane and Shift-drag for view-depth movement.

## Module Layout

- `src/types.ts` defines shared scene, render, camera, animation, and motion contracts.
- `src/experience.ts` defines Classic Source, Modern Studio, and modern effect defaults.
- `src/reference-frames.ts` embeds optimized historical reference-frame PNG data URLs generated from archived movie output.
- `src/parser.ts` parses the original text `.dat` scene format.
- `src/scenes.ts` expands parsed scenes into renderable worlds and creates observers.
- `src/renderer.ts` implements the CPU raytracer.
- `src/render-worker.ts` renders still frames in a Blob Worker embedded by the standalone build.
- `src/ham.ts` implements the source-like HAM pixel encoding path.
- `src/display.ts` applies post-render and preview display constraints.
- `src/preview.ts` projects scene spheres into fast wireframe and solid canvas previews.
- `src/transforms.ts` applies session-only group offsets for preview and render inspection.
- `src/viewport.ts` contains testable orbit, pan, dolly, and scene-edit drag math.
- `src/live-playback.ts` contains source-frame advancement and stale-frame skipping logic for live playback.
- `src/animation.ts` resolves camera paths, queues frame rendering, and builds animation manifests.
- `src/calibration.ts` contains Classic Source calibration helpers that mirror Eric Graham's source pixel-ray math and compare rendered frames with archival movie frames.
- `src/motion-data.ts` stores reconstruction constants and reference-derived screen anchors.
- `src/motion.ts` resolves reconstructed juggler ball, body, limb, source-fit, and diagnostic motion.
- `src/app.ts` wires the browser UI, rendering loop, playback, and export actions.
- `scripts/build-single.mjs` inlines compiled JS and CSS into `index.html`.
- `scripts/extract-reference-frames.mjs` regenerates the historical reference-frame fixture from the local archival movie, preferring `reference/.../media/juggler.avi`.
- `scripts/probe-movie-data.mjs` inspects recovered `movie.data` and `movie2.data` headers without decoding the compressed frame payload.
- `scripts/classic-calibration.mjs` compares the current Classic Source reconstruction with the archival 24-frame `juggler.avi`.

## Development

Install dependencies:

```bash
npm install
```

Run tests:

```bash
npm test
```

Build the JavaScript bundle:

```bash
npm run build
```

Build the standalone HTML file:

```bash
npm run build:single
```

Run the Classic Source calibration harness when the local archival movie is available:

```bash
npm run calibrate:classic
```

Generated `dist/`, `dist-test/`, and `dist-calibration/` files are ignored. The checked-in `index.html` should be rebuilt after meaningful source changes.

## Verification

Automated tests cover parser behavior, scene expansion, renderer basics, render profiles, camera paths, reconstructed motion, animation queues, metadata manifests, HAM encoding, and render smoke output.

Manual browser checks should use the standalone `index.html` loaded from disk. Typical checks are:

- Render the Juggler scene at source resolution.
- Switch between static and reconstructed motion.
- Scrub the source-frame timeline.
- Render a short animation range.
- Check that exported frame numbers and source-frame labels match the requested range.
- Export a JSON animation manifest and inspect its frame metadata.
- Switch render profiles, display constraints, preview modes, quality modes, and CRT display modes.
- Apply Classic Source and Modern Studio presets and confirm the Diagnostics window reports the expected profile/display/quality/AA/effect state.
- In canvas modes, test drag orbit, Shift/right-drag pan, wheel dolly, Scene Edit group picking, view-plane movement, depth movement, and reset camera.
- Start Live playback in Live Raytrace mode and confirm source frames advance, stale-frame count remains visible, and frames stay nonblank.
- Open Reference Compare, try overlay and side-by-side modes, and confirm the reference frame follows still, live, and buffered timeline source-frame changes.
- Check Diagnostics after still, live, and animation renders to confirm latency/stat telemetry updates.

WASM or a direct C port remains a research path rather than an active implementation target. The TypeScript renderer is currently more useful for auditability, deterministic tests, and fast UI iteration; a lower-level port should only be reconsidered if stricter original-renderer parity becomes the dominant project goal.
