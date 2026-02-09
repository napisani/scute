# Editor Experience (Vim-Like Modes)

This document specifies the current editor experience behavior as implemented in the Vim-like hooks. It is intended to be complete enough to re-implement the feature from scratch or to rework the behavior and tests.

Scope:
- Vim-style mode switching and token-level editing.
- View mode toggles and token selection navigation.
- Input handling rules and how edits propagate to command text.

Primary references:
- src/hooks/useVimMode.ts
- src/hooks/useNormalMode.ts
- src/hooks/useInsertMode.ts
- src/hooks/useViewMode.ts
- tests/hooks/useVimMode.test.ts

## Concepts

**Tokens**
- The editor operates on a list of parsed tokens (`ParsedToken[]`).
- The selected token index is the unit of editing and navigation.

**Modes**
- `normal`: navigation and commands (no text insertion).
- `insert`: text editing inside the currently selected token.

**View modes**
- `list`: token list view with vertical selection.
- `annotated`: token list view with horizontal navigation and extra commands.
- Default view mode is `annotated` (horizontal), derived from config.

## Keybindings

Keybindings are resolved via `getNormalKeybindings()`, `getLeaderKeybindings()`, and `getLeaderKey()` with defaults defined in `src/config/index.ts`.

Normal keybindings:
- `up`: `up`
- `down`: `down`
- `left`: `left`, `h`
- `right`: `right`, `l`
- `wordForward`: `w`
- `wordBackward`: `b`
- `lineStart`: `0`, `^`
- `lineEnd`: `$`
- `firstToken`: `g`
- `lastToken`: `G`
- `appendLine`: `A`
- `insert`: `i`
- `append`: `a`
- `change`: `c`
- `exitInsert`: `escape`
- `save`: `return`

Leader keybindings:
- `leaderKey`: `space`
- `toggleView`: `m`
- `explain`: `e`
- `quit`: `q`
- `outputClipboard`: `y`
- `outputReadline`: `r`
- `outputStdout`: `return`
- `outputPrompt`: `p`

Notes:
- `useNormalMode` and `useViewMode` provide fallback defaults for certain actions if config is missing (e.g., `i`, `a`, `c`, `v`), but the canonical defaults come from the config getters.
- `useVimMode` relies entirely on configured keybindings; it does not provide fallbacks.
- `explain`, `toggleView`, and output actions are invoked via leader mode (`leaderKey` + keybinding value).
- In `useVimMode` normal mode, key matching uses a normalized key ID: `key.sequence` if present, otherwise `key.name`, with single-letter keys uppercased when `shift` is true. This ensures bindings like `G` work even when the event reports `name: "g"` and `shift: true`.

Configuration:
- Root config field `viewMode` controls initial view layout:
  - `horizontal` => `annotated`
  - `vertical` => `list`

## Mode State and Lifecycle

### useVimMode (main implementation)

State managed:
- `mode`: `normal` or `insert`.
- `selectedIndex`: current token selection index.
- `viewMode`: `list` or `annotated`.
- `editingTokenIndex`: token being edited (or `null`).
- `editingValue`: current edit buffer contents.
- `cursorPosition`: cursor index within `editingValue`.

Reset behavior:
- When the token list changes (detected via token values), the editor resets to:
  - `mode: normal`
  - `selectedIndex: 0`
  - `editingTokenIndex: null`
  - `editingValue: ""`, `cursorPosition: 0`
  - `gPressed` state cleared
  - input-trigger skip state cleared
- The `viewMode` is **not** reset when tokens change (tests assert it persists).

### useNormalMode (minimal normal-mode implementation)

State managed:
- `selectedIndex`
- `viewMode`

Behavior:
- Handles up/down navigation, leader-based view toggle and explain, and entry into insert/append/change.
- No special handling for modifiers, `gg`, or annotated-mode horizontal navigation.

### useInsertMode (minimal insert-mode implementation)

State managed:
- `editingValue`
- `cursorPosition`
- `originalValue` (captured from initial value on first render)

Behavior:
- Handles text insertion, cursor movement (left/right), backspace, delete, save/exit.
- No modifier filtering, no special trigger-skipping, no home/end handling.

### useViewMode (standalone view toggle)

State managed:
- `viewMode`

Behavior:
- Toggles `list` <-> `annotated` on the configured `toggleView` key.

## Normal Mode Behavior (useVimMode)

### Global rules
- Modifier keys (`ctrl`, `meta`, `option`, `alt`) are ignored in normal mode (no state changes). `shift` is not treated as a modifier for ignore purposes; it is used to normalize `keyId` for uppercase bindings.
- All normal-mode commands are ignored when `mode !== normal`.
- Leader mode:
- Pressing `leaderKey` arms the next key as a leader sequence.
- `leaderKey` then `toggleView` or `explain` triggers the respective action.
- `leaderKey` then output actions (`outputClipboard`, `outputReadline`, `outputStdout`, `outputPrompt`) select an output channel and exit.
- `leaderKey` then `quit` exits without emitting output.
- Any other key or `escape` cancels leader mode and returns to normal.

### View mode toggle
- `toggleView` flips `viewMode` between `list` and `annotated`.
- `toggleView` is triggered via leader mode (`leaderKey` then `toggleView`).

### Explain action
- `explain` calls `loadDescriptions()`; no other state changes.
- `explain` is triggered via leader mode (`leaderKey` then `explain`).

### Output selection (build)
- Output channels are chosen via leader mode (`leaderKey` then output action).
- `leaderKey` + `outputStdout` submits the command and exits.
- `leaderKey` + `quit` exits without emitting output.

### Insert/Append/Change
- `insert`:
  - Enters insert mode at cursor position `0` of the selected token.
  - Uses the current token value as the initial buffer.
  - The triggering key is not inserted into the buffer.
- `append`:
  - Enters insert mode at cursor position `1` of the selected token.
  - Uses the current token value as the initial buffer.
  - The triggering key is not inserted into the buffer.
- `change`:
  - Enters insert mode at cursor position `0` with an empty buffer.
  - The triggering key is not inserted into the buffer.

Implementation detail:
- `useVimMode` tracks the key that triggered insert (`i`, `a`, or `c`) and skips the next matching character so the command key does not appear in the edit buffer.

### Token selection movement

**In `list` view:**
- `up` or `k`: move selection up (index - 1).
- `down` or `j`: move selection down (index + 1).
- `g` followed by `g` within 500ms: jump to first token (`selectedIndex = 0`).
- `lastToken` (`G` by default): jump to last token index.
- Selection movement is bounded to `[0, tokenCount - 1]`.
- If there are no tokens, movement commands do nothing.

**In `annotated` view:**
- `left`: move selection left (index - 1).
- `right`: move selection right (index + 1).
- `wordBackward` (`b`): move selection left (index - 1).
- `wordForward` (`w`): move selection right (index + 1).
- `lineStart` (`0`/`^`): jump to index `0`.
- `lineEnd` (`$`): jump to last index.
- `lastToken` (`G` by default): jump to last token index.
- `appendLine` (`A` by default):
  - Only active in `annotated` view.
  - Selects the last token and enters insert mode at the end of that token.

## Insert Mode Behavior (useVimMode)

### Global rules
- Modifier keys (`ctrl`, `meta`, `option`, `alt`) are ignored in insert mode (no edits).
- If the key was the insert trigger (`i`, `a`, `c`), the first matching keypress is skipped.

### Exit behavior
- `exitInsert` (Esc): exit insert mode without saving.
- `save` (Enter): exit insert mode and save.

Save rule:
- The edit is only committed when `save` is pressed **and** the buffer length is greater than zero.
- Saved edits call `onTokenEdit(editingTokenIndex, editingValue)`.
- After exit (save or discard), editing state resets and mode becomes `normal`.

### Cursor movement
- `left` and `right` move within `[0, editingValue.length]`.
- `home` moves cursor to `0`.
- `end` moves cursor to `editingValue.length`.

### Text input
- Accepts only printable ASCII characters (`" "` to `"~"`).
- Inserts the character at the current cursor position.
- Advances cursor by 1.

### Deletion
- `backspace` or backspace control chars (`\u0008`, `\u007f`):
  - Removes the character to the left of the cursor.
  - Moves cursor left by 1.
  - No-op if cursor is at start.
- `delete`:
  - Removes the character at the cursor.
  - Cursor remains in place.
  - No-op if cursor is at end.

## Impact on Command Text

The editor does not mutate the full command string directly. Instead:
- Edits are scoped to a single token (`editingTokenIndex`).
- `onTokenEdit` is the only commit path for modifications.
- The parent component is responsible for applying the edited token back into the overall command.
- `change` clears a token and replaces it with the new buffer content; `insert` and `append` keep the original token contents and insert new characters at the cursor position.

## Behavior Confirmed by Tests

The tests in `tests/hooks/useVimMode.test.ts` assert the following:
- Initial state is `normal` mode with `selectedIndex = 0`.
- `j`/`k` move selection within bounds.
- `leaderKey` + `m` toggles view mode to `annotated`.
- `c` enters insert mode with empty buffer at cursor `0`.
- Text input inserts and advances cursor.
- Backspace deletes and moves cursor.
- `Enter` saves and exits; `Escape` discards and exits.
- `i` and `a` enter insert mode with the existing token value.
- `i` does not insert the triggering key into the buffer.
- `a` starts at cursor position `1` and inserts there (not at end).
- `home` and `end` move cursor to start/end of buffer.
- `A` (append line) only works in `annotated` mode: selects last token and enters insert at end.
- `G` moves to the last token in `annotated` mode.
- `leaderKey` + `e` calls `loadDescriptions()`; no other state changes.
- Modifiers (e.g., `ctrl`) are ignored in both normal and insert modes.
- Changing tokens resets editor state but preserves view mode.

## Implementation Notes

Logging:
- `useVimMode` uses `logTrace` extensively to trace state transitions and input handling. This is diagnostic only and does not affect behavior.

Testing strategy:
- Tests inject a mock `useKeyboard` to capture handlers and simulate keypresses.
- The hook registers two handlers (normal and insert); tests call both on each simulated key to mirror the runtime behavior.

## Non-Goals / Not Implemented

- No visual cursor rendering or highlighting defined here.
- No multi-token edits, yanks, deletes, or Vim command chains beyond `gg`.
- No explicit handling of multi-key sequences beyond `gg` and insert-trigger skipping.
- `useNormalMode`/`useInsertMode` are simpler building blocks; only `useVimMode` matches the full behavior described above.
