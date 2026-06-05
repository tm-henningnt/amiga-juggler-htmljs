# TODO

This file is a forward-looking backlog. Completed foundations belong in `LOG.md`; stable architecture and usage facts belong in `TECHNICAL.md` and `README.md`.

## Near-Term Priorities

- Browser-smoke the Modern Studio pass once browser automation is available again:
  - Load standalone `index.html` directly from disk.
  - Apply Classic Source and verify a source-like still render is nonblank.
  - Apply Modern Studio and verify Live Raytrace renders with modern indicators.
  - Test drag orbit, Shift/right-drag pan, wheel dolly, Scene Edit movement, Scene Edit depth movement, and reset camera.
  - Test Fly View pointer-lock mouse look, WASD/QE movement, gamepad movement/look, and Fly View exit.
  - Start Live playback and confirm reconstructed source frames advance with nonblank frames.
  - Confirm buffered animation render/export still works.
- Improve long animation progress reporting so frame index, source frame, elapsed time, and expected remaining time are clear during renders.
- Add a side-by-side or overlay comparison mode for rendered frames versus historical reference frames.
- Add material and lighting inspection controls without making source-like defaults ambiguous.

## Historical Accuracy

- Decode or document the `movie.data` and `movie2.data` compressed HAM movie formats.
- Extract the full 24-frame historical movie sequence into a committed test/reference fixture if licensing and bundle size remain acceptable.
- Continue fitting the reconstructed juggling motion frame-by-frame against historical frames.
- Continue refining robot body pose, hand timing, and ball arcs until key frames match the source output more closely.
- Preserve evidence for every source-truth decision in code comments, documentation, or reference fixtures.

## Rendering Fidelity And Performance

- Continue validating camera setup, sphere hierarchy, material IDs, lighting, and reflections against known original frames.
- Add measured render latency telemetry for still renders, live renders, and animation renders.
- Tune non-source soft shadows, contact AO, depth of field, and motion blur against browser performance budgets.
- Investigate a WASM or direct C-port path only if stricter renderer parity becomes more valuable than TypeScript maintainability.

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
