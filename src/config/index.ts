import "dotenv/config";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import yaml from "js-yaml";
import { SUPPORTED_PROVIDERS } from "../core/constants";
import { getEnv, resetEnvGetter, setEnvGetter } from "../core/environment";
import type { TokenType } from "../core/shells/common";
import type { PromptName, ThemeConfig } from "./schema";
import { type Config, ConfigSchema } from "./schema";

const CONFIG_DIR = path.join(os.homedir(), ".config", "brash");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.yaml");

type RuntimeEnv = {
	brashDebug?: string;
	brashShell?: string;
	shell?: string;
	readlineLine?: string;
};

export function loadConfig(): Config {
	if (!fs.existsSync(CONFIG_FILE)) {
		return ConfigSchema.parse({});
	}

	try {
		const fileContents = fs.readFileSync(CONFIG_FILE, "utf8");
		const data = yaml.load(fileContents);
		return ConfigSchema.parse(data);
	} catch (error) {
		console.error(`Error loading config from ${CONFIG_FILE}:`, error);
		// Return defaults if config fails to load to prevent crash,
		// but typically we might want to warn the user.
		return ConfigSchema.parse({});
	}
}

let config = applyEnvOverrides(loadConfig());
let runtimeEnv = loadRuntimeEnv();

function loadRuntimeEnv(): RuntimeEnv {
	return {
		brashDebug: getEnv("BRASH_DEBUG"),
		brashShell: getEnv("BRASH_SHELL"),
		shell: getEnv("SHELL"),
		readlineLine: getEnv("READLINE_LINE"),
	};
}

function applyEnvOverrides(baseConfig: Config): Config {
	const mergedProviders = [...baseConfig.providers];
	for (const provider of SUPPORTED_PROVIDERS) {
		const envValue = getEnv(
			provider === "openai"
				? "OPENAI_API_KEY"
				: provider === "anthropic"
					? "ANTHROPIC_API_KEY"
					: provider === "gemini"
						? "GEMINI_API_KEY"
						: "OLLAMA_BASE_URL",
		);
		if (!envValue) {
			continue;
		}
		const index = mergedProviders.findIndex((entry) => entry.name === provider);
		const updated = {
			name: provider,
			apiKey: provider === "ollama" ? undefined : envValue,
			baseUrl: provider === "ollama" ? envValue : undefined,
		};
		if (index >= 0) {
			mergedProviders[index] = { ...mergedProviders[index], ...updated };
		} else {
			mergedProviders.push(updated);
		}
	}
	return { ...baseConfig, providers: mergedProviders };
}

export function setConfigOverride(override?: Config): void {
	config = applyEnvOverrides(override ?? loadConfig());
	runtimeEnv = loadRuntimeEnv();
}

export function resetConfigOverride(): void {
	config = applyEnvOverrides(loadConfig());
	runtimeEnv = loadRuntimeEnv();
}

export function getConfigSnapshot(): Config {
	return structuredClone(config);
}

export type KeybindingAction =
	| "up"
	| "down"
	| "left"
	| "right"
	| "wordForward"
	| "wordBackward"
	| "lineStart"
	| "lineEnd"
	| "firstToken"
	| "lastToken"
	| "explain"
	| "toggleView"
	| "insert"
	| "append"
	| "change"
	| "exitInsert"
	| "save";

const defaultKeybindings: Record<KeybindingAction, string[]> = {
	up: ["up"],
	down: ["down"],
	left: ["left", "h"],
	right: ["right", "l"],
	wordForward: ["w"],
	wordBackward: ["b"],
	lineStart: ["0", "^"],
	lineEnd: ["$"],
	firstToken: ["g"],
	lastToken: ["G"],
	explain: ["e"],
	toggleView: ["m"],
	insert: ["i"],
	append: ["a"],
	change: ["c"],
	exitInsert: ["escape"],
	save: ["return"],
};

const defaultTokenColors: Record<TokenType, string> = {
	command: "#A6E3A1",
	option: "#FAB387",
	argument: "#89B4FA",
	assignment: "#CBA6F7",
	pipe: "#94E2D5",
	controlOperator: "#F38BA8",
	redirect: "#CDD6F4",
	unknown: "#6C7086",
};

const defaultTheme: ThemeConfig = {
	tokenColors: defaultTokenColors,
	tokenDescription: "#CDD6F4",
	markerColor: "#CDD6F4",
};

export function getKeybindings(action: KeybindingAction): string[] {
	const configured = config.keybindings?.[action];
	return configured?.length ? [...configured] : [...defaultKeybindings[action]];
}

export function getTokenColor(tokenType: TokenType): string {
	return (
		config.theme?.tokenColors?.[tokenType] ?? defaultTokenColors[tokenType]
	);
}

export type ThemeColorAttribute = Exclude<keyof ThemeConfig, "tokenColors">;

export function getThemeColorFor(attr: ThemeColorAttribute): string {
	return config.theme?.[attr] ?? defaultTheme[attr];
}

export function getPromptConfig(name: PromptName) {
	return { ...config.prompts[name] };
}

export function getProviders() {
	return config.providers.map((provider) => ({ ...provider }));
}

export function getProviderConfig(name: string) {
	const provider = config.providers.find((entry) => entry.name === name);
	return provider ? { ...provider } : undefined;
}

export function getProviderApiKey(name: string): string | undefined {
	return getProviderConfig(name)?.apiKey;
}

export function getProviderBaseUrl(name: string): string | undefined {
	return getProviderConfig(name)?.baseUrl;
}

export function getShellName(): string | undefined {
	const shell = runtimeEnv.brashShell ?? runtimeEnv.shell;
	if (!shell) {
		return undefined;
	}
	const parts = shell.split("/");
	return parts[parts.length - 1] || shell;
}

export function getReadlineLine(): string | undefined {
	return runtimeEnv.readlineLine;
}

export function hasReadlineLine(): boolean {
	const line = getReadlineLine();
	return !!line && line.length > 0;
}

export function isDebugMode(): boolean {
	return runtimeEnv.brashDebug === "1";
}

export { resetEnvGetter, setEnvGetter };
