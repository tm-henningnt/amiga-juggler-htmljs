import { access, readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const headerBytes = 8;
const paletteEntries = 16;
const paletteBytes = paletteEntries * 3;
const payloadOffset = headerBytes + paletteBytes;
const candidates = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
    "reference/Eric-Graham-1987-Juggler-Raytracer-1.0/Raytracer_1987_Graham_Source_Code/movie.data",
    "reference/Eric-Graham-1987-Juggler-Raytracer-1.0/Raytracer_1987_Graham_Source_Code/movie2.data"
  ];

let found = 0;
for (const candidate of candidates) {
  const path = resolve(root, candidate);
  if (!(await fileExists(path))) {
    continue;
  }
  found += 1;
  const data = await readFile(path);
  const info = parseMovieData(data);
  console.log(formatMovieData(path, info));
}

if (!found) {
  throw new Error([
    "No movie.data files found.",
    "Pass one or more paths, or place recovered AlphaPixel files under reference/."
  ].join("\n"));
}

function parseMovieData(data) {
  if (data.length < payloadOffset) {
    throw new Error(`Movie data is too short: ${data.length} bytes`);
  }
  const frameCount = data.readUInt32BE(0);
  const width = data.readUInt16BE(4);
  const height = data.readUInt16BE(6);
  const palette = [];
  for (let index = 0; index < paletteEntries; index += 1) {
    const offset = headerBytes + index * 3;
    palette.push([data[offset], data[offset + 1], data[offset + 2]]);
  }
  const payloadBytes = data.length - payloadOffset;
  return {
    frameCount,
    width,
    height,
    palette,
    payloadBytes,
    averagePayloadBytes: frameCount > 0 ? payloadBytes / frameCount : 0
  };
}

function formatMovieData(path, info) {
  const palette = info.palette.map(formatPaletteEntry).join(" ");
  return [
    `${basename(path)}: ${info.frameCount} frames, ${info.width} x ${info.height}`,
    `compressed payload: ${info.payloadBytes} bytes (${info.averagePayloadBytes.toFixed(1)} average bytes/frame)`,
    `palette (raw 4-bit RGB): ${palette}`
  ].join("\n");
}

function formatPaletteEntry(rgb) {
  return `$${rgb.map((channel) => channel.toString(16).slice(-1)).join("")}`;
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
