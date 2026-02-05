import { getReadlineLine } from "../../config";
import {
	joinTokensCommon,
	parseCommand,
	type ShellHelper,
	tokenizeWithShellQuote,
} from "./common";

export const ZSH_INIT_SCRIPT = `
# --- scute integration ---

if [ -z "\${SCUTE_BIN:-}" ]; then
    if command -v scute >/dev/null 2>&1; then
        SCUTE_BIN="$(command -v scute)"
    else
        SCUTE_BIN="scute"
    fi
fi

_scute_explain() {
    "$SCUTE_BIN" explain "$BUFFER" "$CURSOR" --output prompt
    zle redisplay
}

_scute_build() {
    "$SCUTE_BIN" build --output clipboard "$BUFFER"
    zle redisplay
}

_scute_suggest() {
    local COMPLETED_COMMAND
    COMPLETED_COMMAND="$($SCUTE_BIN suggest "$BUFFER" --output readline)"
    BUFFER="$COMPLETED_COMMAND"
    CURSOR=\${#BUFFER}
    zle redisplay
}

zle -N scute-explain _scute_explain
zle -N scute-build _scute_build
zle -N scute-suggest _scute_suggest

# Ctrl+E -> Explain (prompt output)
# Ctrl+G -> Build (clipboard output)
# Ctrl+Shift+E -> Suggest (replace buffer)
bindkey '^e' scute-explain
bindkey '^g' scute-build
bindkey '^E' scute-suggest

# --- end scute integration ---
`;

export const zshShellHelper: ShellHelper = {
	shell: "zsh",
	tokenizeInput: tokenizeWithShellQuote,
	parseCommand,
	joinTokens: joinTokensCommon,
	getReadlineLine: () => {
		return getReadlineLine() ?? null;
	},
	getInitScript: () => ZSH_INIT_SCRIPT,
};
