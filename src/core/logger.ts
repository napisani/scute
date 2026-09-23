import fs from "node:fs";
import { isDebugMode } from "../config";

const LOG_PATH = "/tmp/scute.log";
const TRACE_LOG_PATH = "/tmp/scute-trace.log";
const TRACE_ENTRY_LIMIT = 4_000;

/**
 * Everything logDebug ever receives across the codebase: literal debug strings
 * and caught errors (callers normalize thrown values to `Error` before logging,
 * so this function never has to guess at an unparsed shape).
 */
export type LogArgument = string | number | boolean | null | undefined | Error;

function formatArg(arg: LogArgument): string {
	if (arg instanceof Error) {
		const stack = arg.stack ? `\n${arg.stack}` : "";
		return `${arg.message}${stack}`.trim();
	}
	return String(arg);
}

export function logDebug(...args: LogArgument[]): void {
	if (!isDebugMode()) {
		return;
	}

	const message = args.map(formatArg).join(" ");
	const entry = `[${new Date().toISOString()}] ${message}\n`;

	try {
		fs.appendFileSync(LOG_PATH, entry, { encoding: "utf8" });
	} catch {
		// Swallow logging errors to avoid breaking the CLI behavior.
	}
}

/** A trace payload value, as actually passed by every `logTrace` call site: a primitive. */
export type TracePrimitive = string | number | boolean | null;
export type TracePayload = Record<string, TracePrimitive>;

function truncate(text: string, maxLength: number): string {
	return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}

export function logTrace(scope: string, payload: TracePayload = {}): void {
	if (!isDebugMode()) {
		return;
	}

	let serialized: string;
	try {
		serialized = truncate(JSON.stringify(payload), TRACE_ENTRY_LIMIT);
	} catch {
		serialized = JSON.stringify({ error: "trace_payload_not_serializable" });
	}
	const entry = `[${new Date().toISOString()}] [${scope}] ${serialized}\n`;

	try {
		fs.appendFileSync(TRACE_LOG_PATH, entry, { encoding: "utf8" });
	} catch {
		// Ignore trace logging errors to avoid affecting runtime behaviour.
	}
}
