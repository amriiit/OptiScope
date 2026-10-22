import { Router } from "express";
import multer from "multer";
import { MAX_FILE_SIZE } from "../config/limits.js";
import { localOrigin } from "../middleware/localOnly.js";
import { compare } from "../controllers/ComparisonController.js";
const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 2, fields: 0, parts: 2 },
});
router.post(
  "/compare",
  localOrigin,
  upload.fields([
    { name: "original", maxCount: 1 },
    { name: "optimized", maxCount: 1 },
  ]),
  compare,
);
export default router;
