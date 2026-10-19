import express from 'express';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { api } from './routes/api.js';
import { rootDir, baseResult } from './services/analyzer.js';
export const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  if (!['localhost', '127.0.0.1', '[::1]'].includes((req.hostname || '').toLowerCase())) return res.status(403).json({ error: 'Local requests only' });
  next();
});
app.use('/api', api);
app.use(express.static(path.join(rootDir, 'frontend/dist')));
app.get('*', (req, res, next) => { if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'API route not found' }); res.sendFile(path.join(rootDir, 'frontend/dist/index.html'), error => { if (error) next(error); }); });
app.use((error, _req, res, _next) => res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ ...baseResult(''), errors: [error.code === 'LIMIT_FILE_SIZE' ? 'File exceeds 128 KiB limit.' : error.message] }));
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = app.listen(Number(process.env.PORT || 3001), '127.0.0.1', () => console.log('OptiScope API listening at http://127.0.0.1:' + server.address().port));
  server.requestTimeout = 45000;
}
