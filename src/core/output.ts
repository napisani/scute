import { spawnSync } from "node:child_process";
import { getConfigSnapshot } from "../config";
import { logDebug } from "./logger";

/**
 * Candidate clipboard commands in priority order per platform.
 * Each entry is the full shell command string (may include arguments).
 * The first binary token is checked for existence via `which`.
 */
const CLIPBOARD_CANDIDATES: { platform: string; command: string }[] = [
	{ platform: "darwin", command: "pbcopy" },
	{ platform: "linux", command: "xclip -selection clipboard" },
	{ platform: "linux", command: "xsel --clipboard --input" },
	{ platform: "linux", command: "wl-copy" },
];

/**
 * Cache for auto-detected clipboard command so we only probe once.
 * `undefined` = not yet probed, `null` = probed but nothing found.
 */
let autoDetectedCommand: string | null | undefined;

/**
 * Detect a clipboard command by checking which well-known clipboard
 * binaries are available on the current system.
 *
 * Returns the full command string (e.g. "xclip -selection clipboard")
 * or `null` if none were found.
 */
export function detectClipboardCommand(): string | null {
	const platform = process.platform;
	for (const candidate of CLIPBOARD_CANDIDATES) {
		if (candidate.platform !== platform) {
			continue;
		}
		const binary = candidate.command.split(" ")[0] ?? candidate.command;
		const probe = spawnSync("which", [binary], {
			encoding: "utf8",
			timeout: 2000,
		});
		if (probe.status === 0) {
			return candidate.command;
		}
	}
	return null;
}

/**
 * Resolve the effective clipboard command from the config value.
 *
 * - `undefined` / empty → no clipboard
 * - `"auto"` → probe the system (cached after first call)
 * - anything else → use as-is
 */
export function resolveClipboardCommand(
	configured: string | undefined,
): string | null {
	if (!configured) {
		return null;
	}
	if (configured === "auto") {
		if (autoDetectedCommand === undefined) {
			autoDetectedCommand = detectClipboardCommand();
			if (autoDetectedCommand) {
				logDebug(
					`clipboardCommand "auto" resolved to "${autoDetectedCommand}"`,
				);
			} else {
				logDebug(
					'clipboardCommand "auto" could not find a clipboard binary on PATH',
				);
			}
		}
		return autoDetectedCommand;
	}
	return configured;
}

/** Reset the auto-detection cache (for testing). */
export function resetClipboardDetectionCache(): void {
	autoDetectedCommand = undefined;
}

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
	const command = resolveClipboardCommand(getConfigSnapshot().clipboardCommand);
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
	} else {
		process.stderr.write("(Copied to clipboard!)\n");
	}
}
