namespace Juggler.Ham {
  export class HamEncoder {
    private readonly threshold = 4;
    private readonly colorRegisters: Vec3[] = [
      [0, 0, 0],
      [15, 15, 15],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0]
    ];
    private allocated = 2;
    private previous: Vec3 = [0, 0, 0];

    beginLine(): void {
      this.previous = [0, 0, 0];
    }

    encodePixel(x: number, brightness: Vec3): Vec3 {
      const pix: Vec3 = [
        Math3.clampNibble(16 * brightness[0] + 0.5),
        Math3.clampNibble(16 * brightness[1] + 0.5),
        Math3.clampNibble(16 * brightness[2] + 0.5)
      ];
      const output = this.ham2(x, pix);
      return [output[0] * 17, output[1] * 17, output[2] * 17];
    }

    private ham2(x: number, pix: Vec3): Vec3 {
      if (x === 0) {
        const nearest = this.nearestPaletteIndex(pix).index;
        this.previous = [...this.colorRegisters[nearest]];
        return [...this.previous];
      }

      const distanceIfHam = this.colorDistanceAfterWorstCorrection(pix, this.previous);
      if (distanceIfHam !== 0) {
        const nearest = this.nearestPaletteIndex(pix);
        if (nearest.distance < distanceIfHam) {
          this.previous = [...this.colorRegisters[nearest.index]];
          return [...this.previous];
        }
      }

      let channel = 0;
      let maxDifference = 0;
      for (let k = 0; k < 3; k += 1) {
        const difference = Math.abs(pix[k] - this.previous[k]);
        if (difference > maxDifference) {
          maxDifference = difference;
          channel = k;
        }
      }

      this.previous[channel] = pix[channel];
      return [...this.previous];
    }

    private nearestPaletteIndex(color: Vec3): { index: number; distance: number } {
      let nearest = 0;
      let minDistance = Number.POSITIVE_INFINITY;
      for (let i = 0; i < this.allocated; i += 1) {
        const distance = this.colorDistance(color, this.colorRegisters[i]);
        if (distance < minDistance) {
          minDistance = distance;
          nearest = i;
        }
      }

      if (minDistance > this.threshold && this.allocated < 16) {
        this.colorRegisters[this.allocated] = [...color];
        nearest = this.allocated;
        this.allocated += 1;
        minDistance = 0;
      }

      return { index: nearest, distance: minDistance };
    }

    private colorDistanceAfterWorstCorrection(a: Vec3, b: Vec3): number {
      let result = 0;
      let maximum = 0;
      for (let k = 0; k < 3; k += 1) {
        const difference = Math.abs(a[k] - b[k]);
        result += difference;
        maximum = Math.max(maximum, difference);
      }
      return result - maximum;
    }

    private colorDistance(a: Vec3, b: Vec3): number {
      return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
    }
  }
}
