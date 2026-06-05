namespace Juggler.Calibration {
  export const CLASSIC_REFERENCE: ClassicCalibrationReference = "juggler-avi-320x200";
  export const CLASSIC_WIDTH = 320;
  export const CLASSIC_HEIGHT = 200;

  export function sourceEquivalentPixelRay(observer: Observer, i: number, j: number): { origin: Vec3; direction: Vec3 } {
    const y = (0.5 * observer.ny - j) * observer.py;
    const x = (i - 0.5 * observer.nx) * observer.px;
    const target = Math3.add(
      Math3.add(
        Math3.add(Math3.mul(observer.viewDir, observer.focalLength), Math3.mul(observer.vhat, y)),
        Math3.mul(observer.uhat, x)
      ),
      observer.position
    );
    return { origin: [...observer.position], direction: Math3.sub(target, observer.position) };
  }

  export function classicRenderOptions(overrides: Partial<RenderOptions> = {}): RenderOptions {
    return {
      profileId: "reference",
      outputMode: "source-ham",
      reflectionMode: "standard",
      epsilon: REFERENCE_EPSILON,
      maxDepth: 4,
      displayConstraintId: "rgb",
      qualityId: "legacy",
      antiAliasMode: "off",
      modernEffects: Experience.disabledModernEffects(),
      acceleration: "bvh",
      tileSize: 12,
      ...overrides
    };
  }

  export function renderClassicFrame(
    scene: ParsedScene,
    baseWorld: World,
    sourceFrame: number,
    options: RenderOptions = classicRenderOptions()
  ): { data: Uint8ClampedArray; stats: RenderStats; sourceFit: SourceFitFrame | null } {
    const motionSettings: SceneMotionSettings = Motion.supportsMotion(scene, "juggler-reconstructed")
      ? { motionId: "juggler-reconstructed", sourceFrame: 0 }
      : { motionId: "static", sourceFrame: 0 };
    const world = Motion.resolveWorld(scene, baseWorld, motionSettings, sourceFrame);
    const observer = Scenes.createObserver(scene, baseWorld, CLASSIC_WIDTH, CLASSIC_HEIGHT, {
      enabled: false,
      angleDeg: 0,
      radius: 10
    });
    const renderer = new Renderer.FrameRenderer(world, observer, options);
    while (!renderer.done()) {
      renderer.renderRows(1);
    }
    return {
      data: new Uint8ClampedArray(renderer.data),
      stats: { ...renderer.stats },
      sourceFit: Motion.sourceFitFrame(scene, world, sourceFrame)
    };
  }

  export function compareClassicFrame(
    rendered: Uint8ClampedArray,
    reference: Uint8ClampedArray,
    width: number,
    height: number,
    sourceFrame: number,
    sourceFit: SourceFitFrame | null = null
  ): ClassicFitFrame {
    const pixelCount = width * height;
    let absolute = 0;
    let squared = 0;
    const renderMask = maskStats(rendered, width, height);
    const referenceMask = maskStats(reference, width, height);
    let intersection = 0;
    let union = 0;

    for (let pixel = 0; pixel < pixelCount; pixel += 1) {
      const offset = pixel * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        const delta = rendered[offset + channel] - reference[offset + channel];
        absolute += Math.abs(delta);
        squared += delta * delta;
      }
      const renderForeground = renderMask.mask[pixel];
      const referenceForeground = referenceMask.mask[pixel];
      if (renderForeground && referenceForeground) {
        intersection += 1;
      }
      if (renderForeground || referenceForeground) {
        union += 1;
      }
    }

    return {
      sourceFrame,
      meanAbsoluteError: absolute / Math.max(1, pixelCount * 3),
      rootMeanSquareError: Math.sqrt(squared / Math.max(1, pixelCount * 3)),
      foregroundOverlap: union ? intersection / union : 1,
      framingError: centroidDistance(renderMask, referenceMask),
      meanBallPixelError: sourceFit?.meanBallPixelError ?? null,
      maxBallPixelError: sourceFit?.maxBallPixelError ?? null
    };
  }

  export function summarizeClassicFit(frames: ClassicFitFrame[]): ClassicFitSummary {
    const frameCount = frames.length;
    const meanBallFrames = frames.filter((frame) => frame.meanBallPixelError !== null);
    const maxBallFrames = frames.filter((frame) => frame.maxBallPixelError !== null);
    return {
      reference: CLASSIC_REFERENCE,
      frameCount,
      meanAbsoluteError: mean(frames.map((frame) => frame.meanAbsoluteError)),
      rootMeanSquareError: mean(frames.map((frame) => frame.rootMeanSquareError)),
      foregroundOverlap: mean(frames.map((frame) => frame.foregroundOverlap)),
      framingError: mean(frames.map((frame) => frame.framingError)),
      meanBallPixelError: meanBallFrames.length ? mean(meanBallFrames.map((frame) => frame.meanBallPixelError ?? 0)) : null,
      maxBallPixelError: maxBallFrames.length ? Math.max(...maxBallFrames.map((frame) => frame.maxBallPixelError ?? 0)) : null
    };
  }

  interface MaskStats {
    mask: boolean[];
    count: number;
    centerX: number;
    centerY: number;
  }

  function maskStats(data: Uint8ClampedArray, width: number, height: number): MaskStats {
    const background = [data[0] ?? 0, data[1] ?? 0, data[2] ?? 0];
    const mask: boolean[] = [];
    let count = 0;
    let sumX = 0;
    let sumY = 0;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const offset = (y * width + x) * 4;
        const distance =
          Math.abs(data[offset] - background[0]) +
          Math.abs(data[offset + 1] - background[1]) +
          Math.abs(data[offset + 2] - background[2]);
        const foreground = distance > 48;
        mask.push(foreground);
        if (foreground) {
          count += 1;
          sumX += x;
          sumY += y;
        }
      }
    }
    return {
      mask,
      count,
      centerX: count ? sumX / count : width / 2,
      centerY: count ? sumY / count : height / 2
    };
  }

  function centroidDistance(a: MaskStats, b: MaskStats): number {
    return Math.hypot(a.centerX - b.centerX, a.centerY - b.centerY);
  }

  function mean(values: number[]): number {
    if (!values.length) {
      return 0;
    }
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }
}
