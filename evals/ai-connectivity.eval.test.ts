import { describe, expect, it } from "bun:test";
import { SUPPORTED_PROVIDERS } from "../src/core/constants";
import { explain } from "../src/core/llm";
import { withMockedEnv } from "../tests/utils/env";
import {
	buildProviderTestContext,
	hasProviderEnv,
} from "../tests/utils/provider-env";

describe("ai connectivity", () => {
	for (const provider of SUPPORTED_PROVIDERS) {
		const test = hasProviderEnv(provider) ? it : it.skip;
		test(provider, async () => {
			const context = buildProviderTestContext(provider, "suggest");
			await withMockedEnv(context, async () => {
				const result = await explain("ls -la");
				expect(result).toBeTruthy();
				expect(result).not.toContain("[brash] AI Error");
			});
		}, 30_000);
	}
});
