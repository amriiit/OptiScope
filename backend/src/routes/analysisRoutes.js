import { Router } from "express";
import { analyze, profile } from "../controllers/AnalysisController.js";
import { localOrigin } from "../middleware/localOnly.js";
import { upload } from "../middleware/upload.js";
const router = Router();
router.post("/analyze", localOrigin, upload.single("file"), analyze);
router.post("/profile", localOrigin, upload.single("file"), profile);
export default router;
