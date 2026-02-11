import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { emitOutput } from "../../src/core/output";

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
