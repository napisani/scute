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

/** Exit code signaling the shell to re-invoke `scute build` directly. */
const EXIT_BUILD = 10;

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
 * Writes to stderr so it doesn't pollute the stdout captured by $().
 */
function clearMenu(): void {
	if (!process.stderr.isTTY) return;

	// Menu layout: blank line, title, N choices, "q. Cancel", blank line, "Select an action: "
	// That's 2 + CHOICES.length + 1 + 1 + 1 = CHOICES.length + 5 lines
	const menuLines = CHOICES.length + 5;
	let seq = "\r\x1b[K";
	for (let i = 0; i < menuLines; i++) {
		seq += "\x1b[1A\x1b[K";
	}
	process.stderr.write(seq);
}

/**
 * Show menu and read selection. Menu is written to stderr so it doesn't
 * pollute stdout (which the shell captures via $()).
 */
function showMenu(): void {
	process.stderr.write("\n\n");
	process.stderr.write("━━━ Scute Actions ━━━\n");
	for (const choice of CHOICES) {
		process.stderr.write(`  ${choice.key}. ${choice.label}\n`);
	}
	process.stderr.write("  q. Cancel\n");
	process.stderr.write("\n");
	process.stderr.write("Select an action: ");
}

export async function choose(
	lineArg: string | undefined,
	pointArg: string | undefined,
) {
	const originalLine = lineArg ?? "";
	const parsedPoint = pointArg ? Number(pointArg) : undefined;
	const originalPoint = Number.isFinite(parsedPoint)
		? Math.max(0, parsedPoint as number)
		: originalLine.length;

	showMenu();
	const selection = await readKeypress();
	clearMenu();

	// Cancel or invalid — output original line to preserve BUFFER
	if (selection === "q" || selection === "\x1b" || selection === "\x03") {
		process.stdout.write(originalLine);
		return;
	}

	const choice = CHOICES.find((c) => c.key === selection);
	if (!choice) {
		process.stdout.write(originalLine);
		return;
	}

	// Dispatch to the selected action.
	// All commands write their result to stdout. The shell captures it
	// and assigns to BUFFER/READLINE_LINE.
	// Build needs a real TTY, so we exit with code 10 to signal the
	// shell to re-invoke `scute build` directly.
	switch (choice.action) {
		case "explain": {
			const { explain } = await import("./explain");
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
			const { suggest } = await import("./suggest");
			await suggest(originalLine);
			break;
		}
		case "generate": {
			const { generate } = await import("./generate");
			await generate([]);
			break;
		}
		case "config-debug": {
			const { configDebug } = await import("./config-debug");
			configDebug();
			break;
		}
	}
}
