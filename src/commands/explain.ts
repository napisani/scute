// src/commands/explain.ts
import { explain as explainCommand } from "../core";
import { logDebug } from "../core/logger";
import { emitOutput } from "../core/output";

/**
 * Handles the 'explain' command by calling the AI service.
 * @param line The current READLINE_LINE content.
 * @param point The current READLINE_POINT (cursor position).
 */
export async function explain(line: string, point: string) {
	logDebug(`command:explain line="${line}" point=${point}`);

	const explanation = await explainCommand(line);
	if (explanation === null) {
		logDebug("command:explain result=null");
		return;
	}
	logDebug("command:explain hint ready");
	emitOutput(explanation);
	logDebug("command:explain output written");
}
