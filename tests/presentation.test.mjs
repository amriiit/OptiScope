import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { COMPLEXITY_NOTE, INVOCATION_NOTE, enclosingRegions, invocationLabel, initiallyExpanded, regionPath } from '../frontend/src/components/regionPresentation.js';
const analyze = sample => JSON.parse(execFileSync('engine/build/optiscope', [`samples/${sample}.cpp`], { encoding: 'utf8' }));
let directory, Hotspots, AstTree, SourceViewer;
before(async () => {
  const cache = path.resolve('node_modules/.cache'); await mkdir(cache, { recursive: true });
  directory = await mkdtemp(path.join(cache, 'optiscope-presentation-'));
  // Render the actual JSX components using the existing Vite/esbuild toolchain, no new UI dependency.
  await build({ entryPoints: ['Hotspots', 'AstTree', 'SourceViewer'].map(n => `frontend/src/components/${n}.jsx`), outdir: directory, outExtension: { '.js': '.mjs' }, bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', logLevel: 'silent' });
  [Hotspots, AstTree, SourceViewer] = await Promise.all(['Hotspots', 'AstTree', 'SourceViewer'].map(async n => (await import(pathToFileURL(path.join(directory, `${n}.mjs`)).href)).default));
});
after(async () => { if (directory) await rm(directory, { recursive: true, force: true }); });
const noop = () => {};
function viewResult(r) { return { ...r, hotspots: r.regions, profiling: { status: 'not_run' } }; }
test('local and enclosing complexity reuse real AST estimates; sequential siblings remain O(n)', () => {
  const nested = analyze('nested');
  assert.equal(nested.regions[1].estimatedComplexity, 'O(n)');
  assert.deepEqual(enclosingRegions(nested, 'R2').map(r => [r.id, r.estimatedComplexity]), [['R1', 'O(n^2)']]);
  const html = renderToStaticMarkup(React.createElement(Hotspots, { result: viewResult(nested), selected: nested.regions[1], onSelect: noop }));
  assert.match(html, /Local complexity: O\(n\) per invocation/);
  assert.match(html, /R1: O\(n\^2\)/);
  assert.match(html, /not a separate cumulative estimate/);
  assert.match(html, /Not profiled; invocation counts and cumulative runtimes are unavailable/);
  assert.match(COMPLEXITY_NOTE, /including its contained work/);
  const sequential = analyze('sequential');
  assert.equal(sequential.summary.worstEstimatedComplexity, 'O(n)');
  assert.deepEqual(enclosingRegions(sequential, 'R2'), []);
});
test('invocation display uses only profiler records and distinguishes unavailable/unexecuted from counts', () => {
  assert.equal(invocationLabel(null), '—');
  assert.equal(invocationLabel({ status: 'unexecuted' }), 'Not executed');
  assert.equal(invocationLabel({ status: 'measured', calls: 0 }), '0');
  assert.equal(invocationLabel({ status: 'measured', calls: 1200 }), '1,200');
  assert.equal(invocationLabel({ status: 'measured' }), '—');
  assert.match(INVOCATION_NOTE, /not loop-body iterations/);
  const r = analyze('nested');
  const html = renderToStaticMarkup(React.createElement(Hotspots, { result: viewResult(r), selected: r.regions[1], onSelect: noop }));
  for (const label of ['Local complexity', 'Invocations', 'region entries', 'Exclusive runtime', 'Inclusive runtime', '% of main time']) assert.ok(html.includes(label), label);
  assert.ok(!html.includes('1,200'), 'Static analysis cannot invent invocation counts');
});
test('AST opens program/function/body branches, retains source lines and marks selected loop', () => {
  const r = analyze('nested');
  const nodePath = regionPath(r.ast, 'R2');
  assert.deepEqual(nodePath.filter(n => n.regionId).map(n => n.regionId), ['R1','R2']);
  for (const type of ['Program','FunctionDecl','Block']) assert.equal(initiallyExpanded({ type }), true);
  assert.equal(initiallyExpanded({ type: 'ForStmt' }), false);
  const html = renderToStaticMarkup(React.createElement(AstTree, { ast: r.ast, selectedId: 'R2', onSelect: noop }));
  assert.match(html, /<details open="" class="ast-node"><summary[^>]*><span class="ast-kind ">Program/);
  assert.match(html, /<details open="" class="ast-node"><summary[^>]*><span class="ast-kind function">FunctionDecl/);
  assert.match(html, /<details open="" class="ast-node"><summary[^>]*><span class="ast-kind statement">Block/);
  assert.match(html, /<details open="" class="ast-node" data-region-id="R1"/);
  assert.match(html, /data-region-id="R2"><summary class="ast-selected" aria-current="true"/);
  assert.ok(html.includes(`L${r.regions[1].startLine}–${r.regions[1].endLine} · R2`));
});
test('source highlight still uses selected region lines', () => {
  const r = analyze('nested'), selected = r.regions[1];
  const html = renderToStaticMarkup(React.createElement(SourceViewer, { source: readFileSync('samples/nested.cpp', 'utf8'), fileName: 'nested.cpp', selected }));
  assert.equal((html.match(/class="code-line highlight"/g) || []).length, selected.endLine - selected.startLine + 1);
});
