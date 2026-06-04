namespace Juggler.Scenes {
  const RAD = Math.PI / 180;

  export function builtInSceneSources(): SceneSource[] {
    return [
      {
        id: "robot",
        name: "robot.dat humanoid",
        datText: ORIGINAL_DAT.robot,
        sourcePath: "Raytracer_1987_Graham_Source_Code/robot.dat"
      },
      {
        id: "ele",
        name: "ele.dat elephant",
        datText: ORIGINAL_DAT.ele,
        sourcePath: "Raytracer_1987_Graham_Source_Code/ele.dat"
      },
      {
        id: "dragon",
        name: "dragon.dat dragon",
        datText: ORIGINAL_DAT.dragon,
        sourcePath: "Raytracer_1987_Graham_Source_Code/dragon.dat"
      }
    ];
  }

  export function buildWorld(scene: ParsedScene): World {
    const spheres: Sphere[] = [];
    scene.groups.forEach((group, groupIndex) => {
      const expanded = expandControls(group.controls);
      for (const control of expanded) {
        spheres.push({
          position: control.center,
          radius: control.radius,
          color: [...group.color],
          type: group.type,
          groupIndex
        });
      }
    });

    const lamps: Lamp[] = scene.lamps.map((lamp) => ({
      position: [...lamp.position],
      radius: lamp.radius,
      color: [...lamp.color]
    }));

    const world: World = {
      spheres,
      lamps,
      horizon: [
        { position: [0, 0, 0], normal: [0, 0, 1], color: [...scene.horizon[0]] },
        { position: [0, 0, 0], normal: [0, 0, 1], color: [...scene.horizon[1]] }
      ],
      illum: [...scene.illum],
      skyZenith: [...scene.skyZenith],
      skyHorizon: [...scene.skyHorizon],
      lampExposure: 1
    };

    world.lampExposure = applySourceExposure(world);
    return world;
  }

  export function createObserver(
    scene: ParsedScene,
    world: World,
    nx: number,
    ny: number,
    orbit: OrbitSettings
  ): Observer {
    if (orbit.enabled) {
      const center = sceneTarget(world);
      const angle = orbit.angleDeg * RAD;
      const position: Vec3 = [
        center[0] - orbit.radius * Math.cos(angle),
        center[1] - orbit.radius * Math.sin(angle),
        scene.observerPosition[2] + (orbit.heightOffset ?? 0)
      ];
      const direction = Math3.sub(center, position);
      const azimuthDeg = Math.atan2(direction[1], direction[0]) / RAD;
      const altitudeDeg = Math.atan2(direction[2], Math.hypot(direction[0], direction[1])) / RAD;
      return orientObserver(position, altitudeDeg, azimuthDeg, scene.focalLength, nx, ny);
    }

    return orientObserver(scene.observerPosition, scene.altitudeDeg, scene.azimuthDeg, scene.focalLength, nx, ny);
  }

  export function createObserverFromPose(pose: CameraPose, nx: number, ny: number): Observer {
    const direction = Math3.sub(pose.target, pose.position);
    const azimuthDeg = Math.atan2(direction[1], direction[0]) / RAD;
    const altitudeDeg = Math.atan2(direction[2], Math.hypot(direction[0], direction[1])) / RAD;
    return orientObserver(pose.position, altitudeDeg, azimuthDeg, pose.focalLength, nx, ny);
  }

  export function staticCameraPose(scene: ParsedScene): CameraPose {
    const altitudeRad = scene.altitudeDeg * RAD;
    const azimuthRad = scene.azimuthDeg * RAD;
    const viewDir: Vec3 = [
      Math.cos(azimuthRad) * Math.cos(altitudeRad),
      Math.sin(azimuthRad) * Math.cos(altitudeRad),
      Math.sin(altitudeRad)
    ];
    return {
      position: [...scene.observerPosition],
      target: Math3.add(scene.observerPosition, viewDir),
      focalLength: scene.focalLength
    };
  }

  export function sceneTarget(world: World): Vec3 {
    if (!world.spheres.length) {
      return [0, 0, 0];
    }

    const min: Vec3 = [BIG, BIG, BIG];
    const max: Vec3 = [-BIG, -BIG, -BIG];
    for (const sphere of world.spheres) {
      for (let axis = 0; axis < 3; axis += 1) {
        min[axis] = Math.min(min[axis], sphere.position[axis] - sphere.radius);
        max[axis] = Math.max(max[axis], sphere.position[axis] + sphere.radius);
      }
    }

    return [
      (min[0] + max[0]) * 0.5,
      (min[1] + max[1]) * 0.5,
      Math.min(5.2, (min[2] + max[2]) * 0.5)
    ];
  }

  export function summarizeControls(scene: ParsedScene): { groups: number; controls: number; interpolatedSegments: number } {
    let controls = 0;
    let interpolatedSegments = 0;
    for (const group of scene.groups) {
      controls += group.controls.length;
      interpolatedSegments += group.controls.filter((control) => control.interpolationFromPrevious !== null).length;
    }
    return { groups: scene.groups.length, controls, interpolatedSegments };
  }

  function expandControls(controls: SphereControl[]): SphereControl[] {
    if (!controls.length) {
      return [];
    }

    const expanded: SphereControl[] = [{
      center: [...controls[0].center],
      radius: controls[0].radius,
      interpolationFromPrevious: null
    }];

    for (let i = 1; i < controls.length; i += 1) {
      const previous = controls[i - 1];
      const next = controls[i];
      const steps = Math.max(1, Math.round(next.interpolationFromPrevious ?? 1));
      for (let step = 1; step <= steps; step += 1) {
        const t = step / steps;
        expanded.push({
          center: Math3.lerpVec(previous.center, next.center, t),
          radius: Math3.lerp(previous.radius, next.radius, t),
          interpolationFromPrevious: step === steps ? next.interpolationFromPrevious : null
        });
      }
    }

    return expanded;
  }

  function orientObserver(
    position: Vec3,
    altitudeDeg: number,
    azimuthDeg: number,
    focalLength: number,
    nx: number,
    ny: number
  ): Observer {
    const altitudeRad = altitudeDeg * RAD;
    const azimuthRad = azimuthDeg * RAD;
    return {
      position: [...position],
      viewDir: [
        Math.cos(azimuthRad) * Math.cos(altitudeRad),
        Math.sin(azimuthRad) * Math.cos(altitudeRad),
        Math.sin(altitudeRad)
      ],
      uhat: [Math.sin(azimuthRad), -Math.cos(azimuthRad), 0],
      vhat: [
        -Math.cos(azimuthRad) * Math.sin(altitudeRad),
        -Math.sin(azimuthRad) * Math.sin(altitudeRad),
        Math.cos(altitudeRad)
      ],
      focalLength: 0.028 * focalLength,
      px: 1 / nx,
      py: 0.75 / ny,
      nx,
      ny,
      altitudeRad,
      azimuthRad
    };
  }

  function applySourceExposure(world: World): number {
    let lampfac = BIG;
    for (const sphere of world.spheres) {
      for (const lamp of world.lamps) {
        const delta = Math3.sub(sphere.position, lamp.position);
        let radius = Math.sqrt(Math3.dot(delta, delta));
        radius -= sphere.radius;
        for (let channel = 0; channel < 3; channel += 1) {
          const direct = sphere.color[channel] * lamp.color[channel] / (radius * radius);
          if (direct === 0) {
            continue;
          }
          const candidate = (1 - sphere.color[channel] * world.illum[channel]) / direct;
          if (candidate < lampfac) {
            lampfac = candidate;
          }
        }
      }
    }

    if (!Number.isFinite(lampfac) || lampfac === BIG) {
      lampfac = 1;
    }

    for (const lamp of world.lamps) {
      for (let channel = 0; channel < 3; channel += 1) {
        lamp.color[channel] *= lampfac;
      }
    }

    return lampfac;
  }
}
