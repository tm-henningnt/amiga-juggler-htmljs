namespace Juggler.App {
  interface ActiveScene {
    source: SceneSource;
    parsed: ParsedScene;
    world: World;
  }

  interface PointerDrag {
    mode: "orbit" | "pan" | "scene-edit";
    startX: number;
    startY: number;
    startAngle: number;
    startHeight: number;
    startOffset: Vec3;
    startPosition: Vec3;
    startTarget: Vec3;
    observer: Observer | null;
  }

  interface LivePlaybackState {
    playing: boolean;
    rafId: number;
    dueAtMs: number;
    sourceFrame: number;
    skippedFrames: number;
    lastRenderMs: number;
    renderInProgress: boolean;
    previousData: Uint8ClampedArray | null;
    previousWidth: number;
    previousHeight: number;
  }

  interface FlyState {
    enabled: boolean;
    rafId: number;
    lastTickMs: number;
    nextRenderAtMs: number;
    keys: Record<string, boolean>;
    pointerLocked: boolean;
    gamepadName: string;
  }

  const CRT_MODES = [
    { id: "off", label: "CRT OFF", active: "false" },
    { id: "scanlines", label: "CRT SCAN", active: "true" },
    { id: "slot-mask", label: "CRT SLOT", active: "true" },
    { id: "soft-glow", label: "CRT SOFT", active: "true" }
  ] as const;

  const experienceSelect = document.getElementById("experiencePreset") as HTMLSelectElement;
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
  const sceneEditModeInput = document.getElementById("sceneEditMode") as HTMLInputElement;
  const selectionFacts = document.getElementById("selectionFacts") as HTMLElement;
  const transformXInput = document.getElementById("transformX") as HTMLInputElement;
  const transformYInput = document.getElementById("transformY") as HTMLInputElement;
  const transformZInput = document.getElementById("transformZ") as HTMLInputElement;
  const resetGroupTransformButton = document.getElementById("resetGroupTransform") as HTMLButtonElement;
  const resetAllTransformsButton = document.getElementById("resetAllTransforms") as HTMLButtonElement;
  const flyViewButton = document.getElementById("flyView") as HTMLButtonElement;
  const flyModeEnabledInput = document.getElementById("flyModeEnabled") as HTMLInputElement;
  const flySpeedInput = document.getElementById("flySpeed") as HTMLInputElement;
  const gamepadEnabledInput = document.getElementById("gamepadEnabled") as HTMLInputElement;
  const playLiveButton = document.getElementById("playLive") as HTMLButtonElement;
  const pauseLiveButton = document.getElementById("pauseLive") as HTMLButtonElement;
  const renderButton = document.getElementById("render") as HTMLButtonElement;
  const abortButton = document.getElementById("abort") as HTMLButtonElement;
  const statusElement = document.getElementById("status") as HTMLSpanElement;
  const progressElement = document.getElementById("progress") as HTMLProgressElement;
  const canvasHintElement = document.getElementById("canvasHint") as HTMLElement;
  const crtToggleButton = document.getElementById("scanlineToggle") as HTMLButtonElement | null;
  const livePlaybackFacts = document.getElementById("livePlaybackFacts") as HTMLElement;
  const softShadowsEnabledInput = document.getElementById("softShadowsEnabled") as HTMLInputElement;
  const softShadowSamplesInput = document.getElementById("softShadowSamples") as HTMLInputElement;
  const softShadowRadiusInput = document.getElementById("softShadowRadius") as HTMLInputElement;
  const ambientOcclusionEnabledInput = document.getElementById("ambientOcclusionEnabled") as HTMLInputElement;
  const ambientOcclusionStrengthInput = document.getElementById("ambientOcclusionStrength") as HTMLInputElement;
  const ambientOcclusionRadiusInput = document.getElementById("ambientOcclusionRadius") as HTMLInputElement;
  const depthOfFieldEnabledInput = document.getElementById("depthOfFieldEnabled") as HTMLInputElement;
  const depthOfFieldSamplesInput = document.getElementById("depthOfFieldSamples") as HTMLInputElement;
  const depthOfFieldApertureInput = document.getElementById("depthOfFieldAperture") as HTMLInputElement;
  const depthOfFieldFocusInput = document.getElementById("depthOfFieldFocus") as HTMLInputElement;
  const motionBlurEnabledInput = document.getElementById("motionBlurEnabled") as HTMLInputElement;
  const motionBlurStrengthInput = document.getElementById("motionBlurStrength") as HTMLInputElement;
  const motionBlurSamplesInput = document.getElementById("motionBlurSamples") as HTMLInputElement;
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
  let applyingExperiencePreset = false;
  let crtModeIndex = 1;
  let livePreviewRenderBusy = false;
  let livePlayback: LivePlaybackState = {
    playing: false,
    rafId: 0,
    dueAtMs: 0,
    sourceFrame: 0,
    skippedFrames: 0,
    lastRenderMs: 0,
    renderInProgress: false,
    previousData: null,
    previousWidth: 0,
    previousHeight: 0
  };
  let flyState: FlyState = {
    enabled: false,
    rafId: 0,
    lastTickMs: 0,
    nextRenderAtMs: 0,
    keys: {},
    pointerLocked: false,
    gamepadName: "none"
  };

  export function start(): void {
    if (!context) {
      throw new Error("Canvas 2D context is unavailable");
    }

    for (const preset of Experience.PRESETS) {
      const option = document.createElement("option");
      option.value = preset.id;
      option.textContent = preset.label;
      experienceSelect.appendChild(option);
    }
    const customOption = document.createElement("option");
    customOption.value = "custom";
    customOption.textContent = "Custom";
    experienceSelect.appendChild(customOption);

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

    experienceSelect.addEventListener("change", () => {
      const presetId = experienceSelect.value as ExperiencePresetId;
      if (presetId !== "custom") {
        applyExperiencePreset(presetId);
      }
    });
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
    flyViewButton.addEventListener("click", () => setFlyMode(!flyState.enabled, true));
    flyModeEnabledInput.addEventListener("change", () => setFlyMode(flyModeEnabledInput.checked, flyModeEnabledInput.checked));
    flySpeedInput.addEventListener("change", markExperienceCustom);
    flySpeedInput.addEventListener("input", markExperienceCustom);
    gamepadEnabledInput.addEventListener("change", () => {
      markExperienceCustom();
      refreshCameraFacts();
      updateCanvasHint();
    });
    playLiveButton.addEventListener("click", playLiveRaytrace);
    pauseLiveButton.addEventListener("click", pauseLiveRaytrace);
    renderButton.addEventListener("click", () => renderStill());
    abortButton.addEventListener("click", abortWork);
    previewModeSelect.addEventListener("change", () => {
      abortWork();
      markExperienceCustom();
      refreshActiveView();
    });
    profileSelect.addEventListener("change", () => {
      resetAnimationBuffer();
      markExperienceCustom();
      refreshProfileIndicators();
    });
    profileSelect.addEventListener("input", refreshProfileIndicators);
    displayConstraintSelect.addEventListener("change", () => {
      resetAnimationBuffer();
      markExperienceCustom();
      refreshProfileIndicators();
      refreshAnimationFacts();
      refreshActiveView();
    });
    renderQualitySelect.addEventListener("change", () => {
      resetAnimationBuffer();
      markExperienceCustom();
      refreshProfileIndicators();
      refreshAnimationFacts();
      refreshActiveView();
    });
    antiAliasSelect.addEventListener("change", () => {
      resetAnimationBuffer();
      markExperienceCustom();
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
    canvas.addEventListener("pointerdown", handleCanvasPointerDown);
    canvas.addEventListener("pointermove", handleCanvasPointerMove);
    canvas.addEventListener("pointerup", handleCanvasPointerUp);
    canvas.addEventListener("pointerleave", handleCanvasPointerUp);
    canvas.addEventListener("wheel", handleCanvasWheel, { passive: false });
    canvas.addEventListener("contextmenu", (event) => event.preventDefault());
    document.addEventListener("pointerlockchange", handlePointerLockChange);
    document.addEventListener("mousemove", handlePointerLockMouseMove);
    document.addEventListener("keydown", handleFlyKeyDown);
    document.addEventListener("keyup", handleFlyKeyUp);
    sceneEditModeInput.addEventListener("change", () => {
      markExperienceCustom();
      updateCanvasHint();
      refreshSelectionFacts();
    });
    for (const control of [transformXInput, transformYInput, transformZInput]) {
      control.addEventListener("change", markExperienceCustom);
      control.addEventListener("input", markExperienceCustom);
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
      control.addEventListener("change", markExperienceCustom);
      control.addEventListener("change", writeFreeCameraPoseFromInputs);
    }

    for (const control of [orbitEnabledInput, orbitAngleInput, orbitRadiusInput, orbitHeightInput, resolutionSelect]) {
      control.addEventListener("change", markExperienceCustom);
      control.addEventListener("input", markExperienceCustom);
      control.addEventListener("change", refreshCameraFacts);
      control.addEventListener("input", refreshCameraFacts);
      control.addEventListener("change", refreshActiveView);
      control.addEventListener("input", refreshActiveView);
    }
    for (const control of [
      rowsPerTickInput,
      maxDepthInput,
      softShadowsEnabledInput,
      softShadowSamplesInput,
      softShadowRadiusInput,
      ambientOcclusionEnabledInput,
      ambientOcclusionStrengthInput,
      ambientOcclusionRadiusInput,
      depthOfFieldEnabledInput,
      depthOfFieldSamplesInput,
      depthOfFieldApertureInput,
      depthOfFieldFocusInput,
      motionBlurEnabledInput,
      motionBlurStrengthInput,
      motionBlurSamplesInput
    ]) {
      control.addEventListener("change", () => {
        markExperienceCustom();
        refreshProfileIndicators();
        refreshAnimationFacts();
        refreshActiveView();
      });
      control.addEventListener("input", () => {
        markExperienceCustom();
        refreshProfileIndicators();
      });
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

    setupCrtToggle();
    setActiveSource(sources[0]);
    applyExperiencePreset("classic-source", false);
    updateCanvasHint();
    refreshLivePlaybackFacts();
    refreshProfileIndicators();
    renderStill();
  }

  function applyExperiencePreset(presetId: Exclude<ExperiencePresetId, "custom">, shouldRender = true): void {
    const preset = Experience.byId(presetId);
    applyingExperiencePreset = true;
    experienceSelect.value = preset.id;
    previewModeSelect.value = preset.previewMode;
    profileSelect.value = preset.profileId;
    displayConstraintSelect.value = preset.displayConstraintId;
    renderQualitySelect.value = preset.qualityId;
    antiAliasSelect.value = preset.antiAliasMode;
    maxDepthInput.value = String(preset.maxDepth);
    rowsPerTickInput.value = String(preset.rowsPerTick);
    orbitEnabledInput.checked = preset.orbit.enabled;
    orbitAngleInput.value = String(preset.orbit.angleDeg);
    orbitRadiusInput.value = String(preset.orbit.radius);
    orbitHeightInput.value = String(preset.orbit.heightOffset ?? 0);
    if (preset.useSourceCamera) {
      freeCameraPose = null;
    }
    if (preset.id === "modern-studio" && active && Motion.supportsMotion(active.parsed, "juggler-reconstructed")) {
      sceneMotionSelect.value = "juggler-reconstructed";
      refreshMotionFrameBounds();
    }
    sceneEditModeInput.checked = false;
    setFlyMode(false, false);
    writeModernEffects(preset.modernEffects);
    setCrtMode(preset.crtMode);
    applyingExperiencePreset = false;

    resetAnimationBuffer();
    refreshProfileIndicators();
    refreshCameraFacts();
    renderFacts();
    refreshAnimationFacts();
    refreshSelectionFacts();
    updateCanvasHint();
    setStatus(`${preset.label} preset applied.`);
    if (shouldRender) {
      if (preset.previewMode === "raytrace") {
        renderStill();
      } else {
        refreshActiveView();
      }
    }
  }

  function setupCrtToggle(): void {
    setCrtMode("scanlines");
    crtToggleButton?.addEventListener("click", () => {
      crtModeIndex = (crtModeIndex + 1) % CRT_MODES.length;
      setCrtMode(CRT_MODES[crtModeIndex].id);
      markExperienceCustom();
    });
  }

  function setCrtMode(modeId: (typeof CRT_MODES)[number]["id"]): void {
    const index = CRT_MODES.findIndex((mode) => mode.id === modeId);
    crtModeIndex = index >= 0 ? index : 0;
    const mode = CRT_MODES[crtModeIndex];
    document.body.setAttribute("data-crt-mode", mode.id);
    if (crtToggleButton) {
      crtToggleButton.textContent = mode.label;
      crtToggleButton.setAttribute("data-active", mode.active);
      crtToggleButton.setAttribute("title", `CRT mode: ${mode.label}`);
    }
  }

  function markExperienceCustom(): void {
    if (!applyingExperiencePreset && experienceSelect.value !== "custom") {
      experienceSelect.value = "custom";
    }
  }

  function readModernEffects(): ModernEffectsSettings {
    return {
      softShadows: {
        enabled: softShadowsEnabledInput.checked,
        samples: clampInt(Number(softShadowSamplesInput.value), 1, 16, 1),
        radius: clampNumber(Number(softShadowRadiusInput.value), 0, 3, 0)
      },
      ambientOcclusion: {
        enabled: ambientOcclusionEnabledInput.checked,
        strength: clampNumber(Number(ambientOcclusionStrengthInput.value), 0, 1, 0),
        radius: clampNumber(Number(ambientOcclusionRadiusInput.value), 0.1, 4, 1)
      },
      depthOfField: {
        enabled: depthOfFieldEnabledInput.checked,
        samples: clampInt(Number(depthOfFieldSamplesInput.value), 1, 16, 1),
        aperture: clampNumber(Number(depthOfFieldApertureInput.value), 0, 0.25, 0),
        focusDistance: clampNumber(Number(depthOfFieldFocusInput.value), 0.5, 80, 10)
      },
      motionBlur: {
        enabled: motionBlurEnabledInput.checked,
        strength: clampNumber(Number(motionBlurStrengthInput.value), 0, 0.85, 0),
        samples: clampInt(Number(motionBlurSamplesInput.value), 1, 4, 1)
      }
    };
  }

  function writeModernEffects(settings: ModernEffectsSettings): void {
    softShadowsEnabledInput.checked = settings.softShadows.enabled;
    softShadowSamplesInput.value = String(settings.softShadows.samples);
    softShadowRadiusInput.value = String(settings.softShadows.radius);
    ambientOcclusionEnabledInput.checked = settings.ambientOcclusion.enabled;
    ambientOcclusionStrengthInput.value = String(settings.ambientOcclusion.strength);
    ambientOcclusionRadiusInput.value = String(settings.ambientOcclusion.radius);
    depthOfFieldEnabledInput.checked = settings.depthOfField.enabled;
    depthOfFieldSamplesInput.value = String(settings.depthOfField.samples);
    depthOfFieldApertureInput.value = String(settings.depthOfField.aperture);
    depthOfFieldFocusInput.value = String(settings.depthOfField.focusDistance);
    motionBlurEnabledInput.checked = settings.motionBlur.enabled;
    motionBlurStrengthInput.value = String(settings.motionBlur.strength);
    motionBlurSamplesInput.value = String(settings.motionBlur.samples);
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
      refreshLivePlaybackFacts();
      updateCanvasHint();
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
      `${profile.label}, ${Display.labelFor(displayConstraint)} display, ${Renderer.qualityLabelFor(quality)}, ` +
      `${Experience.effectsSummary(renderOptions.modernEffects ?? Experience.disabledModernEffects())}`
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
        `${Experience.effectsSummary(renderOptions.modernEffects ?? Experience.disabledModernEffects())}, ` +
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
    updateCanvasHint();
    if (mode === "live-raytrace") {
      renderLiveRaytrace();
      return;
    }
    if (mode !== "raytrace") {
      renderPreview();
    }
  }

  function renderLiveRaytrace(): void {
    renderLiveRaytraceFrame(readSceneMotionSettings().sourceFrame, false);
  }

  function renderLiveRaytraceFrame(sourceFrame: number, playbackFrame: boolean): void {
    if (!context || !active) {
      return;
    }
    abortRenderOnly();
    const token = abortToken;
    const [width, height] = liveResolution();
    const motionSettings = {
      ...readSceneMotionSettings(),
      sourceFrame
    };
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
    livePreviewRenderBusy = true;
    if (playbackFrame) {
      livePlayback.renderInProgress = true;
    }
    setStatus(`Live raytrace ${active.source.name}, ${Motion.motionSummary(active.parsed, motionSettings)}`);

    const started = performance.now();
    const tick = (): void => {
      if (token !== abortToken) {
        livePreviewRenderBusy = false;
        if (playbackFrame) {
          livePlayback.renderInProgress = false;
          refreshLivePlaybackFacts();
        }
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
      livePreviewRenderBusy = false;
      let data = renderer.data;
      if (playbackFrame) {
        data = Renderer.blendMotionSamples(renderer.data, livePlayback.previousData, options.modernEffects?.motionBlur);
        if (data !== renderer.data) {
          drawImageData(data, width, height);
        }
        livePlayback.previousData = new Uint8ClampedArray(data);
        livePlayback.previousWidth = width;
        livePlayback.previousHeight = height;
        livePlayback.lastRenderMs = performance.now() - started;
        livePlayback.renderInProgress = false;
      }
      refreshLivePlaybackFacts();
      setStatus(
        livePlayback.playing
          ? livePlaybackStatus(sourceFrame, width, height, renderer.stats)
          : `Live raytrace ready in ${seconds.toFixed(2)}s, ${width} x ${height}, ` +
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
    if (!active) {
      return;
    }
    event.preventDefault();
    const point = canvasCssPoint(event);
    const observer = createDisplayObserver(canvas.width || parseResolution()[0], canvas.height || parseResolution()[1]);

    if (flyState.enabled) {
      if (document.pointerLockElement !== canvas) {
        requestCanvasPointerLock();
      }
      updateCanvasHint();
      return;
    }

    if (!sceneEditModeInput.checked) {
      const pose = ensureFreeCameraPose();
      const panMode = event.button === 2 || event.shiftKey;
      pointerDrag = {
        mode: panMode ? "pan" : "orbit",
        startX: point[0],
        startY: point[1],
        startAngle: 0,
        startHeight: 0,
        startOffset: [0, 0, 0],
        startPosition: [...pose.position],
        startTarget: [...pose.target],
        observer
      };
      refreshCameraFacts();
      updateCanvasHint();
      canvas.setPointerCapture(event.pointerId);
      return;
    }

    const renderPoint = canvasRenderPoint(event);
    const preview = previewWorldAndObserver();
    const groupIndex = Preview.pickGroup(preview.world, preview.observer, renderPoint[0], renderPoint[1]);
    if (groupIndex === null) {
      setStatus("No group under pointer.");
      return;
    }
    selectedGroupIndex = groupIndex;
    const startOffset = Transforms.offsetFor(groupTransforms, groupIndex);
    pointerDrag = {
      mode: "scene-edit",
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
    updateCanvasHint();
    refreshActiveView();
    canvas.setPointerCapture(event.pointerId);
  }

  function handleCanvasPointerMove(event: PointerEvent): void {
    if (!pointerDrag) {
      return;
    }
    event.preventDefault();
    const point = canvasCssPoint(event);
    const dx = point[0] - pointerDrag.startX;
    const dy = point[1] - pointerDrag.startY;

    if (pointerDrag.mode === "orbit") {
      markExperienceCustom();
      setFreeCameraPose(Viewport.orbitPoseFromDrag({
        position: pointerDrag.startPosition,
        target: pointerDrag.startTarget,
        focalLength: active.parsed.focalLength
      }, dx, dy));
      return;
    }

    if (pointerDrag.mode === "pan" && pointerDrag.observer) {
      markExperienceCustom();
      setFreeCameraPose(Viewport.panPoseFromDrag({
        position: pointerDrag.startPosition,
        target: pointerDrag.startTarget,
        focalLength: active.parsed.focalLength
      }, pointerDrag.observer, dx, dy));
      return;
    }

    if (pointerDrag.mode === "scene-edit" && selectedGroupIndex !== null && pointerDrag.observer) {
      markExperienceCustom();
      const distance = Math.max(0.1, Math3.length(Math3.sub(pointerDrag.observer.position, Scenes.sceneTarget(active.world))));
      const scale = Math.max(0.01, distance / 320);
      setSelectedTransform(Viewport.sceneEditOffsetFromDrag(pointerDrag.startOffset, pointerDrag.observer, dx, dy, event.shiftKey, scale));
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
    updateCanvasHint();
  }

  function handleCanvasWheel(event: WheelEvent): void {
    if (!active) {
      return;
    }
    event.preventDefault();
    markExperienceCustom();
    setFreeCameraPose(Viewport.dollyPose(ensureFreeCameraPose(), event.deltaY));
  }

  function previewWorldAndObserver(): { world: World; observer: Observer } {
    const fallback = parseResolution();
    const width = canvas.width || fallback[0];
    const height = canvas.height || fallback[1];
    const motionSettings = readSceneMotionSettings();
    const world = resolvedDisplayWorld(motionSettings, motionSettings.sourceFrame);
    const observer = createDisplayObserver(width, height);
    return { world, observer };
  }

  function canvasCssPoint(event: PointerEvent | WheelEvent): [number, number] {
    const rect = canvas.getBoundingClientRect();
    return [
      event.clientX - rect.left,
      event.clientY - rect.top
    ];
  }

  function canvasRenderPoint(event: PointerEvent | WheelEvent): [number, number] {
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
      ["Edit mode", sceneEditModeInput.checked ? "on" : "off"],
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

  function setFreeCameraPose(pose: CameraPose, resetBuffer = true, render = true): void {
    if (Math3.length(Math3.sub(pose.target, pose.position)) < 0.001) {
      return;
    }
    freeCameraPose = copyCameraPose(pose);
    orbitEnabledInput.checked = false;
    writeCameraPoseInputs(freeCameraPose);
    if (resetBuffer) {
      resetAnimationBuffer();
    }
    refreshCameraFacts();
    if (render) {
      refreshActiveView();
    }
  }

  function setFlyMode(enabled: boolean, requestLock: boolean): void {
    flyState.enabled = enabled;
    flyModeEnabledInput.checked = enabled;
    flyViewButton.textContent = enabled ? "Exit Fly" : "Fly View";
    sceneEditModeInput.disabled = enabled;
    if (enabled) {
      markExperienceCustom();
      stopLiveRaytrace(true);
      clearPlaybackOnly();
      resetAnimationBuffer();
      ensureFreeCameraPose();
      if (readPreviewMode() === "raytrace") {
        previewModeSelect.value = "live-raytrace";
      }
      if (!flyState.rafId) {
        flyState.lastTickMs = performance.now();
        flyState.nextRenderAtMs = 0;
        flyState.rafId = window.requestAnimationFrame(flyTick);
      }
      if (requestLock) {
        requestCanvasPointerLock();
      }
      setStatus("Fly View active.");
    } else {
      if (flyState.rafId) {
        window.cancelAnimationFrame(flyState.rafId);
      }
      flyState.rafId = 0;
      flyState.keys = {};
      flyState.pointerLocked = false;
      flyState.gamepadName = "none";
      if (document.pointerLockElement === canvas) {
        document.exitPointerLock();
      }
    }
    refreshCameraFacts();
    updateCanvasHint();
  }

  function requestCanvasPointerLock(): void {
    if (typeof canvas.requestPointerLock !== "function") {
      setStatus("Pointer lock is unavailable in this browser.");
      return;
    }
    const result = canvas.requestPointerLock() as Promise<void> | undefined;
    result?.catch(() => setStatus("Click the render canvas to start mouse look."));
  }

  function handlePointerLockChange(): void {
    flyState.pointerLocked = document.pointerLockElement === canvas;
    updateCanvasHint();
    refreshCameraFacts();
  }

  function handlePointerLockMouseMove(event: MouseEvent): void {
    if (!active || !flyState.enabled || document.pointerLockElement !== canvas) {
      return;
    }
    event.preventDefault();
    const pose = Viewport.lookPoseFromDelta(ensureFreeCameraPose(), event.movementX, event.movementY);
    applyFlyPose(pose, true);
  }

  function handleFlyKeyDown(event: KeyboardEvent): void {
    if (!flyState.enabled || isTypingTarget(event.target)) {
      return;
    }
    const key = flyKey(event.code);
    if (!key) {
      return;
    }
    event.preventDefault();
    flyState.keys[key] = true;
  }

  function handleFlyKeyUp(event: KeyboardEvent): void {
    const key = flyKey(event.code);
    if (!key) {
      return;
    }
    flyState.keys[key] = false;
  }

  function flyTick(nowMs: number): void {
    if (!flyState.enabled) {
      flyState.rafId = 0;
      return;
    }
    const deltaSeconds = Math.min(0.05, Math.max(0, (nowMs - flyState.lastTickMs) / 1000));
    flyState.lastTickMs = nowMs;

    let pose = ensureFreeCameraPose();
    let changed = false;
    const keyboardInput = keyboardFlyInput();
    if (Math.abs(keyboardInput.forward) + Math.abs(keyboardInput.right) + Math.abs(keyboardInput.up) > 0) {
      pose = Viewport.flyPose(pose, keyboardInput, deltaSeconds, readFlySpeed());
      changed = true;
    }

    const gamepad = gamepadFlyInput();
    if (gamepad.connected) {
      flyState.gamepadName = gamepad.name;
    } else {
      flyState.gamepadName = "none";
    }
    if (gamepad.lookX || gamepad.lookY) {
      pose = Viewport.lookPoseFromDelta(pose, gamepad.lookX * deltaSeconds * 900, gamepad.lookY * deltaSeconds * 900);
      changed = true;
    }
    if (Math.abs(gamepad.move.forward) + Math.abs(gamepad.move.right) + Math.abs(gamepad.move.up) > 0) {
      pose = Viewport.flyPose(pose, gamepad.move, deltaSeconds, readFlySpeed());
      changed = true;
    }

    if (changed) {
      applyFlyPose(pose, false);
      if (nowMs >= flyState.nextRenderAtMs && !livePreviewRenderBusy) {
        flyState.nextRenderAtMs = nowMs + 90;
        refreshActiveView();
      }
    }
    refreshCameraFacts();
    flyState.rafId = window.requestAnimationFrame(flyTick);
  }

  function applyFlyPose(pose: CameraPose, renderNow: boolean): void {
    setFreeCameraPose(pose, false, false);
    if (renderNow && !livePreviewRenderBusy) {
      refreshActiveView();
    }
  }

  function keyboardFlyInput(): Viewport.FlyInputVector {
    return {
      forward: axis(flyState.keys.forward, flyState.keys.back),
      right: axis(flyState.keys.right, flyState.keys.left),
      up: axis(flyState.keys.up, flyState.keys.down)
    };
  }

  function gamepadFlyInput(): {
    connected: boolean;
    name: string;
    move: Viewport.FlyInputVector;
    lookX: number;
    lookY: number;
  } {
    if (!gamepadEnabledInput.checked || typeof navigator.getGamepads !== "function") {
      return { connected: false, name: "none", move: { forward: 0, right: 0, up: 0 }, lookX: 0, lookY: 0 };
    }
    const gamepad = Array.from(navigator.getGamepads()).find((candidate): candidate is Gamepad => !!candidate && candidate.connected);
    if (!gamepad) {
      return { connected: false, name: "none", move: { forward: 0, right: 0, up: 0 }, lookX: 0, lookY: 0 };
    }
    const upButton = buttonValue(gamepad.buttons[7]) + buttonValue(gamepad.buttons[3]);
    const downButton = buttonValue(gamepad.buttons[6]) + buttonValue(gamepad.buttons[0]);
    return {
      connected: true,
      name: gamepad.id || "gamepad",
      move: {
        forward: -deadzone(gamepad.axes[1] ?? 0),
        right: deadzone(gamepad.axes[0] ?? 0),
        up: deadzone(upButton - downButton)
      },
      lookX: deadzone(gamepad.axes[2] ?? 0),
      lookY: deadzone(gamepad.axes[3] ?? 0)
    };
  }

  function flyKey(code: string): keyof FlyState["keys"] | null {
    switch (code) {
      case "KeyW":
      case "ArrowUp":
        return "forward";
      case "KeyS":
      case "ArrowDown":
        return "back";
      case "KeyA":
      case "ArrowLeft":
        return "left";
      case "KeyD":
      case "ArrowRight":
        return "right";
      case "KeyE":
      case "Space":
        return "up";
      case "KeyQ":
      case "ShiftLeft":
      case "ShiftRight":
        return "down";
      default:
        return null;
    }
  }

  function axis(positive: boolean | undefined, negative: boolean | undefined): number {
    return (positive ? 1 : 0) - (negative ? 1 : 0);
  }

  function deadzone(value: number, threshold = 0.12): number {
    return Math.abs(value) < threshold ? 0 : Math.max(-1, Math.min(1, value));
  }

  function buttonValue(button: GamepadButton | undefined): number {
    return button?.pressed ? Math.max(0.4, button.value) : button?.value ?? 0;
  }

  function readFlySpeed(): number {
    return clampNumber(Number(flySpeedInput.value), 0.1, 30, 6);
  }

  function isTypingTarget(target: EventTarget | null): boolean {
    const element = target instanceof HTMLElement ? target : null;
    return !!element && ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(element.tagName);
  }

  function playLiveRaytrace(): void {
    if (!active) {
      return;
    }
    clearPlaybackOnly();
    updateAnimationButtons(false);
    if (readPreviewMode() !== "live-raytrace") {
      previewModeSelect.value = "live-raytrace";
      markExperienceCustom();
    }
    const motionSettings = readSceneMotionSettings();
    livePlayback = {
      playing: true,
      rafId: 0,
      dueAtMs: performance.now() + 1000 / readAnimationSettingsLenient().fps,
      sourceFrame: motionSettings.sourceFrame,
      skippedFrames: 0,
      lastRenderMs: 0,
      renderInProgress: false,
      previousData: null,
      previousWidth: 0,
      previousHeight: 0
    };
    updateLivePlaybackButtons();
    refreshLivePlaybackFacts();
    renderLiveRaytraceFrame(livePlayback.sourceFrame, true);
    livePlayback.rafId = window.requestAnimationFrame(livePlaybackTick);
  }

  function pauseLiveRaytrace(): void {
    stopLiveRaytrace(false);
    abortRenderOnly();
    setStatus("Live playback paused.");
  }

  function stopLiveRaytrace(resetFrame: boolean): void {
    if (livePlayback.rafId) {
      window.cancelAnimationFrame(livePlayback.rafId);
    }
    livePlayback.playing = false;
    livePlayback.rafId = 0;
    livePlayback.renderInProgress = false;
    if (resetFrame) {
      livePlayback.sourceFrame = readSceneMotionSettings().sourceFrame;
      livePlayback.skippedFrames = 0;
      livePlayback.previousData = null;
    }
    updateLivePlaybackButtons();
    refreshLivePlaybackFacts();
  }

  function livePlaybackTick(nowMs: number): void {
    if (!livePlayback.playing) {
      return;
    }
    const fps = readAnimationSettingsLenient().fps;
    const frameCount = Motion.sourceFrameCount(readSceneMotionSettings().motionId);
    const advanced = LivePlayback.advance(
      livePlayback.sourceFrame,
      frameCount,
      fps,
      livePlayback.dueAtMs,
      nowMs,
      livePlayback.renderInProgress
    );
    const hadDueFrame = advanced.dueAtMs !== livePlayback.dueAtMs;
    if (hadDueFrame) {
      livePlayback.sourceFrame = advanced.frame;
      livePlayback.skippedFrames += advanced.skippedFrames;
      livePlayback.dueAtMs = advanced.dueAtMs;
      motionFrameInput.value = String(livePlayback.sourceFrame);
      renderFacts();
      refreshAnimationFacts();
      if (!livePlayback.renderInProgress) {
        renderLiveRaytraceFrame(livePlayback.sourceFrame, true);
      }
    }
    refreshLivePlaybackFacts();
    livePlayback.rafId = window.requestAnimationFrame(livePlaybackTick);
  }

  function updateLivePlaybackButtons(): void {
    playLiveButton.disabled = livePlayback.playing;
    pauseLiveButton.disabled = !livePlayback.playing;
  }

  function refreshLivePlaybackFacts(): void {
    const fps = active ? readAnimationSettingsLenient().fps : 0;
    const motionSettings = active ? readSceneMotionSettings() : { motionId: "static" as SceneMotionId, sourceFrame: 0 };
    setFacts(livePlaybackFacts, [
      ["Live playback", livePlayback.playing ? "playing" : "paused"],
      ["Source frame", active && motionSettings.motionId !== "static" ? Motion.sourceFrameLabel(livePlayback.sourceFrame) : "static"],
      ["FPS target", fps ? String(fps) : "n/a"],
      ["Last render", livePlayback.lastRenderMs ? `${livePlayback.lastRenderMs.toFixed(0)} ms` : "n/a"],
      ["Skipped", String(livePlayback.skippedFrames)]
    ]);
    updateLivePlaybackButtons();
  }

  function livePlaybackStatus(sourceFrame: number, width: number, height: number, stats: RenderStats): string {
    const motionSettings = readSceneMotionSettings();
    const frameLabel = motionSettings.motionId === "static" ? "static" : Motion.sourceFrameLabel(sourceFrame);
    return (
      `Live ${frameLabel}, ${readAnimationSettingsLenient().fps} fps target, ` +
      `${livePlayback.lastRenderMs.toFixed(0)} ms render, ${livePlayback.skippedFrames} skipped, ` +
      `${width} x ${height}, ${stats.rays} rays`
    );
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
    stopLiveRaytrace(true);
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
    setFlyMode(false, false);
    stopLiveRaytrace(true);
    abortRenderOnly();
    clearPlaybackOnly();
    updateAnimationButtons(false);
  }

  function abortRenderOnly(): void {
    abortToken += 1;
    cleanupRenderWorker();
    renderButton.disabled = false;
    livePlayback.renderInProgress = false;
    livePreviewRenderBusy = false;
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
        `${Experience.effectsSummary(renderOptions.modernEffects ?? Experience.disabledModernEffects())}, ` +
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
      ["Fly View", flyState.enabled ? flyState.pointerLocked ? "mouse-look" : "keyboard/gamepad" : "off"],
      ["Fly speed", readFlySpeed().toFixed(1)],
      ["Gamepad", gamepadEnabledInput.checked ? flyState.gamepadName : "off"],
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
      ["Modern effects", Experience.effectsSummary(readModernEffects())],
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
      modernEffects: readModernEffects(),
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
    const effectsNode = document.createElement("span");
    effectsNode.className = "mode-tag mode-tag-neutral";
    effectsNode.textContent = `FX ${Experience.effectsSummary(readModernEffects())}`;
    profileIndicators.appendChild(effectsNode);
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

  function updateCanvasHint(): void {
    if (flyState.enabled) {
      canvasHintElement.textContent = flyState.pointerLocked
        ? "Fly View: WASD move, QE up/down, mouse look, Esc release, gamepad sticks"
        : "Fly View: click canvas for mouse look, WASD move, gamepad sticks";
      return;
    }
    if (sceneEditModeInput.checked) {
      canvasHintElement.textContent = pointerDrag?.mode === "scene-edit"
        ? "Scene Edit: drag moves selection, Shift-drag moves through depth"
        : "Scene Edit: click a sphere group, drag move, Shift-drag depth";
      return;
    }
    if (pointerDrag?.mode === "pan") {
      canvasHintElement.textContent = "Canvas: panning camera";
      return;
    }
    if (pointerDrag?.mode === "orbit") {
      canvasHintElement.textContent = "Canvas: orbiting camera";
      return;
    }
    canvasHintElement.textContent = "Canvas: drag orbit, Shift/right drag pan, wheel dolly";
  }

  function setStatus(text: string): void {
    statusElement.textContent = text;
  }
}

window.addEventListener("DOMContentLoaded", () => Juggler.App.start());
