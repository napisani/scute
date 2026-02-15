import { describe, expect, it } from "bun:test";
import { resolveBuildCommand } from "../src/commands/build";

describe("resolveBuildCommand", () => {
	it("prefers positional arguments when provided", () => {
		const result = resolveBuildCommand(["git", "status"], {
			hasReadlineLine: true,
			readlineLine: "echo hello",
		});
		expect(result).toBe("git status");
	});

	it("falls back to readline when positional args missing", () => {
		const result = resolveBuildCommand([], {
			hasReadlineLine: true,
			readlineLine: "npm run build",
		});
		expect(result).toBe("npm run build");
	});

	it("returns empty string when no inputs available", () => {
		const result = resolveBuildCommand([], {
			hasReadlineLine: false,
			readlineLine: null,
		});
		expect(result).toBe("");
	});
});
