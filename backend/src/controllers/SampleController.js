import { sampleNames, readSample } from "../services/SampleService.js";
export const samples = (_req, res) => res.json(sampleNames);
export async function sample(req, res, next) {
  try {
    const value = await readSample(req.params.name);
    if (!value) return res.status(404).json({ error: "Sample not found" });
    res.json(value);
  } catch (error) {
    next(error);
  }
}
