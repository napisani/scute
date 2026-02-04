import {
	buildManPageContext,
	extractManSections,
	getManPage,
	type ManPage,
} from "./manpage";
import { buildParsedCommand, parseTokens } from "./shells";
import type { ParsedCommand, ParsedToken } from "./shells/common";

type CommandContextOptions = {
	maxChars?: number;
	maxSnippets?: number;
};

type CommandContext = {
	parsedCommand: ParsedCommand;
	parsedTokens: ParsedToken[];
	manPages: ManPage[];
	context: string;
};

const manPageCache = new Map<string, ManPage | null>();

function loadManPage(commandName: string): ManPage | null {
	if (manPageCache.has(commandName)) {
		return manPageCache.get(commandName) ?? null;
	}
	const raw = getManPage(commandName);
	if (!raw) {
		manPageCache.set(commandName, null);
		return null;
	}
	const parsed = extractManSections(commandName, raw);
	manPageCache.set(commandName, parsed);
	return parsed;
}

export function buildCommandContext(
	commandLine: string,
	options?: CommandContextOptions,
): CommandContext {
	const parsedCommand = buildParsedCommand(commandLine);
	const parsedTokens = parseTokens(parsedCommand.tokens);
	const commandNames = Array.from(
		new Set(
			parsedTokens
				.filter((token) => token.type === "command")
				.map((token) => token.value),
		),
	);
	const manPages: ManPage[] = [];
	for (const name of commandNames) {
		const manPage = loadManPage(name);
		if (manPage) {
			manPages.push(manPage);
		}
	}
	const contexts = manPages.map((manPage) =>
		buildManPageContext(manPage, parsedTokens, options),
	);
	const context = contexts.filter(Boolean).join("\n\n");
	return {
		parsedCommand,
		parsedTokens,
		manPages,
		context,
	};
}
