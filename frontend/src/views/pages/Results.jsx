import { Link } from "react-router-dom";
import { useWorkspace } from "../../controllers/WorkspaceContext.jsx";
import { summaryCards } from "../../models/analysisModel.js";
import Hotspots, { ms } from "../../components/Hotspots.jsx";
import RuntimeChart from "../../components/RuntimeChart.jsx";
import SourceViewer from "../../components/SourceViewer.jsx";
import SummaryCards from "../components/SummaryCards.jsx";
import RecommendationPanel from "../components/RecommendationPanel.jsx";
import ProgramOutput from "../components/ProgramOutput.jsx";
import AnalysisActions from "../components/AnalysisActions.jsx";
import WorkspaceStatus from "../components/WorkspaceStatus.jsx";
import EmptyWorkspace from "../components/EmptyWorkspace.jsx";
import PageHeading from "../components/PageHeading.jsx";
export default function Results() {
  const { analysis: a } = useWorkspace();
  const execution = a.result?.profiling.metadata?.execution;
  return (
    <>
      <PageHeading
        number="02"
        title="Analysis results"
        actions={
          <>
            <Link className="button secondary" to="/analyze">
              Edit setup
            </Link>
            <Link className="button secondary" to="/ast">
              Explore AST ↗
            </Link>
          </>
        }
      />
      {!a.result ? (
        <EmptyWorkspace />
      ) : (
        <>
          <div className="result-file">
            <span className="mono">{a.fileName}</span>
            <span className="badge">
              {a.result.frontend?.name || a.frontend} /{" "}
              {a.result.profiling.status.replaceAll("_", " ")}
            </span>
          </div>
          <AnalysisActions {...a} />
          <WorkspaceStatus />
          <SummaryCards cards={summaryCards(a.result, ms)} />
          <Hotspots
            result={a.result}
            selected={a.selected}
            onSelect={a.setSelectedId}
          />
          <div className="workspace-grid results-grid">
            <RuntimeChart result={a.result} onSelect={a.setSelectedId} />
            <SourceViewer
              source={a.source}
              fileName={a.fileName}
              selected={a.diagnosticSelection || a.selected}
            />
          </div>
          <RecommendationPanel result={a.result} onSelect={a.setSelectedId} />
          {execution && <ProgramOutput execution={execution} />}
          {!!a.result.warnings?.length && (
            <details className="limitations">
              <summary>
                Analysis & measurement limitations ({a.result.warnings.length})
              </summary>
              <ul>
                {a.result.warnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            </details>
          )}
          <div className="next-step">
            <span>Have an optimized version?</span>
            <Link className="button secondary" to="/compare">
              Compare programs ↗
            </Link>
          </div>
        </>
      )}
    </>
  );
}
