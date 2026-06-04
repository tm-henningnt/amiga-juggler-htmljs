# Amiga Juggler HTML/JS Raytracer

A browser-based reconstruction of Eric Graham's 1987 Amiga Juggler raytracer. The project ports the original sphere-scene format and rendering behavior into TypeScript, then builds it into a standalone `index.html` file that can be opened directly from disk.

The goal is preservation first: keep the source scene data, HAM-style output path, camera math, sphere expansion, lighting, reflections, and animation workflow inspectable in ordinary web code.

## Current Status

- Loads the original `robot.dat`, `ele.dat`, and `dragon.dat` scene descriptions.
- Expands the original interpolated sphere controls into renderable sphere lists.
- Raytraces spheres, lamps, checkerboard ground, sky gradient, shadows, highlights, and recursive reflections.
- Includes render profiles for source-like HAM output, modern RGB output, and the original reflection quirk study path.
- Supports static renders, orbit/dolly/custom camera paths, named camera presets, animation rendering, playback, timeline scrubbing, PNG frame export, and browser-supported WebM/MP4 export.
- Supports selected animation frame ranges, source-cycle presets, and phase-labeled source frames while preserving absolute frame, source-frame, profile, render-time, camera-pose, and motion metadata.
- Reconstructs a 24-frame juggling motion cycle for the robot scene. The original `.dat` files do not contain animation tracks; the motion is fitted from historical rendered output, depth-corrected along the source camera rays, and kept explicit in `src/motion-data.ts` / `src/motion.ts`.
- Produces a single-file `index.html` bundle with no backend and no local server requirement.

## Source Material

Original source archive:

https://github.com/AlphaPixel/Eric-Graham-1987-Juggler-Raytracer-1.0

Additional historical rendering notes:

http://www.etwright.org/cghist/juggler_rt.html

Important source-truth note: the original archive has static text scene files and compressed rendered movie payloads (`movie.data` and `movie2.data`). It does not appear to include parametric juggler/body/ball motion data. This project therefore treats the juggling animation as a reconstruction target, not as parsed hidden data.

## Use

Open `index.html` in a browser.

The checked-in `index.html` is the standalone bundle. It contains the compiled JavaScript, CSS, embedded original `.dat` text, and reconstructed motion data.

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

Generated `dist/` and `dist-test/` files are ignored. The standalone `index.html` is intended to be committed after meaningful source changes.

## Architecture

- `src/types.ts` defines the shared render, scene, camera, animation, and motion contracts.
- `src/parser.ts` parses the original text `.dat` scene format.
- `src/scenes.ts` expands parsed scene controls into renderable worlds and creates observers.
- `src/renderer.ts` implements the CPU raytracer.
- `src/ham.ts` implements the source-like HAM pixel encoding path.
- `src/animation.ts` resolves camera paths and queues frame rendering.
- `src/motion-data.ts` stores reference-derived source-ray motion anchors.
- `src/motion.ts` resolves corrected source-frame scene motion and diagnostics for the juggler.
- `src/app.ts` wires the browser UI, rendering loop, playback, and export tools.
- `scripts/build-single.mjs` inlines compiled JS/CSS into `index.html`.

## Verification

The automated tests cover parser behavior, sphere expansion, reflection profiles, camera paths, reconstructed scene motion, animation queueing, HAM encoding, and render smoke output.

Manual browser verification should include:

- Open `index.html` from disk.
- Render the default robot scene at 320 x 200.
- Switch between static and reconstructed motion.
- Render a short animation at 160 x 100 or 320 x 200.
- Render a selected frame range and confirm exported frame numbers match the source timeline.
- Apply a camera preset and source-cycle preset, then confirm the animation facts show the expected source range.
- Scrub the timeline and confirm source-frame motion changes.
- Export WebM/MP4 if supported by the current browser.

## License And Attribution

This reconstruction is based on Eric Graham's 1987 Juggler raytracer and the AlphaPixel archival repository above. Preserve attribution to Eric Graham when reusing or publishing derivative work.
