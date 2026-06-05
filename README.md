# Amiga Juggler HTML/JS Raytracer

A browser-based reconstruction of Eric Graham's Amiga Juggler raytracer.

The Juggler was one of the early Amiga graphics showpieces: a reflective, sphere-built humanoid juggling chrome balls on a checkerboard floor. Eric Graham created the original raytraced animation in 1987, and the image became a defining demonstration of what the Amiga could do.

This project rebuilds that experience as ordinary browser code. It keeps the original scene data and source-like rendering behavior visible, while making the animation inspectable, adjustable, and exportable from a standalone HTML file.

## Origins

The main source for this reconstruction is AlphaPixel's recently published GitHub archive of Eric Graham's original 1987 Juggler Raytracer 1.0 source code and related data:

https://github.com/AlphaPixel/Eric-Graham-1987-Juggler-Raytracer-1.0

That archive preserves the recovered Amiga raytracer files, including the original `robot.dat`, `ele.dat`, and `dragon.dat` scene descriptions, rendered media, and notes about permission and attribution.

The original `.dat` files describe static scenes. They do not include reusable animation tracks for the juggler. The moving body and balls in this project are therefore reconstructed from historical output and related writeups rather than parsed from hidden scene data.

Additional sources used while reconstructing the render and motion behavior:

- Ernie Wright's historical Juggler notes: http://www.etwright.org/cghist/juggler_rt.html
- Meatfighter's Java Juggler reimplementation, used as a reference for body and juggling motion patterns: https://meatfighter.com/juggler/
- Historical movie and frame material from the AlphaPixel archive, including the original 320 x 200 `juggler.avi` conversion and compressed `movie.data` payloads, used to guide source-frame labeling and visual comparison.

## Use

Open `index.html` in a browser.

The file is self-contained. It can be loaded directly from disk and does not require a local server or backend.

From the browser UI you can:

- Render the recovered Juggler, elephant, and dragon scenes.
- Switch between Classic Source, Modern Studio, and Custom experience settings.
- Choose source-like HAM output, modern RGB output, display constraints, render quality, and CRT display modes.
- Inspect the reconstructed juggling motion frame by frame.
- Use double-buffered Live Raytrace playback for reconstructed source-frame animation without pre-rendering buffered frames.
- Orbit, pan, dolly, fly with WASD/mouse-look or gamepad, and temporarily edit scene groups from the canvas.
- Render still frames or animation ranges.
- Play back buffered animation frames.
- Export frames, video where the browser supports it, and structured animation metadata.
- Load another compatible `.dat` scene file from disk.

## Current Capabilities

- Original `robot.dat`, `ele.dat`, and `dragon.dat` scene parsing and standalone loading.
- Source-like and modern render profiles, including explicit source-quirk study mode.
- Reconstructed 24-frame juggling motion with ball, wrist, clearance, source-frame, and source-fit metadata.
- Embedded 24-frame historical reference fixture generated from the archival 320 x 200 movie, with overlay and side-by-side comparison controls.
- Camera paths, source-cycle presets, timeline scrubbing, and animation manifests with per-frame source-fit diagnostics.
- BVH-accelerated CPU raytracing, worker-backed still renders, live raytraced previews, and modern AA.
- Optional non-source soft shadows, contact ambient occlusion, depth of field, and live motion blur.
- Workbench 1.3 inspired UI with collapsible control windows and a compact command strip.
- Fly View mode with pointer-lock mouse look, keyboard movement, and gamepad stick/trigger input.
- Render telemetry, source-fit diagnostics, and material/lighting inspection facts in the Diagnostics window.

## Documentation

Technical notes, build commands, module layout, and verification guidance live in [TECHNICAL.md](TECHNICAL.md).

Ongoing work and research targets live in [TODO.md](TODO.md). Development history is recorded in [LOG.md](LOG.md).

## Attribution

This reconstruction is based on Eric Graham's 1987 Juggler raytracer and the AlphaPixel archival repository above. Preserve attribution to Eric Graham when reusing or publishing derivative work.
