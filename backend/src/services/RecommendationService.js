export function addRuntimeRecommendations(result) {
  for (const region of result.hotspots) {
    if (
      region.measurement.status === "measured" &&
      !region.measurement.lowConfidence &&
      region.measurement.programRuntimePercent >= 20
    ) {
      result.recommendations.push({
        id: `RUNTIME-${region.id}`,
        regionId: region.id,
        severity: "review",
        pattern: "General runtime guidance",
        startLine: region.startLine,
        endLine: region.endLine,
        evidence:
          "This region accounts for at least 20% of measured program time using exclusive durations.",
        recommendation:
          "Prioritize algorithmic review and representative-input profiling here.",
        caveat:
          "General guidance, not a detected optimization pattern. One O0 run includes timer overhead and does not predict optimized production performance.",
      });
    }
  }
}
