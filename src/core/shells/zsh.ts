import { getReadlineLine } from "../../config";
import type { ShellKeybindingAction } from "../../config/schema";
import { ShellKeybindingActions } from "../../config/schema";
import { logDebug } from "../logger";
import {
	joinTokensCommon,
	parseCommand,
	type ShellHelper,
	tokenizeWithShellQuote,
} from "./common";
import {
	parseKeybinding,
	type ShellKeybindings,
	toZshSequence,
} from "./keybindings";

const ZSH_HELPERS = `
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
    COMPLETED_COMMAND="$("$SCUTE_BIN" suggest "$BUFFER" --output readline)"
    BUFFER="$COMPLETED_COMMAND"
    CURSOR=\${#BUFFER}
    zle redisplay
}

_scute_generate() {
    "$SCUTE_BIN" generate --output readline
    zle redisplay
}

zle -N scute-explain _scute_explain
zle -N scute-build _scute_build
zle -N scute-suggest _scute_suggest
zle -N scute-generate _scute_generate

# --- end scute integration ---
`;

const ZSH_ACTION_WIDGETS: Record<ShellKeybindingAction, string> = {
	explain: "scute-explain",
	build: "scute-build",
	suggest: "scute-suggest",
	generate: "scute-generate",
};

function renderZshKeybindings(bindings: ShellKeybindings): string {
	const lines: string[] = [];
	const usedSequences = new Map<string, ShellKeybindingAction>();
	for (const action of ShellKeybindingActions) {
		const shortcuts = bindings[action];
		if (!shortcuts.length) {
			continue;
		}
		const widget = ZSH_ACTION_WIDGETS[action];
		for (const shortcut of shortcuts) {
			const parsed = parseKeybinding(shortcut);
			if (!parsed) {
				logDebug(
					`init:zsh:invalidKeybinding action=${action} value="${shortcut}"`,
				);
				continue;
			}
			const sequence = toZshSequence(parsed);
			if (!sequence) {
				logDebug(
					`init:zsh:unsupportedKeybinding action=${action} value="${shortcut}"`,
				);
				continue;
			}
			const existingAction = usedSequences.get(sequence);
			if (existingAction) {
				logDebug(
					`init:zsh:duplicateKeybinding action=${action} value="${shortcut}" sequence="${sequence}" existing=${existingAction}`,
				);
				continue;
			}
			usedSequences.set(sequence, action);
			lines.push(`bindkey '${sequence}' ${widget}`);
		}
	}
	if (!lines.length) {
		return "";
	}
	return `\n# Keybindings\n${lines.join("\n")}\n`;
}

function getZshInitScript(bindings: ShellKeybindings): string {
	return `${ZSH_HELPERS}${renderZshKeybindings(bindings)}`;
}

function normalizeReadlineText(text: string): string {
	// Remove trailing newlines (both \n and \r\n) and whitespace
	return text.replace(/\r?\n+$/, "").trimEnd();
}

export const zshShellHelper: ShellHelper = {
	shell: "zsh",
	tokenizeInput: tokenizeWithShellQuote,
	parseCommand,
	joinTokens: joinTokensCommon,
	getReadlineLine: () => {
		return getReadlineLine() ?? null;
	},
	getInitScript: (bindings) => getZshInitScript(bindings),
	outputToReadline: (text: string): void => {
		// Zsh uses BUFFER for the current input line
		// Use ANSI sequences to clear the current line and replace it
		const normalizedText = normalizeReadlineText(text);
		const clearLine = "\x1b[2K"; // Clear entire line
		const carriageReturn = "\r"; // Move cursor to beginning of line
		process.stdout.write(`${carriageReturn}${clearLine}${normalizedText}`);
	},
};
