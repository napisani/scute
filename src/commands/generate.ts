// src/commands/generate.ts
import { createInterface } from "node:readline/promises";
import { generateCommand } from "../core";
import { logDebug } from "../core/logger";
import { emitOutput, type OutputChannel } from "../core/output";

export interface GenerateOptions {
	output: OutputChannel;
}

export async function generate(
	inputParts: string[] = [],
	{ output }: GenerateOptions,
): Promise<void> {
	const prompt = await resolvePrompt(inputParts);
	if (!prompt) {
		logDebug("command:generate empty prompt");
		return;
	}
	logDebug(`command:generate prompt="${prompt}"`);
	const suggestion = await generateCommand(prompt);
	if (suggestion === null) {
		logDebug("command:generate result=null");
		return;
	}
	emitOutput({
		channel: output,
		text: suggestion,
	});
	logDebug("command:generate output written");
}

async function resolvePrompt(inputParts: string[]): Promise<string> {
	if (inputParts.length) {
		return inputParts.join(" ").trim();
	}
	if (process.stdin.isTTY) {
		return await promptForInput();
	}
	let input = "";
	for await (const chunk of process.stdin) {
		input += chunk;
	}
	return input.trim();
}

async function promptForInput(): Promise<string> {
	const rl = createInterface({
		input: process.stdin,
		output: process.stdout,
	});
	try {
		const answer = await rl.question("Enter a command request: ");
		return answer.trim();
	} finally {
		rl.close();
	}
}
