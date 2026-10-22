import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
let dir,
  views = {};
before(async () => {
  const cache = path.resolve("node_modules/.cache");
  await mkdir(cache, { recursive: true });
  dir = await mkdtemp(path.join(cache, "optiscope-views-"));
  const entries = {
    UploadPanel: "components/UploadPanel",
    SummaryCards: "components/SummaryCards",
    ProgramOutput: "components/ProgramOutput",
    RecommendationPanel: "components/RecommendationPanel",
    Comparison: "pages/Comparison",
    Dashboard: "pages/Dashboard",
  };
  await build({
    entryPoints: Object.fromEntries(
      Object.entries(entries).map(([name, p]) => [
        name,
        `frontend/src/views/${p}.jsx`,
      ]),
    ),
    outdir: dir,
    outExtension: { ".js": ".mjs" },
    bundle: true,
    packages: "external",
    platform: "node",
    format: "esm",
    jsx: "automatic",
    logLevel: "silent",
  });
  for (const name of Object.keys(entries))
    views[name] = (
      await import(pathToFileURL(path.join(dir, `${name}.mjs`)).href)
    ).default;
});
after(async () => {
  if (dir) await rm(dir, { recursive: true, force: true });
});
const render = (name, props = {}) =>
  renderToStaticMarkup(React.createElement(views[name], props));
const noop = () => {};
test("workbench initial view exposes real actions, comparison inputs and unavailable timing placeholders", () => {
  const html = render("Dashboard");
  for (const text of [
    "Find the code",
    "worth optimizing.",
    "Analyze",
    "Run Profiling",
    "Performance comparison",
    "EXECUTION ONLY",
    "Original C++ program",
    "Manually optimized C++ program",
  ])
    assert.ok(html.includes(text), text);
  assert.ok(html.includes('disabled=""'));
  assert.ok(!html.includes("820 ms"));
});
test("upload view has labeled input, sample selection and disabled processing controls", () => {
  const html = render("UploadPanel", {
    source: "int main(){}",
    fileName: "faculty.cpp",
    busy: "analyze",
    samples: ["nested.cpp", "linear.cpp"],
    sample: "nested.cpp",
    setDrag: noop,
    setError: noop,
    openFile: noop,
    setSample: noop,
    loadSample: noop,
  });
  assert.match(html, /aria-label="Upload C\+\+ file"/);
  assert.match(html, /aria-label="Sample program"/);
  assert.match(html, /faculty.cpp/);
  assert.match(html, /nested.cpp/);
  assert.equal((html.match(/disabled=""/g) || []).length, 3);
});
test("output view preserves actual exit code, stdout and stderr with HTML escaping", () => {
  const html = render("ProgramOutput", {
    execution: { exitCode: 3, stdout: "<actual output>", stderr: "diagnostic" },
  });
  assert.match(html, /EXIT 3/);
  assert.match(html, /&lt;actual output&gt;/);
  assert.match(html, /STDERR/);
  assert.match(html, /diagnostic/);
});
test("recommendation view renders actual AST rule evidence, caveats and region source links", () => {
  const result = JSON.parse(
    execFileSync("engine/build/optiscope", ["samples/patterns.cpp"], {
      encoding: "utf8",
    }),
  );
  const html = render("RecommendationPanel", { result, onSelect: noop });
  for (const rec of result.recommendations) {
    assert.ok(html.includes(rec.pattern));
    assert.ok(html.includes(rec.caveat));
    assert.ok(html.includes(`${rec.regionId} · L${rec.startLine}`));
  }
});
test("monochrome tokens define responsive and reduced-motion rules without remote fonts or gradients", async () => {
  const css = await readFile("frontend/src/index.css", "utf8");
  for (const value of [
    "#0b0b0b",
    "#141414",
    "#181818",
    "#343434",
    "#f5f5f5",
    "#a6a6a6",
  ])
    assert.ok(css.includes(value));
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /max-width: 760px/);
  assert.match(css, /focus-visible/);
  assert.ok(!css.includes("linear-gradient"));
  assert.ok(!css.includes("fonts.googleapis"));
});
