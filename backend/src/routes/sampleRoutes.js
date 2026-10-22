import { Router } from "express";
import { samples, sample } from "../controllers/SampleController.js";
const router = Router();
router.get("/samples", samples);
router.get("/samples/:name", sample);
export default router;
