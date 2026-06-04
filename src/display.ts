namespace Juggler.Display {
  export const CONSTRAINTS: Array<{ id: DisplayConstraintId; label: string }> = [
    { id: "rgb", label: "RGB" },
    { id: "ocs-12bit", label: "OCS 12-bit" },
    { id: "ehb-64", label: "EHB 64" },
    { id: "ham6-approx", label: "HAM6 approx" }
  ];

  export class ConstraintEncoder {
    private hamEncoder: Ham.HamEncoder | null = null;

    constructor(private readonly id: DisplayConstraintId) {
      if (id === "ham6-approx") {
        this.hamEncoder = new Ham.HamEncoder();
      }
    }

    beginLine(): void {
      this.hamEncoder?.beginLine();
    }

    encodePixel(x: number, rgb: Vec3): Vec3 {
      if (this.hamEncoder) {
        return this.hamEncoder.encodePixel(x, [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255]);
      }
      return constrainRgb(this.id, rgb);
    }
  }

  export function constrainRgb(id: DisplayConstraintId, rgb: Vec3): Vec3 {
    switch (id) {
      case "rgb":
        return rgb;
      case "ocs-12bit":
      case "ham6-approx":
        return rgb.map((channel) => quantize4(channel)) as Vec3;
      case "ehb-64":
        return extraHalfBrite(rgb);
    }
  }

  export function labelFor(id: DisplayConstraintId): string {
    return CONSTRAINTS.find((constraint) => constraint.id === id)?.label ?? id;
  }

  function quantize4(value: number): number {
    return Math3.clampByte(Math.round(Math3.clampByte(value) / 17) * 17);
  }

  function extraHalfBrite(rgb: Vec3): Vec3 {
    const brightness = Math.max(rgb[0], rgb[1], rgb[2]);
    if (brightness < 128) {
      return constrainRgb("ocs-12bit", Math3.mul(rgb, 2)).map((channel) => Math3.clampByte(channel * 0.5)) as Vec3;
    }
    return constrainRgb("ocs-12bit", rgb);
  }
}
