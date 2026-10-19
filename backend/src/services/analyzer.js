import { mkdtemp, writeFile, rm, chmod, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { execute } from './process.js';
export const rootDir = fileURLToPath(new URL('../../../', import.meta.url));
export const image = process.env.OPTISCOPE_IMAGE || 'optiscope-sandbox:local';
export async function dockerStatus() {
  try {
    const daemon = await execute('docker', ['info', '--format', '{{.ServerVersion}}'], { timeout: 4000, limit: 65536 });
    if (daemon.code !== 0) return { available: false, reason: 'Docker daemon is unavailable. Start Docker Desktop and retry.' };
    const inspected = await execute('docker', ['image', 'inspect', image, '--format', '{{.Id}}'], { timeout: 4000, limit: 65536 });
    if (inspected.code !== 0) return { available: false, reason: 'Sandbox image is missing. Run npm run sandbox:build.' };
    return { available: true, image };
  } catch { return { available: false, reason: 'Docker is unavailable. Install/start Docker Desktop, then run npm run sandbox:build.' }; }
}
export function baseResult(fileName) {
  return { fileName, success: false, warnings: [], errors: [], summary: null, ast: null, regions: [], hotspots: [], recommendations: [], profiling: { status: 'not_run', metadata: null, measuredTotals: null } };
}
function mergeMeasurements(result, raw) {
  const rows = (raw || '').trim().split('\n');
  const totalMatch = /^total (\d+)$/.exec(rows.shift() || '');
  if (!totalMatch) throw new Error('Program did not produce a valid total runtime record. No measurements reported.');
  const totalNs = Number(totalMatch[1]);
  if (!Number.isSafeInteger(totalNs) || totalNs <= 0) throw new Error('Invalid measured total.');
  const records = new Map();
  for (const row of rows) {
    const match = /^(R\d+) (\d+) (\d+) (\d+)$/.exec(row);
    if (!match || records.has(match[1]) || !result.regions.some(r => r.id === match[1])) throw new Error('Invalid or duplicate profiler record.');
    const [inclusiveNs, exclusiveNs, calls] = match.slice(2).map(Number);
    if (![inclusiveNs, exclusiveNs, calls].every(Number.isSafeInteger) || inclusiveNs < exclusiveNs || exclusiveNs > totalNs || calls < 1) throw new Error('Inconsistent profiler measurement.');
    records.set(match[1], { status: 'measured', inclusiveNs, exclusiveNs, calls, inclusiveMs: inclusiveNs / 1e6, exclusiveMs: exclusiveNs / 1e6, programRuntimePercent: exclusiveNs / totalNs * 100, lowConfidence: exclusiveNs < 100000 || exclusiveNs / calls < 1000, confidenceReason: exclusiveNs < 100000 ? 'Aggregate exclusive time below 0.1 ms' : exclusiveNs / calls < 1000 ? 'Mean exclusive time below 1 µs per invocation' : null });
  }
  let exclusiveSum = 0;
  result.regions = result.regions.map(region => {
    const measurement = records.get(region.id) || { status: 'unexecuted' };
    exclusiveSum += measurement.exclusiveNs || 0;
    return { ...region, measurement };
  });
  if (exclusiveSum > totalNs) throw new Error('Region exclusive time exceeds program runtime.');
  result.summary.totalMeasuredRuntimeMs = totalNs / 1e6;
  result.profiling.measuredTotals = { programRuntimeMs: totalNs / 1e6, programRuntimeNs: totalNs, regionExclusiveMs: exclusiveSum / 1e6, uninstrumentedAndOverheadMs: (totalNs - exclusiveSum) / 1e6 };
  result.hotspots = [...result.regions].sort((a, b) => (b.measurement.exclusiveNs ?? -1) - (a.measurement.exclusiveNs ?? -1));
  for (const region of result.hotspots) {
    if (region.measurement.status === 'measured' && !region.measurement.lowConfidence && region.measurement.programRuntimePercent >= 20) {
      result.recommendations.push({ id: `RUNTIME-${region.id}`, regionId: region.id, severity: 'review', pattern: 'General runtime guidance', startLine: region.startLine, endLine: region.endLine, evidence: 'This region accounts for at least 20% of measured program time using exclusive durations.', recommendation: 'Prioritize algorithmic review and representative-input profiling here.', caveat: 'General guidance, not a detected optimization pattern. One O0 run includes timer overhead and does not predict optimized production performance.' });
    }
  }
  result.warnings.push('One instrumented O0 run, not a benchmark. Exclusive percentages use main() wall time. Timers include overhead; aggregate durations under 0.1 ms or mean exclusive durations under 1 µs per invocation are flagged low confidence. Nested timers can noticeably distort tight loops.');
  result.warnings.push('Deterministic single-threaded programs returning normally from main are supported. Profile files are program-controlled data; deliberate tampering is outside the prototype measurement model.');
}
export async function analyzeSource(fileName, source, profile = false) {
  const result = baseResult(fileName);
  const job = await mkdtemp(path.join(tmpdir(), 'optiscope-'));
  const container = `optiscope-${randomUUID()}`;
  let launched = false;
  try {
    await chmod(job, 0o755);
    await writeFile(path.join(job, 'original.cpp'), source, { mode: 0o644 });
    const engine = path.join(rootDir, 'engine/build/optiscope');
    try { await access(engine); } catch { throw new Error('Analysis engine is missing. Run npm run engine:build.'); }
    const parsed = await execute(engine, [path.join(job, 'original.cpp'), path.join(job, 'instrumented.cpp')]);
    if (parsed.code !== 0) throw new Error(`Analysis engine failed: ${parsed.stderr || `exit ${parsed.code}`}`);
    Object.assign(result, JSON.parse(parsed.stdout));
    if (!result.success) { result.profiling.status = 'analysis_failed'; return result; }
    result.hotspots = result.regions.map(r => ({ ...r }));
    if (!profile) return result;
    if (!result.hasMain) { result.profiling.status = 'static_only'; result.errors.push('Profiling requires a supported main() definition.'); return result; }
    const localFunctions = new Set(result.ast.children.filter(n => n.type === 'FunctionDecl').map(n => n.text.split(' ').at(-1)));
    const unsupportedCalls = new Set();
    const pending = [result.ast];
    while (pending.length) {
      const node = pending.pop();
      if (node.type === 'CallExpr' && node.text !== 'printf' && !localFunctions.has(node.text)) unsupportedCalls.add(node.text);
      pending.push(...node.children);
    }
    if (unsupportedCalls.size) {
      result.profiling.status = 'unsupported';
      result.errors.push(`Profiling supports local functions and printf only. Unsupported external calls: ${[...unsupportedCalls].join(', ')}. Static analysis remains available.`);
      return result;
    }
    const docker = await dockerStatus();
    if (!docker.available) { result.profiling.status = 'unavailable'; result.errors.push(docker.reason); return result; }
    launched = true;
    const run = await execute('docker', [
      'run', '--rm', '--name', container, '--network', 'none', '--user', '65534:65534',
      '--memory', '256m', '--memory-swap', '256m', '--cpus', '1', '--pids-limit', '64',
      '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--read-only',
      '--ulimit', 'nofile=128:128', '--ulimit', 'fsize=67108864:67108864',
      '--tmpfs', '/work:rw,exec,nosuid,size=96m,mode=1777',
      '--tmpfs', '/tmp:rw,noexec,nosuid,size=16m,mode=1777',
      '--mount', `type=bind,src=${job},dst=/input,readonly`, image
    ], { timeout: 35000, limit: 512 * 1024 });
    if (run.code !== 0) throw new Error(`Docker sandbox failed: ${run.stderr || `exit ${run.code}`}`);
    const sandbox = JSON.parse(run.stdout);
    result.profiling.metadata = { image, compiler: 'g++ -std=c++17 -O0', clock: 'std::chrono::steady_clock', denominator: 'main() wall time, including instrumentation overhead', compilation: sandbox.compilation, execution: sandbox.execution, timeoutSeconds: 5, singleThreaded: true };
    if (sandbox.sandboxError) throw new Error(sandbox.sandboxError);
    if (sandbox.compilation?.exitCode !== 0 || sandbox.compilation?.status !== 'completed') {
      result.profiling.status = sandbox.compilation?.status === 'timeout' ? 'compile_timeout' : 'compile_error';
      result.errors.push(sandbox.compilation?.stderr || 'Compilation failed or exceeded output/time limits.'); return result;
    }
    if (sandbox.execution?.status !== 'completed' || sandbox.execution?.exitCode !== 0) {
      result.profiling.status = sandbox.execution?.status === 'timeout' ? 'timeout' : sandbox.execution?.status === 'output_limit' ? 'output_limit' : 'runtime_error';
      result.errors.push(`Program ${result.profiling.status}; exit status ${sandbox.execution?.exitCode}. ${sandbox.execution?.stderr || ''}`); return result;
    }
    mergeMeasurements(result, sandbox.profile);
    result.profiling.status = 'completed';
    return result;
  } catch (error) {
    result.errors.push(error.message);
    if (result.success) {
      result.profiling.status = 'error'; result.profiling.measuredTotals = null;
      result.summary.totalMeasuredRuntimeMs = null;
      result.regions.forEach(r => { r.measurement = null; });
      result.hotspots = result.regions.map(r => ({ ...r }));
    } else result.profiling.status = 'analysis_failed';
    return result;
  } finally {
    if (launched) await execute('docker', ['rm', '-f', container], { timeout: 4000, limit: 65536 }).catch(() => {});
    await rm(job, { recursive: true, force: true });
  }
}
