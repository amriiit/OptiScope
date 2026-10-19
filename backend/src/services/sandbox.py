"""Runs only inside the restricted Docker container. Never invoke on the host."""
import json, os, selectors, signal, subprocess, time
LIMIT = 65536

def run(argv, seconds):
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
            available = max(0, LIMIT - sum(len(x) for x in output.values()))
            output[key.data].extend(data[:available])
            if total > LIMIT:
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
