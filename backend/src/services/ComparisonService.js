import path from "node:path";
import { writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import {
  createWorkspace,
  removeWorkspace,
} from "../infrastructure/JobWorkspace.js";
import {
  dockerStatus,
  runSandbox,
  removeContainer,
} from "../infrastructure/DockerRunner.js";
import { image } from "../config/limits.js";
import { comparisonResult } from "../models/ComparisonResult.js";
const hash = (source) => createHash("sha256").update(source).digest("hex");
export async function compareSources(original, optimized) {
  const docker = await dockerStatus();
  if (!docker.available) return { status: "unavailable", error: docker.reason };
  const { job, container } = await createWorkspace(original.source);
  try {
    await writeFile(path.join(job, "optimized.cpp"), optimized.source, {
      mode: 0o644,
    });
    const raw = await runSandbox(job, container, "compare");
    if (raw.sandboxError) throw new Error(raw.sandboxError);
    return {
      ...comparisonResult(raw),
      metadata: {
        image,
        imageId: docker.imageId,
        timestamp: new Date().toISOString(),
        files: {
          original: {
            fileName: original.fileName,
            sha256: hash(original.source),
          },
          optimized: {
            fileName: optimized.fileName,
            sha256: hash(optimized.source),
          },
        },
        order:
          "Alternating AB/BA; 1 warm-up per version, then 10 measured runs per version",
        timeoutSeconds: 2,
        totalBenchmarkBudgetSeconds: 25,
        compileTimeoutSeconds: 20,
        isolation:
          "non-root; network none; 256 MiB; 1 CPU; 64 PIDs; read-only root and inputs",
      },
    };
  } catch (error) {
    return { status: "error", error: error.message };
  } finally {
    await removeContainer(container);
    await removeWorkspace(job);
  }
}
