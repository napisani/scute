import { getConfigSnapshot } from "../../src/config";
import type { Config } from "../../src/config/schema";
import type { SupportedProvider } from "../../src/core/constants";

const DEFAULT_SHELL_ENV = {
	BRASH_SHELL: "bash",
	SHELL: "/bin/bash",
	BRASH_DEBUG: "1",
};

const PROVIDER_MODELS: Record<SupportedProvider, string> = {
	openai: "gpt-4o-mini",
	anthropic: "claude-3-haiku-20240307",
	gemini: "gemini-2.5-flash",
	ollama: "qwen3:0.6b",
	// ollama: "qwen3:1.7b",
};

export function hasProviderEnv(provider: SupportedProvider): boolean {
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

export function buildProviderEnv(
	provider: SupportedProvider,
): Record<string, string | undefined> {
	const env = { ...DEFAULT_SHELL_ENV } as Record<string, string | undefined>;
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

export function buildProviderConfig(
	provider: SupportedProvider,
	prompt: "suggest" | "describeTokens" | "explain",
	modelOverride?: string,
): Config {
	const baseConfig = getConfigSnapshot();
	const providerEntry = {
		name: provider,
		apiKey:
			provider === "openai"
				? process.env.OPENAI_API_KEY
				: provider === "anthropic"
					? process.env.ANTHROPIC_API_KEY
					: provider === "gemini"
						? process.env.GEMINI_API_KEY
						: undefined,
		baseUrl: provider === "ollama" ? process.env.OLLAMA_BASE_URL : undefined,
	};
	const model = modelOverride ?? PROVIDER_MODELS[provider];
	return {
		...baseConfig,
		providers: [providerEntry],
		prompts: {
			...baseConfig.prompts,
			[prompt]: {
				...baseConfig.prompts[prompt],
				provider,
				model,
			},
		},
	};
}

export function buildProviderTestContext(
	provider: SupportedProvider,
	prompt: "suggest" | "describeTokens" | "explain",
	modelOverride?: string,
): { env: Record<string, string | undefined>; config: Config } {
	return {
		env: buildProviderEnv(provider),
		config: buildProviderConfig(provider, prompt, modelOverride),
	};
}
