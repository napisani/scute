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

const SH_HELPERS = `
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
        READLINE_LINE=$(cat "$tmpfile")
        READLINE_POINT=\${#READLINE_LINE}
        rm -f "$tmpfile"
    fi
}

# --- end scute integration ---
`;

const SH_ACTION_FUNCTIONS: Record<ShellKeybindingAction, string> = {
	build: "_scute_build",
};

function renderShKeybindings(bindings: ShellKeybindings): string {
	const lines: string[] = [];
	for (const action of ShellKeybindingActions) {
		const shortcuts = bindings[action];
		if (!shortcuts.length) {
			continue;
		}
		const handler = SH_ACTION_FUNCTIONS[action];
		for (const shortcut of shortcuts) {
			const parsed = parseKeybinding(shortcut);
			if (!parsed) {
				logDebug(
					`init:sh:invalidKeybinding action=${action} value="${shortcut}"`,
				);
				continue;
			}
			const sequence = toReadlineSequence(parsed);
			if (!sequence) {
				logDebug(
					`init:sh:unsupportedKeybinding action=${action} value="${shortcut}"`,
				);
				continue;
			}
			lines.push(`bind -x '"${sequence}": ${handler}'`);
		}
	}
	if (!lines.length) {
		return "";
	}
	const indentedLines = lines.map((line) => `    ${line}`).join("\n");
	return `\n# Keybindings\nif [ -t 0 ] && command -v bind >/dev/null 2>&1 && bind -v >/dev/null 2>&1; then\n${indentedLines}\nfi\n`;
}

function getShInitScript(bindings: ShellKeybindings): string {
	return `${SH_HELPERS}${renderShKeybindings(bindings)}`;
}

export const shShellHelper: ShellHelper = {
	shell: "sh",
	tokenizeInput: tokenizeWithShellQuote,
	parseCommand,
	joinTokens: joinTokensCommon,
	getReadlineLine: () => {
		return getReadlineLine() ?? null;
	},
	getHistoryFilePath: () => getDefaultHistoryFilePath(".sh_history"),
	getInitScript: (bindings) => getShInitScript(bindings),
};
