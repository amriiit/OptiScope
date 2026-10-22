import { Play, ScanLine, LoaderCircle, ChevronRight } from "lucide-react";
export default function AnalysisActions({ source, result, busy, run }) {
  return (
    <div className="action-row">
      <div className="workflow">
        <span className="step">1</span>
        <span>Parse & estimate</span>
        <ChevronRight size={14} />
        <span className="step">2</span>
        <span>Measure & inspect</span>
      </div>
      <div className="actions">
        <button
          className="button secondary"
          disabled={!source || !!busy}
          onClick={() => run("analyze")}
        >
          {busy === "analyze" ? (
            <LoaderCircle className="spin" size={16} />
          ) : (
            <ScanLine size={16} />
          )}
          Analyze
        </button>
        <button
          className="button primary"
          disabled={!result?.success || !result?.hasMain || !!busy}
          onClick={() => run("profile")}
        >
          {busy === "profile" ? (
            <LoaderCircle className="spin" size={16} />
          ) : (
            <Play size={16} />
          )}{" "}
          {busy === "profile" ? "Compiling & profiling…" : "Run Profiling"}
        </button>
      </div>
    </div>
  );
}
