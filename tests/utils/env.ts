import { resetConfigOverride, setConfigOverride } from "../../src/config";
import type { Config } from "../../src/config/schema";
import { resetEnvGetter, setEnvGetter } from "../../src/core/environment";

export async function withMockedEnv(
	{ env, config }: { env: Record<string, string | undefined>; config?: Config },
	fn: () => Promise<void> | void,
) {
	setEnvGetter((name) => env[name]);
	if (config) {
		setConfigOverride(config);
	}
	try {
		return await fn();
	} finally {
		if (config) {
			resetConfigOverride();
		}
		resetEnvGetter();
	}
}
