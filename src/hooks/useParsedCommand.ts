import { useEffect, useState } from "react";
import { buildParsedCommand } from "../core/shells";
import type { ParsedCommand } from "../core/shells/common";

export interface UseParsedCommandOptions {
	command: string;
}

export function useParsedCommand({ command }: UseParsedCommandOptions) {
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
