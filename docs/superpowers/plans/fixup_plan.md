# Scute Fixup Plan

Comprehensive code review findings organized into prioritized phases.
Each item includes the files affected, what to change, and estimated effort.

---

## Phase 1: Bugs and Correctness

These are things that are broken or produce wrong behavior today.

### 1.1 Fix `Math.random()` in React keys

- **File:** `src/components/TokenAnnotatedView.tsx:52`
- **Problem:** `key={`annotated-line-${index}-${Math.random()}`}` defeats React reconciliation entirely. Every render unmounts and remounts every element, causing performance degradation and potential loss of focus/state.
- **Fix:** Replace with a stable key: `key={`annotated-line-${index}`}`. The index is stable here because annotated lines are derived deterministically from tokens.
- **Effort:** 5 min

### 1.2 Remove unconditional `console.log` in production path

- **File:** `src/core/token-descriptions.ts:250-258`
- **Problem:** `printTokenDescriptions` calls `console.log(...)` for every token unconditionally. This writes to stdout during normal CLI operation, corrupting output for `readline` and `prompt` output channels.
- **Fix:** Either gate behind `isDebugMode()` using `logDebug`, or remove the function entirely since the same information is already logged via `logDebug` at line 125.
- **Effort:** 5 min

### 1.3 Validate `--output` channel at CLI level

- **File:** `src/index.ts:29`
- **Problem:** `return requested as OutputChannel` casts user input without validation. Invalid values like `--output foo` silently pass through.
- **Fix:** Add runtime validation against the valid set `["clipboard", "stdout", "prompt", "readline"]`. Print an error and exit with code 1 if invalid.
- **Effort:** 10 min

### 1.4 Fix redundant ternary in border rendering

- **File:** `src/utils/annotatedRenderer.tsx:241,253`
- **Problem:** `const borderChar = borderType === "top" ? "─" : "─"` -- both branches produce the identical character. This is dead logic.
- **Fix:** Replace with `const borderChar = "─"` in both locations.
- **Effort:** 2 min

---

## Phase 2: Dead Code Removal

Code that is defined but never used, adding maintenance burden and confusion.

### 2.1 Delete legacy `src/shells/bash.ts`

- **File:** `src/shells/bash.ts` (54 lines)
- **Problem:** This is an older version of the bash init script that references a `suggest-prompt` subcommand that doesn't exist. It is not imported anywhere. The canonical version is at `src/core/shells/bash.ts`.
- **Fix:** Delete the file. Delete the `src/shells/` directory if empty afterward.
- **Effort:** 2 min

### 2.2 Delete unused `truncateToWidth` function

- **File:** `src/utils/annotatedRenderer.tsx:172-176`
- **Problem:** Defined but never called anywhere in the codebase.
- **Fix:** Remove the function.
- **Effort:** 2 min

### 2.3 Delete unused `useTokenNavigation` hook

- **File:** `src/hooks/useTokenNavigation.ts` (30 lines)
- **Problem:** Not imported anywhere. Its functionality is fully subsumed by `useVimMode`.
- **Fix:** Delete the file.
- **Effort:** 2 min

### 2.4 Remove or annotate stub `context7.ts`

- **File:** `src/core/context7.ts` (7 lines)
- **Problem:** Stub function that returns `null`. Not imported or called anywhere.
- **Fix:** Delete the file. If future work is planned, track it in a TODO issue instead of keeping dead code in the repo.
- **Effort:** 2 min

---

## Phase 3: Decompose `useVimMode`

The 664-line monolithic hook handles normal mode, insert mode, view toggling, editing state, cursor movement, key normalization, and "gg" double-press detection. The existing unused sub-hooks (`useViewMode`, `useInsertMode`, `useNormalMode`) show that decomposition was intended but not completed.

This phase refactors `useVimMode` into focused sub-hooks and deletes the old unused ones.

### 3.1 Move `ViewMode` type to a shared location

- **File:** `src/hooks/useViewMode.ts` -> new location
- **Problem:** `ViewMode` is exported from `useViewMode.ts` and imported by `Footer.tsx` and `useVimMode.ts`. Before we can restructure hooks, the type needs a stable home.
- **Fix:** Move `ViewMode` type definition into `src/hooks/useVimMode.ts` (since it's the authoritative hook) or into a `src/types.ts` file. Update imports in `Footer.tsx`.
- **Effort:** 5 min

### 3.2 Extract `moveSelection` helper

- **File:** `src/hooks/useVimMode.ts:308-329` and `378-399`
- **Problem:** The `moveSelection` closure is defined identically inside both the `if (currentViewMode === "annotated")` and `else` branches.
- **Fix:** Define `moveSelection` once before the conditional, outside the branching logic. The function body is identical in both cases.
- **Effort:** 10 min

### 3.3 Extract key normalization into a utility

- **File:** `src/hooks/useVimMode.ts:59-78`
- **Problem:** `normalizeKeyId` and `hasModifierKey` are pure functions with no hook dependencies, but live inside the hook file.
- **Fix:** Move to `src/utils/keyboard.ts` (or similar). This makes them independently testable and reusable by the sub-hooks.
- **Effort:** 10 min

### 3.4 Extract insert mode into `useInsertMode` sub-hook

- **File:** `src/hooks/useVimMode.ts:437-643` (insert mode keyboard handler + related state)
- **Problem:** The insert mode logic (cursor movement, text editing, backspace, delete, char input, skip-trigger) is ~200 lines interleaved with the rest of the hook.
- **Fix:** Rewrite `src/hooks/useInsertMode.ts` as a proper sub-hook that `useVimMode` composes. It should accept: `modeRef`, `editorState`/`setEditorState`, `editingTokenIndex`, `exitInsertMode`, `skipNextInsertCharRef`, `insertTriggerRef`, and the `useKeyboard` dependency. The existing `useInsertMode.ts` content serves as a starting point but needs updating to match the current behavior (it's missing skip-trigger logic, home/end keys, delete key, and the `modeRef` pattern).
- **Effort:** 1-2 hrs

### 3.5 Extract normal mode into `useNormalMode` sub-hook

- **File:** `src/hooks/useVimMode.ts:214-433` (normal mode keyboard handler)
- **Problem:** The normal mode logic (navigation, view toggle, explain, insert/append/change entry, "gg" detection) is ~220 lines.
- **Fix:** Rewrite `src/hooks/useNormalMode.ts` as a proper sub-hook that `useVimMode` composes. It should accept: `modeRef`, `parsedTokens`, `selectedIndex`/`setSelectedIndex`, `viewMode`/`setViewMode`, `enterInsertMode`, `loadDescriptions`, `onSubmit`, keybinding arrays, and the `useKeyboard` dependency. The existing file is a starting point but is missing "gg" logic, `moveSelection`, `appendLine`, and several keybindings.
- **Effort:** 1-2 hrs

### 3.6 Simplify `useVimMode` to a composition hook

- **File:** `src/hooks/useVimMode.ts`
- **Problem:** After extracting sub-hooks, the remaining `useVimMode` should be a thin composition layer.
- **Fix:** `useVimMode` becomes ~100-150 lines that: initializes shared state, composes `useNormalMode` + `useInsertMode`, and exposes the combined `VimModeState & VimModeActions` interface. The public API does not change, so consumers (`BuildApp`) need no modifications.
- **Effort:** 30 min (after 3.4 and 3.5)

### 3.7 Delete old `useViewMode` hook file

- **File:** `src/hooks/useViewMode.ts` (29 lines)
- **Problem:** After moving `ViewMode` type (3.1), this file is completely unused.
- **Fix:** Delete the file.
- **Effort:** 2 min

---

## Phase 4: Simplification

Reducing unnecessary complexity and indirection.

### 4.1 Inline or consolidate identity functions

- **Files:** `src/utils/tokenFormatters.ts`, `src/hooks/useTokenWidth.ts:4-10`, `src/hooks/useTokenDescriptions.ts:5`
- **Problem:** `formatToken(token)` returns `token.value`, `formatTokenType(token)` returns `token.type`, and `mapDescriptions(d)` returns `d`. These are identity functions duplicated across files.
- **Fix:** Option A (preferred): Delete `tokenFormatters.ts` and inline `token.value`/`token.type` at call sites. There are ~10 call sites across `annotatedRenderer.tsx`, `TokenDisplay.tsx`, `TokenListView.tsx`, and `useTokenWidth.ts`. Option B: Keep `tokenFormatters.ts` as the single source, delete duplicates, and add a comment explaining they're extension points.
- **Effort:** 20 min

### 4.2 Extract `getInitialViewMode()` helper

- **Files:** `src/hooks/useVimMode.ts:92-93` (and previously in the dead hooks)
- **Problem:** `getConfigSnapshot().viewMode === "horizontal" ? "annotated" : "list"` is repeated logic.
- **Fix:** Add a `getInitialViewMode()` function in `src/config/index.ts` that returns the mapped `ViewMode`. After Phase 3 decomposition, it will only be used in one place, but it still clarifies the mapping between config terminology ("horizontal") and internal terminology ("annotated").
- **Effort:** 10 min

### 4.3 Simplify `AnnotatedLine` wrapper type

- **Files:** `src/utils/annotatedRenderer.tsx:8-10`, `src/components/TokenAnnotatedView.tsx`
- **Problem:** `AnnotatedLine` is `{ content: ReactNode }`. Every consumer just accesses `line.content`. The wrapper adds no semantic value.
- **Fix:** Change `renderAnnotatedCommand` to return `ReactNode[]` directly. Update `TokenAnnotatedView.tsx` to map over the array without unwrapping.
- **Effort:** 15 min

### 4.4 Reduce verbose trace logging in `useVimMode`

- **File:** `src/hooks/useVimMode.ts`
- **Problem:** Nearly every code path has a `logTrace(...)` call, including no-op paths like "cursorAtStart", "ignoredModifier", "nonPrintable". This adds ~100+ lines of boilerplate and makes the actual logic harder to follow.
- **Fix:** Keep traces for meaningful state transitions (mode changes, token edits, view toggles). Remove traces for no-op paths and mundane operations (individual cursor moves, skipped characters). This should remove ~30-50 lines.
- **Effort:** 20 min (do this during or after Phase 3 decomposition)

---

## Phase 5: Robustness and Hardening

Making the tool more reliable across environments and failure modes.

### 5.1 Add error state to `useTokenDescriptions`

- **Files:** `src/hooks/useTokenDescriptions.ts`, `src/pages/build.tsx`, `src/components/Footer.tsx`
- **Problem:** If `fetchTokenDescriptions` throws, the loading spinner stops but no error is shown. The user has no idea what happened.
- **Fix:** Add an `error: string | null` state to the hook. In the `catch` block, set it. In `Footer.tsx` (or `BuildApp`), render a brief error message when `error` is set (e.g., `<text fg="#F38BA8">{error}</text>`).
- **Effort:** 30 min

### 5.2 Auto-detect platform clipboard command

- **File:** `src/core/output.ts:42`
- **Problem:** The default clipboard command is `pbcopy` (macOS-only). Linux and WSL users get a silent failure that falls back to stdout.
- **Fix:** Detect platform and choose default: `pbcopy` on macOS, `xclip -selection clipboard` on Linux (with `xsel` fallback), `clip.exe` on WSL. If none is found, emit a clear warning suggesting the `clipboardCommand` config option.
- **Effort:** 20 min

### 5.3 Add cache eviction

- **File:** `src/core/cache.ts`
- **Problem:** The SQLite cache grows unboundedly with no TTL or size limit.
- **Fix:** After `getDb()` initialization, run a cleanup query: `DELETE FROM token_descriptions WHERE created_at < ?` with a 30-day threshold. Run this lazily (e.g., on the first `saveDescriptions` call per session).
- **Effort:** 15 min

### 5.4 Use `PAGER=cat` env instead of `man -P cat`

- **File:** `src/core/manpage/index.ts`
- **Problem:** `man -P cat` is not POSIX-standard. Some minimal systems don't support the `-P` flag.
- **Fix:** Use `spawnSync("man", [command], { env: { ...process.env, PAGER: "cat" } })` instead.
- **Effort:** 10 min

### 5.5 Document `shell: true` risk in clipboard command

- **File:** `src/core/output.ts:43-47`
- **Problem:** `spawnSync(command, { shell: true })` with a user-configured `clipboardCommand` uses shell evaluation. While this is user-controlled config, it's worth documenting.
- **Fix:** Add a code comment explaining the `shell: true` rationale (needed to support commands like `xclip -selection clipboard` as a single string). Optionally, try splitting by spaces and using `shell: false` first, falling back to `shell: true`.
- **Effort:** 10 min

---

## Execution Order

```
Phase 1 (Bugs)          ~25 min   -- Do first, smallest risk, highest correctness impact
Phase 2 (Dead Code)     ~10 min   -- Quick wins, reduces noise before refactoring
Phase 3 (Decompose)     ~4-5 hrs  -- Largest change, do in a focused session
Phase 4 (Simplify)      ~1 hr     -- Clean up after decomposition
Phase 5 (Harden)        ~1.5 hrs  -- Polish and robustness
                        -----------
Total estimated:        ~7-8 hrs
```

Phases 1 and 2 can be done in a single commit. Phase 3 should be its own commit (or series of commits per sub-step). Phases 4 and 5 can be individual commits or batched.

---

## Out of Scope (Noted for Future)

These items were identified during review but excluded from this plan per scoping decisions:

- **Testing:** No new test files (annotatedRenderer, cache, components). Existing test coverage gaps are documented in the review.
- **CI/CD:** No GitHub Actions workflow. Tests are run manually via `bun test`.
- **Config memoization in components:** `getKeybindings()`, `getThemeColorFor()` called on every render in components without `useMemo`. Low-impact since config is static during a session.
- **`structuredClone` in `getConfigSnapshot()`:** Defensive cloning on every call. Could be replaced with a frozen reference, but the current approach is safe.
