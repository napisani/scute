import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { getConfigSnapshot } from "../config";
import { logDebug } from "./logger";
import { getShellHistoryFilePath } from "./shells";

/**
 * Strips zsh extended-history metadata from a line.
 * Extended format looks like: `: 1234567890:0;actual command`
 */
function stripZshExtendedPrefix(line: string): string {
	const match = line.match(/^: \d+:\d+;(.*)$/);
	return match?.[1] ?? line;
}

function normalizeHistoryLine(line: string): string | null {
	const trimmed = line.trim();
	if (!trimmed.length) {
		return null;
	}
	const withoutZshMeta = stripZshExtendedPrefix(trimmed);
	const withoutNumber = withoutZshMeta.replace(/^\d+\s+/, "");
	return withoutNumber.trim() || null;
}

export function parseHistoryOutput(output: string): string[] {
	return output
		.split(/\r?\n/)
		.map((line) => normalizeHistoryLine(line))
		.filter((line): line is string => Boolean(line && line.length > 0));
}

function fetchHistoryFromFile(): string[] {
	const filePath = getShellHistoryFilePath();
	if (!filePath) {
		logDebug("history: no history file path for current shell");
		return [];
	}
	try {
		const content = readFileSync(filePath, "utf8");
		return parseHistoryOutput(content);
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		logDebug(`history: failed to read ${filePath}: ${message}`);
		return [];
	}
}

function fetchHistoryFromCommand(command: string): string[] {
	const result = spawnSync(command, {
		encoding: "utf8",
		shell: true,
	});
	if (result.error) {
		logDebug(`history: command failed: ${result.error.message}`);
		return [];
	}
	const stdout = result.stdout ?? "";
	return parseHistoryOutput(stdout);
}

export function fetchShellHistory(): string[] {
	const historyCommand = getConfigSnapshot().historyCommand;
	if (historyCommand && historyCommand.trim().length) {
		return fetchHistoryFromCommand(historyCommand);
	}
	return fetchHistoryFromFile();
}
