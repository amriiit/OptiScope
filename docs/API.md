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
