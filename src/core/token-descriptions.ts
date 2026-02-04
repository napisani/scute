import { createHash } from "node:crypto";
import { getCachedDescriptions, saveDescriptions } from "./cache";
import {
	fetchTokenDescriptionsFromLlm,
	type TokenDescriptionsResult,
} from "./llm";
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

export type TokenDescriptionsDiagnostics = {
	tokenCount: number;
	staticCount: number;
	llmAttempted: boolean;
	llmReceivedLength: number | null;
	llmRepaired: boolean;
	missingIndices: number[];
	extraIndices: number[];
	duplicateIndices: number[];
};

let lastTokenDescriptionsDiagnostics: TokenDescriptionsDiagnostics | null =
	null;

export function getLastTokenDescriptionsDiagnostics(): TokenDescriptionsDiagnostics | null {
	return lastTokenDescriptionsDiagnostics;
}

export function getStaticTokenDescription(
	token: ParsedToken,
	index: number,
	allTokens: ParsedToken[],
): string | null {
	const baseDescription = STATIC_DESCRIPTIONS[token.type];
	if (baseDescription) {
		return baseDescription;
	}

	if (token.type === "argument") {
		const previousToken = allTokens[index - 1] ?? null;
		if (previousToken?.type === "redirect") {
			return describeRedirectTarget(previousToken.value, token.value);
		}
		if (isLikelyFilePath(token.value)) {
			return describeFilePath(token.value);
		}
		if (isGlobPattern(token.value)) {
			return `Pattern argument (${token.value}) used for matching`;
		}
		if (isNumericValue(token.value)) {
			return `Numeric argument (${token.value})`;
		}
	}

	if (token.type === "option") {
		if (token.value === "-h" || token.value === "--help") {
			return "Display help information";
		}
		if (token.value === "-v" || token.value === "--version") {
			return "Show version information";
		}
	}

	return null;
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
	const diagnostics: TokenDescriptionsDiagnostics = {
		tokenCount: rawDescriptions.length,
		staticCount: rawDescriptions.filter((description) => !!description).length,
		llmAttempted: false,
		llmReceivedLength: null,
		llmRepaired: false,
		missingIndices: [],
		extraIndices: [],
		duplicateIndices: [],
	};
	if (hasMissing) {
		logDebug("Fetching token descriptions from LLM");
		diagnostics.llmAttempted = true;
		const llmResult: TokenDescriptionsResult | null =
			await fetchTokenDescriptionsFromLlm({
				parsedCommand,
				parsedTokens,
				manPages,
			});
		logDebug(`LLM descriptions: ${JSON.stringify(llmResult, null, 2)}`);
		if (llmResult) {
			diagnostics.llmReceivedLength = llmResult.receivedLength;
			diagnostics.llmRepaired = llmResult.repaired;
			diagnostics.missingIndices = llmResult.missingIndices;
			diagnostics.extraIndices = llmResult.extraIndices;
			diagnostics.duplicateIndices = llmResult.duplicateIndices;
			mergeDescriptions(rawDescriptions, llmResult.descriptions, parsedTokens);
		}
	}

	for (let i = 0; i < rawDescriptions.length; i++) {
		if (!rawDescriptions[i]) {
			rawDescriptions[i] = "(no description available)";
		}
	}

	printTokenDescriptions(parsedTokens, rawDescriptions);

	saveDescriptions(parsedCommand, sourceHash, rawDescriptions);
	lastTokenDescriptionsDiagnostics = diagnostics;
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
		const staticDescription = getStaticTokenDescription(
			token,
			index,
			parsedTokens,
		);
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
		const staticDescription = getStaticTokenDescription(
			token,
			index,
			parsedTokens,
		);
		if (!staticDescription) {
			rawDescriptions[index] =
				llmDescriptions[index] ?? rawDescriptions[index] ?? "";
		}
	});
	logDebug(
		`Final raw descriptions after merging LLM: ${JSON.stringify(rawDescriptions, null, 2)}`,
	);
}

function isLikelyFilePath(value: string): boolean {
	return (
		value.startsWith("/") ||
		value.startsWith("./") ||
		value.startsWith("../") ||
		value.startsWith("~/") ||
		/[\\/]/.test(value) ||
		/[^\s]+\.[A-Za-z0-9]{1,5}$/.test(value)
	);
}

function describeFilePath(value: string): string {
	if (value.startsWith("/")) {
		return `Absolute path argument (${value})`;
	}
	if (value.startsWith("./") || value.startsWith("../")) {
		return `Relative path argument (${value})`;
	}
	if (value.startsWith("~/")) {
		return `Home-relative path argument (${value})`;
	}
	return `File argument (${value})`;
}

function describeRedirectTarget(redirect: string, value: string): string {
	if (/^\d*>>?/.test(redirect) || redirect.includes(">")) {
		return `Output target for redirect (${value})`;
	}
	if (redirect.includes("<<")) {
		return `Here-document delimiter (${value})`;
	}
	if (redirect.includes("<")) {
		return `Input source for redirect (${value})`;
	}
	return `Redirect target (${value})`;
}

function isGlobPattern(value: string): boolean {
	return /[*?[]/.test(value);
}

function isNumericValue(value: string): boolean {
	return /^-?\d+(\.\d+)?$/.test(value);
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
