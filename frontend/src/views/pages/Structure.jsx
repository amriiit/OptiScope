import { Link } from "react-router-dom";
import { useWorkspace } from "../../controllers/WorkspaceContext.jsx";
import AstTree from "../../components/AstTree.jsx";
import SourceViewer from "../../components/SourceViewer.jsx";
import AnalysisCoverage from "../components/AnalysisCoverage.jsx";
import EmptyWorkspace from "../components/EmptyWorkspace.jsx";
import PageHeading from "../components/PageHeading.jsx";
export default function Structure() {
  const { analysis: a } = useWorkspace();
  return (
    <>
      <PageHeading
        number="03"
        title="Program structure"
        actions={
          <Link className="button secondary" to="/results">
            View results ↗
          </Link>
        }
      />
      {!a.result ? (
        <EmptyWorkspace title="No structure to explore yet" />
      ) : (
        <>
          <div className="workspace-grid structure-grid">
            <AstTree
              ast={a.result.ast}
              frontend={a.result.frontend?.name}
              selectedId={a.selectedId}
              onSelect={a.setSelectedId}
            />
            <SourceViewer
              source={a.source}
              fileName={a.fileName}
              selected={a.diagnosticSelection || a.selected}
            />
          </div>
          <section className="panel region-outline">
            <div className="panel-head">
              <h2>Region index</h2>
              <span className="badge">{a.result.regions.length} REGIONS</span>
            </div>
            <div className="region-list">
              {a.result.regions.length ? (
                a.result.regions.map((region) => (
                  <button
                    key={region.id}
                    onClick={() => a.setSelectedId(region.id)}
                    aria-pressed={region.id === a.selectedId}
                  >
                    <strong>{region.id}</strong>
                    <span>{region.functionName || region.type || "Loop"}</span>
                    <span>
                      L{region.startLine}–{region.endLine}
                    </span>
                    <code>{region.estimatedComplexity}</code>
                  </button>
                ))
              ) : (
                <p className="empty">No loop regions found.</p>
              )}
            </div>
            {a.selected && (
              <div className="region-detail">
                <strong>{a.selected.id} / Complexity assumptions</strong>
                <p>
                  {a.selected.reason ||
                    a.selected.reasoning ||
                    "See the region estimate and compiler coverage below."}
                </p>
                <ul>
                  {(Array.isArray(a.selected.assumptions)
                    ? a.selected.assumptions
                    : []
                  ).map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
          <AnalysisCoverage
            result={a.result}
            onDiagnostic={a.selectDiagnostic}
            onSelect={a.setSelectedId}
          />
        </>
      )}
    </>
  );
}
