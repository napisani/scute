import {
	resetConfigOverride,
	resetEnvGetter,
	setConfigOverride,
	setEnvGetter,
} from "../../src/config";
import type { Config } from "../../src/config/schema";

export async function withMockedEnv(
	{ env, config }: { env: Record<string, string | undefined>; config?: Config },
	fn: () => Promise<void> | void,
) {
	setEnvGetter((name) => env[name]);
	setConfigOverride(config);
	try {
		return await fn();
	} finally {
		resetConfigOverride();
		resetEnvGetter();
	}
}
