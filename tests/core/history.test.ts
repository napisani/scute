import { describe, expect, it } from "bun:test";
import { parseHistoryOutput } from "../../src/core/history";

describe("history parsing", () => {
	it("strips numeric prefixes and blank lines", () => {
		const output = "  1  ls -la\n  2  echo hello\n\n  3  git status\n";
		const result = parseHistoryOutput(output);
		expect(result).toEqual(["ls -la", "echo hello", "git status"]);
	});

	it("keeps commands without numeric prefixes", () => {
		const output = "git status\ncd /tmp\n";
		const result = parseHistoryOutput(output);
		expect(result).toEqual(["git status", "cd /tmp"]);
	});

	it("strips zsh extended history format (: timestamp:0;command)", () => {
		const output =
			": 1700000000:0;ls -la\n: 1700000001:0;echo hello\n: 1700000002:0;git status\n";
		const result = parseHistoryOutput(output);
		expect(result).toEqual(["ls -la", "echo hello", "git status"]);
	});

	it("handles mixed plain and zsh extended format lines", () => {
		const output = "ls -la\n: 1700000001:0;echo hello\ngit status\n";
		const result = parseHistoryOutput(output);
		expect(result).toEqual(["ls -la", "echo hello", "git status"]);
	});
});
