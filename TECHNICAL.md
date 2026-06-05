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
- Opt-in modern quality anti-aliasing.
- Deterministic non-source soft shadows, contact ambient occlusion, and depth of field through `ModernEffectsSettings`.
- Live motion-blur accumulation for source-frame playback.
- Optional RGB, OCS 12-bit, Extra Half-Brite-style, and approximate HAM6 display constraints.
- Render profiles that make historically relevant quirks explicit.
- Fast wireframe and solid previews for interactive scene inspection.
- Live raytraced previews for session camera and transform work.

## Animation Pipeline

Animation resolves two things for each frame:

- Camera pose.
- Scene pose.

Camera motion can use static, orbit, dolly, arc, or custom keyframe paths. Scene motion for the juggler is reconstructed from source-frame phase data, ballistic ball arcs, Meatfighter-style body motion, and limb posing.

Rendered animation frames retain metadata for inspection and export, including source-frame labels, camera pose, render profile, modern effects, ball positions, wrist positions, clearances, timing, and render statistics.

Live Raytrace playback is separate from buffered animation playback. It advances reconstructed source frames at the selected FPS and starts a new interactive-quality raytrace only when the previous live render is no longer active. If the clock falls behind, stale source frames are skipped and counted in diagnostics instead of queued.

Modern effects are explicit non-source metadata. Classic Source applies disabled effect settings; Modern Studio enables conservative soft shadow and contact AO defaults while keeping DOF and motion blur available as advanced opt-ins.

## UI And Experience Model

The UI keeps a Workbench 1.3 inspired shell while separating the first-run flow from dense render controls.

The primary command strip exposes:

- Experience preset.
- View mode.
- Live playback.
- Still render.
- Abort.

Detailed controls are grouped into collapsible Workbench windows for Scene, Camera, Render Details, Modern Effects, Animation, and Diagnostics.

Experience presets are high-level defaults, not locked modes:

- Classic Source selects still Raytrace, the reference/source-like profile, legacy quality, AA off, source camera, scanline CRT, and disabled modern effects.
- Modern Studio selects Live Raytrace, modern RGB output, modern quality, adaptive AA, editable orbit/free camera behavior, soft-glow CRT, and conservative non-source effects.
- Any manual advanced edit marks the experience as Custom.

Canvas interaction follows a standard viewport model. Normal mode uses drag to orbit, Shift/right-drag to pan, and wheel to dolly. Scene Edit mode uses click/drag for group movement in the view plane and Shift-drag for view-depth movement.

## Module Layout

- `src/types.ts` defines shared scene, render, camera, animation, and motion contracts.
- `src/experience.ts` defines Classic Source, Modern Studio, and modern effect defaults.
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
- `src/motion-data.ts` stores reconstruction constants and reference-derived screen anchors.
- `src/motion.ts` resolves reconstructed juggler ball, body, limb, and diagnostic motion.
- `src/app.ts` wires the browser UI, rendering loop, playback, and export actions.
- `scripts/build-single.mjs` inlines compiled JS and CSS into `index.html`.

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

Generated `dist/` and `dist-test/` files are ignored. The checked-in `index.html` should be rebuilt after meaningful source changes.

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
