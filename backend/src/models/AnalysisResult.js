export function baseResult(fileName) {
  return {
    fileName,
    success: false,
    warnings: [],
    errors: [],
    summary: null,
    ast: null,
    regions: [],
    hotspots: [],
    recommendations: [],
    profiling: { status: "not_run", metadata: null, measuredTotals: null },
  };
}
