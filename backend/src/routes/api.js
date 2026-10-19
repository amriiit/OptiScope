import express from 'express';
import multer from 'multer';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { analyzeSource, dockerStatus, rootDir, baseResult } from '../services/analyzer.js';
export const api = express.Router();
const names = ['linear.cpp', 'nested.cpp', 'sequential.cpp', 'logarithmic.cpp', 'mixed_hotspots.cpp', 'patterns.cpp'];
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 128 * 1024, files: 1, fields: 0, parts: 1 } });
api.get('/health', async (_req, res) => res.json({ status: 'ok', docker: await dockerStatus(), maxFileSize: 128 * 1024 }));
api.get('/samples', (_req, res) => res.json(names));
api.get('/samples/:name', async (req, res, next) => {
  if (!names.includes(req.params.name)) return res.status(404).json({ error: 'Sample not found' });
  try { res.json({ fileName: req.params.name, source: await readFile(path.join(rootDir, 'samples', req.params.name), 'utf8') }); } catch (e) { next(e); }
});
let active = 0;
for (const operation of ['analyze', 'profile']) api.post(`/${operation}`, (req, res, next) => {
  if (req.get('origin') && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.get('origin'))) return res.status(403).json({ error: 'Local origin required' });
  next();
}, upload.single('file'), async (req, res, next) => {
  if (!req.file || !/\.cpp$/i.test(req.file.originalname)) return res.status(400).json({ ...baseResult(req.file?.originalname || ''), errors: ['Upload one .cpp file in multipart field "file" (maximum 128 KiB).'] });
  if (!req.file.size || req.file.buffer.includes(0)) return res.status(400).json({ ...baseResult(req.file.originalname), errors: ['Source must be nonempty UTF-8 text without NUL bytes.'] });
  let source;
  try { source = new TextDecoder('utf-8', { fatal: true }).decode(req.file.buffer); } catch { return res.status(400).json({ ...baseResult(req.file.originalname), errors: ['Source must be valid UTF-8.'] }); }
  if (active >= 2) return res.status(429).json({ ...baseResult(req.file.originalname), errors: ['Two jobs are already running. Retry shortly.'] });
  active++;
  try { const result = await analyzeSource(path.basename(req.file.originalname), source, operation === 'profile'); res.status(result.success ? 200 : 422).json(result); } catch (e) { next(e); } finally { active--; }
});
