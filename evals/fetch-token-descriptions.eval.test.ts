import { describe, expect, it } from "bun:test";
import { clearCache } from "../src/core/cache";
import { SUPPORTED_PROVIDERS } from "../src/core/constants";
import { tokenizeInput } from "../src/core/shells";
import type { ParsedCommand } from "../src/core/shells/common";
import { fetchTokenDescriptions } from "../src/core/token-descriptions";
import { withMockedEnv } from "../tests/utils/env";
import {
	buildProviderTestContext,
	hasProviderEnv,
} from "../tests/utils/provider-env";

const PLACEHOLDER = "(no description available)";
const evalCases = [
	{ name: "simple", command: "ls -la /tmp" },
	{
		name: "pipes-redirects",
		command: "cat file | grep foo > out.txt",
	},
	{
		name: "env-vars",
		command: "FOO=bar BAR=baz env | grep FOO",
	},
	{
		name: "no-man",
		command: "nonexistentcmd --flag value",
	},
] as const;

async function runEvalCase(command: string) {
	clearCache();
	const tokens = tokenizeInput(command);
	const parsedCommand: ParsedCommand = {
		originalCommand: command,
		tokens,
	};
	const descriptions = await fetchTokenDescriptions(parsedCommand);
	const placeholderCount = descriptions.filter(
		(description) => description === PLACEHOLDER,
	).length;
	const threshold = Math.ceil(tokens.length * 0.2);
	expect(descriptions.length).toBe(tokens.length);
	expect(placeholderCount).toBeLessThanOrEqual(threshold);
}

describe("fetchTokenDescriptions evals", () => {
	for (const provider of SUPPORTED_PROVIDERS) {
		const suite = hasProviderEnv(provider) ? describe : describe.skip;
		suite(provider, () => {
			for (const testCase of evalCases) {
				it(testCase.name, async () => {
					const context = buildProviderTestContext(provider, "describeTokens");
					await withMockedEnv(context, async () => {
						await runEvalCase(testCase.command);
					});
				}, 30_000);
			}
		});
	}
});
