# Known limitations

Parsing, complexity inference, safe instrumentation and runtime completion are separate outcomes. A valid C++17 program can parse successfully while some costs remain Unknown or some regions cannot be rewritten.

## Compiler frontends

- **Clang mode:** real Clang 14 LibTooling C++17 syntax/semantic analysis with the standard headers installed in the Linux sandbox. Third-party headers, platform-specific APIs and multifile builds are not supplied automatically. Missing dependencies have their own diagnostics. A resource-bounded compiler invocation is not an unlimited promise to accept every template-heavy translation unit.
- **Legacy mode:** original Flex/Bison academic subset. No full preprocessing, classes/templates/STL/references/general semantic validation. It remains independently tested and useful offline. Its original eight sample JSON outputs remain unchanged.
- **Auto mode:** first preserves legacy-parser success, then tries Clang on rejection. Select Clang explicitly for semantic validation of every input, including otherwise legacy-compatible source.
- macOS local development uses the Linux Clang container. Native academic and web builds are verified on macOS; direct native macOS LibTooling compilation is **not verified** because development libraries are absent. The optional Makefile target needs platform-appropriate LLVM/link settings outside the supported container.

## Analysis coverage

- Normalized Clang IR preserves functions, methods, template/lambda source bodies, loops, branches, calls and original byte spans. Header bodies/instantiated duplicates are omitted. Opaque nodes retain their children and force unknown effects; this is incomplete inference, not a parse failure.
- Supported families include canonical constant/linear/product/logarithmic loops, independent nesting, sequential dominance, safe standard-container range iteration and a narrow triangular enclosing upper envelope. Estimates assume valid monotone arithmetic/no overflow and stated side-effect/bound conditions. Explicit scalar-reference writes and possible container-alias mutation suppress tested unsafe estimates; this is not complete alias/dataflow analysis.
- While/do termination, general dependent bounds, pointer algorithms and whole-program call graphs remain Unknown. Simple scalar direct n-1 recursion with a proven syntactic base pattern gets a separately labeled O(n) estimate. Branching recursion, memoization, graph traversal and arbitrary DP algorithms are not inferred by name or container use. The standalone recurrence is not propagated into callers.
- STL models require actual standard declarations/container categories and scalar/unit operation assumptions. Custom callbacks, comparators, policies, unsupported overloads and unknown ranges abstain. Hash models expose worst-case linear behavior, not a guaranteed constant bound. Vector growth uses a worst-case bound; amortized behavior is explicitly conditional.
- Named size variables/container sizes remain symbolic even when fixtures initialize them with constants. Relationships such as `n = a.size()` are not generally substituted across expressions. Whole-source summary is a structural envelope across source functions, not a call-graph proof.
- Four conservative AST optimization rules and separate measured runtime guidance remain. No proven sorting detector, AI optimizer or automatic semantics-preserving rewrite was added.

## Instrumentation and measurements

- Macro-derived loop boundaries, constexpr functions and functions with labels/goto are excluded from rewriting and reported. Function-try-block main and detected multithreading retain static findings but reject profiling. Unsupported nodes can still have safely instrumented loop descendants.
- Timers surround whole loop scopes, not individual iterations. Counts are scope activations, including repeated/recursive entries. Recording is active only during main, excluding global constructor/destructor work from that denominator.
- One -O0 instrumented run, with real inclusive/exclusive/main wall time. Timer overhead, added scopes, allocation and scheduling can affect tiny or frequently entered regions. Exceptions must unwind normally into supported handlers; abort/exit/crash/nonzero completion does not produce trusted completed measurements. Instrumentation namespace collisions or unmodeled compile restrictions can still cause a real compile error; static results are retained.
- Profiling remains single-threaded; detecting standard threading constructs is not a complete proof that arbitrary code is single-threaded. Deliberate profiler/benchmark tampering by adversarial code remains outside the prototype measurement model. Sandbox resource/filesystem/network restrictions remain enforced.

## Comparison and operations

- Comparison remains fixed internal inputs, one warm-up and ten -O2 uninstrumented runs, matching stdout/stderr/zero exit. No universal equivalence or filesystem-side-effect proof; no stdin/fixture upload, configurable repetitions, full input-family validation or statistical significance claim.
- One benchmark study is provided, with source hashes, image/compiler/environment/timing evidence. Three studies, guaranteed CPU/revision capture and final HTML/PDF report export remain unfinished. The project is not V3-complete.
- Two active jobs per server, no durable queue, cancellation-on-disconnect or crash-recovery daemon. Regular cleanup is tested; abrupt machine/backend termination can leave artifacts.

## UI verification

The supplied Retro-OS UI Kit reference was inspected for the multi-page redesign. Browser visual/interactive QA is **NOT VERIFIED** because no browser provider was connected. Automated server-rendered route checks and DOM navigation tests cover page separation, real HTTP/sample/analysis bindings, source selection, retained profiling output and comparison files, and corpus launch. DOM chart geometry is supplied by the test harness and does not validate actual viewport layout, hover or visual focus. Complete the manual preflight in [UI_DESIGN_GUIDE.md](UI_DESIGN_GUIDE.md) before a presentation.

Workspace state persists across route navigation within one tab. Refresh clears it; there is no durable storage or shared multi-tab workspace.
