namespace Juggler.Preview {
  const WIRE_ALPHA = 0.95;
  const SOLID_ALPHA = 0.88;

  export const MODES: Array<{ id: PreviewMode; label: string }> = [
    { id: "raytrace", label: "Raytrace" },
    { id: "wireframe", label: "Wireframe" },
    { id: "solid", label: "Solid" }
  ];

  export function projectSphere(sphere: Sphere, observer: Observer): ProjectedSphere | null {
    const delta = Math3.sub(sphere.position, observer.position);
    const depth = Math3.dot(delta, observer.viewDir);
    if (depth <= observer.focalLength * 0.1) {
      return null;
    }

    const cameraX = Math3.dot(delta, observer.uhat) * observer.focalLength / depth;
    const cameraY = Math3.dot(delta, observer.vhat) * observer.focalLength / depth;
    const x = cameraX / observer.px + 0.5 * observer.nx;
    const y = 0.5 * observer.ny - cameraY / observer.py;
    const rx = Math.abs(sphere.radius * observer.focalLength / depth / observer.px);
    const ry = Math.abs(sphere.radius * observer.focalLength / depth / observer.py);

    if (x + rx < 0 || x - rx > observer.nx || y + ry < 0 || y - ry > observer.ny) {
      return null;
    }

    return { sphere, x, y, rx, ry, depth };
  }

  export function projectedSpheres(world: World, observer: Observer): ProjectedSphere[] {
    return world.spheres
      .map((sphere) => projectSphere(sphere, observer))
      .filter((sphere): sphere is ProjectedSphere => sphere !== null)
      .sort((a, b) => b.depth - a.depth);
  }

  export function pickGroup(world: World, observer: Observer, screenX: number, screenY: number): number | null {
    const projected = projectedSpheres(world, observer).slice().sort((a, b) => a.depth - b.depth);
    for (const item of projected) {
      const dx = (screenX - item.x) / Math.max(0.5, item.rx);
      const dy = (screenY - item.y) / Math.max(0.5, item.ry);
      if (dx * dx + dy * dy <= 1) {
        return item.sphere.groupIndex;
      }
    }
    return null;
  }

  export function draw(
    context: CanvasRenderingContext2D,
    world: World,
    observer: Observer,
    mode: PreviewMode,
    selectedGroupIndex: number | null = null,
    displayConstraintId: DisplayConstraintId = "rgb"
  ): void {
    context.clearRect(0, 0, observer.nx, observer.ny);
    context.fillStyle = "#000000";
    context.fillRect(0, 0, observer.nx, observer.ny);

    if (mode === "raytrace") {
      return;
    }

    for (const item of projectedSpheres(world, observer)) {
      const color = sphereColor(item.sphere, mode, displayConstraintId);
      context.beginPath();
      context.ellipse(item.x, item.y, Math.max(0.5, item.rx), Math.max(0.5, item.ry), 0, 0, Math.PI * 2);
      if (mode === "solid") {
        context.globalAlpha = SOLID_ALPHA;
        context.fillStyle = color.fill;
        context.fill();
        context.globalAlpha = 1;
      }
      const selected = selectedGroupIndex !== null && item.sphere.groupIndex === selectedGroupIndex;
      context.globalAlpha = mode === "wireframe" ? WIRE_ALPHA : 1;
      context.strokeStyle = selected ? "rgb(255,136,0)" : color.stroke;
      context.lineWidth = selected ? 3 : item.sphere.type === MIRROR ? 2 : 1;
      context.stroke();
      context.globalAlpha = 1;
    }
  }

  function sphereColor(sphere: Sphere, mode: PreviewMode, displayConstraintId: DisplayConstraintId): { fill: string; stroke: string } {
    if (sphere.type === MIRROR) {
      return mode === "wireframe"
        ? colorPair([230, 230, 230], [255, 255, 255], displayConstraintId)
        : colorPair([210, 220, 230], [255, 255, 255], displayConstraintId);
    }
    if (sphere.type === BRIGHT) {
      return colorPair([255, 245, 150], [255, 255, 255], displayConstraintId);
    }
    const rgb = sphere.color.map((channel) => Math3.clampByte(channel * 255));
    return colorPair(rgb as Vec3, mode === "wireframe" ? [255, 136, 0] : [0, 0, 0], displayConstraintId);
  }

  function colorPair(fill: Vec3, stroke: Vec3, displayConstraintId: DisplayConstraintId): { fill: string; stroke: string } {
    const constrainedFill = Display.constrainRgb(displayConstraintId, fill);
    const constrainedStroke = Display.constrainRgb(displayConstraintId, stroke);
    return {
      fill: cssRgb(constrainedFill),
      stroke: cssRgb(constrainedStroke)
    };
  }

  function cssRgb(rgb: Vec3): string {
    return `rgb(${Math3.clampByte(rgb[0])},${Math3.clampByte(rgb[1])},${Math3.clampByte(rgb[2])})`;
  }
}
