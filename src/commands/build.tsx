import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { emitOutput, type OutputChannel } from "../core/output";
import { getReadlineLine, hasReadlineLine } from "../core/shells";
import { BuildApp } from "../pages/build";
import { promptForLine } from "../utils/prompt";

export interface BuildOptions {
	output: OutputChannel;
}

export function resolveBuildCommand(
	inputParts: string[],
	options: { hasReadlineLine: boolean; readlineLine: string | null },
): string {
	const positionalCommand = inputParts.join(" ").trim();
	if (positionalCommand.length > 0) {
		return positionalCommand;
	}
	if (options.hasReadlineLine && options.readlineLine) {
		return options.readlineLine;
	}
	return "";
}

export async function build(
	inputParts: string[] = [],
	{ output }: BuildOptions,
) {
	const isLine = hasReadlineLine();
	const readlineLine = getReadlineLine();
	let command = resolveBuildCommand(inputParts, {
		hasReadlineLine: isLine,
		readlineLine,
	});
	if (command.length === 0) {
		if (process.stdin.isTTY) {
			command = await promptForLine({
				message: "Enter a command to start building: ",
			});
		} else {
			command = await readAllStdin();
		}
	}
	const renderer = await createCliRenderer();
	let didSubmit = false;
	const handleSubmit = (nextCommand: string) => {
		if (didSubmit) {
			return;
		}
		didSubmit = true;
		renderer.destroy();
		emitOutput({
			channel: output,
			text: nextCommand,
		});
	};
	createRoot(renderer).render(
		<BuildApp command={command} onSubmit={handleSubmit} />,
	);
}

async function readAllStdin(): Promise<string> {
	let input = "";
	for await (const chunk of process.stdin) {
		input += chunk;
	}
	return input.trim();
}
