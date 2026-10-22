import { parseProfile } from "../models/ProfileRecord.js";
import { addRuntimeRecommendations } from "./RecommendationService.js";
export function mergeMeasurements(result, raw) {
  const { totalNs, records } = parseProfile(raw, result.regions);
  let exclusiveSum = 0;
  result.regions = result.regions.map((region) => {
    const measurement =
      records.get(region.id) ||
      (region.instrumentation?.supported === false
        ? { status: "unsupported", reason: region.instrumentation.reason }
        : { status: "unexecuted" });
    exclusiveSum += measurement.exclusiveNs || 0;
    return { ...region, measurement };
  });
  if (exclusiveSum > totalNs)
    throw new Error("Region exclusive time exceeds program runtime.");
  result.summary.totalMeasuredRuntimeMs = totalNs / 1e6;
  result.profiling.measuredTotals = {
    programRuntimeMs: totalNs / 1e6,
    programRuntimeNs: totalNs,
    regionExclusiveMs: exclusiveSum / 1e6,
    uninstrumentedAndOverheadMs: (totalNs - exclusiveSum) / 1e6,
  };
  result.hotspots = [...result.regions].sort(
    (a, b) =>
      (b.measurement.exclusiveNs ?? -1) - (a.measurement.exclusiveNs ?? -1),
  );
  addRuntimeRecommendations(result);
  result.warnings.push(
    "One instrumented O0 run, not a benchmark. Exclusive percentages use main() wall time. Timers include overhead; aggregate durations under 0.1 ms or mean exclusive durations under 1 µs per invocation are flagged low confidence. Nested timers can noticeably distort tight loops.",
  );
  result.warnings.push(
    "Deterministic single-threaded programs returning normally from main are supported. Profile files are program-controlled data; deliberate tampering is outside the prototype measurement model.",
  );
}
