import fs from "node:fs";

const LOG_PATH = "/tmp/brash.log";
const isDebug = process.env.BRASH_DEBUG === "1";

export function logDebug(message: string): void {
	if (!isDebug) {
		return;
	}

	const entry = `[${new Date().toISOString()}] ${message}\n`;

	try {
		fs.appendFileSync(LOG_PATH, entry, { encoding: "utf8" });
	} catch (error) {
		// Swallow logging errors to avoid breaking the CLI behavior.
	}
}
