import { dockerStatus } from "../infrastructure/DockerRunner.js";
import { MAX_FILE_SIZE } from "../config/limits.js";
export async function health(_req, res, next) {
  try {
    res.json({
      status: "ok",
      docker: await dockerStatus(),
      maxFileSize: MAX_FILE_SIZE,
    });
  } catch (error) {
    next(error);
  }
}
