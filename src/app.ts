namespace Juggler.App {
  interface ActiveScene {
    source: SceneSource;
    parsed: ParsedScene;
    world: World;
  }

  const sceneSelect = document.getElementById("scene") as HTMLSelectElement;
  const fileInput = document.getElementById("file") as HTMLInputElement;
  const sceneMotionSelect = document.getElementById("sceneMotion") as HTMLSelectElement;
  const motionFrameInput = document.getElementById("motionFrame") as HTMLInputElement;
  const resolutionSelect = document.getElementById("resolution") as HTMLSelectElement;
  const profileSelect = document.getElementById("renderProfile") as HTMLSelectElement;
  const profileIndicators = document.getElementById("profileIndicators") as HTMLElement;
  const rowsPerTickInput = document.getElementById("rowsPerTick") as HTMLInputElement;
  const maxDepthInput = document.getElementById("maxDepth") as HTMLInputElement;
  const orbitEnabledInput = document.getElementById("orbitEnabled") as HTMLInputElement;
  const orbitAngleInput = document.getElementById("orbitAngle") as HTMLInputElement;
  const orbitRadiusInput = document.getElementById("orbitRadius") as HTMLInputElement;
  const renderButton = document.getElementById("render") as HTMLButtonElement;
  const abortButton = document.getElementById("abort") as HTMLButtonElement;
  const statusElement = document.getElementById("status") as HTMLSpanElement;
  const progressElement = document.getElementById("progress") as HTMLProgressElement;
  const sceneFacts = document.getElementById("sceneFacts") as HTMLElement;
  const cameraFacts = document.getElementById("cameraFacts") as HTMLElement;
  const animationFacts = document.getElementById("animationFacts") as HTMLElement;
  const animationCameraPresetSelect = document.getElementById("animationCameraPreset") as HTMLSelectElement;
  const animationPathSelect = document.getElementById("animationPath") as HTMLSelectElement;
  const animationCyclePresetSelect = document.getElementById("animationCyclePreset") as HTMLSelectElement;
  const animationFramesInput = document.getElementById("animationFrames") as HTMLInputElement;
  const animationRangeStartInput = document.getElementById("animationRangeStart") as HTMLInputElement;
  const animationRangeEndInput = document.getElementById("animationRangeEnd") as HTMLInputElement;
  const animationFpsInput = document.getElementById("animationFps") as HTMLInputElement;
  const animationStartAngleInput = document.getElementById("animationStartAngle") as HTMLInputElement;
  const animationEndAngleInput = document.getElementById("animationEndAngle") as HTMLInputElement;
  const animationOrbitRadiusInput = document.getElementById("animationOrbitRadius") as HTMLInputElement;
  const animationOrbitHeightInput = document.getElementById("animationOrbitHeight") as HTMLInputElement;
  const animationDollyStartInput = document.getElementById("animationDollyStart") as HTMLInputElement;
  const animationDollyEndInput = document.getElementById("animationDollyEnd") as HTMLInputElement;
  const customKeyframesInput = document.getElementById("customKeyframes") as HTMLTextAreaElement;
  const renderAnimationButton = document.getElementById("renderAnimation") as HTMLButtonElement;
  const clearAnimationButton = document.getElementById("clearAnimation") as HTMLButtonElement;
  const timelineInput = document.getElementById("timeline") as HTMLInputElement;
  const playAnimationButton = document.getElementById("playAnimation") as HTMLButtonElement;
  const pauseAnimationButton = document.getElementById("pauseAnimation") as HTMLButtonElement;
  const stopAnimationButton = document.getElementById("stopAnimation") as HTMLButtonElement;
  const exportWebmButton = document.getElementById("exportWebm") as HTMLButtonElement;
  const exportMp4Button = document.getElementById("exportMp4") as HTMLButtonElement;
  const exportPngButton = document.getElementById("exportPng") as HTMLButtonElement;
  const exportManifestButton = document.getElementById("exportManifest") as HTMLButtonElement;
  const canvas = document.getElementById("frame") as HTMLCanvasElement;
  const context = canvas.getContext("2d");

  const sources = Scenes.builtInSceneSources();
  let active: ActiveScene;
  let abortToken = 0;
  let animationFrames: RenderedFrame[] = [];
  let bufferedAnimationSettings: CameraPathSettings | null = null;
  let bufferedMotionSettings: SceneMotionSettings | null = null;
  let playbackTimer = 0;
  let playbackIndex = 0;

  export function start(): void {
    if (!context) {
      throw new Error("Canvas 2D context is unavailable");
    }

    for (const source of sources) {
      const option = document.createElement("option");
      option.value = source.id;
      option.textContent = source.name;
      sceneSelect.appendChild(option);
    }
    for (const profile of Profiles.ALL) {
      const option = document.createElement("option");
      option.value = profile.id;
      option.textContent = profile.label;
      profileSelect.appendChild(option);
    }
    for (const path of Animation.PATHS) {
      const option = document.createElement("option");
      option.value = path.id;
      option.textContent = path.label;
      animationPathSelect.appendChild(option);
    }
    for (const preset of Animation.CAMERA_PRESETS) {
      const option = document.createElement("option");
      option.value = preset.id;
      option.textContent = preset.label;
      animationCameraPresetSelect.appendChild(option);
    }
    for (const preset of Animation.CYCLE_PRESETS) {
      const option = document.createElement("option");
      option.value = preset.id;
      option.textContent = preset.label;
      animationCyclePresetSelect.appendChild(option);
    }
    animationPathSelect.value = Animation.defaultSettings().pathId;
    animationCameraPresetSelect.value = "custom";
    animationCyclePresetSelect.value = "full-cycle";

    sceneSelect.addEventListener("change", () => {
      const source = sources.find((candidate) => candidate.id === sceneSelect.value) ?? sources[0];
      setActiveSource(source);
    });
    fileInput.addEventListener("change", handleFile);
    sceneMotionSelect.addEventListener("change", () => {
      refreshMotionFrameBounds();
      resetAnimationBuffer();
      renderFacts();
      refreshAnimationFacts();
    });
    motionFrameInput.addEventListener("input", () => {
      resetAnimationBuffer();
      renderFacts();
      refreshAnimationFacts();
    });
    renderButton.addEventListener("click", () => renderStill());
    abortButton.addEventListener("click", abortWork);
    profileSelect.addEventListener("change", () => {
      resetAnimationBuffer();
      refreshProfileIndicators();
    });
    profileSelect.addEventListener("input", refreshProfileIndicators);
    renderAnimationButton.addEventListener("click", () => renderAnimation());
    clearAnimationButton.addEventListener("click", clearAnimationFrames);
    playAnimationButton.addEventListener("click", playAnimation);
    pauseAnimationButton.addEventListener("click", pauseAnimation);
    stopAnimationButton.addEventListener("click", stopAnimation);
    exportWebmButton.addEventListener("click", () => exportVideo("webm"));
    exportMp4Button.addEventListener("click", () => exportVideo("mp4"));
    exportPngButton.addEventListener("click", () => exportPngFrames());
    exportManifestButton.addEventListener("click", () => exportManifest());
    timelineInput.addEventListener("input", () => {
      pauseAnimation();
      showFrame(Number(timelineInput.value) || 0);
    });
    animationCameraPresetSelect.addEventListener("change", applyAnimationCameraPreset);
    animationCyclePresetSelect.addEventListener("change", applyAnimationCyclePreset);

    for (const control of [orbitEnabledInput, orbitAngleInput, orbitRadiusInput, resolutionSelect]) {
      control.addEventListener("change", refreshCameraFacts);
      control.addEventListener("input", refreshCameraFacts);
    }
    for (const control of [
      animationPathSelect,
      animationStartAngleInput,
      animationEndAngleInput,
      animationOrbitRadiusInput,
      animationOrbitHeightInput,
      animationDollyStartInput,
      animationDollyEndInput,
      customKeyframesInput
    ]) {
      control.addEventListener("change", markCameraPresetCustom);
      control.addEventListener("input", markCameraPresetCustom);
    }
    for (const control of [animationFramesInput, animationRangeStartInput, animationRangeEndInput]) {
      control.addEventListener("change", markCyclePresetCustom);
      control.addEventListener("input", markCyclePresetCustom);
    }
    for (const control of [animationFpsInput]) {
      control.addEventListener("change", refreshAnimationFacts);
      control.addEventListener("input", refreshAnimationFacts);
    }

    setActiveSource(sources[0]);
    refreshProfileIndicators();
    renderStill();
  }

  function setActiveSource(source: SceneSource): void {
    try {
      const parsed = Parser.parseDatScene(source.datText, source.name);
      const world = Scenes.buildWorld(parsed);
      active = { source, parsed, world };
      resetAnimationBuffer();
      refreshMotionOptions();
      writeDefaultCustomKeyframes();
      setStatus(`Loaded ${source.name}`);
      renderFacts();
      refreshCameraFacts();
      refreshAnimationFacts();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
  }

  function handleFile(): void {
    const file = fileInput.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const source: SceneSource = {
        id: `file:${file.name}`,
        name: file.name,
        datText: String(reader.result ?? ""),
        sourcePath: file.name
      };
      setActiveSource(source);
    });
    reader.readAsText(file);
  }

  function renderStill(): void {
    if (!context || !active) {
      return;
    }

    abortWork();
    const token = abortToken;
    const [width, height] = parseResolution();
    const motionSettings = readSceneMotionSettings();
    const renderWorld = Motion.resolveWorld(active.parsed, active.world, motionSettings, motionSettings.sourceFrame);
    const observer = Scenes.createObserver(active.parsed, active.world, width, height, readOrbitSettings());
    const profile = Profiles.byId(profileSelect.value);
    const renderer = new Renderer.FrameRenderer(renderWorld, observer, readRenderOptions(profile));
    const rowsPerTick = readRowsPerTick();
    const image = new ImageData(renderer.data as ImageDataArray, width, height);

    canvas.width = width;
    canvas.height = height;
    context.imageSmoothingEnabled = false;
    renderButton.disabled = true;
    progressElement.value = 0;
    setStatus(
      `Rendering ${active.source.name}, ${Motion.labelFor(motionSettings.motionId)} ` +
      `(${Motion.motionSummary(active.parsed, motionSettings)}) at ${width} x ${height} with ${profile.label}`
    );

    const started = performance.now();
    const tick = (): void => {
      if (token !== abortToken) {
        renderButton.disabled = false;
        return;
      }

      renderer.renderRows(rowsPerTick);
      context.putImageData(image, 0, 0);
      progressElement.value = renderer.progress();

      if (!renderer.done()) {
        window.requestAnimationFrame(tick);
        return;
      }

      const seconds = (performance.now() - started) / 1000;
      renderButton.disabled = false;
      setStatus(
        `Done in ${seconds.toFixed(2)}s, ${profile.label}, ${active.world.spheres.length} spheres, ` +
        `${Motion.motionSummary(active.parsed, motionSettings)}, ` +
        `${renderer.stats.rays} rays, ${renderer.stats.mirrorFallbacks} source-reflection fallbacks`
      );
    };

    window.requestAnimationFrame(tick);
  }

  function renderAnimation(): void {
    if (!context || !active) {
      return;
    }

    abortWork();
    clearPlaybackOnly();
    animationFrames = [];
    playbackIndex = 0;
    updateAnimationButtons(true);

    let settings: CameraPathSettings;
    try {
      settings = readAnimationSettings();
    } catch (error) {
      updateAnimationButtons(false);
      setStatus(error instanceof Error ? error.message : String(error));
      return;
    }

    const token = abortToken;
    const [width, height] = parseResolution();
    const profile = Profiles.byId(profileSelect.value);
    const motionSettings = readSceneMotionSettings();
    bufferedAnimationSettings = copyAnimationSettings(settings);
    bufferedMotionSettings = { ...motionSettings };
    const renderer = new Animation.AnimationRenderer(
      active.parsed,
      active.world,
      width,
      height,
      readRenderOptions(profile),
      settings,
      motionSettings
    );
    const rowsPerTick = readRowsPerTick();
    canvas.width = width;
    canvas.height = height;
    context.imageSmoothingEnabled = false;
    timelineInput.max = "0";
    timelineInput.value = "0";
    progressElement.value = 0;
    setStatus(
      `Rendering frames ${settings.rangeStartFrame + 1}-${settings.rangeEndFrame + 1} of ${settings.frameCount} with ` +
      `${Animation.PATHS.find((path) => path.id === settings.pathId)?.label ?? settings.pathId} and ` +
      `${Motion.labelFor(motionSettings.motionId)}`
    );

    const started = performance.now();
    const tick = (): void => {
      if (token !== abortToken) {
        updateAnimationButtons(false);
        return;
      }

      const progress = renderer.step(rowsPerTick);
      if (progress.currentData) {
        drawImageData(progress.currentData, width, height);
      }
      if (progress.completedFrame) {
        animationFrames = renderer.frames;
        timelineInput.max = String(Math.max(0, animationFrames.length - 1));
        timelineInput.value = String(animationFrames.length - 1);
      }
      progressElement.value = progress.overallProgress;
      setStatus(
        `Animation frame ${Math.min(progress.frameIndex + 1, progress.frameCount)}/${progress.frameCount}, ` +
        `${Motion.labelFor(motionSettings.motionId)}, ` +
        `${Math.round(progress.rowProgress * 100)}% row pass`
      );

      if (!progress.done) {
        window.requestAnimationFrame(tick);
        return;
      }

      const seconds = (performance.now() - started) / 1000;
      updateAnimationButtons(false);
      refreshAnimationFacts();
      setStatus(
        `Animation ready: ${animationFrames.length} frames at ${settings.fps} fps in ${seconds.toFixed(2)}s, ` +
        `${Motion.labelFor(motionSettings.motionId)}`
      );
    };

    window.requestAnimationFrame(tick);
  }

  function playAnimation(): void {
    if (!animationFrames.length) {
      return;
    }
    pauseAnimation();
    const fps = readAnimationSettingsLenient().fps;
    playAnimationButton.disabled = true;
    pauseAnimationButton.disabled = false;
    stopAnimationButton.disabled = false;
    playbackTimer = window.setInterval(() => {
      showFrame(playbackIndex);
      playbackIndex = (playbackIndex + 1) % animationFrames.length;
    }, 1000 / fps);
  }

  function pauseAnimation(): void {
    clearPlaybackOnly();
    updateAnimationButtons(false);
  }

  function stopAnimation(): void {
    clearPlaybackOnly();
    playbackIndex = 0;
    showFrame(0);
    updateAnimationButtons(false);
  }

  function showFrame(index: number): void {
    if (!animationFrames.length) {
      return;
    }
    const safeIndex = Math.max(0, Math.min(animationFrames.length - 1, index));
    const frame = animationFrames[safeIndex];
    drawImageData(frame.data, frame.width, frame.height);
    timelineInput.value = String(safeIndex);
    playbackIndex = safeIndex;
    const fps = readAnimationSettingsLenient().fps;
    const sourceFrame = frame.motionId === "juggler-reconstructed"
      ? `, source ${Motion.sourceFrameLabel(frame.sceneFrame)}`
      : "";
    const clearance = frame.motionClearance === null ? "" : `, clearance ${frame.motionClearance.toFixed(2)}`;
    const ballSpacing = frame.motionBallClearance === null ? "" : `, ball spacing ${frame.motionBallClearance.toFixed(2)}`;
    setStatus(`Frame ${safeIndex + 1}/${animationFrames.length}, output ${frame.index + 1}${sourceFrame}${clearance}${ballSpacing} at ${fps} fps`);
  }

  function clearAnimationFrames(): void {
    abortWork();
    animationFrames = [];
    playbackIndex = 0;
    timelineInput.max = "0";
    timelineInput.value = "0";
    progressElement.value = 0;
    updateAnimationButtons(false);
    refreshAnimationFacts();
    setStatus("Animation frames cleared.");
  }

  async function exportVideo(kind: "webm" | "mp4"): Promise<void> {
    if (!animationFrames.length) {
      return;
    }
    const mimeType = pickVideoMimeType(kind);
    if (!mimeType || !canvas.captureStream || typeof MediaRecorder === "undefined") {
      setStatus(`${kind.toUpperCase()} export is not supported in this browser.`);
      return;
    }

    pauseAnimation();
    const fps = readAnimationSettingsLenient().fps;
    const stream = canvas.captureStream(fps);
    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(stream, { mimeType });
    const stopped = new Promise<Blob>((resolve) => {
      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size) {
          chunks.push(event.data);
        }
      });
      recorder.addEventListener("stop", () => {
        stream.getTracks().forEach((track) => track.stop());
        resolve(new Blob(chunks, { type: mimeType }));
      });
    });

    recorder.start();
    let index = 0;
    const delay = 1000 / fps;
    const drawNext = (): void => {
      if (index >= animationFrames.length) {
        window.setTimeout(() => recorder.stop(), delay);
        return;
      }
      showFrame(index);
      index += 1;
      window.setTimeout(drawNext, delay);
    };
    drawNext();

    const blob = await stopped;
    const extension = kind === "mp4" ? "mp4" : "webm";
    downloadBlob(blob, `${active.source.id}-${animationFrames[0].index + 1}-${animationFrames[animationFrames.length - 1].index + 1}.${extension}`);
    setStatus(`Exported ${extension.toUpperCase()} (${formatBytes(blob.size)})`);
  }

  async function exportPngFrames(): Promise<void> {
    if (!animationFrames.length) {
      return;
    }
    pauseAnimation();
    const exportCanvas = document.createElement("canvas");
    const exportContext = exportCanvas.getContext("2d");
    if (!exportContext) {
      setStatus("PNG export failed: no canvas context.");
      return;
    }

    for (const frame of animationFrames) {
      exportCanvas.width = frame.width;
      exportCanvas.height = frame.height;
      exportContext.putImageData(new ImageData(frame.data as ImageDataArray, frame.width, frame.height), 0, 0);
      const blob = await canvasToBlob(exportCanvas);
      downloadBlob(blob, `${active.source.id}-${String(frame.index + 1).padStart(4, "0")}.png`);
    }
    setStatus(`Exported ${animationFrames.length} PNG frames.`);
  }

  function exportManifest(): void {
    if (!active || !animationFrames.length) {
      return;
    }

    pauseAnimation();
    const settings = bufferedAnimationSettings ?? readAnimationSettingsLenient();
    const motionSettings = bufferedMotionSettings ?? readSceneMotionSettings();
    const diagnostics = Motion.diagnostics(active.parsed, active.world, motionSettings);
    const manifest = Animation.createManifest(
      active.source,
      active.world,
      settings,
      motionSettings,
      diagnostics,
      animationFrames
    );
    const text = JSON.stringify(manifest, null, 2);
    const blob = new Blob([text], { type: "application/json" });
    downloadBlob(blob, `${active.source.id}-${animationFrames[0].index + 1}-${animationFrames[animationFrames.length - 1].index + 1}-manifest.json`);
    setStatus(`Exported JSON manifest (${formatBytes(blob.size)})`);
  }

  function abortWork(): void {
    abortToken += 1;
    clearPlaybackOnly();
    renderButton.disabled = false;
    updateAnimationButtons(false);
  }

  function clearPlaybackOnly(): void {
    if (playbackTimer) {
      window.clearInterval(playbackTimer);
    }
    playbackTimer = 0;
  }

  function updateAnimationButtons(rendering: boolean): void {
    renderAnimationButton.disabled = rendering;
    clearAnimationButton.disabled = rendering || !animationFrames.length;
    playAnimationButton.disabled = rendering || !animationFrames.length || !!playbackTimer;
    pauseAnimationButton.disabled = rendering || !playbackTimer;
    stopAnimationButton.disabled = rendering || !animationFrames.length;
    exportWebmButton.disabled = rendering || !animationFrames.length || !pickVideoMimeType("webm");
    exportMp4Button.disabled = rendering || !animationFrames.length || !pickVideoMimeType("mp4");
    exportPngButton.disabled = rendering || !animationFrames.length;
    exportManifestButton.disabled = rendering || !animationFrames.length;
  }

  function refreshMotionOptions(): void {
    const previous = sceneMotionSelect.value as SceneMotionId | "";
    const options = Motion.availableMotions(active.parsed);
    sceneMotionSelect.innerHTML = "";
    for (const motion of options) {
      const option = document.createElement("option");
      option.value = motion.id;
      option.textContent = motion.label;
      sceneMotionSelect.appendChild(option);
    }

    let preferred: SceneMotionId = "static";
    if (previous && options.some((motion) => motion.id === previous)) {
      preferred = previous;
    } else if (options.some((motion) => motion.id === "juggler-reconstructed")) {
      preferred = "juggler-reconstructed";
    }
    sceneMotionSelect.value = preferred;
    refreshMotionFrameBounds();
  }

  function refreshMotionFrameBounds(): void {
    const motionId = sceneMotionSelect.value as SceneMotionId;
    const frameCount = Motion.sourceFrameCount(motionId);
    motionFrameInput.min = "0";
    motionFrameInput.max = String(Math.max(0, frameCount - 1));
    motionFrameInput.step = "1";
    motionFrameInput.disabled = frameCount <= 1;
    motionFrameInput.value = String(clampInt(Number(motionFrameInput.value), 0, Math.max(0, frameCount - 1), 0));
  }

  function renderFacts(): void {
    const controls = Scenes.summarizeControls(active.parsed);
    const motionSettings = readSceneMotionSettings();
    const diagnostics = Motion.diagnostics(active.parsed, active.world, motionSettings);
    setFacts(sceneFacts, [
      ["Groups", String(controls.groups)],
      ["Controls", String(controls.controls)],
      ["Interpolated", String(controls.interpolatedSegments)],
      ["Spheres", String(active.world.spheres.length)],
      ["Lamps", String(active.world.lamps.length)],
      ["Camera paths", Animation.sceneHasCameraPathData(active.parsed) ? "embedded" : "none in .dat"],
      ["Scene motion", Motion.labelFor(motionSettings.motionId)],
      ["Motion source", Motion.motionSummary(active.parsed, motionSettings)],
      ["Ball clearance", diagnostics ? diagnostics.minBodyClearance.toFixed(2) : "n/a"],
      ["Ball spacing", diagnostics ? diagnostics.minBallClearance.toFixed(2) : "n/a"],
      ["Hand contact", diagnostics ? diagnostics.maxHandContactError.toFixed(2) : "n/a"],
      ["Lamp exposure", active.world.lampExposure.toFixed(2)]
    ]);
  }

  function refreshCameraFacts(): void {
    if (!active) {
      return;
    }
    const [width, height] = parseResolution();
    const observer = Scenes.createObserver(active.parsed, active.world, width, height, readOrbitSettings());
    setFacts(cameraFacts, [
      ["Position", Math3.formatVec(observer.position, 2)],
      ["Altitude", `${(observer.altitudeRad * 180 / Math.PI).toFixed(2)} deg`],
      ["Azimuth", `${(observer.azimuthRad * 180 / Math.PI).toFixed(2)} deg`],
      ["Focal", observer.focalLength.toFixed(3)]
    ]);
  }

  function refreshAnimationFacts(): void {
    if (!active) {
      return;
    }
    const settings = readAnimationSettingsLenient();
    const motionSettings = readSceneMotionSettings();
    const diagnostics = Motion.diagnostics(active.parsed, active.world, motionSettings);
    const rangeCount = settings.rangeEndFrame - settings.rangeStartFrame + 1;
    const seconds = rangeCount / settings.fps;
    setFacts(animationFacts, [
      ["Buffered frames", String(animationFrames.length)],
      ["Duration", `${seconds.toFixed(2)}s`],
      ["Camera preset", cameraPresetLabel(animationCameraPresetSelect.value as CameraPresetId)],
      ["Cycle preset", cyclePresetLabel(animationCyclePresetSelect.value as MotionCyclePresetId)],
      ["Range", `${settings.rangeStartFrame + 1}-${settings.rangeEndFrame + 1}`],
      ["Source range", Motion.sourceRangeLabel(motionSettings, settings.rangeStartFrame, settings.rangeEndFrame, settings.frameCount)],
      ["Scene motion", Motion.labelFor(motionSettings.motionId)],
      ["Motion offset", Motion.motionSummary(active.parsed, motionSettings)],
      ["Min clearance", diagnostics ? diagnostics.minBodyClearance.toFixed(2) : "n/a"],
      ["Min ball spacing", diagnostics ? diagnostics.minBallClearance.toFixed(2) : "n/a"],
      ["WebM", pickVideoMimeType("webm") ? "available" : "unavailable"],
      ["MP4", pickVideoMimeType("mp4") ? "available" : "unavailable"],
      ["JSON manifest", animationFrames.length ? "available" : "render frames first"]
    ]);
    updateAnimationButtons(false);
  }

  function readAnimationSettings(): CameraPathSettings {
    const settings = readAnimationSettingsLenient();
    if (settings.pathId === "custom-keyframes") {
      settings.customKeyframes = Animation.parseCustomKeyframes(customKeyframesInput.value);
    }
    return settings;
  }

  function readAnimationSettingsLenient(): CameraPathSettings {
    const frameCount = clampInt(Number(animationFramesInput.value), 1, 360, 24);
    const rangeStart = clampInt(Number(animationRangeStartInput.value), 1, frameCount, 1) - 1;
    const rangeEnd = clampInt(Number(animationRangeEndInput.value), 1, frameCount, frameCount) - 1;
    const safeStart = Math.min(rangeStart, rangeEnd);
    const safeEnd = Math.max(rangeStart, rangeEnd);
    animationRangeStartInput.max = String(frameCount);
    animationRangeEndInput.max = String(frameCount);
    animationRangeStartInput.value = String(safeStart + 1);
    animationRangeEndInput.value = String(safeEnd + 1);
    return {
      pathId: animationPathSelect.value as CameraPathId,
      frameCount,
      rangeStartFrame: safeStart,
      rangeEndFrame: safeEnd,
      fps: clampInt(Number(animationFpsInput.value), 1, 60, 12),
      startAngleDeg: readNumber(animationStartAngleInput.value, 0),
      endAngleDeg: readNumber(animationEndAngleInput.value, 360),
      orbitRadius: clampNumber(Number(animationOrbitRadiusInput.value), 1, 120, 10),
      orbitHeight: clampNumber(Number(animationOrbitHeightInput.value), -80, 80, 0),
      dollyStartRadius: clampNumber(Number(animationDollyStartInput.value), 1, 160, 14),
      dollyEndRadius: clampNumber(Number(animationDollyEndInput.value), 1, 160, 7),
      customKeyframes: []
    };
  }

  function applyAnimationCameraPreset(): void {
    const presetId = animationCameraPresetSelect.value as CameraPresetId;
    const settings = Animation.applyCameraPreset(readAnimationSettingsLenient(), presetId);
    writeAnimationSettings(settings);
    writeDefaultCustomKeyframes();
    resetAnimationBuffer();
    refreshAnimationFacts();
    setStatus(`${cameraPresetLabel(presetId)} preset applied.`);
  }

  function applyAnimationCyclePreset(): void {
    const presetId = animationCyclePresetSelect.value as MotionCyclePresetId;
    const settings = Animation.applyCyclePreset(readAnimationSettingsLenient(), presetId);
    writeAnimationSettings(settings);
    resetAnimationBuffer();
    refreshAnimationFacts();
    setStatus(`${cyclePresetLabel(presetId)} preset applied.`);
  }

  function writeAnimationSettings(settings: CameraPathSettings): void {
    animationPathSelect.value = settings.pathId;
    animationFramesInput.value = String(settings.frameCount);
    animationRangeStartInput.value = String(settings.rangeStartFrame + 1);
    animationRangeEndInput.value = String(settings.rangeEndFrame + 1);
    animationFpsInput.value = String(settings.fps);
    animationStartAngleInput.value = String(settings.startAngleDeg);
    animationEndAngleInput.value = String(settings.endAngleDeg);
    animationOrbitRadiusInput.value = String(settings.orbitRadius);
    animationOrbitHeightInput.value = String(settings.orbitHeight);
    animationDollyStartInput.value = String(settings.dollyStartRadius);
    animationDollyEndInput.value = String(settings.dollyEndRadius);
  }

  function markCameraPresetCustom(): void {
    animationCameraPresetSelect.value = "custom";
    resetAnimationBuffer();
    refreshAnimationFacts();
  }

  function markCyclePresetCustom(): void {
    animationCyclePresetSelect.value = "custom";
    resetAnimationBuffer();
    refreshAnimationFacts();
  }

  function readSceneMotionSettings(): SceneMotionSettings {
    const requested = sceneMotionSelect.value as SceneMotionId;
    const motionId = active && Motion.supportsMotion(active.parsed, requested) ? requested : "static";
    const maxFrame = Math.max(0, Motion.sourceFrameCount(motionId) - 1);
    return {
      motionId,
      sourceFrame: clampInt(Number(motionFrameInput.value), 0, maxFrame, 0)
    };
  }

  function readRenderOptions(profile: RenderProfile): RenderOptions {
    return {
      profileId: profile.id,
      outputMode: profile.outputMode,
      reflectionMode: profile.reflectionMode,
      epsilon: profile.epsilon,
      maxDepth: Math.max(1, Math.min(8, Number(maxDepthInput.value) || 4))
    };
  }

  function writeDefaultCustomKeyframes(): void {
    if (!active) {
      return;
    }
    const settings = readAnimationSettingsLenient();
    const keyframes = Animation.defaultCustomKeyframes(active.parsed, active.world, settings);
    customKeyframesInput.value = JSON.stringify(keyframes, null, 2);
  }

  function resetAnimationBuffer(): void {
    clearPlaybackOnly();
    animationFrames = [];
    bufferedAnimationSettings = null;
    bufferedMotionSettings = null;
    playbackIndex = 0;
    timelineInput.max = "0";
    timelineInput.value = "0";
    progressElement.value = 0;
    updateAnimationButtons(false);
  }

  function refreshProfileIndicators(): void {
    profileIndicators.innerHTML = "";
    for (const tag of Profiles.modeTags(Profiles.byId(profileSelect.value))) {
      const node = document.createElement("span");
      node.className = `mode-tag mode-tag-${tag.kind}`;
      node.textContent = tag.label;
      profileIndicators.appendChild(node);
    }
  }

  function copyAnimationSettings(settings: CameraPathSettings): CameraPathSettings {
    return {
      ...settings,
      customKeyframes: settings.customKeyframes.map((keyframe) => ({
        t: keyframe.t,
        position: [...keyframe.position],
        target: [...keyframe.target],
        focalLength: keyframe.focalLength
      }))
    };
  }

  function drawImageData(data: Uint8ClampedArray, width: number, height: number): void {
    if (!context) {
      return;
    }
    if (canvas.width !== width) {
      canvas.width = width;
    }
    if (canvas.height !== height) {
      canvas.height = height;
    }
    context.imageSmoothingEnabled = false;
    context.putImageData(new ImageData(data as ImageDataArray, width, height), 0, 0);
  }

  function setFacts(node: HTMLElement, rows: [string, string][]): void {
    node.innerHTML = "";
    for (const [label, value] of rows) {
      const dt = document.createElement("dt");
      const dd = document.createElement("dd");
      dt.textContent = label;
      dd.textContent = value;
      node.append(dt, dd);
    }
  }

  function parseResolution(): [number, number] {
    const [width, height] = resolutionSelect.value.split("x").map((value) => Number(value));
    return [width, height];
  }

  function readOrbitSettings(): OrbitSettings {
    return {
      enabled: orbitEnabledInput.checked,
      angleDeg: Number(orbitAngleInput.value) || 0,
      radius: Number(orbitRadiusInput.value) || 10
    };
  }

  function readRowsPerTick(): number {
    return Math.max(1, Math.min(32, Number(rowsPerTickInput.value) || 4));
  }

  function pickVideoMimeType(kind: "webm" | "mp4"): string | null {
    if (typeof MediaRecorder === "undefined") {
      return null;
    }
    const candidates = kind === "webm"
      ? ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"]
      : ["video/mp4;codecs=avc1.42E01E", "video/mp4"];
    return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
  }

  function canvasToBlob(source: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
      source.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Unable to encode PNG frame"));
        }
      }, "image/png");
    });
  }

  function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function clampInt(value: number, min: number, max: number, fallback: number): number {
    if (!Number.isFinite(value)) {
      return fallback;
    }
    return Math.max(min, Math.min(max, Math.round(value)));
  }

  function clampNumber(value: number, min: number, max: number, fallback: number): number {
    if (!Number.isFinite(value)) {
      return fallback;
    }
    return Math.max(min, Math.min(max, value));
  }

  function readNumber(value: string, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function cameraPresetLabel(presetId: CameraPresetId): string {
    return Animation.CAMERA_PRESETS.find((preset) => preset.id === presetId)?.label ?? presetId;
  }

  function cyclePresetLabel(presetId: MotionCyclePresetId): string {
    return Animation.CYCLE_PRESETS.find((preset) => preset.id === presetId)?.label ?? presetId;
  }

  function setStatus(text: string): void {
    statusElement.textContent = text;
  }
}

window.addEventListener("DOMContentLoaded", () => Juggler.App.start());
