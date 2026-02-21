export const SUPPORTED_ENV_VARS = [
	"OPENAI_API_KEY",
	"ANTHROPIC_API_KEY",
	"GEMINI_API_KEY",
	"OLLAMA_BASE_URL",
	"SCUTE_DEBUG",
	"SCUTE_SHELL",
	"SHELL",
	"READLINE_LINE",
	"SCUTE_DEFAULT_MODEL",
	"SCUTE_DEFAULT_PROVIDER",
	"HISTFILE",
	"HOME",
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
	const debugFlag = getEnv("SCUTE_DEBUG");
	return debugFlag === "1" || debugFlag?.toLowerCase() === "true";
}
