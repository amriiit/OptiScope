import { frontendModes } from "../infrastructure/FrontendRunner.js";
import { sourceUpload } from "../models/SourceUpload.js";
import { baseResult } from "../models/AnalysisResult.js";
import { analyzeSource } from "../services/AnalysisService.js";
import { withJob, busyResponse } from "../middleware/jobLimiter.js";
export function analysisAction(profile = false) {
  return async (req, res, next) => {
    const frontend = req.query.frontend || "auto";
    if (!frontendModes.includes(frontend))
      return res
        .status(400)
        .json({
          ...baseResult(""),
          errors: ["Frontend must be auto, legacy or clang."],
        });
    let input;
    try {
      input = sourceUpload(req.file);
    } catch (error) {
      return res.status(400).json({
        ...baseResult(req.file?.originalname || ""),
        errors: [error.message],
      });
    }
    try {
      const result = await withJob(input.fileName, () =>
        analyzeSource(input.fileName, input.source, profile, frontend),
      );
      if (!result) return busyResponse(res, input.fileName);
      return res.status(result.success ? 200 : 422).json(result);
    } catch (error) {
      next(error);
    }
  };
}
export const analyze = analysisAction();
export const profile = analysisAction(true);
