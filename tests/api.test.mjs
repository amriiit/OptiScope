import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { app } from '../backend/src/server.js';
let server, base;
before(async () => { server = await new Promise((resolve, reject) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); s.on('error', reject); }); base = `http://127.0.0.1:${server.address().port}/api`; });
after(() => server ? new Promise(resolve => server.close(resolve)) : undefined);
async function post(file, name = 'demo.cpp', route = 'analyze', options = {}) { const data = new FormData(); if (file != null) data.append('file', new Blob([file]), name); return fetch(`${base}/${route}`, { method: 'POST', body: data, ...options }); }
test('API analyzes actual uploaded file with complete contract and no fabricated times', async () => {
  const response = await post(await readFile('samples/nested.cpp')); assert.equal(response.status, 200);
  const r = await response.json(); for (const key of ['fileName','success','warnings','errors','summary','ast','regions','hotspots','recommendations','profiling']) assert.ok(key in r, key);
  assert.equal(r.summary.worstEstimatedComplexity, 'O(n^2)'); assert.equal(r.profiling.status, 'not_run'); assert.equal(r.summary.totalMeasuredRuntimeMs, null);
  assert.ok(r.regions.every(x => x.measurement === null));
});
test('API serves real samples and rejects traversal, wrong extension, oversized and invalid uploads', async () => {
  const list = await (await fetch(`${base}/samples`)).json(); assert.ok(list.includes('mixed_hotspots.cpp'));
  const sample = await (await fetch(`${base}/samples/sequential.cpp`)).json(); assert.equal(sample.source, await readFile('samples/sequential.cpp', 'utf8'));
  assert.equal((await fetch(`${base}/samples/not-a-sample.cpp`)).status, 404);
  assert.equal((await post('int main(){}', 'bad.txt')).status, 400);
  assert.equal((await post(null)).status, 400);
  assert.equal((await post('')).status, 400);
  assert.equal((await post('x'.repeat(128 * 1024 + 1))).status, 413);
  assert.equal((await post('int main(){@;}')).status, 422);
  assert.equal((await post('int main(){}', 'x.cpp', 'analyze', { headers: { Origin: 'https://evil.example' } })).status, 403);
});
test('absent main is static-only even when profiling requested', async () => {
  const r = await (await post('int add(int x){return x+1;}', 'x.cpp', 'profile')).json(); assert.equal(r.success, true); assert.equal(r.profiling.status, 'static_only'); assert.equal(r.summary.totalMeasuredRuntimeMs, null);
});
test('POST /profile completes the actual multipart-upload Docker pipeline for acceptance samples', {timeout: 45000}, async t => {
  const health = await (await fetch(`${base}/health`)).json();
  if (!health.docker.available) { if (process.env.REQUIRE_DOCKER) assert.fail(health.docker.reason); t.skip(health.docker.reason); return; }
  for (const file of ['nested.cpp','sequential.cpp','mixed_hotspots.cpp']) {
    const response = await post(await readFile(`samples/${file}`), file, 'profile');
    assert.equal(response.status,200); const r=await response.json();
    assert.equal(r.profiling.status,'completed',JSON.stringify(r.errors));
    assert.ok(r.summary.totalMeasuredRuntimeMs > 0);
    assert.ok(r.profiling.metadata.execution.stdout.length > 0);
    assert.ok(r.hotspots.every(h=>r.regions.some(region=>h.id===region.id)));
    assert.ok(r.recommendations.some(rec=>rec.pattern==='General runtime guidance'));
  }
});
test('runtime subset rejects unknown external calls without executing them', async () => {
  const r=await (await post('#include <cstdlib>\nint main(){system("echo should-not-run");return 0;}', 'external.cpp','profile')).json();
  assert.equal(r.success,true); assert.equal(r.profiling.status,'unsupported'); assert.equal(r.profiling.metadata,null); assert.equal(r.summary.totalMeasuredRuntimeMs,null);
  assert.ok(r.errors.some(e=>e.includes('system')));
});
