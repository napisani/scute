import { describe, expect, it } from "bun:test";
import { getConfigSnapshot } from "../src/config";
import { clearCache } from "../src/core/cache";
import {
	SUPPORTED_PROVIDERS,
	type SupportedProvider,
} from "../src/core/constants";
import { tokenizeInput } from "../src/core/shells";
import type { ParsedCommand } from "../src/core/shells/common";
import { fetchTokenDescriptions } from "../src/core/token-descriptions";
import { withMockedEnv } from "../tests/utils/env";

const PLACEHOLDER = "(no description available)";
const evalCases = [
	{ name: "simple", command: "ls -la /tmp" },
	{
		name: "pipes-redirects",
		command: "cat file | grep foo > out.txt",
	},
	{
		name: "env-vars",
		command: "FOO=bar BAR=baz env | grep FOO",
	},
	{
		name: "no-man",
		command: "nonexistentcmd --flag value",
	},
] as const;

function getProviderEnv(
	provider: SupportedProvider,
): Record<string, string | undefined> {
	const env: Record<string, string | undefined> = {
		BRASH_SHELL: "bash",
		SHELL: "/bin/bash",
		BRASH_DEBUG: "1",
	};
	if (provider === "openai") {
		env.OPENAI_API_KEY = process.env.OPENAI_API_KEY;
	}
	if (provider === "anthropic") {
		env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
	}
	if (provider === "gemini") {
		env.GEMINI_API_KEY = process.env.GEMINI_API_KEY;
	}
	if (provider === "ollama") {
		env.OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL;
	}
	return env;
}

function hasRequiredEnv(provider: SupportedProvider): boolean {
	if (provider === "openai") {
		return !!process.env.OPENAI_API_KEY;
	}
	if (provider === "anthropic") {
		return !!process.env.ANTHROPIC_API_KEY;
	}
	if (provider === "gemini") {
		return !!process.env.GEMINI_API_KEY;
	}
	if (provider === "ollama") {
		return !!process.env.OLLAMA_BASE_URL;
	}
	return false;
}

function buildConfigOverride(provider: SupportedProvider) {
	const baseConfig = getConfigSnapshot();
	let apiKey: string | undefined;
	let baseUrl: string | undefined;
	let model: string | undefined;
	if (provider === "openai") {
		apiKey = process.env.OPENAI_API_KEY;
		model = "gpt-4o-mini";
	}
	if (provider === "anthropic") {
		apiKey = process.env.ANTHROPIC_API_KEY;
		model = "claude-2";
	}
	if (provider === "gemini") {
		apiKey = process.env.GEMINI_API_KEY;
		model = "gemini-2.5-flash";
	}
	if (provider === "ollama") {
		baseUrl = process.env.OLLAMA_BASE_URL;
		model = "qwen:0.6b";
	}
	const providerEntry = {
		name: provider,
		apiKey,
		baseUrl,
	};
	const resolvedModel = model ?? baseConfig.prompts.describeTokens.model;
	const c = {
		...baseConfig,
		providers: [providerEntry],
		prompts: {
			...baseConfig.prompts,
			describeTokens: {
				...baseConfig.prompts.describeTokens,
				provider,
				model: resolvedModel,
			},
		},
	};
	return c;
}

async function runEvalCase(command: string) {
	clearCache();
	const tokens = tokenizeInput(command);
	const parsedCommand: ParsedCommand = {
		originalCommand: command,
		tokens,
	};
	const descriptions = await fetchTokenDescriptions(parsedCommand);
	const placeholderCount = descriptions.filter(
		(description) => description === PLACEHOLDER,
	).length;
	const threshold = Math.ceil(tokens.length * 0.2);
	expect(descriptions.length).toBe(tokens.length);
	expect(placeholderCount).toBeLessThanOrEqual(threshold);
}

describe("fetchTokenDescriptions evals", () => {
	for (const provider of SUPPORTED_PROVIDERS) {
		if (provider !== "ollama") continue; // Temporarily limit to Ollama for faster testing
		const hasEnv = hasRequiredEnv(provider);
		const suite = hasEnv ? describe : describe.skip;
		suite(provider, () => {
			for (const testCase of evalCases) {
				it(testCase.name, async () => {
					const env = getProviderEnv(provider);
					const configOverride = buildConfigOverride(provider);
					await withMockedEnv({ env, config: configOverride }, async () => {
						await runEvalCase(testCase.command);
					});
				}, 30_000);
			}
		});
	}
});
