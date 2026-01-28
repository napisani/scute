import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import {
	getReadlineLine,
	hasReadlineLine,
	tokenizeInput,
} from "../core/shells";
import type { ParsedCommand } from "../core/shells/common";
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
