import { describe, expect, it } from "bun:test";
import { sanitizeCommandOutput } from "../src/core/command-output";

describe("sanitizeCommandOutput", () => {
	it("returns a single line command", () => {
		expect(sanitizeCommandOutput("ls -altr /tmp")).toBe("ls -altr /tmp");
	});

	it("strips code fences", () => {
		const input = "```bash\nls -altr /tmp\n```";
		expect(sanitizeCommandOutput(input)).toBe("ls -altr /tmp");
	});

	it("strips common labels", () => {
		const input = "Command: ls -altr /tmp";
		expect(sanitizeCommandOutput(input)).toBe("ls -altr /tmp");
	});

	it("strips shell prompt prefixes", () => {
		const input = "$ ls -altr /tmp";
		expect(sanitizeCommandOutput(input)).toBe("ls -altr /tmp");
	});

	it("picks command after a label line", () => {
		const input = "Here is the command:\n\nls -altr /tmp";
		expect(sanitizeCommandOutput(input)).toBe("ls -altr /tmp");
	});

	it("removes ANSI sequences", () => {
		const input = "\u001b[2Kls -altr /tmp";
		expect(sanitizeCommandOutput(input)).toBe("ls -altr /tmp");
	});
});
