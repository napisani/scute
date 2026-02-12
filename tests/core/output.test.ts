import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import {
	detectClipboardCommand,
	emitOutput,
	resetClipboardDetectionCache,
	resolveClipboardCommand,
} from "../../src/core/output";

describe("emitOutput", () => {
	let stdoutSpy: ReturnType<typeof spyOn>;

	beforeEach(() => {
		stdoutSpy = spyOn(process.stdout, "write").mockImplementation(() => true);
	});

	afterEach(() => {
		stdoutSpy.mockRestore();
	});

	it("should write text with trailing newline", () => {
		emitOutput("hello");
		expect(stdoutSpy).toHaveBeenCalledWith("hello\n");
	});

	it("should not add extra newline if already present", () => {
		emitOutput("hello\n");
		expect(stdoutSpy).toHaveBeenCalledWith("hello\n");
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
