# Validation record — C++17 upgrade, 22 October 2026

The preceding MVC baseline passed **57 tests, 0 failed, 0 skipped** at the start of this task. All those tests were retained. Current results and evidence supersede the earlier MVC-only record; historical setup details remain in `AUDIT_BASELINE.md`.

## Final checks

| Check | Actual result |
|---|---|
| Native academic engine build | Passed on Apple Silicon macOS with the shared frontend interface |
| Frontend production build | Passed, with Clang mode/coverage/diagnostics display |
| Docker image build | Passed; both native Flex/Bison and Clang LibTooling engines compiled in Linux |
| `npm test` | 92 passed, 0 failed, 0 skipped; Docker available |
| `npm run test:runtime` | 92 passed, 0 failed, 0 skipped; real Docker required |
| All eight native sample JSON goldens | Exactly equal to saved pre-upgrade parsed JSON |
| Six original academic sample files | Byte-for-byte unchanged |
| Workspace stress input | `/Users/amrit/Desktop/test.cpp` copied byte-for-byte to `samples/dsa/stress.cpp` |
| Five locked SOT files | All SHA-256 checks passed |
| `git diff --check` | Passed |
| Direct native macOS LibTooling build | NOT VERIFIED; development libraries absent; supported macOS path uses Linux Docker |
| Live browser viewport/interaction QA | NOT VERIFIED; actual HTTP/client and server-rendered views tested |

Environment: Apple Silicon macOS, Node v24.18.1, Apple Clang 17 for the native C++17 build, Flex 2.6.4, Bison 3.8.2. Container: Linux aarch64, Debian Clang/LLVM **14.0.6**, GNU g++ 12.2, Debian bookworm. The Dockerfile installs the compatible Clang/LLVM 14 development packages explicitly. No host Homebrew LLVM dependency or new frontend package is required.

New upgrade evidence uses `.txt` files under `docs/evidence/` because the existing user `.gitignore` ignores `*.log`. See `cpp17-baseline-tests.txt`, `cpp17-build.txt`, `cpp17-docker-build.txt`, `cpp17-tests.txt`, `cpp17-runtime-tests.txt`, `cpp17-golden-checks.json`, and `cpp17-stress.json`. Raw durations are actual run evidence, not response fixtures or UI constants. The stress evidence is refreshed only by a successful real stress test.

## Checkpoints and corrections

- Baseline: 57 passed with actual Docker.
- Native shared-IR changes: eight engine tests passed and all eight saved JSON results remained identical.
- First new corpus run: 27/29 passed. Two new oracle mistakes were corrected: union-find had no loops, and the sequential test needed the overall cost rather than its first loop's cost. No existing test or original expected output was replaced.
- An initial fixture used a C++20 structured-binding capture; Clang correctly rejected it. The new fixture was corrected to use a copied ordinary variable under C++17.
- LibTooling integration initially exposed C++ type-name clashes between Clang and the existing AST aliases; explicit Clang qualification fixed the build. This was an intermediate failure, not counted as a pass.
- Full intermediate suite passed 89 tests, then 90 and 91 as recurrence and frontend/source checks were added. Final suite contains 92 tests including conservative alias mutation and compiler-resource checks.

## Parsing, inference and runtime are tested independently

`tests/cpp17.test.mjs` adds **35 tests** to the preserved 57:

- Eleven executable corpus cases independently validate real semantic parsing, discovered functions/regions, source bounds, confidence, actual g++ compilation and expected stdout.
- Eight structural oracle cases cover literal/linear/product/cubic/sequential/log/n log n/triangular families.
- Separate checks cover recursive/graph/memoized syntax without invented algorithm formulas, STL iterator/category/callback behavior, unknown effects/mutations and conservative recommendation abstention, physical diagnostics/missing headers/compiler depth limits, macro/constexpr/goto exclusions, RAII return/break/continue/exception behavior, the mandatory stress test, container-only static parsing, runtime crashes/threads/timeouts, frontend HTTP mode selection, global-constructor exclusion, custom/fake container abstention, excessive allocation, a narrow recurrence model, UTF-8/shared-end geometry and explicit alias mutation.

The existing engine/API/runtime/presentation/MVC/frontend API/comparison/view tests remain in place. Comparison equivalence, repeated -O2 runs and failure gates continue passing. No performance values or speedups are hardcoded in assertions.

## DSA corpus results

| Fixture | Examples | Actual stdout |
|---|---|---|
| arrays.cpp | Linear search, prefix sum, Kadane | `3 1 6` |
| sort_search.cpp | Bubble sort, merge sort, STL sort, binary search | `1 3 1` |
| strings_two_pointers.cpp | Frequency, palindrome, pair sum, sliding window | `1 2 1 6` |
| linked_list.cpp | Pointer traversal/reversal and constructor | `3 6` |
| stacks_queues.cpp | Monotonic stack and FIFO queue | `5` |
| trees_bst.cpp | Recursive tree traversal, BST insertion/search, cleanup | `17 1 0` |
| graphs.cpp | BFS/DFS, topological ordering, Dijkstra/heap | `4 4 6 1` |
| disjoint_sets.cpp | Class-based union-find with compression/rank | `1 0` |
| dynamic_programming.cpp | Memoized/tabulated Fibonacci, LCS, grid, knapsack | `55 55 3 6 7` |
| backtracking.cpp | Subsets, permutations, factorial | `16 6 720` |
| modern_cpp.cpp | Namespaces/chrono, all requested containers, templates, lambda, bindings, types/overloads/control flow | `6 11 6 7 ok 2 9` |

All are actual instrumented executable results from the unchanged restricted Docker environment. No loops are invented for the recursive-only union-find case.

## Mandatory stress evidence

The exact workspace source parses with Clang C++17, discovering **39 source callables including lambdas, 35 loop regions and maximum depth 3**. Region results include actual recognized quadratic/cubic/log/n log n patterns and honest Unknowns. Source summary remains Unknown where the full cost cannot be established; parsing did not fail.

The original and generated instrumented sources are separately compiled/run in Docker. All stdout lines match after excluding only lines beginning `Execution Time:`. All **18** benchmark timing sections exist, and final checksum is **10922060** in the actual runs. Timing strings are nondeterministic and are not compared exactly.

The test also renders the actual stress AST and coverage data through the real JSX components and exercises the frontend API client against the real multipart Clang endpoint. This proves data binding/renderability, not live browser behavior.

## Measurement and security evidence

- Nested and recursive scope entries retain actual invocation counts, inclusive ≥ exclusive, exclusive totals ≤ measured main and descending exclusive ranking. UTF-8 offsets, identical nested end positions and dangling else are independently tested through the Clang path.
- Macro/constexpr/goto loops are retained with exclusion reasons and unsupported measurements; no zero timings are manufactured. Global constructor loops do not enter main's timing records.
- Parsing `std::abort()` does not execute it. Profiling it reports the real crash; infinite execution times out; a 512 MiB allocation fails inside the unchanged 256 MiB runtime sandbox; detected threading rejects profiling honestly.
- A host-only include path fails inside Clang's container. Source/flags/filenames do not become shell commands or user-controlled compiler options. Parser timeout/output/resource failures remain distinct from inference Unknowns.
- Network-none, non-root, memory/CPU/PID limits, dropped capabilities, no-new-privileges, read-only root/input, bounded temporary mounts, argument-based subprocesses and final cleanup remain intact. Clang adds a bounded static compiler operation, not a host execution fallback.

## Unverified and incomplete

No live browser screenshots, upload/drop/click/Tab/hover or exact viewport checks were completed. No direct native macOS LibTooling binary was tested. General interprocedural/alias/recurrence proofs, broad graph/memoization inference, third-party dependencies/multifile builds and complete instrumentation coverage remain outside the tested implementation. Existing V3 gaps—three benchmark studies, configurable workload/repetition controls and final report export—remain. The project is not declared V3-complete.

Final copy-only frontend messaging clarifies that offline static analysis is the Legacy subset. The production build and nine presentation/view tests were rerun successfully after that wording change; `cpp17-presentation-tests.txt` records the additional check.
