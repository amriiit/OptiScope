# OPTISCOPE V3 — FINAL REVIEW AND RESUME-READY RELEASE

**Spec ID:** OS-SOT-03 | **Baseline:** 1.0 | **Date:** 19 October 2026  
**Status:** **LOCKED V3 SCOPE** | **Target:** Final project review (date to be set by faculty)  
**Depends on:** [00_MASTER_SPEC.md](00_MASTER_SPEC.md), [01_VERSION_1.md](01_VERSION_1.md), [02_VERSION_2.md](02_VERSION_2.md)  
**Positioning:** A credible developer tool supported by **correctness evidence, reproducible measurements and demonstrable value**.

## 1. Mission

Do not turn V3 into a random feature expansion. V3's main product advance is this:

> A developer can identify a measured bottleneck, follow a justified optimization suggestion, upload an optimized implementation, confirm equivalent behavior under the test workload, and see a repeatable, statistically described original-vs-optimized runtime comparison.

The final release should support both academic evaluation and technical discussion covering compilers, algorithms, systems, backend execution, performance experiments and trade-offs.

**Resume target:** A believable **8.5–9/10 potential** for an undergraduate SDE/systems-focused project, conditional on implementation quality and genuine evidence. No rating or 30-minute interview duration is guaranteed.

## 2. V3 required features and outcomes

| ID | Requirement | What counts as done |
|---|---|---|
| V3-F01 | Two-version comparison | Upload original and optimized `.cpp`, select identical test workload, run both safely |
| V3-F02 | Output equivalence gate | Compare observable behavior/exit status for the specified test fixture; warn on mismatch |
| V3-F03 | Repeated benchmarking | Configurable repeated measured runs, warm-up policy and documented summary stats |
| V3-F04 | Speedup and reduction | Calculate only from measured comparable statistics, not demo constants |
| V3-F05 | Three meaningful optimization studies | Evidence-backed inputs, outputs, runtime results, explanations and caveats |
| V3-F06 | Reproducibility | Record CPU/OS/container/compiler/version/flags/input sizes and procedure |
| V3-F07 | Regression and failure hardening | >=40 meaningful tests; no known critical correctness/security bugs in supported paths |
| V3-F08 | Exportable final report | Download HTML or PDF with findings, measured data, charts, assumptions and limitations |
| V3-F09 | Interview-ready documentation | Architecture, algorithms, trade-offs, test evidence and reproducible demo |
| V3-F10 | Review-ready experience | Reliable live workflow, readable source→AST→hotspot→recommendation→comparison |

## 3. The flagship feature: before/after comparison

### Intended workflow

```text
ORIGINAL.CPP                              OPTIMIZED.CPP
     |                                          |
     +---------- same selected workload --------+
     |                                          |
Static analysis & source regions      Static analysis & source regions
     |                                          |
Sandboxed correct build                  Sandboxed correct build
     |                                          |
Behavior/output verification ---------- compare observable results
     |                                          |
Repeated uninstrumented runs          Repeated uninstrumented runs
     |                                          |
     +--------------- Stats --------------------+
                             |
                    Speedup + reduction
                             |
              Comparison and evidence report
```

### Correctness gate
Comparison may proceed to measurement even when outputs differ **only** if explicitly marked `NOT EQUIVALENT — performance result is not an optimization validation`. The main UI should not show a green improvement claim for a behavior-changing rewrite.

**For supported deterministic fixtures**, compare stdout, expected output if supplied, process exit status and relevant filesystem effects where within scope. If the program intentionally produces nondeterministic output, environment-dependent results or side effects outside the capture model, mark equivalence `UNVERIFIED`, never silently claim equivalence. Passing one fixture only verifies equality for **that fixture**, not universal program equivalence.

### Input workload control
- Run both programs with the **same input fixture and environment**. Provide fixture files or fixed internal inputs; support stdin where safe and documented.
- Record workload scale (`n`, number of records, distribution), input hash and compile flags.
- Avoid comparing programs using different compiler settings or hardware loads without flagging that mismatch.
- Ensure warm-up and run count policies are identical for the pair.

### Source-level versus whole-program comparisons
- **Hotspot profiling** is gathered from instrumented builds and helps explain *where* time goes.
- **End-to-end speedup** must be calculated from appropriately comparable **un-instrumented** builds. Profiler overhead should not be mistaken for speedup or slowdown.
- Use suitable optimized flags (e.g. `-O2` for both comparison builds) and log them. The V1/V2 teaching profiler may continue using `-O0`, clearly labeled.
- Report compile time separately; exclude it from runtime speedup unless intentionally studying build performance.

## 4. Measurement and benchmark policy

### Repeated execution
- Support a configurable run count (suggested default: 10 measured runs; more for noisy fast programs). Count and bound total job runtime.
- Define and disclose warm-up policy (e.g. 1–3 runs if used). Do not hide warmed-up outliers.
- Collect per-run elapsed **monotonic wall time** and exit status; do not substitute cumulative profiler timings for whole-program duration.
- Report median, mean, min/max, standard deviation or interquartile range, and number of accepted/failed samples.
- Where noise is high, warn “results unstable; increase workload/iterations” rather than proclaim a large speedup.
- Ideally alternate run order (A/B/B/A or randomized with a recorded seed) to reduce systematic environment drift. Do not claim scientific benchmarking on shared noisy hardware.

### Core calculations
Let `T_original` and `T_optimized` be comparable summary statistics (default: **medians** from the same workload and compiler flags).

```text
Speedup factor       = T_original / T_optimized
Runtime reduction %  = 100 * (T_original - T_optimized) / T_original
```

If `T_optimized == 0` due to coarse resolution, show `insufficient resolution` rather than divide by zero. A factor less than 1 means regression; a negative reduction indicates slower optimized code. Round for presentation without changing underlying stored measurements.

### Required metadata
Project revision/commit (if available), timestamp, OS/kernel, CPU architecture, Docker image identifier, `g++ --version`, compiler flags, input/workload identifier, fixture checksum, run count, warm-up count, measured values and known environment limitations.

### Reliability threshold
Before claiming a gain, verify that the effect is larger than obvious timer granularity/noise and reproducible across at least two independent sessions if feasible. Report actual uncertainty/variance rather than claiming statistical significance without a justified model.

## 5. The three final benchmark case studies

Build **three correct, explainable original-vs-optimized pairs** that are expressible and runnable under the documented supported C++ subset or under a carefully documented execution-only comparison mode.

### Study A — Repeated linear search → indexed/frequency lookup
- **Original:** repeated scan over an array for the same type of lookup.
- **Optimized:** hash/index/frequency strategy if semantics permit and the supported code environment can compile it.
- **What must be shown:** original work pattern, suggested data structure, data construction cost, workload where the optimization helps, observed runtime and any cases where it does not.
- **Scope caveat:** `std::unordered_map` parsing is *not mandatory* for the Flex/Bison subset. If optimized code uses unsupported STL, the tool may compare executable runtimes but must label static AST/complexity for that file **unsupported**, not silently pretend it was parsed.

### Study B — Quadratic sorting → efficient sorting
- **Original:** clearly recognized simple comparison/swap sorting loop.
- **Optimized:** `std::sort` or a supported efficient sorting implementation.
- **What must be shown:** output equality, fixed data distribution, complexity assumptions and measured differences across sizes.
- **Caveat:** sort stability, comparator behavior and workload influence correctness/performance.

### Study C — Loop-invariant work / repeated computation
- **Original:** a deliberately pure, repeated loop-independent computation.
- **Optimized:** computation moved outside loop or cached after dependency checks.
- **What must be shown:** proof of invariance for the specific case, output equality, whether compiler optimization already removes redundant work at `-O2`, and measured results.
- **Important:** if the compiler already optimizes both programs identically, that is a valid and interesting finding. Report *no meaningful speedup* rather than fabricating a benefit.

### Required central-theory counterexample
Separately retain a mixed workload in which a worse-asymptotic region consumes less measured time than another region on a particular input. Explain **why** (input size, frequency, constants, selected workload). Do not imply asymptotic ranking has been disproven; runtime ranking answers a different question.

## 6. Algorithmic and systems correctness

### Static engine validation
- Create a table-driven oracle test suite for every claimed complexity class and pattern.
- Verify boundary cases: `n=0`, small `n`, fixed bounds, changed bound variable, missing update, dependent inner bound, conditional paths, unknown function cost, negative/zero divisors and integer overflow concerns.
- Unknown/unsupported output is acceptable when justified; false precise complexity is not.
- Ensure grammar accepts what the README claims and rejects what it does not.

### Profiler validation
- Test inclusive/exclusive mathematical relationships over multiple activations and nesting depths.
- Assert profile record IDs map to the same input source nodes across parsing and instrumentation.
- Verify original and instrumented executable output equivalence for supported deterministic fixtures.
- Include early returns, `break`/`continue` in supported forms, unexecuted branches, compilation failures, timeouts and significant timer overhead cases.
- Verify source highlighting matches **original** file line numbers, not generated code.

### Backend validation
- No public internet execution path; local-only unless future reviewed security work explicitly authorizes otherwise.
- Concurrency limits, resource ceiling tests, stale artifact cleanup, non-root execution and dropped capabilities verified.
- No shell injection through filename/path/CLI inputs; no unrestricted shared directory mounts.
- Existing API requests have deterministic status codes and informative error bodies.
- Tested on the actual development environment (including Apple Silicon where relevant) with exact command logs.

### Testing target
At least **40 meaningful automated tests** across lexer/parser/AST, static complexity, source mapping, instrumentation, timing semantics, recommendation triggers/abstention, job isolation, comparison equivalence, benchmark calculations, API and selected frontend interactions. Include negative tests as well as passing samples.

Automated CI is strongly preferred (build + unit/integration suites); if container-based execution is unavailable in CI, separate supported static suites from local sandbox-required suites without claiming skipped tests passed.

## 7. V3 product UI and reports

### Final dashboard navigation
1. **Analyze:** original source, AST, complexity explanation, unsupported warnings.
2. **Profile:** measured inclusive/exclusive timing, invocation counts, hotspot sort and source links.
3. **Recommendations:** exact AST rule evidence, conditions, caveats and applicability.
4. **Compare:** original and optimized code, common workload, equivalence status, repetitions and calculated speedup.
5. **Report:** human-readable findings and export.

### Exported report structure
- Title/file(s)/run metadata and explicit supported-subset statement.
- AST/function/loop structural summary.
- Per-region static estimate and assumptions.
- Profiling results with correctly labeled timing definitions and denominators.
- Top hotspots by measured exclusive time, plus source ranges and rationale.
- Evidence-linked recommendations, with semantic caveats.
- Before/after output-equivalence verdict and runtime distribution/statistics.
- Speedup and reduction calculated from comparable runs, if eligible.
- Limitations, measurement noise, compiler flags and reproducibility instructions.

**Format:** HTML export is mandatory; PDF is optional if easily generated from the HTML and does not crowd out engineering work. No fake graphs or illustrative numbers included without a visible example label.

## 8. Documentation for a serious GitHub project

**Repository must include:**
- Functional README: scope, setup, local run, three-click demo, limitations, security caveats and reproducible tests.
- `docs/` with this locked source-of-truth collection.
- Architecture diagram linking upload, lexer/parser, AST, static analyzer, instrumenter, Docker, profiler and dashboard.
- `docs/IMPLEMENTATION_NOTES.md` or equivalent showing real implemented modules (not modifying locked SOT).
- Grammar and supported syntax matrix with negative examples.
- Test suite inventory and actual pass/fail evidence.
- Benchmark methodology and raw CSV/JSON measurements committed or attached where safe.
- Three before/after studies, interpreted honestly.
- Design decisions and alternatives (particularly why custom Flex/Bison, why AST, why Docker, why inclusive/exclusive, why no full C++).
- Documented open limitations and known failure modes.

Optional: short demo screen recording/GIF and a single screenshot of a real result. These are presentation improvements, not substitutes for tests.

## 9. Final demonstrations

### Academic Review Demo (~7 minutes)
1. Upload `nested.cpp`; show Flex/Bison-derived AST and source-linked complexity explanation.
2. Profile it; show inclusive versus exclusive time and why it matters.
3. Load the mixed hotspot workload and demonstrate actual measured rank differs from static asymptotic severity.
4. Select a source-linked, AST-triggered recommendation.
5. Compare one validated original/optimized pair with repeated runs and equal-output evidence.
6. Download report; identify limitations of the chosen C++ subset.

### Resume/interview demo (~10 minutes)
1. Problem/why static + dynamic are complementary.
2. Parser/AST architecture and complexity algorithm.
3. RAII instrumentation and exclusive runtime attribution.
4. One legitimate bug and how tests exposed it.
5. Docker job architecture and concurrent request handling.
6. Benchmark methodology and real result **including uncertainty**.

Use actual numbers recorded from tests. Never make benchmark claims using pre-filled example figures.

## 10. V3 acceptance gates

| Test ID | Acceptance scenario | Pass condition |
|---|---|---|
| V3-T01 | V1 and V2 suites | No regression on required cases |
| V3-T02 | Original and equivalent optimized sample | Equivalence for tested workload; measured comparison available |
| V3-T03 | Intentional behavior-changing rewrite | Flag non-equivalent; no green “optimized” claim |
| V3-T04 | 10 repeated runs | Raw timings and correct summary stats |
| V3-T05 | Comparison across different inputs | Same fixture enforced, mismatch warned/rejected |
| V3-T06 | `-O2` vs profile `-O0` | Build flags correctly distinguished and logged |
| V3-T07 | Noise/too-short executions | Appropriate warning; no fake precision |
| V3-T08 | Real benchmark studies A, B, C | Workload, output validation and honest results documented |
| V3-T09 | Mixed asymptotic vs observed runtime | Ranking uses real measured cost, not Big-O order |
| V3-T10 | Export report | Contains real source/run metadata, timings, assumptions, comparisons |
| V3-T11 | Unsupported C++ in comparator | Execution-only/unsupported static status shown correctly or clean rejection |
| V3-T12 | Compiling/running malicious or runaway sample | Safe resource/timeout handling, clean failure |
| V3-T13 | Concurrent compare/profile requests | No cross-job file contamination |
| V3-T14 | Test automation | At least 40 meaningful tests pass; skipped cases disclosed |
| V3-T15 | Fresh setup | README commands reproduce local sample demo on a clean machine with prerequisites |

### Definition of Done — V3
- V1 and V2 must-pass features remain working.
- Original/optimized comparison is real, repeatable and checks observable equivalence.
- Runtime change is computed from repeat measurements of **uninstrumented** comparably compiled executables.
- Three case studies include evidence and caveats; mixed-hotspot case demonstrates central concept.
- Source maps, complexity explanations, profiling values and recommendations remain coherent across the system.
- >=40 relevant automated tests; known limitations documented; security guards enabled.
- Export/report and repository are usable by a stranger following documented local instructions.
- The team can explain key algorithms, trade-offs and at least one debugging story from actual implementation.

## 11. Interview preparedness — 30-minute depth map

**0–3 min: Problem and constraints** — difference between Big-O and measured runtime; why limited C++ grammar.

**3–9 min: Compiler frontend** — Flex tokenization, Bison grammar, AST typing/ownership, symbol scopes, location mapping.

**9–14 min: Static analyzer** — loop bounds, sequential vs nested, `n log n`, dependent bounds, unknown classifications.

**14–21 min: Profiling** — AST-guided source transformation, RAII, steady clock, nested inclusive/exclusive timing, overhead, correctness assertions.

**21–26 min: Systems/backend** — Node orchestration, Docker isolation, job queue, resource limits, failure cleanup, concurrency.

**26–30 min: Evidence** — before/after experiments, compiler flags, output equivalence, repeated-run noise, rejected recommendations, limitations.

**Interview standard:** Be able to open the source file implementing each highlighted decision, modify a rule/test without Codex, and describe a real trade-off. A 30-minute conversation can be supported; interviewer interest and duration remain outside our control.

## 12. Resume evidence policy

Only describe implemented and verified accomplishments. Candidate resume bullets **after** V3 validation, adjusted to truth:

- “Built a compiler-assisted C++ performance analyzer using Flex/Bison, typed AST traversal and documented symbolic complexity heuristics for [verified] loop patterns.”
- “Implemented source-level `std::chrono` instrumentation with source-region mapping and inclusive/exclusive timing attribution to identify measured hotspots.”
- “Developed sandboxed comparison workflows and repeatable performance benchmarks, validating behavior and documenting [actual measured] speedups across [actual number] workloads.”

Fill bracketed metrics only from recorded evidence. Do not claim users, production usage, thousands of LOC analyzed, percentage improvements, or broad language coverage without proof.

## 13. V3 exclusions and optional extensions

**Out of scope:** full modern C++ parsing, production-hostile multi-tenant internet service, Clang/LLVM migration, AI-generated optimizations, automatic semantics-preserving rewrites, multi-file build systems, GPU profiling, asynchronous cloud job orchestration, and distributed profiling.

**Optional only after all gates pass:** nicer AST graph, PDF report export, visual heatmap, CI badge and benchmark GitHub Pages. Such extras must not erode required testing/benchmark work.

---

**Frozen V3 vision:** Deliver a **technically honest developer tool with measured impact**, not an over-featured prototype. Its resume value comes from algorithms, profiling correctness, sandboxed systems engineering and reproducible experiments.
