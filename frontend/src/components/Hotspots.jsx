import { Flame, ArrowDownWideNarrow } from "lucide-react";
import {
  COMPLEXITY_NOTE,
  INVOCATION_NOTE,
  LOCAL_COMPLEXITY_LABEL,
  enclosingRegions,
  invocationLabel,
} from "./regionPresentation";
export const ms = (value) =>
  value == null
    ? "—"
    : value < 0.001
      ? "<0.001 ms"
      : `${value.toFixed(value < 1 ? 3 : 2)} ms`;
export default function Hotspots({ result, selected, onSelect }) {
  const rows = result?.hotspots || [];
  const measured = result?.profiling.status === "completed";
  const enclosing = selected ? enclosingRegions(result, selected.id) : [];
  return (
    <section className="panel hotspot-panel">
      <div className="panel-head">
        <div>
          <Flame size={17} />
          <h2>Hotspot explorer</h2>
          <span className="count">{result ? rows.length : "—"}</span>
        </div>
        <span className="muted text-xs flex items-center gap-2">
          <ArrowDownWideNarrow size={14} />
          {measured ? "Exclusive runtime" : "Source order · unmeasured"}
        </span>
      </div>
      <div className="hotspot-notes">
        <p>{COMPLEXITY_NOTE}</p>
        <p>
          {INVOCATION_NOTE} Contribution uses exclusive time divided by measured
          main() wall time.
        </p>
      </div>
      <div className="table-scroll">
        <table className="hotspot-table">
          <thead>
            <tr>
              <th>Region / function</th>
              <th>Lines</th>
              <th>
                {LOCAL_COMPLEXITY_LABEL}
                <small>per invocation</small>
              </th>
              <th className="numeric">
                Invocations<small>region entries</small>
              </th>
              <th className="numeric">Exclusive runtime</th>
              <th className="numeric">Inclusive runtime</th>
              <th className="numeric">% of main time</th>
              <th className="numeric">Advice</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className={selected?.id === r.id ? "selected-row" : ""}
                onClick={() => onSelect(r.id)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSelect(r.id);
                }}
                aria-label={`Select region ${r.id}`}
              >
                <td>
                  <span className="region-id">{r.id}</span>
                  <span className="function-name">{r.functionName}()</span>
                </td>
                <td className="mono">
                  {r.startLine}–{r.endLine}
                </td>
                <td>
                  <span className="complexity">{r.estimatedComplexity}</span>
                  {r.complexityConfidence && (
                    <small className="confidence-label">
                      {r.complexityConfidence.replaceAll("_", " ")}
                    </small>
                  )}
                </td>
                <td className="numeric mono">
                  {invocationLabel(r.measurement)}
                </td>
                <td className="numeric mono">
                  {r.measurement?.status === "unsupported" ? (
                    <span className="muted">Not instrumented</span>
                  ) : r.measurement?.status === "unexecuted" ? (
                    <span className="muted">Not executed</span>
                  ) : (
                    <>
                      <span>{ms(r.measurement?.exclusiveMs)}</span>
                      {r.measurement?.lowConfidence && (
                        <span className="low-confidence">
                          {r.measurement.confidenceReason} · timer-sensitive
                        </span>
                      )}
                    </>
                  )}
                </td>
                <td className="numeric mono">
                  {r.measurement?.status === "unsupported" ? (
                    <span className="muted">Not instrumented</span>
                  ) : r.measurement?.status === "unexecuted" ? (
                    <span className="muted">Not executed</span>
                  ) : (
                    ms(r.measurement?.inclusiveMs)
                  )}
                </td>
                <td className="numeric">
                  {r.measurement?.programRuntimePercent != null ? (
                    <>
                      <span className="mono">
                        {r.measurement.programRuntimePercent.toFixed(1)}%
                      </span>
                      <div className="mini-track">
                        <i
                          style={{
                            width: `${Math.min(100, r.measurement.programRuntimePercent)}%`,
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="numeric">
                  {
                    result.recommendations.filter((x) => x.regionId === r.id)
                      .length
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <div className="empty">
            <p>Loop regions appear after a successful analysis.</p>
          </div>
        )}
      </div>
      {selected && (
        <div className="region-detail">
          <strong>
            {selected.id} · Local complexity: {selected.estimatedComplexity} per
            invocation
          </strong>
          <p>
            One invocation executes this entire loop statement, including any
            contained loops. {selected.reasoning}
          </p>
          {enclosing.length ? (
            <p>
              <strong>Enclosing work: </strong>
              {enclosing.map((r, i) => (
                <span key={r.id}>
                  {i > 0 && " → "}
                  {r.id}: {r.estimatedComplexity}
                </span>
              ))}
              . These existing estimates include repeated execution of nested
              regions. For example, a linear inner loop can have O(n) local cost
              while its enclosing loop has O(n²) cost. This is enclosing
              context, not a separate cumulative estimate for {selected.id}.
            </p>
          ) : (
            <p>
              No enclosing loop region. Its contained work is already included
              in the local estimate; sibling loops are not additional nesting.
            </p>
          )}
          <p>
            <strong>Across invocations: </strong>
            {selected.measurement?.status === "measured"
              ? `${invocationLabel(selected.measurement)} measured region entries. Exclusive and inclusive runtimes are cumulative across those entries, not times for a single invocation.`
              : selected.measurement?.status === "unexecuted"
                ? "This region was not reached in this run; no invocation or iteration count is reported."
                : "Not profiled; invocation counts and cumulative runtimes are unavailable."}{" "}
            Loop-body iteration counts are not collected.
          </p>
          <details>
            <summary>Estimation assumptions</summary>
            <ul>
              {selected.assumptions.length ? (
                selected.assumptions.map((a, i) => <li key={i}>{a}</li>)
              ) : (
                <li>No canonical estimate could be established.</li>
              )}
            </ul>
          </details>
        </div>
      )}
    </section>
  );
}
