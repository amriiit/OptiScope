import AnalysisCoverage from "../components/AnalysisCoverage";
import Comparison from "./Comparison";
import RecommendationPanel from "../components/RecommendationPanel";
import {
  Activity,
  LoaderCircle,
  TriangleAlert,
  Box,
  ChevronRight,
} from "lucide-react";
import SourceViewer from "../../components/SourceViewer";
import AstTree from "../../components/AstTree";
import Hotspots, { ms } from "../../components/Hotspots";
import RuntimeChart from "../../components/RuntimeChart";
import { useAnalysisController } from "../../controllers/useAnalysisController.js";
import { summaryCards } from "../../models/analysisModel.js";
import UploadPanel from "../components/UploadPanel";
import AnalysisActions from "../components/AnalysisActions";
import SummaryCards from "../components/SummaryCards";
import ProgramOutput from "../components/ProgramOutput";
export default function Dashboard() {
  const {
    frontend,
    changeFrontend,
    diagnosticSelection,
    selectDiagnostic,
    source,
    fileName,
    result,
    busy,
    error,
    samples,
    sample,
    setSample,
    health,
    selectedId,
    setSelectedId,
    drag,
    setDrag,
    selected,
    checkHealth,
    openFile,
    loadSample,
    run,
    setError,
  } = useAnalysisController();
  const cards = summaryCards(result, ms);
  const execution = result?.profiling.metadata?.execution;
  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/">
          <span className="logo">
            <Activity size={24} />
          </span>
          <strong>OptiScope</strong>
          <span className="version">C++ / LOCAL</span>
        </a>
        <nav className="tool-nav" aria-label="Workbench">
          <a href="#analysis">Analyze</a>
          <a href="#comparison">Compare</a>
        </nav>
        <div className="top-status">
          <span className="local-dot" />
          LOCAL WORKSPACE
          <span className="separator" />
          <span className="muted">C++17</span>
        </div>
      </header>
      <main id="analysis">
        <div className="breadcrumb">
          Workspace <ChevronRight size={13} /> Performance analysis
        </div>
        <div className="page-title">
          <div>
            <div className="eyebrow">OPTISCOPE / PERFORMANCE WORKBENCH</div>
            <h1>
              Find the code
              <br />
              worth optimizing.
            </h1>
            <p>
              From source structure to measured execution. See where your C++
              spends its time.
            </p>
          </div>
          <div
            className={`sandbox-status ${health?.docker.available ? "ready" : ""}`}
          >
            <Box size={17} />
            <div>
              <strong>
                {health
                  ? health.docker.available
                    ? "Sandbox ready"
                    : "Legacy analysis ready"
                  : "Checking sandbox…"}
              </strong>
              <span>
                {health?.docker.available
                  ? "Docker · network isolated"
                  : "Profiling requires Docker"}
              </span>
            </div>
          </div>
        </div>
        <UploadPanel
          source={source}
          fileName={fileName}
          busy={busy}
          drag={drag}
          setDrag={setDrag}
          setError={setError}
          openFile={openFile}
          samples={samples}
          sample={sample}
          setSample={setSample}
          loadSample={loadSample}
        />
        <div className="frontend-controls">
          <label htmlFor="compiler-frontend">Compiler frontend</label>
          <select
            id="compiler-frontend"
            value={frontend}
            disabled={!!busy}
            onChange={(event) => changeFrontend(event.target.value)}
          >
            <option value="auto">
              Auto · academic parser, then Clang C++17
            </option>
            <option value="legacy">Legacy · Flex/Bison academic subset</option>
            <option value="clang">Clang · full C++17 syntax (Docker)</option>
          </select>
        </div>
        <AnalysisActions
          source={source}
          result={result}
          busy={busy}
          run={run}
        />
        {busy && (
          <div className="progress-message" role="status">
            <LoaderCircle className="spin" size={16} />
            {busy === "profile"
              ? "Compiling with g++ -O0, then executing in the restricted Docker sandbox. This may take several seconds."
              : busy === "sample"
                ? "Loading sample source…"
                : busy === "file"
                  ? "Reading source file…"
                  : "Tokenizing, parsing and traversing the AST…"}
          </div>
        )}
        {error && (
          <div className="notice error" role="alert">
            <TriangleAlert size={17} />
            <div>{error}</div>
          </div>
        )}
        {result?.errors?.length > 0 && (
          <div className="notice error" role="alert">
            <TriangleAlert size={18} />
            <div>
              <strong>
                {result.success
                  ? `Profiling: ${result.profiling.status.replaceAll("_", " ")}`
                  : "Analysis could not complete"}
              </strong>
              {result.errors.map((e, i) => (
                <pre key={i}>{e}</pre>
              ))}
            </div>
          </div>
        )}
        {!health?.docker.available && health && (
          <div className="notice subtle">
            <Box size={16} />
            <span>
              {health.docker.reason} Legacy subset static analysis remains available.
            </span>
            <button className="text-button" onClick={checkHealth}>
              Recheck
            </button>
          </div>
        )}
        <AnalysisCoverage
          result={result}
          onDiagnostic={selectDiagnostic}
          onSelect={setSelectedId}
        />
        <SummaryCards cards={cards} />
        <div className="workspace-grid">
          <SourceViewer
            source={source}
            fileName={fileName}
            selected={diagnosticSelection || selected}
          />
          <RuntimeChart result={result} onSelect={setSelectedId} />
        </div>
        <Hotspots
          result={result}
          selected={selected}
          onSelect={setSelectedId}
        />
        <div className="lower-grid">
          <AstTree
            frontend={result?.frontend?.name}
            ast={result?.ast}
            onSelect={setSelectedId}
            selectedId={selectedId}
          />
          <RecommendationPanel result={result} onSelect={setSelectedId} />
        </div>
        {execution && <ProgramOutput execution={execution} />}
        {result?.warnings.length > 0 && (
          <details className="limitations">
            <summary>
              <TriangleAlert size={15} />
              Analysis & measurement limitations ({result.warnings.length})
            </summary>
            <ul>
              {result.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </details>
        )}
        <Comparison />
        <footer>
          <span>
            <Activity size={14} />
            OptiScope
          </span>
          <p>
            Flex/Bison academic AST · Clang C++17 · real chrono measurements
          </p>
          <span>Local prototype</span>
        </footer>
      </main>
    </div>
  );
}
