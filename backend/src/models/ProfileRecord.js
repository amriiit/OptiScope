export function parseProfile(raw, regions) {
  const rows = (raw || "").trim().split("\n");
  const totalMatch = /^total (\d+)$/.exec(rows.shift() || "");
  if (!totalMatch)
    throw new Error(
      "Program did not produce a valid total runtime record. No measurements reported.",
    );
  const totalNs = Number(totalMatch[1]);
  if (!Number.isSafeInteger(totalNs) || totalNs <= 0)
    throw new Error("Invalid measured total.");
  const records = new Map();
  for (const row of rows) {
    const match = /^(R\d+) (\d+) (\d+) (\d+)$/.exec(row);
    if (
      !match ||
      records.has(match[1]) ||
      !regions.some((r) => r.id === match[1])
    )
      throw new Error("Invalid or duplicate profiler record.");
    const [inclusiveNs, exclusiveNs, calls] = match.slice(2).map(Number);
    if (
      ![inclusiveNs, exclusiveNs, calls].every(Number.isSafeInteger) ||
      inclusiveNs < exclusiveNs ||
      exclusiveNs > totalNs ||
      calls < 1
    )
      throw new Error("Inconsistent profiler measurement.");
    records.set(match[1], {
      status: "measured",
      inclusiveNs,
      exclusiveNs,
      calls,
      inclusiveMs: inclusiveNs / 1e6,
      exclusiveMs: exclusiveNs / 1e6,
      programRuntimePercent: (exclusiveNs / totalNs) * 100,
      lowConfidence: exclusiveNs < 100000 || exclusiveNs / calls < 1000,
      confidenceReason:
        exclusiveNs < 100000
          ? "Aggregate exclusive time below 0.1 ms"
          : exclusiveNs / calls < 1000
            ? "Mean exclusive time below 1 µs per invocation"
            : null,
    });
  }
  return { totalNs, records };
}
