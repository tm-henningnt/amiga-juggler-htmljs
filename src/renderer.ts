namespace Juggler.Renderer {
  interface Ray {
    origin: Vec3;
    direction: Vec3;
  }

  interface HitPatch extends Patch {
    sphere: Sphere | null;
  }

  export class FrameRenderer {
    readonly data: Uint8ClampedArray;
    readonly stats: RenderStats = { rays: 0, mirrorFallbacks: 0 };
    private readonly hamEncoder: Ham.HamEncoder | null;
    private readonly displayEncoder: Display.ConstraintEncoder;
    private row = 0;

    constructor(
      private readonly world: World,
      private readonly observer: Observer,
      private readonly options: RenderOptions
    ) {
      this.data = new Uint8ClampedArray(observer.nx * observer.ny * 4);
      this.hamEncoder = options.outputMode === "source-ham" ? new Ham.HamEncoder() : null;
      this.displayEncoder = new Display.ConstraintEncoder(options.displayConstraintId ?? "rgb");
    }

    renderRows(count: number): number {
      const limit = Math.min(this.observer.ny, this.row + count);
      for (; this.row < limit; this.row += 1) {
        if (this.hamEncoder) {
          this.hamEncoder.beginLine();
        }
        this.displayEncoder.beginLine();
        for (let x = 0; x < this.observer.nx; x += 1) {
          const brightness = trace(pixelRay(this.observer, x, this.row), this.world, this.options, this.stats, 0);
          const rgb = this.options.outputMode === "source-ham"
            ? this.hamEncoder!.encodePixel(x, brightness)
            : modernRgb(brightness);
          const constrained = this.displayEncoder.encodePixel(x, rgb);
          const offset = (this.row * this.observer.nx + x) * 4;
          this.data[offset] = Math3.clampByte(constrained[0]);
          this.data[offset + 1] = Math3.clampByte(constrained[1]);
          this.data[offset + 2] = Math3.clampByte(constrained[2]);
          this.data[offset + 3] = 255;
        }
      }
      return this.row;
    }

    done(): boolean {
      return this.row >= this.observer.ny;
    }

    progress(): number {
      return this.row / this.observer.ny;
    }
  }

  export function pixelRay(observer: Observer, i: number, j: number): Ray {
    const y = (0.5 * observer.ny - j) * observer.py;
    const x = (i - 0.5 * observer.nx) * observer.px;
    const target = Math3.add(
      Math3.add(
        Math3.add(Math3.mul(observer.viewDir, observer.focalLength), Math3.mul(observer.vhat, y)),
        Math3.mul(observer.uhat, x)
      ),
      observer.position
    );
    return { origin: observer.position, direction: Math3.sub(target, observer.position) };
  }

  export function trace(ray: Ray, world: World, options: RenderOptions, stats: RenderStats, depth: number): Vec3 {
    stats.rays += 1;
    let tMin = BIG;
    let nearestSphere: Sphere | null = null;

    for (const sphere of world.spheres) {
      const t = intersectSphere(ray, sphere, options.epsilon);
      if (t !== null && t < tMin) {
        tMin = t;
        nearestSphere = sphere;
      }
    }

    for (const lamp of world.lamps) {
      const t = intersectLamp(ray, lamp, options.epsilon);
      if (t !== null && t < tMin) {
        return [
          lamp.color[0] / (lamp.radius * lamp.radius),
          lamp.color[1] / (lamp.radius * lamp.radius),
          lamp.color[2] / (lamp.radius * lamp.radius)
        ];
      }
    }

    const groundT = intersectGround(ray, options.epsilon);
    if (groundT !== null && groundT < tMin) {
      const position = pointOnRay(ray, groundT);
      const tile = gingham(position);
      const patch: HitPatch = {
        position,
        normal: world.horizon[tile].normal,
        color: world.horizon[tile].color,
        sphere: null
      };
      return patchBrightness(patch, world, options);
    }

    if (nearestSphere) {
      const position = pointOnRay(ray, tMin);
      const normal = Math3.mul(Math3.sub(position, nearestSphere.position), 1 / nearestSphere.radius);
      const patch: HitPatch = {
        position,
        normal,
        color: nearestSphere.color,
        sphere: nearestSphere
      };

      if (nearestSphere.type === BRIGHT && glint(patch, world, ray, options, stats)) {
        return [1, 1, 1];
      }

      if (nearestSphere.type === MIRROR) {
        return mirrorBrightness(patch, world, ray, options, stats, depth);
      }

      return patchBrightness(patch, world, options);
    }

    return skyBrightness(ray, world);
  }

  export function intersectSphere(ray: Ray, sphere: Sphere, epsilon = SOURCE_EPSILON): number | null {
    const oc = Math3.sub(ray.origin, sphere.position);
    const a = Math3.dot(ray.direction, ray.direction);
    const b = 2 * Math3.dot(oc, ray.direction);
    const c = Math3.dot(oc, oc) - sphere.radius * sphere.radius;
    const d = b * b - 4 * a * c;
    if (d <= 0) {
      return null;
    }
    const root = Math.sqrt(d);
    let t = -(b + root) / (a + a);
    if (t < epsilon) {
      t = (root - b) / (a + a);
    }
    return t > epsilon ? t : null;
  }

  export function intersectGround(ray: Ray, epsilon = SOURCE_EPSILON): number | null {
    if (ray.direction[2] === 0) {
      return null;
    }
    const t = -ray.origin[2] / ray.direction[2];
    return t > epsilon ? t : null;
  }

  export function gingham(position: Vec3): 0 | 1 {
    let x = position[0];
    let y = position[1];
    let kx = 0;
    let ky = 0;
    if (x < 0) {
      x = -x;
      kx += 1;
    }
    if (y < 0) {
      y = -y;
      ky += 1;
    }
    return (((Math.trunc(x) + kx) / 3 | 0) + ((Math.trunc(y) + ky) / 3 | 0)) % 2 as 0 | 1;
  }

  function intersectLamp(ray: Ray, lamp: Lamp, epsilon: number): number | null {
    return intersectSphere(ray, {
      position: lamp.position,
      radius: lamp.radius,
      color: lamp.color,
      type: BRIGHT,
      groupIndex: -1
    }, epsilon);
  }

  function pointOnRay(ray: Ray, t: number): Vec3 {
    return Math3.add(ray.origin, Math3.mul(ray.direction, t));
  }

  function skyBrightness(ray: Ray, world: World): Vec3 {
    const sin2 = ray.direction[2] * ray.direction[2] / Math3.dot(ray.direction, ray.direction);
    const cos2 = 1 - sin2;
    return [
      cos2 * world.skyHorizon[0] + sin2 * world.skyZenith[0],
      cos2 * world.skyHorizon[1] + sin2 * world.skyZenith[1],
      cos2 * world.skyHorizon[2] + sin2 * world.skyZenith[2]
    ];
  }

  function patchBrightness(patch: HitPatch, world: World, options: RenderOptions): Vec3 {
    const diffuse = (Math3.dot([0, 0, 1], patch.normal) + 1.5) * 0.4;
    const brightness: Vec3 = [
      diffuse * world.illum[0] * patch.color[0],
      diffuse * world.illum[1] * patch.color[1],
      diffuse * world.illum[2] * patch.color[2]
    ];

    for (const lamp of world.lamps) {
      const lampVector = Math3.sub(lamp.position, patch.position);
      const cosi = Math3.dot(lampVector, patch.normal);
      if (cosi <= 0) {
        continue;
      }

      const shadowRay: Ray = { origin: patch.position, direction: lampVector };
      let shadowed = false;
      for (const sphere of world.spheres) {
        if (sphere === patch.sphere) {
          continue;
        }
        if (intersectSphere(shadowRay, sphere, options.epsilon) !== null) {
          shadowed = true;
          break;
        }
      }
      if (shadowed) {
        continue;
      }

      const r = Math.sqrt(Math3.dot(lampVector, lampVector));
      const direct = cosi / (r * r * r);
      for (let channel = 0; channel < 3; channel += 1) {
        brightness[channel] += direct * patch.color[channel] * lamp.color[channel];
      }
    }

    return brightness;
  }

  function glint(
    patch: HitPatch,
    world: World,
    incident: Ray,
    options: RenderOptions,
    stats: RenderStats
  ): boolean {
    let reflected: Vec3 | null = null;
    let reflectedLength2 = 0;

    for (const lamp of world.lamps) {
      const lampVector = Math3.sub(lamp.position, patch.position);
      const cosi = Math3.dot(lampVector, patch.normal);
      if (cosi <= 0) {
        continue;
      }

      const shadowRay: Ray = { origin: patch.position, direction: lampVector };
      let shadowed = false;
      for (const sphere of world.spheres) {
        if (sphere === patch.sphere) {
          continue;
        }
        if (intersectSphere(shadowRay, sphere, options.epsilon) !== null) {
          shadowed = true;
          break;
        }
      }
      if (shadowed) {
        continue;
      }

      if (!reflected) {
        reflected = reflectVector(incident.direction, patch.normal, options.reflectionMode, options.epsilon, stats);
        reflectedLength2 = Math3.dot(reflected, reflected);
      }
      const t = Math3.dot(lampVector, reflected);
      const highlight = t * t / (Math3.dot(lampVector, lampVector) * reflectedLength2);
      if (highlight > 0.95) {
        return true;
      }
    }

    return false;
  }

  function mirrorBrightness(
    patch: HitPatch,
    world: World,
    incident: Ray,
    options: RenderOptions,
    stats: RenderStats,
    depth: number
  ): Vec3 {
    const normalDotIncident = Math3.dot(patch.normal, incident.direction);
    if (normalDotIncident >= 0) {
      return [0, 0, 0];
    }

    if (depth >= options.maxDepth) {
      return [0, 0, 0];
    }

    const reflected = reflectVector(incident.direction, patch.normal, options.reflectionMode, options.epsilon, stats);
    const brightness = trace({ origin: patch.position, direction: reflected }, world, options, stats, depth + 1);
    return [
      brightness[0] * patch.color[0],
      brightness[1] * patch.color[1],
      brightness[2] * patch.color[2]
    ];
  }

  export function reflectVector(
    direction: Vec3,
    normal: Vec3,
    mode: ReflectionMode,
    epsilon = REFERENCE_EPSILON,
    stats: RenderStats | null = null
  ): Vec3 {
    if (mode === "standard") {
      return reflectPhysical(direction, normal);
    }
    return reflectSourceWithFallback(direction, normal, epsilon, stats);
  }

  function reflectSourceWithFallback(
    direction: Vec3,
    normal: Vec3,
    epsilon: number,
    stats: RenderStats | null
  ): Vec3 {
    const u = Math3.cross(direction, normal);
    if (u[0] === 0 && u[1] === 0 && u[2] === 0) {
      return [-direction[0], -direction[1], -direction[2]];
    }

    const v = Math3.cross(u, normal);
    const vv = Math3.dot(v, v);
    const xv = Math3.dot(direction, v) / vv;
    const xn = Math3.dot(direction, normal);
    const source: Vec3 = [
      xv * v[0] / (xn * normal[0]),
      xv * v[1] / (xn * normal[1]),
      xv * v[2] / (xn * normal[2])
    ];

    if (Math3.isFiniteVec(source) && Math3.dot(source, source) > epsilon * epsilon) {
      return source;
    }

    if (stats) {
      stats.mirrorFallbacks += 1;
    }
    return reflectPhysical(direction, normal);
  }

  function reflectPhysical(direction: Vec3, normal: Vec3): Vec3 {
    return Math3.sub(direction, Math3.mul(normal, 2 * Math3.dot(direction, normal)));
  }

  function modernRgb(brightness: Vec3): Vec3 {
    return [
      Math3.clampByte(Math.pow(Math.max(0, brightness[0]), 0.82) * 255),
      Math3.clampByte(Math.pow(Math.max(0, brightness[1]), 0.82) * 255),
      Math3.clampByte(Math.pow(Math.max(0, brightness[2]), 0.82) * 255)
    ];
  }
}
