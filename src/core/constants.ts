export const DEFAULT_PROVIDER = "openai";
export const DEFAULT_MODEL = "gpt-4o-mini";
export const DEFAULT_TEMPERATURE = 0.7;
export const DEFAULT_MAX_TOKENS = 128_000;

export const SUPPORTED_PROVIDERS = [
	"openai",
	"anthropic",
	"gemini",
	"ollama",
] as const;

export type SupportedProvider = (typeof SUPPORTED_PROVIDERS)[number];
