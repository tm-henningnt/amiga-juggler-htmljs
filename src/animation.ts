namespace Juggler.Animation {
  export const PATHS: Array<{ id: CameraPathId; label: string }> = [
    { id: "static", label: "Static .dat camera" },
    { id: "orbit-360", label: "Orbit 360" },
    { id: "orbit-arc", label: "Orbit arc" },
    { id: "dolly", label: "Dolly" },
    { id: "custom-keyframes", label: "Custom keyframes" }
  ];

  export function sceneHasCameraPathData(_scene: ParsedScene): boolean {
    return false;
  }

  export function defaultSettings(): CameraPathSettings {
    return {
      pathId: "orbit-360",
      frameCount: 24,
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

  export class AnimationRenderer {
    readonly frames: RenderedFrame[] = [];
    private frameIndex = 0;
    private frameRenderer: Renderer.FrameRenderer | null = null;
    private frameStarted = 0;
    private currentPose: CameraPose | null = null;

    constructor(
      private readonly scene: ParsedScene,
      private readonly world: World,
      private readonly width: number,
      private readonly height: number,
      private readonly renderOptions: RenderOptions,
      private readonly pathSettings: CameraPathSettings,
      private readonly motionSettings: SceneMotionSettings = { motionId: "static", sourceFrame: 0 }
    ) {}

    step(rowsPerTick: number): AnimationProgress {
      const frameCount = Math.max(1, Math.round(this.pathSettings.frameCount));
      if (this.frameIndex >= frameCount) {
        return this.progress(null, true);
      }

      if (!this.frameRenderer) {
        const sourceFrame = Motion.animationSampleFrame(this.motionSettings, this.frameIndex, frameCount);
        const frameWorld = Motion.resolveWorld(this.scene, this.world, this.motionSettings, sourceFrame);
        this.currentPose = evaluateCameraPath(this.scene, this.world, this.pathSettings, this.frameIndex);
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
          sceneFrame: Motion.animationSampleFrame(this.motionSettings, this.frameIndex, frameCount),
          motionId: this.motionSettings.motionId
        };
        this.frames.push(completedFrame);
        this.frameIndex += 1;
        this.frameRenderer = null;
        this.currentPose = null;
      }

      return this.progress(completedFrame, this.frameIndex >= frameCount);
    }

    private progress(completedFrame: RenderedFrame | null, done: boolean): AnimationProgress {
      const frameCount = Math.max(1, Math.round(this.pathSettings.frameCount));
      const rowProgress = this.frameRenderer ? this.frameRenderer.progress() : 0;
      const overallProgress = Math.min(1, (this.frameIndex + rowProgress) / frameCount);
      return {
        frameIndex: Math.min(this.frameIndex, frameCount - 1),
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

  function now(): number {
    return typeof performance !== "undefined" ? performance.now() : Date.now();
  }
}
