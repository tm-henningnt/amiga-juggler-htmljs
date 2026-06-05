import { execFile } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { promisify } from "node:util";
import vm from "node:vm";

const execFileAsync = promisify(execFile);
const root = resolve(new URL("..", import.meta.url).pathname);
const width = 320;
const height = 200;
const frameCount = 24;
const frameBytes = width * height * 4;
const bundlePath = resolve(root, "dist-calibration/juggler-calibration.js");
const moviePath = await resolveMoviePath();

const Juggler = await loadJugglerBundle();
const referenceFrames = await decodeReferenceFrames(moviePath);
const scene = Juggler.Parser.parseDatScene(Juggler.ORIGINAL_DAT.robot, "robot.dat humanoid");
const world = Juggler.Scenes.buildWorld(scene);
const comparisons = [];

for (let sourceFrame = 0; sourceFrame < frameCount; sourceFrame += 1) {
  const rendered = Juggler.Calibration.renderClassicFrame(scene, world, sourceFrame);
  const reference = referenceFrames.subarray(sourceFrame * frameBytes, (sourceFrame + 1) * frameBytes);
  comparisons.push(Juggler.Calibration.compareClassicFrame(
    rendered.data,
    reference,
    width,
    height,
    sourceFrame,
    rendered.sourceFit
  ));
}

const summary = Juggler.Calibration.summarizeClassicFit(comparisons);
console.log(`Classic calibration reference: ${summary.reference}`);
console.log(`Movie: ${moviePath}`);
console.log("frame  mae    rms    overlap  framing  ballMean  ballMax");
for (const frame of comparisons) {
  console.log([
    String(frame.sourceFrame + 1).padStart(5),
    frame.meanAbsoluteError.toFixed(2).padStart(6),
    frame.rootMeanSquareError.toFixed(2).padStart(6),
    frame.foregroundOverlap.toFixed(3).padStart(8),
    frame.framingError.toFixed(2).padStart(8),
    formatNullable(frame.meanBallPixelError).padStart(8),
    formatNullable(frame.maxBallPixelError).padStart(7)
  ].join("  "));
}
console.log("summary", JSON.stringify(summary, null, 2));

async function loadJugglerBundle() {
  if (!(await fileExists(bundlePath))) {
    throw new Error("Calibration bundle not found. Run `npm run build:calibration` first.");
  }
  const source = await readFile(bundlePath, "utf8");
  const context = vm.createContext({
    console,
    Date,
    Math,
    performance,
    Uint8ClampedArray
  });
  vm.runInContext(source, context, { filename: bundlePath });
  if (!context.Juggler) {
    throw new Error("Calibration bundle did not expose Juggler namespace.");
  }
  return context.Juggler;
}

async function decodeReferenceFrames(path) {
  const { stdout } = await execFileAsync("ffmpeg", [
    "-v",
    "error",
    "-i",
    path,
    "-frames:v",
    String(frameCount),
    "-vf",
    `scale=${width}:${height}:flags=area,format=rgba`,
    "-f",
    "rawvideo",
    "-"
  ], { encoding: "buffer", maxBuffer: frameBytes * frameCount + 1024 });
  if (stdout.length < frameBytes * frameCount) {
    throw new Error(`Decoded ${stdout.length} bytes, expected at least ${frameBytes * frameCount}.`);
  }
  return new Uint8ClampedArray(stdout.buffer, stdout.byteOffset, frameBytes * frameCount);
}

async function resolveMoviePath() {
  const explicitPath = process.argv[2] ?? process.env.JUGGLER_REFERENCE_MOVIE ?? "";
  const candidates = explicitPath
    ? [explicitPath]
    : [
      "reference/Eric-Graham-1987-Juggler-Raytracer-1.0/media/juggler.avi",
      "tmp/juggler.avi",
      "reference/Eric-Graham-1987-Juggler-Raytracer-1.0/media/Juggler.mp4",
      "tmp/Juggler.mp4"
    ];
  for (const candidate of candidates) {
    const path = resolve(root, candidate);
    if (await fileExists(path)) {
      return path;
    }
  }
  throw new Error(`No reference movie found. Checked: ${candidates.join(", ")}`);
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function formatNullable(value) {
  return value === null ? "n/a" : value.toFixed(2);
}
