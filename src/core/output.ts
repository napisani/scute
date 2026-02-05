import { spawnSync } from "node:child_process";
import chalk from "chalk";
import { getConfigSnapshot } from "../config";

export type OutputChannel = "clipboard" | "stdout" | "prompt" | "readline";

export interface EmitOutputOptions {
	channel: OutputChannel;
	text: string;
	promptPrefix?: string;
}

export function emitOutput({
	channel,
	text,
	promptPrefix,
}: EmitOutputOptions): void {
	switch (channel) {
		case "clipboard":
			writeToClipboard(text);
			return;
		case "prompt":
			writeToPrompt(text, promptPrefix);
			return;
		case "readline":
			process.stdout.write(text);
			return;
		case "stdout":
		default:
			writeToStdout(text);
			return;
	}
}

function writeToStdout(text: string): void {
	const output = text.endsWith("\n") ? text : `${text}\n`;
	process.stdout.write(output);
}

function writeToClipboard(text: string): void {
	const command = getConfigSnapshot().clipboardCommand ?? "pbcopy";
	const result = spawnSync(command, {
		input: text,
		encoding: "utf8",
		shell: true,
	});
	if (result.error) {
		writeToStdout(text);
	}
}

function writeToPrompt(text: string, prefix?: string): void {
	const terminalHeight = process.stdout.rows;
	const hint = prefix ? `${prefix}${text}` : text;

	if (!terminalHeight) {
		process.stdout.write(`\n${hint}\n`);
		return;
	}

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
}
