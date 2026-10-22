import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { baseResult } from "../backend/src/models/AnalysisResult.js";
import { sourceUpload } from "../backend/src/models/SourceUpload.js";
import { parseProfile } from "../backend/src/models/ProfileRecord.js";
import { mergeMeasurements } from "../backend/src/services/HotspotService.js";
import { withJob } from "../backend/src/middleware/jobLimiter.js";
import {
  createWorkspace,
  removeWorkspace,
} from "../backend/src/infrastructure/JobWorkspace.js";
import { execute } from "../backend/src/infrastructure/ProcessRunner.js";
import { readSourceFile } from "../frontend/src/models/sourceModel.js";
import {
  analysisResponse,
  summaryCards,
} from "../frontend/src/models/analysisModel.js";
const upload = (buffer, name = "x.cpp") => ({
  buffer: Buffer.from(buffer),
  originalname: name,
  size: Buffer.byteLength(buffer),
});
test("analysis envelopes allocate independent mutable collections", () => {
  const a = baseResult("a"),
    b = baseResult("b");
  a.errors.push("a");
  assert.deepEqual(b.errors, []);
  assert.equal(b.summary, null);
});
test("upload model validates UTF-8 and strips supplied path", () => {
  assert.deepEqual(sourceUpload(upload("// λ\nint main(){}", "../x.cpp")), {
    fileName: "x.cpp",
    source: "// λ\nint main(){}",
  });
  assert.throws(() => sourceUpload(upload(Buffer.from([255]))), /UTF-8/);
});
test("upload model rejects NUL and empty source", () => {
  assert.throws(() => sourceUpload(upload("a\0b")), /NUL/);
  assert.throws(() => sourceUpload(upload("")), /nonempty/);
});
test("frontend source model validates actual file bytes and extension", async () => {
  assert.equal(
    await readSourceFile(new File(["int main(){}"], "x.cpp")),
    "int main(){}",
  );
  await assert.rejects(readSourceFile(new File(["x"], "x.txt")), /\.cpp/);
  await assert.rejects(readSourceFile(new File(["\0"], "x.cpp")), /NUL/);
});
test("frontend source model enforces 128 KiB bound", async () => {
  await assert.rejects(
    readSourceFile(new File(["x".repeat(131073)], "x.cpp")),
    /128 KiB/,
  );
});
const regions = [{ id: "R1" }, { id: "R2" }];
test("profile model accepts nested inclusive durations without summing them", () => {
  const r = parseProfile("total 1000\nR1 900 400 1\nR2 500 500 8", regions);
  assert.equal(r.totalNs, 1000);
  assert.equal(r.records.get("R2").calls, 8);
});
for (const [name, raw] of [
  ["duplicate", "total 10\nR1 5 5 1\nR1 5 5 1"],
  ["foreign ID", "total 10\nR9 5 5 1"],
  ["exclusive exceeds inclusive", "total 10\nR1 4 5 1"],
  ["unsafe integer", "total 9007199254740992"],
  ["zero invocations", "total 10\nR1 4 4 0"],
  ["malformed total", "not a profile"],
])
  test(`profile model rejects ${name}`, () =>
    assert.throws(() => parseProfile(raw, regions)));
test("hotspots use main denominator, exclusive rank and unexecuted absence", () => {
  const r = {
    ...baseResult("x"),
    summary: {},
    regions: [...regions, { id: "R3" }],
  };
  mergeMeasurements(
    r,
    "total 1000000\nR1 900000 300000 1\nR2 600000 600000 20",
  );
  assert.deepEqual(
    r.hotspots.map((x) => x.id),
    ["R2", "R1", "R3"],
  );
  assert.equal(r.regions[0].measurement.programRuntimePercent, 30);
  assert.equal(r.regions[2].measurement.status, "unexecuted");
  assert.equal(r.profiling.measuredTotals.uninstrumentedAndOverheadMs, 0.1);
});
test("hotspot service rejects sum of exclusive times over main duration", () => {
  assert.throws(
    () =>
      mergeMeasurements(
        { ...baseResult("x"), summary: {}, regions },
        "total 10\nR1 8 8 1\nR2 8 8 1",
      ),
    /exceeds/,
  );
});
test("two-slot job limiter releases capacity after rejected work", async () => {
  let release;
  const waiting = new Promise((r) => (release = r));
  const first = withJob("a", () => waiting),
    second = withJob("b", () => waiting);
  assert.equal(await withJob("c", async () => 3), null);
  release(1);
  await Promise.all([first, second]);
  await assert.rejects(
    withJob("x", async () => {
      throw new Error("failed");
    }),
  );
  assert.equal(await withJob("d", async () => 4), 4);
});
test("workspaces isolate input and clean all files", async () => {
  const [a, b] = await Promise.all([
    createWorkspace("alpha"),
    createWorkspace("beta"),
  ]);
  try {
    assert.notEqual(a.job, b.job);
    assert.notEqual(a.container, b.container);
    assert.equal(await readFile(`${a.job}/original.cpp`, "utf8"), "alpha");
    assert.equal(await readFile(`${b.job}/original.cpp`, "utf8"), "beta");
  } finally {
    await Promise.all([removeWorkspace(a.job), removeWorkspace(b.job)]);
  }
  await assert.rejects(readdir(a.job));
});
test("process infrastructure bounds trusted subprocess duration", async () => {
  await assert.rejects(
    execute(process.execPath, ["-e", "setInterval(()=>{},1000)"], {
      timeout: 50,
    }),
    /timed out/,
  );
});
test("process infrastructure bounds output and never interprets shell characters", async () => {
  await assert.rejects(
    execute(process.execPath, ["-e", 'console.log("x".repeat(10000))'], {
      limit: 100,
    }),
    /output limit/,
  );
  const r = await execute(process.execPath, [
    "-e",
    "console.log(process.argv[1])",
    "$(echo unsafe)",
  ]);
  assert.equal(r.stdout.trim(), "$(echo unsafe)");
});
test("frontend analysis model preserves actual data and unavailable measurements", () => {
  const r = baseResult("x");
  assert.equal(analysisResponse(r), r);
  assert.throws(() => analysisResponse({}));
  assert.ok(
    summaryCards(r, () => "—").every(([, v]) => v === undefined || v === "—"),
  );
});
