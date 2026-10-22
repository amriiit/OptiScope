import path from "node:path";
import { writeFile } from "node:fs/promises";
import { analyzeInWorkspace } from "./EngineRunner.js";
import { dockerStatus, runSandbox, removeContainer } from "./DockerRunner.js";
import { validateRegions } from "../models/ProgramRegion.js";
export const frontendModes = ["auto", "legacy", "clang"];
export async function parseInWorkspace(job, container, mode = "auto") {
  if (!frontendModes.includes(mode))
    throw new Error("Frontend must be auto, legacy or clang.");
  let legacy;
  if (mode !== "clang") {
    legacy = await analyzeInWorkspace(job);
    if (mode === "legacy" || legacy.success) return legacy;
  }
  const available = await dockerStatus();
  if (!available.available)
    return {
      success: false,
      errors: [
        available.reason +
          " C++17 parsing requires the Clang sandbox. Select Legacy academic mode for offline subset analysis.",
      ],
      frontend: { name: "clang", status: "unavailable" },
    };
  const parserContainer = container + "-parse";
  try {
    const response = await runSandbox(job, parserContainer, "clang");
    if (response.sandboxError) throw new Error(response.sandboxError);
    const result = response.analysis;
    if (!result)
      throw new Error(
        "Clang sandbox returned no analysis result. Rebuild the sandbox image.",
      );
    if (result.success) {
      validateRegions(result.regions);
      if (typeof response.instrumentedSource !== "string")
        throw new Error("Clang returned no instrumentation artifact.");
      await writeFile(
        path.join(job, "instrumented.cpp"),
        response.instrumentedSource,
        { mode: 0o644 },
      );
    }
    return result;
  } finally {
    await removeContainer(parserContainer);
  }
}
