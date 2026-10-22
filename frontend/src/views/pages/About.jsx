import { Link } from "react-router-dom";
import PageHeading from "../components/PageHeading.jsx";
const stages = [
  [
    "01",
    "Upload",
    "One C++17 translation unit. Choose Auto, Clang, or Legacy.",
  ],
  [
    "02",
    "Parse & normalize",
    "Clang LibTooling or Flex/Bison produces a shared typed intermediate representation.",
  ],
  [
    "03",
    "Analyze",
    "Regions, structural complexity, assumptions, and rule-based recommendations.",
  ],
  [
    "04",
    "Instrument & run",
    "RAII timers measure loop scopes in the restricted Docker sandbox.",
  ],
  [
    "05",
    "Inspect",
    "Rank by exclusive time. Trace every region back to its source.",
  ],
];
export default function About() {
  return (
    <>
      <PageHeading number="05" title="Inside OptiScope">
        Compiler structure meets measured execution.
      </PageHeading>
      <div className="docs-grid">
        <section className="panel">
          <div className="panel-head">
            <h2>How it works</h2>
            <span className="badge">PIPELINE</span>
          </div>
          <ol className="pipeline-list">
            {stages.map(([number, title, text]) => (
              <li key={number}>
                <span>{number}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
        <div className="docs-stack">
          <section className="panel">
            <div className="panel-head">
              <h2>Architecture</h2>
            </div>
            <dl className="architecture-list">
              <div>
                <dt>Frontend</dt>
                <dd>React routes → shared controller hooks → API service</dd>
              </div>
              <div>
                <dt>Backend</dt>
                <dd>Express controllers → services → isolated jobs</dd>
              </div>
              <div>
                <dt>Engine</dt>
                <dd>
                  Clang / Flex + Bison → typed IR → analysis + instrumentation
                </dd>
              </div>
              <div>
                <dt>Sandbox</dt>
                <dd>
                  Non-root, read-only, no network, bounded memory / CPU / time
                </dd>
              </div>
            </dl>
          </section>
          <section className="panel">
            <div className="panel-head">
              <h2>Choose a frontend</h2>
            </div>
            <div className="doc-copy">
              <p>
                <strong>Auto</strong> preserves legacy results; falls back to
                Clang on rejection.
              </p>
              <p>
                <strong>Clang</strong> runs C++17 semantic parsing in Docker.
              </p>
              <p>
                <strong>Legacy</strong> analyzes the academic subset without
                Docker.
              </p>
            </div>
          </section>
        </div>
      </div>
      <section className="panel docs-limits">
        <div className="panel-head">
          <h2>Know the boundaries</h2>
          <span className="badge">READ BEFORE BENCHMARKING</span>
        </div>
        <div className="doc-copy">
          <p>
            Parsing success does not imply known complexity. Estimates are
            classified as exact_pattern, estimated, or unknown; general graph,
            recursion, aliasing, and dataflow cases can remain unknown.
          </p>
          <p>
            Profiling is a single instrumented -O0 run. Inclusive time includes
            children; exclusive time subtracts them. Invocation counts are
            loop-scope entries, not iterations. Timer overhead and Docker
            scheduling affect small regions.
          </p>
          <p>
            Programs must run without interactive input. Multithreaded
            profiling, missing third-party headers, and multiple translation
            units are unsupported. Some macro, constexpr, and goto regions
            cannot be instrumented safely.
          </p>
          <p>
            Native macOS LibTooling compilation remains unverified. The
            supported Clang path is the Linux Docker image. Workspace state
            survives navigation in this tab; refresh clears it.
          </p>
          <p>
            The comparison tool uses uninstrumented -O2 runs with output checks
            for one fixed workload. Matching output is not a general equivalence
            proof.
          </p>
        </div>
      </section>
      <div className="next-step">
        <Link className="button primary" to="/analyze">
          Open analyzer →
        </Link>
        <a
          className="text-button"
          href="https://github.com/amriiit/OptiScore#readme"
          target="_blank"
          rel="noreferrer"
        >
          README & setup ↗
        </a>
      </div>
    </>
  );
}
