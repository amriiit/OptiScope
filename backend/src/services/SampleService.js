import path from "node:path";
import { readFile } from "node:fs/promises";
import { rootDir } from "../config/limits.js";
export const sampleNames = [
  "linear.cpp",
  "nested.cpp",
  "sequential.cpp",
  "logarithmic.cpp",
  "mixed_hotspots.cpp",
  "patterns.cpp",
  "triple.cpp",
  "independent.cpp",
];
export async function readSample(name) {
  if (!sampleNames.includes(name)) return null;
  return {
    fileName: name,
    source: await readFile(path.join(rootDir, "samples", name), "utf8"),
  };
}
