# Faculty practical demo — 7–10 minutes

## Before faculty arrives

Run the setup in README, start Docker Desktop, then:

```bash
npm ci
npm run build
npm run sandbox:build
npm run test:runtime
npm run dev
```

Open http://127.0.0.1:5173. Confirm Sandbox ready. **Browser visual/interaction QA was unavailable during this refactor.** Perform this preflight yourself: at 1440×900 and 1024×768, inspect upload/actions/metrics, chart labels, AST indentation and hotspot columns; at 390×844, check stacked panels and table/source horizontal scrolling without page overflow. Tab through upload, sample selector, actions, table rows and AST Locate; verify visible focus. Expand/collapse a loop, select a hotspot and observe source highlight, run profiling and hover a chart bar. Load every sample once. These are required manual checks, not previously verified results.

## Presentation sequence

| Time | Action | Expected observation and talking point |
|---|---|---|
| 0:00–1:00 | Show `docs/MVC_ARCHITECTURE.md` and main code paths | React → Express → native C++ → Flex → Bison → typed AST → static analysis/instrumentation → Docker → joined results. Native static analysis reads text; only the explicit profiling action executes uploaded code in a container. |
| 1:00–3:00 | Choose `nested.cpp`, Load Sample, Analyze | One function, two nested for regions, maximum depth 2, O(n²). Expand AST function/body/loop branches. Select R2: O(n) local cost per invocation; enclosing R1 O(n²). Run Profiling; show actual main time, exclusive/inclusive, R1 one invocation and R2 1,200 invocations. Select a hotspot and show original source lines. |
| 3:00–3:45 | Load `sequential.cpp`, Analyze | Two sibling loops, depth 1 and O(n), since O(n)+O(n) retains the dominant growth order. Depth is not a general Big-O algorithm. |
| 3:45–4:30 | Load `logarithmic.cpp`, Analyze | Multiplication/division progression produces O(log n); show assumptions. Tiny runtime measurements may be dominated by timers. |
| 4:30–5:45 | Load `mixed_hotspots.cpp`, Analyze, Run Profiling | O(small³ + large²), with independent workload names. Inspect the observed exclusive ranking and source. The larger quadratic workload can dominate the smaller cubic workload; do not rehearse fixed milliseconds. |
| 5:45–6:45 | Load `patterns.cpp`, Analyze | Four actual AST rule patterns with source evidence, proposed actions and caveats. A nested loop alone is not proof that hashing preserves semantics. |
| 6:45–8:15 | Compare section: upload `samples/comparison/original.cpp` and `optimized.cpp`, Compare in Docker | Original performs repeated equality scans; optimized builds a bounded frequency array. Both print the same `hits` result. Show execution-only label, -O2 flags, 1 warm-up, 10 raw runs, median, variation, actual ratio and warnings. Hashes record the uploaded implementations. A result from one fixture is not proof for all inputs. |
| 8:15–9:00 | Upload `int main(){std::cout << 4;}` saved as `.cpp`, Analyze | Actual subset-parser error. Restore nested sample afterwards. |
| Optional | Load `triple.cpp` or `independent.cpp` | O(n³) at depth 3; independently authored stepped-linear × logarithmic example O(log width * width). These results come from content, not filenames. |

## Explain these distinctions

- Static estimates describe recognized structural families under assumptions. Measured costs describe one workload on this machine.
- Inclusive duration includes children; exclusive duration subtracts timed child intervals. Never sum nested inclusive durations. Percentages divide by measured main() time.
- Invocation count is a whole-loop scope entry, not a loop-body iteration counter.
- A profiler build uses -O0 and RAII timers; comparison uses uninstrumented -O2 executables. Their values answer different questions.
- Named bounds remain symbolic even when demo programs initialize them to constants. While-loop estimates, dependent bounds and unknown callees remain Unknown.

## Recovery

- Docker unavailable: start Docker Desktop; run `npm run sandbox:build`; press Recheck. Continue static analysis while recovering. Never execute uploads directly on the host.
- Engine missing/build error: use Homebrew Flex/Bison/GNU Make PATH from README, then `npm run build`.
- API unreachable: restart `npm run dev`; check ports 3001/5173. Production alternative: `npm run build && npm start`, open port 3001.
- Busy/429: wait for existing bounded jobs, then retry. Changing files clears old analysis and measurements.
- Compiler/runtime error: show diagnostics and actual exit status; switch to the tested sample rather than claiming successful measurements.
- Very short/noisy comparison: show the warning; discuss overhead and repeat with larger deterministic input. Never guarantee a speedup.

The code/API/Docker workflow is tested; faculty-demo visual readiness still requires the manual browser preflight above. Do not call the entire locked V1/V2/V3 acceptance scope complete.


## C++17 / DSA extension (after the original 7–10 minute demo)

Rebuild the image after pulling these changes: `npm run build && npm run sandbox:build`. Select **Clang · full C++17 syntax** in Compiler frontend. Upload `samples/dsa/arrays.cpp`, Analyze, then Run Profiling; show using/STL/reference syntax, real functions/loops and output. Upload `graphs.cpp` or `dynamic_programming.cpp`; explain that successful parsing does not prove a graph or DP complexity formula. Inspect per-region confidence and library-operation assumptions in the coverage panel.

Upload `samples/dsa/stress.cpp` (unchanged copy of `/Users/amrit/Desktop/test.cpp`): Analyze shows 39 source callables including lambdas, 35 regions and depth 3. Profile and show all 18 benchmark sections and the deterministic checksum. Printed Execution Time values are nondeterministic and must not be compared exactly or rehearsed as constants. The automated test compares all other stdout lines with an uninstrumented original executed in Docker.

For failure handling, upload a missing-header source or syntax error in Clang mode and use its diagnostic line link. For partial instrumentation, explain macro/constexpr/goto exclusions and the distinction from an unexecuted region. For academic questions, switch to Legacy and demonstrate the actual Flex/Bison grammar and its unchanged sample output.

The original eight sample-menu items are retained; DSA files are uploaded from disk. This workflow is exercised at API/component level. Live browser selection/click/focus behavior still needs the manual preflight above.
