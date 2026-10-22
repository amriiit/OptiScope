import { dockerStatus, runSandbox } from "../infrastructure/DockerRunner.js";
import { image } from "../config/limits.js";
import { mergeMeasurements } from "./HotspotService.js";
export async function profileInWorkspace(result, job, container) {
  if (!result.hasMain) {
    result.profiling.status = "static_only";
    result.errors.push("Profiling requires a supported main() definition.");
    return result;
  }
  const localFunctions = new Set(
    result.ast.children
      .filter((n) => n.type === "FunctionDecl")
      .map((n) => n.text.split(" ").at(-1)),
  );
  const unsupportedCalls = new Set();
  const pending = [result.ast];
  while (pending.length) {
    const node = pending.pop();
    if (
      node.type === "CallExpr" &&
      node.text !== "printf" &&
      !localFunctions.has(node.text)
    )
      unsupportedCalls.add(node.text);
    pending.push(...node.children);
  }
  if (unsupportedCalls.size && result.frontend?.name !== "clang") {
    result.profiling.status = "unsupported";
    result.errors.push(
      `Profiling supports local functions and printf only. Unsupported external calls: ${[...unsupportedCalls].join(", ")}. Static analysis remains available.`,
    );
    return result;
  }
  if (result.profilingUnsupportedReasons?.length) {
    result.profiling.status = "unsupported";
    result.errors.push(...result.profilingUnsupportedReasons);
    return result;
  }
  const docker = await dockerStatus();
  if (!docker.available) {
    result.profiling.status = "unavailable";
    result.errors.push(docker.reason);
    return result;
  }
  const sandbox = await runSandbox(job, container);
  result.profiling.metadata = {
    image,
    compiler: "g++ -std=c++17 -O0",
    clock: "std::chrono::steady_clock",
    denominator: "main() wall time, including instrumentation overhead",
    compilation: sandbox.compilation,
    execution: sandbox.execution,
    timeoutSeconds: 5,
    singleThreaded: true,
  };
  if (sandbox.sandboxError) throw new Error(sandbox.sandboxError);
  if (
    sandbox.compilation?.exitCode !== 0 ||
    sandbox.compilation?.status !== "completed"
  ) {
    result.profiling.status =
      sandbox.compilation?.status === "timeout"
        ? "compile_timeout"
        : "compile_error";
    result.errors.push(
      sandbox.compilation?.stderr ||
        "Compilation failed or exceeded output/time limits.",
    );
    return result;
  }
  if (
    sandbox.execution?.status !== "completed" ||
    sandbox.execution?.exitCode !== 0
  ) {
    result.profiling.status =
      sandbox.execution?.status === "timeout"
        ? "timeout"
        : sandbox.execution?.status === "output_limit"
          ? "output_limit"
          : "runtime_error";
    result.errors.push(
      `Program ${result.profiling.status}; exit status ${sandbox.execution?.exitCode}. ${sandbox.execution?.stderr || ""}`,
    );
    return result;
  }
  mergeMeasurements(result, sandbox.profile);
  result.profiling.status = "completed";
  return result;
}
