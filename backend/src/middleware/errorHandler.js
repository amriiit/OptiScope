import { baseResult } from "../models/AnalysisResult.js";
export function errorHandler(error, _req, res, _next) {
  const oversized = error.code === "LIMIT_FILE_SIZE";
  res.status(oversized ? 413 : 400).json({
    ...baseResult(""),
    errors: [oversized ? "File exceeds 128 KiB limit." : error.message],
  });
}
