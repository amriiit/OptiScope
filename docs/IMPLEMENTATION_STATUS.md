# Implementation status

Updated 23 October 2026. SOT-1.0 remains locked and unchanged. Status applies to the stated tested slice, not automatic completion of a version's complete acceptance gates. See `VALIDATION.md` and `KNOWN_LIMITATIONS.md`.

| Requirement / feature | Status | Evidence / boundary |
|---|---|---|
| V1-F01/F02 upload and samples | IMPLEMENTED AND TESTED | Multipart validation, byte/UTF-8 limits, sample allowlist and actual frontend API client integration for all eight samples |
| V1-F03 real compiler frontend | IMPLEMENTED AND TESTED | Real Flex/Bison build, typed AST, source offsets/IDs and engine corpus |
| V1-F04 constant, linear, quadratic, cubic | IMPLEMENTED AND TESTED | Structural oracle tests and triple.cpp; subject to named-size assumptions |
| V1 §4 canonical while inference | UNSUPPORTED | While parses/profiles but cost remains Unknown |
| V1-F05/F09 AST and source rendering | IMPLEMENTED AND TESTED | Actual JSX server-render tests, region paths and highlighted line counts; live controls require browser QA |
| V1-F05/F09 live AST toggles, clicks, chart hover and keyboard | IMPLEMENTED BUT NOT VERIFIED | UI handlers retained; browser permissions unavailable |
| V1-F06/F07 real profiling and hotspot math | IMPLEMENTED AND TESTED | All eight samples through Docker; original/instrumented stdout equality, calls, inclusive/exclusive, denominator, sorted rank |
| V1-F08 recommendations | IMPLEMENTED AND TESTED | Four conservative AST patterns, tested triggers/near-misses; distinct general runtime guidance |
| V1-F10 failures | IMPLEMENTED AND TESTED | Unsupported syntax, compile errors, nonzero exits, time/output bounds, missing image and Docker-unavailable paths |
| V2-F01/F02 scoped symbols and conservative bounds | IMPLEMENTED AND TESTED | Current tested grammar/scope/mutation subset, not full semantics |
| V2-F03 logarithmic/mixed costs | IMPLEMENTED AND TESTED | log, n log n, separate named families and sequential dominance |
| V2-F04 AST/source/profile mapping | IMPLEMENTED AND TESTED | Deterministic IDs, original byte spans, joined records; separate parentRegionId property remains absent |
| V2-F05 nested timing/calls | IMPLEMENTED AND TESTED | Exact parent inclusive-minus-exclusive equals aggregated child inclusive; scope entry counts |
| V2-F06 fifth/sixth AST recognizer and sorting detector | NOT IMPLEMENTED | Runtime guidance does not count as an AST recognizer |
| V2-F07 concurrency/isolation | IMPLEMENTED AND TESTED | Shared two-job limiter, isolated workspaces, concurrent real profiling; no durable queue |
| V2-F08 corpus and reproducible commands | IMPLEMENTED AND TESTED | Expanded suite exceeds 40 tests; no hosted CI workflow added |
| V2-F09 explanatory presentation | IMPLEMENTED AND TESTED | Unavailable/unexecuted/measured data and model/component tests; live visual QA unverified |
| MVC and modular C++ refactor | IMPLEMENTED AND TESTED | Layered modules, builds, unchanged six-sample JSON baseline, complete regressions |
| Retro desktop multi-page presentation | IMPLEMENTED; VISUAL QA UNVERIFIED | Reference inspected; light/blue tokens, six primary routes + Compare, shared workspace state; automated DOM/HTTP interaction checks; no browser viewport QA |
| V3-F01/F02/F04 two-file execution-only comparison | IMPLEMENTED AND TESTED | Real HTTP/Docker equivalent pair and mismatches; ratios suppressed on errors/mismatch |
| V3-F03 fixed ten repeated runs | IMPLEMENTED AND TESTED | Actual -O2 raw timings, warm-ups, AB/BA order and statistics |
| V3-F03 configurable counts / V3-T05 external input fixtures | NOT IMPLEMENTED | Fixed internal inputs only; workload semantics remain user's responsibility |
| V3-F05 three benchmark studies | NOT IMPLEMENTED | One equality-scan/frequency pair supplied |
| V3-F06 metadata | IMPLEMENTED AND TESTED | Source SHA-256, image ID, timestamp, platform/kernel/architecture, compiler, flags and limits; full hardware/revision capture incomplete |
| V3-F07 / V3-T14 test-count target | IMPLEMENTED AND TESTED | 57 tests passed in the preceding MVC baseline suite; see final Docker-required record |
| V3-F08 / V3-T10 report export | NOT IMPLEMENTED | Raw benchmark JSON is available in UI and repository evidence; no final HTML/PDF report |
| V3-F09 walkthrough and demo preparation | IMPLEMENTED AND TESTED | Documentation paths/functions checked against current code; human presentation rehearsal unverified |
| V3-F10 complete browser experience | IMPLEMENTED BUT NOT VISUALLY VERIFIED | SSR, DOM navigation and actual HTTP/Docker data binding verified; native browser/viewport QA remains unverified |

The project is **not V3-complete**, and full locked V1/V2 completion is not claimed. The practical backend/compiler workflow passes its automated gates; faculty visual readiness remains conditional on the manual browser preflight in `PRACTICAL_DEMO_GUIDE.md`.


## C++17 upgrade — current feature status

The current project-owner request explicitly authorizes the dual frontend. Locked SOT-1.0 remains unchanged. Current validation is **92 passed, 0 failed, 0 skipped**, including real Docker. These counts supersede the earlier MVC-only numbers above; see `VALIDATION.md`.

| Feature | Status | Evidence / boundary |
|---|---|---|
| Clang 14 LibTooling frontend and shared typed IR | IMPLEMENTED AND TESTED | Real Linux build; typed AST API; no dump/regex parsing; explicit frontend selector/query |
| Independent legacy frontend | IMPLEMENTED AND TESTED | Existing 57 tests retained; all eight native JSON goldens identical |
| C++17 namespaces, references, pointers, classes, constructors, overloads, templates, lambdas, ranges, structured bindings, macros, switch/break/continue | IMPLEMENTED AND TESTED | Modern syntax fixture and DSA corpus, actual semantic parse and compilation |
| All requested standard container declarations | IMPLEMENTED AND TESTED | Modern fixture including nested vectors, associative containers, tuple, bitset and nested priority-queue types |
| DSA representative programs | IMPLEMENTED AND TESTED | Arrays/search/prefix/Kadane, sorting, strings/two pointers/window, lists, monotonic stack/queue, trees/BST, BFS/DFS/Dijkstra/topological order, DSU, Fibonacci/LCS/grid/knapsack, backtracking/factorial |
| Mandatory workspace stress test | IMPLEMENTED AND TESTED | Exact copied source; 18 benchmark outputs/checksum match after excluding only printed timing lines; real profile |
| Conservative STL operation registry | IMPLEMENTED AND TESTED | Actual declaration/type/iterator facts, unknown custom callables/types, worst-case bounds; see walkthrough/limitations |
| Constant/log/linear/n log n/quadratic/cubic/product/sequential/triangular families | IMPLEMENTED AND TESTED | Explicit structural oracle tests; no filename-based recognition |
| Confidence classification | IMPLEMENTED AND TESTED | Clang-only additive exact_pattern / estimated / unknown metadata; legacy JSON preserved |
| Simple guarded n-1 recurrence | IMPLEMENTED AND TESTED | Standalone O(n); branching recursion abstains; not propagated into callers |
| General recurrence, graph V+E, memoization/alias proofs | NOT IMPLEMENTED | Unknown instead of an algorithm-name guess |
| Expanded RAII profiling | IMPLEMENTED AND TESTED | Real corpus outputs, templates/classes, early returns, break/continue/exceptions, UTF-8 and shared-end ranges, global-constructor exclusion |
| Macro/constexpr/goto region instrumentation | UNSUPPORTED | Regions retained and explicitly excluded, no fabricated zero measurements |
| Static compiler sandbox/security | IMPLEMENTED AND TESTED | Same isolation/resource flags, no host-header access, no execution during parse, bounded output/time, memory/crash/timeout tests |
| Structured source-linked diagnostics and frontend display | IMPLEMENTED AND TESTED | Real API client and server-rendered Clang AST/coverage; browser interactions unverified |
| Native macOS Clang LibTooling binary | IMPLEMENTED BUT NOT VERIFIED | Development libraries absent; supported macOS development uses Docker Clang |
| Live browser acceptance | IMPLEMENTED BUT NOT VERIFIED | No connected/authorized browser QA surface |

Full locked V1/V2/V3 acceptance is still not claimed: while inference, additional recommendation rules, benchmark studies/export and browser verification remain incomplete.
