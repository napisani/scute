import { spawnSync } from "node:child_process";
import { getConfigSnapshot } from "../config";
import { logDebug } from "./logger";

/**
 * Emit output text.
 *
 * Always writes to stdout. If `clipboardCommand` is configured,
 * also copies the text to the system clipboard.
 */
export function emitOutput(text: string): void {
	writeToStdout(text);
	copyToClipboard(text);
}

function writeToStdout(text: string): void {
	const output = text.endsWith("\n") ? text : `${text}\n`;
	process.stdout.write(output);
}

function copyToClipboard(text: string): void {
	const command = getConfigSnapshot().clipboardCommand;
	if (!command) {
		return;
	}
	// shell: true is needed to support multi-word commands like "xclip -selection clipboard"
	// configured via the user's own config file (clipboardCommand)
	const result = spawnSync(command, {
		input: text,
		encoding: "utf8",
		shell: true,
	});
	if (result.error) {
		logDebug(
			`Clipboard command "${command}" failed: ${result.error.message}. Output was already written to stdout.`,
		);
	}
}
