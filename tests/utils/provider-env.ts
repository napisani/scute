import { getConfigSnapshot } from "../../src/config";
import type { Config } from "../../src/config/schema";
import type { SupportedProvider } from "../../src/core/constants";

const DEFAULT_SHELL_ENV = {
	SCUTE_SHELL: "bash",
	SHELL: "/bin/bash",
	SCUTE_DEBUG: "1",
};

const PROVIDER_MODELS = {
	openai: "gpt-4o-mini",
	anthropic: "claude-3-haiku-20240307",
	gemini: "gemini-2.5-flash",
	ollama: "qwen3:0.6b",
	// ollama: "qwen3:1.7b",
} satisfies Record<SupportedProvider, string>;

export function hasProviderEnv(provider: SupportedProvider): boolean {
	if (provider === "openai") {
		return Boolean(process.env.OPENAI_API_KEY);
	}
	if (provider === "anthropic") {
		return Boolean(process.env.ANTHROPIC_API_KEY);
	}
	if (provider === "gemini") {
		return Boolean(process.env.GEMINI_API_KEY);
	}
	if (provider === "ollama") {
		return Boolean(process.env.OLLAMA_BASE_URL);
	}
	return false;
}

type ProviderEnvVars = {
	SCUTE_SHELL: string;
	SHELL: string;
	SCUTE_DEBUG: string;
	OPENAI_API_KEY?: string;
	ANTHROPIC_API_KEY?: string;
	GEMINI_API_KEY?: string;
	OLLAMA_BASE_URL?: string;
};

export function buildProviderEnv(provider: SupportedProvider): ProviderEnvVars {
	const env: ProviderEnvVars = { ...DEFAULT_SHELL_ENV };
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
) {
	return {
		env: buildProviderEnv(provider),
		config: buildProviderConfig(provider, prompt, modelOverride),
	};
}
