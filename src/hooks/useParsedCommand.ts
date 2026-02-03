import { useEffect, useState } from "react";
import { buildParsedCommand } from "../core/shells";
import type { ParsedCommand } from "../core/shells/common";

export function useParsedCommand(command: string) {
	const [parsedCommand, setParsedCommand] = useState<ParsedCommand>(() => {
		return buildParsedCommand(command);
	});

	// Update parsedCommand if the input command changes
	useEffect(() => {
		setParsedCommand(buildParsedCommand(command));
	}, [command]);

	return {
		parsedCommand,
		setParsedCommand,
	};
}
