import { type ActionChoice, EXIT_BUILD } from "./types";

/**
 * Dispatch the selected action.
 *
 * All commands write their result to stdout. The shell captures it
 * and assigns to BUFFER/READLINE_LINE.
 *
 * Build needs a real TTY, so we exit with code 10 to signal the
 * shell to re-invoke `scute build` directly.
 */
export async function dispatch(
	action: ActionChoice,
	originalLine: string,
	originalPoint: number,
): Promise<void> {
	switch (action) {
		case "explain": {
			const { explain } = await import("../explain");
			await explain(originalLine, String(originalPoint));
			break;
		}
		case "build": {
			// Output original line so shell preserves BUFFER, then exit 10
			// to signal the shell to re-invoke build with direct TTY access.
			process.stdout.write(originalLine);
			process.exit(EXIT_BUILD);
			break;
		}
		case "suggest": {
			const { suggest } = await import("../suggest");
			await suggest(originalLine);
			break;
		}
		case "generate": {
			const { generate } = await import("../generate");
			await generate([]);
			break;
		}
	}
}
