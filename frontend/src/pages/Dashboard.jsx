import { useEffect, useState } from 'react';
import { Activity, Upload, Play, ScanLine, LoaderCircle, CircleCheck, TriangleAlert, Box, FileCode2, Lightbulb, Terminal, ChevronRight, ArrowUpRight } from 'lucide-react';
import SourceViewer from '../components/SourceViewer';
import AstTree from '../components/AstTree';
import Hotspots, { ms } from '../components/Hotspots';
import RuntimeChart from '../components/RuntimeChart';
const MAX = 128 * 1024;
export default function Dashboard() {
  const [source, setSource] = useState(''); const [fileName, setFileName] = useState('');
  const [result, setResult] = useState(null); const [busy, setBusy] = useState(''); const [error, setError] = useState('');
  const [samples, setSamples] = useState([]); const [sample, setSample] = useState('nested.cpp');
  const [health, setHealth] = useState(null); const [selectedId, setSelectedId] = useState(null); const [drag, setDrag] = useState(false);
  async function checkHealth() { try { const r = await fetch('/api/health'); if (r.ok) setHealth(await r.json()); } catch { setHealth({ docker: { available: false, reason: 'API is unreachable. Start the backend on port 3001.' } }); } }
  useEffect(() => { checkHealth(); fetch('/api/samples').then(r => r.json()).then(setSamples).catch(() => setError('Cannot reach the API. Start the backend and refresh.')); }, []);
  const selected = result?.regions.find(r => r.id === selectedId);
  function load(text, name) { setSource(text); setFileName(name); setResult(null); setSelectedId(null); setError(''); }
  async function openFile(file) {
    if (!file) return;
    if (!/\.cpp$/i.test(file.name)) { setError('Select a single .cpp source file.'); return; }
    if (!file.size || file.size > MAX) { setError('File must be nonempty and no larger than 128 KiB.'); return; }
    try { const bytes = await file.arrayBuffer(); if (new Uint8Array(bytes).includes(0)) throw new Error('Source contains NUL bytes.'); load(new TextDecoder('utf-8', { fatal: true }).decode(bytes), file.name); } catch (e) { setError(`Cannot read UTF-8 source: ${e.message}`); }
  }
  async function loadSample() {
    setBusy('sample'); setError('');
    try { const r = await fetch(`/api/samples/${encodeURIComponent(sample)}`); const data = await r.json(); if (!r.ok) throw new Error(data.error); load(data.source, data.fileName); } catch (e) { setError(e.message); } finally { setBusy(''); }
  }
  async function run(operation) {
    setBusy(operation); setError('');
    try {
      const body = new FormData(); body.append('file', new File([source], fileName, { type: 'text/plain' }));
      const response = await fetch(`/api/${operation}`, { method: 'POST', body }); const data = await response.json();
      if (!data.profiling) throw new Error(data.error || 'Unexpected API response');
      setResult(data); setSelectedId(data.hotspots?.[0]?.id || data.regions?.[0]?.id || null);
    } catch (e) { setError(`Request failed: ${e.message}`); } finally { setBusy(''); checkHealth(); }
  }
  const summary = result?.summary;
  const cards = [['Functions', summary?.functionsDetected], ['Loop regions', summary?.loopsDetected], ['Max loop depth', summary?.maxNestingDepth], ['Overall structural estimate', summary?.worstEstimatedComplexity], ['Measured main time', ms(summary?.totalMeasuredRuntimeMs)]];
  const execution = result?.profiling.metadata?.execution;
  return <div className="app-shell"><header className="topbar"><a className="brand" href="/"><span className="logo"><Activity size={24}/></span><strong>OptiScope</strong><span className="version">REVIEW 1</span></a><div className="top-status"><span className="local-dot"/>LOCAL WORKSPACE<span className="separator"/><span className="muted">C++17</span></div></header>
    <main><div className="breadcrumb">Workspace <ChevronRight size={13}/> Performance analysis</div><div className="page-title"><div><div className="eyebrow">UNDERSTAND THE WORK. FIND THE COST.</div><h1>Compiler-Assisted Performance<br className="mobile-break"/> Hotspot Analyzer</h1><p>From source structure to measured execution. See where your C++ spends its time.</p></div><div className={`sandbox-status ${health?.docker.available ? 'ready' : ''}`}><Box size={17}/><div><strong>{health ? health.docker.available ? 'Sandbox ready' : 'Static analysis ready' : 'Checking sandbox…'}</strong><span>{health?.docker.available ? 'Docker · network isolated' : 'Profiling requires Docker'}</span></div></div></div>
    <section className="panel upload-panel"><div className={`drop-zone ${drag ? 'dragging' : ''}`} onDragOver={e => { e.preventDefault(); if (!busy) setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); if (!busy) { if (e.dataTransfer.files.length !== 1) setError('Upload one file at a time.'); else openFile(e.dataTransfer.files[0]); } }}><label className={`upload-label ${busy ? 'disabled' : ''}`}><span className="upload-icon"><Upload size={20}/></span><span><strong>{fileName || 'Drop your C++ source here'}</strong><small>{fileName ? `${new TextEncoder().encode(source).length.toLocaleString()} bytes · Ready for analysis` : 'or click to browse · single .cpp · up to 128 KiB'}</small></span><input type="file" accept=".cpp" disabled={!!busy} aria-label="Upload C++ file" onChange={e => { openFile(e.target.files[0]); e.target.value = ''; }}/></label></div><div className="sample-controls"><span className="muted text-xs">TRY AN EXAMPLE</span><div><select aria-label="Sample program" value={sample} disabled={!!busy} onChange={e => setSample(e.target.value)}>{samples.map(s => <option key={s}>{s}</option>)}</select><button className="button secondary" disabled={!!busy} onClick={loadSample}><FileCode2 size={15}/>Load Sample</button></div></div></section>
    <div className="action-row"><div className="workflow"><span className="step">1</span><span>Parse & estimate</span><ChevronRight size={14}/><span className="step">2</span><span>Measure & inspect</span></div><div className="actions"><button className="button secondary" disabled={!source || !!busy} onClick={() => run('analyze')}>{busy === 'analyze' ? <LoaderCircle className="spin" size={16}/> : <ScanLine size={16}/>}Analyze</button><button className="button primary" disabled={!result?.success || !result?.hasMain || !!busy} onClick={() => run('profile')}>{busy === 'profile' ? <LoaderCircle className="spin" size={16}/> : <Play size={16}/>} {busy === 'profile' ? 'Compiling & profiling…' : 'Run Profiling'}</button></div></div>
    {busy && <div className="progress-message" role="status"><LoaderCircle className="spin" size={16}/>{busy === 'profile' ? 'Compiling with g++ -O0, then executing in the restricted Docker sandbox. This may take several seconds.' : busy === 'sample' ? 'Loading sample source…' : 'Tokenizing, parsing and traversing the AST…'}</div>}
    {error && <div className="notice error" role="alert"><TriangleAlert size={17}/><div>{error}</div></div>}
    {result?.errors?.length > 0 && <div className="notice error" role="alert"><TriangleAlert size={18}/><div><strong>{result.success ? `Profiling: ${result.profiling.status.replaceAll('_', ' ')}` : 'Analysis could not complete'}</strong>{result.errors.map((e, i) => <pre key={i}>{e}</pre>)}</div></div>}
    {!health?.docker.available && health && <div className="notice subtle"><Box size={16}/><span>{health.docker.reason} Static analysis remains available.</span><button className="text-button" onClick={checkHealth}>Recheck</button></div>}
    <div className="summary-grid">{cards.map(([label, value], i) => <div className="summary-card" key={label}><span>{label}</span><strong className={i === 3 ? 'mint mono' : ''}>{value ?? '—'}</strong><small>{i === 3 ? 'Across definitions · structural estimate' : i === 4 ? 'Real wall time · includes overhead' : i === 2 ? 'Independent of complexity' : i === 1 ? 'for + while statements' : 'Parsed definitions'}</small></div>)}</div>
    <div className="workspace-grid"><SourceViewer source={source} fileName={fileName} selected={selected}/><RuntimeChart result={result} onSelect={setSelectedId}/></div>
    <Hotspots result={result} selected={selected} onSelect={setSelectedId}/>
    <div className="lower-grid"><AstTree ast={result?.ast} onSelect={setSelectedId} selectedId={selectedId}/><section className="panel"><div className="panel-head"><div><Lightbulb size={17}/><h2>Recommendations</h2><span className="count">{result ? result.recommendations.length : '—'}</span></div><span className="badge">RULE-BASED</span></div><div className="recommendations">{result?.recommendations.length ? result.recommendations.map(r => <article key={r.id} className="recommendation"><div><span className={`severity ${r.severity}`}>{r.severity}</span><button className="text-button" onClick={() => setSelectedId(r.regionId)}>{r.regionId} · L{r.startLine}–{r.endLine}<ArrowUpRight size={12}/></button></div><h3>{r.pattern}</h3><p>{r.evidence}</p><p className="advice">{r.recommendation}</p><small>{r.caveat}</small></article>) : <div className="empty"><CircleCheck size={27}/><h3>{result?.success ? 'No supported pattern detected' : 'Evidence before advice'}</h3><p>{result?.success ? 'Try patterns.cpp for AST rules. Completed profiling can add general runtime guidance for substantial regions.' : 'Recommendations appear only when an AST rule or measured runtime supports them.'}</p></div>}</div></section></div>
    {execution && <section className="panel output-panel"><div className="panel-head"><div><Terminal size={17}/><h2>Program output</h2></div><span className="badge">EXIT {execution.exitCode}</span></div><pre>{execution.stdout || '(no stdout)'}{execution.stderr ? `\nSTDERR\n${execution.stderr}` : ''}</pre></section>}
    {result?.warnings.length > 0 && <details className="limitations"><summary><TriangleAlert size={15}/>Analysis & measurement limitations ({result.warnings.length})</summary><ul>{result.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul></details>}
    <footer><span><Activity size={14}/>OptiScope</span><p>Flex / Bison AST · deterministic rules · real chrono measurements</p><span>Local prototype</span></footer></main></div>;
}
