import fs from "node:fs";
import { isDebugMode } from "../config";

const LOG_PATH = "/tmp/brash.log";
const TRACE_LOG_PATH = "/tmp/brash-trace.log";
const TRACE_STRING_LIMIT = 200;

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

function sanitizeTracePayload(
	payload: Record<string, unknown>,
): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(payload)) {
		if (typeof value === "string" && value.length > TRACE_STRING_LIMIT) {
			result[key] = `${value.slice(0, TRACE_STRING_LIMIT)}…`;
			continue;
		}
		result[key] = value;
	}
	return result;
}

export function logTrace(
	scope: string,
	payload: Record<string, unknown> = {},
): void {
	if (!isDebugMode()) {
		return;
	}

	const safePayload = sanitizeTracePayload(payload);
	let serialized = "";
	try {
		serialized = JSON.stringify(safePayload);
	} catch {
		serialized = JSON.stringify({ error: "trace_payload_not_serializable" });
	}
	const entry = `[${new Date().toISOString()}] [${scope}] ${serialized}\n`;

	try {
		fs.appendFileSync(TRACE_LOG_PATH, entry, { encoding: "utf8" });
	} catch (error) {
		// Ignore trace logging errors to avoid affecting runtime behaviour.
	}
}
