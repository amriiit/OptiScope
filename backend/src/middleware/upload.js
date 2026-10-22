import multer from "multer";
import { MAX_FILE_SIZE } from "../config/limits.js";
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1, fields: 0, parts: 1 },
});
