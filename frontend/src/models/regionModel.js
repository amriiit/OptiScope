// Presentation only: reuse analyzer estimates and measured counts without inferring new costs.
export const LOCAL_COMPLEXITY_LABEL = "Local complexity";
export const INVOCATION_NOTE =
  "Invocations count entries into the whole loop region, not loop-body iterations. Timings aggregate all invocations.";
export const COMPLEXITY_NOTE =
  "Local complexity estimates one invocation of a region, including its contained work. Enclosing-region estimates account for repeated nested work; sequential regions combine by dominant-term addition.";

export function regionPath(ast, regionId) {
  if (!ast || !regionId) return [];
  if (ast.regionId === regionId) return [ast];
  for (const child of ast.children || []) {
    const path = regionPath(child, regionId);
    if (path.length) return [ast, ...path];
  }
  return [];
}

export function enclosingRegions(result, selectedId) {
  const ancestors = regionPath(result?.ast, selectedId).slice(0, -1);
  return ancestors
    .filter((node) => node.regionId)
    .map((node) => result.regions.find((r) => r.id === node.regionId))
    .filter(Boolean);
}

export function invocationLabel(measurement) {
  if (measurement?.status === "unsupported") return "Not instrumented";
  if (measurement?.status === "unexecuted") return "Not executed";
  if (
    measurement?.status !== "measured" ||
    !Number.isSafeInteger(measurement.calls)
  )
    return "—";
  return measurement.calls.toLocaleString("en-US");
}

export function initiallyExpanded(node) {
  return ["Program", "FunctionDecl", "Block"].includes(node.type);
}
