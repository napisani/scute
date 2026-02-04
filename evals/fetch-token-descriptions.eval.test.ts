import { afterAll, describe, expect, it } from "bun:test";
import { performance } from "node:perf_hooks";
import { clearCache } from "../src/core/cache";
import { SUPPORTED_PROVIDERS } from "../src/core/constants";
import { tokenizeInput } from "../src/core/shells";
import type { ParsedCommand } from "../src/core/shells/common";
import {
	fetchTokenDescriptions,
	getLastTokenDescriptionsDiagnostics,
} from "../src/core/token-descriptions";
import { withMockedEnv } from "../tests/utils/env";
import {
	buildProviderTestContext,
	hasProviderEnv,
} from "../tests/utils/provider-env";

type BaselineMetric = {
	provider: string;
	caseName: string;
	tokenCount: number;
	placeholderCount: number;
	placeholderRate: number;
	durationMs: number;
	staticCount: number | null;
	llmAttempted: boolean;
	llmReceivedLength: number | null;
	llmRepaired: boolean;
	missingIndices: number[];
	extraIndices: number[];
	duplicateIndices: number[];
};

const MODEL_OVERRIDE = "qwen3:1.7b";
const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434";

const baselineResults: BaselineMetric[] = [];

process.env.OLLAMA_BASE_URL ??= DEFAULT_OLLAMA_BASE_URL;

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
	const start = performance.now();
	const descriptions = await fetchTokenDescriptions(parsedCommand);
	const durationMs = performance.now() - start;
	const placeholderCount = descriptions.filter(
		(description) => description === PLACEHOLDER,
	).length;
	const threshold = Math.ceil(tokens.length * 0.2);
	expect(descriptions.length).toBe(tokens.length);
	expect(placeholderCount).toBeLessThanOrEqual(threshold);
	const placeholderRate =
		tokens.length === 0 ? 0 : placeholderCount / tokens.length;
	const diagnostics = getLastTokenDescriptionsDiagnostics();
	return {
		tokenCount: tokens.length,
		placeholderCount,
		placeholderRate,
		durationMs,
		staticCount: diagnostics?.staticCount ?? null,
		llmAttempted: diagnostics?.llmAttempted ?? false,
		llmReceivedLength: diagnostics?.llmReceivedLength ?? null,
		llmRepaired: diagnostics?.llmRepaired ?? false,
		missingIndices: diagnostics?.missingIndices ?? [],
		extraIndices: diagnostics?.extraIndices ?? [],
		duplicateIndices: diagnostics?.duplicateIndices ?? [],
	};
}

describe("fetchTokenDescriptions evals", () => {
	for (const provider of SUPPORTED_PROVIDERS.filter((p) => p === "ollama")) {
		const suite = hasProviderEnv(provider) ? describe : describe.skip;
		suite(provider, () => {
			for (const testCase of evalCases) {
				it(testCase.name, async () => {
					const context = buildProviderTestContext(
						provider,
						"describeTokens",
						MODEL_OVERRIDE,
					);
					context.env.OLLAMA_BASE_URL ??= DEFAULT_OLLAMA_BASE_URL;
					await withMockedEnv(context, async () => {
						const metrics = await runEvalCase(testCase.command);
						baselineResults.push({
							provider,
							caseName: testCase.name,
							tokenCount: metrics.tokenCount,
							placeholderCount: metrics.placeholderCount,
							placeholderRate: metrics.placeholderRate,
							durationMs: metrics.durationMs,
							staticCount: metrics.staticCount,
							llmAttempted: metrics.llmAttempted,
							llmReceivedLength: metrics.llmReceivedLength,
							llmRepaired: metrics.llmRepaired,
							missingIndices: metrics.missingIndices,
							extraIndices: metrics.extraIndices,
							duplicateIndices: metrics.duplicateIndices,
						});
						console.log(
							`[baseline] provider=${provider} case=${testCase.name} tokens=${metrics.tokenCount} placeholderRate=${metrics.placeholderRate.toFixed(2)} durationMs=${metrics.durationMs.toFixed(1)} llmAttempted=${metrics.llmAttempted} llmReceived=${metrics.llmReceivedLength ?? "n/a"} llmRepaired=${metrics.llmRepaired}`,
						);
					});
				}, 120_000);
			}
		});
	}
});

afterAll(() => {
	if (!baselineResults.length) {
		return;
	}
	console.log(
		`Token description baseline (${MODEL_OVERRIDE} @ ${
			process.env.OLLAMA_BASE_URL ?? DEFAULT_OLLAMA_BASE_URL
		})`,
	);
	for (const result of baselineResults) {
		console.log(
			`- ${result.provider}/${result.caseName}: tokens=${result.tokenCount}, placeholders=${result.placeholderCount}, placeholderRate=${result.placeholderRate.toFixed(2)}, durationMs=${result.durationMs.toFixed(1)}, staticCount=${result.staticCount ?? "n/a"}, llmAttempted=${result.llmAttempted}, llmReceived=${result.llmReceivedLength ?? "n/a"}, llmRepaired=${result.llmRepaired}, missingIndices=${JSON.stringify(result.missingIndices)}, extraIndices=${JSON.stringify(result.extraIndices)}, duplicateIndices=${JSON.stringify(result.duplicateIndices)}`,
		);
	}
});
