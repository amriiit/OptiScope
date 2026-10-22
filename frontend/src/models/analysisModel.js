export function analysisResponse(data) {
  if (
    !data ||
    !data.profiling ||
    !Array.isArray(data.regions) ||
    !Array.isArray(data.hotspots)
  )
    throw new Error("Unexpected API response");
  return data;
}
export function summaryCards(result, formatMs) {
  const summary = result?.summary;
  return [
    ["Functions", summary?.functionsDetected],
    ["Loop regions", summary?.loopsDetected],
    ["Max loop depth", summary?.maxNestingDepth],
    ["Overall structural estimate", summary?.worstEstimatedComplexity],
    ["Measured main time", formatMs(summary?.totalMeasuredRuntimeMs)],
  ];
}
