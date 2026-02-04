import { afterAll, describe, expect, it } from "bun:test";
import { performance } from "node:perf_hooks";
import { SUPPORTED_PROVIDERS } from "../src/core/constants";
import { explain } from "../src/core/llm";
import { withMockedEnv } from "../tests/utils/env";
import {
	buildProviderTestContext,
	hasProviderEnv,
} from "../tests/utils/provider-env";

type ExplainMetric = {
	provider: string;
	caseName: string;
	command: string;
	length: number;
	wordCount: number;
	containsCommand: boolean;
	lineCount: number;
	durationMs: number;
};

const MODEL_OVERRIDE = "qwen3:1.7b";
const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434";

const explainResults: ExplainMetric[] = [];

process.env.OLLAMA_BASE_URL ??= DEFAULT_OLLAMA_BASE_URL;

const explainCases = [
	{ name: "simple", command: "ls -la /tmp" },
	{ name: "pipeline", command: "cat access.log | grep 404" },
	{ name: "env", command: "FOO=bar env | grep FOO" },
] as const;

async function runExplainCase(command: string) {
	const start = performance.now();
	const result = await explain(command);
	const durationMs = performance.now() - start;
	expect(result).toBeTruthy();
	const explanation = result?.trim() ?? "";
	expect(explanation.length).toBeGreaterThan(10);
	expect(explanation.length).toBeLessThanOrEqual(3000);
	const lineCount = explanation.split(/\r?\n/).length;
	expect(lineCount).toBeLessThanOrEqual(100);
	const commandName = command.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
	const containsCommand = explanation.toLowerCase().includes(commandName);
	expect(containsCommand).toBeTruthy();
	const wordCount = explanation.split(/\s+/).filter(Boolean).length;
	return {
		length: explanation.length,
		wordCount,
		containsCommand,
		lineCount,
		durationMs,
		text: explanation,
	};
}

describe("explain command evals", () => {
	for (const provider of SUPPORTED_PROVIDERS.filter((p) => p === "ollama")) {
		const suite = hasProviderEnv(provider) ? describe : describe.skip;
		suite(provider, () => {
			for (const testCase of explainCases) {
				it(testCase.name, async () => {
					const context = buildProviderTestContext(
						provider,
						"explain",
						MODEL_OVERRIDE,
					);
					context.env.OLLAMA_BASE_URL ??= DEFAULT_OLLAMA_BASE_URL;
					await withMockedEnv(context, async () => {
						const metrics = await runExplainCase(testCase.command);
						explainResults.push({
							provider,
							caseName: testCase.name,
							command: testCase.command,
							length: metrics.length,
							wordCount: metrics.wordCount,
							containsCommand: metrics.containsCommand,
							lineCount: metrics.lineCount,
							durationMs: metrics.durationMs,
						});
						console.log(
							`[explain-baseline] provider=${provider} case=${testCase.name} length=${metrics.length} words=${metrics.wordCount} durationMs=${metrics.durationMs.toFixed(1)}`,
						);
					});
				}, 120_000);
			}
		});
	}
});

afterAll(() => {
	if (!explainResults.length) {
		return;
	}
	console.log(
		`Explain baseline (${MODEL_OVERRIDE} @ ${
			process.env.OLLAMA_BASE_URL ?? DEFAULT_OLLAMA_BASE_URL
		})`,
	);
	for (const result of explainResults) {
		console.log(
			`- ${result.provider}/${result.caseName}: command="${result.command}" length=${result.length} words=${result.wordCount} containsCommand=${result.containsCommand} lineCount=${result.lineCount} durationMs=${result.durationMs.toFixed(1)}`,
		);
	}
});
