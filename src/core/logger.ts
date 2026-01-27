import fs from "node:fs";
import { isDebugMode } from "./environment";

const LOG_PATH = "/tmp/brash.log";

export function logDebug(message: string): void {
	if (!isDebugMode()) {
		return;
	}

	const entry = `[${new Date().toISOString()}] ${message}\n`;

	try {
		fs.appendFileSync(LOG_PATH, entry, { encoding: "utf8" });
	} catch (error) {
		// Swallow logging errors to avoid breaking the CLI behavior.
	}
}
