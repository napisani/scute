---
name: scute-pty-e2e
description: Run agentic PTY smoke tests for scute (shell integration, output channels, and TUI) with scripted scenarios and log capture.
references: []
---

# scute PTY E2E Skill

This skill runs PTY-based smoke scenarios that exercise real shell integration, output channels, and the TUI. Use it when you need fast, agentic feedback on the shell/TUI experience.

## When to Use

- You need to validate shell keybindings (Ctrl+E explain, Alt+G suggest).
- You need to see prompt/readline output behavior (not just stdout).
- You need to confirm the TUI renders and exits correctly.
- You need to verify a scute command produces expected output end-to-end.

## Prereqs

- `python3`
- `bun`
- Provider credentials (e.g. `OPENAI_API_KEY`) or a local provider.

## Files and Scripts

- PTY runner: `scripts/agent/pty_runner.py`
- Scenarios (granular, one command each):
  - `scripts/agent/scenarios/suggest-stdout.json` — suggest via CLI, stdout output
  - `scripts/agent/scenarios/suggest-readline.json` — suggest via Alt+G keybinding
  - `scripts/agent/scenarios/explain-stdout.json` — explain via CLI, stdout output
  - `scripts/agent/scenarios/explain-keybinding.json` — explain via Ctrl+E keybinding
  - `scripts/agent/scenarios/build-stdout.json` — build TUI, submit with Enter
  - `scripts/agent/scenarios/generate-stdout.json` — generate via CLI, stdout output
  - `scripts/agent/scenarios/clipboard-file.json` — suggest to clipboard, verify file
- Entry scripts:
  - `scripts/agent/run-all` — runs all granular scenarios, prints pass/fail summary
  - `scripts/agent/run-one <name>` — runs a single scenario by name
- Default config: `configs/agent-pty.yml`
- Logs: `/tmp/scute-pty-<scenario-name>.log`
- Clipboard capture: `/tmp/scute-clipboard.txt`

## Default Behavior

- Shell: `bash` (clean shell: `--noprofile --norc`)
- Config: `configs/agent-pty.yml`
- Prompt: `scute-test$ `
- Clipboard writes to `/tmp/scute-clipboard.txt`
- Default timeout: 10 seconds per wait step

## Commands

```sh
# Run ALL granular scenarios and get a pass/fail summary
scripts/agent/run-all

# Run a single scenario by name
scripts/agent/run-one suggest-stdout
scripts/agent/run-one explain-stdout
scripts/agent/run-one build-stdout
scripts/agent/run-one generate-stdout
scripts/agent/run-one clipboard-file
scripts/agent/run-one suggest-readline
scripts/agent/run-one explain-keybinding
```

Override shell/config:

```sh
scripts/agent/run-one suggest-stdout --shell zsh
scripts/agent/run-all --shell zsh --config configs/agent-pty.yml
```

Suppress step-by-step output:

```sh
scripts/agent/run-all --quiet
```

## Scenario Step Types

Each scenario is a JSON file with a `prompt` string and a `steps` array. Available step types:

| Step | JSON Syntax | Description |
|---|---|---|
| `send_line` | `{"send_line": "command"}` | Send text + CR (submits the line) |
| `send_text` | `{"send_text": "text"}` | Send text without submitting |
| `send_keys` | `{"send_keys": ["CTRL+E"]}` | Send special key sequences |
| `sleep` | `{"sleep": 1.5}` | Wait a fixed duration (seconds) |
| `wait_for_prompt` | `{"wait_for_prompt": true, "timeout": 10}` | Wait for prompt in NEW output only; resets buffer after match |
| `wait_for_text` | `{"wait_for_text": "expected", "timeout": 10}` | Wait for specific text in output |
| `assert_output_contains` | `{"assert_output_contains": "text"}` | Assert buffer contains text |
| `assert_output_not_contains` | `{"assert_output_not_contains": "text"}` | Assert buffer does NOT contain text |
| `assert_file_exists` | `{"assert_file_exists": "/path"}` | Assert file exists on disk |
| `assert_file_contains` | `{"assert_file_contains": "/path", "expected": "text"}` | Assert file contains text |
| `clear_buffer` | `{"clear_buffer": true}` | Reset the output buffer to empty |
| `drain` | `{"drain": true, "idle_ms": 200}` | Read until output settles (no data for N ms) |
| `delete_file` | `{"delete_file": "/path"}` | Delete a file (cleanup before test) |

### Template Variables

All string values in steps support `{variable}` interpolation:

- `{scute_bin}` — absolute path to the scute binary
- `{config}` — absolute path to the config file
- `{shell}` — shell name (bash/zsh/sh)
- `{prompt}` — the prompt string from the scenario

### Available Keys

`ENTER`, `TAB`, `ESC`, `CTRL+A`, `CTRL+C`, `CTRL+D`, `CTRL+E`, `CTRL+G`, `CTRL+U`, `UP`, `DOWN`, `LEFT`, `RIGHT`, `BACKSPACE`, `ALT+G`, `HOME`, `END`

## How to Validate Results

- **Automated:** `run-all` and `run-one` exit with code 0 on pass, 1 on failure. Assertion failures are printed to stderr.
- **Manual/Agent:** Read `/tmp/scute-pty-<name>.log` to inspect raw terminal output.
- **Clipboard:** Read `/tmp/scute-clipboard.txt` for clipboard channel verification.

## Agent Prompt Templates

Use these with any agent that can run shell commands and read files:

```text
Run scripts/agent/run-one suggest-stdout. If it fails, read /tmp/scute-pty-suggest-stdout.log (last 120 lines) and diagnose the issue.
```

```text
Run scripts/agent/run-one explain-stdout. If it fails, read /tmp/scute-pty-explain-stdout.log and summarize what went wrong.
```

```text
Run scripts/agent/run-one clipboard-file. If it passes, the clipboard output channel works. If it fails, check /tmp/scute-pty-clipboard-file.log and /tmp/scute-clipboard.txt.
```

```text
Run scripts/agent/run-all and report the pass/fail summary. For any failures, include the last 120 lines of the corresponding log file.
```

## Troubleshooting

- If prompt never appears, increase `--timeout` (seconds) on the command line.
- If clipboard output is empty, confirm `configs/agent-pty.yml` is used (not a different config).
- If TUI hangs, the `build-stdout` scenario sends ENTER after 2s — increase the sleep if the TUI is slow to render.
- If keybinding tests fail, check that `scute init` ran successfully by reading the log after the init step.
