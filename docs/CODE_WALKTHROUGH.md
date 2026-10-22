# Code walkthrough

## Source → API → engine

1. `frontend/src/views/components/UploadPanel.jsx` forwards file selection/drop events to `useAnalysisController.openFile` in `frontend/src/controllers/useAnalysisController.js`. `readSourceFile` in `models/sourceModel.js` checks extension, nonempty size, 128 KiB ceiling, NUL bytes and fatal UTF-8 decoding. Loading source clears old results and selected IDs.
2. `useAnalysisController.loadSample` uses `apiClient.getSample`; the source is the actual bundled file. `run` explicitly chooses `analyze` or `profile`; no upload automatically executes code.
3. `frontend/src/services/apiClient.js` constructs multipart field `file`. The server's local Host check is in `backend/src/middleware/localOnly.js`; write routes additionally require a local Origin when one is supplied. `middleware/upload.js` enforces multipart limits.
4. `AnalysisController.analysisAction` validates with `SourceUpload.sourceUpload`, calls shared `withJob` and then `AnalysisService.analyzeSource`. `busyResponse` preserves HTTP 429 at two active jobs. Invalid upload is 400, oversize 413, parser failure 422, and successful static analysis 200 even when profiling fails.
5. `JobWorkspace.createWorkspace` creates a unique temporary directory and `original.cpp`; its source is never rewritten. `FrontendRunner.parseInWorkspace` selects the frontend; its legacy path `EngineRunner.analyzeInWorkspace` invokes `engine/build/optiscope` with argument arrays and separate `instrumented.cpp` output. `ProgramRegion.validateRegions` validates IDs and source spans before results are admitted.

## Legacy Flex/Bison and typed AST

`engine/src/main.cpp` reads source and calls `parseLegacy` in `engine/src/legacy_frontend.cpp`. That frontend opens `yyin` and runs `opti::Parser::parse`; main then constructs `optiscope::Analysis`, optionally writes instrumentation, and calls `serialize`.

`engine/lexer/lexer.l` supplies `yylex`: it advances UTF-8 byte offsets and line/column positions through every token, whitespace and comment. Includes remain opaque. Unsupported keywords/directives and characters produce errors.

`engine/parser/parser.y` is Bison's C++ LALR grammar. Semantic actions call `make<Kind::...>` from `engine/include/ast.hpp`, producing smart-pointer-owned typed nodes with child relationships and original `Loc` spans. Expression precedence is encoded in the grammar. The AST is not a regex-generated JSON substitute.

## Symbolic complexity and regions

`engine/src/complexity.cpp` owns `Term`, `Cost` operations through `add`, `mul`, internal `dominates`/`normalize`, `show` and `loopIterations`. Exponent maps retain independent named sizes and logarithmic factors. Sequential work adds and discards dominated terms; nested independent work multiplies.

`loopIterations` examines the real for-loop initializer, comparison, progression, bound identifiers, body writes, ancestor induction variables and known pure calls. Unsafe progressions/dependent bounds stay Unknown. Literal-only loops are constant relative to named sizes. While-loop cost remains Unknown; no claim of V1 while-loop inference is made.

`engine/src/regions.cpp`: `Analysis::run` inventories functions and conservative pure-return helpers, then `Analysis::analyze` registers deterministic preorder R1/R2 IDs, records function/depth/source nodes, composes costs, and calls `Analysis::symbols`. Parent/enclosing context is recovered from the AST; the API retains its existing region schema without a separate parentRegionId field. `Analysis` is per-program state.

## Recommendations

`engine/src/recommendations.cpp`: `Analysis::recommend` traverses AST patterns. It recognizes invariant arithmetic, repeated simple pure calls, indexed nested pairwise equality and established linear equality-scan candidates. It carries source evidence and semantic caveats; it suppresses tested near-misses. It does not detect sorting, invoke AI or automatically optimize code.

`backend/src/services/RecommendationService.js`: `addRuntimeRecommendations` adds general review guidance only for sufficiently large/confident measured contributors. This is explicitly separate from an AST optimization rule.

## Instrumentation and runtime

`engine/src/instrumenter.cpp`: `instrument` adds RAII timer scopes at original byte offsets, applies edits in descending stable order, adds a main timer, and prefixes `profilerRuntime()` from `engine/src/profiler.cpp`. Shared-end nested edits, unbraced loops, dangling else and early return are regression-tested.

The generated `optiscope_internal::Timer` uses `std::chrono::steady_clock`, a nested active stack and per-ID `Record`. Destructor elapsed time contributes inclusive duration; direct child intervals are subtracted for exclusive duration and propagated upward. `calls` counts whole-loop scope activations, not iterations. `Total` writes main wall time and records to `/work/profile.tsv` on normal return.

`ProfilingService.profileInWorkspace` checks main, legacy local-call restrictions or Clang runtime limitations, and Docker availability; `DockerRunner.runSandbox` owns isolation arguments. `backend/src/services/sandbox.py:run` bounds stage time/output and kills process groups. Profile compilation uses `g++ -std=c++17 -O0`; only completed zero-exit execution is merged.

`ProfileRecord.parseProfile` validates total, IDs, unique rows, safe integers, calls and inclusive/exclusive invariants. `HotspotService.mergeMeasurements` joins IDs, labels unexecuted regions, checks exclusive totals against main time, calculates exclusive/main percentages, sorts descending exclusive durations and adds timing caveats. `AnalysisService` clears incomplete measurements on errors and cleans containers/workspaces in `finally`.

## JSON → views

`engine/src/serialization.cpp:serialize` emits the existing JSON contract and original AST. `analysisModel.analysisResponse` admits the envelope; `summaryCards` derives metric display values. `regionModel.regionPath` and `enclosingRegions` interpret existing AST context. `Hotspots` forwards region selection, `SourceViewer` highlights original lines, and `AstTree` opens the selected path. `RuntimeChart` uses actual exclusive durations with a scrollable region chart. No component creates runtime facts.

## Comparison

`ComparisonController.compare` validates `original`/`optimized` multipart fields under the same job limiter. `ComparisonService.compareSources` writes a second isolated input, checks Docker, records source hashes/image ID/timestamp and invokes the comparison sandbox mode.

`sandbox.py:compare` compiles both uninstrumented with identical `-O2` flags, performs one warm-up each and ten measured runs each in alternating AB/BA order. `perf_counter_ns` measures subprocess wall time including startup/capture overhead. Every run must exit zero and match the first run's stdout/stderr/exit tuple. Compilation is bounded at 20 seconds per file, execution at two seconds, and the whole execution phase at 25 seconds; Docker orchestration is capped at 75 seconds.

`ComparisonResult.statistics` computes raw timings, median, mean, min/max and population standard deviation. `comparisonResult` permits ratios only after completed equal-output runs, and warns about short/noisy measurements. `useComparisonController` owns file/action state; `views/pages/Comparison.jsx` displays all statistics and expandable raw evidence. This is explicitly execution-only, fixed-internal-input comparison; it does not claim to parse STL or prove semantic equivalence.


## Clang C++17 path

`backend/src/infrastructure/FrontendRunner.js:parseInWorkspace` preserves legacy success in auto mode; on failure or explicit clang mode it calls `DockerRunner.runSandbox(..., 'clang')`. Container `sandbox.py:analyze_clang` invokes the trusted LibTooling binary without running the submitted main. It reads the separate `/work/instrumented.cpp`, returns the analysis plus bounded rewrite text, and the backend writes that artifact into the isolated job directory for a later explicit profiling action. Parser containers are cleaned in `finally`, including static requests.

`engine/clang/frontend.cpp:parseClang` builds a Clang AST with fixed C++17 flags and installed Linux standard headers. `Diagnostics::HandleDiagnostic` records message/severity/physical line/column and whether it belongs to the main file. `Normalizer` uses typed AST APIs to discover main-file functions, methods, templates and lambda bodies. `convert` lowers standard loops/branches/expressions/declarations into the shared IR. Unmodeled expressions/statements become Opaque nodes retaining children. `callFacts` resolves callees and standard declaration contexts; `containerKind` uses actual Clang record declarations, not spelling matches.

`Normalizer::location` derives UTF-8 offsets from SourceManager and extends statement endings through necessary semicolon tokens using Lexer APIs. `loop` marks macro boundaries, constexpr and labelled/goto functions unsafe for source wrapping. Other source nodes are retained. Native/source serialization retains the established fields and preorder IDs.

`complexity.cpp:loopIterations` has a modern-only path for stable container sizes/ranges, product bounds and narrow triangular envelopes. `Analysis::analyze` still adds sibling terms/multiplies nested work; ancestor-induction factors are substituted by an enclosing upper envelope. Opaque effects/unknown calls remain Unknown, and allocation/copy semantics are not assumed free. `stl_costs.cpp:libraryCost` accounts for iterator category, scalar elements, overload/callback limits, worst-case mutation and hash behavior. `recurrences.cpp:inferRecurrence` detects direct self-calls and solves only a guarded integer n-1 recurrence with no loops/mutation/unknown operations; it does not substitute this result into arbitrary calls.

`engine/clang/main.cpp` uses the shared serializer, then adds Clang-only metadata (`frontend`, `diagnostics`, `operations`, `recurrences`, region confidence/instrumentation and detailed loop-kind counts). This keeps native legacy JSON goldens identical. `Total` in `profiler.cpp` enables region recording only during main; global constructors/destructors cannot contaminate its denominator. Timers still aggregate nested/reentrant scope entries with inclusive/exclusive accounting.

`useAnalysisController.changeFrontend` clears stale results; `selectDiagnostic` highlights a physical source line separately from region selection. `AnalysisCoverage.jsx` renders parsing status, diagnostics, exclusions, operation assumptions and recurrence coverage. `Hotspots` displays confidence and distinguishes excluded instrumentation from unexecuted scopes. `AstTree` labels Clang normalized IR or the academic parser correctly. `apiClient.analyzeSource` adds the optional validated frontend query; controllers stay thin.

### STL cost registry policy

`libraryCost` uses Clang's standard declaration context, canonical container record kind, scalar element facts, full-range iterator origin and argument-count restrictions. It never selects a model from the uploaded filename or an identifier resembling `vector`.

| Recognized operation shape | Conservative model |
|---|---|
| size/empty/begin/end accessors | Unit operation under the recognized standard-container contract |
| scalar full random-access `sort` | N log N comparisons |
| scalar full random-access `stable_sort` | N log² N conservative C++17 comparison upper bound without guaranteed extra memory |
| reverse/find/count/accumulate/min/max element over a recognized full range, no custom callback | Linear traversal with stated scalar-operation assumptions |
| lower_bound/upper_bound/binary_search | Logarithmic random-access steps; linear forward/bidirectional advancement; partition/sorted-range precondition |
| scalar two-value min/max/swap | Unit comparison/copy assumption; bound/induction mutation still suppresses unsafe loop estimates |
| vector append/emplace/single-element insertion/erasure | Worst-case linear movement/reallocation; amortized append described separately |
| ordered/hash/heap operations covered by the registry | Conservative bounds with duplicate, hashing and allocation caveats; unsupported overloads remain Unknown |

Primary specification references: [C++17 sorting requirements](https://timsong-cpp.github.io/cppwp/std17/alg.sort) and [binary-search iterator complexity](https://timsong-cpp.github.io/cppwp/std17/alg.binary.search). These are source-level operation models, not measured wall-time predictions. Opaque argument evaluation can still make the enclosing cost Unknown.

The normalized tree is analysis-oriented, not a complete visual replica of Clang's AST: namespace/class wrappers and global declaration inventories are not rendered as full compiler nodes. Source methods/constructors/functions and their analyzable bodies are retained, while unknown semantics remain visible as opaque nodes or operation coverage.

For Clang-derived recommendations, `Analysis::recommend` now abstains on opaque/lambda effects, pointer-based state, reference writes and unproved mutating calls. This prevents the legacy direct-write heuristic from falsely labeling swap/alias-mutated arithmetic invariant.

## Multi-page route and state flow

`App.jsx` wraps the route tree in one `WorkspaceProvider`. Its analysis/comparison hooks remain mounted when `SiteLayout` changes outlets. Home links into Analyze, where `UploadPanel` and `AnalysisActions` use the shared controller. Successful analysis/profile actions open Results only while Analyze is still active; navigating away permits background completion without a surprise redirect. Results and Structure read the same source, result and selected region/diagnostic. Comparison reads the persistent comparison controller.

`Samples.jsx` fetches corpus metadata through `apiClient.getCorpus`. `loadExample` reads either an academic sample or an allowlisted corpus source through the API, clears stale results and selects the fixture's frontend before opening Analyze. No sample launch executes source automatically. Local state in the library owns category filtering; workspace state owns loaded source and results.
