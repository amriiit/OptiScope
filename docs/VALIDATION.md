# Validation record

Validated on 19 October 2026 on Apple Silicon macOS, Node v24.18.1, Flex 2.6.4, Bison 3.8.2, native Apple C++17 compiler, Docker Desktop (Linux ARM64 image), container GNU g++ 12.2.

## Actual completed checks

- `npm install`: dependencies installed successfully. The original Tailwind 3 dependency tree reported vulnerabilities, so the project was updated to Tailwind 4 and its PostCSS plugin. The subsequent install audit reported **0 vulnerabilities**; final `npm audit --omit=dev` also reported 0.
- `npm run build`: **passed**. Flex/Bison generation and the native engine compiled; Vite produced a production React build. Final JS chunks were approximately 231 kB application and 378 kB chart dependencies before compression. Apple's compiler emits an unused-variable warning in Bison-generated code; no handwritten-code build errors occurred.
- `docker build -f engine/Dockerfile -t optiscope-sandbox:local .`: **passed**, including the Linux Flex/Bison/C++ analysis engine build.
- `npm run test:runtime`: **17 tests passed, 0 failed, 0 skipped** in the final run. The test command requires real Docker/image availability; no mocked runtime measurements are involved.
- Running `GET /api/health`: status `ok`, sandbox `available: true`, max upload size 131072 bytes.
- Running Vite endpoint returned the actual React application HTML. Development servers started successfully at 127.0.0.1:5173 and 127.0.0.1:3001.
- After tests, `docker ps --filter name=optiscope-` returned no leftover sandbox containers.

## Sample execution evidence

Every sample was parsed and analyzed. Both original and instrumented variants were separately compiled with real g++ inside restricted Docker containers, executed, and their stdout compared exactly. These are actual observed outputs (also computed by the programs during every test):

| Sample | Structural result | Real stdout | Runtime validation |
| --- | --- | --- | --- |
| linear.cpp | O(n), 1 loop, depth 1 | `linear: 38398852` | Measured region and main time |
| nested.cpp | O(n^2), 2 loops, depth 2 | `nested: 69103152` | Outer scope entered once; inner scope 1200 times |
| sequential.cpp | O(n), 2 loops, depth 1 | `sequential: 58098494` | Two independent measured scopes |
| logarithmic.cpp | O(log n), 2 loops, depth 1 | `logarithmic: 3048567` | Both multiplicative and divisive loops executed; timer-sensitive |
| mixed_hotspots.cpp | O(small^3 + large^2), 5 loops, depth 3 | `mixed: 325379525` | Quadratic section's inclusive time exceeded cubic section; highest exclusive region belonged to quadratic section |
| patterns.cpp | O(n^2), 3 loops, depth 2 | `patterns: 2610` | Four supported static rules fired, runtime also completed |

The tests check positive measured totals, inclusive >= exclusive, exclusive-region totals <= main wall time, nonzero call counts, stable AST/region/profiler IDs, and descending measured exclusive ranking. Duration numbers are intentionally not a fixture or a dashboard constant: they vary per execution and machine.

## Specific tested behavior

- Real Flex tokens: literals, comments, includes, declarations, arithmetic/comparisons/logical operations, compound assignment, prefix/postfix operations, arrays and direct calls.
- Real Bison AST shapes: functions/parameters, blocks, for/while, if/else, returns, expressions and arrays.
- Static counts, nested multiplication versus sequential dominance, logarithmic progression, constant-step loops, literal fixed bounds, conditional upper-envelope assumptions.
- Conservative Unknown estimates for mutated/induction-dependent bounds, unknown calls, wrong-direction progression and while loops.
- Dominance of linear over logarithmic sequential terms while retaining n*log(n) over n.
- Stable source offsets and IDs, including multibyte UTF-8 comments.
- Source-offset instrumentation of nested unbraced loops with identical end offsets, dangling else association, and early return through nested RAII scopes. Original/instrumented output matches.
- Scoped local/parameter lookup, local shadowing, unresolved-identifier warnings.
- Deterministic evidence/caveats for invariant arithmetic, invariant pure-function calls, indexed nested pairwise equality and a linear equality-scan candidate. Mutating operands suppress invariant advice; constant array indices suppress pairwise advice.
- API contract and actual uploaded-source analysis; sample allowlist and exact sample source serving.
- Wrong extension, empty/missing source, oversize uploads, malformed source and external-Origin rejection.
- Actual multipart `/api/profile` success for nested.cpp, sequential.cpp and mixed_hotspots.cpp, including measurements, source-ID joins, captured stdout and runtime guidance.
- Static-only behavior without main.
- Profiling rejects external calls such as `system` before compilation or execution, keeping runtime support restricted to local functions and scalar output through `printf`.
- Actual g++ compile-error diagnostics for an undeclared variable, nonzero process exit, a real five-second infinite-loop timeout, and excessive stdout termination.
- Unexecuted false-branch regions remain marked unexecuted, while an entered zero-iteration loop scope gets a real measurement.
- Actual missing-image failure retains complete static analysis and null timing fields. The Docker-unavailable path was also exercised when the socket was unavailable to a restricted test invocation; it returns unavailable without host execution.

## Verification limits

**No visual browser or click-through QA was completed.** Browser automation providers were unavailable, and native Chrome inspection reported that Computer Use permissions were not granted. The frontend production build, served HTML, API integration, and the real multipart acceptance flow were tested, but screenshot layout, responsive breakpoints, keyboard interactions and interactive charts/AST rendering have not been observed in a live browser in this session. Do not describe them as visually verified.

A preliminary test invocation inside the tool's restricted environment could not bind the HTTP test server and was interrupted. The full suite was rerun with the local network/Docker access it needs and passed without skips. API test setup now propagates socket errors directly instead of leaving an unresolved setup promise.

## Deliberately unimplemented

Full C++ semantics/type checking, macros/STL/classes/pointers, interprocedural call-graph analysis, recursive cost solving, dependent/triangular loop-bound inference, while-loop complexity inference, quadratic sort-pattern recognition, multi-threaded/interactive programs, benchmark repetitions or timer calibration. A single O0 instrumented run is a demonstration measurement, not a production benchmark. No fake fallback measurements, AI services, database or authentication were added.

See ../README.md for the supported subset, setup, demo clicks, sandbox boundary and next-phase roadmap, and API.md for exact field semantics.
