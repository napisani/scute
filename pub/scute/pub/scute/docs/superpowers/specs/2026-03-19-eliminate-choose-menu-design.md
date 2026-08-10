# Eliminate Choose Menu — TUI as Single Entry Point

**Date:** 2026-03-19
**Status:** Approved

## Summary

Remove the choose menu, standalone CLI commands (explain, suggest, generate), and make the Build TUI the single interactive entry point for scute. The TUI already supports all AI features via leader keys — this change eliminates redundant code paths and simplifies both the codebase and the user experience.

## Motivation

The choose menu exists to bridge a technical constraint: when invoked via `$(scute choose ...)`, stdout is captured by the shell, so the TUI (which needs direct TTY access for opentui's alternate screen) can't run inside `$()`. The choose menu works around this with an exit-code-10 hack that signals the shell to re-invoke `scute build` directly.

This indirection is unnecessary. The TUI already has explain, suggest, and generate accessible via leader key combos. Making the TUI the only entry point removes the choose menu, the exit-code-10 dance, and the standalone CLI commands — replacing 5 shell functions per shell (across zsh, bash, and sh) with 1 each.

## Design Decisions

1. **Single keybinding** — `Ctrl+E` launches the TUI directly (no intermediate menu)
2. **Empty buffer** — opens the normal TUI with zero tokens (user can type or use leader+g to generate)
3. **AI results** — keep current TUI behavior (explain shows inline descriptions, suggest/generate replace command buffer)
4. **Standalone CLI commands removed** — explain, suggest, generate are no longer CLI commands; they live exclusively in the TUI
5. **Output via temp file** — the build command writes its result to a temp file (via `SCUTE_OUTPUT_FILE` env var) instead of stdout, since the TUI can't run inside `$()`
6. **Clipboard preserved** — `emitOutput()` still copies to clipboard (if configured) alongside writing to the temp file. This is intentional: the user may want the command on their clipboard even when it's also being piped back to the shell.
7. **LLM prompt config preserved** — `ConfigSchema.prompts` (with explain/suggest/generate/describeTokens keys) is NOT removed. These configure the LLM calls which are still used by the TUI's hooks.

## Architecture Changes

### 1. Shell Integration: Temp File Output Pattern

**Problem:** opentui uses the alternate screen and needs direct TTY access. It can't run inside `$()` because that captures stdout. But the shell needs the resulting command back in `BUFFER`.

**Solution:** The shell function creates a temp file, passes it as `SCUTE_OUTPUT_FILE`, runs `scute build` with direct TTY access, then reads the result from the temp file.

New zsh function:
```bash
_scute_build() {
    local tmpfile=$(mktemp /tmp/scute-output.XXXXXX) || return
    SCUTE_OUTPUT_FILE="$tmpfile" "$SCUTE_BIN" build "$BUFFER"
    if [ -f "$tmpfile" ]; then
        BUFFER=$(<"$tmpfile")
        CURSOR=${#BUFFER}
        rm -f "$tmpfile"
    fi
    zle redisplay
}
```

New bash function:
```bash
_scute_build() {
    local tmpfile=$(mktemp /tmp/scute-output.XXXXXX) || return
    SCUTE_OUTPUT_FILE="$tmpfile" "$SCUTE_BIN" build "$READLINE_LINE"
    if [ -f "$tmpfile" ]; then
        READLINE_LINE=$(< "$tmpfile")
        READLINE_POINT=${#READLINE_LINE}
        rm -f "$tmpfile"
    fi
}
```

New sh function (POSIX-compatible — uses `cat` instead of `$(<)`):
```bash
_scute_build() {
    local tmpfile=$(mktemp /tmp/scute-output.XXXXXX) || return
    SCUTE_OUTPUT_FILE="$tmpfile" "$SCUTE_BIN" build "$READLINE_LINE"
    if [ -f "$tmpfile" ]; then
        READLINE_LINE=$(cat "$tmpfile")
        READLINE_POINT=${#READLINE_LINE}
        rm -f "$tmpfile"
    fi
}
```

**Error handling:** `|| return` after `mktemp` guards against `/tmp` being full or read-only. If the TUI exits without writing (e.g., user cancels), the temp file will be empty or absent, and `BUFFER`/`READLINE_LINE` is left unchanged. Orphaned temp files from crashes are cleaned up by the OS's `/tmp` cleanup.

This replaces 5 shell functions (`_scute_explain`, `_scute_build`, `_scute_suggest`, `_scute_generate`, `_scute_choose`) with 1 updated `_scute_build`, per shell (zsh, bash, sh).

### 2. Code Deletion

**Files to delete entirely:**
- `src/commands/choose/` — entire directory (index.ts, menu.ts, dispatch.ts, external.ts, types.ts)
- `src/commands/explain.ts`
- `src/commands/suggest.ts`
- `src/commands/generate.ts`
- `src/utils/prompt.ts` — only imported by `generate.ts` and `build.tsx`; removing both usages

**Not deleted:** `src/core/llm.ts` functions (`explain()`, `suggest()`, `generateCommand()`) — still called by the TUI's hooks. `src/core/prompts.ts` — still used by `llm.ts`.

### 3. CLI Command Changes (`src/index.ts`)

**Remove commands:** `choose`, `explain`, `suggest`, `generate`

**Keep commands:** `init`, `build`, `config-debug`

**Remove imports:** `choose`, `explain`, `suggest`, `generate` from commands

### 4. Config Schema Changes (`src/config/schema.ts`)

**Remove:**
- `chooserCommand` field from `ConfigSchema`
- `ChooseMenuColorsSchema` and `ChooseMenuColorsConfig` type
- `theme.chooseMenu` field from `ThemeSchema`
- `shellKeybindings.explain`, `.suggest`, `.generate`, `.choose` fields

**Simplify `ShellKeybindingActions`** from `["explain", "build", "suggest", "generate", "choose"]` to `["build"]`.

**Simplify `shellKeybindings`** default to `{ build: ["Ctrl+E"] }`.

**Preserve:** `ConfigSchema.prompts` with explain/suggest/generate/describeTokens keys — these configure the LLM calls used by the TUI.

### 5. Config Accessors Changes (`src/config/index.ts`)

**Remove:**
- `getChooseMenuColors()` function
- `defaultChooseMenuColors` constant
- `chooseMenu` from `defaultTheme`
- `ChooseMenuColorsConfig` import
- Shell keybinding defaults for explain, suggest, generate, choose

**Simplify `defaultShellKeybindings`** to `{ build: ["Ctrl+E"] }`.

### 6. Output Mechanism (`src/core/output.ts`)

**Change `writeToStdout()`:** Check for `SCUTE_OUTPUT_FILE` env var. If set, write to that file path instead of stdout. This keeps the TUI's stdout clean for opentui rendering.

```ts
function writeToStdout(text: string): void {
    const output = text.endsWith("\n") ? text : `${text}\n`;
    const outputFile = getEnv("SCUTE_OUTPUT_FILE");
    if (outputFile) {
        fs.writeFileSync(outputFile, output);
    } else {
        process.stdout.write(output);
    }
}
```

**Clipboard behavior:** `copyToClipboard()` still runs alongside file output. This is intentional.

**Register `SCUTE_OUTPUT_FILE`** in `src/core/environment.ts` by adding it to the `SUPPORTED_ENV_VARS` array. Direct `getEnv()` usage in `output.ts` is acceptable since this is an operational env var (set by the shell wrapper), not user-facing config.

### 7. Shell Init Scripts (`src/core/shells/zsh.ts`, `bash.ts`, and `sh.ts`)

All three shell helpers get the same treatment:

**Delete:** All shell helper functions except `_scute_build`. Keep the `SCUTE_BIN` lookup block.

**Update `_scute_build`:** Use the temp file pattern described in section 1.

**Delete:** Widget/function registration for explain, suggest, generate, choose.

**Keep:** `zle -N scute-build _scute_build` (zsh only) and the `_scute_build` function.

**Simplify keybinding rendering:** The action map records (`ZSH_ACTION_WIDGETS`, `BASH_ACTION_FUNCTIONS`, `SH_ACTION_FUNCTIONS`) shrink to only `{ build: ... }`.

### 8. Build Command (`src/commands/build.tsx`)

**Remove:** The `promptForLine` import and the interactive prompt fallback for empty commands. When the command is empty, just render `<BuildApp command="" onExit={handleExit} />` — the TUI handles empty state natively.

**Remove:** The `readAllStdin()` function and stdin pipe fallback — the build command is now always interactive.

## Files Changed Summary

| Action | File(s) |
|--------|---------|
| **Delete** | `src/commands/choose/` (5 files) |
| **Delete** | `src/commands/explain.ts`, `suggest.ts`, `generate.ts` |
| **Delete** | `src/utils/prompt.ts` |
| **Delete** | `tests/commands/choose.test.ts` |
| **Modify** | `src/index.ts` — remove 4 commands + imports |
| **Modify** | `src/config/schema.ts` — remove chooser/choose config |
| **Modify** | `src/config/index.ts` — remove choose accessors |
| **Modify** | `src/core/output.ts` — add SCUTE_OUTPUT_FILE support |
| **Modify** | `src/core/environment.ts` — add SCUTE_OUTPUT_FILE |
| **Modify** | `src/core/shells/zsh.ts` — rewrite init script |
| **Modify** | `src/core/shells/bash.ts` — rewrite init script |
| **Modify** | `src/core/shells/sh.ts` — rewrite init script |
| **Modify** | `src/commands/build.tsx` — remove prompt fallback |
| **Modify** | `tests/core/output.test.ts` — add SCUTE_OUTPUT_FILE test cases |
| **Modify** | `tests/config-overlay.test.ts` — update snapshot expectations (remove chooseMenu, choose keybindings) |

## Testing

- Verify `scute init zsh`, `scute init bash`, and `scute init sh` output correct, simplified init scripts
- Verify `scute build` works with a command argument
- Verify `scute build` works with empty command (shows empty TUI)
- Verify `SCUTE_OUTPUT_FILE` mechanism works (writes to file when env var set, writes to stdout when not set)
- Verify existing TUI features (leader+e/s/g) still work
- Verify `scute config-debug` still works
- Verify all existing tests pass (after updating affected test files)
- Verify build succeeds with no type errors
