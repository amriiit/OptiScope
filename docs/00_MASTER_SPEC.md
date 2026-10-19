# OPTISCOPE — MASTER SOURCE OF TRUTH

**Project:** OptiScope — Compiler-Assisted Performance Hotspot Analyzer  
**Specification ID:** OS-SOT-00  
**Baseline:** 1.0  
**Baseline date:** 19 October 2026  
**Status:** **LOCKED IMPLEMENTATION BASELINE** (a design specification, not a claim of completed code)  
**Targets:** V1 = Review 1; V2 = Review 2; V3 = final academic delivery and portfolio-quality release  
**Audience:** Project team, faculty reviewers, Codex, future maintainers, and technical interviewers.

> **Core rule:** This document defines WHAT OptiScope is, what it must demonstrate, and what it must not claim. Code generators and contributors must implement against this specification, not silently replace it with a more convenient project.

## 1. Project identity and non-negotiable purpose

**One-sentence definition:** OptiScope is a compiler-assisted static and dynamic analysis tool that parses a **documented subset of single-file C++**, represents its structure as an AST, estimates complexity for supported patterns, measures real execution time for safely instrumented code regions, ranks measured hotspots, and produces evidence-based rule recommendations and comparisons.

**The question OptiScope answers:** **Which code region should a developer investigate or optimize first for this specific workload, and why?**

### Motivation
- Worst-case asymptotic complexity is not the same as observed runtime for a given input and machine.
- A theoretically cubic region may run rarely or process small data; a quadratic region may dominate execution time.
- Developers need *both* a structural explanation (AST and complexity assumptions) and runtime evidence (instrumented timings).
- Recommendations should explain detected patterns rather than promise guaranteed speedups.

### Success statement
A user can upload a supported `.cpp` file, inspect its source and AST, receive clearly qualified static complexity results, explicitly request sandboxed execution to obtain **actual** timings, see source-linked ranked hotspots, inspect reasoned suggestions, and, in V3, compare an original program with a behaviorally equivalent optimization under a controlled workload.

## 2. Audience and evaluation goals

1. **Compiler Design academic value:** real lexer, grammar/parser, AST, symbolic reasoning, source transformation and measurable execution.
2. **Engineering value:** traceable source locations, correct profiling semantics, secure job isolation, tests, honest failure handling, benchmark reproducibility.
3. **Resume/interview value:** genuine discussion of parser design, AST traversal, symbolic bounds, RAII timing, inclusive/exclusive costs, sandboxing, concurrency, validation and trade-offs for roughly 30 minutes. This is a preparation goal, **not a guarantee of interview duration or recruiter rating**.
4. **Implementation philosophy:** fewer correctly supported constructs beat more advertised but broken capabilities.

## 3. Canonical version boundaries

| Capability | V1 — Review 1 | V2 — Review 2 | V3 — Final |
|---|---|---|---|
| Upload/source browser | Functional local UI | Better diagnostics and mapping | Stable experience, comparisons/export |
| Frontend/backend | React + API working | Reliable job management | Reproducibility/quality polish |
| Flex/Bison | Real restricted grammar | Better statements/expressions | Fixes based on corpus, not full C++ |
| AST | Typed tree, loop/function nodes | Scoped symbols, richer nodes/ranges | Validated source links and diagrams |
| Static analysis | O(1), O(n), O(n²), O(n³) for supported loops | O(log n), O(n log n), mixed/conditional bounds and unknowns | Benchmark-validated explanations |
| Runtime profiling | Real timers for safely instrumented regions | Robust inclusive/exclusive, counts, nested timing, overhead | Repeatable statistically described runs |
| Hotspots | Ranked measured regions, no invented values | Sound nesting/denominator logic | Multi-workload comparisons and validation |
| Recommendations | 3–4 conservative triggered rules | 5–6 evidence-backed AST rules | Verify examples and evaluate usefulness |
| Comparison | Out of scope | Internal fixtures / groundwork | Two-file original-vs-optimized comparison |
| Security | Local-only, sandboxed compile/run | Concurrency/failure isolation | Hardening and fault tests |
| Verification | 3–5 real demos plus automated checks | 20+ meaningful automated tests | 40+ meaningful tests + 3 benchmark studies |

These are **acceptance targets**, not statements that the features already exist. A missing V1 runtime profiler is a missing required V1 feature; do not substitute animated or hardcoded charts.

## 4. Technology stack — locked by default

- **Frontend:** React, Vite, Tailwind CSS; Recharts for charts; expandable native React AST explorer.
- **API/orchestration:** Node.js + Express, local-only deployment, filesystem-backed ephemeral jobs.
- **Lexer:** Flex (`lexer.l`).
- **Parser:** Bison (`parser.y`) with semantic actions constructing real AST nodes.
- **Core engine:** C++17, typed AST representation, visitors/recursive traversal, rule engine.
- **Compiler:** `g++` inside a controlled build/run environment.
- **Runtime measurement:** `std::chrono::steady_clock`, per-region instrumentation and aggregated profile records.
- **Sandbox:** locally available Docker on the development machine; no direct execution of uploaded programs on the host.
- **Testing:** deterministic C++ input fixtures; tests for engine, API and frontend; repeatable benchmark scripts in V3.
- **Storage:** no database required in V1–V3; remove ephemeral input, binaries, output and trace files after each job/retention period.
- **Explicit non-goals:** an LLM/AI recommendation API, user auth, public SaaS hosting, a full compiler backend, full ISO C++ support, arbitrary multi-file project analysis.

**Implementation discretion:** React component libraries, exact AST classes, JSON serialization library and build scripts may be chosen by the implementer *if* public contracts and version acceptance criteria remain intact. Any change to the locked principal stack needs an approved decision record.

## 5. End-to-end architectural contract

```text
                  Browser (React/Vite)
            Upload | Source | AST | Results
                           |
                      Express API
                           |
                  Job/Artifact Manager
                           |
            +--------------+--------------+
            |                             |
      C++ Analysis Engine           Docker Job Runner
      Flex -> Bison -> AST           Compile + Execute
            |                             ^
      Symbols + Loop Regions                |
            |                      Instrumented source
      Static Complexity                      |
            +----------> Source Instrumenter
            |                             |
            +----------- Stable Region IDs |
                           |               |
                           +-------+-------+
                                   |
                          Profile Aggregator
                                   |
                         Hotspot Ranker + Rules
                                   |
                           Structured API JSON
                                   |
                    Dashboard / Compare / Export
```

### Architectural invariants

**INV-01 — Authenticity:** AST content, reported complexity, measurements and detected recommendations must originate from analysis, actual execution or explicitly labeled estimates. Never invent an `820 ms` result for presentation.

**INV-02 — Truthful coverage:** Unsupported syntax is rejected or reported as partially unsupported. An unparsed source section must not be labeled "analyzed" without explanation.

**INV-03 — Source traceability:** Every analyzable loop/region has a stable ID, AST reference and line/offset range consistent across the backend response, source viewer, profiler output and recommendations.

**INV-04 — Static vs measured:** Big-O estimate and measured time are different fields. The tool must not claim Big-O is empirically proven by one timing run.

**INV-05 — Safe execution:** Source supplied through the browser must **never** be compiled and executed unsandboxed as a normal host process. Profiling always requires explicit user interaction.

**INV-06 — No nesting double-count:** Inclusive times of overlapping nested regions must never be added together as if they were exclusive. If exclusive time is not correctly computed in a feature path, mark it unavailable and avoid invalid contribution percentages.

**INV-07 — Honest denominator:** Every runtime percentage must label its denominator (e.g. fraction of instrumented program wall time). Uninstrumented work can account for the remainder.

**INV-08 — Recommendation evidence:** Specific recommendations must state the source pattern/assumption that triggered them, plus semantic caveats. “Nested loop” alone is not evidence that hashing will help.

**INV-09 — No implied optimizer:** OptiScope advises; it does not automatically rewrite arbitrary user code. V3 compares **user-supplied** original and optimized files.

**INV-10 — Demonstrable reproducibility:** Accepted functionality must pass scripts/tests and run on the team's development environment; README commands cannot be fictional.

## 6. Supported C++ contract

OptiScope analyzes a **restricted, explicitly documented, single-file C++17 subset**, not generic C++17. See each version document for the subset that must be available at its milestone.

### Essential constructs (V1)
- `int`, `double`, `bool`, `void` scalar declarations, simple parameters, functions including `main`.
- Numeric and boolean literals; identifiers; basic arithmetic and relational operators; basic assignments and compound assignments; pre/post increment/decrement.
- Braced blocks, `return`, basic function calls, `for` loops with recognized canonical updates and `while` loops in a limited form.
- `if` / `else` within the supported grammar where implementation tests demonstrate correctness.
- Basic array indexing and numeric arrays where completed; treat this as best effort for V1, mandatory expanded support in V2.
- Textual `#include` lines may be **preserved as opaque preprocessor directives** for compilation; this is not preprocessing or semantic understanding of arbitrary headers.

### Intentionally unsupported unless explicitly added/tested
- Templates, classes/inheritance, complex overload resolution, macros beyond opaque directive preservation, namespaces requiring semantic resolution, advanced pointers/aliases, lambda expressions, exceptions, complex STL/template instantiations, multi-file builds, arbitrary recursion, dynamic allocation analysis and open-world call graphs.
- V1 must not advertise `std::vector`/`std::find` support merely because the broader project concept mentions them. V2 may recognize specifically tested patterns or classify unknown library calls as unknown cost.

### Complexity policy
- Complexity is **estimated only for recognized patterns and under stated assumptions** (for instance, bound `n` remains unchanged).
- A fixed-bound loop is O(1) with respect to varying input `n`; a variable-unit-step loop may be O(n), a constant multiplicative factor may be O(log n), and a mixed nest may be O(n log n).
- Sibling loops combine via dominant-term addition. Nested independent iteration counts multiply; dependent bounds require suitable analysis or `Unknown`.
- Calls with unknown cost, data-dependent termination, aliasing, mutation of bounds or unsupported semantics must use `Unknown`/`Partial`, not a guessed exact Big-O.

## 7. Analysis and profiling semantics

### Static regions
Each `Region` contains at least: `id`, `kind`, `functionName`, `startLine`, `endLine`, `startOffset`, `endOffset`, `parentRegionId`, `complexity.label`, `complexity.assumptions`, `complexity.reasoning`, `supported`, `warnings`.

### Runtime facts
`inclusiveMs` is wall time for the **entire region including timed descendants**. `exclusiveMs` is time in the region **excluding directly nested measured descendant intervals**, using a correct per-thread/single-thread stack accounting method. `invocations` is number of region activations (NOT loop iteration count if timer covers entire loop statement). `measured=false` is distinct from zero milliseconds; non-executed or uninstrumentable regions are labeled explicitly.

V1 may offer a narrower safe instrumentation path than V2. In no version should the implementation silently use inclusive sums to calculate shares. Hotspots rank by **exclusive measured time** when reliable; otherwise use **clearly labeled, non-overlapping timed regions** only.

**Coverage note:** Time outside instrumented regions is **unattributed**, not “zero”. Small timings may be dominated by instrumentation overhead. Benchmarks in V3 must separate instrumented hotspot diagnostics from uninstrumented end-to-end speedup measurements.

### Runtime safety baseline
- Run **only on localhost**, no public deployment; accept `.cpp` with a configurable default maximum of 256 KiB.
- Reject invalid uploads and enforce request limits; use generated isolated job directories.
- Profile by explicit click only; use `spawn`/`execFile` with fixed arguments, never shell interpolation of source, filename or user input.
- Compile/run inside Docker with: no network, non-root, CPU/memory/PID/time limits, dropped capabilities, `no-new-privileges`, bounded stdout/stderr, read-only mounts where feasible, and restricted writable output paths.
- Use configurable initial ceilings (e.g., compile timeout ~20 s, program timeout ~5 s, memory 512 MiB, CPU 1, output 64 KiB). Adjust only with measured evidence and document the effective values.
- Keep static analysis available with a clear warning if Docker is missing; **profiling must be unavailable**, not simulated.
- Docker hardening reduces risk; it does **not** mean arbitrary untrusted C++ is safe to expose as a public internet service. No secrets or broad host directories mounted into the sandbox.
- Track aborted jobs and always clean artifacts; concurrent requests require isolated directories and bounded job admission.

## 8. UX and API contract

### Minimum frontend journey
1. Load one `.cpp` (or a bundled working sample) into a source viewer.
2. Click **Analyze**. Show AST, detected region IDs/line ranges, function and loop counts, estimates, reasons, and warnings.
3. Click **Run profiling** (separate explicit action). Show measured regions, status, actual timing values, and ranking.
4. Select a hotspot to highlight the relevant lines; see matching recommendation evidence.
5. In V3, upload/select an optimized program and compare controlled results and output-equivalence check.

### API endpoints (baseline)
- `POST /api/analyze` — upload source; return structural and static results. No execution of user code.
- `POST /api/profile` — explicit profiling request; return profiled source regions or an honest error/status.
- `GET /api/samples` — return available bundled examples and metadata (can be a static frontend import in V1 if documented).
- `POST /api/compare` — **V3 only**: controlled original/optimized comparisons; not a V1 promise.

Minimum JSON shape (exact envelope can evolve if all consumers/tests agree):

```json
{
  "success": true,
  "fileName": "nested.cpp",
  "status": "static_complete",
  "summary": {"functions": 1, "loops": 2, "maxNesting": 2, "worstEstimatedComplexity": "O(n^2)"},
  "ast": {"type": "Program", "children": []},
  "regions": [],
  "hotspots": [],
  "recommendations": [],
  "profiling": {"status": "not_requested", "totalWallMs": null},
  "warnings": [],
  "errors": []
}
```

**Example only:** Do not populate fields with canned values at runtime. Treat JSON output as a versioned contract; include tests asserting that IDs and line ranges match real uploaded source.

## 9. Requirements traceability and definitions of done

**Master requirement keys:**
- **CORE-01** Real Flex and Bison frontend builds typed AST.
- **CORE-02** Verified source-to-AST/region mapping.
- **CORE-03** Honest static complexity for supported idioms.
- **CORE-04** Real isolated program execution and timing.
- **CORE-05** Correct hotspot ranking and non-overlap accounting.
- **CORE-06** AST-driven, explainable recommendations.
- **CORE-07** Browser-to-engine integration with clear errors.
- **CORE-08** Original-vs-optimized validated comparison (V3).
- **CORE-09** Security and resource limits for uploaded code.
- **CORE-10** Evidence: automated tests, benchmark measurements, documentation and interview readiness.

Each version document maps deliverables to these requirements and defines tests with expected observations. Do not call a version “done” merely because its UI loads or a diagram exists.

## 10. Quality and acceptance principles

A feature passes only when:
1. The actual implementation exists (not a placeholder or fabricated output).
2. A specific test/sample reproduces its claim on the team’s machine.
3. Unsupported cases fail honestly and do not hang or corrupt other jobs.
4. User input does not become shell syntax or escape execution controls.
5. Results distinguish static assumptions from runtime measurements.
6. The team can explain the relevant implementation and at least one trade-off.

**Measurement integrity:** A stated runtime, speedup or complexity improvement in slides/resume must be backed by recorded evidence; otherwise label it illustrative. Avoid “supports C++” without “documented C++ subset.”

## 11. Milestones and boundaries

- **V1:** Complete, visible, honest **vertical slice**. Real source upload, real Flex/Bison AST, common loops, complexity estimates, actual profiling for safe supported regions, hotspot list and conservative rule recommendations.
- **V2:** **Deep engineering**. Broaden useful patterns, implement correct nested/repeated timing accounting, source mapping and scoped symbol/dependency checks, handle concurrent jobs and failure modes, expand tests.
- **V3:** **Demonstrate value and rigor**. Two-version comparison, output equivalence, repeated benchmark runs, statistical reporting, three convincing case studies, reproducibility, documentation, final testing and report export.

## 12. Source-of-truth governance

**Documentation set:**
- `00_MASTER_SPEC.md` — project contract and invariants.
- `01_VERSION_1.md` — V1 implementation and gates.
- `02_VERSION_2.md` — V2 implementation and gates.
- `03_VERSION_3.md` — V3 implementation and gates.
- `04_ENGINEERING_DECISIONS.md` — approved rationale, proposed changes and amendment history.

**Change control:** These five files form baseline **SOT-1.0**. They are locked *as an implementation reference*, not physically immutable. Only the project owner may authorize a scope/architecture change. Proposals go in `04_ENGINEERING_DECISIONS.md` as `PROPOSED`; approval changes them to `ACCEPTED`, states exactly which requirements are superseded, and increments the appropriate specification revision. Until then, Codex must treat these documents as read-only.

**Conflict rule:** An explicitly **accepted**, requirement-specific amendment in `04_ENGINEERING_DECISIONS.md` supersedes only the named text; otherwise this master specification outranks version-specific docs, which in turn outrank implementation notes or Codex output. Do not treat a sample, screenshot or exploratory code as a silent spec amendment.

**Handoff to Codex:** Read all five docs, implement the selected version only, maintain a coverage checklist keyed to requirement IDs, run tests and report PASS/FAIL/NOT IMPLEMENTED. Never claim completion without verification; never edit the locked docs without owner approval.

## 13. Glossary

- **AST:** Abstract Syntax Tree; structural representation of source.
- **CFG:** Context-free grammar; parser production rules for supported syntax.
- **Region:** A source-linked instrumentable/analyzable function or loop with stable ID.
- **Static complexity:** Symbolic estimate under explicit assumptions.
- **Inclusive time:** A timed region's total elapsed time including its measured children.
- **Exclusive time:** Time attributed to a region excluding nested timed children.
- **Hotspot:** A region warranting optimization investigation because its measured cost is relatively high for the tested workload.
- **Instrumentation:** Behavior-preserving insertion of measurement hooks into the supported input.
- **Workload:** Input and environment under which observed runtime is measured.
- **Source of truth:** Approved requirements baseline used to resolve disagreements during implementation.

---

**Baseline close:** OptiScope is successful only if its **compiler evidence, runtime evidence, and recommendations agree honestly**. A visually impressive dashboard with fabricated results fails this specification.
