# TODO

This file is a forward-looking backlog. Completed foundations belong in `LOG.md`; stable architecture and usage facts belong in `TECHNICAL.md` and `README.md`.

## Near-Term Validation

- Do a hands-on browser smoke for input and export paths:
  - Load standalone `index.html` directly from disk.
  - Test drag orbit, Shift/right-drag pan, wheel dolly, Scene Edit movement, Scene Edit depth movement, and reset camera.
  - Test Fly View pointer-lock mouse look, WASD/QE movement, gamepad movement/look, and Fly View exit.
  - Confirm buffered animation PNG/video/manifest export still works in the target browser.

## Historical Accuracy

- Decode or document the `movie.data` and `movie2.data` compressed HAM movie formats.
- Continue fitting the reconstructed juggling motion frame-by-frame against historical frames.
- Continue refining robot body pose, hand timing, and ball arcs until key frames match the source output more closely.
- Preserve evidence for every source-truth decision in code comments, documentation, or reference fixtures.

## Rendering Fidelity And Performance

- Continue validating camera setup, sphere hierarchy, material IDs, lighting, and reflections against known original frames.
- Use the embedded historical reference fixture and render telemetry to tune camera, lighting, material, and modern-effect defaults against known original frames.
- Revisit WASM or direct C-port research only if stricter renderer parity becomes more valuable than TypeScript maintainability.

## Animation, Export, And Data

- Use structured manifests to drive future source-frame comparison and motion-fitting tools.
- Define a future JSON scene format only after there is a concrete import/export workflow that needs it.
- Add import/export tools for reconstructed motion keyframes if motion fitting starts happening outside source code.
- Add validation errors that explain malformed `.dat` scene or motion data.

## Deferred Or Probably Not Worth It Yet

- GIF export: defer unless a browser-compatible encoder is introduced and users need GIF specifically.
- Batch PNG zip packaging: defer until archive/zip support is already present for another reason.
- WebGPU renderer: research only after CPU/WASM parity and UX work stop being higher leverage.
- Additional historical scenes and comparison pages: keep as a later content project, not core reconstruction work.
