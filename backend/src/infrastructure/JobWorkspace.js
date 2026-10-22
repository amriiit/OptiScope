import { mkdtemp, chmod, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
export async function createWorkspace(source) {
  const job = await mkdtemp(path.join(tmpdir(), "optiscope-"));
  try {
    await chmod(job, 0o755);
    await writeFile(path.join(job, "original.cpp"), source, { mode: 0o644 });
    return { job, container: `optiscope-${randomUUID()}` };
  } catch (error) {
    await removeWorkspace(job);
    throw error;
  }
}
export const removeWorkspace = (job) =>
  rm(job, { recursive: true, force: true });
