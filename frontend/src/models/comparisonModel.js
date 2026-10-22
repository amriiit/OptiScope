export function comparisonResponse(data) {
  if (!data || typeof data.status !== "string")
    throw new Error("Unexpected comparison response");
  if (
    data.status === "completed" &&
    (!data.statistics || data.equivalent !== true)
  )
    throw new Error("Incomplete comparison evidence");
  return data;
}
