import { afterAll, describe, expect, it } from "bun:test";
import { performance } from "node:perf_hooks";
import { SUPPORTED_PROVIDERS } from "../src/core/constants";
import { suggest } from "../src/core/llm";
import { withMockedEnv } from "../tests/utils/env";
import {
	buildProviderTestContext,
	hasProviderEnv,
} from "../tests/utils/provider-env";

type SuggestMetric = {
	provider: string;
	caseName: string;
	input: string;
	outputLength: number;
	addedChars: number;
	startsWithInput: boolean;
	includesPrefix: boolean;
	containsComment: boolean;
	durationMs: number;
};

const MODEL_OVERRIDE = "qwen3:1.7b";
const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434";

const suggestResults: SuggestMetric[] = [];

process.env.OLLAMA_BASE_URL ??= DEFAULT_OLLAMA_BASE_URL;

const suggestCases = [
	{
		name: "list-directory",
		input: "ls -",
	},
	{
		name: "grep-comment",
		input: "grep TODO # find TODO comments",
	},
	{
		name: "git-checkout",
		input: "git che",
	},
] as const;

async function runSuggestCase(input: string) {
	const start = performance.now();
	const result = await suggest(input);
	const durationMs = performance.now() - start;
	expect(result).toBeTruthy();
	const suggestion = result?.trim() ?? "";
	const inputTrimmed = input.trim();
	const inputPrefix = inputTrimmed.split("#")[0]?.trimEnd() ?? inputTrimmed;
	expect(suggestion.length).toBeGreaterThan(inputPrefix.length);
	expect(suggestion.length).toBeLessThanOrEqual(4096);
	const startsWithInput = suggestion.startsWith(inputPrefix);
	const includesPrefix = suggestion
		.toLowerCase()
		.includes(inputPrefix.toLowerCase());
	expect(includesPrefix).toBeTruthy();
	const containsComment = suggestion.includes("#");
	const addedChars = suggestion.length - inputPrefix.length;
	return {
		suggestion,
		outputLength: suggestion.length,
		addedChars,
		startsWithInput,
		includesPrefix,
		containsComment,
		durationMs,
	};
}

describe("suggest command evals", () => {
	for (const provider of SUPPORTED_PROVIDERS.filter((p) => p === "ollama")) {
		const suite = hasProviderEnv(provider) ? describe : describe.skip;
		suite(provider, () => {
			for (const testCase of suggestCases) {
				it(testCase.name, async () => {
					const context = buildProviderTestContext(
						provider,
						"suggest",
						MODEL_OVERRIDE,
					);
					context.env.OLLAMA_BASE_URL ??= DEFAULT_OLLAMA_BASE_URL;
					await withMockedEnv(context, async () => {
						const metrics = await runSuggestCase(testCase.input);
						suggestResults.push({
							provider,
							caseName: testCase.name,
							input: testCase.input,
							outputLength: metrics.outputLength,
							addedChars: metrics.addedChars,
							startsWithInput: metrics.startsWithInput,
							includesPrefix: metrics.includesPrefix,
							containsComment: metrics.containsComment,
							durationMs: metrics.durationMs,
						});
						console.log(
							`[suggest-baseline] provider=${provider} case=${testCase.name} outputLength=${metrics.outputLength} addedChars=${metrics.addedChars} durationMs=${metrics.durationMs.toFixed(1)}`,
						);
					});
				}, 120_000);
			}
		});
	}
});

afterAll(() => {
	if (!suggestResults.length) {
		return;
	}
	console.log(
		`Suggest baseline (${MODEL_OVERRIDE} @ ${
			process.env.OLLAMA_BASE_URL ?? DEFAULT_OLLAMA_BASE_URL
		})`,
	);
	for (const result of suggestResults) {
		console.log(
			`- ${result.provider}/${result.caseName}: input="${result.input}" outputLength=${result.outputLength} addedChars=${result.addedChars} startsWithInput=${result.startsWithInput} includesPrefix=${result.includesPrefix} containsComment=${result.containsComment} durationMs=${result.durationMs.toFixed(1)}`,
		);
	}
});
