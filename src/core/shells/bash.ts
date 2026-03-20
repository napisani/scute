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
	toReadlineSequence,
} from "./keybindings";

const BASH_HELPERS = `
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
    SCUTE_OUTPUT_FILE="$tmpfile" "$SCUTE_BIN" build "$READLINE_LINE"
    if [ -f "$tmpfile" ]; then
        READLINE_LINE=$(< "$tmpfile")
        READLINE_POINT=\${#READLINE_LINE}
        rm -f "$tmpfile"
    fi
}

# --- end scute integration ---
`;

const BASH_ACTION_FUNCTIONS: Record<ShellKeybindingAction, string> = {
	build: "_scute_build",
};

function renderBashKeybindings(bindings: ShellKeybindings): string {
	const lines: string[] = [];
	const usedSequences = new Map<string, ShellKeybindingAction>();
	for (const action of ShellKeybindingActions) {
		const shortcuts = bindings[action];
		if (!shortcuts.length) {
			continue;
		}
		const handler = BASH_ACTION_FUNCTIONS[action];
		for (const shortcut of shortcuts) {
			const parsed = parseKeybinding(shortcut);
			if (!parsed) {
				logDebug(
					`init:bash:invalidKeybinding action=${action} value="${shortcut}"`,
				);
				continue;
			}
			const sequence = toReadlineSequence(parsed);
			if (!sequence) {
				logDebug(
					`init:bash:unsupportedKeybinding action=${action} value="${shortcut}"`,
				);
				continue;
			}
			const existingAction = usedSequences.get(sequence);
			if (existingAction) {
				logDebug(
					`init:bash:duplicateKeybinding action=${action} value="${shortcut}" sequence="${sequence}" existing=${existingAction}`,
				);
				continue;
			}
			usedSequences.set(sequence, action);
			lines.push(`bind -x '"${sequence}": ${handler}'`);
		}
	}
	if (!lines.length) {
		return "";
	}
	return `\n# Keybindings\n${lines.join("\n")}\n`;
}

function getBashInitScript(bindings: ShellKeybindings): string {
	return `${BASH_HELPERS}${renderBashKeybindings(bindings)}`;
}

export const bashShellHelper: ShellHelper = {
	shell: "bash",
	tokenizeInput: tokenizeWithShellQuote,
	parseCommand,
	joinTokens: joinTokensCommon,
	getReadlineLine: () => {
		return getReadlineLine() ?? null;
	},
	getHistoryFilePath: () => getDefaultHistoryFilePath(".bash_history"),
	getInitScript: (bindings) => getBashInitScript(bindings),
};
