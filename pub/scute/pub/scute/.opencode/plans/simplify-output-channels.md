# Plan: Simplify Output Channels (stdout + clipboard only)

## Goal
Remove `prompt` and `readline` output channels, keeping only `stdout` and `clipboard`. Fix `choose` command dispatch to work correctly with shell keybinding readline replacement.

## Background
- `readline` channel is bugged: ANSI escape codes (`\r\x1b[2K`) pollute BUFFER when shell captures via `$()`
- `prompt` channel is fragile: relies on TTY `stdout.rows` and ANSI cursor save/restore
- `choose` command doesn't work when dispatching to `suggest` because the shell function doesn't capture stdout

## Exit-code protocol for `choose`
- **Exit 0**: stdout has the new readline text (suggest, generate, cancel, explain, config-debug)
- **Exit 10**: shell should re-invoke `scute build "$BUFFER"` directly (TUI needs real TTY)

---

## Files to change

### 1. `src/core/output.ts`
- Change `OutputChannel` type from `"clipboard" | "stdout" | "prompt" | "readline"` to `"clipboard" | "stdout"`
- Remove `EmitOutputOptions.promptPrefix` field
- Remove `writeToPrompt()` function entirely
- Remove `readline` case from `emitOutput()` switch — remove `outputToReadline` import
- Remove `prompt` case from `emitOutput()` switch
- Remove `chalk` import (only used by writeToPrompt)

### 2. `src/config/schema.ts`
- `OutputChannelSchema` (line 41-46): Change to `z.enum(["clipboard", "stdout"])`
- `LeaderKeybindingsSchema` (line 113-131): Remove `outputReadline` and `outputPrompt` keys from both the schema definition and the default values
- Keep `outputClipboard` and `outputStdout`

### 3. `src/config/index.ts`
- `getPromptOutput` (line 233-235): Still works (returns user-configured output from prompts config). The schema validation will reject `prompt`/`readline` values.
- No other changes needed here — the function just reads config.

### 4. `src/index.ts`
- `VALID_OUTPUT_CHANNELS` (line 33-38): Remove `"prompt"` and `"readline"`
- `resolveOutputChannel` (line 40-69): 
  - Remove the `if (commandName === "suggest") return "readline"` line
  - Remove the `if (commandName === "explain") return "prompt"` line  
  - Remove the `if (commandName === "build") return "readline"` line
  - All commands default to `"stdout"` if no override
- CLI option description (line 30): Change to `"Output channel (clipboard|stdout)"`

### 5. `src/commands/explain.ts`
- Remove `promptPrefix` from the `emitOutput` call (line 29-33)
- The default output will be `stdout` (from resolveOutputChannel)

### 6. `src/commands/choose.ts`
- Remove `restoreReadlineState` import and all calls to it
- Remove `getReadlineLine`, `hasReadlineLine` imports (no longer needed for restore)
- Keep `lineArg`/`pointArg` capture for passing to sub-commands
- **Cancel/invalid**: Write original line to stdout, then return (exit 0)
- **suggest**: `await suggest(originalLine, { output: "stdout" })` — exit 0
- **generate**: `await generate([], { output: "stdout" })` — exit 0  
- **explain**: `await explain(originalLine, String(originalPoint), { output: "stdout" })` — exit 0
- **config-debug**: `configDebug({ output: "stdout" })` — exit 0
- **build**: Write original line to stdout, then `process.exit(10)` — shell detects exit code and re-invokes build directly
  - Actually: for build, we should NOT write original line. The shell function will detect exit 10 and re-invoke build. We output nothing (or we could output original line so BUFFER is preserved before build takes over).
  - Better: output original line to stdout (so shell captures it → BUFFER preserved), then exit 10. Shell sees exit 10, re-invokes `scute build "$BUFFER"` directly.

### 7. `src/core/shells/common.ts`
- Remove `outputToReadline` from `ShellHelper` interface (line 41)
- Remove the JSDoc comment above it (lines 34-41)

### 8. `src/core/shells/index.ts`
- Remove `outputToReadline` function (line 91-94)
- Remove `outputToReadline` from exports (line 122)
- Remove `restoreReadlineState` function (line 96-108) — it's commented out anyway
- Remove `restoreReadlineState` from exports (line 123)

### 9. `src/core/shells/bash.ts`
- Remove `outputToReadline` property from `bashShellHelper` (lines 126-137)
- Remove `normalizeReadlineText` function (lines 112-115)
- Update `_scute_explain` shell function: change `--output prompt` to `--output stdout`
- Update `_scute_suggest` shell function: change `--output readline` to `--output stdout`
- Update `_scute_generate` shell function: change `--output readline` to `--output stdout`
- Update `_scute_choose` shell function to capture stdout and handle exit codes:
```bash
_scute_choose() {
    local RESULT
    RESULT="$("$SCUTE_BIN" choose "$READLINE_LINE" "$READLINE_POINT")"
    local RC=$?
    if [ $RC -eq 10 ]; then
        "$SCUTE_BIN" build "$READLINE_LINE"
    elif [ -n "$RESULT" ]; then
        READLINE_LINE="$RESULT"
        READLINE_POINT=${#RESULT}
    fi
}
```

### 10. `src/core/shells/zsh.ts`
- Remove `outputToReadline` property from `zshShellHelper` (lines 132-143)
- Remove `normalizeReadlineText` function (lines 118-121)
- Update `_scute_explain` shell function: change `--output prompt` to `--output stdout`
- Update `_scute_suggest` shell function: change `--output readline` to `--output stdout`
- Update `_scute_generate` shell function: change `--output readline` to `--output stdout`
- Update `_scute_choose` shell function:
```zsh
_scute_choose() {
    local RESULT
    RESULT="$("$SCUTE_BIN" choose "$BUFFER" "$CURSOR")"
    local RC=$?
    if [ $RC -eq 10 ]; then
        "$SCUTE_BIN" build "$BUFFER"
    elif [ -n "$RESULT" ]; then
        BUFFER="$RESULT"
        CURSOR=${#BUFFER}
    fi
    zle redisplay
}
```

### 11. `src/core/shells/sh.ts`
- Same changes as bash.ts (remove outputToReadline, normalizeReadlineText, update shell functions)

### 12. `src/hooks/useLeaderMode.ts`
- Remove `outputReadlineKeys` useMemo (line 40-43)
- Remove `outputPromptKeys` useMemo (line 48-51)
- Remove the `if (outputReadlineKeys.includes(keyId))` block (lines 92-95)
- Remove the `if (outputPromptKeys.includes(keyId))` block (lines 100-103)
- Remove from dependency array of handleLeaderKey

### 13. `src/components/Footer.tsx`
- Remove `outputReadlineKey` (line 32) and `outputPromptKey` (line 34) 
- Remove from leaderActive hints array: `{ key: outputReadlineKey, label: "readline" }` and `{ key: outputPromptKey, label: "prompt" }`

### 14. `configs/agent-pty.yml`
- Change `explain: output: prompt` to `explain: output: stdout`
- Change `suggest: output: readline` to `suggest: output: stdout`
- Change `generate: output: readline` to `generate: output: stdout`

### 15. `tests/config-overlay.test.ts`
- Any test fixtures using `prompt`/`readline` as output values need updating to `stdout`

### 16. PTY e2e scenarios
- `explain-stdout.json`: Change `--output stdout` — already correct, no change needed
- `explain-keybinding.json`: The keybinding flow goes through choose now. Explain output will be plain text on stdout (captured by shell). The scenario should still work since it just waits for prompt return.
- `suggest-stdout.json`: Change `--output stdout` — already uses stdout, no change
- `suggest-readline.json`: The keybinding function captures stdout now. Need to verify this still works (it should since suggest writes to stdout).
- `build-stdout.json`: No change needed (build uses TUI passthrough)
- `choose-cancel.json`: Should still work (cancel outputs original line to stdout)
- `choose-explain.json`: Should still work (explain outputs to stdout)
- `choose-keybinding.json`: Should still work

---

## Implementation order
1. `src/core/output.ts` — remove channels
2. `src/config/schema.ts` — update OutputChannelSchema + LeaderKeybindingsSchema
3. `src/core/shells/common.ts` — remove outputToReadline from interface
4. `src/core/shells/bash.ts`, `zsh.ts`, `sh.ts` — remove outputToReadline, update shell functions
5. `src/core/shells/index.ts` — remove exports
6. `src/commands/explain.ts` — remove promptPrefix
7. `src/commands/choose.ts` — fix dispatch + exit codes
8. `src/index.ts` — simplify resolveOutputChannel
9. `src/hooks/useLeaderMode.ts` — remove readline/prompt keys
10. `src/components/Footer.tsx` — remove readline/prompt hints
11. `src/config/index.ts` — any cleanup
12. `configs/agent-pty.yml` — update output values
13. Tests — fix fixtures and scenarios
14. Run tests

## Key design decisions
- `choose` uses exit code 10 to signal "re-invoke build" to the shell function
- `explain` via choose menu: outputs explanation text to stdout. The shell captures it and assigns to BUFFER. This means the explanation temporarily replaces the readline buffer — but that's actually useful since the user can see it and then just press Ctrl+C to clear.
- All output from choose goes through stdout capture in the shell function
