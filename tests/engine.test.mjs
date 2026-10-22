import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
const engine = path.resolve('engine/build/optiscope');
function analyze(source, file = false) {
  const dir = mkdtempSync(path.join(tmpdir(), 'optiscope-test-'));
  try {
    const input = path.join(dir, 'test.cpp'); writeFileSync(input, source);
    const data = JSON.parse(execFileSync(engine, [input, path.join(dir, 'instrumented.cpp')], { encoding: 'utf8' }));
    return file ? { data, instrumented: readFileSync(path.join(dir, 'instrumented.cpp'), 'utf8') } : data;
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
const flatten = node => [node, ...node.children.flatMap(flatten)];
const source = name => readFileSync(`samples/${name}.cpp`, 'utf8');
test('all sample ASTs, structural estimates, region ranges and stable IDs', () => {
  const expected = { linear: [1, 1, 'O(n)'], nested: [2, 2, 'O(n^2)'], sequential: [2, 1, 'O(n)'], logarithmic: [2, 1, 'O(log n)'], mixed_hotspots: [5, 3, 'O(small^3 + large^2)'], patterns: [3, 2, 'O(n^2)'] };
  for (const [sample, [loops, depth, complexity]] of Object.entries(expected)) {
    const text = source(sample), r = analyze(text);
    assert.equal(r.success, true, JSON.stringify(r.errors));
    assert.equal(r.summary.loopsDetected, loops); assert.equal(r.summary.maxNestingDepth, depth); assert.equal(r.summary.worstEstimatedComplexity, complexity);
    assert.equal(r.summary.totalMeasuredRuntimeMs, null);
    assert.deepEqual(r.regions.map(x => x.id), analyze(text).regions.map(x => x.id));
    const nodes = flatten(r.ast);
    for (const region of r.regions) {
      const n = nodes.find(n => n.regionId === region.id);
      assert.equal(n.startOffset, region.startOffset); assert.equal(n.endOffset, region.endOffset);
      assert.equal(text.slice(0, region.startOffset).split('\n').length, region.startLine);
      assert.match(text.slice(region.startOffset, region.endOffset), /^for/);
    }
  }
});
test('Flex tokens and typed AST: calls, arrays, booleans, unary, compound assignment, if/else and while', () => {
  const r = analyze('#include <cstdio>\n/* comment */\nint twice(int x){return x*2;}\nint main(){int a[8];double d=1.5;bool b=true;int i=0;while(i<8 && b){a[i]=twice(i);i++;if(i!=3 || !b){d+=a[i]/2.0;}else{--i;d-=1;}}printf("%.0f\\n",d);return 0;}');
  assert.equal(r.success, true); const kinds = new Set(flatten(r.ast).map(n => n.type));
  for (const k of ['Program','FunctionDecl','Block','VarDecl','WhileStmt','IfStmt','ReturnStmt','Assignment','BinaryExpr','UnaryExpr','CallExpr','Identifier','Literal','ArrayAccess']) assert.ok(kinds.has(k), k);
  assert.equal(r.regions[0].estimatedComplexity, 'Unknown');
});
test('reject unsupported syntax, macros, keywords and malformed constructs', () => {
  for (const text of ['int main(){int x=@;}', '#define N 4\nint main(){return 0;}', 'int main(){for(int i=0;i<5;i++){break;}}', 'int main(){const int n=2;}', 'int main(){return 0;', '/* unterminated', 'int main(){std::cout << 4;}']) {
    const r = analyze(text); assert.equal(r.success, false, text); assert.ok(r.errors.length);
  }
});
test('complexity: fixed bounds, constant steps, mutation, dependent bounds, unknown calls and conditional loops', () => {
  assert.equal(analyze('int main(){for(int i=0;i<20;i+=2){}return 0;}').regions[0].estimatedComplexity, 'O(1)');
  assert.equal(analyze('int main(){for(int i=100;i>1;i/=2){}return 0;}').regions[0].estimatedComplexity, 'O(1)');
  assert.equal(analyze('int main(){int n=10;for(int i=0;i<n;i++){}for(int j=1;j<n;j*=2){}return 0;}').summary.worstEstimatedComplexity, 'O(n)');
  assert.equal(analyze('int main(){int n=10;for(int i=0;i<n;i+=2){}return 0;}').regions[0].estimatedComplexity, 'O(n)');
  for (const text of ['int main(){int n=10;for(int i=0;i<n;i++){n--;}return 0;}', 'int main(){int n=10;for(int i=0;i<n;i++){for(int j=0;j<i;j++){} }return 0;}', 'int main(){int n=10;for(int i=0;i<n;i++){mystery(i);}return 0;}', 'int main(){int n=10;for(int i=0;i<n;i--){}return 0;}']) assert.equal(analyze(text).regions[0].estimatedComplexity, 'Unknown');
  const nlog=analyze('int main(){int n=10;for(int i=0;i<n;i++){for(int j=1;j<n;j*=2){}}for(int k=0;k<n;k++){}return 0;}');
  assert.equal(nlog.summary.worstEstimatedComplexity, 'O(log n * n)');
  const conditional = analyze('int main(){int n=10;if(n>0){for(int i=0;i<n;i++){} }return 0;}');
  assert.equal(conditional.regions[0].estimatedComplexity, 'O(n)'); assert.ok(conditional.regions[0].assumptions.some(x => /Conditionally/.test(x)));
});
test('source byte offsets respect UTF-8 comments; nested and shared-end edits are ordered right to left', () => {
  const text = '// λ compiler\nint main(){int n=4;if(n>0)for(int i=0;i<n;i++)for(int j=0;j<n;j++)n+=0;else n=2;return 0;}';
  const { data, instrumented } = analyze(text, true);
  for (const r of data.regions) assert.equal(Buffer.from(text).subarray(r.startOffset, r.startOffset + 3).toString(), 'for');
  assert.match(instrumented, /if\(n>0\)\{ optiscope_internal::Timer optiscope_region_1\(1\); for/);
  assert.match(instrumented, /n\+=0; } }else/);
  assert.match(instrumented, /Total optiscope_total/);
});
test('deterministic AST recommendation evidence and conservative suppression', () => {
  const r = analyze(source('patterns'));
  assert.deepEqual(new Set(r.recommendations.map(x => x.pattern)), new Set(['Loop-invariant arithmetic', 'Repeated pure function call', 'Nested pairwise equality', 'Repeated linear equality scan']));
  for (const rec of r.recommendations) { assert.ok(r.regions.some(x => x.id === rec.regionId)); assert.ok(rec.evidence && rec.caveat); }
  const no = analyze('double f(double x){return x*x;}int main(){int n=10;double x=1;double s=0;for(int i=0;i<n;i++){x+=1;s+=x*x;s+=f(x);}return 0;}');
  assert.equal(no.recommendations.length, 0);
  const constants=analyze('int main(){int n=3;int a[3];int b[3];for(int i=0;i<n;i++){for(int j=0;j<n;j++){if(a[0]==b[0]){a[0]+=1;}}}return 0;}');
  assert.ok(!constants.recommendations.some(r=>r.pattern==='Nested pairwise equality'));
});
test('scoped symbol table resolves parameters and local scopes; no main remains static-only', () => {
  const r = analyze('int f(int n){int x=0;{int x=1;x++;}for(int i=0;i<n;i++){x+=i;}return x;}');
  assert.equal(r.success, true); assert.equal(r.hasMain, false); assert.ok(!r.warnings.some(x => /Duplicate|Unresolved/.test(x)));
  assert.ok(analyze('int f(){return missing;}').warnings.some(x => /Unresolved/.test(x)));
});
test('added cubic and independently authored mixed-family fixtures are parsed from content', () => {
  const triple = analyze(source('triple'));
  assert.equal(triple.summary.worstEstimatedComplexity, 'O(n^3)');
  assert.equal(triple.summary.maxNestingDepth, 3);
  const independent = analyze(source('independent'));
  assert.equal(independent.summary.worstEstimatedComplexity, 'O(log width * width)');
  assert.equal(independent.regions.length, 2);
});
