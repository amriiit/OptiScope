# Baseline audit — 22 October 2026

Confirmed existing repository identity: OptiScope, Node workspaces (Express/React), Flex/Bison C++17 engine and Docker sandbox. Read the five locked SOT files, README/API/FILES/VALIDATION, lexer/parser/AST/main, Makefile, Dockerfile, all backend/frontend source and existing tests/samples before refactoring. No applicable AGENTS.md was present in this project or its parent chain.

Initial working tree had user edits in `.gitignore` and `backend/src/routes/api.js`. The route edit was formatting-only relative to HEAD. Its full working copy was saved outside the repo before extraction; the behavior was retained in MVC layers. `.gitignore` was left untouched. Work was isolated on local branch `refactor/mvc-practical-demo`; no baseline commit mixed the user's edits with agent work. No reset, push or remote publication occurred.

Initial structure: one Express server, one route file, `analyzer.js` handling native analysis/Docker/profile merging, `process.js`, container `sandbox.py`; a compressed monolithic C++ main; a Dashboard holding fetch/state/render logic plus AST/source/chart/hotspot components. Six real samples and four test files already existed.

Existing features: restricted real Flex/Bison AST, smart-pointer typed nodes, byte/line spans, preorder region IDs, constant/linear/polynomial/logarithmic structural costs, conservative Unknowns, scoped identifiers, source-guided RAII timers, stack-based inclusive/exclusive/call accounting, main-time denominator, four evidence-backed AST rules plus measured general guidance, secure local upload/API, real Docker execution, output/errors, sample loading and source/AST selection presentation.

Limitations already present: no full C++/STL/type checking, while-loop inference, general call graph, sorting detector, repeated benchmark or comparator; single -O0 profile with timer overhead; region parent relationship available through AST rather than explicit API parentRegionId; no previously completed browser QA.

Baseline commands actually completed:

- `npm ci`: success, 227 packages added, zero reported vulnerabilities. Restricted-network attempt failed DNS; the authorized network-capable retry succeeded. An initial build/test started before dependency installation had settled and failed missing-package imports. Those were setup failures, not accepted baseline results.
- `npm run build`: passed, real native executable and Vite production output.
- `npm test`: **21 passed, 0 failed, 0 skipped** with actual Docker enabled.
- `npm run sandbox:build`: passed, Docker 29.7.2, Debian bookworm Linux ARM64 image, real g++/Flex/Bison build.
- `npm run test:runtime`: **21 passed, 0 failed, 0 skipped** after restoring dependencies following the restricted installer failure.

Before refactor, JSON from all six original samples was saved to `/tmp/optiscope-baseline/analysis.json`. After initial engine extraction every parsed JSON object matched exactly, including AST source spans, IDs, costs, assumptions, warnings and rules. All seven original engine tests also passed before proceeding. Later loop-bound module extraction retained the same output; see final validation.

Reference image absent; explicit prompt design requirements used. Native browser permissions blocked visual QA. These restrictions are not counted as passes.

## C++17 compatibility upgrade baseline — 22 October 2026

The new user request explicitly authorizes a Clang frontend alongside the academic Flex/Bison parser, superseding the old implementation restriction for this upgrade. The five locked specifications stay unchanged. Baseline rerun: **57 passed, 0 failed, 0 skipped** (`/tmp/optiscope-cpp17-baseline.log`). All current working changes are preserved on `refactor/mvc-practical-demo`; original eight analysis JSON outputs and the native baseline executable were saved under `/tmp/optiscope-cpp17-baseline/`.

| Construct | Legacy syntax / interpretation before upgrade |
|---|---|
| scalar int/double/bool/void, blocks, arithmetic, basic arrays | Accepted; no full semantic type checking |
| canonical for, if/else, while | Parsed; for costs conditional on progression/effects; while Unknown |
| include lines | Opaque text only, no header processing |
| namespaces/using, typedef, const/volatile/auto, long/unsigned | Rejected by lexer/grammar |
| references/pointers, classes/methods, templates, lambdas, STL, ranges, structured bindings | Rejected or not representable |
| macros, switch, do, break/continue, exceptions | Rejected |
| recursion and unknown calls | Limited call syntax, unknown cost; profiling restricts calls to local definitions/printf |
| instrumentation | Source-offset RAII wrappers assume supported standalone loop statements and two-child function layout |
| function discovery | Root children assumed to be functions with simple type/name text |
| diagnostics | Legacy syntax strings, no separate semantic/header/inference classification |

Apple Clang 17 is installed but LibTooling development headers/libraries are absent from the normal Homebrew LLVM prefix. Use Debian bookworm Clang/LLVM 14 development packages in Docker for the supported Clang path, including on macOS development. Native legacy compilation remains unchanged. Prefer typed LibTooling AST APIs over JSON or textual dumps; normalize only main-file source constructs, retain conservative opaque nodes and separate parsing success from inference confidence. Real stress input found at `/Users/amrit/Desktop/test.cpp` (18 benchmarks), to be preserved and copied as a test fixture.
