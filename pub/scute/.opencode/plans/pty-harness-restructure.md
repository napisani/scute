# PTY Harness Restructure Plan

Fix the stale buffer bug, add assertions, split monolithic scenarios into granular single-command tests, and add a run-all wrapper.

---

## 1. Fix `pty_runner.py`

### 1.1 Fix stale buffer in `wait_for_prompt`

**Problem:** Buffer accumulates the entire session. `wait_for_prompt` searches the full buffer, matching old prompts.

**Fix:** Change `wait_for_prompt` to return `(buffer, found)`. Track a `start_pos` at the beginning of the call (= current buffer length). Only search in `buffer[start_pos:]`. After a match, truncate the buffer to content after the match point so future waits start fresh.

```python
def wait_for_prompt(fd, log_file, buffer, prompt, timeout):
    start_pos = len(buffer)
    deadline = time.time() + timeout
    while time.time() < deadline:
        buffer = drain_output(fd, log_file, buffer, timeout=0.1)
        search_region = buffer[start_pos:]
        idx = search_region.find(prompt)
        if idx >= 0:
            cut_point = start_pos + idx + len(prompt)
            return buffer[cut_point:], True
    return buffer, False
```

Update the caller in `run_scenario` to destructure the tuple.

### 1.2 Fix `send_line` to use `\r` instead of `\n`

**Change:** `send_bytes(fd, f"{text}\r")` instead of `f"{text}\n"`. Terminals expect carriage return.

### 1.3 Add `drain_until_idle` helper

Keeps reading until no new data arrives for N ms. Used before assertions to ensure all pending output is captured.

```python
def drain_until_idle(fd, log_file, buffer, idle_ms=200):
    idle_timeout = idle_ms / 1000.0
    while True:
        new_buffer = drain_output(fd, log_file, buffer, timeout=idle_timeout)
        if new_buffer == buffer:
            break
        buffer = new_buffer
    return buffer
```

### 1.4 Add new step types

| Step | JSON syntax | Behavior |
|---|---|---|
| `wait_for_text` | `{"wait_for_text": "some text", "timeout": 10}` | Wait for text in buffer; fail on timeout |
| `assert_output_contains` | `{"assert_output_contains": "expected text"}` | Drain, then check buffer contains text |
| `assert_output_not_contains` | `{"assert_output_not_contains": "bad text"}` | Drain, then check buffer does NOT contain text |
| `assert_file_contains` | `{"assert_file_contains": "/path", "expected": "text"}` | Check file exists and contains expected text |
| `assert_file_exists` | `{"assert_file_exists": "/path"}` | Check file exists |
| `clear_buffer` | `{"clear_buffer": true}` | Reset buffer to empty string |
| `drain` | `{"drain": true, "idle_ms": 200}` | Drain until idle |
| `delete_file` | `{"delete_file": "/path"}` | Delete a file (useful for cleanup before clipboard tests) |

### 1.5 Track failures and propagate exit code

Add a `failures: list[str]` accumulator. Each assertion/wait failure appends a message. At the end, print summary and return 1 if any failures, 0 if all passed.

### 1.6 Reap child process

After `os.kill(pid, SIGHUP)`, add `os.waitpid(pid, 0)` in a try/except.

### 1.7 Add verbose step logging

Print each step to stderr as it executes (step number + description). Add `--verbose`/`--quiet` flags.

### 1.8 Increase default timeout

Change from 5.0 to 10.0 seconds (LLM calls can take a few seconds).

### 1.9 Expand KEYS dict

Add: `CTRL+A`, `CTRL+D`, `CTRL+U`, `HOME`, `END`.

---

## 2. Create Granular Scenarios

All scenarios in `scripts/agent/scenarios/`. Each is self-contained: sets prompt, inits scute, runs ONE command, validates.

### 2.1 `suggest-stdout.json`

```json
{
  "prompt": "scute-test$ ",
  "steps": [
    {"send_line": "export PS1=\"scute-test$ \""},
    {"wait_for_prompt": true},
    {"send_line": "eval \"$({scute_bin} --config {config} init {shell})\""},
    {"wait_for_prompt": true},
    {"clear_buffer": true},
    {"send_line": "{scute_bin} --config {config} suggest \"git sta\" --output stdout"},
    {"wait_for_prompt": true, "timeout": 15},
    {"assert_output_contains": "git"},
    {"send_line": "exit"}
  ]
}
```

### 2.2 `suggest-readline.json`

```json
{
  "prompt": "scute-test$ ",
  "steps": [
    {"send_line": "export PS1=\"scute-test$ \""},
    {"wait_for_prompt": true},
    {"send_line": "eval \"$({scute_bin} --config {config} init {shell})\""},
    {"wait_for_prompt": true},
    {"clear_buffer": true},
    {"send_text": "git sta"},
    {"send_keys": ["ALT+G"]},
    {"sleep": 5.0},
    {"drain": true, "idle_ms": 500},
    {"send_keys": ["ENTER"]},
    {"wait_for_prompt": true, "timeout": 5},
    {"send_line": "exit"}
  ]
}
```

### 2.3 `explain-stdout.json`

```json
{
  "prompt": "scute-test$ ",
  "steps": [
    {"send_line": "export PS1=\"scute-test$ \""},
    {"wait_for_prompt": true},
    {"send_line": "eval \"$({scute_bin} --config {config} init {shell})\""},
    {"wait_for_prompt": true},
    {"clear_buffer": true},
    {"send_line": "{scute_bin} --config {config} explain \"ls -la /tmp\" 5 --output stdout"},
    {"wait_for_prompt": true, "timeout": 15},
    {"assert_output_contains": "ls"},
    {"send_line": "exit"}
  ]
}
```

### 2.4 `explain-keybinding.json`

```json
{
  "prompt": "scute-test$ ",
  "steps": [
    {"send_line": "export PS1=\"scute-test$ \""},
    {"wait_for_prompt": true},
    {"send_line": "eval \"$({scute_bin} --config {config} init {shell})\""},
    {"wait_for_prompt": true},
    {"clear_buffer": true},
    {"send_text": "ls -la"},
    {"send_keys": ["CTRL+E"]},
    {"sleep": 5.0},
    {"drain": true, "idle_ms": 500},
    {"send_keys": ["ENTER"]},
    {"wait_for_prompt": true, "timeout": 5},
    {"send_line": "exit"}
  ]
}
```

### 2.5 `build-stdout.json`

```json
{
  "prompt": "scute-test$ ",
  "steps": [
    {"send_line": "export PS1=\"scute-test$ \""},
    {"wait_for_prompt": true},
    {"send_line": "eval \"$({scute_bin} --config {config} init {shell})\""},
    {"wait_for_prompt": true},
    {"clear_buffer": true},
    {"send_line": "{scute_bin} --config {config} build \"ls -la\" --output stdout"},
    {"sleep": 2.0},
    {"send_keys": ["ENTER"]},
    {"wait_for_prompt": true, "timeout": 10},
    {"send_line": "exit"}
  ]
}
```

### 2.6 `generate-stdout.json`

```json
{
  "prompt": "scute-test$ ",
  "steps": [
    {"send_line": "export PS1=\"scute-test$ \""},
    {"wait_for_prompt": true},
    {"send_line": "eval \"$({scute_bin} --config {config} init {shell})\""},
    {"wait_for_prompt": true},
    {"clear_buffer": true},
    {"send_line": "{scute_bin} --config {config} generate \"list all files in current directory\" --output stdout"},
    {"wait_for_prompt": true, "timeout": 15},
    {"assert_output_contains": "ls"},
    {"send_line": "exit"}
  ]
}
```

### 2.7 `clipboard-file.json`

```json
{
  "prompt": "scute-test$ ",
  "steps": [
    {"delete_file": "/tmp/scute-clipboard.txt"},
    {"send_line": "export PS1=\"scute-test$ \""},
    {"wait_for_prompt": true},
    {"send_line": "eval \"$({scute_bin} --config {config} init {shell})\""},
    {"wait_for_prompt": true},
    {"send_line": "{scute_bin} --config {config} suggest \"git sta\" --output clipboard"},
    {"wait_for_prompt": true, "timeout": 15},
    {"assert_file_exists": "/tmp/scute-clipboard.txt"},
    {"assert_file_contains": "/tmp/scute-clipboard.txt", "expected": "git"},
    {"send_line": "exit"}
  ]
}
```

---

## 3. Create `run-all` Wrapper

New file: `scripts/agent/run-all`

Runs each granular scenario, captures exit code, prints a pass/fail summary table at the end. Returns non-zero if any scenario failed.

```bash
#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RUNNER="$ROOT_DIR/scripts/agent/pty_runner.py"
SCENARIOS_DIR="$ROOT_DIR/scripts/agent/scenarios"

PASS=0
FAIL=0
RESULTS=()

for scenario in "$SCENARIOS_DIR"/*.json; do
    name="$(basename "$scenario" .json)"
    log="/tmp/scute-pty-${name}.log"
    if python3 "$RUNNER" --scenario "$scenario" --log "$log" "$@"; then
        RESULTS+=("PASS  $name")
        ((PASS++))
    else
        RESULTS+=("FAIL  $name")
        ((FAIL++))
    fi
    echo ""
done

echo "================================"
echo "Results: $PASS passed, $FAIL failed"
echo "================================"
for r in "${RESULTS[@]}"; do echo "  $r"; done

if [ "$FAIL" -gt 0 ]; then exit 1; fi
```

---

## 4. Update Individual Wrapper Scripts

Keep existing `run-pty-shell`, `run-pty-output`, `run-pty-tui` for the old monolithic scenarios (moved to `scenarios/legacy/`), and add new convenience wrappers:

- `run-pty-suggest` -> runs `suggest-stdout.json`
- `run-pty-explain` -> runs `explain-stdout.json`
- `run-pty-build` -> runs `build-stdout.json`
- `run-pty-generate` -> runs `generate-stdout.json`

Or: since `run-all` covers everything, just keep `run-all` and document running individual scenarios via:
```sh
python3 scripts/agent/pty_runner.py --scenario scripts/agent/scenarios/suggest-stdout.json --log /tmp/scute-pty-suggest.log
```

**Decision:** Create a single `run-one` convenience script that takes a scenario name:
```sh
scripts/agent/run-one suggest-stdout
```

---

## 5. Update SKILL.md

- Fix config references: `agent-pty.yml` not `openai-config.yml`
- Document all new step types (wait_for_text, assert_*, clear_buffer, drain, delete_file)
- Update scenario listing to show granular scenarios
- Update prompt templates for per-command testing
- Document `run-all` and `run-one` usage

---

## 6. Move Old Scenarios

Move `shell.json`, `output.json`, `tui.json` to `scripts/agent/scenarios/legacy/` so they don't run in `run-all` but are preserved for reference.

Move old wrapper scripts (`run-pty-shell`, `run-pty-output`, `run-pty-tui`) to reference the legacy paths.

---

## Execution Order

```
1. Fix pty_runner.py                         (~30 min)
2. Create granular scenarios (7 files)       (~20 min)
3. Create run-all and run-one scripts        (~10 min)
4. Move old scenarios to legacy/             (~5 min)
5. Update wrapper scripts                    (~5 min)
6. Update SKILL.md                           (~15 min)
7. Smoke test: run-all                       (~5 min)
```

Total: ~1.5 hrs
