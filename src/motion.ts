namespace Juggler.Motion {
  export const SOURCE_FRAME_COUNT = 24;

  export const MOTIONS: Array<{ id: SceneMotionId; label: string }> = [
    { id: "static", label: "Static .dat pose" },
    { id: "juggler-reconstructed", label: "Reconstructed 24-frame juggling" }
  ];

  const BALL_GROUPS = [
    { groupIndex: 0, offset: 0 },
    { groupIndex: 1, offset: 7 },
    { groupIndex: 2, offset: 3 }
  ];

  const LEFT_ARM_GROUP = 12;
  const RIGHT_ARM_GROUP = 11;
  const TAU = Math.PI * 2;

  const BALL_PATH: Vec3[] = [
    [-0.9, -2.1, 5.3],
    [-0.75, -1.8, 6.0],
    [-0.55, -1.5, 6.6],
    [-0.4, -1.2, 6.8],
    [-0.35, -0.6, 7.05],
    [-0.45, 0.2, 6.95],
    [-0.7, 1.1, 6.5],
    [-1.1, 1.9, 5.9],
    [-1.2, 2.1, 5.2],
    [-1.1, 1.7, 5.0],
    [-0.9, 1.2, 5.0],
    [-0.65, 0.5, 5.2],
    [-0.45, 0.0, 5.4],
    [-0.55, -0.6, 5.7],
    [-0.8, -1.2, 6.1],
    [-1.0, -1.8, 5.8],
    [-1.1, -2.1, 5.2],
    [-1.0, -1.7, 5.0],
    [-0.8, -1.2, 5.0],
    [-0.55, -0.6, 5.2],
    [-0.35, 0.0, 5.5],
    [-0.45, 0.7, 6.0],
    [-0.7, 1.4, 6.2],
    [-0.95, 2.0, 5.7]
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
    const pulse = side > 0
      ? Math.max(throwPulse(sourceFrame, 0), throwPulse(sourceFrame, 12))
      : Math.max(throwPulse(sourceFrame, 6), throwPulse(sourceFrame, 18));
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
