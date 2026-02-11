// src/commands/suggest.ts
import { suggest as suggestCommand } from "../core";
import { logDebug } from "../core/logger";
import { emitOutput } from "../core/output";

/**
 * Handles the 'suggest' command by calling the AI service.
 * @param line The current text from the READLINE_LINE environment variable.
 */
export async function suggest(line: string) {
	logDebug(`command:suggest line="${line}"`);
	const suggestion = await suggestCommand(line);
	if (suggestion === null) {
		logDebug("command:suggest result=null");
		return;
	}
	logDebug(`command:suggest result="${suggestion}"`);
	emitOutput(suggestion);
}
