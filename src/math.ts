namespace Juggler.Math3 {
  export function vec(x = 0, y = 0, z = 0): Vec3 {
    return [x, y, z];
  }

  export function add(a: Vec3, b: Vec3): Vec3 {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  }

  export function sub(a: Vec3, b: Vec3): Vec3 {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  }

  export function mul(a: Vec3, scalar: number): Vec3 {
    return [a[0] * scalar, a[1] * scalar, a[2] * scalar];
  }

  export function dot(a: Vec3, b: Vec3): number {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }

  export function cross(a: Vec3, b: Vec3): Vec3 {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0]
    ];
  }

  export function length(a: Vec3): number {
    return Math.sqrt(dot(a, a));
  }

  export function normalize(a: Vec3): Vec3 {
    const len = length(a);
    return len > 0 ? mul(a, 1 / len) : [0, 0, 0];
  }

  export function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  export function lerpVec(a: Vec3, b: Vec3, t: number): Vec3 {
    return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  }

  export function isFiniteVec(a: Vec3): boolean {
    return Number.isFinite(a[0]) && Number.isFinite(a[1]) && Number.isFinite(a[2]);
  }

  export function clampByte(value: number): number {
    return Math.max(0, Math.min(255, Math.round(value)));
  }

  export function clampNibble(value: number): number {
    return Math.max(0, Math.min(15, Math.round(value)));
  }

  export function formatVec(a: Vec3, places = 2): string {
    return `${a[0].toFixed(places)}, ${a[1].toFixed(places)}, ${a[2].toFixed(places)}`;
  }
}
