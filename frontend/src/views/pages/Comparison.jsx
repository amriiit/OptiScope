import { useComparisonController } from "../../controllers/useComparisonController.js";
export default function Comparison() {
  const { files, result, error, busy, selectFile, compare } =
    useComparisonController();
  return (
    <section
      className="panel comparison-panel"
      id="comparison"
      aria-labelledby="comparison-title"
    >
      <div className="panel-head">
        <h2 id="comparison-title">Performance comparison</h2>
        <span className="badge">EXECUTION ONLY · -O2</span>
      </div>
      <div className="comparison-body">
        <p>
          Upload two deterministic programs with the same fixed internal
          workload. One warm-up and ten uninstrumented runs per version. No
          static analysis is performed here.
        </p>
        <div className="comparison-inputs">
          {["original", "optimized"].map((role) => (
            <label key={role}>
              {role === "original"
                ? "Original C++ program"
                : "Manually optimized C++ program"}
              <input
                type="file"
                accept=".cpp"
                disabled={busy}
                onChange={(event) => selectFile(role, event.target.files[0])}
              />
              <small>
                {files[role]?.name || "Select one .cpp · up to 128 KiB"}
              </small>
            </label>
          ))}
        </div>
        <button
          className="button primary"
          disabled={busy || !files.original || !files.optimized}
          onClick={compare}
        >
          {busy ? "Preparing & comparing…" : "Compare in Docker"}
        </button>
        {busy && (
          <p role="status">
            Compiling both with -O2 and checking every run. This can take up to
            75 seconds.
          </p>
        )}
        {error && (
          <div className="notice error" role="alert">
            {error}
          </div>
        )}
        {result && (
          <div aria-live="polite">
            <h3>
              {result.status === "completed"
                ? "Outputs and exit statuses match for this workload"
                : `Comparison: ${result.status.replaceAll("_", " ")}`}
            </h3>
            {result.error && (
              <div className="notice error" role="alert">
                {result.error}
              </div>
            )}
            {Object.entries(result.compilations || {})
              .filter(
                ([, stage]) =>
                  stage.status !== "completed" || stage.exitCode !== 0,
              )
              .map(([role, stage]) => (
                <div className="notice error" role="alert" key={role}>
                  <div>
                    <strong>
                      {role}: compilation {stage.status}, exit {stage.exitCode}
                    </strong>
                    <pre>{stage.stderr || "Compilation did not complete."}</pre>
                  </div>
                </div>
              ))}
            {result.statistics && (
              <>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Version</th>
                        <th>Runs</th>
                        <th>Mean (ms)</th>
                        <th>Median (ms)</th>
                        <th>Min / Max (ms)</th>
                        <th>Std deviation (ms)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(result.statistics).map(
                        ([name, value]) => (
                          <tr key={name}>
                            <td>{name}</td>
                            <td>{value.runCount}</td>
                            <td>{value.meanMs.toFixed(3)}</td>
                            <td>{value.medianMs.toFixed(3)}</td>
                            <td>
                              {value.minMs.toFixed(3)} /{" "}
                              {value.maxMs.toFixed(3)}
                            </td>
                            <td>{value.standardDeviationMs.toFixed(3)}</td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
                <p className="comparison-ratio">
                  Observed median ratio: {result.speedup.toFixed(2)}× · runtime
                  reduction: {result.runtimeReductionPercent.toFixed(1)}%
                </p>
              </>
            )}
            {result.warnings?.map((warning) => (
              <p key={warning} className="comparison-warning">
                {warning}
              </p>
            ))}
            <details>
              <summary>Raw timings, compiler output & environment</summary>
              <pre>{JSON.stringify(result, null, 2)}</pre>
            </details>
          </div>
        )}
      </div>
    </section>
  );
}
