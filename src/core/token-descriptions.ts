import { createHash } from "node:crypto";
import { getCachedDescriptions, saveDescriptions } from "./cache";
import { fetchCommandDocs } from "./context7";
import { fetchTokenDescriptionsFromLlm } from "./llm";
import { extractManSections, getManPage } from "./manpage";
import { parseTokens } from "./shells";
import type { ParsedCommand, ParsedToken } from "./shells/common";

const STATIC_DESCRIPTIONS: Record<string, string> = {
	pipe: "Pipe output to the next command",
	controlOperator: "Control command execution flow",
	redirect: "Redirect input or output",
	assignment: "Set an environment variable",
	unknown: "Unknown token",
};

export function getStaticTokenDescription(token: ParsedToken): string | null {
	return STATIC_DESCRIPTIONS[token.type] ?? null;
}

export async function fetchTokenDescriptions(
	parsedCommand: ParsedCommand,
): Promise<string[]> {
	const parsedTokens = parseTokens(parsedCommand.tokens);
	const commandToken = parsedTokens.find(
		(token: ParsedToken) => token.type === "command",
	);
	const manPage = commandToken ? getManPage(commandToken.value) : null;
	const manSections = manPage ? extractManSections(manPage) : {};
	const context7Docs = commandToken
		? await fetchCommandDocs(commandToken.value)
		: null;
	const sourceHash = hashSource([
		manSections.name,
		manSections.synopsis,
		manSections.options,
		context7Docs,
	]);

	const cached = getCachedDescriptions(parsedCommand, sourceHash);
	if (cached) {
		return cached;
	}

	const rawDescriptions = new Array(parsedCommand.tokens.length).fill("");
	applyStaticDescriptions(rawDescriptions, parsedTokens);

	const hasMissing = rawDescriptions.some((description) => !description);
	if (hasMissing) {
		const llmDescriptions = await fetchTokenDescriptionsFromLlm(
			parsedCommand,
			parsedTokens,
			{
				name: manSections.name,
				synopsis: manSections.synopsis,
				options: manSections.options,
				docs: context7Docs,
			},
		);
		if (llmDescriptions) {
			mergeDescriptions(rawDescriptions, llmDescriptions, parsedTokens);
		}
	}

	for (let i = 0; i < rawDescriptions.length; i++) {
		if (!rawDescriptions[i]) {
			rawDescriptions[i] = parsedCommand.tokens[i] ?? "";
		}
	}

	saveDescriptions(parsedCommand, sourceHash, rawDescriptions);
	return rawDescriptions;
}

function hashSource(parts: Array<string | undefined | null>): string {
	const hash = createHash("sha256");
	for (const part of parts) {
		if (part) {
			hash.update(part);
		}
		hash.update("\n");
	}
	return hash.digest("hex");
}

function applyStaticDescriptions(
	rawDescriptions: string[],
	parsedTokens: ParsedToken[],
): void {
	let rawIndex = 0;
	for (const token of parsedTokens) {
		const staticDescription = getStaticTokenDescription(token);
		if (staticDescription) {
			rawDescriptions[rawIndex] = staticDescription;
		}
		if (token.optionValue) {
			rawIndex += 2;
			continue;
		}
		rawIndex += 1;
	}
}

function mergeDescriptions(
	rawDescriptions: string[],
	llmDescriptions: string[],
	parsedTokens: ParsedToken[],
): void {
	let rawIndex = 0;
	for (const token of parsedTokens) {
		const staticDescription = getStaticTokenDescription(token);
		if (!staticDescription) {
			rawDescriptions[rawIndex] =
				llmDescriptions[rawIndex] ?? rawDescriptions[rawIndex] ?? "";
		}
		if (token.optionValue) {
			const valueIndex = rawIndex + 1;
			if (!staticDescription) {
				rawDescriptions[valueIndex] =
					llmDescriptions[valueIndex] ?? rawDescriptions[valueIndex] ?? "";
			}
			rawIndex += 2;
			continue;
		}
		rawIndex += 1;
	}
}
