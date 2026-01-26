// src/shells/bash.ts

// This script is meant to be evaluated in a user's .bashrc.
// It defines functions that call the 'brash' executable and binds them to keyboard shortcuts.
export const BASH_SCRIPT = `
# --- brash integration ---

# This function is called when the user wants a command completion.
# It calls 'brash suggest' with the current command line content.
# The output from 'brash' replaces the current command line.
_brash_suggest() {
    local COMPLETED_COMMAND
    COMPLETED_COMMAND=$(/Users/nick/code/brash/brash suggest "$READLINE_LINE")
    READLINE_LINE="$COMPLETED_COMMAND"
    READLINE_POINT=\${#COMPLETED_COMMAND}
}

# This function is called when the user wants to generate a command from a prompt.
# It calls 'brash suggest-prompt' and replaces the line with the result.
_brash_suggest_prompt() {
    local COMPLETED_COMMAND
    # We pass the current line in case it's useful context for the future
    COMPLETED_COMMAND=$(/Users/nick/code/brash/brash suggest-prompt "$READLINE_LINE")
    READLINE_LINE="$COMPLETED_COMMAND"
    READLINE_POINT=\${#COMPLETED_COMMAND}
}

# This function is called to explain the current command.
# It calls 'brash explain', which will render a non-interfering
# hint in the terminal.
_brash_explain() {
    # 'brash explain' handles all terminal drawing and cursor restoration.
    /Users/nick/code/brash/brash explain "$READLINE_LINE" "$READLINE_POINT"
}

# Bind the functions to key combinations.
# Ctrl+G -> Suggest completion
# Ctrl+P -> Suggest from prompt
# Ctrl+E -> Explain command
bind -x '"\\C-g": _brash_suggest'
bind -x '"\\C-p": _brash_suggest_prompt'
bind -x '"\\C-e": _brash_explain'

# --- end brash integration ---
`;
