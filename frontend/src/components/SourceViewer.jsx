import { useEffect, useRef } from 'react';
import { Code2 } from 'lucide-react';
export default function SourceViewer({ source, fileName, selected }) {
  const active = useRef(null);
  useEffect(() => { active.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [selected?.id]);
  return <section className="panel source-panel"><div className="panel-head"><div><Code2 size={17}/><h2>{fileName || 'Source code'}</h2></div><span className="badge">C++17</span></div>
    {source ? <div className="source-scroll"><pre>{source.split('\n').map((line, i) => {
      const hit = selected && i + 1 >= selected.startLine && i + 1 <= selected.endLine;
      return <div key={i} ref={selected?.startLine === i + 1 ? active : null} className={`code-line ${hit ? 'highlight' : ''}`}><span className="line-number">{i + 1}</span><code>{line || ' '}</code></div>;
    })}</pre></div> : <div className="empty tall"><Code2 size={34}/><h3>Your source, under the microscope</h3><p>Upload C++ or load a sample to inspect its structure and measure where time is spent.</p></div>}
    <div className="panel-foot">{selected ? `${selected.id} · Lines ${selected.startLine}–${selected.endLine} · ${selected.estimatedComplexity}` : 'Select a hotspot to highlight its source range.'}</div>
  </section>;
}
