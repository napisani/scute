import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import type { ParsedCommand } from "../core/command-tokens";
import {
	getReadlineLine,
	hasReadlineLine,
	tokenizeInput,
} from "../core/shells";
import { BuildApp } from "../pages/build";

export async function build(inputParts: string[] = []) {
	const isLine = hasReadlineLine();
	const readlineLine = getReadlineLine();
	const line = isLine && !!readlineLine ? readlineLine : inputParts.join(" ");
	const tokens = tokenizeInput(line);
	const parsedCommand: ParsedCommand = {
		tokens,
		originalCommand: line,
	};
	const renderer = await createCliRenderer();
	createRoot(renderer).render(<BuildApp command={parsedCommand} />);
}
