import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { getReadlineLine, hasReadlineLine } from "../core/shells";
import { BuildApp } from "../pages/build";

export async function build(inputParts: string[] = []) {
	const isLine = hasReadlineLine();
	const readlineLine = getReadlineLine();
	const command =
		isLine && !!readlineLine ? readlineLine : inputParts.join(" ");
	const renderer = await createCliRenderer();
	createRoot(renderer).render(<BuildApp command={command} />);
}
