namespace Juggler.Renderer {
  interface Ray {
    origin: Vec3;
    direction: Vec3;
  }

  interface HitPatch extends Patch {
    sphere: Sphere | null;
  }

  interface Bounds {
    min: Vec3;
    max: Vec3;
  }

  interface BvhNode {
    bounds: Bounds;
    left: BvhNode | null;
    right: BvhNode | null;
    spheres: Sphere[];
  }

  export const QUALITY_MODES: Array<{ id: RenderQualityId; label: string }> = [
    { id: "legacy", label: "Legacy" },
    { id: "interactive", label: "Interactive fast" },
    { id: "modern-quality", label: "Modern quality" }
  ];

  export const ANTI_ALIAS_MODES: Array<{ id: AntiAliasModeId; label: string }> = [
    { id: "off", label: "Off" },
    { id: "ordered-2x", label: "Ordered 2x" },
    { id: "adaptive-2x", label: "Adaptive 2x" }
  ];

  export class FrameRenderer {
    readonly data: Uint8ClampedArray;
    readonly stats: RenderStats = { rays: 0, mirrorFallbacks: 0 };
    private readonly hamEncoder: Ham.HamEncoder | null;
    private readonly displayEncoder: Display.ConstraintEncoder;
    private readonly sphereIndex: SphereIndex | null;
    private readonly tileSize: number;
    private readonly tileColumns: number;
    private readonly tileRows: number;
    private renderMode: "row" | "tile" | null = null;
    private row = 0;
    private tileCursor = 0;

    constructor(
      private readonly world: World,
      private readonly observer: Observer,
      private readonly options: RenderOptions
    ) {
      this.data = new Uint8ClampedArray(observer.nx * observer.ny * 4);
      this.hamEncoder = options.outputMode === "source-ham" ? new Ham.HamEncoder() : null;
      this.displayEncoder = new Display.ConstraintEncoder(options.displayConstraintId ?? "rgb");
      this.sphereIndex = options.acceleration === "none" ? null : new SphereIndex(world.spheres);
      this.tileSize = Math.max(4, Math.min(64, Math.round(options.tileSize ?? 16)));
      this.tileColumns = Math.ceil(observer.nx / this.tileSize);
      this.tileRows = Math.ceil(observer.ny / this.tileSize);
    }

    renderRows(count: number): number {
      if (this.renderMode === "tile") {
        return this.row;
      }
      this.renderMode = "row";
      const limit = Math.min(this.observer.ny, this.row + count);
      for (; this.row < limit; this.row += 1) {
        if (this.hamEncoder) {
          this.hamEncoder.beginLine();
        }
        this.displayEncoder.beginLine();
        for (let x = 0; x < this.observer.nx; x += 1) {
          this.renderPixel(x, this.row);
        }
      }
      return this.row;
    }

    renderBudget(milliseconds: number): number {
      const deadline = now() + Math.max(0, milliseconds);
      if (this.requiresLineOrder()) {
        this.renderMode = "row";
        do {
          this.renderRows(1);
        } while (!this.done() && now() < deadline);
        return this.progress();
      }

      this.renderMode = "tile";
      do {
        this.renderNextTile();
      } while (!this.done() && now() < deadline);
      return this.progress();
    }

    renderTiles(count: number): number {
      if (this.requiresLineOrder()) {
        return this.renderRows(count);
      }
      if (this.renderMode === "row") {
        return this.tileCursor;
      }
      this.renderMode = "tile";
      const limit = Math.min(this.totalTiles(), this.tileCursor + Math.max(1, Math.round(count)));
      while (this.tileCursor < limit) {
        this.renderNextTile();
      }
      return this.tileCursor;
    }

    done(): boolean {
      if (this.renderMode === "tile") {
        return this.tileCursor >= this.totalTiles();
      }
      return this.row >= this.observer.ny;
    }

    progress(): number {
      if (this.renderMode === "tile") {
        return this.tileCursor / this.totalTiles();
      }
      return this.row / this.observer.ny;
    }

    private renderNextTile(): void {
      if (this.tileCursor >= this.totalTiles()) {
        return;
      }
      const tileX = this.tileCursor % this.tileColumns;
      const tileY = Math.floor(this.tileCursor / this.tileColumns);
      const x0 = tileX * this.tileSize;
      const y0 = tileY * this.tileSize;
      const x1 = Math.min(this.observer.nx, x0 + this.tileSize);
      const y1 = Math.min(this.observer.ny, y0 + this.tileSize);
      for (let y = y0; y < y1; y += 1) {
        for (let x = x0; x < x1; x += 1) {
          this.renderPixel(x, y);
        }
      }
      this.tileCursor += 1;
      incrementStat(this.stats, "tiles");
    }

    private renderPixel(x: number, y: number): void {
      const brightness = samplePixel(this.observer, x, y, this.world, this.options, this.stats, this.sphereIndex);
      const rgb = this.options.outputMode === "source-ham"
        ? this.hamEncoder!.encodePixel(x, brightness)
        : modernRgb(brightness);
      const constrained = this.displayEncoder.encodePixel(x, rgb);
      const offset = (y * this.observer.nx + x) * 4;
      this.data[offset] = Math3.clampByte(constrained[0]);
      this.data[offset + 1] = Math3.clampByte(constrained[1]);
      this.data[offset + 2] = Math3.clampByte(constrained[2]);
      this.data[offset + 3] = 255;
      incrementStat(this.stats, "pixels");
    }

    private requiresLineOrder(): boolean {
      return this.options.outputMode === "source-ham" || this.options.displayConstraintId === "ham6-approx";
    }

    private totalTiles(): number {
      return this.tileColumns * this.tileRows;
    }
  }

  export function pixelRay(observer: Observer, i: number, j: number): Ray {
    return pixelRaySample(observer, i, j, 0, 0);
  }

  export function pixelRaySample(observer: Observer, i: number, j: number, dx: number, dy: number): Ray {
    const y = (0.5 * observer.ny - j) * observer.py;
    const x = (i + dx - 0.5 * observer.nx) * observer.px;
    const sampleY = y - dy * observer.py;
    const target = Math3.add(
      Math3.add(
        Math3.add(Math3.mul(observer.viewDir, observer.focalLength), Math3.mul(observer.vhat, sampleY)),
        Math3.mul(observer.uhat, x)
      ),
      observer.position
    );
    return { origin: observer.position, direction: Math3.sub(target, observer.position) };
  }

  export function trace(
    ray: Ray,
    world: World,
    options: RenderOptions,
    stats: RenderStats,
    depth: number,
    sphereIndex: SphereIndex | null = null
  ): Vec3 {
    stats.rays += 1;
    const nearest = sphereIndex
      ? sphereIndex.nearest(ray, options.epsilon, stats)
      : nearestSphere(ray, world.spheres, options.epsilon, stats);
    let tMin = nearest?.t ?? BIG;
    const nearestSphereHit = nearest?.sphere ?? null;

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
      return patchBrightness(patch, world, options, stats, sphereIndex);
    }

    if (nearestSphereHit) {
      const position = pointOnRay(ray, tMin);
      const normal = Math3.mul(Math3.sub(position, nearestSphereHit.position), 1 / nearestSphereHit.radius);
      const patch: HitPatch = {
        position,
        normal,
        color: nearestSphereHit.color,
        sphere: nearestSphereHit
      };

      if (nearestSphereHit.type === BRIGHT && glint(patch, world, ray, options, stats, sphereIndex)) {
        return [1, 1, 1];
      }

      if (nearestSphereHit.type === MIRROR) {
        return mirrorBrightness(patch, world, ray, options, stats, depth, sphereIndex);
      }

      return patchBrightness(patch, world, options, stats, sphereIndex);
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

  function patchBrightness(
    patch: HitPatch,
    world: World,
    options: RenderOptions,
    stats: RenderStats,
    sphereIndex: SphereIndex | null
  ): Vec3 {
    const diffuse = (Math3.dot([0, 0, 1], patch.normal) + 1.5) * 0.4;
    const brightness: Vec3 = [
      diffuse * world.illum[0] * patch.color[0],
      diffuse * world.illum[1] * patch.color[1],
      diffuse * world.illum[2] * patch.color[2]
    ];

    for (const lamp of world.lamps) {
      const direct = directLampBrightness(patch, lamp, world, options, stats, sphereIndex);
      for (let channel = 0; channel < 3; channel += 1) {
        brightness[channel] += direct[channel];
      }
    }

    const ao = ambientOcclusion(patch, world, options);
    return ao > 0 ? Math3.mul(brightness, 1 - ao) : brightness;
  }

  function directLampBrightness(
    patch: HitPatch,
    lamp: Lamp,
    world: World,
    options: RenderOptions,
    stats: RenderStats,
    sphereIndex: SphereIndex | null
  ): Vec3 {
    const effects = options.modernEffects;
    const shadow = effects?.softShadows;
    const usingSoftShadow = !!shadow?.enabled;
    const samples = usingSoftShadow ? Math.max(1, Math.min(16, Math.round(shadow.samples))) : 1;
    const total: Vec3 = [0, 0, 0];

    for (let sample = 0; sample < samples; sample += 1) {
      const lampPosition = sampledLampPosition(patch.position, lamp, sample, samples, shadow?.enabled ? shadow.radius : 0);
      const lampVector = Math3.sub(lampPosition, patch.position);
      const cosi = Math3.dot(lampVector, patch.normal);
      if (cosi <= 0) {
        continue;
      }
      const shadowRay: Ray = { origin: patch.position, direction: lampVector };
      const shadowed = sphereIndex
        ? sphereIndex.anyHit(shadowRay, options.epsilon, stats, patch.sphere)
        : anySphereHit(shadowRay, world.spheres, options.epsilon, stats, patch.sphere);
      if (usingSoftShadow) {
        incrementStat(stats, "modernEffectSamples");
      }
      if (shadowed) {
        continue;
      }

      const r = Math.sqrt(Math3.dot(lampVector, lampVector));
      const direct = cosi / (r * r * r);
      for (let channel = 0; channel < 3; channel += 1) {
        total[channel] += direct * patch.color[channel] * lamp.color[channel];
      }
    }

    return Math3.mul(total, 1 / samples);
  }

  function lampVisibility(
    patch: HitPatch,
    lamp: Lamp,
    world: World,
    options: RenderOptions,
    stats: RenderStats,
    sphereIndex: SphereIndex | null
  ): number {
    const effects = options.modernEffects;
    const shadow = effects?.softShadows;
    const usingSoftShadow = !!shadow?.enabled;
    const samples = usingSoftShadow ? Math.max(1, Math.min(16, Math.round(shadow.samples))) : 1;
    let visible = 0;
    for (let sample = 0; sample < samples; sample += 1) {
      const lampPosition = sampledLampPosition(patch.position, lamp, sample, samples, shadow?.enabled ? shadow.radius : 0);
      const lampVector = Math3.sub(lampPosition, patch.position);
      const cosi = Math3.dot(lampVector, patch.normal);
      if (cosi <= 0) {
        continue;
      }
      const shadowRay: Ray = { origin: patch.position, direction: lampVector };
      const shadowed = sphereIndex
        ? sphereIndex.anyHit(shadowRay, options.epsilon, stats, patch.sphere)
        : anySphereHit(shadowRay, world.spheres, options.epsilon, stats, patch.sphere);
      if (usingSoftShadow) {
        incrementStat(stats, "modernEffectSamples");
      }
      if (!shadowed) {
        visible += 1;
      }
    }
    return visible / samples;
  }

  function sampledLampPosition(patchPosition: Vec3, lamp: Lamp, sample: number, samples: number, radius = 0): Vec3 {
    if (radius <= 0 || samples <= 1) {
      return lamp.position;
    }
    const toLamp = Math3.normalize(Math3.sub(lamp.position, patchPosition));
    const fallback: Vec3 = Math.abs(toLamp[2]) > 0.9 ? [0, 1, 0] : [0, 0, 1];
    const basisU = Math3.normalize(Math3.cross(toLamp, fallback));
    const basisV = Math3.normalize(Math3.cross(toLamp, basisU));
    const angle = (sample * 2.399963229728653) % (Math.PI * 2);
    const ring = (sample + 0.5) / samples;
    const distance = Math.sqrt(ring) * radius;
    return Math3.add(
      lamp.position,
      Math3.add(
        Math3.mul(basisU, Math.cos(angle) * distance),
        Math3.mul(basisV, Math.sin(angle) * distance)
      )
    );
  }

  function ambientOcclusion(patch: HitPatch, world: World, options: RenderOptions): number {
    const settings = options.modernEffects?.ambientOcclusion;
    if (!settings?.enabled || settings.strength <= 0 || settings.radius <= 0) {
      return 0;
    }

    let occlusion = 0;
    if (patch.sphere) {
      const groundGap = Math.max(0, patch.sphere.position[2] - patch.sphere.radius);
      const bottomFacing = Math.max(0, -patch.normal[2]);
      occlusion += Math.max(0, 1 - groundGap / settings.radius) * bottomFacing;
      for (const sphere of world.spheres) {
        if (sphere === patch.sphere) {
          continue;
        }
        const centerGap = Math3.length(Math3.sub(sphere.position, patch.sphere.position)) - sphere.radius - patch.sphere.radius;
        if (centerGap > settings.radius) {
          continue;
        }
        const towardSphere = Math3.normalize(Math3.sub(sphere.position, patch.position));
        const facing = Math.max(0, Math3.dot(patch.normal, towardSphere));
        occlusion += Math.max(0, 1 - Math.max(0, centerGap) / settings.radius) * facing * 0.35;
      }
    } else {
      for (const sphere of world.spheres) {
        const planar = Math.hypot(sphere.position[0] - patch.position[0], sphere.position[1] - patch.position[1]);
        const height = Math.max(0, sphere.position[2] - sphere.radius);
        const contact = planar + height * 0.6;
        occlusion += Math.max(0, 1 - contact / Math.max(0.001, sphere.radius * settings.radius)) * 0.7;
      }
    }

    return Math.max(0, Math.min(0.65, occlusion * settings.strength));
  }

  function glint(
    patch: HitPatch,
    world: World,
    incident: Ray,
    options: RenderOptions,
    stats: RenderStats,
    sphereIndex: SphereIndex | null
  ): boolean {
    let reflected: Vec3 | null = null;
    let reflectedLength2 = 0;

    for (const lamp of world.lamps) {
      const lampVector = Math3.sub(lamp.position, patch.position);
      const cosi = Math3.dot(lampVector, patch.normal);
      if (cosi <= 0) {
        continue;
      }

      if (lampVisibility(patch, lamp, world, options, stats, sphereIndex) <= 0.5) {
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
    depth: number,
    sphereIndex: SphereIndex | null
  ): Vec3 {
    const normalDotIncident = Math3.dot(patch.normal, incident.direction);
    if (normalDotIncident >= 0) {
      return [0, 0, 0];
    }

    if (depth >= options.maxDepth) {
      return [0, 0, 0];
    }

    const reflected = reflectVector(incident.direction, patch.normal, options.reflectionMode, options.epsilon, stats);
    const brightness = trace({ origin: patch.position, direction: reflected }, world, options, stats, depth + 1, sphereIndex);
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

  function samplePixel(
    observer: Observer,
    x: number,
    y: number,
    world: World,
    options: RenderOptions,
    stats: RenderStats,
    sphereIndex: SphereIndex | null
  ): Vec3 {
    const antiAliasMode = options.antiAliasMode ?? "off";
    if (antiAliasMode === "off") {
      return traceCameraSample(observer, x, y, 0, 0, world, options, stats, sphereIndex);
    }

    if (antiAliasMode === "ordered-2x") {
      return averageBrightness([
        traceCameraSample(observer, x, y, 0.25, 0.25, world, options, stats, sphereIndex),
        traceCameraSample(observer, x, y, 0.75, 0.25, world, options, stats, sphereIndex),
        traceCameraSample(observer, x, y, 0.25, 0.75, world, options, stats, sphereIndex),
        traceCameraSample(observer, x, y, 0.75, 0.75, world, options, stats, sphereIndex)
      ]);
    }

    const center = traceCameraSample(observer, x, y, 0, 0, world, options, stats, sphereIndex);
    const a = traceCameraSample(observer, x, y, 0.25, 0.25, world, options, stats, sphereIndex);
    const b = traceCameraSample(observer, x, y, 0.75, 0.75, world, options, stats, sphereIndex);
    if (colorDistance(center, a) + colorDistance(center, b) < 0.08) {
      return center;
    }
    return averageBrightness([
      a,
      traceCameraSample(observer, x, y, 0.75, 0.25, world, options, stats, sphereIndex),
      traceCameraSample(observer, x, y, 0.25, 0.75, world, options, stats, sphereIndex),
      b
    ]);
  }

  function traceCameraSample(
    observer: Observer,
    x: number,
    y: number,
    dx: number,
    dy: number,
    world: World,
    options: RenderOptions,
    stats: RenderStats,
    sphereIndex: SphereIndex | null
  ): Vec3 {
    const settings = options.modernEffects?.depthOfField;
    if (!settings?.enabled || settings.aperture <= 0 || settings.samples <= 1) {
      return trace(pixelRaySample(observer, x, y, dx, dy), world, options, stats, 0, sphereIndex);
    }

    const samples = Math.max(2, Math.min(16, Math.round(settings.samples)));
    const centerRay = pixelRaySample(observer, x, y, dx, dy);
    const focusDistance = Math.max(0.1, settings.focusDistance);
    const focusPoint = Math3.add(centerRay.origin, Math3.mul(Math3.normalize(centerRay.direction), focusDistance));
    const total: Vec3 = [0, 0, 0];
    for (let sample = 0; sample < samples; sample += 1) {
      const lens = deterministicDiskSample(sample, samples, settings.aperture);
      const origin = Math3.add(
        observer.position,
        Math3.add(Math3.mul(observer.uhat, lens[0]), Math3.mul(observer.vhat, lens[1]))
      );
      const brightness = trace({ origin, direction: Math3.sub(focusPoint, origin) }, world, options, stats, 0, sphereIndex);
      total[0] += brightness[0];
      total[1] += brightness[1];
      total[2] += brightness[2];
      incrementStat(stats, "modernEffectSamples");
    }
    return Math3.mul(total, 1 / samples);
  }

  function deterministicDiskSample(sample: number, samples: number, radius: number): [number, number] {
    if (sample === 0) {
      return [0, 0];
    }
    const angle = (sample * 2.399963229728653) % (Math.PI * 2);
    const distance = Math.sqrt((sample + 0.5) / samples) * radius;
    return [Math.cos(angle) * distance, Math.sin(angle) * distance];
  }

  function averageBrightness(samples: Vec3[]): Vec3 {
    const total: Vec3 = [0, 0, 0];
    for (const sample of samples) {
      total[0] += sample[0];
      total[1] += sample[1];
      total[2] += sample[2];
    }
    return Math3.mul(total, 1 / samples.length);
  }

  function colorDistance(a: Vec3, b: Vec3): number {
    return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
  }

  export function blendMotionSamples(
    current: Uint8ClampedArray,
    previous: Uint8ClampedArray | null,
    settings: MotionBlurSettings | undefined
  ): Uint8ClampedArray {
    if (!previous || !settings?.enabled || settings.strength <= 0 || current.length !== previous.length) {
      return current;
    }
    const strength = Math.max(0, Math.min(0.85, settings.strength));
    const blended = new Uint8ClampedArray(current.length);
    for (let i = 0; i < current.length; i += 4) {
      blended[i] = Math3.clampByte(current[i] * (1 - strength) + previous[i] * strength);
      blended[i + 1] = Math3.clampByte(current[i + 1] * (1 - strength) + previous[i + 1] * strength);
      blended[i + 2] = Math3.clampByte(current[i + 2] * (1 - strength) + previous[i + 2] * strength);
      blended[i + 3] = 255;
    }
    return blended;
  }

  export function qualityLabelFor(id: RenderQualityId): string {
    return QUALITY_MODES.find((mode) => mode.id === id)?.label ?? id;
  }

  export function antiAliasLabelFor(id: AntiAliasModeId): string {
    return ANTI_ALIAS_MODES.find((mode) => mode.id === id)?.label ?? id;
  }

  export class SphereIndex {
    private readonly root: BvhNode | null;

    constructor(spheres: Sphere[]) {
      this.root = spheres.length ? buildNode(spheres) : null;
    }

    nearest(ray: Ray, epsilon: number, stats: RenderStats): { sphere: Sphere; t: number } | null {
      if (!this.root) {
        return null;
      }
      let nearest: { sphere: Sphere; t: number } | null = null;
      const stack: BvhNode[] = [this.root];
      while (stack.length) {
        const node = stack.pop()!;
        incrementStat(stats, "bvhNodeTests");
        if (!intersectBounds(ray, node.bounds, epsilon, nearest?.t ?? BIG)) {
          continue;
        }
        if (node.spheres.length) {
          for (const sphere of node.spheres) {
            const t = intersectSphereCounted(ray, sphere, epsilon, stats);
            if (t !== null && t < (nearest?.t ?? BIG)) {
              nearest = { sphere, t };
            }
          }
          continue;
        }
        if (node.left) {
          stack.push(node.left);
        }
        if (node.right) {
          stack.push(node.right);
        }
      }
      return nearest;
    }

    anyHit(ray: Ray, epsilon: number, stats: RenderStats, excludedSphere: Sphere | null): boolean {
      if (!this.root) {
        return false;
      }
      const stack: BvhNode[] = [this.root];
      while (stack.length) {
        const node = stack.pop()!;
        incrementStat(stats, "bvhNodeTests");
        if (!intersectBounds(ray, node.bounds, epsilon, BIG)) {
          continue;
        }
        if (node.spheres.length) {
          for (const sphere of node.spheres) {
            if (sphere === excludedSphere) {
              continue;
            }
            if (intersectSphereCounted(ray, sphere, epsilon, stats) !== null) {
              return true;
            }
          }
          continue;
        }
        if (node.left) {
          stack.push(node.left);
        }
        if (node.right) {
          stack.push(node.right);
        }
      }
      return false;
    }
  }

  function nearestSphere(ray: Ray, spheres: Sphere[], epsilon: number, stats: RenderStats): { sphere: Sphere; t: number } | null {
    let nearest: { sphere: Sphere; t: number } | null = null;
    for (const sphere of spheres) {
      const t = intersectSphereCounted(ray, sphere, epsilon, stats);
      if (t !== null && t < (nearest?.t ?? BIG)) {
        nearest = { sphere, t };
      }
    }
    return nearest;
  }

  function anySphereHit(
    ray: Ray,
    spheres: Sphere[],
    epsilon: number,
    stats: RenderStats,
    excludedSphere: Sphere | null
  ): boolean {
    for (const sphere of spheres) {
      if (sphere === excludedSphere) {
        continue;
      }
      if (intersectSphereCounted(ray, sphere, epsilon, stats) !== null) {
        return true;
      }
    }
    return false;
  }

  function intersectSphereCounted(ray: Ray, sphere: Sphere, epsilon: number, stats: RenderStats): number | null {
    incrementStat(stats, "sphereTests");
    return intersectSphere(ray, sphere, epsilon);
  }

  function buildNode(spheres: Sphere[]): BvhNode {
    const bounds = boundsForSpheres(spheres);
    if (spheres.length <= 6) {
      return { bounds, left: null, right: null, spheres };
    }

    const axis = widestAxis(bounds);
    const sorted = spheres.slice().sort((a, b) => a.position[axis] - b.position[axis]);
    const middle = Math.floor(sorted.length / 2);
    return {
      bounds,
      left: buildNode(sorted.slice(0, middle)),
      right: buildNode(sorted.slice(middle)),
      spheres: []
    };
  }

  function boundsForSpheres(spheres: Sphere[]): Bounds {
    const min: Vec3 = [BIG, BIG, BIG];
    const max: Vec3 = [-BIG, -BIG, -BIG];
    for (const sphere of spheres) {
      for (let axis = 0; axis < 3; axis += 1) {
        min[axis] = Math.min(min[axis], sphere.position[axis] - sphere.radius);
        max[axis] = Math.max(max[axis], sphere.position[axis] + sphere.radius);
      }
    }
    return { min, max };
  }

  function widestAxis(bounds: Bounds): 0 | 1 | 2 {
    const x = bounds.max[0] - bounds.min[0];
    const y = bounds.max[1] - bounds.min[1];
    const z = bounds.max[2] - bounds.min[2];
    if (x >= y && x >= z) {
      return 0;
    }
    return y >= z ? 1 : 2;
  }

  function intersectBounds(ray: Ray, bounds: Bounds, epsilon: number, maximum: number): boolean {
    let tMin = epsilon;
    let tMax = maximum;
    for (let axis = 0; axis < 3; axis += 1) {
      const origin = ray.origin[axis];
      const direction = ray.direction[axis];
      if (Math.abs(direction) < 1e-12) {
        if (origin < bounds.min[axis] || origin > bounds.max[axis]) {
          return false;
        }
        continue;
      }
      const inv = 1 / direction;
      let t0 = (bounds.min[axis] - origin) * inv;
      let t1 = (bounds.max[axis] - origin) * inv;
      if (t0 > t1) {
        const swap = t0;
        t0 = t1;
        t1 = swap;
      }
      tMin = Math.max(tMin, t0);
      tMax = Math.min(tMax, t1);
      if (tMax < tMin) {
        return false;
      }
    }
    return true;
  }

  function incrementStat(
    stats: RenderStats,
    key: keyof Pick<RenderStats, "sphereTests" | "bvhNodeTests" | "pixels" | "tiles" | "modernEffectSamples">
  ): void {
    stats[key] = (stats[key] ?? 0) + 1;
  }

  function now(): number {
    return typeof performance !== "undefined" ? performance.now() : Date.now();
  }
}
