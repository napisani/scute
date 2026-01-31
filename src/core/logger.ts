import fs from "node:fs";
import { isDebugMode } from "../config";

const LOG_PATH = "/tmp/brash.log";

function formatArg(arg: unknown): string {
	if (arg instanceof Error) {
		const stack = arg.stack ? `\n${arg.stack}` : "";
		return `${arg.message}${stack}`.trim();
	}
	if (typeof arg === "string") {
		return arg;
	}
	try {
		return JSON.stringify(arg);
	} catch {
		return String(arg);
	}
}

export function logDebug(...args: unknown[]): void {
	if (!isDebugMode()) {
		return;
	}

	const message = args.map(formatArg).join(" ");
	const entry = `[${new Date().toISOString()}] ${message}\n`;

	try {
		fs.appendFileSync(LOG_PATH, entry, { encoding: "utf8" });
	} catch (error) {
		// Swallow logging errors to avoid breaking the CLI behavior.
	}
}
