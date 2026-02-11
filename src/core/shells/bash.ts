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

const BASH_HELPERS = `
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

const BASH_ACTION_FUNCTIONS: Record<ShellKeybindingAction, string> = {
	explain: "_scute_explain",
	build: "_scute_build",
	suggest: "_scute_suggest",
	generate: "_scute_generate",
	choose: "_scute_choose",
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
	getInitScript: (bindings) => getBashInitScript(bindings),
};
