import { spawn } from "node:child_process";
export function execute(
  command,
  args,
  { timeout = 10000, limit = 8 * 1024 * 1024, cwd } = {},
) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "",
      stderr = "",
      bytes = 0,
      failure;
    const timer = setTimeout(() => {
      failure = new Error(`${command} timed out after ${timeout / 1000}s`);
      child.kill("SIGKILL");
    }, timeout);
    const collect = (key) => (chunk) => {
      bytes += chunk.length;
      if (bytes > limit) {
        failure = new Error(`${command} exceeded its output limit`);
        child.kill("SIGKILL");
        return;
      }
      if (key === "stdout") stdout += chunk;
      else stderr += chunk;
    };
    child.stdout.on("data", collect("stdout"));
    child.stderr.on("data", collect("stderr"));
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (failure) reject(failure);
      else resolve({ code, stdout, stderr });
    });
  });
}
