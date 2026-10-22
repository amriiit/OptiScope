import { Router } from "express";
import {
  samples,
  sample,
  corpusList,
  corpusSample,
} from "../controllers/SampleController.js";
const router = Router();
router.get("/samples", samples);
router.get("/samples/:name", sample);
router.get("/corpus", corpusList);
router.get("/corpus/:name", corpusSample);
export default router;
