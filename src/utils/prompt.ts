import { createInterface } from "node:readline/promises";

export interface PromptForLineOptions {
	message: string;
	input?: NodeJS.ReadableStream;
	output?: NodeJS.WritableStream;
}

export async function promptForLine({
	message,
	input = process.stdin,
	output = process.stdout,
}: PromptForLineOptions): Promise<string> {
	const rl = createInterface({
		input,
		output,
	});
	try {
		const answer = await rl.question(message);
		return answer.trim();
	} finally {
		rl.close();
	}
}
