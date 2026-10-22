"""Runs only inside the restricted Docker container. Never invoke on the host."""
import json, os, selectors, signal, subprocess, time
LIMIT = 65536

def run(argv, seconds, output_limit=LIMIT):
    p = subprocess.Popen(argv, stdout=subprocess.PIPE, stderr=subprocess.PIPE, start_new_session=True, cwd='/work')
    sel = selectors.DefaultSelector()
    for stream, key in [(p.stdout, 'stdout'), (p.stderr, 'stderr')]:
        os.set_blocking(stream.fileno(), False)
        sel.register(stream, selectors.EVENT_READ, key)
    output = {'stdout': bytearray(), 'stderr': bytearray()}
    status = 'completed'
    deadline = time.monotonic() + seconds
    total = 0
    while sel.get_map():
        if time.monotonic() > deadline:
            status = 'timeout'
            os.killpg(p.pid, signal.SIGKILL)
            break
        for key, _ in sel.select(0.05):
            data = os.read(key.fd, 8192)
            if not data:
                sel.unregister(key.fileobj)
                continue
            total += len(data)
            available = max(0, output_limit - sum(len(x) for x in output.values()))
            output[key.data].extend(data[:available])
            if total > output_limit:
                status = 'output_limit'
                os.killpg(p.pid, signal.SIGKILL)
                break
        if status != 'completed':
            break
    sel.close()
    try:
        code = p.wait(timeout=1)
    except subprocess.TimeoutExpired:
        os.killpg(p.pid, signal.SIGKILL)
        code = p.wait()
    return dict(status=status, exitCode=code, **{k: bytes(v).decode('utf-8', errors='replace') for k, v in output.items()})

def compare():
    import hashlib, platform
    result = {'compilations': {}, 'runs': {'original': [], 'optimized': []}, 'warmups': {},
              'environment': {'platform': platform.platform(), 'architecture': platform.machine(),
                              'compiler': run(['g++', '--version'], 2)['stdout'].splitlines()[0],
                              'kernel': platform.release(), 'cpu': platform.processor() or 'not exposed by container'},
              'runCount': 10, 'warmupCount': 1, 'flags': ['-std=c++17', '-O2'],
              'workload': 'Fixed internal inputs; no stdin; same container limits; single-threaded deterministic programs only.'}
    for name in ['original', 'optimized']:
        result['compilations'][name] = run(['g++', '-std=c++17', '-O2', '-fmax-errors=8', '/input/' + name + '.cpp', '-o', '/work/' + name], 20)
        if result['compilations'][name]['status'] != 'completed' or result['compilations'][name]['exitCode'] != 0:
            result['status'] = 'compile_error'
            return result
    deadline = time.monotonic() + 25
    # Warm-up and all measured executions must agree in stdout, stderr and zero exit.
    expected = None
    equivalent = True
    for index in range(11):
        for name in (['original', 'optimized'] if index % 2 == 0 else ['optimized', 'original']):
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                result['status'] = 'timeout'
                return result
            begin = time.perf_counter_ns()
            execution = run(['/work/' + name], min(2, remaining))
            execution['elapsedMs'] = (time.perf_counter_ns() - begin) / 1000000
            if index == 0: result['warmups'][name] = execution
            else: result['runs'][name].append(execution)
            if execution['status'] != 'completed' or execution['exitCode'] != 0:
                result['status'] = execution['status'] if execution['status'] != 'completed' else 'runtime_error'
                return result
            observed = (execution['stdout'], execution['stderr'], execution['exitCode'])
            if expected is None: expected = observed
            equivalent = equivalent and observed == expected
    result['equivalent'] = equivalent
    result['status'] = 'completed' if equivalent else 'not_equivalent'
    return result

def analyze_clang():
    stage = run(['/opt/optiscope/engine/build/optiscope-clang', '/input/original.cpp', '/work/instrumented.cpp'], 20, 8 * 1024 * 1024)
    if stage['status'] != 'completed' or stage['exitCode'] != 0:
        return {'analysis': {'success': False, 'errors': [stage['stderr'] or 'Clang parser exceeded its resource limit or failed.'], 'frontend': {'name': 'clang', 'status': 'resource_limit' if stage['status'] != 'completed' or stage['exitCode'] < 0 else 'error'}}, 'parserProcess': stage}
    analysis = json.loads(stage['stdout'])
    if not analysis.get('success'):
        analysis['errors'] = analysis.get('errors') or [stage['stderr'] or 'C++17 semantic or syntax errors.']
        if 'file not found' in stage['stderr']: analysis['frontend']['status'] = 'missing_dependency'
    result = {'analysis': analysis}
    if analysis.get('success'):
        with open('/work/instrumented.cpp') as source:
            rewritten = source.read(1024 * 1024 + 1)
        if len(rewritten.encode('utf-8')) > 1024 * 1024:
            analysis.setdefault('profilingUnsupportedReasons', []).append('Instrumented source exceeds the 1 MiB artifact limit; static findings remain available.')
            result['instrumentedSource'] = ''
        else:
            result['instrumentedSource'] = rewritten
    return result

import sys
if len(sys.argv) > 1 and sys.argv[1] == 'clang':
    try: print(json.dumps(analyze_clang()))
    except Exception as error: print(json.dumps({'sandboxError': str(error)}))
elif len(sys.argv) > 1 and sys.argv[1] == 'compare':
    try: print(json.dumps(compare()))
    except Exception as error: print(json.dumps({'sandboxError': str(error)}))
else:
    try:
        compile_result = run(['g++', '-std=c++17', '-O0', '-fmax-errors=8', '/input/instrumented.cpp', '-o', '/work/program'], 20)
        result = {'compilation': compile_result}
        if compile_result['status'] == 'completed' and compile_result['exitCode'] == 0:
            result['execution'] = run(['/work/program'], 5)
            if result['execution']['status'] == 'completed' and result['execution']['exitCode'] == 0 and os.path.isfile('/work/profile.tsv'):
                with open('/work/profile.tsv') as f:
                    result['profile'] = f.read(LIMIT)
        print(json.dumps(result))
    except Exception as error:
        print(json.dumps({'sandboxError': str(error)}))
