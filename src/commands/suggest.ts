// src/commands/suggest.ts
import { suggest as suggestCommand } from "../core";
import { logDebug } from "../core/logger";

/**
 * Handles the 'suggest' command by calling the AI service.
 * @param line The current text from the READLINE_LINE environment variable.
 */
export async function suggest(line: string) {
	logDebug(`command:suggest line="${line}"`);
	const suggestion = await suggestCommand(line);
	logDebug(`command:suggest result="${suggestion}"`);
	process.stdout.write(suggestion);
}
