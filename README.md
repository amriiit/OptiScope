# OptiScope

**Compiler-Assisted Performance Hotspot Analyzer** — a working local Compiler Design Review 1 MVP. Upload a supported C++17 program, inspect a real Flex/Bison AST, and explicitly profile its loops inside a restricted Docker container. The React dashboard presents source-linked regions, structural complexity reasoning, real exclusive/inclusive durations, an AST tree, charts and deterministic recommendations.

## Install and start (Apple Silicon Mac)

Prerequisites: Node.js 22.12+ or 24+, Xcode command-line tools, Homebrew, Docker Desktop with its daemon running. The analysis executable is native to your Mac; submitted programs are compiled and run only in Linux containers. The Docker image builds natively for ARM64 on Apple Silicon; no forced x86 emulation is needed.

```bash
cd "/Users/amrit/Desktop/OptiScore-CD Project"
# Run xcode-select --install if the command-line tools are absent.
brew install flex bison make
export PATH="$(brew --prefix flex)/bin:$(brew --prefix bison)/bin:$(brew --prefix make)/libexec/gnubin:$PATH"
open -a Docker
npm ci
npm run engine:build
npm run sandbox:build
npm run dev
```

Open **http://127.0.0.1:5173**. Express listens at **127.0.0.1:3001**. Stop with Ctrl+C. Keep the Terminal PATH above when rebuilding: Apple's bundled Bison is too old; Bison 3.8+ is required. GNU Make 4.3+ is recommended (`brew install make`); the Makefile uses a grouped generation target. `CXX=g++ make engine` selects another installed C++17 compiler if desired; Apple's default `c++` builds the static engine too. Runtime compilation always uses Linux `g++ -std=c++17 -O0`.

For a built frontend served by Express on a single port:

```bash
npm run build
npm start
# http://127.0.0.1:3001
```

For Debian/Ubuntu: install `build-essential flex bison make python3` plus Node and Docker, then use the same npm commands. Python is needed **inside the Docker image**; the web app does not need host Python. Docker image rebuilding is needed after changes to `engine/`, the Makefile or `sandbox.py`.

Static analysis works while Docker is stopped or the image is missing. The dashboard displays the exact unavailable condition and never manufactures runtimes. `OPTISCOPE_IMAGE` can choose another locally built compatible image; `PORT` changes the Express port (also adjust Vite's proxy for development).

## Faculty demo: clicks and talking points

1. In the sample selector choose **nested.cpp**, click **Load Sample**, then **Analyze**. Alternatively, use the uploader to choose `samples/nested.cpp` from this folder. You should see 1 function, 2 loops, nesting depth 2 and **O(n²)**. Expand the AST to show `FunctionDecl → Block → ForStmt → ForStmt` and the arithmetic expressions. Click a hotspot row or AST **Locate** to highlight its exact source lines.
2. Click **Run Profiling**. Compilation and execution happen only now. Show the real program output, loop-scope call counts in the API, exclusive/inclusive table, main runtime and chart. Inner time is subtracted from the parent for ranking; explain the different meanings of inclusive and exclusive time. A substantial measured region can trigger explicitly labeled general runtime guidance.
3. Load **sequential.cpp**, Analyze: 2 loops but depth 1 and **O(n)**. Profile to show two separate measured regions. Two sequential O(n) loops do not become O(n²).
4. Load **mixed_hotspots.cpp**, Analyze: **O(small³ + large²)**, with two independent size parameters. Profile: the larger-input quadratic section is slower than the small cubic section. Click the top ranked measured region to show its source. The innermost quadratic loop can rank first because ranking uses exclusive time.
5. Load **logarithmic.cpp**, Analyze: multiplicative and divisive progression produce **O(log n)**. Profile and point out the low-confidence duration warning: a tiny instrumented workload is not a reliable benchmark.
6. Load **patterns.cpp**, Analyze: inspect four deterministic AST recommendations with evidence and caveats. Profile if desired. No AI or guaranteed speedup claims are involved.

Do not promise identical durations or rankings between machines. Timers, Docker scheduling and `-O0` change costs. No production dashboard numerical values are hardcoded.

## Architecture and files

```text
frontend/
  src/components/SourceViewer.jsx  source ranges and line highlighting
  src/components/Hotspots.jsx      region table, timings and reasoning
  src/components/RuntimeChart.jsx  Recharts exclusive-duration chart
  src/components/AstTree.jsx       collapsible typed AST
  src/pages/Dashboard.jsx          uploads, API calls, samples, results
  src/App.jsx, src/main.jsx, src/index.css
  index.html, vite.config.js, postcss.config.js
backend/
  src/server.js                    loopback Express server + built UI
  src/routes/api.js                upload validation, samples, concurrency
  src/services/analyzer.js         jobs, engine, Docker, measurement joins
  src/services/process.js          argument-array subprocesses and caps
  src/services/sandbox.py          container-only compiler/program runner
engine/
  lexer/lexer.l                    real Flex lexer + byte/line locations
  parser/parser.y                  Bison C++ grammar + semantic AST actions
  include/ast.hpp                  node kinds, typed nodes, shared ownership
  src/main.cpp                    traversals, complexity, rules, rewriting
  Dockerfile                      Linux compiler/analysis environment
samples/                          six complete C++17 programs
tests/engine.test.mjs              lexer/parser/analysis/instrumentation tests
tests/api.test.mjs                 real multipart HTTP API tests
tests/runtime.test.mjs             real Docker compilation/execution tests
docs/API.md                       full response contract
docs/FILES.md                     complete created-file inventory
docs/VALIDATION.md                actual build/test results and limitations
Makefile, package.json, package-lock.json, .gitignore, .dockerignore
```

`npm run dev` runs frontend/backend together. `npm run build` builds the native analysis engine and Vite frontend. `npm test` builds the engine and tests static analysis/API; real runtime tests run if the Docker image is available, otherwise they are explicitly skipped and Docker-unavailable behavior is tested. **`npm run test:runtime` requires Docker and refuses to skip it.**

The lexer tracks original UTF-8 byte offsets and lines, including comments and opaque includes. The Bison grammar builds memory-owned typed AST nodes with source ranges. A scoped declaration table resolves local names/parameters and reports unresolved or duplicate declarations as compiler-validation warnings. This is not a full C++ type checker.

Loop IDs are assigned in preorder and shared by AST JSON, static regions, instrumentation and runtime joins. Instrumentation inserts RAII scopes immediately around AST loop statements, applying edits from right to left, including shared nested end offsets. This preserves unbraced loops and dangling-else association for the supported subset. A separate `instrumented.cpp` is generated; `original.cpp` remains untouched. Original diagnostic lines are restored with `#line`.

The sandbox compiles actual code, executes it, captures stdout/stderr and reads a dedicated profiling file. `std::chrono::steady_clock` measures region scopes and `main()` separately. A single-threaded timer stack subtracts children's inclusive time to compute exclusive time. Repeated loop-scope entries aggregate by region ID. Recommendations and source regions are joined to measurements without estimating/filling missing runtimes.

## Supported C++ subset

- Function definitions with `int`, `double`, `bool`, `void` return types; simple typed scalar parameters; empty parameter list for `main()`.
- Local scalar declarations with optional initializer; one declarator per statement. Basic one-dimensional local arrays (`int values[180];`) and array indexing.
- Blocks, expression/empty statements, `for`, `while`, `if`/`else`, `return`.
- Decimal integer/floating literals, strings for simple calls, `true`/`false`, identifiers, parentheses.
- `+ - * / %`, comparisons, `&& || !`, assignment and `+= -= *= /=`, prefix/postfix `++ --`.
- Direct identifier function calls, e.g. `scale(x)` and `printf("%d\n", x)`.
- `//` and block comments, common `#include <...>` / `#include "..."` directives as opaque lines. Includes are not semantically interpreted by the parser. Compiler validation happens inside Docker.

Not supported: macros, global variables/prototypes, pointers/references, namespaces/`std::` member access, classes, templates/STL syntax, streams, `const`/`volatile`/storage specifiers, other integer types, characters, initializer lists, comma declarations/operators, ternary expressions, range-for, `do`, `break`/`continue`, switch/goto, exceptions, threads, interactive stdin, multiple translation units. Unsupported tokens/keywords/syntax cause explicit parse errors. Invalid but syntactically accepted C++ (wrong argument types, missing declarations, etc.) is diagnosed by real compilation; static analysis is not a proof of compilability. Standard scalar `printf` is used by samples because iostream namespace syntax is outside the subset.

## Complexity model: explain this honestly

Estimates are symbolic structural costs under explicit assumptions, not exact runtime predictions.

- A named bound `n` is a size parameter **even if demo code initializes `n` to a literal**. This lets executable, deterministic samples illustrate input-size families. Loops using only literal initializer/bound/constant steps are O(1) relative to named input sizes.
- Canonical monotone constant-step loops are linear in their independent named size. Constant multiplication/division toward a safe bound gives logarithmic estimates. Arithmetic must not overflow, and the body must not mutate the bound or induction variable.
- Nested independent loops multiply. Sequential terms add, equal/dominated terms collapse. Independent `small` and `large` remain separate terms rather than pretending they are the same `n`.
- Conditional paths use a conservative upper envelope. Early returns may reduce real work. Dependent triangular bounds, body-mutated bounds, unsupported progressions and unknown callee effects produce **Unknown**. While loops are parsed/profiled but their complexity is Unknown.
- Only very simple local functions consisting of one arithmetic return over parameters/literals are treated as side-effect-free constant-cost callees. Other calls are Unknown. Bounded scalar `printf` is modeled as unit cost outside loops; I/O latency is not an asymptotic estimate. Loop bodies containing external calls conservatively prevent a canonical estimate.
- The summary is the dominant structural cost **across function definitions**, not a call-graph or recursion analysis. Reasoning and assumptions accompany each loop estimate.

## Five deterministic recommendation rules

1. Established linear inner equality scan: membership-query candidate, with semantics caveats.
2. Invariant side-effect-free multiplication/division whose identifiers are not written anywhere in the loop: consider hoisting; preserve zero-iteration/exception behavior.
3. Nested indexed pairwise equality: consider indexing only if matching semantics permit it.
4. Repeated call to a provably simple pure local function with invariant arguments: consider reuse; it is **not labeled expensive** without evidence.
5. Measured region with at least 20% of main runtime and adequate measurement confidence: **general runtime guidance**, clearly distinct from AST pattern detection.

Rules 1/3 recognize comparison/scan candidates; they do not prove an equivalent hash-based replacement. All recommendations provide evidence and caveats. A quadratic sorting detector is **not implemented**; comparison loops alone are insufficient evidence of a replaceable sort. No ML/AI integration exists.

## Sandbox and local-only operation

Compile and run use `docker run` with no network, UID/GID 65534, 256 MiB RAM/swap ceiling, one CPU, 64 PIDs, dropped capabilities, `no-new-privileges`, read-only root, restricted temporary mounts, 128 file descriptors and 64 MiB file-size limit. Only the isolated per-job directory is mounted read-only; no repository, secrets or credentials are mounted. `/work` is an executable 96 MiB tmpfs; `/tmp` is a 16 MiB noexec tmpfs. Compilation has 20 seconds; execution 5 seconds; Docker orchestration 35 seconds. stdout/stderr are capped at 64 KiB per stage; outer subprocess output is also capped. At most two jobs run concurrently. Cleanup occurs on normal/error/timeout paths; named containers are force-removed in `finally`.

The server binds to loopback, validates local Host/Origin, has no permissive CORS, and never exposes a public deploy. Docker is a prototype isolation boundary, not a guarantee against kernel exploits; do not publish this service or use it as a multi-tenant execution platform. Profile output remains program-controlled data; malicious timing-file tampering is outside the measurement model. Abrupt backend/OS termination can interrupt cleanup; regular paths are covered by tests.

## Measurement limits and next phase

Timers count an entire loop scope, including condition/update and body. `calls` means scope entries, not iterations. A zero-iteration loop still measures its condition; a branch-unreached loop is unexecuted. Inclusive/exclusive times are wall-clock time, not CPU cycles. Percentages use measured `main()` time, and exclusive totals never intentionally double-count nested work. Startup before main and global teardown after main are excluded. Profiling rejects external calls other than `printf`; calls to functions defined in the uploaded file remain supported. This excludes direct OS, random-number and threading APIs from the runtime subset. Programs must be deterministic, single-threaded and return normally; abrupt exit or crashes do not produce trusted completed profiles. Only successful zero-exit executions receive runtime results.

Instrumentation costs are significant for tiny or frequently entered regions. The UI flags aggregate exclusive times below 0.1 ms or average exclusive time below 1 µs, and always warns about overhead. A single O0 run cannot establish production performance or a guaranteed optimization speedup. General recommendation absence on tiny programs is intentional.

Next phase: conservative type checking and dataflow, richer loop recurrences, triangular bounds, bounded call graphs, a proven sorting-pattern detector, more syntax, calibrated multi-run benchmarks/input families, and further sandbox hardening. These are not claimed as implemented MVP features.
