namespace Juggler.Viewport {
  export function orbitPoseFromDrag(startPose: CameraPose, dx: number, dy: number, sensitivity = 0.01): CameraPose {
    const target = [...startPose.target] as Vec3;
    const offset = Math3.sub(startPose.position, target);
    if (Math3.length(offset) < 0.001) {
      return copyPose(startPose);
    }

    const yawed = rotateAroundAxis(offset, [0, 0, 1], -dx * sensitivity);
    const right = Math3.normalize(Math3.cross([0, 0, 1], Math3.normalize(Math3.mul(yawed, -1))));
    const pitchAxis = Math3.length(right) > 0.001 ? right : [1, 0, 0] as Vec3;
    const pitched = rotateAroundAxis(yawed, pitchAxis, dy * sensitivity);
    const safeOffset = Math.abs(Math3.normalize(pitched)[2]) > 0.985 ? yawed : pitched;
    return {
      position: Math3.add(target, safeOffset),
      target,
      focalLength: startPose.focalLength
    };
  }

  export function panPoseFromDrag(startPose: CameraPose, observer: Observer, dx: number, dy: number, scale?: number): CameraPose {
    const distance = Math.max(0.1, Math3.length(Math3.sub(startPose.target, startPose.position)));
    const unitsPerPixel = scale ?? distance / 320;
    const move = Math3.add(
      Math3.mul(observer.uhat, -dx * unitsPerPixel),
      Math3.mul(observer.vhat, dy * unitsPerPixel)
    );
    return {
      position: Math3.add(startPose.position, move),
      target: Math3.add(startPose.target, move),
      focalLength: startPose.focalLength
    };
  }

  export function dollyPose(startPose: CameraPose, deltaY: number, stepScale = 0.0025): CameraPose {
    const direction = Math3.normalize(Math3.sub(startPose.target, startPose.position));
    const distance = Math.max(0.1, Math3.length(Math3.sub(startPose.target, startPose.position)));
    const step = Math.max(-distance * 0.8, Math.min(distance * 0.8, deltaY * stepScale * distance));
    return {
      position: Math3.add(startPose.position, Math3.mul(direction, step)),
      target: [...startPose.target],
      focalLength: startPose.focalLength
    };
  }

  export function sceneEditOffsetFromDrag(
    startOffset: Vec3,
    observer: Observer,
    dx: number,
    dy: number,
    depthMode: boolean,
    scale: number
  ): Vec3 {
    if (depthMode) {
      return Math3.add(startOffset, Math3.mul(observer.viewDir, -dy * scale));
    }
    return Math3.add(
      startOffset,
      Math3.add(
        Math3.mul(observer.uhat, dx * scale),
        Math3.mul(observer.vhat, -dy * scale)
      )
    );
  }

  function copyPose(pose: CameraPose): CameraPose {
    return {
      position: [...pose.position],
      target: [...pose.target],
      focalLength: pose.focalLength
    };
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
}
