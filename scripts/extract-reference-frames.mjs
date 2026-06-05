import { execFile } from "node:child_process";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const outputPath = resolve(root, "src/reference-frames.ts");
const width = 320;
const height = 200;
const frameCount = 24;
const moviePath = await resolveMoviePath();
const tempDir = await mkdtemp(join(tmpdir(), "juggler-reference-"));

try {
  await execFileAsync("ffmpeg", [
    "-y",
    "-v",
    "error",
    "-i",
    moviePath,
    "-frames:v",
    String(frameCount),
    "-vf",
    `scale=${width}:${height}:flags=area`,
    "-compression_level",
    "9",
    join(tempDir, "frame_%02d.png")
  ]);

  const frames = [];
  for (let index = 0; index < frameCount; index += 1) {
    const file = join(tempDir, `frame_${String(index + 1).padStart(2, "0")}.png`);
    const data = await readFile(file);
    frames.push({
      index,
      frameNumber: index + 1,
      sourceFrame: index,
      width,
      height,
      source: basename(moviePath),
      dataUrl: `data:image/png;base64,${data.toString("base64")}`
    });
  }

  const source = `namespace Juggler.ReferenceFrames {
  export const WIDTH = ${width};
  export const HEIGHT = ${height};
  export const COUNT = ${frameCount};
  export const SOURCE_MOVIE = ${JSON.stringify(basename(moviePath))};

  export interface ReferenceFrame {
    index: number;
    frameNumber: number;
    sourceFrame: number;
    width: number;
    height: number;
    source: string;
    dataUrl: string;
  }

  export const FRAMES: ReferenceFrame[] = ${JSON.stringify(frames, null, 2)};

  export function bySourceFrame(sourceFrame: number): ReferenceFrame {
    const index = ((Math.floor(sourceFrame) % COUNT) + COUNT) % COUNT;
    return FRAMES[index] ?? FRAMES[0];
  }
}
`;

  await writeFile(outputPath, source, "utf8");
  console.log(`Wrote ${frames.length} reference frames from ${moviePath} to ${outputPath}`);
} finally {
  await rm(tempDir, { recursive: true, force: true });
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
    const resolved = resolve(root, candidate);
    if (await fileExists(resolved)) {
      return resolved;
    }
  }

  throw new Error([
    "No source movie found for reference-frame extraction.",
    "Pass a movie path as the first argument, set JUGGLER_REFERENCE_MOVIE, or place one of these files:",
    ...candidates.map((candidate) => `- ${candidate}`)
  ].join("\n"));
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
