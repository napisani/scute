import { describe, expect, it } from "bun:test";
import { withMockedEnv } from "./utils/env";

const shells = ["bash", "zsh", "sh"] as const;

async function loadShellModule(shell: string) {
	return await import(`../src/core/shells/index.ts?${shell}`);
}

describe("shell parsing", () => {
	for (const shell of shells) {
		describe(shell, () => {
			it("identifies shell and tokenizes", async () => {
				await withMockedEnv(
					{ BRASH_SHELL: shell, SHELL: `/bin/${shell}` },
					async () => {
						const module = await loadShellModule(shell);
						module.resetShellCache();
						expect(module.identifyShell()).toBe(shell);
						const tokens = module.tokenizeInput('echo "hello world"');
						expect(tokens).toEqual(["echo", "hello world"]);
					},
				);
			});

			it("parses options and arguments", async () => {
				await withMockedEnv(
					{ BRASH_SHELL: shell, SHELL: `/bin/${shell}` },
					async () => {
						const module = await loadShellModule(shell);
						module.resetShellCache();
						const tokens = module.tokenizeInput("grep -f file pattern");
						const parsed = module.parseTokens(tokens);
						expect(parsed.map((token: { type: string }) => token.type)).toEqual(
							["command", "option", "argument", "argument"],
						);
						expect(parsed[1]).toMatchObject({ value: "-f" });
						expect(parsed[2]).toMatchObject({ value: "file" });
						expect(parsed[3]).toMatchObject({ value: "pattern" });
					},
				);
			});

			it("parses pipes, control operators, and redirects", async () => {
				await withMockedEnv(
					{ BRASH_SHELL: shell, SHELL: `/bin/${shell}` },
					async () => {
						const module = await loadShellModule(shell);
						module.resetShellCache();
						const tokens = module.tokenizeInput(
							"cat file | grep foo && echo done > out.txt",
						);
						const parsed = module.parseTokens(tokens);
						expect(parsed.map((token: { type: string }) => token.type)).toEqual(
							[
								"command",
								"argument",
								"pipe",
								"command",
								"argument",
								"controlOperator",
								"command",
								"argument",
								"redirect",
								"argument",
							],
						);
					},
				);
			});

			it("exposes readline helpers", async () => {
				await withMockedEnv(
					{
						BRASH_SHELL: shell,
						SHELL: `/bin/${shell}`,
						READLINE_LINE: "ls -la",
					},
					async () => {
						const module = await loadShellModule(shell);
						module.resetShellCache();
						expect(module.getReadlineLine()).toBe("ls -la");
						expect(module.hasReadlineLine()).toBe(true);
					},
				);
				await withMockedEnv(
					{ BRASH_SHELL: shell, SHELL: `/bin/${shell}` },
					async () => {
						const module = await loadShellModule(shell);
						module.resetShellCache();
						expect(module.getReadlineLine()).toBeNull();
						expect(module.hasReadlineLine()).toBe(false);
					},
				);
			});
		});
	}
});
