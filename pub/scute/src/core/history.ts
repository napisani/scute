import { spawnSync } from "node:child_process";
import { closeSync, fstatSync, openSync, readSync } from "node:fs";
import { getConfigSnapshot } from "../config";
import { logDebug } from "./logger";
import { getShellHistoryFilePath } from "./shells";

const MAX_HISTORY_BYTES = 64 * 1024;

/**
 * Strips zsh extended-history metadata from a line.
 * Extended format looks like: `: 1234567890:0;actual command`
 */
function stripZshExtendedPrefix(line: string): string {
	const match = line.match(/^: \d+:\d+;(.*)$/);
	return match?.[1] ?? line;
}

function normalizeFileHistoryLine(line: string): string | null {
	const trimmed = line.trim();
	if (!trimmed.length) {
		return null;
	}
	const withoutZshMeta = stripZshExtendedPrefix(trimmed);
	return withoutZshMeta.trim() || null;
}

function normalizeCommandHistoryLine(line: string): string | null {
	const trimmed = line.trim();
	if (!trimmed.length) {
		return null;
	}
	const withoutZshMeta = stripZshExtendedPrefix(trimmed);
	const withoutNumber = withoutZshMeta.replace(/^\d+\s+/, "");
	return withoutNumber.trim() || null;
}

export function parseHistoryFile(output: string): string[] {
	return output
		.split(/\r?\n/)
		.map((line) => normalizeFileHistoryLine(line))
		.filter((line): line is string => Boolean(line && line.length > 0));
}

export function parseHistoryOutput(output: string): string[] {
	return output
		.split(/\r?\n/)
		.map((line) => normalizeCommandHistoryLine(line))
		.filter((line): line is string => Boolean(line && line.length > 0));
}

function readFileTail(filePath: string): string {
	const fd = openSync(filePath, "r");
	try {
		const stat = fstatSync(fd);
		const fileSize = stat.size;
		if (fileSize === 0) {
			return "";
		}
		const readSize = Math.min(fileSize, MAX_HISTORY_BYTES);
		const offset = Math.max(0, fileSize - readSize);
		const buffer = Buffer.alloc(readSize);
		readSync(fd, buffer, 0, readSize, offset);
		let content = buffer.toString("utf8");
		// If we didn't read from the start, discard the first partial line
		if (offset > 0) {
			const firstNewline = content.indexOf("\n");
			if (firstNewline !== -1) {
				content = content.slice(firstNewline + 1);
			}
		}
		return content;
	} finally {
		closeSync(fd);
	}
}

function fetchHistoryFromFile(): string[] {
	const filePath = getShellHistoryFilePath();
	if (!filePath) {
		logDebug("history: no history file path for current shell");
		return [];
	}
	try {
		const content = readFileTail(filePath);
		return parseHistoryFile(content);
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
		timeout: 5000,
	});
	if (result.error) {
		logDebug(`history: command failed: ${result.error.message}`);
		return [];
	}
	if (result.status !== 0) {
		logDebug(
			`history: command exited with status ${result.status}: ${result.stderr ?? ""}`,
		);
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
