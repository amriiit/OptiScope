import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { analyzeSource, dockerStatus, image } from '../backend/src/services/analyzer.js';
import { execute } from '../backend/src/services/process.js';
import { invocationLabel } from '../frontend/src/components/regionPresentation.js';
const docker = await dockerStatus();
if (process.env.REQUIRE_DOCKER && !docker.available) throw new Error(docker.reason);
const options = { skip: !docker.available, timeout: 180000 };
async function baseline(source) {
  const dir = await mkdtemp(path.join(tmpdir(), 'optiscope-baseline-')); const name = `optiscope-test-${randomUUID()}`;
  try {
    await chmod(dir, 0o755); await writeFile(path.join(dir, 'instrumented.cpp'), source, { mode: 0o644 });
    const r = await execute('docker', ['run','--rm','--name',name,'--network','none','--user','65534:65534','--memory','256m','--memory-swap','256m','--cpus','1','--pids-limit','64','--cap-drop','ALL','--security-opt','no-new-privileges','--read-only','--tmpfs','/work:rw,exec,nosuid,size=96m,mode=1777','--tmpfs','/tmp:rw,noexec,nosuid,size=16m,mode=1777','--mount',`type=bind,src=${dir},dst=/input,readonly`,image], { timeout: 35000 });
    assert.equal(r.code, 0, r.stderr); return JSON.parse(r.stdout);
  } finally { await execute('docker', ['rm','-f',name]).catch(()=>{}); await rm(dir, { recursive:true, force:true }); }
}
test('all sample programs really compile/run; baseline stdout matches instrumented stdout and runtime invariants', options, async () => {
  for (const file of ['linear.cpp','nested.cpp','sequential.cpp','logarithmic.cpp','mixed_hotspots.cpp','patterns.cpp']) {
    const source = await readFile(`samples/${file}`, 'utf8');
    const original = await baseline(source); assert.equal(original.compilation.exitCode, 0, original.compilation.stderr); assert.equal(original.execution.exitCode, 0);
    const r = await analyzeSource(file, source, true); assert.equal(r.profiling.status, 'completed', JSON.stringify(r.errors));
    assert.equal(r.profiling.metadata.execution.stdout, original.execution.stdout, file);
    assert.ok(r.profiling.measuredTotals.programRuntimeMs > 0); let total = 0;
    for (const h of r.hotspots) { assert.equal(h.measurement.status, 'measured'); assert.ok(h.measurement.calls > 0); assert.ok(h.measurement.inclusiveNs >= h.measurement.exclusiveNs); total += h.measurement.exclusiveNs; }
    assert.ok(total <= r.profiling.measuredTotals.programRuntimeNs);
    for (let i=1;i<r.hotspots.length;i++) assert.ok(r.hotspots[i-1].measurement.exclusiveNs >= r.hotspots[i].measurement.exclusiveNs);
    if (file === 'nested.cpp') {
      const [outer, inner] = r.regions.map(region => region.measurement);
      assert.equal(outer.calls, 1); assert.equal(inner.calls, 1200);
      assert.equal(invocationLabel(outer), '1'); assert.equal(invocationLabel(inner), '1,200');
      assert.equal(outer.inclusiveNs - outer.exclusiveNs, inner.inclusiveNs, 'Parent excludes the aggregated child intervals exactly');
    }
    if (file === 'mixed_hotspots.cpp') { const cubic = r.regions.find(x=>x.estimatedComplexity==='O(small^3)'), quadratic=r.regions.find(x=>x.estimatedComplexity==='O(large^2)'); assert.ok(quadratic.measurement.inclusiveNs > cubic.measurement.inclusiveNs); assert.ok(r.hotspots[0].startLine >= quadratic.startLine); }
    console.log(`${file}: ${r.profiling.metadata.execution.stdout.trim()} | main ${r.summary.totalMeasuredRuntimeMs.toFixed(3)} ms; top ${r.hotspots[0].id}`);
  }
});
test('nested unbraced loops, dangling else and early returns retain observable semantics', options, async () => {
  const source='// λ byte offsets\n#include <cstdio>\nint main(){int n=9;int s=0;if(n>0)for(int i=0;i<n;i++)for(int j=0;j<n;j++)s+=i+j;else s=90;printf("%d\\n",s);return 0;}';
  const original = await baseline(source), r = await analyzeSource('semantics.cpp',source,true);
  assert.equal(r.profiling.status,'completed',JSON.stringify(r.errors)); assert.equal(r.profiling.metadata.execution.stdout, original.execution.stdout);
  const early = await analyzeSource('early.cpp','int main(){for(int i=0;i<20;i++){for(int j=0;j<5;j++){return 0;}}return 0;}',true);
  assert.equal(early.profiling.status,'completed'); assert.equal(early.regions[0].measurement.calls,1); assert.equal(early.regions[1].measurement.calls,1);
});
test('compile errors, runtime failure, timeouts, output caps, and unexecuted regions are honest', options, async () => {
  const compile = await analyzeSource('invalid.cpp','int main(){int x=unknown;return 0;}',true); assert.equal(compile.profiling.status,'compile_error'); assert.equal(compile.summary.totalMeasuredRuntimeMs,null); assert.ok(compile.profiling.metadata.compilation.stderr);
  const nonzero = await analyzeSource('exit.cpp','int main(){return 3;}',true); assert.equal(nonzero.profiling.status,'runtime_error'); assert.equal(nonzero.profiling.metadata.execution.exitCode,3); assert.equal(nonzero.summary.totalMeasuredRuntimeMs,null);
  const timeout = await analyzeSource('timeout.cpp','int main(){while(true){}return 0;}',true); assert.equal(timeout.profiling.status,'timeout'); assert.equal(timeout.summary.totalMeasuredRuntimeMs,null);
  const output = await analyzeSource('output.cpp','#include <cstdio>\nint main(){while(true){printf("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\\n");}return 0;}',true); assert.equal(output.profiling.status,'output_limit');
  const empty = await analyzeSource('unexecuted.cpp','int main(){for(int i=0;i<0;i++){}if(false){while(true){}}return 0;}',true); assert.equal(empty.profiling.status,'completed'); assert.equal(empty.regions[0].measurement.status,'measured'); assert.equal(empty.regions[1].measurement.status,'unexecuted'); assert.equal(empty.regions[0].measurement.calls,1); assert.equal(invocationLabel(empty.regions[1].measurement),'Not executed');
});
test('missing Docker or image preserves static data without measurements', async () => {
  if (docker.available) return;
  const r=await analyzeSource('demo.cpp',await readFile('samples/nested.cpp','utf8'),true);
  assert.equal(r.success,true); assert.equal(r.profiling.status,'unavailable'); assert.equal(r.summary.totalMeasuredRuntimeMs,null); assert.equal(r.summary.worstEstimatedComplexity,'O(n^2)');
});
test('real missing-image failure retains static results without any runtime fabrication', {timeout: 15000}, async () => {
  const source=await readFile('samples/nested.cpp','utf8');
  const script=`process.env.OPTISCOPE_IMAGE='optiscope-deliberately-missing:${randomUUID()}';const m=await import('./backend/src/services/analyzer.js');console.log(JSON.stringify(await m.analyzeSource('nested.cpp',${JSON.stringify(source)},true)));`;
  const child=await execute(process.execPath,['--input-type=module','-e',script],{timeout:12000});
  assert.equal(child.code,0,child.stderr); const r=JSON.parse(child.stdout);
  assert.equal(r.success,true); assert.equal(r.profiling.status,'unavailable'); assert.equal(r.summary.worstEstimatedComplexity,'O(n^2)'); assert.equal(r.summary.totalMeasuredRuntimeMs,null); assert.ok(r.regions.every(region=>region.measurement===null));
});
