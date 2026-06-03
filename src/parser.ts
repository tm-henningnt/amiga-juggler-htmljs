namespace Juggler.Parser {
  class Scanner {
    private index = 0;

    constructor(private readonly text: string, private readonly sourceName: string) {}

    eof(): boolean {
      this.skipWhitespace();
      return this.index >= this.text.length;
    }

    skipWhitespace(): void {
      while (this.index < this.text.length && /\s/.test(this.text[this.index])) {
        this.index += 1;
      }
    }

    consume(char: string): boolean {
      this.skipWhitespace();
      if (this.text[this.index] === char) {
        this.index += 1;
        return true;
      }
      return false;
    }

    expect(char: string): void {
      if (!this.consume(char)) {
        this.fail(`Expected '${char}'`);
      }
    }

    readNumber(): number {
      this.skipWhitespace();
      const match = /^[+-]?(?:(?:\d+(?:\.\d*)?)|(?:\.\d+))(?:[eE][+-]?\d+)?/.exec(this.text.slice(this.index));
      if (!match) {
        this.fail("Expected number");
      }
      this.index += match[0].length;
      return Number(match[0]);
    }

    readVec(open: string, close: string): Vec3 {
      this.skipWhitespace();
      this.expect(open);
      const values: number[] = [];
      for (let i = 0; i < 3; i += 1) {
        values.push(this.readNumber());
        if (i < 2) {
          this.expect(",");
        }
      }
      this.expect(close);
      return [values[0], values[1], values[2]];
    }

    readAnglePair(): [number, number] {
      this.skipWhitespace();
      this.expect("[");
      const altitude = this.readNumber();
      this.expect(",");
      const azimuth = this.readNumber();
      this.expect("]");
      return [altitude, azimuth];
    }

    readSphereControl(interpolationFromPrevious: number | null): SphereControl {
      const center = this.readVec("(", ")");
      this.expect(":");
      const radius = this.readNumber();
      return { center, radius, interpolationFromPrevious };
    }

    fail(message: string): never {
      const before = this.text.slice(Math.max(0, this.index - 32), this.index);
      const after = this.text.slice(this.index, this.index + 48);
      throw new Error(`${this.sourceName}: ${message} near "${before}>>${after}"`);
    }
  }

  export function parseDatScene(text: string, sourceName = "scene.dat"): ParsedScene {
    const scanner = new Scanner(text, sourceName);
    const observerPosition = scanner.readVec("(", ")");
    const [altitudeDeg, azimuthDeg] = scanner.readAnglePair();
    const focalLength = scanner.readNumber();
    const groups: SphereGroup[] = [];

    while (!scanner.eof()) {
      if (scanner.consume(";")) {
        break;
      }

      const color = scanner.readVec("<", ">");
      const sourceType = Math.round(scanner.readNumber());
      const type = normalizeSurfaceType(sourceType);
      const controls: SphereControl[] = [scanner.readSphereControl(null)];

      while (true) {
        if (scanner.consume(";")) {
          break;
        }
        const interpolation = Math.max(1, Math.round(scanner.readNumber()));
        controls.push(scanner.readSphereControl(interpolation));
      }

      groups.push({ color, type, sourceType, controls });
    }

    const lampCount = Math.max(0, Math.round(scanner.readNumber()));
    const lamps: LampInput[] = [];
    for (let i = 0; i < lampCount; i += 1) {
      const control = scanner.readSphereControl(null);
      lamps.push({
        position: control.center,
        radius: control.radius,
        color: scanner.readVec("<", ">")
      });
    }

    const horizon0 = scanner.readVec("<", ">");
    const horizon1 = scanner.readVec("<", ">");
    const illum = scanner.readVec("<", ">");
    const skyZenith = scanner.readVec("<", ">");
    const skyHorizon = scanner.readVec("<", ">");

    return {
      sourceName,
      observerPosition,
      altitudeDeg,
      azimuthDeg,
      focalLength,
      groups,
      lamps,
      horizon: [horizon0, horizon1],
      illum,
      skyZenith,
      skyHorizon
    };
  }

  function normalizeSurfaceType(value: number): SurfaceType {
    if (value === DULL || value === BRIGHT || value === MIRROR) {
      return value;
    }
    return DULL;
  }
}
