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
    Workbench: "test-workbench",
  };
  await build({
    entryPoints: Object.fromEntries(
      Object.entries(entries).map(([name, p]) => [
        name,
        p === "test-workbench"
          ? "tests/helpers/workbench.jsx"
          : `frontend/src/views/${p}.jsx`,
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
test("routes expose distinct pages, real actions, and honest empty states", () => {
  const expected = {
    "/": [
      "Less guessing.",
      "More insight.",
      "Begin analysis",
      "ILLUSTRATIVE SOURCE",
    ],
    "/analyze": [
      "Analyze source",
      "Run Profiling",
      "Compiler frontend",
      "Upload C++ file",
    ],
    "/results": ["Analysis results", "No analysis yet"],
    "/ast": ["Program structure", "No structure to explore yet"],
    "/samples": ["Sample library", "Sample category"],
    "/about": ["Inside OptiScope", "Know the boundaries", "Native macOS"],
    "/compare": [
      "Performance comparison",
      "EXECUTION ONLY",
      "Original C++ program",
      "Manually optimized C++ program",
    ],
    "/missing": ["Page not found"],
  };
  for (const [path, texts] of Object.entries(expected)) {
    const html = render("Workbench", { path });
    for (const text of texts)
      assert.ok(html.includes(text), `${path}: ${text}`);
    assert.match(html, /aria-label="Main navigation"/);
    assert.ok(!html.includes("820 ms"));
  }
  assert.ok(
    !render("Workbench", { path: "/analyze" }).includes(
      "Performance comparison",
    ),
  );
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
test("reference-inspired light and blue tokens include accessibility and responsive rules", async () => {
  const css = await readFile("frontend/src/index.css", "utf8");
  for (const value of [
    "#f0f0ec",
    "#ffffff",
    "#0078d7",
    "#182434",
    "#b8bfca",
    "#bc1425",
  ])
    assert.ok(css.includes(value));
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /max-width: 760px/);
  assert.match(css, /focus-visible/);
  assert.ok(!css.includes("linear-gradient"));
  assert.ok(!css.includes("fonts.googleapis"));
});
