// src/commands/generate.ts
import { generateCommand } from "../core";
import { logDebug } from "../core/logger";
import { emitOutput, type OutputChannel } from "../core/output";
import { promptForLine } from "../utils/prompt";

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
		return await promptForLine({
			message: "Enter a command request: ",
		});
	}
	let input = "";
	for await (const chunk of process.stdin) {
		input += chunk;
	}
	return input.trim();
}
