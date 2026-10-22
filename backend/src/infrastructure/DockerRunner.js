import { execute } from "./ProcessRunner.js";
import { image } from "../config/limits.js";
export async function dockerStatus() {
  try {
    const daemon = await execute(
      "docker",
      ["info", "--format", "{{.ServerVersion}}"],
      { timeout: 4000, limit: 65536 },
    );
    if (daemon.code !== 0)
      return {
        available: false,
        reason: "Docker daemon is unavailable. Start Docker Desktop and retry.",
      };
    const inspected = await execute(
      "docker",
      ["image", "inspect", image, "--format", "{{.Id}}"],
      { timeout: 4000, limit: 65536 },
    );
    if (inspected.code !== 0)
      return {
        available: false,
        reason: "Sandbox image is missing. Run npm run sandbox:build.",
      };
    return { available: true, image, imageId: inspected.stdout.trim() };
  } catch {
    return {
      available: false,
      reason:
        "Docker is unavailable. Install/start Docker Desktop, then run npm run sandbox:build.",
    };
  }
}
export async function runSandbox(job, container, mode = "profile") {
  if (!["profile", "compare", "clang"].includes(mode))
    throw new Error("Unknown sandbox operation");
  const run = await execute(
    "docker",
    [
      "run",
      "--rm",
      "--name",
      container,
      "--network",
      "none",
      "--user",
      "65534:65534",
      "--memory",
      "256m",
      "--memory-swap",
      "256m",
      "--cpus",
      "1",
      "--pids-limit",
      "64",
      "--cap-drop",
      "ALL",
      "--security-opt",
      "no-new-privileges",
      "--read-only",
      "--ulimit",
      "nofile=128:128",
      "--ulimit",
      "fsize=67108864:67108864",
      "--tmpfs",
      "/work:rw,exec,nosuid,size=96m,mode=1777",
      "--tmpfs",
      "/tmp:rw,noexec,nosuid,size=16m,mode=1777",
      "--mount",
      `type=bind,src=${job},dst=/input,readonly`,
      image,
      ...(mode === "profile" ? [] : [mode]),
    ],
    {
      timeout: mode === "compare" ? 75000 : 35000,
      limit: mode === "clang" ? 16 * 1024 * 1024 : 512 * 1024,
    },
  );
  if (run.code !== 0)
    throw new Error(
      `Docker sandbox failed: ${run.stderr || `exit ${run.code}`}`,
    );
  return JSON.parse(run.stdout);
}
export async function removeContainer(container) {
  await execute("docker", ["rm", "-f", container], {
    timeout: 4000,
    limit: 65536,
  }).catch(() => {});
}
