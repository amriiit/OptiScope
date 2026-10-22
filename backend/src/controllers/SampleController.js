import {
  sampleNames,
  readSample,
  corpus,
  readCorpusSample,
} from "../services/SampleService.js";
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

export const corpusList = (_req, res) => res.json(corpus);
export async function corpusSample(req, res, next) {
  try {
    const value = await readCorpusSample(req.params.name);
    if (!value)
      return res.status(404).json({ error: "Corpus sample not found" });
    res.json(value);
  } catch (error) {
    next(error);
  }
}
