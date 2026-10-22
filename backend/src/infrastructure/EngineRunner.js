import { validateRegions } from "../models/ProgramRegion.js";
import path from "node:path";
import { access } from "node:fs/promises";
import { rootDir } from "../config/limits.js";
import { execute } from "./ProcessRunner.js";
export async function analyzeInWorkspace(job) {
  const engine = path.join(rootDir, "engine/build/optiscope");
  try {
    await access(engine);
  } catch {
    throw new Error("Analysis engine is missing. Run npm run engine:build.");
  }
  const parsed = await execute(engine, [
    path.join(job, "original.cpp"),
    path.join(job, "instrumented.cpp"),
  ]);
  if (parsed.code !== 0)
    throw new Error(
      `Analysis engine failed: ${parsed.stderr || `exit ${parsed.code}`}`,
    );
  const result = JSON.parse(parsed.stdout);
  if (result.success) validateRegions(result.regions);
  return result;
}
