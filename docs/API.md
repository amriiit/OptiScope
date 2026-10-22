# JSON contract

All source uploads use `multipart/form-data`, one field named `file`, filename ending in `.cpp`, nonempty UTF-8, at most 131072 bytes. No stored jobs or database; Analyze and Profile each parse the supplied file afresh. IDs are preorder `R1`, `R2`, …, deterministic for unchanged source. Changing source can change IDs.

- `POST /api/analyze`: parse, static traversal and rule recommendations. Does not compile or execute uploaded C++.
- `POST /api/profile`: same analysis, then real container compilation and execution. This endpoint is called only by the explicit Run Profiling action.
- `GET /api/health`: API status, file-size limit and Docker daemon/image availability.
- `GET /api/samples`: allowlisted filenames.
- `GET /api/samples/:name`: `{fileName, source}` from the actual bundled file.

Successful analysis returns HTTP 200. Parse failure returns 422; upload validation 400; oversize 413; local-origin violations 403; concurrent-job limit 429. A successful static analysis with unavailable/failed profiling returns HTTP 200 and an explicit profiling status/errors. `success` refers to **static analysis**, not profiling.

```text
{
  fileName: string,
  success: boolean,
  errors: string[],
  warnings: string[],
  hasMain?: boolean,
  summary: null | {
    functionsDetected: integer,
    loopsDetected: integer,
    forLoops: integer,
    whileLoops: integer,
    maxNestingDepth: integer,
    worstEstimatedComplexity: string,
    totalMeasuredRuntimeMs: number | null
  },
  ast: Node | null,
  regions: Region[],
  hotspots: Region[],
  recommendations: Recommendation[],
  profiling: {
    status: 'not_run' | 'analysis_failed' | 'static_only' | 'unavailable'
          | 'unsupported' | 'compile_error' | 'compile_timeout' | 'runtime_error'
          | 'timeout' | 'output_limit' | 'error' | 'completed',
    metadata: null | {
      image: string,
      compiler: string,
      clock: string,
      denominator: string,
      timeoutSeconds: 5,
      singleThreaded: true,
      compilation: ProcessResult,
      execution?: ProcessResult
    },
    measuredTotals: null | {
      programRuntimeMs: number,
      programRuntimeNs: integer,
      regionExclusiveMs: number,
      uninstrumentedAndOverheadMs: number
    }
  }
}
```

A `Node` contains `type`, `text`, `startLine`, `endLine`, `startOffset`, `endOffset`, `regionId` (empty for non-regions), and recursive `children`. Offsets are zero-based **UTF-8 byte offsets**, start inclusive / end exclusive. Lines are one-based. `Program` may include leading whitespace in its range. UI uses line ranges; instrumentation uses byte offsets in the original C++ string.

A `Region` contains `id`, `type` (`ForStmt`/`WhileStmt`), `functionName`, `startLine`, `endLine`, `startOffset`, `endOffset`, `estimatedComplexity`, `reasoning`, `assumptions: string[]`, and `measurement`.

`measurement` is `null` until profiling completes, `{status: 'unexecuted'}` when its instrumented scope was never reached, or:

```text
{
  status: 'measured', inclusiveNs, exclusiveNs, calls,
  inclusiveMs, exclusiveMs, programRuntimePercent,
  lowConfidence: boolean, confidenceReason: string | null
}
```

A zero-iteration loop is still a **measured scope** (the loop condition is evaluated); a loop behind a false branch is **unexecuted**. No duration is invented for absent records. Calls count loop-scope entries, not iterations. In nested loops the inner scope is entered once per outer iteration.

Inclusive time includes timed child scopes. Exclusive time subtracts those children's inclusive time. Hotspots sort by descending exclusive time, unexecuted last. Before profiling they use source order and do not imply a performance ranking. Percentage denominator is separately measured **main() wall time**, including timer overhead, setup and program output. Exclusive region percentages therefore need not sum to 100%; inclusive percentages must never be summed. Aggregate exclusive times under 0.1 ms, or means under 1 µs per scope invocation, are marked low confidence; these are conservative UI heuristics, not a calibration of the hardware clock.

A `Recommendation` contains `id`, `regionId`, `severity` (`info`/`review`), `pattern`, `startLine`, `endLine`, `evidence`, `recommendation`, `caveat`. Runtime guidance is distinct from detected AST patterns. Recommendation counts in the UI are derived by joining `regionId`.

A `ProcessResult` contains `status` (`completed`/`timeout`/`output_limit`), `exitCode`, `stdout`, `stderr`. Negative exit codes denote container process signals. Compile errors include actual compiler diagnostics, capped to fit the output limit.

Unsupported external calls (anything other than a function defined in the uploaded file or printf) are static-only for runtime purposes.

Missing Docker, compile/runtime failure or malformed measurement records leave measured totals null. The API never falls back to host compilation/execution. The original uploaded file is never modified. Per-request directories and named containers are removed in `finally` blocks; container scratch files disappear with the container.


## Two-file comparison (execution-only)

`POST /api/compare` accepts multipart fields `original` and `optimized`, exactly one nonempty UTF-8 `.cpp` each, each at most 131072 bytes. No other files/fields are accepted. Shares the existing maximum of two active jobs with Analyze/Profile and the same local Host/Origin rules.

The comparison sandbox compiles both uninstrumented sources with identical `-std=c++17 -O2`, performs one warm-up each then ten measured runs each in alternating AB/BA order. Fixed internal deterministic workloads only; no stdin or fixture upload. Every warm-up/measured process must return zero and match captured stdout, stderr and exit status. Timing uses Python monotonic `perf_counter_ns` around bounded subprocess execution, including startup/capture overhead. No static parse is claimed, including for STL-containing code.

HTTP 200: `completed` or `not_equivalent`. HTTP 422: `unavailable`, `compile_error`, `runtime_error`, `timeout`, `output_limit` or orchestration `error`. Invalid uploads 400, oversized files 413, foreign origin/host 403 and shared job admission 429. Middleware errors/429 retain the existing analysis error envelope; comparison callers should accept `error` or `errors` fields.

```text
{
 status: string,
 equivalent?: boolean,
 analysisMode: 'execution_only',
 flags?: ['-std=c++17', '-O2'], runCount?: 10, warmupCount?: 1,
 compilations?: {original: ProcessResult, optimized?: ProcessResult},
 warmups?: {original?: TimedProcessResult, optimized?: TimedProcessResult},
 runs?: {original: TimedProcessResult[], optimized: TimedProcessResult[]},
 environment?: {platform, architecture, compiler, kernel, cpu},
 workload?: string,
 statistics: null | {original: Statistics, optimized: Statistics},
 speedup: number | null,
 runtimeReductionPercent: number | null,
 warnings: string[],
 metadata?: {image, imageId, timestamp, files: {original: {fileName, sha256}, optimized: {fileName, sha256}},
             order, timeoutSeconds: 2, totalBenchmarkBudgetSeconds: 25,
             compileTimeoutSeconds: 20, isolation},
 error?: string
}
```

`TimedProcessResult` is a ProcessResult plus actual `elapsedMs`. `Statistics` contains `timingsMs`, `runCount`, `meanMs`, `medianMs`, `minMs`, `maxMs`, `standardDeviationMs` (population). Completed equivalent results alone receive statistics/ratios. `speedup = originalMedian / optimizedMedian`; reduction = `(originalMedian - optimizedMedian) / originalMedian * 100`. Slower results retain negative reductions. Invalid/nonpositive timings are rejected, never divided by zero. Unavailable/early orchestration errors may contain only status/error rather than a full benchmark envelope.

Comparison compilation is bounded at 20 seconds per file; each execution at two seconds; total warm-up/measured phase at 25 seconds; outer Docker at 75 seconds. It uses the unchanged profile sandbox isolation/resource flags. Profile limits remain 20-second compile, five-second execution and 35-second outer Docker timeout. Comparison does not compare filesystem effects, verify all possible inputs or certify adversarial benchmark integrity. Short/noisy durations carry warnings; fixed run counts are currently not configurable.

Health's available Docker object now additionally includes `imageId`; this is additive. Analysis/Profile schemas and statuses remain compatible. Samples now also include `triple.cpp` and `independent.cpp`; comparison fixtures are uploaded separately and are not in the analysis sample selector.


## C++17 compiler frontend selection and additive metadata

`POST /api/analyze?frontend=auto|legacy|clang` and `POST /api/profile?frontend=auto|legacy|clang` retain the same one-file multipart format, 128 KiB ceiling, status semantics and shared two-job admission. Default `auto` first preserves native academic-parser success, then tries Clang on legacy rejection. `legacy` never requires Clang; `clang` always performs sandboxed C++17 syntax/semantic analysis. Invalid mode returns 400. Existing eight academic samples and comparison behavior remain unchanged.

Clang parsing occurs in Docker without executing the uploaded program. Valid syntax with unknown analysis still returns successful static analysis (200). Invalid C++/missing headers/unavailable parser/resource failures return unsuccessful static analysis (422) with errors and a classified frontend status. Legacy structural parsing intentionally retains its previous semantic-validation limits.

Clang results add:

- `frontend: {name:'clang', version:'14', status:'parsed'|'invalid_cpp'|'missing_dependency'|'resource_limit'|'error'|'unavailable', irVersion?:1}`.
- `diagnostics: [{message, severity, file, startLine, column, inMainFile}]`. Main-file links use physical uploaded-source lines; header diagnostics are not linked to incorrect input lines.
- Region `complexityConfidence: 'exact_pattern'|'estimated'|'unknown'` and `instrumentation: {supported:boolean, reason:string}`.
- `operations: [{name, containerType, startLine, estimatedComplexity, confidence, reason}]` for resolved standard calls, including explicit Unknown models.
- `recurrences: [{functionName,startLine,recursiveCalls,estimatedComplexity,confidence,reason}]`; narrow standalone estimates are not caller substitution.
- Summary `complexityConfidence`, `rangeForLoops`, `doLoops`; `forLoops` and `whileLoops` remain honest per-kind counts.
- `profilingUnsupportedReasons: string[]` for detected runtime-semantic exclusions such as threads.

Only safe regions are rewritten. After completed profiling, an excluded region has `{status:'unsupported', reason}` instead of an invented zero or unexecuted duration. Existing measured/unexecuted structures and main-time denominator are unchanged. A function-try-block main or detected multithreading can retain static success but return profiling unsupported. Normal compile/runtime failures preserve actual diagnostics/status and null measurements.

Clang's normalized AST retains existing node fields/children/source ranges and adds node kind names for range-for/do/switch/break/continue/throw/lambda/opaque constructs. Opaque means inference is unmodeled, not C++ parsing failed. Legacy native JSON remains byte-for-byte compatible at the parsed-object level for all eight baseline samples.

The generated rewrite is bounded at 1 MiB. Exceeding that bound retains static findings and returns an explicit profiling-unsupported reason; no truncated source is compiled.
