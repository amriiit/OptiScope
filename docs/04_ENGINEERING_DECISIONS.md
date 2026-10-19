# OPTISCOPE — ENGINEERING DECISIONS AND CHANGE CONTROL

**Spec ID:** OS-SOT-04 | **Baseline:** 1.0 | **Created:** 19 October 2026  
**Status:** **BASELINE DECISION REGISTER**  
**Authority:** Project owner approval required for changes to locked SOT files.  
**Related:** [Master](00_MASTER_SPEC.md) · [V1](01_VERSION_1.md) · [V2](02_VERSION_2.md) · [V3](03_VERSION_3.md)

## 1. Purpose

This file preserves *why* OptiScope uses its current architecture, captures deliberately rejected alternatives, and controls modifications to the baseline. The codebase may evolve; the project's objectives and accepted version boundaries must not drift silently just because a different implementation is easier for a coding agent.

**Decision lifecycle:** `PROPOSED` → `ACCEPTED` or `REJECTED` → optionally `SUPERSEDED` by an accepted replacement. Only the project owner may accept changes; Codex may propose but must not auto-approve them.

### Document-level rule
The five delivered documents establish baseline **SOT-1.0**. Their current text is the working implementation contract. **No Git tag, merge protection, or remote commit is implied** by the word “locked”; a real repository commit/tag is a separate action when the team adds these docs to GitHub.

## 2. Baseline decisions

### ADR-001 — Restricted single-file C++ instead of a full C++ compiler
- **Status:** ACCEPTED AS BASELINE
- **Scope:** V1–V3
- **Decision:** Support and document a limited grammar sufficient to demonstrate loops/functions, AST, static reasoning and source instrumentation; extend only based on verified tests.
- **Why:** Full C++ preprocessing, templates, overload resolution and STL semantics cannot be implemented reliably in a short academic project.
- **Trade-off:** Lower generality; greater correctness, testability and transparency.
- **Alternative rejected:** Advertising support for all `.cpp` files or silently skipping unknown syntax.

### ADR-002 — Flex + Bison and custom typed AST
- **Status:** ACCEPTED AS BASELINE
- **Scope:** V1–V3
- **Decision:** Use actual Flex lexical analysis, Bison grammar/semantic actions and a custom C++ AST.
- **Why:** Demonstrates Compiler Design coursework and makes tree structure and source semantics directly inspectable.
- **Trade-off:** More grammar maintenance than using an existing full parser.
- **Alternative deferred:** Clang LibTooling; may be evaluated after final release, not substituted for core Flex/Bison path during current project.

### ADR-003 — Real runtime evidence, not sample numbers
- **Status:** ACCEPTED AS BASELINE
- **Scope:** V1–V3
- **Decision:** All reported timings require real instrumented execution; unknown/unavailable measurements are labeled as such.
- **Why:** The central project claim distinguishes theoretical complexity from actual workload cost.
- **Trade-off:** Harder implementation, sandbox/dependency requirements, slower demo pipeline.
- **Alternative rejected:** Random-number mock profiler or fixed runtime results keyed to filename.

### ADR-004 — AST-guided instrumentation with source links
- **Status:** ACCEPTED AS BASELINE
- **Scope:** V1–V3
- **Decision:** Use AST-validated source spans and stable region IDs to guide code transformation and join results.
- **Why:** Regex/source text heuristics cannot reliably respect nested constructs and source mapping.
- **Trade-off:** Limit instrumentation to safely recognized syntax; defer advanced control flow.
- **Alternative rejected:** Blind insertion of timers at every `for` substring.

### ADR-005 — Hotspot ranking based on observed cost
- **Status:** ACCEPTED AS BASELINE
- **Scope:** V1–V3
- **Decision:** Rank by correct measured exclusive time or non-overlapping measured time where exclusive attribution is not yet validated; provide Big-O as complementary explanatory metadata.
- **Why:** Worst theoretical Big-O need not be most costly under a specific workload.
- **Trade-off:** Results depend on benchmark workload and are not universally ranked.
- **Alternative rejected:** A “priority” score based only on loop depth or Big-O.

### ADR-006 — Conservative deterministic recommendations
- **Status:** ACCEPTED AS BASELINE
- **Scope:** V1–V3
- **Decision:** Recommendations are static templates triggered by evidence-backed AST patterns and accompanied by caveats.
- **Why:** Demonstrates compiler pattern matching and avoids hallucinated guarantees.
- **Trade-off:** More abstentions and fewer suggestions when semantics are uncertain.
- **Alternative rejected:** Recommending `unordered_map` for every nested loop or requiring an AI provider.

### ADR-007 — React frontend + Express API + C++ engine
- **Status:** ACCEPTED AS BASELINE
- **Scope:** V1–V3
- **Decision:** Separate browser UI, job/orchestration API and compiler/profiler engine.
- **Why:** Supports clear architecture, frontend demos, backend engineering and portable core C++ code.
- **Trade-off:** Multiple build systems/languages to integrate.
- **Implementation flexibility:** Choice of specific React UI components/build tooling within master stack remains open.

### ADR-008 — Docker isolation for compile-and-run
- **Status:** ACCEPTED AS BASELINE
- **Scope:** V1–V3
- **Decision:** Run compilations and uploaded program executables only in a constrained local Docker sandbox, behind explicit user profiling action.
- **Why:** C++ upload is executable untrusted code; direct host execution is unacceptable.
- **Trade-off:** Docker dependency, resource management and setup complexity.
- **Fallback:** Static analysis only when Docker is unavailable; no invented result and no unsafe host execution.
- **Security note:** This is local academic-tool hardening, not proof of safe public hosting.

### ADR-009 — V1 vertical slice, V2 rigor, V3 evidence
- **Status:** ACCEPTED AS BASELINE
- **Scope:** All versions
- **Decision:** V1 touches the complete pipeline for a narrow subset; V2 adds correctness and engineering depth; V3 validates practical usefulness with controlled repeated comparisons.
- **Why:** Prevents feature pile-up and gives a logical progression across reviews.
- **Trade-off:** UI visual change between versions may be less dramatic than underlying technical progress.

### ADR-010 — No database, authentication or AI dependency
- **Status:** ACCEPTED AS BASELINE
- **Scope:** V1–V3
- **Decision:** Keep the application local and stateless enough for ephemeral jobs, without user accounts or AI recommendations.
- **Why:** These systems add little to the core compiler/performance objective for the academic scope.
- **Alternative rejected:** Adding a database or AI only for perceived resume appeal.

### ADR-011 — Distinguish profiled vs uninstrumented benchmark performance
- **Status:** ACCEPTED AS BASELINE
- **Scope:** V2–V3
- **Decision:** Use instrumented runs to localize cost; use comparably compiled **uninstrumented** runs for V3 whole-program speedup.
- **Why:** Instrumentation overhead can distort claimed optimization gains.
- **Trade-off:** More builds, more run orchestration and additional result metadata.

### ADR-012 — Capability claims must have test evidence
- **Status:** ACCEPTED AS BASELINE
- **Scope:** V1–V3
- **Decision:** An implemented requirement must map to a reproducible test/demo; resume metrics must come from actual measurements.
- **Why:** Defensibility to faculty and interviewers is the project's defining quality target.
- **Alternative rejected:** Reporting planned functionality or synthetic numbers as completed work.

## 3. Implementation-level choices not locked yet

These are intentionally **open** until early engineering/testing decides them. They are not permission to override master invariants.

| ID | Open design question | Options / acceptance guidance |
|---|---|---|
| OPEN-01 | AST serialization library | `nlohmann/json` or a minimal tested writer; preserve stable schema |
| OPEN-02 | Exact source edit algorithm | Descending-offset insertions plus deterministic tie-break for nested wrappers; test comprehensively |
| OPEN-03 | Profiler record format | JSON Lines or compact structured text; parser must validate IDs and types |
| OPEN-04 | Job execution service boundary | Same Node API process with bounded child processes, or separate local worker; maintain isolation |
| OPEN-05 | Sample source output | `printf`/simple calls within grammar or no-output fixture with explicit exit check; show accurate evidence |
| OPEN-06 | CI platform | Chosen according to local build and sandbox availability; no fabricated green CI results |
| OPEN-07 | UI AST component | Custom collapsible tree vs a maintained package; must link source ranges |
| OPEN-08 | Final export renderer | HTML mandatory; PDF only if inexpensive and accurate |

**Rule:** Contributors can select ordinary implementation details and document them in an implementation note. They require an ADR amendment only if they change an accepted decision or a version acceptance requirement.

## 4. Decision checklist for future changes

Before accepting a proposal, answer:
1. Which concrete problem or failed test motivates the change?
2. Which `CORE-XX` and `Vn-FXX`/`Vn-TXX` requirements are affected?
3. Does the proposal increase or decrease language coverage, correctness, security or evaluation readiness?
4. How will we prove it works?
5. Does it jeopardize the next review's stable demonstration?
6. Is this actually needed for the 8/10+ resume/interview objective?
7. Who approved it, when, and which baseline version replaces what?

If the proposal mainly adds visual polish while correctness is incomplete, it should normally be deferred.

## 5. Amendment template

Copy the following block into this file for future proposals:

```md
### ADR-XXX — Short decision title
- **Status:** PROPOSED
- **Proposed on:** YYYY-MM-DD
- **Owner approval:** PENDING
- **Motivation / evidence:** ...
- **Existing behavior / requirement IDs:** CORE-XX, V2-FXX ...
- **Proposed change:** ...
- **Alternatives considered:** ...
- **Safety/correctness impact:** ...
- **Tests / acceptance changes:** ...
- **Version impact:** V1/V2/V3 ...
- **Approved on:** [only if approved]
- **Supersedes:** [exact requirement paragraph(s), only if approved]
- **New spec baseline:** SOT-x.y [only after accepted]
```

### Approval workflow
- Agent/developer files proposal as `PROPOSED` without editing version scope.
- Project owner reviews and explicitly approves/rejects.
- Upon approval, mark `ACCEPTED`, identify superseded paragraphs, bump the baseline identifier, and commit docs + code changes together.
- On rejection, retain the record for rationale but leave current baseline unchanged.
- On conflicting documents without an accepted override, stop the divergent implementation and follow `00_MASTER_SPEC.md`.

## 6. Decision-related interview stories to capture as implementation progresses

This section does **not** claim these events have happened. Record genuine examples with commit/test evidence:

- **AST design:** A parsing bug caused two sequential loops to be treated as nested; how tree structure fixed it.
- **Symbol dependencies:** A naive `n`-bounded loop was misclassified because its bound changed; how symbol tracking prevented false O(n).
- **Nested profiling:** Inclusive times incorrectly summed; how a stack-based exclusive timer corrected percentages.
- **Instrumentation:** A source rewrite affected `if/else` binding; why braced-only safe instrumentation was chosen or how the transformation was fixed.
- **Execution isolation:** Two concurrent jobs wrote to the same profile path; how UUID workspace isolation resolved the race.
- **Benchmark validity:** A supposed hoist speedup vanished at `-O2`; why the final report recorded a null result honestly.
- **Rule abstention:** A hashing recommendation would change behavior; why a dependency/semantics guard suppressed it.

These are **story templates**, not resume claims; replace them with real observed bugs or remove them.

## 7. Frozen baseline history

| Baseline | Date | Status | Contents |
|---|---|---|---|
| SOT-1.0 | 2026-10-19 | Locked as working specification | Master contract, V1/V2/V3 scope, architecture/security decisions |

**No approved amendment is recorded yet.** No repository tag is assumed. A future project-owner decision must be recorded here before claiming the source of truth has changed.

---

**Working agreement for Codex:** Read this and the relevant version spec; implement and test. You may document proposed changes, but may not treat an unapproved proposal as accepted or rewrite the spec to fit incomplete code.
