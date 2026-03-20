import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
	detectClipboardCommand,
	emitOutput,
	resetClipboardDetectionCache,
	resolveClipboardCommand,
} from "../../src/core/output";

describe("emitOutput", () => {
	let stdoutSpy: ReturnType<typeof spyOn>;
	let stderrSpy: ReturnType<typeof spyOn>;

	beforeEach(() => {
		stdoutSpy = spyOn(process.stdout, "write").mockImplementation(() => true);
		stderrSpy = spyOn(process.stderr, "write").mockImplementation(() => true);
	});

	afterEach(() => {
		stdoutSpy.mockRestore();
		stderrSpy.mockRestore();
	});

	it("should write text with trailing newline", () => {
		emitOutput("hello");
		expect(stdoutSpy).toHaveBeenCalledWith("hello\n");
	});

	it("should not add extra newline if already present", () => {
		emitOutput("hello\n");
		expect(stdoutSpy).toHaveBeenCalledWith("hello\n");
	});

	it("should echo to stderr for visibility when no output file", () => {
		emitOutput("hello");
		expect(stderrSpy).toHaveBeenCalledWith("hello\n");
	});
});

describe("emitOutput with SCUTE_OUTPUT_FILE", () => {
	let tmpFile: string;

	beforeEach(() => {
		tmpFile = path.join(os.tmpdir(), `scute-test-${Date.now()}.txt`);
		process.env.SCUTE_OUTPUT_FILE = tmpFile;
	});

	afterEach(() => {
		delete process.env.SCUTE_OUTPUT_FILE;
		try {
			fs.unlinkSync(tmpFile);
		} catch {
			// ignore if file doesn't exist
		}
	});

	it("should write to file when SCUTE_OUTPUT_FILE is set", () => {
		emitOutput("hello from file");
		const content = fs.readFileSync(tmpFile, "utf8");
		expect(content).toBe("hello from file\n");
	});

	it("should not write to stdout when SCUTE_OUTPUT_FILE is set", () => {
		const stdoutSpy = spyOn(process.stdout, "write").mockImplementation(
			() => true,
		);
		emitOutput("hello from file");
		expect(stdoutSpy).not.toHaveBeenCalled();
		stdoutSpy.mockRestore();
	});
});

describe("resolveClipboardCommand", () => {
	afterEach(() => {
		resetClipboardDetectionCache();
	});

	it("returns null for undefined", () => {
		expect(resolveClipboardCommand(undefined)).toBeNull();
	});

	it("returns null for empty string", () => {
		expect(resolveClipboardCommand("")).toBeNull();
	});

	it("returns the command as-is for a non-auto string", () => {
		expect(resolveClipboardCommand("pbcopy")).toBe("pbcopy");
	});

	it("returns the command as-is for a multi-word string", () => {
		expect(resolveClipboardCommand("xclip -selection clipboard")).toBe(
			"xclip -selection clipboard",
		);
	});

	it('resolves "auto" to a detected command', () => {
		const result = resolveClipboardCommand("auto");
		// On macOS CI/dev this should find pbcopy; on Linux it depends.
		// We just verify it returns a string or null (no crash).
		expect(result === null || typeof result === "string").toBe(true);
	});

	it('caches the "auto" result on subsequent calls', () => {
		const first = resolveClipboardCommand("auto");
		const second = resolveClipboardCommand("auto");
		expect(second).toBe(first);
	});

	it("resets cache when resetClipboardDetectionCache is called", () => {
		resolveClipboardCommand("auto");
		resetClipboardDetectionCache();
		// After reset, the next call re-probes (should still get same result but cache was cleared)
		const result = resolveClipboardCommand("auto");
		expect(result === null || typeof result === "string").toBe(true);
	});
});

describe("detectClipboardCommand", () => {
	it("returns a string or null", () => {
		const result = detectClipboardCommand();
		expect(result === null || typeof result === "string").toBe(true);
	});

	it("returns a known clipboard command on macOS", () => {
		if (process.platform !== "darwin") {
			return; // skip on non-macOS
		}
		const result = detectClipboardCommand();
		expect(result).toBe("pbcopy");
	});
});
