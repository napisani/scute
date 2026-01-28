import { resetEnvGetter, setEnvGetter } from "../../src/core/environment";

export async function withMockedEnv(
	env: Record<string, string | undefined>,
	fn: () => Promise<void> | void,
) {
	setEnvGetter((name) => env[name]);
	try {
		return await fn();
	} finally {
		resetEnvGetter();
	}
}
