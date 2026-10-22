import { sourceUpload } from "../models/SourceUpload.js";
import { compareSources } from "../services/ComparisonService.js";
import { withJob, busyResponse } from "../middleware/jobLimiter.js";
export async function compare(req, res, next) {
  let original, optimized;
  try {
    original = sourceUpload(req.files?.original?.[0]);
    optimized = sourceUpload(req.files?.optimized?.[0]);
  } catch (error) {
    return res
      .status(400)
      .json({ status: "invalid_input", error: error.message });
  }
  try {
    const result = await withJob(original.fileName, () =>
      compareSources(original, optimized),
    );
    if (!result) return busyResponse(res, original.fileName);
    res
      .status(
        result.status === "completed" || result.status === "not_equivalent"
          ? 200
          : 422,
      )
      .json(result);
  } catch (error) {
    next(error);
  }
}
