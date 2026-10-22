import { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useWorkspace } from "../../controllers/WorkspaceContext.jsx";
import UploadPanel from "../components/UploadPanel.jsx";
import AnalysisActions from "../components/AnalysisActions.jsx";
import SourceViewer from "../../components/SourceViewer.jsx";
import AnalysisCoverage from "../components/AnalysisCoverage.jsx";
import PageHeading from "../components/PageHeading.jsx";
import WorkspaceStatus from "../components/WorkspaceStatus.jsx";
export default function Analyze() {
  const { analysis: a } = useWorkspace();
  const navigate = useNavigate();
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  async function run(operation) {
    const result = await a.run(operation);
    if (result?.success && active.current) navigate("/results");
  }
  return (
    <>
      <PageHeading
        number="01"
        title="Analyze source"
        actions={
          <Link className="button secondary" to="/samples">
            Browse corpus ↗
          </Link>
        }
      />
      <UploadPanel {...a} />
      <div className="analyze-grid">
        <section className="panel setup-panel">
          <div className="panel-head">
            <h2>Analysis setup</h2>
            <span className="badge">01 / CONFIGURE</span>
          </div>
          <div className="setup-body">
            <label className="control-label" htmlFor="compiler-frontend">
              Compiler frontend
            </label>
            <select
              id="compiler-frontend"
              value={a.frontend}
              disabled={!!a.busy}
              onChange={(event) => a.changeFrontend(event.target.value)}
            >
              <option value="auto">Auto</option>
              <option value="clang">Clang</option>
              <option value="legacy">Legacy</option>
            </select>
            <p className="mode-description">
              {
                {
                  auto: "Legacy first; Clang fallback on rejection.",
                  clang: "C++17 syntax & semantics in Docker.",
                  legacy:
                    "Flex/Bison academic subset. Docker-free static analysis.",
                }[a.frontend]
              }
            </p>
            <div className="setup-divider" />
            <dl className="setup-facts">
              <div>
                <dt>Language</dt>
                <dd>C++17</dd>
              </div>
              <div>
                <dt>Execution</dt>
                <dd>Isolated Docker</dd>
              </div>
              <div>
                <dt>Profile compiler</dt>
                <dd>g++ · -O0</dd>
              </div>
            </dl>
            {a.health && !a.health.docker.available && (
              <div className="notice subtle">
                <div>
                  {a.health.docker.reason}
                  <br />
                  <button className="text-button" onClick={a.checkHealth}>
                    Recheck sandbox
                  </button>
                </div>
              </div>
            )}
            <AnalysisActions {...a} run={run} />
            {a.result && (
              <Link className="text-button" to="/results">
                Open retained results →
              </Link>
            )}
          </div>
        </section>
        <SourceViewer
          source={a.source}
          fileName={a.fileName}
          selected={a.diagnosticSelection || a.selected}
        />
      </div>
      <WorkspaceStatus />
      {!!a.result && (
        <AnalysisCoverage
          result={a.result}
          onDiagnostic={a.selectDiagnostic}
          onSelect={a.setSelectedId}
        />
      )}
    </>
  );
}
