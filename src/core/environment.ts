export const SUPPORTED_ENV_VARS = [
	"OPENAI_API_KEY",
	"ANTHROPIC_API_KEY",
	"GEMINI_API_KEY",
	"OLLAMA_BASE_URL",
	"BRASH_DEBUG",
	"BRASH_SHELL",
	"SHELL",
	"READLINE_LINE",
	"BRASH_DEFAULT_MODEL",
	"BRASH_DEFAULT_PROVIDER",
] as const;

export type EnvVarName = (typeof SUPPORTED_ENV_VARS)[number];
type EnvGetter = (name: EnvVarName) => string | undefined;

const defaultEnvGetter: EnvGetter = (name) => process.env[name];
let envGetter: EnvGetter = defaultEnvGetter;

export function getEnv(name: EnvVarName): string | undefined {
	return envGetter(name);
}

export function setEnvGetter(getter: EnvGetter): void {
	envGetter = getter;
}

export function resetEnvGetter(): void {
	envGetter = defaultEnvGetter;
}

export function setEnv(name: EnvVarName, value: string): void {
	process.env[name] = value;
}

export function isDebugMode(): boolean {
	return getEnv("BRASH_DEBUG") === "1";
}
