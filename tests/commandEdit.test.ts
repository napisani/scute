import { describe, expect, it } from "bun:test";
import { resetShellCache, tokenizeInput } from "../src/core/shells";
import { applyTokenEdit } from "../src/pages/build";
import { withMockedEnv } from "./utils/env";

describe("command editing", () => {
	it("splices edited tokens into the command", async () => {
		await withMockedEnv(
			{ env: { SCUTE_SHELL: "bash", SHELL: "/bin/bash" } },
			async () => {
				resetShellCache();
				const initialCommand = "ls -altr /var/log";
				const prev = {
					tokens: tokenizeInput(initialCommand),
					originalCommand: initialCommand,
				};
				const result = applyTokenEdit(
					prev,
					0,
					'cat /var/log/syslog && echo "done" && ls',
				);
				const updated = result.command;
				const expectedCommand =
					'cat /var/log/syslog && echo "done" && ls -altr /var/log';
				expect(updated.originalCommand).toBe(expectedCommand);
				expect(updated.tokens).toEqual(tokenizeInput(expectedCommand));
			},
		);
	});

	it("replaces the targeted token when editing", async () => {
		await withMockedEnv(
			{ env: { SCUTE_SHELL: "bash", SHELL: "/bin/bash" } },
			async () => {
				resetShellCache();
				const initialCommand = "npm run build";
				const prev = {
					tokens: tokenizeInput(initialCommand),
					originalCommand: initialCommand,
				};
				const { command: updated } = applyTokenEdit(prev, 2, "test");
				const expectedCommand = "npm run test";
				expect(updated.originalCommand).toBe(expectedCommand);
				expect(updated.tokens).toEqual(tokenizeInput(expectedCommand));
			},
		);
	});
});
