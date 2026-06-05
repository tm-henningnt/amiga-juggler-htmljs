# TODO

This file is a forward-looking backlog. Completed foundations belong in `LOG.md`; stable architecture and usage facts belong in `TECHNICAL.md` and `README.md`.

## Near-Term Validation

- Do a hands-on browser smoke for input and export paths:
  - Load standalone `index.html` directly from disk.
  - Test drag orbit, Shift/right-drag pan, wheel dolly, Scene Edit movement, Scene Edit depth movement, and reset camera.
  - Test Fly View pointer-lock mouse look, WASD/QE movement, gamepad movement/look, and Fly View exit.
  - Confirm buffered animation PNG/video/manifest export still works in the target browser.

## Historical Accuracy

- Decode or further document the compressed `movie.data` / `movie2.data` HAM frame payload beyond the now-probed header, palette, and payload sizes.
- Use Source Fit diagnostics to tune reconstructed body pose, hand timing, ball arcs, and camera assumptions against key historical frames.
- Improve source-frame ball anchors with manual labels or a more reliable tracker before using them as hard fitting targets.
- Preserve evidence for every source-truth decision in code comments, documentation, reference fixtures, or manifest/source-fit metadata.
- Avoid pixel-perfect targets unless a less-compressed original frame source is available.

## Rendering Fidelity And Performance

- Continue validating camera setup, sphere hierarchy, material IDs, lighting, and reflections against known original frames.
- Use Source Fit diagnostics and render telemetry to tune source-camera, lighting, material, and source-profile defaults against known original frames.
- Keep modern effects outside Classic Source unless a source-backed reason exists.
- Revisit WASM or direct C-port research only if stricter renderer parity becomes more valuable than TypeScript maintainability.

## Animation, Export, And Data

- Use exported manifest `sourceFit` data to drive future source-frame comparison and motion-fitting tools.
- Define a future JSON scene format only after there is a concrete import/export workflow that needs it.
- Add import/export tools for reconstructed motion keyframes if motion fitting starts happening outside source code.
- Add validation errors that explain malformed `.dat` scene or motion data.

## Deferred Or Probably Not Worth It Yet

- GIF export: defer unless a browser-compatible encoder is introduced and users need GIF specifically.
- Batch PNG zip packaging: defer until archive/zip support is already present for another reason.
- WebGPU renderer: research only after CPU/WASM parity and UX work stop being higher leverage.
- Additional historical scenes and comparison pages: keep as a later content project, not core reconstruction work.
