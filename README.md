# OptiScope

**Compiler-assisted performance hotspot analysis for C++17.**

OptiScope connects compiler structure with real runtime measurements. Upload a C++ file, inspect its typed AST and complexity estimates, then explicitly profile it in an isolated Docker container. Follow ranked hotspots back to their source and review optimization suggestions with evidence and caveats.

```text
C++ source → Parse → Typed AST / IR → Regions & complexity
         → Instrument → Docker runtime profiling → Hotspot ranking → Recommendations
```

This is a local compiler-design prototype. It does not generate benchmark numbers, guarantee speedups, or automatically rewrite your program.

## Quick start

Requirements: Node.js **22.12+ or 24+**, npm, a C++17 compiler, **Bison 3.8+**, Flex, GNU Make **4.3+**, and Docker with its daemon running. Docker is required for Clang parsing, profiling, comparison, and the runtime-required tests. Legacy static analysis works without Docker.

```bash
npm ci
npm run build
npm run sandbox:build
npm run test:runtime
npm run dev
```

Open **http://127.0.0.1:5173**. The development API runs at **127.0.0.1:3001**. Stop both with Ctrl+C.

On macOS, install Xcode command-line tools and the current build tools first:

```bash
xcode-select --install  # if command-line tools are missing
brew install flex bison make
export PATH="$(brew --prefix flex)/bin:$(brew --prefix bison)/bin:$(brew --prefix make)/libexec/gnubin:$PATH"
open -a Docker
```

Keep that PATH when rebuilding; Apple's bundled Bison is too old. Apple Silicon uses the ARM64 Docker image without forced x86 emulation. The native academic engine and frontend build on macOS; Clang LibTooling runs inside Linux Docker, with no host LLVM installation required. On Debian/Ubuntu, install `build-essential flex bison make` plus Node and Docker.

For the production frontend served locally by Express:

```bash
npm run build
npm start
# http://127.0.0.1:3001
```

Rebuild the sandbox after changes to the engine, Makefile, Dockerfile, or sandbox runner. `OPTISCOPE_IMAGE` selects another compatible local image. `PORT` changes the API port; update Vite's development proxy accordingly.

## Workspace

The frontend uses a reference-inspired retro desktop style: locally bundled bitmap headings, blue accents, pale surfaces, crisp borders, and restrained transitions. Each part of the workflow has its own route.

| Page | Route | Purpose |
| --- | --- | --- |
| Home | `/` | Overview, modes, and entry points |
| Analyze | `/analyze` | Upload, sample loader, frontend selection, source, analyze/profile controls |
| Results | `/results` | Summary, complexity, hotspots, runtime chart, source highlighting, recommendations, output |
| AST | `/ast` | Expandable typed AST, region index, assumptions, compiler diagnostics and coverage |
| Samples | `/samples` | Eight academic demos and 12 categorized DSA/modern/stress fixtures |
| About | `/about` | Pipeline, architecture, modes, and limitations |
| Compare | `/compare` | Before/after execution-only benchmark |

Source, selected mode, results, selected regions, and comparison state stay in memory when navigating. Refreshing or closing the tab clears the workspace. Empty result pages invite a real analysis; they never show fabricated measurements.

### Choose a compiler frontend

| Mode | Behavior | Use it for |
| --- | --- | --- |
| **Auto** | Tries the academic parser first and uses sandboxed Clang if it rejects the input. Legacy success retains established results. | Existing demos and a convenient default |
| **Clang** | Real Clang 14 LibTooling C++17 syntax and semantic analysis in Docker. | STL, classes, templates, lambdas, modern syntax, DSA programs, compiler diagnostics |
| **Legacy** | Only the independently tested Flex/Bison academic subset. No Docker needed for static analysis. | Teaching lexer/parser stages and supported small programs |

Auto's legacy success is a structural parse, not full C++ semantic validation. Choose Clang explicitly when semantic diagnostics matter. Parsing success, inference coverage, instrumentation support, and runtime completion are separate outcomes.

## Practical walkthrough

1. Open **Analyze**, keep **Auto**, select `nested.cpp`, and click **Load Sample**. Alternatively upload one `.cpp` file, up to 128 KiB.
2. Click **Analyze**. Successful analysis opens **Results** with the real summary: one function, two loops, depth two, and `O(n^2)` for this fixture. Static timings remain unavailable.
3. Click **Run Profiling**. Docker compiles and executes the program. Inspect exclusive/inclusive time, loop-scope invocation counts, the chart, and program output. Durations vary by machine and run.
4. Select a hotspot or chart bar to highlight its source. Open **AST**, expand functions and loops, and use **Locate** or the region index to inspect the same selection.
5. Open **Samples** and filter by **DSA**, **Modern C++**, or **Stress**. **Open** loads the actual fixture into Analyze and selects Clang; it does not execute the program automatically.
6. Try `sequential.cpp` for separate linear loops, `mixed_hotspots.cpp` for independent input sizes, `logarithmic.cpp` for multiplicative progression, and `patterns.cpp` for evidence-based recommendations.
7. Optionally open **Compare** from the footer or Results. Upload `samples/comparison/original.cpp` and `optimized.cpp`, then compare them in Docker.

The DSA corpus covers arrays/Kadane/prefix sums, sorting/search, strings/two pointers/window, linked lists, stacks/queues, trees/BST, graph algorithms, union-find, dynamic programming, backtracking, modern containers/syntax, and an 18-benchmark stress program.

## Features and interpretation

- **Two real compiler frontends, one shared typed IR.** Clang handles broad C++17 syntax; the academic Flex/Bison frontend remains independently usable and tested.
- **Source-linked region analysis.** Stable region IDs connect AST nodes, original source byte/line spans, instrumentation, and runtime records.
- **Conservative complexity classification.** Clang estimates carry `exact_pattern`, `estimated`, or `unknown` confidence. Canonical linear/product/logarithmic loops, independent nesting, sequential dominance, safe range iteration, and narrow guarded recurrence patterns have explicit assumptions. Unknown cases remain unknown.
- **Rule-based recommendations.** Scan/indexing candidates, invariant arithmetic, and provably simple repeated calls include evidence and semantic caveats. Measured runtime guidance is distinguished from AST pattern detection. There is no AI optimizer or guaranteed sorting replacement.
- **Real profiling.** A separate instrumented source uses RAII scopes and `std::chrono::steady_clock`. Linux `g++ -std=c++17 -O0` compiles the actual upload. Only successful completion yields trusted measured values.
- **Inclusive and exclusive timing.** Inclusive time contains child regions; exclusive time subtracts them and determines ranking. Contribution uses measured `main()` time, rather than adding nested inclusive durations.
- **Invocation counts.** Counts represent entries into the whole loop scope, including repeated calls; they are not loop-body iteration counts. Unexecuted and unsupported regions are labeled separately.
- **Before/after comparison.** Uninstrumented `-O2` executables receive one warm-up and ten alternating runs each. Every run must match stdout/stderr and exit zero before speedup statistics appear. Raw wall times and compiler/image/environment metadata remain inspectable.

Named input-size variables remain symbolic even when a fixture initializes them to constants. Overall complexity is a structural envelope across definitions, not a general call-graph proof. Complexity predicts growth under assumptions; it does not predict a measured duration.

## Architecture

```text
frontend/src/
  controllers/       WorkspaceContext + analysis/comparison controller hooks
  models/            Response validation, source validation, region presentation
  services/          API client
  views/
    layouts/         Shared navbar, workspace strip, route shell, footer
    pages/           Home, Analyze, Results, Structure, Samples, About, Comparison
    components/      Reusable controls, diagnostics, summaries, output
  components/        AST, source viewer, hotspot table, runtime chart
backend/src/
  routes/ controllers/ services/ models/ middleware/ infrastructure/ config/
engine/
  clang/ lexer/ parser/ include/ src/ Dockerfile
samples/
  *.cpp              Eight academic demos
  dsa/               Twelve C++17 fixtures
  comparison/        Before/after example
tests/              Compiler, API, Docker, MVC, presentation, routing/state tests
docs/               Specifications, architecture, API, validation, walkthrough
```

React Router handles navigation; one workspace provider keeps controller hooks mounted across pages. Views present data, model helpers normalize it, and the API service owns HTTP calls. Express routes delegate to controllers and services; bounded per-job workspaces isolate native academic analysis and Docker jobs. Both compiler frontends feed shared region, complexity, recommendation, instrumentation, and serialization modules.

The original `/api/samples` contract stays unchanged. Additive, allowlisted `/api/corpus` and `/api/corpus/:name` endpoints serve the existing DSA fixtures. Analysis/profile mode selection and multipart uploads retain their existing contracts. See [API documentation](docs/API.md).

### Docker isolation

Parsing with Clang and compiling/running uploads use the restricted sandbox: non-root UID/GID 65534, no network, read-only root and input, dropped capabilities, `no-new-privileges`, 256 MiB memory, one CPU, 64 PIDs, bounded tmpfs mounts, output caps, and execution timeouts. Only an isolated job directory is mounted. At most two jobs run concurrently. The web service binds to loopback and validates local Host/Origin.

This is a local prototype, not a public multi-tenant code-execution service. Keep it local. See [known limitations](docs/KNOWN_LIMITATIONS.md) for measurement and operational boundaries.

## Testing and verification

```bash
npm run build
npm test
npm run test:runtime
```

`npm test` runs compiler, API, presentation, MVC, route/state, and runtime checks. Docker-dependent tests may explicitly skip when the sandbox is unavailable. **`npm run test:runtime` requires Docker and fails if the runtime prerequisites are missing.**

Route tests check direct HTTP entry points, distinct page content, actual sample loading, analysis/profile navigation, source selection, comparison-file persistence, and corpus launch behavior. DOM tests use real HTTP responses and Docker measurements when available. Chart-container geometry is supplied by the DOM test harness; this is not a visual browser test.

The redesign build passed; both test commands passed **94 tests, 0 failures, 0 skips** with Docker available. See [validation results](docs/VALIDATION.md) for recorded evidence. Browser visual/click/viewport QA remains **unverified**: no browser provider was connected during this redesign. No screenshot is presented as verified evidence.

## Limitations

- Broad C++17 parsing does not imply complete complexity inference. General graph/DP/memoization behavior, branching recursion, pointer/alias effects, unknown calls, and many dependent bounds remain unknown.
- Macro-boundary, constexpr, and goto/labelled regions can be visible but excluded from rewriting. Diagnostics explain exclusions.
- Profiling is single-threaded and expects a deterministic, noninteractive program that completes normally with exit zero. Third-party headers and multiple translation units are not installed or resolved automatically.
- One instrumented `-O0` run includes timer and scheduling overhead. Tiny or frequently entered regions can be dominated by that overhead; warnings remain visible. This is not a production benchmark or statistical speedup guarantee.
- Comparison checks one fixed workload, not universal program equivalence. It does not accept stdin fixtures or configurable repetitions.
- Native macOS LibTooling compilation is **unverified**. The supported Clang build is inside the Linux Docker image; native macOS legacy and frontend builds are verified.
- Workspace data is in memory. Refresh, tab closure, crash recovery, cancellation, durable queues, and report export are not implemented.
- Browser layout, focus appearance, hover behavior, and small-screen geometry need manual verification. Automated DOM and HTTP checks do not establish visual quality.

## Screenshots and project notes

The redesign follows the supplied Retro-OS UI Kit reference without copying its component gallery. Actual screenshots have not been captured; run the walkthrough above and complete the [UI verification checklist](docs/UI_DESIGN_GUIDE.md) before adding screenshots to this README.

Further reading: [MVC architecture](docs/MVC_ARCHITECTURE.md) · [code walkthrough](docs/CODE_WALKTHROUGH.md) · [practical demo](docs/PRACTICAL_DEMO_GUIDE.md) · [validation](docs/VALIDATION.md) · [limitations](docs/KNOWN_LIMITATIONS.md).
