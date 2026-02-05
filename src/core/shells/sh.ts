import { getReadlineLine } from "../../config";
import {
	joinTokensCommon,
	parseCommand,
	type ShellHelper,
	tokenizeWithShellQuote,
} from "./common";

export const SH_INIT_SCRIPT = `
# --- scute integration ---

if [ -z "\${SCUTE_BIN:-}" ]; then
    if command -v scute >/dev/null 2>&1; then
        SCUTE_BIN="$(command -v scute)"
    else
        SCUTE_BIN="scute"
    fi
fi

_scute_explain() {
    "$SCUTE_BIN" explain "$READLINE_LINE" "$READLINE_POINT" --output prompt
}

_scute_build() {
    "$SCUTE_BIN" build --output clipboard "$READLINE_LINE"
}

_scute_suggest() {
    local COMPLETED_COMMAND
    COMPLETED_COMMAND="$($SCUTE_BIN suggest "$READLINE_LINE" --output readline)"
    READLINE_LINE="$COMPLETED_COMMAND"
    READLINE_POINT=\${#COMPLETED_COMMAND}
}

bind -x '"\\C-e": _scute_explain'
bind -x '"\\C-g": _scute_build'
bind -x '"\\C-E": _scute_suggest'

# --- end scute integration ---
`;

function normalizeReadlineText(text: string): string {
	// Remove trailing newlines (both \n and \r\n) and whitespace
	return text.replace(/\r?\n+$/, "").trimEnd();
}

export const shShellHelper: ShellHelper = {
	shell: "sh",
	tokenizeInput: tokenizeWithShellQuote,
	parseCommand,
	joinTokens: joinTokensCommon,
	getReadlineLine: () => {
		return getReadlineLine() ?? null;
	},
	getInitScript: () => SH_INIT_SCRIPT,
	outputToReadline: (text: string): void => {
		// Standard sh uses READLINE_LINE (when readline is available)
		// Use ANSI sequences to clear the current line and replace it
		const normalizedText = normalizeReadlineText(text);
		const clearLine = "\x1b[2K"; // Clear entire line
		const carriageReturn = "\r"; // Move cursor to beginning of line
		process.stdout.write(`${carriageReturn}${clearLine}${normalizedText}`);
	},
};
