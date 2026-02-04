import { chat } from "@tanstack/ai";
import { anthropicText } from "@tanstack/ai-anthropic";
import { geminiText } from "@tanstack/ai-gemini";
import { createOllamaChat, type ollamaText } from "@tanstack/ai-ollama";
import { openaiText } from "@tanstack/ai-openai";
import { z } from "zod";
import {
	getPromptConfig,
	getProviderApiKey,
	getProviderBaseUrl,
} from "../config";
import type { PromptName } from "../config/schema";
import { logDebug } from "./logger";
import { type ManPage, manPageToContextString } from "./manpage";
import {
	getDescribeTokensPrompt,
	getExplainSystemPrompt,
	getSuggestSystemPrompt,
} from "./prompts";
import type { ParsedCommand, ParsedToken } from "./shells/common";

const tokenDescriptionsSchema = z.object({
	descriptions: z.array(
		z.object({
			index: z.number().int(),
			description: z.string(),
		}),
	),
});

type TokenDescriptionSchemaEntry = z.infer<
	typeof tokenDescriptionsSchema
>["descriptions"][number];

export type TokenDescriptionsResult = {
	descriptions: string[];
	receivedLength: number;
	repaired: boolean;
	missingIndices: number[];
	extraIndices: number[];
	duplicateIndices: number[];
};

function resolveApiKey(promptName: PromptName) {
	const promptConfig = getPromptConfig(promptName);
	return getProviderApiKey(promptConfig.provider);
}

function resolveBaseUrl(promptName: PromptName) {
	const promptConfig = getPromptConfig(promptName);
	return getProviderBaseUrl(promptConfig.provider);
}

function resolveSystemPrompt(
	promptName: PromptName,
	defaultSystemPrompt: string,
) {
	const promptConfig = getPromptConfig(promptName);
	return sanitizePrompt(
		promptConfig.systemPromptOverride ?? defaultSystemPrompt,
	);
}

function resolveUserPrompt(promptName: PromptName, userPrompt?: string) {
	const promptConfig = getPromptConfig(promptName);
	const prompt = promptConfig.userPrompt
		? `${promptConfig.userPrompt}\n\n${userPrompt}`
		: userPrompt;
	return sanitizePrompt(prompt ?? "");
}
function sanitizePrompt(prompt: string) {
	return prompt.replace(/\s+/g, " ").trim();
}

function getAdapter(promptName: PromptName, model: string) {
	const promptConfig = getPromptConfig(promptName);
	const providerName = promptConfig.provider;

	const resolvedApiKey = resolveApiKey(promptName);

	const resolvedBaseUrl = resolveBaseUrl(promptName);

	switch (providerName) {
		case "anthropic":
			logDebug(`Using Anthropics adapter with model: ${model}`);
			return anthropicText(model as Parameters<typeof anthropicText>[0], {
				apiKey: resolvedApiKey,
				baseUrl: resolvedBaseUrl,
			});
		case "openai":
			logDebug(`Using OpenAI adapter with model: ${model}`);
			return openaiText(model as Parameters<typeof openaiText>[0], {
				apiKey: resolvedApiKey,
				baseUrl: resolvedBaseUrl,
			});
		case "gemini":
			logDebug(`Using Gemini adapter with model: ${model}`);
			return geminiText(model as Parameters<typeof geminiText>[0], {
				apiKey: resolvedApiKey,
				baseUrl: resolvedBaseUrl,
			});
		case "ollama":
			logDebug(`Using Ollama adapter with model: ${model}`);
			return createOllamaChat(
				model as Parameters<typeof ollamaText>[0],
				resolvedBaseUrl,
			);
		default:
			throw new Error(`Unsupported provider: ${providerName}`);
	}
}

/**
 * A helper function to generate text using the configured provider.
 */
async function generateText(
	promptName: PromptName,
	userPrompt: string,
	systemPrompt: string,
): Promise<string> {
	const promptConfig = getPromptConfig(promptName);
	const model = promptConfig.model;

	const fullUserPrompt = resolveUserPrompt(promptName, userPrompt);

	logDebug(
		`generateText:start type=${promptName} provider=${promptConfig.provider} model=${model} systemPrompt="${systemPrompt}" userPrompt="${fullUserPrompt}"`,
	);

	const adapter = getAdapter(promptName, model);

	const content = await chat({
		adapter,
		systemPrompts: [systemPrompt],
		...(fullUserPrompt === ""
			? {}
			: { messages: [{ role: "user", content: fullUserPrompt }] }),
		temperature: promptConfig.temperature,
		maxTokens: promptConfig.maxTokens,
		stream: false,
	});

	logDebug(`generateText:success bytes=${content.length}`);
	logDebug(`generateText:content="${content}"`);
	return content;
}

/**
 * Generates a shell command suggestion.
 */
export async function suggest(commandLine: string): Promise<string | null> {
	logDebug(`suggest:received line="${commandLine}"`);
	try {
		return await generateText("suggest", commandLine, getSuggestSystemPrompt());
	} catch (error) {
		logDebug("suggest:error", error);
		return null;
	}
}

/**
 * Explains a given shell command.
 */
export async function explain(commandLine: string): Promise<string | null> {
	if (!commandLine.trim()) {
		logDebug("explain:received empty line");
		return "No command to explain.";
	}

	logDebug(`explain:line="${commandLine}"`);
	try {
		return await generateText("explain", commandLine, getExplainSystemPrompt());
	} catch (error) {
		logDebug("explain:error", error);
		return null;
	}
}

export async function fetchTokenDescriptionsFromLlm({
	parsedCommand,
	parsedTokens,
	manPages,
}: {
	parsedCommand: ParsedCommand;
	parsedTokens: ParsedToken[];
	manPages: ManPage[];
}): Promise<TokenDescriptionsResult | null> {
	const promptType = "describeTokens";
	const promptConfig = getPromptConfig(promptType);
	const adapter = getAdapter(promptType, promptConfig.model);
	const defaultSystemPrompt = getDescribeTokensPrompt({
		responseStructure:
			'{"descriptions": [{"index": number, "description": string}]}',
	});

	const systemPrompt = resolveSystemPrompt(promptType, defaultSystemPrompt);
	const context = manPages.map(manPageToContextString).join("\n\n");

	const userPrompt = JSON.stringify(
		{
			expectedTokenCount: parsedTokens.length,
			parsedTokens: parsedTokens.map((token, index) => ({
				index,
				value: token.value,
				type: token.type,
			})),
			context,
		},
		null,
		2,
	);

	logDebug(`fetchTokenDescriptionsFromLlm:systemPrompt="${systemPrompt}"`);
	logDebug(`fetchTokenDescriptionsFromLlm:userPrompt="${userPrompt}"`);
	logDebug(
		`fetchTokenDescriptionsFromLlm:expectedTokens=${parsedCommand.tokens.length}`,
	);
	const response = await requestJsonFromLlm(
		adapter,
		systemPrompt,
		userPrompt,
		parsedTokens.length,
	);
	logDebug(
		`fetchTokenDescriptionsFromLlm:response=${JSON.stringify(
			response,
			null,
			2,
		)}`,
	);
	return response;
}

async function requestJsonFromLlm(
	adapter: ReturnType<typeof getAdapter>,
	systemPrompt: string,
	userPrompt: string,
	expectedLength: number,
): Promise<TokenDescriptionsResult | null> {
	try {
		const response = await chat({
			adapter,
			systemPrompts: [systemPrompt],
			messages: [{ role: "user", content: userPrompt }],
			outputSchema: tokenDescriptionsSchema,
			stream: false,
		});
		logDebug(`requestJsonFromLlm: Raw response: ${JSON.stringify(response)}`);
		const alignment = alignDescriptions(response.descriptions, expectedLength);
		if (alignment.repaired) {
			logDebug(
				`requestJsonFromLlm: alignment repaired missingIndices=${JSON.stringify(alignment.missingIndices)} extraIndices=${JSON.stringify(alignment.extraIndices)} duplicateIndices=${JSON.stringify(alignment.duplicateIndices)}`,
			);
		}
		return alignment;
	} catch (e: unknown) {
		logDebug("requestJsonFromLlm:error", e);
		return null;
	}
}

function alignDescriptions(
	entries: TokenDescriptionSchemaEntry[],
	expectedLength: number,
): TokenDescriptionsResult {
	const descriptions = new Array<string>(expectedLength).fill("");
	const missing = new Set<number>();
	for (let i = 0; i < expectedLength; i++) {
		missing.add(i);
	}
	const extraIndices: number[] = [];
	const duplicateIndices: number[] = [];
	const seen = new Set<number>();
	let repaired = false;

	entries.forEach((entry) => {
		const index = entry.index;
		if (!Number.isInteger(index) || index < 0 || index >= expectedLength) {
			repaired = true;
			extraIndices.push(index);
			return;
		}
		if (seen.has(index)) {
			repaired = true;
			duplicateIndices.push(index);
			return;
		}
		seen.add(index);
		const sanitized = sanitizeDescription(entry.description);
		descriptions[index] = sanitized;
		missing.delete(index);
	});

	if (missing.size > 0) {
		repaired = true;
	}

	return {
		descriptions,
		receivedLength: entries.length,
		repaired,
		missingIndices: Array.from(missing).sort((a, b) => a - b),
		extraIndices: extraIndices
			.filter((value) => Number.isFinite(value))
			.sort((a, b) => a - b),
		duplicateIndices: duplicateIndices.sort((a, b) => a - b),
	};
}

function sanitizeDescription(description: string): string {
	let normalized = description.replace(/\s+/g, " ").trim();
	const MAX_LENGTH = 160;
	if (normalized.length > MAX_LENGTH) {
		normalized = normalized.slice(0, MAX_LENGTH).trimEnd();
	}
	return normalized;
}
