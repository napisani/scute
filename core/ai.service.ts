// core/ai.service.ts
import { chat } from "@tanstack/ai";
import { anthropicText } from "@tanstack/ai-anthropic";
import { geminiText } from "@tanstack/ai-gemini";
import { ollamaText } from "@tanstack/ai-ollama";
import { openaiText } from "@tanstack/ai-openai";
import { logDebug } from "./logger";

function ensureOpenAIKey(): void {
	if (!process.env.OPENAI_API_KEY) {
		throw new Error("OPENAI_API_KEY environment variable is not set.");
	}
}
type Provider = "openai" | "anthropic" | "gemini" | "ollama";

// Define adapters with their models - autocomplete works here!
const adapters = {
	anthropic: () => {
		const model = process.env.ANTHROPIC_MODEL || "claude-3-haiku";
		return anthropicText(model as any); // TODO fix this
	},
	openai: () => {
		const model = process.env.OPENAI_MODEL || "gpt-5-mini";
		return openaiText(model as any); // TODO fix this
	},
	gemini: () => {
		const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
		return geminiText(model as any); // TODO fix this
	},

	ollama: () => {
		const model = process.env.OLLAMA_MODEL || "qwen:1.6b";
		return ollamaText(model as any); // TODO fix this
	},
};

/**
 * A helper function to generate text using TanStack AI and OpenAI.
 */
async function generateText(
	model: "gpt-5.2" | "gpt-5-mini",
	systemPrompt: string,
	userPrompt: string,
): Promise<string> {
	try {
		ensureOpenAIKey();
		const sanitizedPrompt = userPrompt.replace(/\s+/g, " ").trim();
		logDebug(
			`generateText:start model=${model} userPrompt="${sanitizedPrompt}"`,
		);
		const content = await chat({
			adapter: openaiText(model),
			messages: [{ role: "user", content: `${systemPrompt}\n\n${userPrompt}` }],
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
	const systemPrompt =
		"You are an expert shell command assistant. Complete the given shell command. Only output the completed command, with no additional explanation or formatting. The user may have an empty input, in which case you should suggest a common, useful command.";

	logDebug(`suggest:received line="${commandLine}"`);
	return generateText(
		"gpt-5-mini",
		systemPrompt,
		commandLine || "Suggest a command for listing files.",
	);
}

/**
 * Explains a given shell command.
 */
export async function explain(commandLine: string): Promise<string> {
	const systemPrompt =
		"You are an expert shell command assistant. Explain the given shell command concisely in a single line. Describe what the command and its primary arguments do.";

	if (!commandLine.trim()) {
		logDebug("explain:received empty line");
		return "No command to explain.";
	}

	logDebug(`explain:line="${commandLine}"`);
	return generateText("gpt-5-mini", systemPrompt, commandLine);
}

/**
 * Generates a shell command from a natural language prompt.
 */
export async function generateCommandFromPrompt(
	prompt: string,
): Promise<string> {
	const systemPrompt =
		"You are an expert shell command assistant. The user will provide a natural language prompt describing a task. Generate the single, most likely shell command that achieves their goal. Output only the command itself, with no additional explanation or formatting.";

	if (!prompt.trim()) {
		logDebug("generateCommandFromPrompt:received empty prompt");
		return 'echo "brash: Please provide a description of the command you want."';
	}

	logDebug(`generateCommandFromPrompt:prompt="${prompt}"`);
	return generateText("gpt-5.2", systemPrompt, prompt);
}
