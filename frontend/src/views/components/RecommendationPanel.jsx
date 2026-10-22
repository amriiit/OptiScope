import { Lightbulb, ArrowUpRight, CircleCheck } from "lucide-react";
export default function RecommendationPanel({ result, onSelect }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <Lightbulb size={17} />
          <h2>Recommendations</h2>
          <span className="count">
            {result ? result.recommendations.length : "—"}
          </span>
        </div>
        <span className="badge">RULE-BASED</span>
      </div>
      <div className="recommendations">
        {result?.recommendations.length ? (
          result.recommendations.map((r) => (
            <article key={r.id} className="recommendation">
              <div>
                <span className={`severity ${r.severity}`}>{r.severity}</span>
                <button
                  className="text-button"
                  onClick={() => onSelect(r.regionId)}
                >
                  {r.regionId} · L{r.startLine}–{r.endLine}
                  <ArrowUpRight size={12} />
                </button>
              </div>
              <h3>{r.pattern}</h3>
              <p>{r.evidence}</p>
              <p className="advice">{r.recommendation}</p>
              <small>{r.caveat}</small>
            </article>
          ))
        ) : (
          <div className="empty">
            <CircleCheck size={27} />
            <h3>
              {result?.success
                ? "No supported pattern detected"
                : "Evidence before advice"}
            </h3>
            <p>
              {result?.success
                ? "Try patterns.cpp for AST rules. Completed profiling can add general runtime guidance for substantial regions."
                : "Recommendations appear only when an AST rule or measured runtime supports them."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
