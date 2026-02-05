import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { getShellHelperByName, supportedShells } from "../src/core/shells";
import type { ShellName } from "../src/core/shells/common";

describe("Shell outputToReadline", () => {
	describe.each([...supportedShells])("%s shell", (shellName) => {
		let helper: ReturnType<typeof getShellHelperByName>;
		let stdoutSpy: ReturnType<typeof spyOn>;

		beforeEach(() => {
			helper = getShellHelperByName(shellName as ShellName);
			stdoutSpy = spyOn(process.stdout, "write").mockImplementation(() => true);
		});

		afterEach(() => {
			stdoutSpy.mockRestore();
		});

		describe("outputToReadline", () => {
			it("should be a function", () => {
				expect(typeof helper.outputToReadline).toBe("function");
			});

			it("should write to stdout with ANSI sequences", () => {
				helper.outputToReadline("ls -la");
				expect(stdoutSpy).toHaveBeenCalledTimes(1);
				expect(stdoutSpy).toHaveBeenCalledWith("\r\x1b[2Kls -la");
			});

			it("should trim single trailing newline", () => {
				helper.outputToReadline("ls -la\n");
				expect(stdoutSpy).toHaveBeenCalledWith("\r\x1b[2Kls -la");
			});

			it("should trim multiple trailing newlines", () => {
				helper.outputToReadline("ls -la\n\n\n");
				expect(stdoutSpy).toHaveBeenCalledWith("\r\x1b[2Kls -la");
			});

			it("should trim Windows-style trailing newlines (CRLF)", () => {
				helper.outputToReadline("ls -la\r\n");
				expect(stdoutSpy).toHaveBeenCalledWith("\r\x1b[2Kls -la");
			});

			it("should trim trailing whitespace", () => {
				helper.outputToReadline("ls -la   ");
				expect(stdoutSpy).toHaveBeenCalledWith("\r\x1b[2Kls -la");
			});

			it("should trim trailing whitespace and newlines together", () => {
				helper.outputToReadline("ls -la   \n\n");
				expect(stdoutSpy).toHaveBeenCalledWith("\r\x1b[2Kls -la");
			});

			it("should handle empty string", () => {
				helper.outputToReadline("");
				expect(stdoutSpy).toHaveBeenCalledWith("\r\x1b[2K");
			});

			it("should handle string with only newlines", () => {
				helper.outputToReadline("\n\n");
				expect(stdoutSpy).toHaveBeenCalledWith("\r\x1b[2K");
			});

			it("should handle string with only whitespace", () => {
				helper.outputToReadline("   ");
				expect(stdoutSpy).toHaveBeenCalledWith("\r\x1b[2K");
			});

			it("should preserve internal newlines", () => {
				helper.outputToReadline("echo 'line1\nline2'");
				expect(stdoutSpy).toHaveBeenCalledWith("\r\x1b[2Kecho 'line1\nline2'");
			});

			it("should preserve content with multiple lines ending in newline", () => {
				helper.outputToReadline("echo line1\necho line2\n");
				expect(stdoutSpy).toHaveBeenCalledWith(
					"\r\x1b[2Kecho line1\necho line2",
				);
			});

			it("should handle command with comments", () => {
				helper.outputToReadline("ls -la # list files");
				expect(stdoutSpy).toHaveBeenCalledWith("\r\x1b[2Kls -la # list files");
			});

			it("should handle command with trailing comment and newlines", () => {
				helper.outputToReadline("ls -la # list files\n");
				expect(stdoutSpy).toHaveBeenCalledWith("\r\x1b[2Kls -la # list files");
			});

			it("should handle complex multi-part command", () => {
				helper.outputToReadline("cat file.txt | grep pattern | wc -l\n");
				expect(stdoutSpy).toHaveBeenCalledWith(
					"\r\x1b[2Kcat file.txt | grep pattern | wc -l",
				);
			});

			it("should handle command with quotes and newlines", () => {
				helper.outputToReadline(`echo "hello world"\n`);
				expect(stdoutSpy).toHaveBeenCalledWith(`\r\x1b[2Kecho "hello world"`);
			});

			it("should handle tab characters at end", () => {
				helper.outputToReadline("ls -la\t\t");
				expect(stdoutSpy).toHaveBeenCalledWith("\r\x1b[2Kls -la");
			});

			it("should preserve leading whitespace", () => {
				helper.outputToReadline("  ls -la");
				expect(stdoutSpy).toHaveBeenCalledWith("\r\x1b[2K  ls -la");
			});
		});
	});
});
