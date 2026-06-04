namespace Juggler.Animation {
  interface CameraPreset {
    id: CameraPresetId;
    label: string;
    settings?: Partial<Pick<
      CameraPathSettings,
      "pathId" | "startAngleDeg" | "endAngleDeg" | "orbitRadius" | "orbitHeight" | "dollyStartRadius" | "dollyEndRadius"
    >>;
  }

  interface MotionCyclePreset {
    id: MotionCyclePresetId;
    label: string;
    frameCount?: number;
    rangeStartFrame?: number;
    rangeEndFrame?: number;
  }

  export const PATHS: Array<{ id: CameraPathId; label: string }> = [
    { id: "static", label: "Static .dat camera" },
    { id: "orbit-360", label: "Orbit 360" },
    { id: "orbit-arc", label: "Orbit arc" },
    { id: "dolly", label: "Dolly" },
    { id: "custom-keyframes", label: "Custom keyframes" }
  ];

  export const CAMERA_PRESETS: CameraPreset[] = [
    { id: "custom", label: "Custom camera" },
    { id: "source-camera", label: "Historical source camera", settings: { pathId: "static" } },
    { id: "source-orbit", label: "Source-height orbit", settings: { pathId: "orbit-360", startAngleDeg: 20, orbitRadius: 10, orbitHeight: 0 } },
    { id: "left-catch-arc", label: "Left-catch inspection arc", settings: { pathId: "orbit-arc", startAngleDeg: -15, endAngleDeg: 55, orbitRadius: 10, orbitHeight: 0.5 } },
    { id: "right-catch-arc", label: "Right-catch inspection arc", settings: { pathId: "orbit-arc", startAngleDeg: 55, endAngleDeg: -20, orbitRadius: 10, orbitHeight: 0.5 } },
    { id: "overhead-clearance", label: "Overhead clearance orbit", settings: { pathId: "orbit-360", startAngleDeg: 20, orbitRadius: 12, orbitHeight: 4 } },
    { id: "source-dolly", label: "Dolly into source view", settings: { pathId: "dolly", startAngleDeg: 20, endAngleDeg: 20, dollyStartRadius: 14, dollyEndRadius: 7, orbitHeight: 0 } }
  ];

  export const CYCLE_PRESETS: MotionCyclePreset[] = [
    { id: "custom", label: "Custom range" },
    { id: "full-cycle", label: "Full 24-frame cycle", frameCount: Motion.SOURCE_FRAME_COUNT, rangeStartFrame: 0, rangeEndFrame: 23 },
    { id: "apex-to-left", label: "Apex to left catch", frameCount: Motion.SOURCE_FRAME_COUNT, rangeStartFrame: 0, rangeEndFrame: 8 },
    { id: "left-to-right", label: "Left catch to right catch", frameCount: Motion.SOURCE_FRAME_COUNT, rangeStartFrame: 8, rangeEndFrame: 16 },
    { id: "right-to-apex", label: "Right catch to apex", frameCount: Motion.SOURCE_FRAME_COUNT, rangeStartFrame: 16, rangeEndFrame: 23 }
  ];

  export function applyCameraPreset(settings: CameraPathSettings, presetId: CameraPresetId): CameraPathSettings {
    const preset = CAMERA_PRESETS.find((candidate) => candidate.id === presetId);
    return {
      ...settings,
      ...(preset?.settings ?? {}),
      customKeyframes: [...settings.customKeyframes]
    };
  }

  export function applyCyclePreset(settings: CameraPathSettings, presetId: MotionCyclePresetId): CameraPathSettings {
    const preset = CYCLE_PRESETS.find((candidate) => candidate.id === presetId);
    return {
      ...settings,
      frameCount: preset?.frameCount ?? settings.frameCount,
      rangeStartFrame: preset?.rangeStartFrame ?? settings.rangeStartFrame,
      rangeEndFrame: preset?.rangeEndFrame ?? settings.rangeEndFrame,
      customKeyframes: [...settings.customKeyframes]
    };
  }

  export function sceneHasCameraPathData(_scene: ParsedScene): boolean {
    return false;
  }

  export function defaultSettings(): CameraPathSettings {
    return {
      pathId: "orbit-360",
      frameCount: 24,
      rangeStartFrame: 0,
      rangeEndFrame: 23,
      fps: 12,
      startAngleDeg: 0,
      endAngleDeg: 360,
      orbitRadius: 10,
      orbitHeight: 0,
      dollyStartRadius: 14,
      dollyEndRadius: 7,
      customKeyframes: []
    };
  }

  export function evaluateCameraPath(
    scene: ParsedScene,
    world: World,
    settings: CameraPathSettings,
    frameIndex: number
  ): CameraPose {
    const frameCount = Math.max(1, Math.round(settings.frameCount));
    const t = frameCount === 1 ? 0 : frameIndex / (frameCount - 1);
    const target = Scenes.sceneTarget(world);
    const baseZ = scene.observerPosition[2] + settings.orbitHeight;
    const focalLength = scene.focalLength;

    switch (settings.pathId) {
      case "static":
        return Scenes.staticCameraPose(scene);
      case "orbit-360":
        return orbitPose(target, settings.orbitRadius, baseZ, settings.startAngleDeg + 360 * t, focalLength);
      case "orbit-arc":
        return orbitPose(
          target,
          settings.orbitRadius,
          baseZ,
          Math3.lerp(settings.startAngleDeg, settings.endAngleDeg, t),
          focalLength
        );
      case "dolly":
        return orbitPose(
          target,
          Math3.lerp(settings.dollyStartRadius, settings.dollyEndRadius, t),
          baseZ,
          Math3.lerp(settings.startAngleDeg, settings.endAngleDeg, t),
          focalLength
        );
      case "custom-keyframes":
        return evaluateKeyframes(settings.customKeyframes, t, Scenes.staticCameraPose(scene));
    }
  }

  export function parseCustomKeyframes(text: string): CameraKeyframe[] {
    const trimmed = text.trim();
    if (!trimmed) {
      return [];
    }
    const raw = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(raw)) {
      throw new Error("Custom keyframes must be a JSON array");
    }

    const keyframes = raw.map((entry, index) => {
      if (!entry || typeof entry !== "object") {
        throw new Error(`Keyframe ${index + 1} must be an object`);
      }
      const source = entry as Record<string, unknown>;
      const t = Number(source.t);
      const position = readVec(source.position, `Keyframe ${index + 1} position`);
      const target = readVec(source.target, `Keyframe ${index + 1} target`);
      const focalLength = Number(source.focalLength);
      if (!Number.isFinite(t) || !Number.isFinite(focalLength)) {
        throw new Error(`Keyframe ${index + 1} must include numeric t and focalLength`);
      }
      return { t, position, target, focalLength };
    }).sort((a, b) => a.t - b.t);

    if (keyframes.length < 2) {
      throw new Error("Custom keyframes require at least two poses");
    }
    if (keyframes[0].t > 0 || keyframes[keyframes.length - 1].t < 1) {
      throw new Error("Custom keyframes must cover t=0 through t=1");
    }
    return keyframes;
  }

  export function defaultCustomKeyframes(scene: ParsedScene, world: World, settings: CameraPathSettings): CameraKeyframe[] {
    const target = Scenes.sceneTarget(world);
    const start = Scenes.staticCameraPose(scene);
    const end = orbitPose(target, settings.orbitRadius, scene.observerPosition[2] + settings.orbitHeight, 180, scene.focalLength);
    return [
      { t: 0, position: start.position, target: start.target, focalLength: start.focalLength },
      { t: 1, position: end.position, target: end.target, focalLength: end.focalLength }
    ];
  }

  export function createManifest(
    sceneSource: SceneSource,
    world: World,
    pathSettings: CameraPathSettings,
    motionSettings: SceneMotionSettings,
    diagnostics: Motion.MotionDiagnostics | null,
    frames: RenderedFrame[],
    exportedAt = new Date().toISOString()
  ): AnimationManifest {
    const first = frames[0];
    return {
      format: "amiga-juggler-animation-manifest",
      version: 1,
      exportedAt,
      scene: {
        id: sceneSource.id,
        name: sceneSource.name,
        sourcePath: sceneSource.sourcePath,
        sphereCount: world.spheres.length
      },
      render: {
        width: first?.width ?? 0,
        height: first?.height ?? 0,
        profileId: first?.profileId ?? "reference"
      },
      animation: copyPathSettings(pathSettings),
      motion: { ...motionSettings },
      diagnostics: diagnostics ? { ...diagnostics } : null,
      frames: frames.map((frame, bufferIndex) => ({
        bufferIndex,
        outputFrame: frame.index,
        outputFrameNumber: frame.index + 1,
        sourceFrame: frame.sceneFrame,
        sourceFrameLabel: frame.motionId === "juggler-reconstructed" ? Motion.sourceFrameLabel(frame.sceneFrame) : "static",
        renderMs: frame.renderMs,
        camera: copyCameraPose(frame.pose),
        stats: { ...frame.stats },
        motion: {
          id: frame.motionId,
          bodyClearance: frame.motionClearance,
          ballClearance: frame.motionBallClearance,
          balls: copyMotionSamples(frame.motionBalls),
          hands: copyMotionSamples(frame.motionHands)
        }
      }))
    };
  }

  export class AnimationRenderer {
    readonly frames: RenderedFrame[] = [];
    private frameIndex: number;
    private renderedIndex = 0;
    private frameRenderer: Renderer.FrameRenderer | null = null;
    private frameStarted = 0;
    private currentPose: CameraPose | null = null;
    private currentClearance: number | null = null;
    private currentBallClearance: number | null = null;
    private currentBallSamples: MotionObjectSample[] = [];
    private currentHandSamples: MotionObjectSample[] = [];

    constructor(
      private readonly scene: ParsedScene,
      private readonly world: World,
      private readonly width: number,
      private readonly height: number,
      private readonly renderOptions: RenderOptions,
      private readonly pathSettings: CameraPathSettings,
      private readonly motionSettings: SceneMotionSettings = { motionId: "static", sourceFrame: 0 },
      private readonly groupTransforms: GroupTransformState = {}
    ) {
      this.frameIndex = rangeStart(pathSettings);
    }

    step(rowsPerTick: number): AnimationProgress {
      const outputFrameCount = rangeFrameCount(this.pathSettings);
      const endFrame = rangeEnd(this.pathSettings);
      if (this.frameIndex > endFrame) {
        return this.progress(null, true);
      }

      if (!this.frameRenderer) {
        const sourceFrame = Motion.animationSampleFrame(this.motionSettings, this.frameIndex, totalFrameCount(this.pathSettings));
        const frameWorld = Transforms.apply(
          Motion.resolveWorld(this.scene, this.world, this.motionSettings, sourceFrame),
          this.groupTransforms
        );
        this.currentPose = evaluateCameraPath(this.scene, this.world, this.pathSettings, this.frameIndex);
        this.currentClearance = Motion.frameBodyClearance(frameWorld);
        this.currentBallClearance = Motion.frameBallClearance(frameWorld);
        this.currentBallSamples = Motion.frameBallSamples(frameWorld);
        this.currentHandSamples = Motion.frameHandSamples(frameWorld);
        const observer = Scenes.createObserverFromPose(this.currentPose, this.width, this.height);
        this.frameRenderer = new Renderer.FrameRenderer(frameWorld, observer, this.renderOptions);
        this.frameStarted = now();
      }

      this.frameRenderer.renderRows(rowsPerTick);
      let completedFrame: RenderedFrame | null = null;
      if (this.frameRenderer.done()) {
        completedFrame = {
          index: this.frameIndex,
          width: this.width,
          height: this.height,
          data: new Uint8ClampedArray(this.frameRenderer.data),
          stats: { ...this.frameRenderer.stats },
          renderMs: now() - this.frameStarted,
          pose: this.currentPose!,
          sceneFrame: Motion.animationSampleFrame(this.motionSettings, this.frameIndex, totalFrameCount(this.pathSettings)),
          motionId: this.motionSettings.motionId,
          motionClearance: this.currentClearance,
          motionBallClearance: this.currentBallClearance,
          motionBalls: copyMotionSamples(this.currentBallSamples),
          motionHands: copyMotionSamples(this.currentHandSamples),
          profileId: this.renderOptions.profileId
        };
        this.frames.push(completedFrame);
        this.frameIndex += 1;
        this.renderedIndex += 1;
        this.frameRenderer = null;
        this.currentPose = null;
        this.currentClearance = null;
        this.currentBallClearance = null;
        this.currentBallSamples = [];
        this.currentHandSamples = [];
      }

      return this.progress(completedFrame, this.renderedIndex >= outputFrameCount);
    }

    private progress(completedFrame: RenderedFrame | null, done: boolean): AnimationProgress {
      const frameCount = rangeFrameCount(this.pathSettings);
      const rowProgress = this.frameRenderer ? this.frameRenderer.progress() : 0;
      const overallProgress = Math.min(1, (this.renderedIndex + rowProgress) / frameCount);
      return {
        frameIndex: Math.min(this.renderedIndex, frameCount - 1),
        frameCount,
        rowProgress,
        overallProgress,
        done,
        completedFrame,
        currentData: this.frameRenderer ? this.frameRenderer.data : completedFrame?.data ?? null
      };
    }
  }

  function orbitPose(target: Vec3, radius: number, z: number, angleDeg: number, focalLength: number): CameraPose {
    const angle = angleDeg * Math.PI / 180;
    return {
      position: [target[0] - radius * Math.cos(angle), target[1] - radius * Math.sin(angle), z],
      target: [...target],
      focalLength
    };
  }

  function totalFrameCount(settings: CameraPathSettings): number {
    return Math.max(1, Math.round(settings.frameCount));
  }

  function rangeStart(settings: CameraPathSettings): number {
    return Math.max(0, Math.min(totalFrameCount(settings) - 1, Math.round(settings.rangeStartFrame)));
  }

  function rangeEnd(settings: CameraPathSettings): number {
    return Math.max(rangeStart(settings), Math.min(totalFrameCount(settings) - 1, Math.round(settings.rangeEndFrame)));
  }

  function rangeFrameCount(settings: CameraPathSettings): number {
    return rangeEnd(settings) - rangeStart(settings) + 1;
  }

  function evaluateKeyframes(keyframes: CameraKeyframe[], t: number, fallback: CameraPose): CameraPose {
    if (keyframes.length < 2) {
      return fallback;
    }
    let left = keyframes[0];
    let right = keyframes[keyframes.length - 1];
    for (let i = 0; i < keyframes.length - 1; i += 1) {
      if (t >= keyframes[i].t && t <= keyframes[i + 1].t) {
        left = keyframes[i];
        right = keyframes[i + 1];
        break;
      }
    }
    const span = Math.max(1e-9, right.t - left.t);
    const localT = Math.max(0, Math.min(1, (t - left.t) / span));
    return {
      position: Math3.lerpVec(left.position, right.position, localT),
      target: Math3.lerpVec(left.target, right.target, localT),
      focalLength: Math3.lerp(left.focalLength, right.focalLength, localT)
    };
  }

  function readVec(value: unknown, label: string): Vec3 {
    if (!Array.isArray(value) || value.length !== 3) {
      throw new Error(`${label} must be a 3-number array`);
    }
    const vec = value.map((part) => Number(part));
    if (!vec.every(Number.isFinite)) {
      throw new Error(`${label} must contain finite numbers`);
    }
    return [vec[0], vec[1], vec[2]];
  }

  function copyPathSettings(settings: CameraPathSettings): CameraPathSettings {
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

  function copyCameraPose(pose: CameraPose): CameraPose {
    return {
      position: [...pose.position],
      target: [...pose.target],
      focalLength: pose.focalLength
    };
  }

  function copyMotionSamples(samples: MotionObjectSample[]): MotionObjectSample[] {
    return samples.map((sample) => ({
      label: sample.label,
      groupIndex: sample.groupIndex,
      position: [...sample.position],
      radius: sample.radius
    }));
  }

  function now(): number {
    return typeof performance !== "undefined" ? performance.now() : Date.now();
  }
}
