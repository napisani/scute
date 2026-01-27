// src/commands/suggest-prompt.ts
import { generateCommandFromPrompt } from "../core/ai.service";
import { logDebug } from "../core/logger";

/**
 * Handles the 'suggest-prompt' command using the AI service.
 * @param line The current text from the READLINE_LINE environment variable.
 */
export const suggestPrompt = async (line: string) => {
	logDebug(`command:suggest-prompt line="${line}"`);
	const result = await generateCommandFromPrompt(line);
	logDebug(`command:suggest-prompt result="${result}"`);
	process.stdout.write(result);
};
