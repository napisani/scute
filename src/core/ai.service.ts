// core/ai.service.ts
import { chat } from "@tanstack/ai";
import { anthropicText } from "@tanstack/ai-anthropic";
import { geminiText } from "@tanstack/ai-gemini";
import { ollamaText } from "@tanstack/ai-ollama";
import { openaiText } from "@tanstack/ai-openai";
import { config } from "../config";
import { SYSTEM_PROMPTS } from "./constants";
import { logDebug } from "./logger";

type CommandType = "explain" | "suggest" | "generate";

function getProviderConfig(providerName: string) {
	return config.providers.find((p) => p.name === providerName);
}

function resolveApiKey(providerName: string, apiKey?: string) {
	if (apiKey) {
		return apiKey;
	}
	if (providerName === "openai") {
		return process.env.OPENAI_API_KEY;
	}
	if (providerName === "anthropic") {
		return process.env.ANTHROPIC_API_KEY;
	}
	if (providerName === "gemini") {
		return process.env.GOOGLE_GENERATIVE_AI_API_KEY;
	}
	return undefined;
}

function getAdapter(commandType: CommandType, model: string) {
	const promptConfig = config.prompts[commandType];
	const providerName = promptConfig.provider;
	const providerConfig = getProviderConfig(providerName);

	// Ensure API keys are set if provided in config
	// This is a bit of a hack if the libraries expect env vars,
	// but most allow passing keys or fallback to env vars.
	// We'll set env vars as a compatibility layer if the library relies on them implicitly
	// and they aren't passed (though tanstack ai usually allows config).
	const resolvedApiKey = resolveApiKey(providerName, providerConfig?.apiKey);
	if (resolvedApiKey) {
		if (providerName === "openai") process.env.OPENAI_API_KEY = resolvedApiKey;
		if (providerName === "anthropic")
			process.env.ANTHROPIC_API_KEY = resolvedApiKey;
		if (providerName === "gemini")
			process.env.GOOGLE_GENERATIVE_AI_API_KEY = resolvedApiKey;
	}

	// For Ollama, we might need base_url
	const resolvedBaseUrl =
		providerConfig?.baseUrl ?? process.env.OLLAMA_BASE_URL;
	if (providerName === "ollama" && resolvedBaseUrl) {
		// TanStack AI Ollama might expect base URL in a specific way or use default.
		// We'll assume standard env var or just rely on default localhost if not set in lib.
		// There isn't a standard env var for Ollama base url in all libs, often OLLAMA_BASE_URL.
		process.env.OLLAMA_BASE_URL = resolvedBaseUrl;
	}

	switch (providerName) {
		case "anthropic":
			return anthropicText(model as any);
		case "openai":
			return openaiText(model as any);
		case "gemini":
			return geminiText(model as any);
		case "ollama":
			return ollamaText(model as any);
		default:
			throw new Error(`Unsupported provider: ${providerName}`);
	}
}

/**
 * A helper function to generate text using the configured provider.
 */
async function generateText(
	commandType: CommandType,
	userPrompt: string,
): Promise<string> {
	try {
		const promptConfig = config.prompts[commandType];
		const model = promptConfig.model;
		const systemPrompt =
			promptConfig.systemPromptOverride || SYSTEM_PROMPTS[commandType];

		// Append configured userPrompt if it exists (as extra instructions)
		const fullUserPrompt = promptConfig.userPrompt
			? `${promptConfig.userPrompt}\n\n${userPrompt}`
			: userPrompt;

		const sanitizedPrompt = userPrompt.replace(/\s+/g, " ").trim();
		logDebug(
			`generateText:start type=${commandType} provider=${promptConfig.provider} model=${model} userPrompt="${sanitizedPrompt}"`,
		);

		const adapter = getAdapter(commandType, model);

		const content = await chat({
			adapter,
			messages: [
				{ role: "user", content: `${systemPrompt}\n\n${fullUserPrompt}` },
			],
			// We could pass temperature and maxTokens here if chat() supports it per request,
			// or if the adapter supports it.
			// Checking tanstack ai docs (mental model), parameters often go into adapter or a separate options object?
			// `chat` signature: ({ adapter, messages, ... })
			// It seems options like temperature are platform specific or passed to adapter?
			// For now we'll stick to basics.
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
	return generateText(
		"suggest",
		commandLine || "Suggest a command for listing files.",
	);
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
	return generateText("explain", commandLine);
}

/**
 * Generates a shell command from a natural language prompt.
 */
export async function generateCommandFromPrompt(
	prompt: string,
): Promise<string> {
	if (!prompt.trim()) {
		logDebug("generateCommandFromPrompt:received empty prompt");
		return 'echo "brash: Please provide a description of the command you want."';
	}

	logDebug(`generateCommandFromPrompt:prompt="${prompt}"`);
	return generateText("generate", prompt);
}
