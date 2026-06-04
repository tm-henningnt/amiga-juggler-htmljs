namespace Juggler.App {
  interface ActiveScene {
    source: SceneSource;
    parsed: ParsedScene;
    world: World;
  }

  interface PointerDrag {
    tool: MouseTool;
    startX: number;
    startY: number;
    startAngle: number;
    startHeight: number;
    startOffset: Vec3;
    startPosition: Vec3;
    startTarget: Vec3;
    observer: Observer | null;
  }

  const sceneSelect = document.getElementById("scene") as HTMLSelectElement;
  const fileInput = document.getElementById("file") as HTMLInputElement;
  const sceneMotionSelect = document.getElementById("sceneMotion") as HTMLSelectElement;
  const motionFrameInput = document.getElementById("motionFrame") as HTMLInputElement;
  const resolutionSelect = document.getElementById("resolution") as HTMLSelectElement;
  const previewModeSelect = document.getElementById("previewMode") as HTMLSelectElement;
  const profileSelect = document.getElementById("renderProfile") as HTMLSelectElement;
  const displayConstraintSelect = document.getElementById("displayConstraint") as HTMLSelectElement;
  const renderQualitySelect = document.getElementById("renderQuality") as HTMLSelectElement;
  const antiAliasSelect = document.getElementById("antiAlias") as HTMLSelectElement;
  const profileIndicators = document.getElementById("profileIndicators") as HTMLElement;
  const rowsPerTickInput = document.getElementById("rowsPerTick") as HTMLInputElement;
  const maxDepthInput = document.getElementById("maxDepth") as HTMLInputElement;
  const orbitEnabledInput = document.getElementById("orbitEnabled") as HTMLInputElement;
  const orbitAngleInput = document.getElementById("orbitAngle") as HTMLInputElement;
  const orbitRadiusInput = document.getElementById("orbitRadius") as HTMLInputElement;
  const orbitHeightInput = document.getElementById("orbitHeight") as HTMLInputElement;
  const cameraPosXInput = document.getElementById("cameraPosX") as HTMLInputElement;
  const cameraPosYInput = document.getElementById("cameraPosY") as HTMLInputElement;
  const cameraPosZInput = document.getElementById("cameraPosZ") as HTMLInputElement;
  const cameraTargetXInput = document.getElementById("cameraTargetX") as HTMLInputElement;
  const cameraTargetYInput = document.getElementById("cameraTargetY") as HTMLInputElement;
  const cameraTargetZInput = document.getElementById("cameraTargetZ") as HTMLInputElement;
  const writeCameraPoseButton = document.getElementById("writeCameraPose") as HTMLButtonElement;
  const resetCameraPoseButton = document.getElementById("resetCameraPose") as HTMLButtonElement;
  const mouseToolSelect = document.getElementById("mouseTool") as HTMLSelectElement;
  const selectionFacts = document.getElementById("selectionFacts") as HTMLElement;
  const transformXInput = document.getElementById("transformX") as HTMLInputElement;
  const transformYInput = document.getElementById("transformY") as HTMLInputElement;
  const transformZInput = document.getElementById("transformZ") as HTMLInputElement;
  const resetGroupTransformButton = document.getElementById("resetGroupTransform") as HTMLButtonElement;
  const resetAllTransformsButton = document.getElementById("resetAllTransforms") as HTMLButtonElement;
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
  let groupTransforms: GroupTransformState = Transforms.empty();
  let freeCameraPose: CameraPose | null = null;
  let selectedGroupIndex: number | null = null;
  let pointerDrag: PointerDrag | null = null;
  let activeRenderWorker: Worker | null = null;
  let activeWorkerUrl: string | null = null;
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
    for (const mode of Preview.MODES) {
      const option = document.createElement("option");
      option.value = mode.id;
      option.textContent = mode.label;
      previewModeSelect.appendChild(option);
    }
    for (const constraint of Display.CONSTRAINTS) {
      const option = document.createElement("option");
      option.value = constraint.id;
      option.textContent = constraint.label;
      displayConstraintSelect.appendChild(option);
    }
    for (const quality of Renderer.QUALITY_MODES) {
      const option = document.createElement("option");
      option.value = quality.id;
      option.textContent = quality.label;
      renderQualitySelect.appendChild(option);
    }
    for (const mode of Renderer.ANTI_ALIAS_MODES) {
      const option = document.createElement("option");
      option.value = mode.id;
      option.textContent = mode.label;
      antiAliasSelect.appendChild(option);
    }
    for (const tool of [
      { id: "orbit-camera" as MouseTool, label: "Orbit camera" },
      { id: "free-camera" as MouseTool, label: "Free camera" },
      { id: "move-group" as MouseTool, label: "Move group" },
      { id: "none" as MouseTool, label: "None" }
    ]) {
      const option = document.createElement("option");
      option.value = tool.id;
      option.textContent = tool.label;
      mouseToolSelect.appendChild(option);
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
      refreshActiveView();
    });
    motionFrameInput.addEventListener("input", () => {
      resetAnimationBuffer();
      renderFacts();
      refreshAnimationFacts();
      refreshActiveView();
    });
    renderButton.addEventListener("click", () => renderStill());
    abortButton.addEventListener("click", abortWork);
    previewModeSelect.addEventListener("change", () => {
      abortWork();
      refreshActiveView();
    });
    profileSelect.addEventListener("change", () => {
      resetAnimationBuffer();
      refreshProfileIndicators();
    });
    profileSelect.addEventListener("input", refreshProfileIndicators);
    displayConstraintSelect.addEventListener("change", () => {
      resetAnimationBuffer();
      refreshProfileIndicators();
      refreshAnimationFacts();
      refreshActiveView();
    });
    renderQualitySelect.addEventListener("change", () => {
      resetAnimationBuffer();
      refreshProfileIndicators();
      refreshAnimationFacts();
      refreshActiveView();
    });
    antiAliasSelect.addEventListener("change", () => {
      resetAnimationBuffer();
      refreshProfileIndicators();
      refreshAnimationFacts();
      refreshActiveView();
    });
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
    mouseToolSelect.value = "orbit-camera";
    canvas.addEventListener("pointerdown", handleCanvasPointerDown);
    canvas.addEventListener("pointermove", handleCanvasPointerMove);
    canvas.addEventListener("pointerup", handleCanvasPointerUp);
    canvas.addEventListener("pointerleave", handleCanvasPointerUp);
    canvas.addEventListener("wheel", handleCanvasWheel, { passive: false });
    for (const control of [transformXInput, transformYInput, transformZInput]) {
      control.addEventListener("change", writeSelectedTransformFromInputs);
      control.addEventListener("input", writeSelectedTransformFromInputs);
    }
    resetGroupTransformButton.addEventListener("click", resetSelectedTransform);
    resetAllTransformsButton.addEventListener("click", resetAllTransforms);
    writeCameraPoseButton.addEventListener("click", writeFreeCameraPoseFromInputs);
    resetCameraPoseButton.addEventListener("click", resetCameraPose);
    for (const control of [
      cameraPosXInput,
      cameraPosYInput,
      cameraPosZInput,
      cameraTargetXInput,
      cameraTargetYInput,
      cameraTargetZInput
    ]) {
      control.addEventListener("change", writeFreeCameraPoseFromInputs);
    }

    for (const control of [orbitEnabledInput, orbitAngleInput, orbitRadiusInput, orbitHeightInput, resolutionSelect]) {
      control.addEventListener("change", refreshCameraFacts);
      control.addEventListener("input", refreshCameraFacts);
      control.addEventListener("change", refreshActiveView);
      control.addEventListener("input", refreshActiveView);
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
      groupTransforms = Transforms.empty();
      freeCameraPose = null;
      selectedGroupIndex = null;
      refreshMotionOptions();
      writeDefaultCustomKeyframes();
      setStatus(`Loaded ${source.name}`);
      renderFacts();
      refreshCameraFacts();
      refreshAnimationFacts();
      refreshSelectionFacts();
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
    if (readPreviewMode() !== "raytrace") {
      refreshActiveView();
      return;
    }

    abortWork();
    const token = abortToken;
    const [width, height] = parseResolution();
    const motionSettings = readSceneMotionSettings();
    const profile = Profiles.byId(profileSelect.value);
    const displayConstraint = readDisplayConstraint();
    const quality = readRenderQuality();
    const renderOptions = readRenderOptions(profile);
    const rowsPerTick = readRowsPerTick();

    canvas.width = width;
    canvas.height = height;
    context.imageSmoothingEnabled = false;
    renderButton.disabled = true;
    progressElement.value = 0;
    setStatus(
      `Rendering ${active.source.name}, ${Motion.labelFor(motionSettings.motionId)} ` +
      `(${Motion.motionSummary(active.parsed, motionSettings)}) at ${width} x ${height} with ` +
      `${profile.label}, ${Display.labelFor(displayConstraint)} display, ${Renderer.qualityLabelFor(quality)}`
    );

    if (renderStillInWorker(token, width, height, motionSettings, renderOptions, profile, displayConstraint)) {
      return;
    }

    const renderWorld = resolvedDisplayWorld(motionSettings, motionSettings.sourceFrame);
    const observer = createDisplayObserver(width, height);
    const renderer = new Renderer.FrameRenderer(renderWorld, observer, renderOptions);
    const image = new ImageData(renderer.data as ImageDataArray, width, height);
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
        `${Display.labelFor(displayConstraint)} display, ${Renderer.qualityLabelFor(quality)}, ` +
        `${Motion.motionSummary(active.parsed, motionSettings)}, ` +
        `${renderer.stats.rays} rays, ${renderer.stats.mirrorFallbacks} source-reflection fallbacks`
      );
    };

    window.requestAnimationFrame(tick);
  }

  function renderPreview(): void {
    if (!context || !active) {
      return;
    }
    const mode = readPreviewMode();
    if (mode === "raytrace" || mode === "live-raytrace") {
      return;
    }

    abortWork();
    const [width, height] = parseResolution();
    const motionSettings = readSceneMotionSettings();
    const renderWorld = resolvedDisplayWorld(motionSettings, motionSettings.sourceFrame);
    const observer = createDisplayObserver(width, height);
    canvas.width = width;
    canvas.height = height;
    context.imageSmoothingEnabled = false;
    Preview.draw(context, renderWorld, observer, mode, selectedGroupIndex, readDisplayConstraint());
    progressElement.value = 1;
    setStatus(
      `${previewModeLabel(mode)} preview: ${active.source.name}, ${Motion.motionSummary(active.parsed, motionSettings)}, ` +
      `${renderWorld.spheres.length} spheres`
    );
  }

  function refreshActiveView(): void {
    const mode = readPreviewMode();
    if (mode === "live-raytrace") {
      renderLiveRaytrace();
      return;
    }
    if (mode !== "raytrace") {
      renderPreview();
    }
  }

  function renderLiveRaytrace(): void {
    if (!context || !active) {
      return;
    }
    abortWork();
    const token = abortToken;
    const [width, height] = liveResolution();
    const motionSettings = readSceneMotionSettings();
    const renderWorld = resolvedDisplayWorld(motionSettings, motionSettings.sourceFrame);
    const observer = createDisplayObserver(width, height);
    const profile = Profiles.byId(profileSelect.value);
    const options: RenderOptions = {
      ...readRenderOptions(profile),
      qualityId: "interactive",
      antiAliasMode: "off",
      maxDepth: Math.min(2, Math.max(1, Number(maxDepthInput.value) || 2)),
      tileSize: 16
    };
    const renderer = new Renderer.FrameRenderer(renderWorld, observer, options);
    const image = new ImageData(renderer.data as ImageDataArray, width, height);

    canvas.width = width;
    canvas.height = height;
    context.imageSmoothingEnabled = false;
    progressElement.value = 0;
    setStatus(`Live raytrace ${active.source.name}, ${Motion.motionSummary(active.parsed, motionSettings)}`);

    const started = performance.now();
    const tick = (): void => {
      if (token !== abortToken) {
        return;
      }
      renderer.renderBudget(10);
      context.putImageData(image, 0, 0);
      progressElement.value = renderer.progress();
      if (!renderer.done()) {
        window.requestAnimationFrame(tick);
        return;
      }
      const seconds = (performance.now() - started) / 1000;
      setStatus(
        `Live raytrace ready in ${seconds.toFixed(2)}s, ${width} x ${height}, ` +
        `${renderer.stats.rays} rays, ${renderer.stats.sphereTests ?? 0} sphere tests`
      );
    };
    window.requestAnimationFrame(tick);
  }

  function resolvedDisplayWorld(motionSettings: SceneMotionSettings, sourceFrame: number): World {
    return Transforms.apply(
      Motion.resolveWorld(active.parsed, active.world, motionSettings, sourceFrame),
      groupTransforms
    );
  }

  function handleCanvasPointerDown(event: PointerEvent): void {
    if (!active || readPreviewMode() === "raytrace") {
      return;
    }
    const point = canvasPoint(event);
    const tool = readMouseTool();
    if (tool === "orbit-camera") {
      orbitEnabledInput.checked = true;
      freeCameraPose = null;
      pointerDrag = {
        tool,
        startX: point[0],
        startY: point[1],
        startAngle: readNumber(orbitAngleInput.value, 0),
        startHeight: readNumber(orbitHeightInput.value, 0),
        startOffset: [0, 0, 0],
        startPosition: [0, 0, 0],
        startTarget: [0, 0, 0],
        observer: null
      };
      canvas.setPointerCapture(event.pointerId);
      return;
    }

    if (tool === "free-camera") {
      const pose = ensureFreeCameraPose();
      pointerDrag = {
        tool,
        startX: point[0],
        startY: point[1],
        startAngle: 0,
        startHeight: 0,
        startOffset: [0, 0, 0],
        startPosition: [...pose.position],
        startTarget: [...pose.target],
        observer: createDisplayObserver(canvas.width, canvas.height)
      };
      orbitEnabledInput.checked = false;
      refreshCameraFacts();
      canvas.setPointerCapture(event.pointerId);
      return;
    }

    if (tool === "move-group") {
      const preview = previewWorldAndObserver();
      const groupIndex = Preview.pickGroup(preview.world, preview.observer, point[0], point[1]);
      if (groupIndex === null) {
        setStatus("No group under pointer.");
        return;
      }
      selectedGroupIndex = groupIndex;
      const startOffset = Transforms.offsetFor(groupTransforms, groupIndex);
      pointerDrag = {
        tool,
        startX: point[0],
        startY: point[1],
        startAngle: 0,
        startHeight: 0,
        startOffset,
        startPosition: [0, 0, 0],
        startTarget: [0, 0, 0],
        observer: preview.observer
      };
      updateTransformInputs(startOffset);
      refreshSelectionFacts();
      refreshActiveView();
      canvas.setPointerCapture(event.pointerId);
    }
  }

  function handleCanvasPointerMove(event: PointerEvent): void {
    if (!pointerDrag || readPreviewMode() === "raytrace") {
      return;
    }
    const point = canvasPoint(event);
    const dx = point[0] - pointerDrag.startX;
    const dy = point[1] - pointerDrag.startY;

    if (pointerDrag.tool === "orbit-camera") {
      orbitEnabledInput.checked = true;
      orbitAngleInput.value = String(normalizeAngle(pointerDrag.startAngle + dx * 0.5));
      if (event.shiftKey) {
        orbitHeightInput.value = String(clampNumber(pointerDrag.startHeight - dy * 0.04, -80, 80, 0).toFixed(2));
      }
      refreshCameraFacts();
      refreshActiveView();
      return;
    }

    if (pointerDrag.tool === "free-camera" && pointerDrag.observer) {
      if (event.shiftKey) {
        const scale = Math.max(0.01, Math3.length(Math3.sub(pointerDrag.startTarget, pointerDrag.startPosition)) / 320);
        const move = Math3.add(
          Math3.mul(pointerDrag.observer.uhat, dx * scale),
          Math3.mul(pointerDrag.observer.vhat, -dy * scale)
        );
        setFreeCameraPose({
          position: Math3.add(pointerDrag.startPosition, move),
          target: Math3.add(pointerDrag.startTarget, move),
          focalLength: active.parsed.focalLength
        });
        return;
      }

      const startDirection = Math3.normalize(Math3.sub(pointerDrag.startTarget, pointerDrag.startPosition));
      const distance = Math.max(0.1, Math3.length(Math3.sub(pointerDrag.startTarget, pointerDrag.startPosition)));
      const yawed = rotateAroundAxis(startDirection, [0, 0, 1], -dx * 0.01);
      const pitched = rotateAroundAxis(yawed, pointerDrag.observer.uhat, dy * 0.01);
      const direction = Math3.normalize(pitched);
      setFreeCameraPose({
        position: [...pointerDrag.startPosition],
        target: Math3.add(pointerDrag.startPosition, Math3.mul(direction, distance)),
        focalLength: active.parsed.focalLength
      });
      return;
    }

    if (pointerDrag.tool === "move-group" && selectedGroupIndex !== null && pointerDrag.observer) {
      const scale = Math.max(0.01, readNumber(orbitRadiusInput.value, 10) / 320);
      const planeMove = Math3.add(
        Math3.mul(pointerDrag.observer.uhat, dx * scale),
        Math3.mul(pointerDrag.observer.vhat, -dy * scale)
      );
      const nextOffset = Math3.add(pointerDrag.startOffset, planeMove);
      setSelectedTransform(nextOffset);
    }
  }

  function handleCanvasPointerUp(event: PointerEvent): void {
    const hadDrag = pointerDrag !== null;
    if (pointerDrag) {
      try {
        canvas.releasePointerCapture(event.pointerId);
      } catch {
        // Pointer capture may already be released after pointerleave.
      }
    }
    pointerDrag = null;
    if (hadDrag && readPreviewMode() === "live-raytrace") {
      refreshActiveView();
    }
  }

  function handleCanvasWheel(event: WheelEvent): void {
    if (readPreviewMode() === "raytrace") {
      return;
    }
    if (readMouseTool() === "free-camera") {
      event.preventDefault();
      const pose = ensureFreeCameraPose();
      const direction = Math3.normalize(Math3.sub(pose.target, pose.position));
      const step = Math.sign(event.deltaY) * -0.5;
      const move = Math3.mul(direction, step);
      setFreeCameraPose({
        position: Math3.add(pose.position, move),
        target: Math3.add(pose.target, move),
        focalLength: pose.focalLength
      });
      return;
    }
    if (readMouseTool() !== "orbit-camera") {
      return;
    }
    event.preventDefault();
    orbitEnabledInput.checked = true;
    freeCameraPose = null;
    const current = readNumber(orbitRadiusInput.value, 10);
    const next = clampNumber(current + Math.sign(event.deltaY) * 0.5, 1, 120, 10);
    orbitRadiusInput.value = String(next);
    refreshCameraFacts();
    refreshActiveView();
  }

  function previewWorldAndObserver(): { world: World; observer: Observer } {
    const [width, height] = parseResolution();
    const motionSettings = readSceneMotionSettings();
    const world = resolvedDisplayWorld(motionSettings, motionSettings.sourceFrame);
    const observer = createDisplayObserver(width, height);
    return { world, observer };
  }

  function canvasPoint(event: PointerEvent | WheelEvent): [number, number] {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / Math.max(1, rect.width);
    const scaleY = canvas.height / Math.max(1, rect.height);
    return [
      (event.clientX - rect.left) * scaleX,
      (event.clientY - rect.top) * scaleY
    ];
  }

  function writeSelectedTransformFromInputs(): void {
    if (selectedGroupIndex === null) {
      refreshSelectionFacts();
      return;
    }
    setSelectedTransform([
      readNumber(transformXInput.value, 0),
      readNumber(transformYInput.value, 0),
      readNumber(transformZInput.value, 0)
    ]);
  }

  function setSelectedTransform(offset: Vec3): void {
    if (selectedGroupIndex === null) {
      return;
    }
    groupTransforms = Transforms.setOffset(groupTransforms, selectedGroupIndex, offset);
    updateTransformInputs(Transforms.offsetFor(groupTransforms, selectedGroupIndex));
    resetAnimationBuffer();
    refreshSelectionFacts();
    refreshActiveView();
  }

  function resetSelectedTransform(): void {
    if (selectedGroupIndex === null) {
      return;
    }
    groupTransforms = Transforms.clearGroup(groupTransforms, selectedGroupIndex);
    updateTransformInputs([0, 0, 0]);
    resetAnimationBuffer();
    refreshSelectionFacts();
    refreshActiveView();
  }

  function resetAllTransforms(): void {
    groupTransforms = Transforms.empty();
    updateTransformInputs([0, 0, 0]);
    resetAnimationBuffer();
    refreshSelectionFacts();
    refreshActiveView();
    setStatus("All group transforms reset.");
  }

  function refreshSelectionFacts(): void {
    const hasSelection = selectedGroupIndex !== null;
    const offset = hasSelection ? Transforms.offsetFor(groupTransforms, selectedGroupIndex!) : [0, 0, 0] as Vec3;
    transformXInput.disabled = !hasSelection;
    transformYInput.disabled = !hasSelection;
    transformZInput.disabled = !hasSelection;
    resetGroupTransformButton.disabled = !hasSelection;
    setFacts(selectionFacts, [
      ["Selected", hasSelection ? `Group ${selectedGroupIndex}` : "none"],
      ["Offset", Math3.formatVec(offset, 2)],
      ["Transforms", String(Object.keys(groupTransforms).length)]
    ]);
  }

  function updateTransformInputs(offset: Vec3): void {
    transformXInput.value = offset[0].toFixed(2);
    transformYInput.value = offset[1].toFixed(2);
    transformZInput.value = offset[2].toFixed(2);
  }

  function writeCameraPoseInputs(pose: CameraPose): void {
    cameraPosXInput.value = pose.position[0].toFixed(2);
    cameraPosYInput.value = pose.position[1].toFixed(2);
    cameraPosZInput.value = pose.position[2].toFixed(2);
    cameraTargetXInput.value = pose.target[0].toFixed(2);
    cameraTargetYInput.value = pose.target[1].toFixed(2);
    cameraTargetZInput.value = pose.target[2].toFixed(2);
  }

  function writeFreeCameraPoseFromInputs(): void {
    if (!active) {
      return;
    }
    const position: Vec3 = [
      readNumber(cameraPosXInput.value, active.parsed.observerPosition[0]),
      readNumber(cameraPosYInput.value, active.parsed.observerPosition[1]),
      readNumber(cameraPosZInput.value, active.parsed.observerPosition[2])
    ];
    const target: Vec3 = [
      readNumber(cameraTargetXInput.value, position[0] + 1),
      readNumber(cameraTargetYInput.value, position[1]),
      readNumber(cameraTargetZInput.value, position[2])
    ];
    if (Math3.length(Math3.sub(target, position)) < 0.001) {
      setStatus("Camera target must differ from position.");
      return;
    }
    freeCameraPose = {
      position,
      target,
      focalLength: active.parsed.focalLength
    };
    orbitEnabledInput.checked = false;
    resetAnimationBuffer();
    refreshCameraFacts();
    refreshActiveView();
  }

  function resetCameraPose(): void {
    freeCameraPose = null;
    orbitEnabledInput.checked = false;
    resetAnimationBuffer();
    refreshCameraFacts();
    refreshActiveView();
    setStatus("Camera reset to source pose.");
  }

  function setFreeCameraPose(pose: CameraPose): void {
    if (Math3.length(Math3.sub(pose.target, pose.position)) < 0.001) {
      return;
    }
    freeCameraPose = copyCameraPose(pose);
    orbitEnabledInput.checked = false;
    writeCameraPoseInputs(freeCameraPose);
    resetAnimationBuffer();
    refreshCameraFacts();
    refreshActiveView();
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
      motionSettings,
      groupTransforms
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
    cleanupRenderWorker();
    clearPlaybackOnly();
    renderButton.disabled = false;
    updateAnimationButtons(false);
  }

  function renderStillInWorker(
    token: number,
    width: number,
    height: number,
    motionSettings: SceneMotionSettings,
    renderOptions: RenderOptions,
    profile: RenderProfile,
    displayConstraint: DisplayConstraintId
  ): boolean {
    const worker = createRenderWorker();
    if (!worker) {
      return false;
    }

    activeRenderWorker = worker;
    worker.onmessage = (event: MessageEvent<RenderWorkerMessage>) => {
      const message = event.data;
      if (message.id !== token || token !== abortToken) {
        return;
      }

      if (message.type === "progress") {
        progressElement.value = message.progress;
        setStatus(
          `Worker render ${Math.round(message.progress * 100)}%, ` +
          `${message.stats.rays} rays, ${message.stats.sphereTests ?? 0} sphere tests`
        );
        return;
      }

      if (message.type === "error") {
        cleanupRenderWorker();
        renderButton.disabled = false;
        setStatus(`Worker render failed: ${message.message}`);
        return;
      }

      drawImageData(message.data, message.width, message.height);
      progressElement.value = 1;
      cleanupRenderWorker();
      renderButton.disabled = false;
      const seconds = message.renderMs / 1000;
      setStatus(
        `Done in ${seconds.toFixed(2)}s worker, ${profile.label}, ${active.world.spheres.length} spheres, ` +
        `${Display.labelFor(displayConstraint)} display, ${Renderer.qualityLabelFor(renderOptions.qualityId ?? "legacy")}, ` +
        `${Motion.motionSummary(active.parsed, motionSettings)}, ` +
        `${message.stats.rays} rays, ${message.stats.sphereTests ?? 0} sphere tests`
      );
    };

    worker.onerror = (event) => {
      if (token !== abortToken) {
        return;
      }
      cleanupRenderWorker();
      renderButton.disabled = false;
      setStatus(`Worker render failed: ${event.message}`);
    };

    const request: RenderWorkerRequest = {
      id: token,
      parsed: active.parsed,
      world: active.world,
      width,
      height,
      orbit: readOrbitSettings(),
      cameraPose: freeCameraPose ? copyCameraPose(freeCameraPose) : null,
      motionSettings,
      sourceFrame: motionSettings.sourceFrame,
      groupTransforms: copyGroupTransforms(groupTransforms),
      options: renderOptions,
      budgetMs: 12
    };
    worker.postMessage(request);
    setStatus(`Rendering ${active.source.name} in worker...`);
    return true;
  }

  function createRenderWorker(): Worker | null {
    if (typeof Worker === "undefined" || typeof Blob === "undefined" || typeof URL === "undefined") {
      return null;
    }
    const source = document.getElementById("workerSource")?.textContent ?? "";
    if (!source.trim()) {
      return null;
    }
    try {
      const blob = new Blob([source], { type: "text/javascript" });
      activeWorkerUrl = URL.createObjectURL(blob);
      return new Worker(activeWorkerUrl);
    } catch {
      if (activeWorkerUrl) {
        URL.revokeObjectURL(activeWorkerUrl);
        activeWorkerUrl = null;
      }
      return null;
    }
  }

  function cleanupRenderWorker(): void {
    if (activeRenderWorker) {
      activeRenderWorker.terminate();
      activeRenderWorker = null;
    }
    if (activeWorkerUrl) {
      URL.revokeObjectURL(activeWorkerUrl);
      activeWorkerUrl = null;
    }
  }

  function copyGroupTransforms(transforms: GroupTransformState): GroupTransformState {
    const copy: GroupTransformState = {};
    for (const key of Object.keys(transforms)) {
      const index = Number(key);
      copy[index] = [...transforms[index]];
    }
    return copy;
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
    const pose = currentCameraPose(width, height);
    const observer = createDisplayObserver(width, height);
    writeCameraPoseInputs(pose);
    setFacts(cameraFacts, [
      ["Mode", freeCameraPose ? "free" : orbitEnabledInput.checked ? "orbit" : "source"],
      ["Position", Math3.formatVec(observer.position, 2)],
      ["Altitude", `${(observer.altitudeRad * 180 / Math.PI).toFixed(2)} deg`],
      ["Azimuth", `${(observer.azimuthRad * 180 / Math.PI).toFixed(2)} deg`],
      ["Height", readNumber(orbitHeightInput.value, 0).toFixed(2)],
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
      ["Display", Display.labelFor(readDisplayConstraint())],
      ["Quality", Renderer.qualityLabelFor(readRenderQuality())],
      ["Anti-alias", Renderer.antiAliasLabelFor(readEffectiveAntiAliasMode())],
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
    const qualityId = readRenderQuality();
    return {
      profileId: profile.id,
      outputMode: profile.outputMode,
      reflectionMode: profile.reflectionMode,
      epsilon: profile.epsilon,
      maxDepth: qualityId === "interactive"
        ? Math.min(2, Math.max(1, Math.min(8, Number(maxDepthInput.value) || 4)))
        : Math.max(1, Math.min(8, Number(maxDepthInput.value) || 4)),
      displayConstraintId: readDisplayConstraint(),
      qualityId,
      antiAliasMode: readEffectiveAntiAliasMode(),
      acceleration: "bvh",
      tileSize: qualityId === "interactive" ? 16 : 12
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
    antiAliasSelect.disabled = readRenderQuality() !== "modern-quality";
    for (const tag of Profiles.modeTags(Profiles.byId(profileSelect.value))) {
      const node = document.createElement("span");
      node.className = `mode-tag mode-tag-${tag.kind}`;
      node.textContent = tag.label;
      profileIndicators.appendChild(node);
    }
    const displayNode = document.createElement("span");
    displayNode.className = "mode-tag mode-tag-neutral";
    displayNode.textContent = `Display ${Display.labelFor(readDisplayConstraint())}`;
    profileIndicators.appendChild(displayNode);
    const qualityNode = document.createElement("span");
    qualityNode.className = "mode-tag mode-tag-neutral";
    qualityNode.textContent = `Quality ${Renderer.qualityLabelFor(readRenderQuality())}`;
    profileIndicators.appendChild(qualityNode);
    const aaNode = document.createElement("span");
    aaNode.className = "mode-tag mode-tag-neutral";
    aaNode.textContent = `AA ${Renderer.antiAliasLabelFor(readEffectiveAntiAliasMode())}`;
    profileIndicators.appendChild(aaNode);
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

  function createDisplayObserver(width: number, height: number): Observer {
    if (freeCameraPose) {
      return Scenes.createObserverFromPose(freeCameraPose, width, height);
    }
    return Scenes.createObserver(active.parsed, active.world, width, height, readOrbitSettings());
  }

  function currentCameraPose(width: number, height: number): CameraPose {
    if (freeCameraPose) {
      return copyCameraPose(freeCameraPose);
    }
    if (orbitEnabledInput.checked) {
      const observer = Scenes.createObserver(active.parsed, active.world, width, height, readOrbitSettings());
      return {
        position: [...observer.position],
        target: Scenes.sceneTarget(active.world),
        focalLength: active.parsed.focalLength
      };
    }
    return Scenes.staticCameraPose(active.parsed);
  }

  function ensureFreeCameraPose(): CameraPose {
    if (!freeCameraPose) {
      const [width, height] = parseResolution();
      freeCameraPose = currentCameraPose(width, height);
      writeCameraPoseInputs(freeCameraPose);
    }
    return freeCameraPose;
  }

  function copyCameraPose(pose: CameraPose): CameraPose {
    return {
      position: [...pose.position],
      target: [...pose.target],
      focalLength: pose.focalLength
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

  function liveResolution(): [number, number] {
    const [width, height] = parseResolution();
    const capScale = Math.min(1, 320 / Math.max(width, 1), 200 / Math.max(height, 1));
    const dragScale = pointerDrag ? 0.5 : 1;
    const scale = capScale * dragScale;
    return [
      Math.max(80, Math.round(width * scale)),
      Math.max(50, Math.round(height * scale))
    ];
  }

  function readPreviewMode(): PreviewMode {
    const requested = previewModeSelect.value as PreviewMode;
    return Preview.MODES.some((mode) => mode.id === requested) ? requested : "raytrace";
  }

  function readDisplayConstraint(): DisplayConstraintId {
    const requested = displayConstraintSelect.value as DisplayConstraintId;
    return Display.CONSTRAINTS.some((constraint) => constraint.id === requested) ? requested : "rgb";
  }

  function readRenderQuality(): RenderQualityId {
    const requested = renderQualitySelect.value as RenderQualityId;
    return Renderer.QUALITY_MODES.some((quality) => quality.id === requested) ? requested : "legacy";
  }

  function readAntiAliasMode(): AntiAliasModeId {
    const requested = antiAliasSelect.value as AntiAliasModeId;
    return Renderer.ANTI_ALIAS_MODES.some((mode) => mode.id === requested) ? requested : "off";
  }

  function readEffectiveAntiAliasMode(): AntiAliasModeId {
    return readRenderQuality() === "modern-quality" ? readAntiAliasMode() : "off";
  }

  function readOrbitSettings(): OrbitSettings {
    return {
      enabled: orbitEnabledInput.checked,
      angleDeg: Number(orbitAngleInput.value) || 0,
      radius: Number(orbitRadiusInput.value) || 10,
      heightOffset: Number(orbitHeightInput.value) || 0
    };
  }

  function readMouseTool(): MouseTool {
    const requested = mouseToolSelect.value as MouseTool;
    return requested === "orbit-camera" || requested === "free-camera" || requested === "move-group" || requested === "none" ? requested : "orbit-camera";
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

  function normalizeAngle(value: number): number {
    return ((value % 360) + 360) % 360;
  }

  function rotateAroundAxis(vector: Vec3, axis: Vec3, angle: number): Vec3 {
    const unit = Math3.normalize(axis);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return Math3.add(
      Math3.add(
        Math3.mul(vector, cos),
        Math3.mul(Math3.cross(unit, vector), sin)
      ),
      Math3.mul(unit, Math3.dot(unit, vector) * (1 - cos))
    );
  }

  function cameraPresetLabel(presetId: CameraPresetId): string {
    return Animation.CAMERA_PRESETS.find((preset) => preset.id === presetId)?.label ?? presetId;
  }

  function cyclePresetLabel(presetId: MotionCyclePresetId): string {
    return Animation.CYCLE_PRESETS.find((preset) => preset.id === presetId)?.label ?? presetId;
  }

  function previewModeLabel(modeId: PreviewMode): string {
    return Preview.MODES.find((mode) => mode.id === modeId)?.label ?? modeId;
  }

  function setStatus(text: string): void {
    statusElement.textContent = text;
  }
}

window.addEventListener("DOMContentLoaded", () => Juggler.App.start());
