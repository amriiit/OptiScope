export function statistics(values) {
  if (
    !values.length ||
    values.some((value) => !Number.isFinite(value) || value <= 0)
  )
    throw new Error("Invalid benchmark timings");
  const sorted = [...values].sort((a, b) => a - b),
    n = sorted.length;
  const meanMs = values.reduce((sum, value) => sum + value, 0) / n;
  return {
    timingsMs: values,
    runCount: n,
    meanMs,
    medianMs:
      n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2,
    minMs: sorted[0],
    maxMs: sorted[n - 1],
    standardDeviationMs: Math.sqrt(
      values.reduce((sum, value) => sum + (value - meanMs) ** 2, 0) / n,
    ),
  };
}
export function comparisonResult(raw) {
  const result = {
    ...raw,
    speedup: null,
    runtimeReductionPercent: null,
    statistics: null,
    analysisMode: "execution_only",
    warnings: [
      "No Flex/Bison analysis is performed in comparison mode. Equality is checked only for these fixed internal inputs, stdout, stderr and exit status; filesystem effects and universal equivalence are not verified.",
      "Uninstrumented -O2 process wall times include startup and capture overhead. Shared Docker hardware is noisy; a single session does not establish a reproducible improvement.",
    ],
  };
  if (raw.status !== "completed" || raw.equivalent !== true) return result;
  const original = statistics(raw.runs.original.map((run) => run.elapsedMs));
  const optimized = statistics(raw.runs.optimized.map((run) => run.elapsedMs));
  result.statistics = { original, optimized };
  result.speedup = original.medianMs / optimized.medianMs;
  result.runtimeReductionPercent =
    ((original.medianMs - optimized.medianMs) / original.medianMs) * 100;
  if (Math.min(original.medianMs, optimized.medianMs) < 10)
    result.warnings.push(
      "Short execution: process startup and timing overhead can dominate. Increase the workload before interpreting the ratio.",
    );
  if ([original, optimized].some((s) => s.standardDeviationMs / s.meanMs > 0.1))
    result.warnings.push(
      "High variation: repeat this experiment with a longer workload and idle machine.",
    );
  return result;
}
