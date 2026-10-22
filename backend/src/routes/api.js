import comparison from "./comparisonRoutes.js";
import { Router } from "express";
import analysis from "./analysisRoutes.js";
import health from "./healthRoutes.js";
import samples from "./sampleRoutes.js";
export const api = Router();
api.use(health, samples, analysis, comparison);
