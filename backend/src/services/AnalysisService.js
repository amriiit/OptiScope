import { baseResult } from "../models/AnalysisResult.js";
import {
  createWorkspace,
  removeWorkspace,
} from "../infrastructure/JobWorkspace.js";
import { parseInWorkspace } from "../infrastructure/FrontendRunner.js";
import { removeContainer } from "../infrastructure/DockerRunner.js";
import { profileInWorkspace } from "./ProfilingService.js";
export async function analyzeSource(
  fileName,
  source,
  profile = false,
  frontend = "auto",
) {
  const result = baseResult(fileName);
  const { job, container } = await createWorkspace(source);
  try {
    Object.assign(result, await parseInWorkspace(job, container, frontend));
    if (!result.success) {
      result.profiling.status = "analysis_failed";
      return result;
    }
    result.hotspots = result.regions.map((r) => ({ ...r }));
    if (!profile) return result;
    return await profileInWorkspace(result, job, container);
  } catch (error) {
    result.errors.push(error.message);
    if (result.success) {
      result.profiling.status = "error";
      result.profiling.measuredTotals = null;
      result.summary.totalMeasuredRuntimeMs = null;
      result.regions.forEach((r) => {
        r.measurement = null;
      });
      result.hotspots = result.regions.map((r) => ({ ...r }));
    } else result.profiling.status = "analysis_failed";
    return result;
  } finally {
    if (profile) await removeContainer(container);
    await removeWorkspace(job);
  }
}
