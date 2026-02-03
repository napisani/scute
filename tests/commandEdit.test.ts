import { describe, expect, it } from "bun:test";
import { resetShellCache, tokenizeInput } from "../src/core/shells";
import { applyTokenEdit } from "../src/pages/build";
import { withMockedEnv } from "./utils/env";

describe("command editing", () => {
	it("splices edited tokens into the command", async () => {
		await withMockedEnv(
			{ env: { BRASH_SHELL: "bash", SHELL: "/bin/bash" } },
			async () => {
				resetShellCache();
				const initialCommand = "ls -altr /var/log";
				const prev = {
					tokens: tokenizeInput(initialCommand),
					originalCommand: initialCommand,
				};
				const updated = applyTokenEdit(
					prev,
					0,
					'cat /var/log/syslog && echo "done" && ',
				);
				const expectedCommand =
					'cat /var/log/syslog && echo "done" && ls -altr /var/log';
				expect(updated.originalCommand).toBe(expectedCommand);
				expect(updated.tokens).toEqual(tokenizeInput(expectedCommand));
			},
		);
	});
});
