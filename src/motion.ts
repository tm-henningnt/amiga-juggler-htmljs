namespace Juggler.Motion {
  export const SOURCE_FRAME_COUNT = 24;

  export const MOTIONS: Array<{ id: SceneMotionId; label: string }> = [
    { id: "static", label: "Static .dat pose" },
    { id: "juggler-reconstructed", label: "Reconstructed 24-frame juggling" }
  ];

  const BALL_GROUPS = [
    { groupIndex: 0, offset: 0 },
    { groupIndex: 1, offset: 8 },
    { groupIndex: 2, offset: 16 }
  ];

  const LEFT_ARM_GROUP = 12;
  const RIGHT_ARM_GROUP = 11;
  const TAU = Math.PI * 2;

  // Reconstructed from manually labeled reference frames.
  // 72-frame single-ball cycle (fall → hand-transition → rise) compressed 3× to 24 entries.
  // Seam at index 23→0 is ~0.16 world units — smooth wraparound.
  // offsets: group0=0 (apex at source 0), group1=8 (left hand), group2=16 (right throw)
  const BALL_PATH: Vec3[] = [
    [-0.076,  0.641, 7.191],
    [-0.148,  0.757, 7.033],
    [-0.228,  0.834, 6.757],
    [-0.308,  0.911, 6.482],
    [-0.420,  0.977, 6.009],
    [-0.539,  1.040, 5.497],
    [-0.707,  1.156, 4.827],
    [-0.820,  1.080, 4.079],
    [-1.001,  1.191, 3.330],
    [-0.880,  1.022, 3.645],
    [-0.777,  0.882, 3.921],
    [-0.688,  0.737, 4.118],
    [-0.567,  0.426, 4.158],
    [-0.494,  0.205, 4.118],
    [-0.429, -0.055, 3.961],
    [-0.413, -0.262, 3.645],
    [-0.382, -0.570, 3.212],
    [-0.258, -0.383, 4.236],
    [-0.171, -0.174, 5.103],
    [-0.101, -0.042, 5.733],
    [-0.062,  0.114, 6.245],
    [-0.022,  0.270, 6.757],
    [-0.029,  0.410, 6.994],
    [-0.043,  0.511, 7.112]
  ];

  export function availableMotions(scene: ParsedScene): Array<{ id: SceneMotionId; label: string }> {
    return MOTIONS.filter((motion) => motion.id === "static" || supportsJugglerMotion(scene));
  }

  export function supportsMotion(scene: ParsedScene, motionId: SceneMotionId): boolean {
    return motionId === "static" || supportsJugglerMotion(scene);
  }

  export function sourceFrameCount(motionId: SceneMotionId): number {
    return motionId === "juggler-reconstructed" ? SOURCE_FRAME_COUNT : 1;
  }

  export function labelFor(motionId: SceneMotionId): string {
    return MOTIONS.find((motion) => motion.id === motionId)?.label ?? motionId;
  }

  export function animationSampleFrame(settings: SceneMotionSettings, frameIndex: number, frameCount: number): number {
    if (settings.motionId === "static") {
      return 0;
    }
    const outputFrames = Math.max(1, Math.round(frameCount));
    const cycleT = outputFrames === 1 ? 0 : frameIndex / outputFrames;
    return settings.sourceFrame + cycleT * SOURCE_FRAME_COUNT;
  }

  export function resolveWorld(
    scene: ParsedScene,
    baseWorld: World,
    settings: SceneMotionSettings,
    sourceFrame: number
  ): World {
    if (settings.motionId !== "juggler-reconstructed" || !supportsJugglerMotion(scene)) {
      return baseWorld;
    }

    const animated = cloneScene(scene);
    for (const ball of BALL_GROUPS) {
      const group = animated.groups[ball.groupIndex];
      const source = scene.groups[ball.groupIndex];
      if (!group || !source) {
        continue;
      }
      group.controls = [{
        center: sampleBall(ball.offset + sourceFrame),
        radius: source.controls[0]?.radius ?? 0.6,
        interpolationFromPrevious: null
      }];
    }

    animated.groups[RIGHT_ARM_GROUP].controls = armControls(-1, sourceFrame);
    animated.groups[LEFT_ARM_GROUP].controls = armControls(1, sourceFrame);
    return Scenes.buildWorld(animated);
  }

  export function motionSummary(scene: ParsedScene, settings: SceneMotionSettings): string {
    if (settings.motionId === "juggler-reconstructed" && supportsJugglerMotion(scene)) {
      return `source frame ${Math.floor(mod(settings.sourceFrame, SOURCE_FRAME_COUNT)) + 1}/${SOURCE_FRAME_COUNT}`;
    }
    return "static source pose";
  }

  function supportsJugglerMotion(scene: ParsedScene): boolean {
    if (scene.groups.length < 13) {
      return false;
    }
    return BALL_GROUPS.every((ball) => {
      const group = scene.groups[ball.groupIndex];
      return group?.type === MIRROR && group.controls.length === 1 && Math.abs(group.controls[0].radius - 0.6) < 0.01;
    });
  }

  function sampleBall(sampleFrame: number): Vec3 {
    return samplePath(BALL_PATH, sampleFrame);
  }

  function armControls(side: -1 | 1, sourceFrame: number): SphereControl[] {
    // Throws happen every 8 frames (path indices 8=left-hand, 16=right-hand).
    // Left arm (side>0) peaks at index 8 → source frames 0,8,16.
    // Right arm (side<0) peaks at index 16 → source frames 0,8,16 (staggered via position).
    const pulse = side > 0
      ? Math.max(throwPulse(sourceFrame, 0), throwPulse(sourceFrame, 8), throwPulse(sourceFrame, 16))
      : Math.max(throwPulse(sourceFrame, 4), throwPulse(sourceFrame, 12), throwPulse(sourceFrame, 20));
    const settle = 1 - pulse;
    return [
      {
        center: [0, side * 0.7, 5.1],
        radius: 0.2,
        interpolationFromPrevious: null
      },
      {
        center: [-0.25 - 0.08 * pulse, side * (1.18 + 0.16 * settle), 4.24 + 0.46 * pulse],
        radius: 0.2,
        interpolationFromPrevious: 6
      },
      {
        center: [-1.06 + 0.12 * pulse, side * (1.95 - 0.22 * pulse), 4.1 + 0.72 * pulse],
        radius: 0.1,
        interpolationFromPrevious: 7
      }
    ];
  }

  function throwPulse(sourceFrame: number, centerFrame: number): number {
    const distance = circularDistance(sourceFrame, centerFrame, SOURCE_FRAME_COUNT);
    const normalized = Math.max(0, 1 - distance / 4);
    return normalized * normalized;
  }

  function samplePath(path: Vec3[], sampleFrame: number): Vec3 {
    const wrapped = mod(sampleFrame, path.length);
    const leftIndex = Math.floor(wrapped);
    const rightIndex = (leftIndex + 1) % path.length;
    const t = wrapped - leftIndex;
    return Math3.lerpVec(path[leftIndex], path[rightIndex], smoothstep(t));
  }

  function circularDistance(frame: number, center: number, cycle: number): number {
    const delta = Math.abs(mod(frame - center, cycle));
    return Math.min(delta, cycle - delta);
  }

  function smoothstep(t: number): number {
    return t * t * (3 - 2 * t);
  }

  function cloneScene(scene: ParsedScene): ParsedScene {
    return {
      sourceName: scene.sourceName,
      observerPosition: [...scene.observerPosition],
      altitudeDeg: scene.altitudeDeg,
      azimuthDeg: scene.azimuthDeg,
      focalLength: scene.focalLength,
      groups: scene.groups.map((group) => ({
        color: [...group.color],
        type: group.type,
        sourceType: group.sourceType,
        controls: group.controls.map((control) => ({
          center: [...control.center],
          radius: control.radius,
          interpolationFromPrevious: control.interpolationFromPrevious
        }))
      })),
      lamps: scene.lamps.map((lamp) => ({
        position: [...lamp.position],
        radius: lamp.radius,
        color: [...lamp.color]
      })),
      horizon: [[...scene.horizon[0]], [...scene.horizon[1]]],
      illum: [...scene.illum],
      skyZenith: [...scene.skyZenith],
      skyHorizon: [...scene.skyHorizon]
    };
  }

  function mod(value: number, divisor: number): number {
    return ((value % divisor) + divisor) % divisor;
  }
}
