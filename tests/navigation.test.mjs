import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { app } from "../backend/src/app.js";

test("real HTTP corpus serves every allowlisted source without changing academic samples", async () => {
  const server = await listen();
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const items = await (await fetch(`${base}/api/corpus`)).json();
    assert.equal(items.length, 12);
    for (const item of items) {
      const response = await fetch(`${base}/api/corpus/${item.name}`);
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(
        data.source,
        await readFile(`samples/dsa/${item.name}`, "utf8"),
      );
      assert.equal(item.frontend, "clang");
    }
    for (const name of [
      "missing.cpp",
      "..%2F..%2FREADME.md",
      "arrays.cpp%2F..%2FREADME.md",
    ])
      assert.equal((await fetch(`${base}/api/corpus/${name}`)).status, 404);
    assert.equal((await (await fetch(`${base}/api/samples`)).json()).length, 8);
    for (const route of [
      "/",
      "/analyze",
      "/results",
      "/ast",
      "/samples",
      "/about",
      "/compare",
    ]) {
      const response = await fetch(base + route);
      assert.equal(response.status, 200);
      assert.match(await response.text(), /id="root"/);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

function listen() {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
    server.once("error", reject);
  });
}

test("navigation retains actual analysis, profile, source selection and comparison files", async () => {
  const server = await listen();
  const originalFetch = globalThis.fetch;
  const originalGlobals = Object.fromEntries(
    [
      "window",
      "document",
      "HTMLElement",
      "IS_REACT_ACT_ENVIRONMENT",
      "ResizeObserver",
      "requestAnimationFrame",
      "cancelAnimationFrame",
    ].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]),
  );
  const dom = new JSDOM('<div id="root"></div>', {
    url: "http://127.0.0.1/",
    pretendToBeVisual: true,
  });
  for (const key of ["window", "document", "HTMLElement"])
    globalThis[key] = dom.window[key];
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(
    dom.window,
  );
  globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(
    dom.window,
  );
  // DOM tests have no layout engine; only the chart container geometry is supplied.
  globalThis.ResizeObserver = class {
    constructor(callback) {
      this.callback = callback;
    }
    observe(target) {
      this.callback([{ target, contentRect: { width: 600, height: 320 } }]);
    }
    unobserve() {}
    disconnect() {}
  };
  dom.window.scrollTo = () => {};
  dom.window.HTMLElement.prototype.scrollIntoView = () => {};
  const pending = new Set();
  globalThis.fetch = (url, options) => {
    const promise = originalFetch(
      new URL(url, `http://127.0.0.1:${server.address().port}`),
      options,
    );
    pending.add(promise);
    promise.then(
      () => pending.delete(promise),
      () => pending.delete(promise),
    );
    return promise;
  };
  const cache = path.resolve("node_modules/.cache");
  await mkdir(cache, { recursive: true });
  const dir = await mkdtemp(path.join(cache, "optiscope-navigation-"));
  let root;
  const query = (selector) => dom.window.document.querySelector(selector);
  const text = () => dom.window.document.body.textContent;
  // The Node-compatible selector engine mishandles '+' in attribute values.
  const uploadInput = () =>
    [...dom.window.document.querySelectorAll("input")].find(
      (input) => input.getAttribute("aria-label") === "Upload C++ file",
    );
  const button = (label) =>
    [...dom.window.document.querySelectorAll("button")].find(
      (node) => node.textContent.trim() === label,
    );
  async function waitFor(predicate, timeout = 10000) {
    const deadline = Date.now() + timeout;
    while (!predicate()) {
      assert.ok(
        Date.now() < deadline,
        `Timed out waiting; current page: ${text().slice(0, 1800)}`,
      );
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 25));
      });
    }
  }
  async function click(node) {
    assert.ok(node, "Missing action");
    await act(async () => node.click());
  }
  async function navigate(route) {
    await click(query(`nav a[href="${route}"]`));
    await waitFor(
      () =>
        query(`nav a[href="${route}"]`)?.getAttribute("aria-current") ===
        "page",
    );
  }
  try {
    await build({
      entryPoints: ["tests/helpers/workbench.jsx"],
      outfile: path.join(dir, "workbench.mjs"),
      bundle: true,
      packages: "external",
      platform: "node",
      format: "esm",
      jsx: "automatic",
      logLevel: "silent",
    });
    const Workbench = (
      await import(pathToFileURL(path.join(dir, "workbench.mjs")).href)
    ).default;
    root = createRoot(query("#root"));
    await act(async () =>
      root.render(React.createElement(Workbench, { path: "/analyze" })),
    );
    await waitFor(() => query('select[aria-label="Sample program"] option'));
    await click(button("Load Sample"));
    await waitFor(
      () =>
        text().includes("nested.cpp") &&
        !!button("Analyze") &&
        !button("Analyze").disabled,
    );
    await click(button("Analyze"));
    await waitFor(
      () => text().includes("Analysis results") && text().includes("O(n^2)"),
    );
    assert.match(text(), /not run/);
    assert.ok(!text().includes("Performance comparison"));
    const regionRows = dom.window.document.querySelectorAll(
      ".hotspot-table tbody tr",
    );
    assert.equal(regionRows.length, 2);
    await click(regionRows[1]);
    assert.ok(query(".code-line.highlight"));
    const selectedText = query(".source-panel .panel-foot").textContent;
    await navigate("/ast");
    assert.match(text(), /Abstract syntax tree/);
    assert.equal(query(".source-panel .panel-foot").textContent, selectedText);
    assert.ok(query('[aria-pressed="true"]'));
    await navigate("/");
    await navigate("/results");
    assert.equal(query(".source-panel .panel-foot").textContent, selectedText);
    let health;
    await act(async () => {
      health = await (await globalThis.fetch("/api/health")).json();
    });
    if (process.env.REQUIRE_DOCKER) assert.equal(health.docker.available, true);
    if (health.docker.available) {
      await click(button("Run Profiling"));
      await waitFor(
        () => text().includes("completed") && !!query(".output-panel"),
        35000,
      );
      assert.match(text(), /nested: 69103152/);
      assert.ok(!text().includes("No profiling has completed"));
      await waitFor(() => !!query(".recharts-surface"));
      assert.ok(query(".recharts-bar"));
      await navigate("/ast");
      await navigate("/results");
      assert.match(text(), /nested: 69103152/);
    }
    await click(query('footer a[href="/compare"]'));
    const originalInput = query(".comparison-inputs input");
    const file = new File(["int main(){return 0;}"], "preserved.cpp");
    Object.defineProperty(originalInput, "files", {
      configurable: true,
      value: [file],
    });
    await act(async () =>
      originalInput.dispatchEvent(
        new dom.window.Event("change", { bubbles: true }),
      ),
    );
    await waitFor(() => text().includes("preserved.cpp"));
    await navigate("/about");
    await click(query('footer a[href="/compare"]'));
    assert.match(text(), /preserved.cpp/);
    await navigate("/samples");
    await waitFor(() => !!query('[aria-label="Open arrays.cpp"]'));
    await click(button("DSA"));
    assert.equal(query(".sample-grid").children.length, 10);
    await click(query('[aria-label="Open arrays.cpp"]'));
    await waitFor(
      () => text().includes("Analyze source") && text().includes("arrays.cpp"),
    );
    assert.equal(query("#compiler-frontend").value, "clang");
    assert.match(query(".source-scroll").textContent, /vector/);
    await navigate("/results");
    assert.match(text(), /No analysis yet/);
    if (health.docker.available) {
      await navigate("/analyze");
      await click(button("Analyze"));
      await navigate("/about");
      await waitFor(() => text().includes("ANALYSIS RETAINED"), 35000);
      assert.match(text(), /Inside OptiScope/);
      await navigate("/results");
      assert.match(text(), /clang \//);
      await navigate("/ast");
      assert.match(text(), /Clang → normalized typed IR/);
      assert.match(text(), /Parsing success is separate/);
    }
    await navigate("/analyze");
    const sourceInput = uploadInput();
    assert.ok(sourceInput, "Source upload input is present");
    Object.defineProperty(sourceInput, "files", {
      configurable: true,
      value: [
        new File(
          ["int main(){ int n=5; for(int i=0;i<n;i++){ n=n; } return 0; }"],
          "uploaded.cpp",
        ),
      ],
    });
    await act(async () =>
      sourceInput.dispatchEvent(
        new dom.window.Event("change", { bubbles: true }),
      ),
    );
    await waitFor(
      () => text().includes("uploaded.cpp") && !button("Analyze").disabled,
    );
    await act(async () => {
      query("#compiler-frontend").value = "legacy";
      query("#compiler-frontend").dispatchEvent(
        new dom.window.Event("change", { bubbles: true }),
      );
    });
    await click(button("Analyze"));
    await waitFor(
      () =>
        text().includes("Analysis results") && text().includes("uploaded.cpp"),
    );
    assert.match(text(), /legacy/);
    await navigate("/analyze");
    Object.defineProperty(uploadInput(), "files", {
      configurable: true,
      value: [new File(["int main(){ @; }"], "invalid.cpp")],
    });
    await act(async () =>
      uploadInput().dispatchEvent(
        new dom.window.Event("change", { bubbles: true }),
      ),
    );
    await waitFor(
      () => text().includes("invalid.cpp") && !button("Analyze").disabled,
    );
    await click(button("Analyze"));
    await waitFor(() => !!query('[role="alert"]'));
    assert.match(text(), /Analysis did not complete/);
    assert.match(text(), /Analyze source/);
  } catch (error) {
    console.error("Interaction failed:", error);
    throw error;
  } finally {
    await act(async () => {
      while (pending.size) await Promise.allSettled([...pending]);
    });
    if (root) await act(async () => root.unmount());
    globalThis.fetch = originalFetch;
    dom.window.close();
    for (const [key, descriptor] of Object.entries(originalGlobals)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
    await rm(dir, { recursive: true, force: true });
    await new Promise((resolve) => server.close(resolve));
  }
});
