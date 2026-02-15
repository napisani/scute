import "dotenv/config";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import yaml from "js-yaml";
import { SUPPORTED_PROVIDERS } from "../core/constants";
import { getEnv, resetEnvGetter, setEnvGetter } from "../core/environment";
import type { TokenType } from "../core/shells/common";
import type {
	ChooseMenuColorsConfig,
	PromptName,
	PromptOverridesConfig,
	ShellKeybindingAction,
	ThemeConfig,
} from "./schema";
import { type Config, ConfigSchema, ShellKeybindingActions } from "./schema";

const CONFIG_DIR = path.join(os.homedir(), ".config", "scute");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.yaml");

type RuntimeEnv = {
	scuteDebug?: string;
	scuteShell?: string;
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

export function loadConfigFromPath(configFile: string): Config {
	if (!fs.existsSync(configFile)) {
		throw new Error(`Config file not found: ${configFile}`);
	}

	try {
		const fileContents = fs.readFileSync(configFile, "utf8");
		const data = yaml.load(fileContents);
		return ConfigSchema.parse(data);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		throw new Error(`Error loading config from ${configFile}: ${message}`);
	}
}

let config = applyEnvOverrides(loadConfig());
let runtimeEnv = loadRuntimeEnv();

function loadRuntimeEnv(): RuntimeEnv {
	return {
		scuteDebug: getEnv("SCUTE_DEBUG"),
		scuteShell: getEnv("SCUTE_SHELL"),
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
			...(provider === "ollama" ? { baseUrl: envValue } : { apiKey: envValue }),
		};
		if (index >= 0) {
			mergedProviders[index] = { ...mergedProviders[index], ...updated };
		} else {
			mergedProviders.push(updated as (typeof mergedProviders)[0]);
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

export type NormalKeybindingAction =
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
	| "appendLine"
	| "insert"
	| "append"
	| "change"
	| "exitInsert"
	| "save";

export type LeaderKeybindingAction =
	| "explain"
	| "toggleView"
	| "quit"
	| "submit"
	| "suggest"
	| "generate";

const defaultNormalKeybindings: Record<NormalKeybindingAction, string[]> = {
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
	appendLine: ["A"],
	insert: ["i"],
	append: ["a"],
	change: ["c"],
	exitInsert: ["escape"],
	save: ["return"],
};

const defaultLeaderKeybindings: Record<LeaderKeybindingAction, string[]> = {
	explain: ["e"],
	toggleView: ["m"],
	quit: ["q"],
	submit: ["return"],
	suggest: ["s"],
	generate: ["g"],
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

const defaultChooseMenuColors: ChooseMenuColorsConfig = {
	border: "#585B70",
	title: "#CBA6F7",
	text: "#CDD6F4",
	description: "#6C7086",
	shortcutKey: "#CBA6F7",
	pointer: "#A6E3A1",
	highlightBg: "#45475A",
};

const defaultTheme: ThemeConfig = {
	tokenColors: defaultTokenColors,
	tokenDescription: "#CDD6F4",
	markerColor: "#CDD6F4",
	modeInsertColor: "#A6E3A1",
	modeNormalColor: "#6C7086",
	errorColor: "#F38BA8",
	hintLabelColor: "#6C7086",
	cursorColor: "#F5E0DC",
	chooseMenu: defaultChooseMenuColors,
};

const defaultShellKeybindings: Record<ShellKeybindingAction, string[]> = {
	explain: [],
	build: [],
	suggest: [],
	generate: [],
	choose: ["Ctrl+E"],
};

export function getNormalKeybindings(action: NormalKeybindingAction): string[] {
	const configured = config.normalKeybindings?.[action];
	return configured?.length
		? [...configured]
		: [...defaultNormalKeybindings[action]];
}

export function getLeaderKeybindings(action: LeaderKeybindingAction): string[] {
	const configured = config.leaderKeybindings?.[action];
	return configured?.length
		? [...configured]
		: [...defaultLeaderKeybindings[action]];
}

export function getLeaderKey(): string[] {
	const configured = config.leaderKey;
	return configured?.length ? [...configured] : ["space"];
}

export function getTokenColor(tokenType: TokenType): string {
	return (
		config.theme?.tokenColors?.[tokenType] ?? defaultTokenColors[tokenType]
	);
}

export type ThemeColorAttribute = Exclude<
	keyof ThemeConfig,
	"tokenColors" | "chooseMenu"
>;

export function getThemeColorFor(attr: ThemeColorAttribute): string {
	return config.theme?.[attr] ?? defaultTheme[attr];
}

export function getChooseMenuColors(): ChooseMenuColorsConfig {
	return { ...defaultChooseMenuColors, ...config.theme?.chooseMenu };
}

export function getPromptConfig(name: PromptName) {
	const defaults = config.promptDefaults;
	const overrides = config.prompts[name] as PromptOverridesConfig;
	return { ...defaults, ...overrides };
}

export function getShellKeybindings(): Record<ShellKeybindingAction, string[]> {
	const configured = config.shellKeybindings ?? {};
	const resolve = (action: ShellKeybindingAction) => {
		const value = configured[action];
		if (!value) return [...defaultShellKeybindings[action]];
		return Array.isArray(value) ? [...value] : [value];
	};
	return ShellKeybindingActions.reduce(
		(acc, action) => {
			acc[action] = resolve(action);
			return acc;
		},
		{} as Record<ShellKeybindingAction, string[]>,
	);
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
	const shell = runtimeEnv.scuteShell ?? runtimeEnv.shell;
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

export function getInitialViewMode(): "annotated" | "list" {
	return config.viewMode === "horizontal" ? "annotated" : "list";
}

export function isDebugMode(): boolean {
	const debugFlag = runtimeEnv.scuteDebug;
	return debugFlag === "1" || debugFlag?.toLowerCase() === "true";
}

export { resetEnvGetter, setEnvGetter };
