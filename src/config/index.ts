import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import yaml from "js-yaml";
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
