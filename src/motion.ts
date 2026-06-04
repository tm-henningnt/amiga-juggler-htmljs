namespace Juggler.Motion {
  export const SOURCE_FRAME_COUNT = 24;

  export const MOTIONS: Array<{ id: SceneMotionId; label: string }> = [
    { id: "static", label: "Static .dat pose" },
    { id: "juggler-reconstructed", label: "Reconstructed 24-frame juggling" }
  ];

  const BALL_GROUPS = [
    { groupIndex: 0, arc: "high" as BallArc, offset: SOURCE_FRAME_COUNT },
    { groupIndex: 1, arc: "low" as BallArc, offset: 0 },
    { groupIndex: 2, arc: "high" as BallArc, offset: 0 }
  ];

  const LEFT_ARM_GROUP = 12;
  const RIGHT_ARM_GROUP = 11;
  const BODY_COLLISION_GROUPS = [3, 4, 5, 6, 7, 8];
  const LEFT_CONTACT_INDEX = 8;
  const RIGHT_CONTACT_INDEX = 16;
  type BallArc = "high" | "low";

  export interface MotionDiagnostics {
    minBodyClearance: number;
    minBodyClearanceFrame: number;
    minBodyClearanceBallGroup: number;
    minBallClearance: number;
    minBallClearanceFrame: number;
    maxHandContactError: number;
  }

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

  export function sourceFrameLabel(sourceFrame: number): string {
    const frame = Math.floor(mod(sourceFrame, SOURCE_FRAME_COUNT));
    return `${frame + 1}/${SOURCE_FRAME_COUNT} ${sourceFramePhase(frame)}`;
  }

  export function sourceRangeLabel(settings: SceneMotionSettings, startFrame: number, endFrame: number, frameCount: number): string {
    if (settings.motionId === "static") {
      return "static";
    }
    const start = animationSampleFrame(settings, startFrame, frameCount);
    const end = animationSampleFrame(settings, endFrame, frameCount);
    return `${sourceFrameLabel(start)} -> ${sourceFrameLabel(end)}`;
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
        center: sampleBall(ball.arc, ball.offset + sourceFrame),
        radius: source.controls[0]?.radius ?? 0.6,
        interpolationFromPrevious: null
      }];
    }

    animated.groups[RIGHT_ARM_GROUP].controls = armControls(-1, sourceFrame);
    animated.groups[LEFT_ARM_GROUP].controls = armControls(1, sourceFrame);
    return Scenes.buildWorld(animated);
  }

  export function sourcePathPoint(pathIndex: number): Vec3 {
    const frame = mod(pathIndex, SOURCE_FRAME_COUNT);
    if (frame < LEFT_CONTACT_INDEX) {
      return Math3.lerpVec(
        [MotionData.BALL_PLANE_X, 0, MotionData.HIGH_ARC_APEX_Z],
        MotionData.LEFT_HAND_BALL_CENTER,
        frame / LEFT_CONTACT_INDEX
      );
    }
    if (frame < RIGHT_CONTACT_INDEX) {
      return parabolicArc(
        MotionData.LEFT_HAND_BALL_CENTER,
        MotionData.RIGHT_HAND_BALL_CENTER,
        MotionData.LOW_ARC_APEX_Z,
        (frame - LEFT_CONTACT_INDEX) / (RIGHT_CONTACT_INDEX - LEFT_CONTACT_INDEX)
      );
    }
    return Math3.lerpVec(
      MotionData.RIGHT_HAND_BALL_CENTER,
      [MotionData.BALL_PLANE_X, 0, MotionData.HIGH_ARC_APEX_Z],
      (frame - RIGHT_CONTACT_INDEX) / (SOURCE_FRAME_COUNT - RIGHT_CONTACT_INDEX)
    );
  }

  export function rawSourcePathPoint(pathIndex: number): Vec3 {
    const index = Math.floor(mod(pathIndex, MotionData.RAW_BALL_PATH.length));
    return [...MotionData.RAW_BALL_PATH[index]];
  }

  export function projectToSourcePixel(scene: ParsedScene, point: Vec3): [number, number] {
    const observer = Scenes.createObserver(scene, Scenes.buildWorld(scene), 320, 200, {
      enabled: false,
      angleDeg: 0,
      radius: 10
    });
    const delta = Math3.sub(point, observer.position);
    const forward = Math3.dot(delta, observer.viewDir);
    const x = Math3.dot(delta, observer.uhat) * observer.focalLength / forward;
    const y = Math3.dot(delta, observer.vhat) * observer.focalLength / forward;
    return [
      x / observer.px + 0.5 * observer.nx,
      0.5 * observer.ny - y / observer.py
    ];
  }

  export function frameBodyClearance(world: World): number | null {
    const balls = world.spheres.filter((sphere) => BALL_GROUPS.some((ball) => ball.groupIndex === sphere.groupIndex));
    const body = world.spheres.filter((sphere) => BODY_COLLISION_GROUPS.includes(sphere.groupIndex));
    if (!balls.length || !body.length) {
      return null;
    }

    let minClearance = BIG;
    for (const ball of balls) {
      for (const bodySphere of body) {
        const distance = Math3.length(Math3.sub(ball.position, bodySphere.position));
        minClearance = Math.min(minClearance, distance - ball.radius - bodySphere.radius);
      }
    }
    return minClearance;
  }

  export function frameBallClearance(world: World): number | null {
    const balls = world.spheres.filter((sphere) => BALL_GROUPS.some((ball) => ball.groupIndex === sphere.groupIndex));
    if (balls.length < 2) {
      return null;
    }

    let minClearance = BIG;
    for (let i = 0; i < balls.length; i += 1) {
      for (let j = i + 1; j < balls.length; j += 1) {
        const distance = Math3.length(Math3.sub(balls[i].position, balls[j].position));
        minClearance = Math.min(minClearance, distance - balls[i].radius - balls[j].radius);
      }
    }
    return minClearance;
  }

  export function frameBallSamples(world: World): MotionObjectSample[] {
    return BALL_GROUPS.flatMap((ball, index) => {
      const sphere = world.spheres.find((candidate) => candidate.groupIndex === ball.groupIndex);
      return sphere ? [motionObjectSample(sphere, `ball ${index + 1} ${ball.arc} arc`)] : [];
    });
  }

  export function frameHandSamples(world: World): MotionObjectSample[] {
    const right = lastSphereForGroup(world, RIGHT_ARM_GROUP);
    const left = lastSphereForGroup(world, LEFT_ARM_GROUP);
    const samples: MotionObjectSample[] = [];
    if (right) {
      samples.push(motionObjectSample(right, "right wrist"));
    }
    if (left) {
      samples.push(motionObjectSample(left, "left wrist"));
    }
    return samples;
  }

  export function diagnostics(scene: ParsedScene, baseWorld: World, settings: SceneMotionSettings): MotionDiagnostics | null {
    if (settings.motionId !== "juggler-reconstructed" || !supportsJugglerMotion(scene)) {
      return null;
    }

    let minBodyClearance = BIG;
    let minBodyClearanceFrame = 0;
    let minBodyClearanceBallGroup = -1;
    let minBallClearance = BIG;
    let minBallClearanceFrame = 0;
    let maxHandContactError = 0;

    for (let frame = 0; frame < SOURCE_FRAME_COUNT; frame += 1) {
      const world = resolveWorld(scene, baseWorld, settings, frame + settings.sourceFrame);
      const ballClearance = frameBallClearance(world);
      if (ballClearance !== null && ballClearance < minBallClearance) {
        minBallClearance = ballClearance;
        minBallClearanceFrame = frame;
      }
      const body = world.spheres.filter((sphere) => BODY_COLLISION_GROUPS.includes(sphere.groupIndex));
      for (const ball of BALL_GROUPS) {
        const sphere = world.spheres.find((candidate) => candidate.groupIndex === ball.groupIndex);
        if (!sphere) {
          continue;
        }
        for (const bodySphere of body) {
          const distance = Math3.length(Math3.sub(sphere.position, bodySphere.position));
          const clearance = distance - sphere.radius - bodySphere.radius;
          if (clearance < minBodyClearance) {
            minBodyClearance = clearance;
            minBodyClearanceFrame = frame;
            minBodyClearanceBallGroup = ball.groupIndex;
          }
        }
      }

      if (contactPulse(frame + settings.sourceFrame) > 0.9) {
        maxHandContactError = Math.max(maxHandContactError, handContactError(world, LEFT_ARM_GROUP));
        maxHandContactError = Math.max(maxHandContactError, handContactError(world, RIGHT_ARM_GROUP));
      }
    }

    return {
      minBodyClearance,
      minBodyClearanceFrame,
      minBodyClearanceBallGroup,
      minBallClearance,
      minBallClearanceFrame,
      maxHandContactError
    };
  }

  export function motionSummary(scene: ParsedScene, settings: SceneMotionSettings): string {
    if (settings.motionId === "juggler-reconstructed" && supportsJugglerMotion(scene)) {
      return `source ${sourceFrameLabel(settings.sourceFrame)}`;
    }
    return "static source pose";
  }

  function sourceFramePhase(frame: number): string {
    if (frame === 0) {
      return "apex";
    }
    if (frame < LEFT_CONTACT_INDEX) {
      return "falling to left catch";
    }
    if (frame === LEFT_CONTACT_INDEX) {
      return "left catch";
    }
    if (frame < RIGHT_CONTACT_INDEX) {
      return "crossing to right catch";
    }
    if (frame === RIGHT_CONTACT_INDEX) {
      return "right catch";
    }
    return "rising to apex";
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

  function sampleBall(arc: BallArc, sampleFrame: number): Vec3 {
    return arc === "high" ? sampleHighArc(sampleFrame) : sampleLowArc(sampleFrame);
  }

  function armControls(side: -1 | 1, sourceFrame: number): SphereControl[] {
    const handCenter = side > 0 ? MotionData.LEFT_HAND_BALL_CENTER : MotionData.RIGHT_HAND_BALL_CENTER;
    const contactBall = nearestBallToHand(sourceFrame, handCenter);
    const pulse = handProximityPulse(contactBall, handCenter);
    const contact = wristTarget(contactBall, side);

    if (side > 0) {
      const wrist = Math3.lerpVec([-1.35, 1.7, 4.05], contact, pulse);
      const elbow = Math3.lerpVec([0, 0.7, 5.1], wrist, 0.55);
      return [
        { center: [0, 0.7, 5.1], radius: 0.2, interpolationFromPrevious: null },
        { center: elbow, radius: 0.2, interpolationFromPrevious: 6 },
        { center: wrist, radius: 0.1, interpolationFromPrevious: 7 }
      ];
    } else {
      const wrist = Math3.lerpVec([-1.2, -1.55, 4.0], contact, pulse);
      const elbow = Math3.lerpVec([0, -0.7, 5.1], wrist, 0.55);
      return [
        { center: [0, -0.7, 5.1], radius: 0.2, interpolationFromPrevious: null },
        { center: elbow, radius: 0.2, interpolationFromPrevious: 6 },
        { center: wrist, radius: 0.1, interpolationFromPrevious: 7 }
      ];
    }
  }

  function sampleHighArc(sampleFrame: number): Vec3 {
    const t = mod(sampleFrame, SOURCE_FRAME_COUNT * 2) / (SOURCE_FRAME_COUNT * 2);
    return parabolicArc(
      MotionData.RIGHT_HAND_BALL_CENTER,
      MotionData.LEFT_HAND_BALL_CENTER,
      MotionData.HIGH_ARC_APEX_Z,
      t
    );
  }

  function sampleLowArc(sampleFrame: number): Vec3 {
    const t = mod(sampleFrame, SOURCE_FRAME_COUNT) / SOURCE_FRAME_COUNT;
    return parabolicArc(
      MotionData.LEFT_HAND_BALL_CENTER,
      MotionData.RIGHT_HAND_BALL_CENTER,
      MotionData.LOW_ARC_APEX_Z,
      t
    );
  }

  function parabolicArc(start: Vec3, end: Vec3, apexZ: number, t: number): Vec3 {
    const clamped = Math.max(0, Math.min(1, t));
    const center = Math3.lerpVec(start, end, clamped);
    const baseZ = Math3.lerp(start[2], end[2], clamped);
    center[2] = baseZ + 4 * (apexZ - baseZ) * clamped * (1 - clamped);
    return center;
  }

  function wristTarget(ballCenter: Vec3, side: -1 | 1): Vec3 {
    return [ballCenter[0] + 0.08, ballCenter[1] + side * 0.16, ballCenter[2] - 0.56];
  }

  function nearestBallToHand(sourceFrame: number, handCenter: Vec3): Vec3 {
    let best = sampleBall(BALL_GROUPS[0].arc, BALL_GROUPS[0].offset + sourceFrame);
    let bestDistance = Math3.length(Math3.sub(best, handCenter));
    for (let i = 1; i < BALL_GROUPS.length; i += 1) {
      const candidate = sampleBall(BALL_GROUPS[i].arc, BALL_GROUPS[i].offset + sourceFrame);
      const distance = Math3.length(Math3.sub(candidate, handCenter));
      if (distance < bestDistance) {
        best = candidate;
        bestDistance = distance;
      }
    }
    return best;
  }

  function handProximityPulse(ballCenter: Vec3, handCenter: Vec3): number {
    const distance = Math3.length(Math3.sub(ballCenter, handCenter));
    const normalized = Math.max(0, 1 - distance / 1.35);
    return normalized * normalized;
  }

  function handContactError(world: World, armGroup: number): number {
    const wrist = lastSphereForGroup(world, armGroup);
    if (!wrist) {
      return BIG;
    }
    let best = BIG;
    for (const ball of BALL_GROUPS) {
      const sphere = world.spheres.find((candidate) => candidate.groupIndex === ball.groupIndex);
      if (!sphere) {
        continue;
      }
      const surfaceDistance = Math.abs(Math3.length(Math3.sub(sphere.position, wrist.position)) - sphere.radius - wrist.radius);
      best = Math.min(best, surfaceDistance);
    }
    return best;
  }

  function motionObjectSample(sphere: Sphere, label: string): MotionObjectSample {
    return {
      label,
      groupIndex: sphere.groupIndex,
      position: [...sphere.position],
      radius: sphere.radius
    };
  }

  function lastSphereForGroup(world: World, groupIndex: number): Sphere | null {
    let match: Sphere | null = null;
    for (const sphere of world.spheres) {
      if (sphere.groupIndex === groupIndex) {
        match = sphere;
      }
    }
    return match;
  }

  function contactPulse(sourceFrame: number): number {
    return Math.max(
      handProximityPulse(nearestBallToHand(sourceFrame, MotionData.LEFT_HAND_BALL_CENTER), MotionData.LEFT_HAND_BALL_CENTER),
      handProximityPulse(nearestBallToHand(sourceFrame, MotionData.RIGHT_HAND_BALL_CENTER), MotionData.RIGHT_HAND_BALL_CENTER)
    );
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
