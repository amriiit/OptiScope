import { MAX_ACTIVE_JOBS } from "../config/limits.js";
import { baseResult } from "../models/AnalysisResult.js";
let active = 0;
export async function withJob(fileName, task) {
  if (active >= MAX_ACTIVE_JOBS) return null;
  active++;
  try {
    return await task();
  } finally {
    active--;
  }
}
export function busyResponse(res, fileName) {
  return res.status(429).json({
    ...baseResult(fileName),
    errors: ["Two jobs are already running. Retry shortly."],
  });
}
