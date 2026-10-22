import test from "node:test";
import assert from "node:assert/strict";
import { app } from "../backend/src/app.js";
import * as client from "../frontend/src/services/apiClient.js";
import { analysisResponse } from "../frontend/src/models/analysisModel.js";
import { comparisonResponse } from "../frontend/src/models/comparisonModel.js";
import { validateRegions } from "../backend/src/models/ProgramRegion.js";
test("frontend API client loads and analyzes all eight real samples over HTTP", async () => {
  const server = await new Promise((resolve, reject) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
    s.once("error", reject);
  });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (url, options) =>
    originalFetch(`http://127.0.0.1:${server.address().port}${url}`, options);
  try {
    const samples = await client.getSamples();
    assert.equal(samples.length, 8);
    for (const name of samples) {
      const sample = await client.getSample(name);
      const result = analysisResponse(
        await client.analyzeSource(sample.source, name, "analyze"),
      );
      assert.equal(result.success, true);
      assert.equal(result.fileName, name);
      assert.equal(result.profiling.status, "not_run");
      assert.ok(result.ast.children.length);
    }
    if ((await client.getHealth()).docker.available) {
      const comparison = await client.compareSources(
        new File(["int main(){return 0;}"], "a.cpp"),
        new File(["int main(){missing;}"], "b.cpp"),
      );
      assert.equal(comparison.status, "compile_error");
      assert.ok(comparison.compilations.optimized.stderr.length > 0);
      assert.equal(comparison.speedup, null);
    }
    const invalid = analysisResponse(
      await client.analyzeSource("int main(){@;}", "bad.cpp", "analyze"),
    );
    assert.equal(invalid.success, false);
    assert.ok(invalid.errors.length);
    await assert.rejects(client.getSample("../missing.cpp"));
    assert.throws(() => client.analyzeSource("x", "x.cpp", "execute"));
  } finally {
    globalThis.fetch = originalFetch;
    await new Promise((resolve) => server.close(resolve));
  }
});
test("region model rejects ambiguous IDs and invalid original-source spans", () => {
  const r = {
    id: "R1",
    startLine: 1,
    endLine: 2,
    startOffset: 0,
    endOffset: 10,
  };
  assert.equal(validateRegions([r])[0], r);
  assert.throws(() => validateRegions([r, r]), /duplicate/);
  assert.throws(() => validateRegions([{ ...r, endOffset: 0 }]), /range/);
});
test("comparison frontend rejects successful envelopes without evidence", () => {
  assert.throws(() =>
    comparisonResponse({ status: "completed", equivalent: false }),
  );
  assert.throws(() => comparisonResponse(null));
  assert.equal(
    comparisonResponse({ status: "not_equivalent" }).status,
    "not_equivalent",
  );
});
