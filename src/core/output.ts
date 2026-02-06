import { spawnSync } from "node:child_process";
import os from "node:os";
import chalk from "chalk";
import { getConfigSnapshot } from "../config";
import { logDebug } from "./logger";
import { outputToReadline } from "./shells";

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
			outputToReadline(text);
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

function detectClipboardCommand(): string | null {
	const platform = os.platform();
	if (platform === "darwin") return "pbcopy";
	if (platform === "win32") return "clip.exe";
	// Linux/WSL — try common clipboard utilities
	for (const cmd of [
		"xclip -selection clipboard",
		"xsel --clipboard --input",
		"clip.exe",
	]) {
		const bin = cmd.split(" ")[0];
		if (bin && spawnSync("which", [bin], { encoding: "utf8" }).status === 0) {
			return cmd;
		}
	}
	return null;
}

function writeToClipboard(text: string): void {
	const configured = getConfigSnapshot().clipboardCommand;
	const command = configured ?? detectClipboardCommand();
	if (!command) {
		logDebug(
			"No clipboard command found. Set 'clipboardCommand' in config. Falling back to stdout.",
		);
		writeToStdout(text);
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
