# OPTISCOPE V1 — REVIEW 1 IMPLEMENTATION SPECIFICATION

**Spec ID:** OS-SOT-01 | **Baseline:** 1.0 | **Date:** 19 October 2026  
**Status:** **LOCKED V1 SCOPE** | **Target review:** 20 October 2026  
**Depends on:** [00_MASTER_SPEC.md](00_MASTER_SPEC.md)  
**Positioning:** A technically genuine **vertical slice**, not the finished analyzer.

## 1. Objective and Review 1 story

**Goal:** Show a faculty reviewer a working browser workflow in which a user uploads a supported single-file `.cpp`, the compiler frontend creates a real AST, the static analyzer identifies loops and estimated complexity, the tool **actually measures** execution for safely instrumented regions in an isolated runtime, and the dashboard ranks hotspots and displays conditional rule-based guidance.

The V1 story is: **“We implemented the architecture end to end for a restricted language subset; upcoming reviews improve accuracy, coverage, and experimental validity.”**

### V1 success is not
- A static screenshot with invented output.
- Regex searches for `for` presented as a compiler parser.
- Hardcoded `820 ms` runtime bars or canned complexity results for uploaded files.
- A supposed full C++ compiler.
- An unsafe feature that runs uploaded user code directly on the host.

## 2. User-facing functionality

| ID | Requirement | Priority | Observable behavior |
|---|---|---|---|
| V1-F01 | `.cpp` upload | P0 | Select file; show code/line numbers; reject invalid extension/oversized file |
| V1-F02 | Bundled samples | P0 | Load and analyze bundled examples with one click |
| V1-F03 | Analyze | P0 | Flex/Bison parse, AST, source-linked loops, function/loop counts |
| V1-F04 | Static estimate | P0 | O(1), O(n), O(n²), O(n³) on recognized patterns, with assumptions |
| V1-F05 | AST viewer | P0 | Expandable tree: function, blocks, loops, declarations, expressions |
| V1-F06 | Explicit profiling | P0 | Click to compile/run an instrumented supported file in Docker; real times only |
| V1-F07 | Hotspot ranking | P0 | Correctly ranked **measured** code regions; no nested-inclusive double count |
| V1-F08 | Rule suggestions | P0 | 3–4 conservative rules that fire only on recognized evidence |
| V1-F09 | Click-through source | P1 | Selecting region highlights relevant source line range |
| V1-F10 | Honest failures | P0 | Unsupported syntax, compilation errors, missing Docker and timeouts appear clearly |

**Minimum page structure:** header/title; upload/sample selector; editor-like read-only source area; Analyze / Run Profiling actions; summary cards; hotspot list/chart; AST explorer; recommendation panel; error/warning banner. The layout may be compact, but it must be real data-bound React UI.

## 3. V1 C++ language subset — exact initial target

### Supported, required
- One translation unit; `#include` lines preserved but treated as **opaque** to our parser.
- Scalar types `int`, `double`, `bool`, `void`, functions with parameters and braced bodies, `main`.
- Numeric literal/identifier expressions, binary arithmetic `+ - * / %`, comparisons `< <= > >= == !=`, assignment `= += -=`, postfix/prefix `++/--`, and basic boolean conditions.
- Variable declarations (`int count = 0;`), assignment and expression statements, `return` and braced blocks.
- `for` loops of forms such as `for (int i=0; i<n; i++)` and `for (int j=0; j<n; j+=1)`.
- Simple `while` loops, for example `while (i < n) { i++; }`.
- Nested and sequential combinations of supported loops.
- Basic `if/else` when unambiguously parseable, limited ordinary function-call syntax (`work(i)`) and string literal arguments (`printf("%d", count)`) if the V1 sample set uses them.
- Accurately tracked source line and offset spans for loop statements and function bodies.

### Optional stretch, NOT a V1 completion blocker
- Fixed numeric arrays/indexing; `for` loop with multiplicative update; more comparison/logical operators; single-level simple array expressions.
- A perfect pretty AST graphic; extra charts/animations.

### Explicitly unsupported in V1
- Full headers/preprocessing, templates, classes, member functions, `std::vector` semantics, `std::find` recognition, iterators, pointer alias analysis, lambdas, switch, try/catch, advanced macros, recursion complexity, nontrivial namespaces, multi-file analysis and arbitrary STL.
- Return **“unsupported construct”** with a line range when possible; do not silently skip it.

## 4. Static frontend and AST

### Required implementation chain

```text
input.cpp
  -> Flex lexer (token + location)
  -> Bison parser (grammar + semantic actions)
  -> typed AST (source ranges)
  -> visitor/traversal
  -> region inventory + complexity estimate
  -> JSON
```

**No shortcuts:** Flex and Bison must genuinely participate. A regex scanner may help classify opaque preprocessor lines, but must not replace the parser or AST construction.

### Minimum AST types
`Program`, `FunctionDecl`, `Block`, `VarDecl`, `ForStmt`, `WhileStmt`, `IfStmt`, `ReturnStmt`, `Assignment`, `BinaryExpr`, `UnaryExpr`, `CallExpr`, `Identifier`, `Literal`.

Ownership should be safe (e.g. `std::unique_ptr`), and AST serialization must not require leaking pointers. If full symbol lookup is too costly for V1, store declaration/identifier names and block scopes in a minimal table while deferring dependency analysis to V2.

**Source map:** all loop regions must include stable ID, function name, parent ID, 1-based start/end line and byte start/end offsets. IDs should be assigned deterministically for one analysis, e.g. preorder `R1`, `R2`, and preserved into the instrumented file and profile records.

### Analysis rules actually required

| Input pattern | Required result | Condition |
|---|---|---|
| `for(i=0;i<n;i++)` | O(n) | `n` unchanged and step constant |
| Fixed 10-iteration loop | O(1) in `n` | Bound known numeric constant |
| Two nested independent `n` loops | O(n²) | Each O(n) |
| Three nested independent `n` loops | O(n³) | Each O(n) |
| Two sequential `n` loops | O(n) | Add and take dominant order |
| `while(i<n){ i++; }` | O(n) | Recognized initialization and update |
| Unknown bound/side effects | `Unknown` | Never infer from depth alone |

V1 complexity must include a brief reasoning string, e.g. “two nested canonical unit-step loops bounded by n,” and assumptions. No claim of general automatic Big-O inference.

## 5. Profiling contract — necessary to show real hotspots

### Constraints
- Profiling is initiated by a separate button, **not automatically on upload**.
- Only instrument **verified, safe-to-wrap** source regions. For V1 this may be limited to loops written as standalone statements in braced blocks with documented supported control flow.
- Preserve the original source file unchanged and write `instrumented.cpp` separately.
- Inject `std::chrono::steady_clock` scope guards that span the entire loop statement, not just one iteration's body, and write records to a separate output file so user stdout is untouched.
- Nested instrumentation is allowed **only if** region IDs and timing accounting are tested. If a nested region cannot be reliably profiled, show `not individually measured` rather than fabricate an inner duration.
- Use actual `g++` compilation and execution inside Docker, enforce resource/time/output limits, and show compile/runtime errors.
- Times must be `null` when unavailable; a non-executed loop is NOT interchangeable with 0 ms.

### Implementation guidance (not mandatory algorithm)
Use AST source spans to insert wrappers around selected standalone loops, applying text insertions in **descending byte-offset order**. RAII scope timers survive early `return` from supported scopes. A per-thread/single-thread stack may accumulate immediate child elapsed time and compute exclusive time. If V1 implementation does not validate this correctly for nested loops, only rank **non-overlapping measured regions**; V2 makes complete nested/inclusive/exclusive timing mandatory.

**Meaning of region time:** The timer surrounds one activation of the whole loop statement, not every iteration. `invocations` counts region entries; V2 may add iteration counters.

### Runtime contribution
- Report a labeled denominator: e.g. `exclusiveMs / instrumentedProgramWallMs` if both accurate.
- It is acceptable for percentages to sum to less than 100% because not all code is instrumented.
- Never add overlapping inclusive times. If the denominator/accounting is unavailable, omit contribution percentage.

### Offline / unavailable mode
If Docker is not installed or cannot run, static analysis and AST remain operational; profiling status must explicitly say **unavailable**. Do not invent timings or quietly execute C++ on the host.

## 6. V1 hotspot rankings and rules

### Hotspot results
Every measured hotspot contains at least: `regionId`, `sourceLines`, `function`, `regionKind`, `complexity`, `runtimeMs`, `measurementKind`, `rank`, `reason`. The sort key is **exclusive measured time** where tested, otherwise comparable non-overlapping durations.

Static complexity **is not** the default runtime ranking key. On the same test workload, an O(n²) region may outrank an O(n³) region when measured time is larger.

### Required 3–4 deterministic recommendations
1. **High measured exclusive runtime** → inspect algorithm/data structure (generic, clearly labeled guidance).
2. **Recognized canonical nested independent loops** → note multiplicative work and suggest reviewing repeated computations (do **not** promise a specific algorithm).
3. **Recognized invariant constant arithmetic in loop** → suggest hoisting *only* if the expression is side-effect-free and does not depend on mutated state; otherwise refrain.
4. **Recognized repeated pairwise equality on supported array-like indexed data** → conditional consideration of hashing/frequency counts; only fire if the rule genuinely detects the pattern, otherwise no recommendation.

**Hardcoded recommendations** means static rule templates triggered by real AST evidence; it does **not** mean the same suggestion attached to every uploaded file. V2 will implement more formal dependency checks.

## 7. API contract and UI result fidelity

**Endpoints:** `POST /api/analyze`, `POST /api/profile`, and an available samples listing mechanism. Route payloads to the real C++ engine and keep JSON fields aligned with the master schema.

Status values should distinguish: `not_requested`, `static_complete`, `profile_complete`, `unsupported_syntax`, `compile_failed`, `runtime_failed`, `timed_out`, `docker_unavailable`. Prefer typed error objects with message, source span if known, and stage.

**Source highlighting:** Input line range shown for a hotspot must match the parsed input file. No hardcoded ranges that work only for bundled sample screenshots.

**Source summary UI:** If no profile has been run, display `Not profiled` or `—` for runtime cards, never example numbers.

## 8. Required bundled demos

All accepted samples must be *actual on-disk compilable programs*, accepted by our own lexer/parser, and should include `main()` for profiling. Calibrate workloads on the actual laptop to complete within resource limits. Save at least:

1. `linear.cpp` — O(n) canonical loop.
2. `nested.cpp` — O(n²), AST displays one loop child of another.
3. `sequential.cpp` — two O(n) siblings; overall O(n), not O(n²).
4. `triple.cpp` — O(n³) for a small enough workload, or label static-only if runtime is too slow.
5. `mixed_hotspots.cpp` — *stretch demonstration*: smaller-workload cubic loop and larger-workload quadratic loop, with observed ranking driven by measurements (not preset values).

A selected sample must actually compile and execute. For demos, use workloads with observable side effects/output so computation is not optimized away; document compile flags (V1 diagnostic profiling initially `-O0`). Avoid timings so short they are indistinguishable from timer overhead.

## 9. Demo choreography (faculty, ~4–6 minutes)

1. Open locally running OptiScope and select `nested.cpp`.
2. Explain Flex tokens, Bison grammar, AST, source location mapping; click **Analyze**.
3. Expand the AST and point at nested loop parent/child relationship; show O(n²) and explanation.
4. Click **Run Profiling** and show newly generated measured data and attribution limitations.
5. Select the hotspot and highlight the source lines; show a conditional suggestion and its evidence.
6. Load `sequential.cpp`; demonstrate O(n), proving the analyzer is not blindly using loop count/depth.
7. Optionally run `mixed_hotspots.cpp` to emphasize static complexity versus actual cost.
8. Clearly state planned V2/V3 work: richer analysis, robust profiling, reproducible comparisons.

**Viva questions to rehearse:** lexer vs parser; why AST rather than regex; why sequential and nested loops differ; what a source span is; why Big-O is not runtime; inclusive vs exclusive; why uploads must be sandboxed; what V1 explicitly cannot understand.

## 10. V1 acceptance gates and verification matrix

| Test ID | Action/input | Expected observation |
|---|---|---|
| V1-T01 | Analyze `linear.cpp` | Real AST, one canonical loop, O(n) |
| V1-T02 | Analyze `nested.cpp` | AST parent/child loops, O(n²) |
| V1-T03 | Analyze `sequential.cpp` | Sibling loops, O(n) |
| V1-T04 | Analyze `triple.cpp` | Three-level nest, O(n³) in static analysis; profiling may be static-only if run cost is excessive |
| V1-T05 | Upload invalid or unsupported syntax | Accurate visible error, no invented successful analysis |
| V1-T06 | Upload file above size ceiling/non-cpp | Request rejected cleanly |
| V1-T07 | Profile `nested.cpp` with Docker | Real timings; stable region IDs and correct line links |
| V1-T08 | Try Docker unavailable | Explicit unavailable warning; static workflow unaffected |
| V1-T09 | Run program with infinite loop | Timeout and cleanup, no indefinitely hung API request |
| V1-T10 | Click hotspot | Correct source range highlighted |
| V1-T11 | Reload/change input | Recomputed results; no stale samples/old timings |
| V1-T12 | Build frontend + backend + engine | Build completes and documented commands work |

**Definition of Done — V1:** V1-F01 through F08 and F10 satisfy tests; live demo works on at least linear, nested and sequential; profiler displays **real** measurements or visibly unavailable; security constraints are active; unsupported functionality is openly documented. O(n³) recognition in `V1-T04` remains a required static-analysis case; full runtime execution of that sample is optional if it exceeds configured limits.

**If time runs short:** Prioritize a correct vertical slice of (upload → Flex/Bison AST → nested/sequential complexity → real sandboxed profiling → one source-linked recommendation). Drop cosmetic polish, optional syntax and extra charts first. Do **not** fake or bypass runtime isolation.

## 11. Out of scope / forbidden claims

- No claim that OptiScope handles arbitrary `.cpp` or full STL.
- No fabricated accuracy scores, runtime distributions, speedups or achieved optimizations.
- No public deployment of executable upload pipeline.
- No automated arbitrary rewrites and no V3 comparison UI in V1.
- No database, authentication, AI integration or GitHub integration necessary.

## 12. Deliverables and Codex handoff

**Files/deliverables:** running React app, Express API, `lexer.l`, `parser.y`, AST definitions, static analyzer, source instrumenter, Docker job runner, result serializer, tested samples, shell/dev scripts, minimal README, and a machine-readable test summary.

**Codex instruction for V1:** Read [00_MASTER_SPEC.md](00_MASTER_SPEC.md), this file, and [04_ENGINEERING_DECISIONS.md](04_ENGINEERING_DECISIONS.md). Implement only V1 requirements. Work in small compiling increments and run acceptance tests. Report each V1-T result as `PASS`, `FAIL` or `NOT TESTED`, including any reason. Do not change locked specs without approval. Implement `POST /api/profile` only behind an isolated executable path; if safe profiling is incomplete, state it plainly rather than simulate success.

---

**Version 1 frozen boundary:** Complete the end-to-end **idea**, for a small documented subset. V2 adds engineering *correctness and depth*; V3 proves measurable *value and reproducibility*.
