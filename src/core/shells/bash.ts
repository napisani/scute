import { getReadlineLine } from "../../config";
import {
	joinTokensCommon,
	parseCommand,
	type ShellHelper,
	tokenizeWithShellQuote,
} from "./common";

export const BASH_INIT_SCRIPT = `
# --- scute integration ---

if [ -z "\${SCUTE_BIN:-}" ]; then
    if command -v scute >/dev/null 2>&1; then
        SCUTE_BIN="$(command -v scute)"
    else
        SCUTE_BIN="scute"
    fi
fi

# Explain current command (prompt output)
_scute_explain() {
    "$SCUTE_BIN" explain "$READLINE_LINE" "$READLINE_POINT" --output prompt
}

# Build current command (clipboard output)
_scute_build() {
    "$SCUTE_BIN" build --output clipboard "$READLINE_LINE"
}

# Suggest replacement for current line
_scute_suggest() {
    local COMPLETED_COMMAND
    COMPLETED_COMMAND="$($SCUTE_BIN suggest "$READLINE_LINE" --output readline)"
    READLINE_LINE="$COMPLETED_COMMAND"
    READLINE_POINT=\${#COMPLETED_COMMAND}
}

# Bind the functions to key combinations.
# Ctrl+E -> Explain (prompt output)
# Ctrl+G -> Build (clipboard output)
# Ctrl+Shift+E -> Suggest (replace readline buffer)
bind -x '"\\C-e": _scute_explain'
bind -x '"\\C-g": _scute_build'
bind -x '"\\C-E": _scute_suggest'

# --- end scute integration ---
`;

export const bashShellHelper: ShellHelper = {
	shell: "bash",
	tokenizeInput: tokenizeWithShellQuote,
	parseCommand,
	joinTokens: joinTokensCommon,
	getReadlineLine: () => {
		return getReadlineLine() ?? null;
	},
	getInitScript: () => BASH_INIT_SCRIPT,
};
