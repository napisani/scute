import { getReadlineLine } from "../../config";
import type { ShellKeybindingAction } from "../../config/schema";
import { ShellKeybindingActions } from "../../config/schema";
import { logDebug } from "../logger";
import {
	getDefaultHistoryFilePath,
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

_scute_build() {
    local tmpfile=$(mktemp /tmp/scute-output.XXXXXX) || return
    SCUTE_OUTPUT_FILE="$tmpfile" "$SCUTE_BIN" build "$BUFFER"
    if [ -f "$tmpfile" ]; then
        BUFFER=$(<"$tmpfile")
        CURSOR=\${#BUFFER}
        rm -f "$tmpfile"
    fi
    zle redisplay
}

zle -N scute-build _scute_build

# --- end scute integration ---
`;

const ZSH_ACTION_WIDGETS: Record<ShellKeybindingAction, string> = {
	build: "scute-build",
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

export const zshShellHelper: ShellHelper = {
	shell: "zsh",
	tokenizeInput: tokenizeWithShellQuote,
	parseCommand,
	joinTokens: joinTokensCommon,
	getReadlineLine: () => {
		return getReadlineLine() ?? null;
	},
	getHistoryFilePath: () => getDefaultHistoryFilePath(".zsh_history"),
	getInitScript: (bindings) => getZshInitScript(bindings),
};
