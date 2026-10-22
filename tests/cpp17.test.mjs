import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { build } from "esbuild";
import { pathToFileURL } from "node:url";
import * as apiClient from "../frontend/src/services/apiClient.js";
import test from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile, mkdtemp, chmod, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { analyzeSource } from "../backend/src/services/AnalysisService.js";
import {
  dockerStatus,
  runSandbox,
  removeContainer,
} from "../backend/src/infrastructure/DockerRunner.js";
import { app } from "../backend/src/app.js";
const docker = await dockerStatus();
if (process.env.REQUIRE_DOCKER && !docker.available)
  throw new Error(docker.reason);
const real = { skip: !docker.available, timeout: 180000 };
const parse = (source) =>
  analyzeSource("arbitrary-name.cpp", source, false, "clang");
const profile = (source) =>
  analyzeSource("arbitrary-name.cpp", source, true, "clang");
const corpus = {
  arrays: "3 1 6\n",
  sort_search: "1 3 1\n",
  strings_two_pointers: "1 2 1 6\n",
  linked_list: "3 6\n",
  stacks_queues: "5\n",
  trees_bst: "17 1 0\n",
  graphs: "4 4 6 1\n",
  disjoint_sets: "1 0\n",
  dynamic_programming: "55 55 3 6 7\n",
  backtracking: "16 6 720\n",
  modern_cpp: "6 11 6 7 ok 2 9\n",
};
for (const [name, expected] of Object.entries(corpus))
  test(
    `C++17 corpus ${name}: semantic parse, mapped regions, real compilation and behavior`,
    real,
    async () => {
      const source = await readFile(`samples/dsa/${name}.cpp`, "utf8");
      const result = await profile(source);
      assert.equal(result.success, true, JSON.stringify(result.errors));
      assert.equal(result.frontend.name, "clang");
      assert.equal(
        result.profiling.status,
        "completed",
        JSON.stringify(result.errors),
      );
      assert.equal(result.profiling.metadata.execution.stdout, expected);
      assert.ok(result.summary.functionsDetected > 0);
      if (name === "disjoint_sets")
        assert.equal(result.summary.loopsDetected, 0);
      else assert.ok(result.summary.loopsDetected > 0);
      const bytes = Buffer.from(source);
      for (const region of result.regions) {
        assert.ok(region.startOffset < region.endOffset);
        assert.ok(region.endOffset <= bytes.length);
        assert.ok(
          ["exact_pattern", "estimated", "unknown"].includes(
            region.complexityConfidence,
          ),
        );
        assert.ok(
          bytes.subarray(region.startOffset, region.endOffset).length > 0,
        );
      }
      assert.ok(
        result.profiling.measuredTotals.regionExclusiveMs <=
          result.profiling.measuredTotals.programRuntimeMs,
      );
    },
  );
const structural = [
  ["fixed", "for(int i=0;i<10;i++){}", "O(1)"],
  ["linear", "for(int i=0;i<n;i++){total+=i;}", "O(n)"],
  [
    "independent sizes",
    "for(int i=0;i<n;i++)for(int j=0;j<m;j++){total+=i+j;}",
    "O(m * n)",
  ],
  [
    "cubic",
    "for(int i=0;i<n;i++)for(int j=0;j<n;j++)for(int k=0;k<n;k++){total+=k;}",
    "O(n^3)",
  ],
  [
    "sequential product bound",
    "for(int i=0;i<n;i++){}for(int j=0;j<n*n;j++){}",
    "O(n^2)",
  ],
  ["logarithmic", "for(int i=1;i<n;i*=2){total+=i;}", "O(log n)"],
  [
    "n log n",
    "for(int i=0;i<n;i++)for(int j=1;j<n;j*=2){total+=j;}",
    "O(log n * n)",
  ],
  [
    "triangular upper envelope",
    "for(int i=0;i<n;i++)for(int j=0;j<i;j++){total+=j;}",
    "O(n^2)",
  ],
];
for (const [name, body, expected] of structural)
  test(`Clang structural inference: ${name}`, real, async () => {
    const r = await parse(
      `long long f(int n,int m){long long total=0;${body}return total;}`,
    );
    assert.equal(r.success, true, JSON.stringify(r.errors));
    assert.equal(
      name === "sequential product bound"
        ? r.summary.worstEstimatedComplexity
        : r.regions[0].estimatedComplexity,
      expected,
    );
  });
test(
  "Clang separates valid recursion, graph and memoization syntax from unknown algorithm cost",
  real,
  async () => {
    for (const name of [
      "trees_bst",
      "graphs",
      "dynamic_programming",
      "backtracking",
    ]) {
      const r = await parse(await readFile(`samples/dsa/${name}.cpp`, "utf8"));
      assert.equal(r.success, true);
      assert.equal(r.summary.worstEstimatedComplexity, "Unknown");
      assert.equal(r.summary.complexityConfidence, "unknown");
    }
  },
);
test(
  "STL registry models iterator categories, sorting and mutation worst cases conservatively",
  real,
  async () => {
    const r = await parse(
      "#include <algorithm>\n#include <vector>\n#include <list>\nvoid f(std::vector<int>& a,std::list<int>& b){std::sort(a.begin(),a.end());std::stable_sort(a.begin(),a.end());std::reverse(a.begin(),a.end());std::lower_bound(a.begin(),a.end(),3);std::lower_bound(b.begin(),b.end(),3);a.push_back(4);}",
    );
    assert.equal(r.success, true, JSON.stringify(r.errors));
    const op = (name) => r.operations.filter((o) => o.name === name);
    assert.equal(op("sort")[0].estimatedComplexity, "O(a.size * log a.size)");
    assert.equal(
      op("stable_sort")[0].estimatedComplexity,
      "O(a.size * (log a.size)^2)",
    );
    assert.equal(op("reverse")[0].estimatedComplexity, "O(a.size)");
    assert.deepEqual(
      op("lower_bound").map((x) => x.estimatedComplexity),
      ["O(log a.size)", "O(b.size)"],
    );
    assert.equal(op("push_back")[0].estimatedComplexity, "O(a.size)");
  },
);
test(
  "unknown calls, mutated induction and container growth do not receive invented exact costs",
  real,
  async () => {
    const sources = [
      "void unknown(int&);void f(int n){for(int i=0;i<n;i++){unknown(n);}}",
      "#include <utility>\nvoid f(int n){int x=1;for(int i=0;i<n;i++){std::swap(n,x);}}",
      "#include <vector>\nvoid f(std::vector<int>& a){for(int i=0;i<a.size();i++){a.push_back(i);}}",
    ];
    for (const source of sources) {
      const r = await parse(source);
      assert.equal(r.success, true, JSON.stringify(r.errors));
      assert.equal(r.regions[0].estimatedComplexity, "Unknown");
    }
  },
);
test(
  "structured Clang diagnostics distinguish invalid C++, missing headers and source locations",
  real,
  async () => {
    const invalid = await parse(
      "using namespace std;\nint main(){int value=;}",
    );
    assert.equal(invalid.success, false);
    assert.equal(invalid.frontend.status, "invalid_cpp");
    assert.ok(
      invalid.diagnostics.some(
        (d) => d.severity === "error" && d.startLine === 2 && d.inMainFile,
      ),
    );
    const header = await parse(
      "#include <optiscope_nonexistent_header.hpp>\nint main(){}",
    );
    assert.equal(header.success, false);
    assert.equal(header.frontend.status, "missing_dependency");
    const depth = await parse(
      "template<int N>struct A{using type=typename A<N-1>::type;};template<>struct A<0>{using type=int;};A<3000>::type value;int main(){}",
    );
    assert.equal(depth.success, false);
    assert.equal(depth.frontend.status, "resource_limit");
  },
);
test(
  "macro, constexpr and goto boundaries stay visible but are excluded from unsafe rewrites",
  real,
  async () => {
    const source =
      '#include <cstdio>\n#define REPEAT(N) for(int i=0;i<N;i++)\nconstexpr int fixed(){int s=0;for(int i=0;i<3;i++)s+=i;return s;}\nint jump(){int s=0;again:for(int j=0;j<1;j++)s++;if(s<2)goto again;return s;}\nint main(){int total=fixed()+jump();REPEAT(4){total+=i;}printf("%d\\n",total);}';
    const r = await profile(source);
    assert.equal(r.success, true, JSON.stringify(r.errors));
    assert.equal(r.profiling.status, "completed", JSON.stringify(r.errors));
    assert.equal(r.profiling.metadata.execution.stdout, "11\n");
    assert.ok(
      r.regions.some((region) => region.instrumentation.supported === false),
    );
    assert.ok(
      r.regions
        .filter((region) => !region.instrumentation.supported)
        .every((region) => region.measurement.status === "unsupported"),
    );
  },
);
test(
  "RAII survives early return, break, continue and caught exceptions in modern functions",
  real,
  async () => {
    const source =
      '#include <iostream>\n#include <stdexcept>\nint helper(){for(int i=0;i<5;i++){if(i==2)return i;}return 0;}int main(){int total=0;for(int i=0;i<6;i++){if(i==1)continue;if(i==4)break;for(int j=0;j<2;j++)total++;}try{for(int k=0;k<3;k++){throw std::runtime_error("expected");}}catch(const std::exception&){total+=helper();}std::cout<<total<<"\\n";}';
    const r = await profile(source);
    assert.equal(r.success, true);
    assert.equal(r.profiling.status, "completed", JSON.stringify(r.errors));
    assert.equal(r.profiling.metadata.execution.stdout, "8\n");
    for (const region of r.regions.filter(
      (r) => r.measurement.status === "measured",
    ))
      assert.ok(
        region.measurement.inclusiveNs >= region.measurement.exclusiveNs,
      );
  },
);
async function baseline(source) {
  const dir = await mkdtemp(path.join(tmpdir(), "optiscope-cpp17-original-"));
  const container = "optiscope-original-" + randomUUID();
  try {
    await chmod(dir, 0o755);
    await writeFile(path.join(dir, "instrumented.cpp"), source, {
      mode: 0o644,
    });
    const r = await runSandbox(dir, container);
    assert.equal(r.compilation.exitCode, 0, r.compilation.stderr);
    assert.equal(r.execution.exitCode, 0, r.execution.stderr);
    return r.execution.stdout;
  } finally {
    await removeContainer(container);
    await rm(dir, { recursive: true, force: true });
  }
}
test(
  "mandatory 18-benchmark workspace stress program parses/profiles and retains deterministic results",
  real,
  async () => {
    const source = await readFile("samples/dsa/stress.cpp", "utf8");
    const original = await baseline(source);
    const r = await profile(source);
    assert.equal(r.success, true, JSON.stringify(r.errors));
    assert.equal(r.profiling.status, "completed", JSON.stringify(r.errors));
    assert.ok(r.summary.functionsDetected >= 20);
    assert.ok(r.regions.length >= 30);
    assert.equal(r.summary.maxNestingDepth, 3);
    assert.ok(r.regions.some((x) => x.estimatedComplexity === "O(n^3)"));
    assert.ok(r.regions.some((x) => x.estimatedComplexity === "O(log n)"));
    assert.ok(r.regions.some((x) => x.estimatedComplexity === "Unknown"));
    const stable = (text) =>
      text
        .split("\n")
        .filter((line) => !line.startsWith("Execution Time:"))
        .join("\n");
    assert.equal(
      stable(r.profiling.metadata.execution.stdout),
      stable(original),
    );
    assert.equal((original.match(/Execution Time:/g) || []).length, 18);
    const cache = path.resolve("node_modules/.cache");
    const bundle = await mkdtemp(path.join(cache, "cpp17-view-"));
    try {
      await build({
        entryPoints: ["AstTree", "SourceViewer"]
          .map((name) => `frontend/src/components/${name}.jsx`)
          .concat("frontend/src/views/components/AnalysisCoverage.jsx"),
        outdir: bundle,
        outExtension: { ".js": ".mjs" },
        bundle: true,
        packages: "external",
        platform: "node",
        format: "esm",
        jsx: "automatic",
        logLevel: "silent",
      });
      const load = async (name) =>
        (await import(pathToFileURL(path.join(bundle, name + ".mjs")).href))
          .default;
      const AstTree = await load("components/AstTree");
      const coverage = await load("views/components/AnalysisCoverage");
      const astHtml = renderToStaticMarkup(
        React.createElement(AstTree, {
          ast: r.ast,
          frontend: "clang",
          selectedId: r.regions[0].id,
          onSelect: () => {},
        }),
      );
      const coverageHtml = renderToStaticMarkup(
        React.createElement(coverage, {
          result: r,
          onSelect: () => {},
          onDiagnostic: () => {},
        }),
      );
      assert.match(astHtml, /Clang → normalized typed IR/);
      assert.match(coverageHtml, /Parsing success is separate/);
      assert.match(coverageHtml, /sort/);
    } finally {
      await rm(bundle, { recursive: true, force: true });
    }
    await writeFile(
      "docs/evidence/cpp17-stress.json",
      JSON.stringify(r, null, 2) + "\n",
    );
  },
);
test(
  "Clang static analysis cannot access host paths or execute uploaded code",
  real,
  async () => {
    const denied = await parse(
      '#include "/Users/amrit/Desktop/test.cpp"\nint main(){}',
    );
    assert.equal(denied.success, false);
    assert.equal(denied.frontend.status, "missing_dependency");
    const r = await parse("#include <cstdlib>\nint main(){std::abort();}");
    assert.equal(r.success, true);
    assert.equal(r.profiling.status, "not_run");
    assert.equal(r.summary.totalMeasuredRuntimeMs, null);
  },
);
test(
  "modern runtime failures remain explicit and multithreaded profiling is rejected",
  real,
  async () => {
    const crash = await profile(
      "#include <cstdlib>\nusing namespace std;int main(){abort();}",
    );
    assert.equal(crash.success, true);
    assert.equal(crash.profiling.status, "runtime_error");
    assert.equal(crash.summary.totalMeasuredRuntimeMs, null);
    const thread = await profile(
      "#include <thread>\nint main(){std::thread t([]{});t.join();}",
    );
    assert.equal(thread.success, true);
    assert.equal(thread.profiling.status, "unsupported");
    const runaway = await profile(
      "using Size=unsigned;int main(){while(true){}}",
    );
    assert.equal(runaway.success, true);
    assert.equal(runaway.profiling.status, "timeout");
  },
);
test(
  "frontend selection keeps legacy API behavior and exposes Clang findings over multipart HTTP",
  real,
  async () => {
    const server = await new Promise((resolve, reject) => {
      const s = app.listen(0, "127.0.0.1", () => resolve(s));
      s.on("error", reject);
    });
    try {
      const base = `http://127.0.0.1:${server.address().port}/api/analyze`;
      const post = async (mode, source) => {
        const body = new FormData();
        body.append("file", new Blob([source]), "real.cpp");
        return fetch(base + "?frontend=" + mode, { method: "POST", body });
      };
      const source = await readFile("samples/dsa/arrays.cpp", "utf8");
      const r = await (await post("clang", source)).json();
      assert.equal(r.success, true);
      assert.equal(r.frontend.name, "clang");
      const originalFetch = globalThis.fetch;
      globalThis.fetch = (url, options) =>
        originalFetch(
          `http://127.0.0.1:${server.address().port}${url}`,
          options,
        );
      try {
        const clientResult = await apiClient.analyzeSource(
          source,
          "real.cpp",
          "analyze",
          "clang",
        );
        assert.equal(clientResult.success, true);
        assert.equal(clientResult.frontend.name, "clang");
      } finally {
        globalThis.fetch = originalFetch;
      }

      assert.ok(r.regions.length > 0);
      assert.equal((await post("legacy", source)).status, 422);
      assert.equal((await post("not-a-compiler", source)).status, 400);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  },
);

test(
  "global constructors are outside the main-time denominator and cannot contaminate records",
  real,
  async () => {
    const source =
      '#include <iostream>\nstruct Global{int sum=0;Global(){for(int i=0;i<10000;i++)sum+=i;}} global;int main(){std::cout<<global.sum<<"\\n";}';
    const r = await profile(source);
    assert.equal(r.success, true, JSON.stringify(r.errors));
    assert.equal(r.profiling.status, "completed", JSON.stringify(r.errors));
    assert.equal(r.profiling.metadata.execution.stdout, "49995000\n");
    assert.ok(
      r.regions.every((region) => region.measurement.status === "unexecuted"),
    );
  },
);
test(
  "library models abstain for custom algorithms, comparators, fake container names and allocating callbacks",
  real,
  async () => {
    const r = await parse(
      "#include <vector>\n#include <algorithm>\n#include <numeric>\nnamespace custom{template<class T>struct vector{T* begin();T* end();};}\nvoid f(std::vector<int>& a,custom::vector<int>& b){std::sort(a.begin(),a.end(),[](int x,int y){return x>y;});std::sort(b.begin(),b.end());std::accumulate(a.begin(),a.end(),0,[](int x,int y){for(int i=0;i<y;i++)x+=i;return x;});}",
    );
    assert.equal(r.success, true, JSON.stringify(r.errors));
    const selected = r.operations.filter((op) =>
      ["sort", "accumulate"].includes(op.name),
    );
    assert.equal(selected.length, 3);
    assert.ok(selected.every((op) => op.estimatedComplexity === "Unknown"));
  },
);
test(
  "oversized modern allocations fail inside the unchanged memory-limited sandbox",
  real,
  async () => {
    const r = await profile(
      "#include <vector>\nint main(){std::vector<char> data(512*1024*1024);return data[1];}",
    );
    assert.equal(r.success, true);
    assert.equal(r.profiling.status, "runtime_error");
    assert.equal(r.summary.totalMeasuredRuntimeMs, null);
  },
);
test(
  "recurrence inference solves only a guarded scalar n-1 recurrence and abstains on branching recursion",
  real,
  async () => {
    const r = await parse(
      "long long factorial(int n){return n<2?1:n*factorial(n-1);}\nint fib(int n){if(n<2)return n;return fib(n-1)+fib(n-2);}",
    );
    assert.equal(r.success, true, JSON.stringify(r.errors));
    const factorial = r.recurrences.find((f) =>
      f.functionName.startsWith("factorial("),
    );
    assert.equal(factorial.estimatedComplexity, "O(n)");
    assert.equal(factorial.confidence, "estimated");
    const fib = r.recurrences.find((f) => f.functionName.startsWith("fib("));
    assert.equal(fib.estimatedComplexity, "Unknown");
    assert.equal(fib.recursiveCalls, 2);
  },
);
test(
  "Clang byte ranges and stable IDs survive UTF-8, shared-end unbraced loops and dangling else",
  real,
  async () => {
    const source =
      '// λ source bytes\n#include <cstdio>\nint main(){int n=4;int sum=0;if(n>0)for(int i=0;i<n;i++)for(int j=0;j<n;j++)sum+=i+j;else sum=99;printf("%d\\n",sum);}';
    const a = await profile(source),
      b = await parse(source);
    assert.equal(a.profiling.status, "completed", JSON.stringify(a.errors));
    assert.equal(a.profiling.metadata.execution.stdout, "48\n");
    const geometry = (r) =>
      r.regions.map((x) => [
        x.id,
        x.startOffset,
        x.endOffset,
        x.startLine,
        x.endLine,
        x.estimatedComplexity,
      ]);
    assert.deepEqual(geometry(a), geometry(b));
    for (const region of a.regions)
      assert.equal(
        Buffer.from(source)
          .subarray(region.startOffset, region.startOffset + 3)
          .toString(),
        "for",
      );
    const [outer, inner] = a.regions.map((x) => x.measurement);
    assert.equal(outer.calls, 1);
    assert.equal(inner.calls, 4);
    assert.equal(outer.inclusiveNs - outer.exclusiveNs, inner.inclusiveNs);
  },
);
test(
  "explicit scalar references and possible container aliases suppress unsafe loop estimates",
  real,
  async () => {
    for (const source of [
      "void f(int n){int& alias=n;for(int i=0;i<n;i++){alias++;}}",
      "#include <vector>\nvoid f(std::vector<int>& a){auto& b=a;for(int i=0;i<a.size();i++){b.push_back(i);}}",
    ]) {
      const r = await parse(source);
      assert.equal(r.success, true, JSON.stringify(r.errors));
      assert.equal(r.regions[0].estimatedComplexity, "Unknown");
    }
    const advice = await parse(
      "#include <utility>\nvoid f(int n){int x=2,y=3;int total=0;for(int i=0;i<n;i++){std::swap(x,y);total+=x*x;}}",
    );
    assert.equal(advice.success, true);
    assert.ok(
      !advice.recommendations.some(
        (item) => item.pattern === "Loop-invariant arithmetic",
      ),
    );
  },
);
