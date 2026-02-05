// src/commands/explain.ts
import { explain as explainCommand } from "../core";
import { logDebug } from "../core/logger";
import { emitOutput, type OutputChannel } from "../core/output";

/**
 * Handles the 'explain' command by calling the AI service.
 * Renders a non-interfering hint at the bottom of the terminal.
 * @param line The current READLINE_LINE content.
 * @param point The current READLINE_POINT (cursor position).
 */
export interface ExplainOptions {
	output: OutputChannel;
}

export async function explain(
	line: string,
	point: string,
	{ output }: ExplainOptions,
) {
	logDebug(`command:explain line="${line}" point=${point}`);

	const explanation = await explainCommand(line);
	if (explanation === null) {
		logDebug("command:explain result=null");
		return;
	}
	logDebug("command:explain hint ready");
	emitOutput({
		channel: output,
		text: explanation,
		promptPrefix: "[scute] ",
	});
	logDebug("command:explain output written");
}
