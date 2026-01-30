import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import yaml from "js-yaml";
import type { TokenType } from "../core/shells/common";
import { type Config, ConfigSchema } from "./schema";

const CONFIG_DIR = path.join(os.homedir(), ".config", "brash");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.yaml");

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

export const config = loadConfig();

export type KeybindingAction = "up" | "down" | "explain" | "toggleView";

const defaultKeybindings: Record<KeybindingAction, string[]> = {
	up: ["up", "k"],
	down: ["down", "j"],
	explain: ["e"],
	toggleView: ["v"],
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

export function getKeybindings(action: KeybindingAction): string[] {
	const configured = config.keybindings?.[action];
	return configured?.length ? configured : defaultKeybindings[action];
}

export function getTokenColor(tokenType: TokenType): string {
	return config.tokenColors?.[tokenType] ?? defaultTokenColors[tokenType];
}
