async function request(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (
    !response.ok &&
    !data.profiling &&
    !(
      url === "/api/compare" &&
      response.status === 422 &&
      typeof data.status === "string"
    )
  )
    throw new Error(
      data.error ||
        data.errors?.join(" ") ||
        `Request failed (${response.status})`,
    );
  return data;
}
export const getHealth = () => request("/api/health");
export const getSamples = () => request("/api/samples");
export const getSample = (name) =>
  request(`/api/samples/${encodeURIComponent(name)}`);
export function analyzeSource(source, fileName, operation, frontend = "auto") {
  if (!["analyze", "profile"].includes(operation))
    throw new Error("Unknown analysis operation");
  const body = new FormData();
  body.append("file", new File([source], fileName, { type: "text/plain" }));
  if (!["auto", "legacy", "clang"].includes(frontend))
    throw new Error("Invalid compiler frontend");
  return request(
    `/api/${operation}${frontend === "auto" ? "" : `?frontend=${frontend}`}`,
    { method: "POST", body },
  );
}
export function compareSources(original, optimized) {
  const body = new FormData();
  body.append("original", original);
  body.append("optimized", optimized);
  return request("/api/compare", { method: "POST", body });
}
