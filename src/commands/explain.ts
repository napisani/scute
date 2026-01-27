// src/commands/explain.ts
import chalk from "chalk";
import { explain as explainCommand } from "../core/ai.service";
import { logDebug } from "../core/logger";

/**
 * Handles the 'explain' command by calling the AI service.
 * Renders a non-interfering hint at the bottom of the terminal.
 * @param line The current READLINE_LINE content.
 * @param point The current READLINE_POINT (cursor position).
 */
export const explain = async (line: string, point: string) => {
	const terminalHeight = process.stdout.rows;
	logDebug(`command:explain line="${line}" point=${point}`);

	const explanation = await explainCommand(line);
	const hint = `[brash] ${explanation}`;
	logDebug("command:explain hint ready");

	// Fallback for environments where terminal height is not available.
	if (!terminalHeight) {
		console.error(`\n${hint}`);
		return;
	}

	// ANSI escape codes
	const saveCursor = "\x1b[s";
	const restoreCursor = "\x1b[u";
	const moveToBottom = `\x1b[${terminalHeight};1H`;
	const clearLine = "\x1b[2K";

	const output = [
		saveCursor,
		moveToBottom,
		clearLine,
		chalk.gray(hint),
		restoreCursor,
	].join("");

	process.stdout.write(output);
	logDebug("command:explain output written");
};
