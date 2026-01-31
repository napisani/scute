import { describe, expect, it } from "bun:test";
import { SUPPORTED_PROVIDERS } from "../src/core/constants";
import { explain } from "../src/core/llm";
import { withMockedEnv } from "../tests/utils/env";
import {
	buildProviderTestContext,
	hasProviderEnv,
} from "../tests/utils/provider-env";

describe("ai connectivity", () => {
	for (const provider of SUPPORTED_PROVIDERS.filter((p) => p === "ollama")) {
		const test = hasProviderEnv(provider) ? it : it.skip;
		test(provider, async () => {
			const context = buildProviderTestContext(provider, "explain");
			await withMockedEnv(context, async () => {
				const result = await explain("ls -la");
				expect(result).toBeTruthy();
			});
		}, 30_000);
	}
});
