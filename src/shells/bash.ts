// src/shells/bash.ts

// This script is meant to be evaluated in a user's .bashrc.
// It defines functions that call the 'scute' executable and binds them to keyboard shortcuts.
export const BASH_SCRIPT = `
# --- scute integration ---

if [ -z "\${SCUTE_BIN:-}" ]; then
    if command -v scute >/dev/null 2>&1; then
        SCUTE_BIN="$(command -v scute)"
    else
        SCUTE_BIN="scute"
    fi
fi

# This function is called when the user wants a command completion.
# It calls 'scute suggest' with the current command line content.
# The output from 'scute' replaces the current command line.
_scute_suggest() {
    local COMPLETED_COMMAND
    COMPLETED_COMMAND="$("$SCUTE_BIN" suggest "$READLINE_LINE")"
    READLINE_LINE="$COMPLETED_COMMAND"
    READLINE_POINT=\${#COMPLETED_COMMAND}
}

# This function is called when the user wants to generate a command from a prompt.
# It calls 'scute suggest-prompt' and replaces the line with the result.
_scute_suggest_prompt() {
    local COMPLETED_COMMAND
    # We pass the current line in case it's useful context for the future
    COMPLETED_COMMAND="$("$SCUTE_BIN" suggest-prompt "$READLINE_LINE")"
    READLINE_LINE="$COMPLETED_COMMAND"
    READLINE_POINT=\${#COMPLETED_COMMAND}
}

# This function is called to explain the current command.
# It calls 'scute explain', which will render a non-interfering
# hint in the terminal.
_scute_explain() {
    # 'scute explain' handles all terminal drawing and cursor restoration.
    "$SCUTE_BIN" explain "$READLINE_LINE" "$READLINE_POINT"
}

# Bind the functions to key combinations.
# Ctrl+G -> Suggest completion
# Ctrl+P -> Suggest from prompt
# Ctrl+E -> Explain command
bind -x '"\\C-g": _scute_suggest'
bind -x '"\\C-p": _scute_suggest_prompt'
bind -x '"\\C-e": _scute_explain'

# --- end scute integration ---
`;
