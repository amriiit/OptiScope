import test from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import {
  statistics,
  comparisonResult,
} from "../backend/src/models/ComparisonResult.js";
import { compareSources } from "../backend/src/services/ComparisonService.js";
import { dockerStatus } from "../backend/src/infrastructure/DockerRunner.js";
import { app } from "../backend/src/app.js";
const docker = await dockerStatus();
if (process.env.REQUIRE_DOCKER && !docker.available)
  throw new Error(docker.reason);
const real = { skip: !docker.available, timeout: 90000 };
test("benchmark statistics compute even/odd medians, mean, spread without mutating input", () => {
  const values = [4, 1, 3, 2];
  const s = statistics(values);
  assert.equal(s.medianMs, 2.5);
  assert.equal(s.meanMs, 2.5);
  assert.equal(s.standardDeviationMs, Math.sqrt(1.25));
  assert.deepEqual(values, [4, 1, 3, 2]);
  assert.equal(statistics([9, 1, 5]).medianMs, 5);
  assert.throws(() => statistics([0]));
  assert.throws(() => statistics([NaN]));
});
test("benchmark ratios are gated and correctly represent regressions", () => {
  const raw = {
    status: "completed",
    equivalent: true,
    runs: {
      original: [{ elapsedMs: 10 }, { elapsedMs: 10 }],
      optimized: [{ elapsedMs: 20 }, { elapsedMs: 20 }],
    },
  };
  const r = comparisonResult(raw);
  assert.equal(r.speedup, 0.5);
  assert.equal(r.runtimeReductionPercent, -100);
  for (const status of ["not_equivalent", "timeout", "compile_error"]) {
    const r = comparisonResult({ ...raw, status });
    assert.equal(r.speedup, null);
    assert.equal(r.statistics, null);
  }
});
test("benchmark warns about short durations and noisy observations", () => {
  const r = comparisonResult({
    status: "completed",
    equivalent: true,
    runs: {
      original: [{ elapsedMs: 1 }, { elapsedMs: 9 }],
      optimized: [{ elapsedMs: 1 }, { elapsedMs: 2 }],
    },
  });
  assert.ok(r.warnings.some((x) => x.includes("Short execution")));
  assert.ok(r.warnings.some((x) => x.includes("High variation")));
});
test(
  "real Docker comparison validates demo output with 10 uninstrumented runs and metadata",
  real,
  async () => {
    const result = await compareSources(
      {
        fileName: "original.cpp",
        source: await readFile("samples/comparison/original.cpp", "utf8"),
      },
      {
        fileName: "optimized.cpp",
        source: await readFile("samples/comparison/optimized.cpp", "utf8"),
      },
    );
    assert.equal(result.status, "completed", JSON.stringify(result));
    assert.equal(result.equivalent, true);
    assert.deepEqual(result.flags, ["-std=c++17", "-O2"]);
    assert.equal(result.warmupCount, 1);
    for (const role of ["original", "optimized"]) {
      assert.equal(result.runs[role].length, 10);
      assert.equal(result.statistics[role].runCount, 10);
      assert.ok(
        result.runs[role].every((r) => r.exitCode === 0 && r.elapsedMs > 0),
      );
      assert.equal(result.warmups[role].stdout, "hits: 33600\n");
      assert.equal(result.metadata.files[role].sha256.length, 64);
    }
    assert.equal(
      result.speedup,
      result.statistics.original.medianMs /
        result.statistics.optimized.medianMs,
    );
    await writeFile(
      "docs/evidence/comparison-demo.json",
      JSON.stringify(result, null, 2) + "\n",
    );
  },
);
test(
  "real Docker rejects changed output and suppresses improvement claims",
  real,
  async () => {
    const result = await compareSources(
      { fileName: "a.cpp", source: "int main(){return 0;}" },
      {
        fileName: "b.cpp",
        source: '#include <cstdio>\nint main(){printf("different");return 0;}',
      },
    );
    assert.equal(result.status, "not_equivalent");
    assert.equal(result.equivalent, false);
    assert.equal(result.speedup, null);
    assert.equal(result.statistics, null);
  },
);
test(
  "real Docker comparison reports compile errors, nonzero exits and timeout",
  real,
  async () => {
    const a = { fileName: "a.cpp", source: "int main(){return 0;}" };
    for (const [source, status] of [
      ["int main(){missing;}", "compile_error"],
      ["int main(){return 4;}", "runtime_error"],
      ["int main(){while(true){}}", "timeout"],
    ]) {
      const result = await compareSources(a, { fileName: "b.cpp", source });
      assert.equal(result.status, status, JSON.stringify(result));
      assert.equal(result.speedup, null);
    }
  },
);
test(
  "comparison HTTP upload contract and equivalence are real",
  real,
  async () => {
    const server = await new Promise((resolve, reject) => {
      const s = app.listen(0, "127.0.0.1", () => resolve(s));
      s.once("error", reject);
    });
    try {
      const base = `http://127.0.0.1:${server.address().port}/api/compare`;
      const body = new FormData();
      for (const role of ["original", "optimized"])
        body.append(role, new Blob(["int main(){return 0;}"]), role + ".cpp");
      const response = await fetch(base, { method: "POST", body });
      assert.equal(response.status, 200);
      assert.equal((await response.json()).equivalent, true);
      const missing = await fetch(base, {
        method: "POST",
        body: new FormData(),
      });
      assert.equal(missing.status, 400);
      const foreign = await fetch(base, {
        method: "POST",
        body: new FormData(),
        headers: { Origin: "https://foreign.example" },
      });
      assert.equal(foreign.status, 403);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  },
);
