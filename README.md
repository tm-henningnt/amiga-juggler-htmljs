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
- Historical movie and frame material from the AlphaPixel archive, used to guide source-frame labeling and visual comparison.

## Use

Open `index.html` in a browser.

The file is self-contained. It can be loaded directly from disk and does not require a local server or backend.

From the browser UI you can:

- Render the recovered Juggler, elephant, and dragon scenes.
- Switch between source-like and modern render profiles.
- Inspect the reconstructed juggling motion frame by frame.
- Render still frames or animation ranges.
- Play back buffered animation frames.
- Export frames, video where the browser supports it, and structured animation metadata.
- Load another compatible `.dat` scene file from disk.

## Documentation

Technical notes, build commands, module layout, and verification guidance live in [TECHNICAL.md](TECHNICAL.md).

Ongoing work and research targets live in [TODO.md](TODO.md). Development history is recorded in [LOG.md](LOG.md).

## Attribution

This reconstruction is based on Eric Graham's 1987 Juggler raytracer and the AlphaPixel archival repository above. Preserve attribution to Eric Graham when reusing or publishing derivative work.
