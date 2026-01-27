
export type EnvVarName =
	| "OPENAI_API_KEY"
	| "ANTHROPIC_API_KEY"
	| "GOOGLE_GENERATIVE_AI_API_KEY"
	| "OLLAMA_BASE_URL"
	| "BRASH_DEBUG"
	| "BRASH_SHELL"
	| "SHELL"
	| "READLINE_LINE";

export function getEnv(name: EnvVarName): string | undefined {
	return process.env[name];
}

export function isDebugMode(): boolean {
	return getEnv("BRASH_DEBUG") === "1";
}
