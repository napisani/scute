import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { emitOutput, type OutputChannel } from "../../src/core/output";
import * as shells from "../../src/core/shells";

describe("emitOutput", () => {
	let stdoutSpy: ReturnType<typeof spyOn>;
	let outputToReadlineSpy: ReturnType<typeof spyOn>;

	beforeEach(() => {
		stdoutSpy = spyOn(process.stdout, "write").mockImplementation(() => true);
		outputToReadlineSpy = spyOn(shells, "outputToReadline").mockImplementation(
			() => {},
		);
	});

	afterEach(() => {
		stdoutSpy.mockRestore();
		outputToReadlineSpy.mockRestore();
	});

	describe("readline channel", () => {
		it("should call outputToReadline with the text", () => {
			emitOutput({ channel: "readline" as OutputChannel, text: "ls -la\n" });
			expect(outputToReadlineSpy).toHaveBeenCalledTimes(1);
			expect(outputToReadlineSpy).toHaveBeenCalledWith("ls -la\n");
		});

		it("should not write directly to stdout", () => {
			emitOutput({ channel: "readline" as OutputChannel, text: "echo hello" });
			// outputToReadline is mocked, so stdout.write should not be called by emitOutput
			// (the actual shell helper would call it)
			expect(stdoutSpy).not.toHaveBeenCalled();
		});

		it("should pass empty string to outputToReadline", () => {
			emitOutput({ channel: "readline" as OutputChannel, text: "" });
			expect(outputToReadlineSpy).toHaveBeenCalledWith("");
		});

		it("should pass complex command to outputToReadline", () => {
			const command = "cat file.txt | grep pattern | wc -l\n";
			emitOutput({ channel: "readline" as OutputChannel, text: command });
			expect(outputToReadlineSpy).toHaveBeenCalledWith(command);
		});
	});

	describe("stdout channel", () => {
		it("should write text with trailing newline", () => {
			emitOutput({ channel: "stdout" as OutputChannel, text: "hello" });
			expect(stdoutSpy).toHaveBeenCalledWith("hello\n");
		});

		it("should not add extra newline if already present", () => {
			emitOutput({ channel: "stdout" as OutputChannel, text: "hello\n" });
			expect(stdoutSpy).toHaveBeenCalledWith("hello\n");
		});
	});
});
