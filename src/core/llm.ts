import { chat } from "@tanstack/ai";
import { anthropicText } from "@tanstack/ai-anthropic";
import { geminiText } from "@tanstack/ai-gemini";
import { createOllamaChat, type ollamaText } from "@tanstack/ai-ollama";
import { openaiText } from "@tanstack/ai-openai";
import { z } from "zod";
import { config } from "../config";
import type { PromptName } from "../config/schema";
import { getEnv } from "./environment";
import { logDebug } from "./logger";
import { type ManPage, manPageToContextString } from "./manpage";
import {
	getDescribeTokensPrompt,
	getExplainSystemPrompt,
	getSuggestSystemPrompt,
} from "./prompts";
import type { ParsedCommand, ParsedToken } from "./shells/common";

const tokenDescriptionsSchema = z.object({
	descriptions: z.array(z.string()),
});

function getProviderConfig(providerName: string) {
	return config.providers.find((p) => p.name === providerName);
}

function resolveApiKey(promptName: PromptName) {
	const promptConfig = config.prompts[promptName];
	const providerName = promptConfig.provider;
	const providerConfig = getProviderConfig(providerName);
	if (providerConfig?.apiKey) {
		return providerConfig.apiKey;
	}

	if (providerName === "openai") {
		return getEnv("OPENAI_API_KEY");
	}
	if (providerName === "anthropic") {
		return getEnv("ANTHROPIC_API_KEY");
	}
	if (providerName === "gemini") {
		return getEnv("GEMINI_API_KEY");
	}
	return undefined;
}

function resolveBaseUrl(promptName: PromptName) {
	const promptConfig = config.prompts[promptName];
	const providerName = promptConfig.provider;
	const providerConfig = getProviderConfig(providerName);
	if (providerConfig?.baseUrl) {
		return providerConfig.baseUrl;
	}
	if (providerName === "ollama") {
		return getEnv("OLLAMA_BASE_URL");
	}
	return undefined;
}

function resolveSystemPrompt(
	promptName: PromptName,
	defaultSystemPrompt: string,
) {
	const promptConfig = config.prompts[promptName];
	return sanitizePrompt(
		promptConfig.systemPromptOverride ?? defaultSystemPrompt,
	);
}

function resolveUserPrompt(promptName: PromptName, userPrompt?: string) {
	const promptConfig = config.prompts[promptName];
	const prompt = promptConfig.userPrompt
		? `${promptConfig.userPrompt}\n\n${userPrompt}`
		: userPrompt;
	return sanitizePrompt(prompt ?? "");
}
function sanitizePrompt(prompt: string) {
	return prompt.replace(/\s+/g, " ").trim();
}

function getAdapter(promptName: PromptName, model: string) {
	const promptConfig = config.prompts[promptName];
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
	try {
		const promptConfig = config.prompts[promptName];
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
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "An unknown error occurred";
		logDebug(`generateText:error message="${errorMessage}"`);
		return `[brash] AI Error: ${errorMessage}`;
	}
}

/**
 * Generates a shell command suggestion.
 */
export async function suggest(commandLine: string): Promise<string> {
	logDebug(`suggest:received line="${commandLine}"`);
	return generateText("suggest", commandLine, getSuggestSystemPrompt());
}

/**
 * Explains a given shell command.
 */
export async function explain(commandLine: string): Promise<string> {
	if (!commandLine.trim()) {
		logDebug("explain:received empty line");
		return "No command to explain.";
	}

	logDebug(`explain:line="${commandLine}"`);
	return generateText("explain", commandLine, getExplainSystemPrompt());
}

export async function fetchTokenDescriptionsFromLlm({
	parsedCommand,
	parsedTokens,
	manPages,
}: {
	parsedCommand: ParsedCommand;
	parsedTokens: ParsedToken[];
	manPages: ManPage[];
}): Promise<string[] | null> {
	const promptConfig = config.prompts.explain;
	const promptType = "describeTokens";
	const adapter = getAdapter(promptType, promptConfig.model);
	const defaultSystemPrompt = getDescribeTokensPrompt({
		responseStructure: "{descriptions: [string]}",
	});

	const systemPrompt = resolveSystemPrompt(promptType, defaultSystemPrompt);
	const context = manPages.map(manPageToContextString).join("\n\n");

	const userPrompt = JSON.stringify(
		{
			parsedTokens: parsedTokens.map((token) => token.value),
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
): Promise<string[] | null> {
	try {
		const response = await chat({
			adapter,
			messages: [{ role: "user", content: `${systemPrompt}\n\n${userPrompt}` }],
			outputSchema: tokenDescriptionsSchema,
			stream: false,
		});
		logDebug(`requestJsonFromLlm: Raw response: ${JSON.stringify(response)}`);
		if (response.descriptions.length !== expectedLength) {
			logDebug(
				`requestJsonFromLlm: Unexpected number of descriptions. Expected ${expectedLength}, got ${response.descriptions.length}`,
			);
			return null;
		}
		return response.descriptions;
	} catch (e: unknown) {
		logDebug(`requestJsonFromLlm:error Unknown error: ${JSON.stringify(e)}`);
		return null;
	}
}
