import { createHash } from "node:crypto";
import { getCachedDescriptions, saveDescriptions } from "./cache";
import { fetchTokenDescriptionsFromLlm } from "./llm";
import { logDebug } from "./logger";
import { extractManSections, getManPage, type ManPage } from "./manpage";
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
	const commandNames = Array.from(
		new Set(
			parsedTokens
				.filter((token: ParsedToken) => token.type === "command")
				.map((token) => token.value),
		),
	);
	const manPages = commandNames
		.map((commandName) => {
			const manPage = getManPage(commandName);
			return manPage ? extractManSections(commandName, manPage) : null;
		})
		.filter((page): page is ManPage => !!page);
	const sourceHash = hashSource(
		manPages.flatMap((page) => [page.name, page.synopsis, page.description]),
	);

	const cached = getCachedDescriptions(parsedCommand, sourceHash);
	if (cached) {
		return cached;
	}

	const rawDescriptions = new Array(parsedCommand.tokens.length).fill("");
	applyStaticDescriptions(rawDescriptions, parsedTokens);

	const hasMissing = rawDescriptions.some((description) => !description);
	if (hasMissing) {
		logDebug("Fetching token descriptions from LLM");
		const llmDescriptions = await fetchTokenDescriptionsFromLlm({
			parsedCommand,
			parsedTokens,
			manPages,
		});
		logDebug(`LLM descriptions: ${JSON.stringify(llmDescriptions, null, 2)}`);
		if (llmDescriptions) {
			mergeDescriptions(rawDescriptions, llmDescriptions, parsedTokens);
		}
	}

	for (let i = 0; i < rawDescriptions.length; i++) {
		if (!rawDescriptions[i]) {
			rawDescriptions[i] = "(no description available)";
		}
	}

	printTokenDescriptions(parsedTokens, rawDescriptions);

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
	logDebug("Applying static descriptions to tokens");
	logDebug(`Parsed tokens: ${JSON.stringify(parsedTokens, null, 2)}`);
	logDebug(
		`Initial raw descriptions: ${JSON.stringify(rawDescriptions, null, 2)}`,
	);
	parsedTokens.forEach((token, index) => {
		const staticDescription = getStaticTokenDescription(token);
		if (staticDescription) {
			rawDescriptions[index] = staticDescription;
		}
	});
	logDebug(
		`Final raw descriptions after static application: ${JSON.stringify(rawDescriptions, null, 2)}`,
	);
}

function mergeDescriptions(
	rawDescriptions: string[],
	llmDescriptions: string[],
	parsedTokens: ParsedToken[],
): void {
	parsedTokens.forEach((token, index) => {
		const staticDescription = getStaticTokenDescription(token);
		if (!staticDescription) {
			rawDescriptions[index] =
				llmDescriptions[index] ?? rawDescriptions[index] ?? "";
		}
	});
	logDebug(
		`Final raw descriptions after merging LLM: ${JSON.stringify(rawDescriptions, null, 2)}`,
	);
}

function printTokenDescriptions(
	parsedTokens: ParsedToken[],
	descriptions: string[],
): void {
	parsedTokens.forEach((token, index) => {
		const description = descriptions[index] ?? "(no description available)";
		console.log(`${token.type}\t${token.value}\t${description}`);
	});
}
