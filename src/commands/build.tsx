import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { emitOutput } from "../core/output";
import { getReadlineLine, hasReadlineLine } from "../core/shells";
import { BuildApp } from "../pages/build";

export type BuildOptions = {};

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

export async function build(inputParts: string[] = [], _: BuildOptions) {
	const isLine = hasReadlineLine();
	const readlineLine = getReadlineLine();
	const command = resolveBuildCommand(inputParts, {
		hasReadlineLine: isLine,
		readlineLine,
	});
	const renderer = await createCliRenderer();
	let didSubmit = false;
	const handleExit = (nextCommand: string, submitted: boolean) => {
		if (didSubmit) {
			return;
		}
		didSubmit = true;
		renderer.destroy();
		if (!submitted) {
			return;
		}
		emitOutput(nextCommand);
	};
	createRoot(renderer).render(
		<BuildApp command={command} onExit={handleExit} />,
	);
}
