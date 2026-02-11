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

_scute_explain() {
    "$SCUTE_BIN" explain "$READLINE_LINE" "$READLINE_POINT"
}

_scute_build() {
    "$SCUTE_BIN" build "$READLINE_LINE"
}

_scute_suggest() {
    local COMPLETED_COMMAND
    COMPLETED_COMMAND="$("$SCUTE_BIN" suggest "$READLINE_LINE")"
    READLINE_LINE="$COMPLETED_COMMAND"
    READLINE_POINT=\${#COMPLETED_COMMAND}
}

_scute_generate() {
    local COMPLETED_COMMAND
    COMPLETED_COMMAND="$("$SCUTE_BIN" generate)"
    READLINE_LINE="$COMPLETED_COMMAND"
    READLINE_POINT=\${#COMPLETED_COMMAND}
}

_scute_choose() {
    local RESULT
    RESULT="$("$SCUTE_BIN" choose "$READLINE_LINE" "$READLINE_POINT")"
    local RC=$?
    if [ $RC -eq 10 ]; then
        "$SCUTE_BIN" build "$READLINE_LINE"
    elif [ -n "$RESULT" ]; then
        READLINE_LINE="$RESULT"
        READLINE_POINT=\${#RESULT}
    fi
}

# --- end scute integration ---
`;

const SH_ACTION_FUNCTIONS: Record<ShellKeybindingAction, string> = {
	explain: "_scute_explain",
	build: "_scute_build",
	suggest: "_scute_suggest",
	generate: "_scute_generate",
	choose: "_scute_choose",
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
	return `\n# Keybindings\n${lines.join("\n")}\n`;
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
	getInitScript: (bindings) => getShInitScript(bindings),
};
