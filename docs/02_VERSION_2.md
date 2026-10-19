# OPTISCOPE V2 — ENGINEERING DEPTH SPECIFICATION

**Spec ID:** OS-SOT-02 | **Baseline:** 1.0 | **Date:** 19 October 2026  
**Status:** **LOCKED V2 SCOPE** | **Target:** Review 2 (date to be set by faculty)  
**Depends on:** [00_MASTER_SPEC.md](00_MASTER_SPEC.md) and a verifiably working [01_VERSION_1.md](01_VERSION_1.md)  
**Positioning:** Improve **compiler rigor + runtime measurement correctness + system robustness**, not merely UI breadth.

## 1. V2 mission and resume relevance

**Mission:** Convert V1's limited demonstration into a well-engineered, defensible compiler-analysis system. Implement reliable symbolic estimates for a useful controlled language subset, accurate profiler attribution for nested and repeatedly executed regions, evidence-based rule suggestions, and a secure multi-job API.

**Why V2 matters in interviews:** It should support discussion of AST design, control/data dependence, symbolic reasoning, compiler transformations, resource isolation, concurrency and measurement integrity. A reviewer should be able to ask *why this code is correct*, not only *what buttons the dashboard has*.

### Entry gate
Do not start adding new syntax while V1's lexer/parser/AST/API end-to-end demo or profiling security is broken. Capture baseline tests and limitations before expansion.

## 2. Features and non-negotiable deliverables

| ID | Feature | Acceptance summary | Links |
|---|---|---|---|
| V2-F01 | Richer grammar/AST | Scoped variables, expressions, branches, tested array indexing, safe function-call representation | CORE-01, CORE-02 |
| V2-F02 | Symbol-aware loop reasoning | Inspect bound, step, mutations, independence and unknown conditions | CORE-03 |
| V2-F03 | O(log n), O(n log n), mixed nests | Explain estimates with assumptions; avoid false exactness | CORE-03 |
| V2-F04 | Full region mapping | Stable AST ID ↔ source span ↔ timed profile ID | CORE-02, CORE-04 |
| V2-F05 | Correct nested timing | Inclusive and exclusive elapsed times, invocation counts and non-double-counted ranking | CORE-04, CORE-05 |
| V2-F06 | Evidence-driven rule engine | 5–6 AST recognizers with semantic caveats | CORE-06 |
| V2-F07 | Concurrent job isolation | Resource-bounded queue/admission, unique directories, cleanup, failure isolation | CORE-07, CORE-09 |
| V2-F08 | Test corpus and CI-ready checks | At least 20 meaningful tests, explicit unsupported cases and reproducible commands | CORE-10 |
| V2-F09 | Better diagnostics and UI explanation | Visual distinction: measured, estimated, partial, unexecuted, unsupported | CORE-07 |

## 3. Grammar and AST expansion: useful, not exhaustive

### Must handle and test
- Canonical `for` loops with `++`, `--`, `+= k`, `-= k`, `*= k`, `/= k` where progression and termination conditions are recognized.
- `while` with identifiable control variable and supported update; reject/data-dependently classify uncertain termination.
- `if/else` and nested blocks; lexical scopes and shadowing; common arithmetic/boolean expressions with documented precedence.
- Simple fixed arrays, indexing and comparisons; common basic function definitions/calls where callee can be found within supported translation unit.
- Literal/string-argument function-call syntax used by tests, preserving function identity and source locations.
- Statements with source ranges and function/region containment; record unknown operation cost instead of assuming O(1).

### Selective pattern support (only if verified)
Support simple repetitive linear-search idioms written as supported indexed loops. Recognition of `std::find`, vectors, iterators or library calls requires explicit grammar + semantic tests; otherwise mark the cost unknown. No promise of understanding arbitrary C++ standard library algorithms.

### Keep explicitly unsupported
Templates, heavy STL, classes, sophisticated pointer/alias resolution, arbitrary recursion/call-graph Big-O, macros with nontrivial expansion, concurrency and threads inside analyzed programs, and full C++ parsing. No requirement to replace Flex/Bison with Clang.

### AST design improvements
- Typed nodes with clear ownership, nullable/optional children as appropriate and resilient serialization.
- Parent-child relationship or visitor context for functions, loops, branches and declaration scopes.
- Deterministic region IDs for one unchanged source file.
- Precise 1-based line/column plus byte offsets for source instrumentation.
- Scoped symbol table recording declaration, type, scope, and tracked writes to loop variables/bounds.
- AST visitor or structured traversal with unit tests for preorder, nesting, scope entry/exit and sibling-loop handling.

**Design question to record:** Why store a full typed AST instead of relying on a flat token stream? Answer should cover structural containment, safe source mapping, complexity compositionality, and rule pattern matching.

## 4. Static complexity engine V2

### Required supported classes
`O(1)`, `O(log n)`, `O(n)`, `O(n log n)`, `O(n²)`, `O(n³)`, and `Unknown`. Represent symbolic bounds beyond `n` carefully (`O(mn)` may be shown when independently parameterized loops warrant it).

### Formal reasoning heuristics
1. **Canonical linear:** `i = constant`, condition `i < n`, step `i += positive_constant`; O(n) provided `n` does not change and arithmetic does not overflow during expected inputs.
2. **Canonical logarithmic:** `i = 1`, `i < n`, `i *= k` for constant `k > 1`; O(log n) under usual positive bound and no overflow. Also supported decreasing division patterns.
3. **Fixed bound:** known constant iteration count → O(1) in `n` (not zero cost).
4. **Sequential composition:** `T1 + T2`, simplify only where symbolic class ordering is clear.
5. **Nested independent loops:** multiply iterations only if independence is established for supported pattern.
6. **Dependent bounds:** e.g. `j < i`; do not apply naive depth exponent blindly; either implement and test a sound bound (`sum_i i = O(n²)`) or report `Unknown` with explanation.
7. **Branches:** take the safe dominant branch estimate where conditions and branch costs can be understood; annotate path dependence.
8. **Function calls:** locally defined functions may have summarized costs where confidently known, while external/unknown calls yield `Unknown` or `Partial` estimates.
9. **Mutation of loop bounds:** symbol/write tracking invalidates naive classifications if `n` is modified during iteration.
10. **Nontermination/overflow caution:** do not claim a terminating asymptotic class for unsupported updates or unsafe arithmetic without assumptions.

### Required transparent output
```text
Region R4, lines 18–22
Pattern: nested linear + geometric progression
Outer: n iterations -> O(n)
Inner: doubles each step -> O(log n)
Estimate: O(n log n)
Assumptions: bound unchanged; factor = 2; no overflow
Confidence: recognized pattern (not a proof for all inputs)
```

An unknown inner loop should not be turned into a false O(n²) merely because two `for` tokens appear.

## 5. Runtime profiling engine V2 — principal engineering milestone

### Attribution definitions (mandatory)
- **Activation:** Entering one instrumented region. A loop statement ordinarily has one activation per entry to the loop, NOT one activation per loop iteration.
- **Inclusive runtime:** elapsed duration of activation, including all timed descendants.
- **Exclusive runtime:** activation inclusive runtime **minus child inclusive time directly attributed to it**.
- **Aggregate:** Sum/aggregate activations per region; report count, inclusive and exclusive totals.
- **Instrumented total wall time:** measured separately in the running program; includes unattributed work and instrumentation overhead.
- **Runtime contribution:** defined fraction with denominator labeled; no requirement for region percentages to sum to exactly 100%.

### Timing method
Use monotonic `steady_clock`. A per-thread or explicitly single-thread execution stack can track nested region entry/exit:

```text
on_enter(region_id):
    push({region_id, start=now, child_elapsed=0})

on_exit(region_id):
    frame = pop_matching(region_id)
    inclusive = now - frame.start
    exclusive = max(0, inclusive - frame.child_elapsed)
    add inclusive/exclusive and increment activation count for region_id
    if parent exists: parent.child_elapsed += inclusive
```

This is a conceptual model; implementation should handle clock readings and RAII destructor behavior carefully. If the program is multithreaded (out of supported scope), either use thread-local correct stacks or explicitly reject profiling as unsupported. Do not share one unprotected global active-frame stack.

### Instrumentation correctness
- Instrument only AST-validated full statement source spans; no random regex insertion.
- Preserve `if/else` binding, loop initializer scope, `break`, `continue`, `return` and any supported early exits.
- Insert source edits from right to left; test nested equal-boundary insertions and unique reserved helper namespace.
- The generated C++ may have line offsets shifted; reporting must always refer to **original source** using preserved region metadata.
- Profiling output is separate from user stdout/stderr; results are joined by stable IDs.
- End-user code must not need manually inserted timers.
- Code that is not instrumentable must be flagged, not silently reported as measured.

### Benchmark overhead/limitations
- Measure or characterize baseline timer overhead on representative samples, and flag sub-millisecond/small regions as unreliable when overhead dominates.
- Distinguish tool startup, compile time, instrumented run wall time, and time attributed to measured regions.
- `-O0` can be used for teaching demos but must be prominently shown as the active profile build flag. V3 comparisons add suitable optimized build measurements.

### Example that must be correct
```text
Outer R1: inclusive 1,200 ms, exclusive 200 ms
Inner R2: inclusive 1,000 ms, exclusive 1,000 ms
```

The tool must **not** claim the program spent `2,200 ms` across these two overlapping regions. Values are illustrative, not test fixtures.

## 6. Hotspot analyzer V2

The default measured ranking uses **exclusive total runtime** for supported regions and clearly identifies uninstrumented portions. Add a separate view by inclusive runtime if desired, with honest labels. Provide per-region activation count, source line range, function, complexity class and reasoning.

**Important:** a region that never executes is `not observed`, not “fast.” A region measured in microseconds is shown with units/precision appropriate to timing resolution and overhead.

For loops under a selected function, explicitly show parent/child relationships so the viewer understands why outer inclusive cost and inner exclusive cost differ. No “optimization priority score” with arbitrary unexplained weights; if one is introduced, its formula must be documented and user-visible.

## 7. Recommendation engine V2

Separate the rule pipeline:

```text
AST visitors + symbol/dependency facts
               -> Pattern recognizers
               -> Rule evidence + conditions
               -> Caveated recommendation objects
               -> Ranked display (by measured hotspot when available)
```

Implement and test **5–6** of these rules. Each returns: `ruleId`, `regionId`, `pattern`, `sourceEvidence`, `reason`, `recommendation`, `caveats`, and `confidence`/`applicability` label.

1. **Repeated linear lookup** in a loop: suggest hash/index lookup only if the data usage and semantics fit.
2. **Loop-invariant pure expression:** suggest moving expensive repeated expression outside the loop only after conservative read/write and side-effect checks.
3. **Repeated pairwise comparison:** suggest frequency table/hash-based strategy conditionally.
4. **Quadratic sort-like comparison/swap pattern:** suggest comparing against `std::sort` if stable ordering/semantics are not required, otherwise mention caveat.
5. **Repeated same-argument pure local function call:** suggest caching only with proven absence of writes/side effects to dependencies.
6. **Measured high-cost region, no specific pattern:** generic “profile input sizes, inspect repeated work” guidance; label **generic**, not a detected optimization transformation.

**Safety rule:** a rule must abstain if data dependencies, side effects, semantics, or input assumptions are not established. “Maybe parallelize” may be a textual exploration note, but is **not** a validated V2 optimization unless dependence analysis supports it.

## 8. Backend and security engineering V2

### Job manager
- Unique UUID/job ID, isolated working directory and trace/log outputs per run.
- Admission control (e.g. configurable max 2 simultaneous profilers; remaining jobs queued/rejected with explicit status).
- Compile and execution timeouts, abort propagation, stdout/stderr byte limits, cleanup after all exits.
- Crash/restart cleanup of stale temporary artifacts.
- Source file size and content validation; no user filenames passed as executable command strings.
- Explicit backend lifecycle: `accepted -> analyzed -> instrumented -> compiled -> running -> completed|failed|timed_out`.

### Sandbox
Keep **Docker no-network, no-root, dropped capabilities, no-new-privileges, PID/CPU/memory/time limits and narrow mounts**. Test escaping output directories, code that loops forever, code that writes huge output, compile failures and bad source. Compile/run untrusted uploaded code only within the constrained container. A Docker container is not a claim of perfect hostile-code isolation; the prototype remains localhost-only.

### Concurrency case
Launch two distinct supported C++ uploads simultaneously, ensure results never mix, profiling data is not overwritten, and timeout of one does not break the other. Job directories must be unique; old results must not leak into new analysis.

### Failure behavior
- Compilation fails → show compiler diagnostics and no runtime, retain static result when valid.
- User program exits nonzero → show exit status; do not mislabel it as a parser failure.
- Program times out → terminate process/container; show timeout and cleanup.
- Docker missing → keep static-only mode without host execution fallback.
- Analysis is partially supported → show the exact construct/region limitations.

## 9. UI and JSON refinements

Frontend must distinguish these labels visibly: `Static estimate`, `Measured inclusive`, `Measured exclusive`, `Not executed`, `Unsupported`, `Partially analyzed`, `Timer overhead warning`.

AST nodes/regions should be selectable in both directions: selecting a tree node highlights source; selecting a hotspot expands its AST location. Avoid adding complex 3D graphics. Charts must use backend values and explain units and denominator.

API schema must be versioned/documented; error objects include stage and source span. Maintain backward compatibility with the V1 interface or migrate both server/client/tests in one revision.

## 10. Required test suite — minimum 20 meaningful cases

The following tests count only if assertions verify semantics, not merely a process exit code:

**Grammar/AST (at least 6):** nested blocks, scalar declarations, expression precedence, two sequential loops, if/else structure, rejected unsupported construct.

**Complexity (at least 6):** O(1), O(n), O(log n), O(n log n), O(n²), O(n³), plus an unknown-mutated-bound example. More than six is encouraged.

**Profiling (at least 4):** nested inclusive/exclusive consistency, repeat activations, source-region match, early return/other supported control flow.

**Backend/failure (at least 4):** compiler error, timeout, two concurrent jobs, Docker unavailable, output limit/file validation.

**Recommendations (at least 3):** positive pattern, counterexample where rule must abstain, evidence points to actual line range.

**Frontend/integration:** one real browser/backend/compiler journey on both nested and sequential samples. Total should comfortably exceed 20.

## 11. V2 acceptance demos

### Demo A — O(n log n)
Upload an independent outer linear loop + inner doubling loop, inspect AST and see O(n log n) with reasoning and assumptions.

### Demo B — Nested profiler
Show two nested loop regions with **inclusive and exclusive** timing; explain why adding inclusive times double-counts and how stack accounting avoids it.

### Demo C — Real recommendation
Upload a supported repeated-pattern sample, show the exact AST evidence/source range and a rule ID; upload a near-miss sample and demonstrate that the rule abstains.

### Demo D — Backend engineering
Run two analysis jobs; show job separation. Make one timeout (or use a controlled test fixture) and demonstrate that the other finishes and artifacts are cleaned.

## 12. Definition of Done — V2

- All V1 mandatory tests still pass; regressions are fixed.
- Correct recognized O(log n), O(n log n), nested/sequential complexity and unknown classification.
- Inclusive/exclusive time and invocation counts satisfy nested/repeated activation invariants.
- Five or six recommendation rules with positive and negative tests; unsupported patterns do not trigger false advice.
- Secure resource-bounded job execution and concurrent isolation are tested.
- >=20 meaningful automated tests pass from documented repeatable commands.
- Dashboard explains assumptions, limits and source links.
- Team members can explain implementation trade-offs without relying on Codex-generated narration.

**Scope explicitly deferred to V3:** two-program performance comparison, repeated statistical benchmark experiments, benchmark corpus of realistic applications, complete evaluation/report export, final project claims and resume metrics.

## 13. V2 interview depth checklist

Each developer should be able to explain and locate relevant code for:
1. Why AST is useful for source-level program analysis.
2. How symbolic bounds are derived and what invalidates them.
3. Difference between syntactic nesting and asymptotic growth.
4. How nested RAII timers can be correct under early exits.
5. Inclusive vs exclusive time and double-counting.
6. How source offsets survive instrumentation.
7. How the backend prevents job cross-contamination and resource exhaustion.
8. When a rule recommendation may be wrong and when to abstain.
9. A bug found via testing, its cause, and the fix.
10. One rejected architecture alternative and its trade-off.

**Exit statement:** V2 should be a genuine **8/10+ resume-potential engineering project** if implemented and demonstrated well. This is an aspirational subjective assessment, not a promise of recruitment outcomes.
