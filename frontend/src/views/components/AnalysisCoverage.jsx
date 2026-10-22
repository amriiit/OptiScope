export default function AnalysisCoverage({ result, onDiagnostic, onSelect }) {
  if (!result?.frontend) return null;
  const skipped = result.regions.filter(
    (region) => region.instrumentation?.supported === false,
  );
  return (
    <section
      className="panel coverage-panel"
      aria-label="Compiler diagnostics and analysis coverage"
    >
      <div className="panel-head">
        <h2>C++ frontend & analysis coverage</h2>
        <span className="badge">
          {result.frontend.name} · {result.frontend.status.replaceAll("_", " ")}
        </span>
      </div>
      <div className="coverage-body">
        <p>
          Parsing success is separate from complexity inference. Unknown
          estimates do not mean invalid C++. Runtime values require a completed
          profiling run.
        </p>
        {result.diagnostics?.length > 0 && (
          <ul>
            {result.diagnostics.map((diagnostic, i) => (
              <li key={i}>
                <strong>{diagnostic.severity}: </strong>
                {diagnostic.message}
                {diagnostic.inMainFile && diagnostic.startLine > 0 && (
                  <button
                    className="text-button"
                    onClick={() => onDiagnostic(diagnostic)}
                  >
                    {" "}
                    · Line {diagnostic.startLine}:{diagnostic.column}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {skipped.length > 0 && (
          <div className="notice">
            <div>
              <strong>
                {skipped.length} region(s) excluded from instrumentation
              </strong>
              {skipped.map((region) => (
                <p key={region.id}>
                  <button
                    className="text-button"
                    onClick={() => onSelect(region.id)}
                  >
                    {region.id} · L{region.startLine}
                  </button>{" "}
                  {region.instrumentation.reason}
                </p>
              ))}
            </div>
          </div>
        )}
        {result.recurrences?.length > 0 && (
          <details>
            <summary>
              Recursive function coverage ({result.recurrences.length})
            </summary>
            {result.recurrences.map((item) => (
              <p key={item.functionName}>
                <strong>
                  {item.functionName}: {item.estimatedComplexity} ·{" "}
                  {item.confidence}
                </strong>
                <br />
                {item.reason}
              </p>
            ))}
          </details>
        )}
        {result.operations?.length > 0 && (
          <details>
            <summary>
              Standard-library operation cost models ({result.operations.length}
              )
            </summary>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Operation</th>
                    <th>Container</th>
                    <th>Source-level estimate</th>
                    <th>Assumptions / limits</th>
                  </tr>
                </thead>
                <tbody>
                  {result.operations.map((operation, i) => (
                    <tr key={i}>
                      <td>
                        {operation.name} · L{operation.startLine}
                      </td>
                      <td>{operation.containerType || "Not resolved"}</td>
                      <td>
                        {operation.estimatedComplexity} · {operation.confidence}
                      </td>
                      <td>
                        {operation.reason ||
                          "No defensible operation model; cost is unknown."}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </div>
    </section>
  );
}
