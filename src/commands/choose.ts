import type { OutputChannel } from "../core/output";
import {
	getReadlineLine,
	hasReadlineLine,
	restoreReadlineState,
} from "../core/shells";

export interface ChooseOptions {
	output: OutputChannel;
}

type ActionChoice =
	| "explain"
	| "build"
	| "suggest"
	| "generate"
	| "config-debug";

interface Choice {
	key: string;
	label: string;
	action: ActionChoice;
}

const CHOICES: Choice[] = [
	{ key: "1", label: "Explain command", action: "explain" },
	{ key: "2", label: "Build/edit command", action: "build" },
	{ key: "3", label: "Suggest completion", action: "suggest" },
	{ key: "4", label: "Generate from prompt", action: "generate" },
	{ key: "5", label: "Config debug", action: "config-debug" },
];

/**
 * Read a single keypress from stdin.
 * Returns the key string and cleans up stdin so the event loop can drain.
 */
function readKeypress(): Promise<string> {
	const stdin = process.stdin;

	if (stdin.isTTY) {
		const wasRaw = stdin.isRaw;
		stdin.setRawMode(true);
		stdin.resume();

		return new Promise<string>((resolve) => {
			stdin.once("data", (data: Buffer) => {
				// Restore original stdin state so event loop can exit
				if (!wasRaw) {
					stdin.setRawMode(false);
				}
				stdin.pause();
				stdin.unref();
				resolve(data.toString());
			});
		});
	}

	// Non-TTY: read until newline
	stdin.resume();
	return new Promise<string>((resolve) => {
		let buffer = "";
		const onData = (data: Buffer) => {
			buffer += data.toString();
			if (buffer.includes("\n")) {
				stdin.removeListener("data", onData);
				stdin.pause();
				stdin.unref();
				resolve(buffer.trim());
			}
		};
		stdin.on("data", onData);
	});
}

/**
 * Clear the menu from the terminal using ANSI escape codes.
 * Moves cursor up and clears each line that was printed.
 */
function clearMenu(): void {
	if (!process.stdout.isTTY) return;

	// Menu layout: blank line, title, N choices, "q. Cancel", blank line, "Select an action: "
	// That's 2 + CHOICES.length + 1 + 1 + 1 = CHOICES.length + 5 lines
	const menuLines = CHOICES.length + 5;
	let seq = "\r\x1b[K"; // Clear current line ("Select an action: " + user's key)
	for (let i = 0; i < menuLines; i++) {
		seq += "\x1b[1A\x1b[K"; // Move up one line and clear it
	}
	process.stdout.write(seq);
}

export async function choose(
	lineArg: string | undefined,
	pointArg: string | undefined,
	{ output }: ChooseOptions,
) {
	// Capture current readline state before showing menu
	const envLine = getReadlineLine();
	const originalLine = lineArg ?? envLine ?? "";
	const hasLine = lineArg !== undefined || hasReadlineLine();
	const parsedPoint = pointArg ? Number(pointArg) : undefined;
	const originalPoint = Number.isFinite(parsedPoint)
		? Math.max(0, parsedPoint as number)
		: originalLine.length;

	// Show menu
	console.log("\n");
	console.log("━━━ Scute Actions ━━━");
	for (const choice of CHOICES) {
		console.log(`  ${choice.key}. ${choice.label}`);
	}
	console.log("  q. Cancel");
	console.log("");

	// Read user input
	process.stdout.write("Select an action: ");
	const selection = await readKeypress();

	// Clear the menu lines
	clearMenu();

	// Handle cancel
	if (selection === "q" || selection === "\x1b" || selection === "\x03") {
		if (hasLine) {
			restoreReadlineState(originalLine, originalPoint);
		}
		return;
	}

	// Find selected action
	const choice = CHOICES.find((c) => c.key === selection);
	if (!choice) {
		// Invalid selection - restore original line
		if (hasLine) {
			restoreReadlineState(originalLine, originalPoint);
		}
		return;
	}

	// Restore the original line before dispatching
	if (hasLine) {
		restoreReadlineState(originalLine, originalPoint);
	}

	// Dispatch to the selected action.
	// build manages its own TUI lifecycle; all others are awaited.
	switch (choice.action) {
		case "explain": {
			const { explain } = await import("./explain");
			await explain(originalLine, String(originalPoint), { output: "prompt" });
			break;
		}
		case "build": {
			const { build } = await import("./build");
			await build([originalLine], {});
			break;
		}
		case "suggest": {
			const { suggest } = await import("./suggest");
			await suggest(originalLine, { output: "readline" });
			break;
		}
		case "generate": {
			const { generate } = await import("./generate");
			await generate([], { output: "readline" });
			break;
		}
		case "config-debug": {
			const { configDebug } = await import("./config-debug");
			configDebug({ output });
			break;
		}
	}
}
