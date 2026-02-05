import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { emitOutput, type OutputChannel } from "../core/output";
import { getReadlineLine, hasReadlineLine } from "../core/shells";
import { BuildApp } from "../pages/build";

export interface BuildOptions {
	output: OutputChannel;
}

export async function build(
	inputParts: string[] = [],
	{ output }: BuildOptions,
) {
	const isLine = hasReadlineLine();
	const readlineLine = getReadlineLine();
	const command =
		isLine && !!readlineLine ? readlineLine : inputParts.join(" ");
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
