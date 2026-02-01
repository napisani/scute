import { useEffect, useState } from "react";
import { tokenizeInput } from "../core/shells";
import type { ParsedCommand } from "../core/shells/common";

export function useParsedCommand(command: string) {
	const [parsedCommand, setParsedCommand] = useState<ParsedCommand>(() => {
		const tokens = tokenizeInput(command);
		return {
			tokens,
			originalCommand: command,
		};
	});

	// Update parsedCommand if the input command changes
	useEffect(() => {
		const tokens = tokenizeInput(command);
		setParsedCommand({
			tokens,
			originalCommand: command,
		});
	}, [command]);

	return {
		parsedCommand,
		setParsedCommand,
	};
}
