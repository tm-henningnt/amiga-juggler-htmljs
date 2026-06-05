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

  const HEAD_GROUP = 3;
  const HAIR_GROUP = 4;
  const LEFT_EYE_GROUP = 5;
  const RIGHT_EYE_GROUP = 6;
  const NECK_GROUP = 7;
  const TORSO_GROUP = 8;
  const CHARACTER_RIGHT_LEG_GROUP = 9;
  const CHARACTER_LEFT_LEG_GROUP = 10;
  const LEFT_ARM_GROUP = 12;
  const RIGHT_ARM_GROUP = 11;
  const BODY_COLLISION_GROUPS = [3, 4, 5, 6, 7, 8];
  const LEFT_CONTACT_INDEX = 8;
  const RIGHT_CONTACT_INDEX = 16;
  const SOURCE_ANCHOR_OFFSETS = [0, LEFT_CONTACT_INDEX, RIGHT_CONTACT_INDEX];

  const HIPS_MIN_Z = 3.18;
  const HIPS_MAX_Z = 3.36;
  const TORSO_LENGTH = 1.3;
  const NECK_OFFSET = 2.2;
  const HEAD_OFFSET = 2.78;
  const HAIR_OFFSET = 2.8;
  const SHOULDER_OFFSET = 1.8;
  const SHOULDER_SIDE = 0.7;
  const HIP_SOCKET_OFFSET = -0.4;
  const LEG_SIDE = 0.6;
  const ARM_UPPER_LENGTH = 1.25;
  const ARM_LOWER_LENGTH = 1.35;
  const CHARACTER_RIGHT_LEG_UPPER_LENGTH = 1.43;
  const CHARACTER_RIGHT_LEG_LOWER_LENGTH = 1.62;
  const CHARACTER_LEFT_LEG_UPPER_LENGTH = 1.2;
  const CHARACTER_LEFT_LEG_LOWER_LENGTH = 1.55;

  type BallArc = "high" | "low";

  interface BodyPose {
    hips: Vec3;
    vertical: Vec3;
    side: Vec3;
    oscillation: number;
  }

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
    const pose = bodyPose(sourceFrame);
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

    applyBodyControls(animated, pose);
    animated.groups[RIGHT_ARM_GROUP].controls = armControls(-1, sourceFrame, pose);
    animated.groups[LEFT_ARM_GROUP].controls = armControls(1, sourceFrame, pose);
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

  export function sourceFitFrame(scene: ParsedScene, world: World, sourceFrame: number): SourceFitFrame | null {
    if (!supportsJugglerMotion(scene)) {
      return null;
    }

    const normalizedFrame = Math.floor(mod(sourceFrame, SOURCE_FRAME_COUNT));
    const sourceObserver = sourceObserverFor(scene);
    const balls = BALL_GROUPS.map((ball, index): SourceFitBallSample | null => {
      const sphere = world.spheres.find((candidate) => candidate.groupIndex === ball.groupIndex);
      if (!sphere) {
        return null;
      }
      const referencePathIndex = Math.floor(mod(normalizedFrame + SOURCE_ANCHOR_OFFSETS[index], SOURCE_FRAME_COUNT));
      const projectedPixel = projectWithObserver(sourceObserver, sphere.position);
      const anchorPixel = projectWithObserver(sourceObserver, rawSourcePathPoint(referencePathIndex));
      const pixelError = Math.hypot(projectedPixel[0] - anchorPixel[0], projectedPixel[1] - anchorPixel[1]);
      return {
        label: `ball ${index + 1}`,
        groupIndex: ball.groupIndex,
        referencePathIndex,
        projectedPixel,
        anchorPixel,
        pixelError
      };
    }).filter((sample): sample is SourceFitBallSample => sample !== null);

    const meanBallPixelError = balls.length
      ? balls.reduce((sum, sample) => sum + sample.pixelError, 0) / balls.length
      : 0;
    const maxBallPixelError = balls.reduce((max, sample) => Math.max(max, sample.pixelError), 0);
    const handError = contactPulse(sourceFrame) > 0.9
      ? Math.max(handContactError(world, RIGHT_ARM_GROUP), handContactError(world, LEFT_ARM_GROUP))
      : null;

    return {
      sourceFrame: normalizedFrame,
      sourceFrameNumber: normalizedFrame + 1,
      sourceFrameLabel: sourceFrameLabel(normalizedFrame),
      camera: {
        position: [...scene.observerPosition],
        altitudeDeg: scene.altitudeDeg,
        azimuthDeg: scene.azimuthDeg,
        focalLength: scene.focalLength,
        effectiveFocalLength: sourceObserver.focalLength,
        aperture: 0
      },
      balls,
      meanBallPixelError,
      maxBallPixelError,
      bodyClearance: frameBodyClearance(world),
      ballClearance: frameBallClearance(world),
      handContactError: handError === null || handError >= BIG ? null : handError,
      legBend: legBendSummary(world)
    };
  }

  export function sourceFitSummary(
    scene: ParsedScene,
    baseWorld: World,
    settings: SceneMotionSettings
  ): SourceFitSummary | null {
    if (settings.motionId !== "juggler-reconstructed" || !supportsJugglerMotion(scene)) {
      return null;
    }

    const frames: SourceFitFrame[] = [];
    for (let frame = 0; frame < SOURCE_FRAME_COUNT; frame += 1) {
      const sourceFrame = frame + settings.sourceFrame;
      const fit = sourceFitFrame(scene, resolveWorld(scene, baseWorld, settings, sourceFrame), sourceFrame);
      if (fit) {
        frames.push(fit);
      }
    }
    return summarizeSourceFitFrames(frames);
  }

  export function summarizeSourceFitFrames(frames: Array<SourceFitFrame | null>): SourceFitSummary | null {
    const usable = frames.filter((frame): frame is SourceFitFrame => frame !== null);
    if (!usable.length) {
      return null;
    }

    let totalBallPixelError = 0;
    let maxBallPixelError = -BIG;
    let maxBallPixelErrorFrame = usable[0].sourceFrame;
    let minBodyClearance: number | null = null;
    let minBallClearance: number | null = null;
    let maxHandContactError: number | null = null;
    let maxLeftLegBendRatio: number | null = null;

    for (const frame of usable) {
      totalBallPixelError += frame.meanBallPixelError;
      if (frame.maxBallPixelError > maxBallPixelError) {
        maxBallPixelError = frame.maxBallPixelError;
        maxBallPixelErrorFrame = frame.sourceFrame;
      }
      minBodyClearance = minNullable(minBodyClearance, frame.bodyClearance);
      minBallClearance = minNullable(minBallClearance, frame.ballClearance);
      maxHandContactError = maxNullable(maxHandContactError, frame.handContactError);
      maxLeftLegBendRatio = maxNullable(maxLeftLegBendRatio, frame.legBend?.leftToRightRatio ?? null);
    }

    return {
      frameCount: usable.length,
      meanBallPixelError: totalBallPixelError / usable.length,
      maxBallPixelError,
      maxBallPixelErrorFrame,
      minBodyClearance,
      minBallClearance,
      maxHandContactError,
      maxLeftLegBendRatio
    };
  }

  export function copySourceFitFrame(frame: SourceFitFrame | null): SourceFitFrame | null {
    if (!frame) {
      return null;
    }
    return {
      sourceFrame: frame.sourceFrame,
      sourceFrameNumber: frame.sourceFrameNumber,
      sourceFrameLabel: frame.sourceFrameLabel,
      camera: {
        position: [...frame.camera.position],
        altitudeDeg: frame.camera.altitudeDeg,
        azimuthDeg: frame.camera.azimuthDeg,
        focalLength: frame.camera.focalLength,
        effectiveFocalLength: frame.camera.effectiveFocalLength,
        aperture: frame.camera.aperture
      },
      balls: frame.balls.map((sample) => ({
        label: sample.label,
        groupIndex: sample.groupIndex,
        referencePathIndex: sample.referencePathIndex,
        projectedPixel: [...sample.projectedPixel],
        anchorPixel: [...sample.anchorPixel],
        pixelError: sample.pixelError
      })),
      meanBallPixelError: frame.meanBallPixelError,
      maxBallPixelError: frame.maxBallPixelError,
      bodyClearance: frame.bodyClearance,
      ballClearance: frame.ballClearance,
      handContactError: frame.handContactError,
      legBend: frame.legBend ? { ...frame.legBend } : null
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

  function applyBodyControls(scene: ParsedScene, pose: BodyPose): void {
    scene.groups[TORSO_GROUP].controls = [
      { center: bodyPoint(pose, TORSO_LENGTH, 0, 0), radius: 0.8, interpolationFromPrevious: null },
      { center: pose.hips, radius: 0.6, interpolationFromPrevious: 5 }
    ];
    scene.groups[NECK_GROUP].controls = [
      { center: bodyPoint(pose, NECK_OFFSET, 0, 0), radius: 0.2, interpolationFromPrevious: null }
    ];
    scene.groups[HEAD_GROUP].controls = [
      { center: bodyPoint(pose, HEAD_OFFSET, 0, 0), radius: 0.5, interpolationFromPrevious: null }
    ];
    scene.groups[HAIR_GROUP].controls = [
      { center: bodyPoint(pose, HAIR_OFFSET, 0, 0.02), radius: 0.5, interpolationFromPrevious: null }
    ];
    scene.groups[LEFT_EYE_GROUP].controls = [
      { center: bodyPoint(pose, HEAD_OFFSET, 0.2, -0.4), radius: 0.15, interpolationFromPrevious: null }
    ];
    scene.groups[RIGHT_EYE_GROUP].controls = [
      { center: bodyPoint(pose, HEAD_OFFSET, -0.2, -0.4), radius: 0.15, interpolationFromPrevious: null }
    ];
    scene.groups[CHARACTER_RIGHT_LEG_GROUP].controls = legControls(1, pose);
    scene.groups[CHARACTER_LEFT_LEG_GROUP].controls = legControls(-1, pose);
  }

  function bodyPose(sourceFrame: number): BodyPose {
    const angle = 2 * Math.PI * mod(sourceFrame, SOURCE_FRAME_COUNT) / SOURCE_FRAME_COUNT;
    const oscillation = 0.5 * (1 + Math.cos(angle));
    const hipsZ = HIPS_MIN_Z + (HIPS_MAX_Z - HIPS_MIN_Z) * oscillation;
    const lateralTilt = (HIPS_MIN_Z - HIPS_MAX_Z) * Math.sin(angle);
    const vertical = Math3.normalize([0, lateralTilt, TORSO_LENGTH]);
    const side = Math3.normalize([0, vertical[2], -vertical[1]]);
    return {
      hips: [0, 0, hipsZ],
      vertical,
      side,
      oscillation
    };
  }

  function bodyPoint(pose: BodyPose, verticalOffset: number, sideOffset: number, depthOffset: number): Vec3 {
    return Math3.add(
      Math3.add(pose.hips, Math3.mul(pose.vertical, verticalOffset)),
      Math3.add(Math3.mul(pose.side, sideOffset), [depthOffset, 0, 0])
    );
  }

  function legControls(side: -1 | 1, pose: BodyPose): SphereControl[] {
    const hip = bodyPoint(pose, HIP_SOCKET_OFFSET, side * LEG_SIDE, 0);
    const foot: Vec3 = side > 0 ? [-0.4, 0.6, 0] : [0.4, -0.6, 0];
    const upperLength = side > 0 ? CHARACTER_RIGHT_LEG_UPPER_LENGTH : CHARACTER_LEFT_LEG_UPPER_LENGTH;
    const lowerLength = side > 0 ? CHARACTER_RIGHT_LEG_LOWER_LENGTH : CHARACTER_LEFT_LEG_LOWER_LENGTH;
    // The source-facing character's left leg is the screen-right leg. Meatfighter's
    // reconstruction notes call it almost straight, so keep that planted leg from
    // taking the same visible knee bend as the character's right leg.
    const knee = solveTwoBone(hip, foot, side > 0 ? [-1, 0, -0.2] : [1, 0, -0.2], upperLength, lowerLength);
    return [
      { center: hip, radius: 0.2, interpolationFromPrevious: null },
      { center: knee, radius: 0.2, interpolationFromPrevious: 6 },
      { center: foot, radius: 0.1, interpolationFromPrevious: 7 }
    ];
  }

  function armControls(side: -1 | 1, sourceFrame: number, pose: BodyPose): SphereControl[] {
    const handCenter = side > 0 ? MotionData.LEFT_HAND_BALL_CENTER : MotionData.RIGHT_HAND_BALL_CENTER;
    const contactBall = nearestBallToHand(sourceFrame, handCenter);
    const pulse = handProximityPulse(contactBall, handCenter);
    const contact = wristTarget(contactBall, side);
    const shoulder = bodyPoint(pose, SHOULDER_OFFSET, side * SHOULDER_SIDE, 0);
    const rest = bodyPoint(pose, 0.85 + 0.1 * pose.oscillation, side * 1.55, -1.05 - 0.15 * pose.oscillation);
    const wrist = Math3.lerpVec(rest, contact, pulse);
    const elbow = solveTwoBone(shoulder, wrist, [-0.35, side * 0.7, -0.65], ARM_UPPER_LENGTH, ARM_LOWER_LENGTH);
    return [
      { center: shoulder, radius: 0.2, interpolationFromPrevious: null },
      { center: elbow, radius: 0.2, interpolationFromPrevious: 6 },
      { center: wrist, radius: 0.1, interpolationFromPrevious: 7 }
    ];
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

  function solveTwoBone(start: Vec3, end: Vec3, bendHint: Vec3, lengthA: number, lengthB: number): Vec3 {
    const toEnd = Math3.sub(end, start);
    const distance = Math3.length(toEnd);
    if (distance < 1e-6) {
      return Math3.add(start, Math3.mul(Math3.normalize(bendHint), lengthA));
    }

    const forward = Math3.mul(toEnd, 1 / distance);
    let bendAxis = Math3.sub(bendHint, Math3.mul(forward, Math3.dot(bendHint, forward)));
    if (Math3.length(bendAxis) < 1e-6) {
      bendAxis = Math3.cross(forward, [0, 0, 1]);
    }
    if (Math3.length(bendAxis) < 1e-6) {
      bendAxis = Math3.cross(forward, [0, 1, 0]);
    }
    bendAxis = Math3.normalize(bendAxis);

    const reachableDistance = Math.min(distance, Math.max(1e-6, lengthA + lengthB - 1e-6));
    const base = (lengthA * lengthA - lengthB * lengthB + reachableDistance * reachableDistance) / (2 * reachableDistance);
    const height = Math.sqrt(Math.max(0, lengthA * lengthA - base * base));
    const distanceScale = distance / reachableDistance;
    return Math3.add(
      start,
      Math3.add(Math3.mul(forward, base * distanceScale), Math3.mul(bendAxis, height))
    );
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

  function legBendSummary(world: World): SourceFitLegBend | null {
    const characterRight = legBendDistance(world, CHARACTER_RIGHT_LEG_GROUP);
    const characterLeft = legBendDistance(world, CHARACTER_LEFT_LEG_GROUP);
    if (characterRight === null || characterLeft === null) {
      return null;
    }
    return {
      characterRight,
      characterLeft,
      leftToRightRatio: characterRight > 1e-9 ? characterLeft / characterRight : null
    };
  }

  function legBendDistance(world: World, groupIndex: number): number | null {
    const spheres = world.spheres.filter((sphere) => sphere.groupIndex === groupIndex);
    if (spheres.length < 3) {
      return null;
    }
    const hip = spheres[0].position;
    const knee = spheres[Math.min(6, spheres.length - 2)].position;
    const foot = spheres[spheres.length - 1].position;
    const hipToFoot = Math3.sub(foot, hip);
    const denominator = Math3.dot(hipToFoot, hipToFoot);
    if (denominator < 1e-9) {
      return null;
    }
    const t = Math.max(0, Math.min(1, Math3.dot(Math3.sub(knee, hip), hipToFoot) / denominator));
    const onStraightLeg = Math3.add(hip, Math3.mul(hipToFoot, t));
    return Math3.length(Math3.sub(knee, onStraightLeg));
  }

  function sourceObserverFor(scene: ParsedScene): Observer {
    return Scenes.createObserver(scene, Scenes.buildWorld(scene), 320, 200, {
      enabled: false,
      angleDeg: 0,
      radius: 10
    });
  }

  function projectWithObserver(observer: Observer, point: Vec3): [number, number] {
    const delta = Math3.sub(point, observer.position);
    const forward = Math3.dot(delta, observer.viewDir);
    const x = Math3.dot(delta, observer.uhat) * observer.focalLength / forward;
    const y = Math3.dot(delta, observer.vhat) * observer.focalLength / forward;
    return [
      x / observer.px + 0.5 * observer.nx,
      0.5 * observer.ny - y / observer.py
    ];
  }

  function minNullable(current: number | null, candidate: number | null): number | null {
    if (candidate === null) {
      return current;
    }
    return current === null ? candidate : Math.min(current, candidate);
  }

  function maxNullable(current: number | null, candidate: number | null): number | null {
    if (candidate === null) {
      return current;
    }
    return current === null ? candidate : Math.max(current, candidate);
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
