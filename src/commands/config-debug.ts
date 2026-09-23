import { getConfigSnapshot } from "../config";
import { getEnv, SUPPORTED_ENV_VARS } from "../core/environment";
import { emitOutput } from "../core/output";

type DebugOutput = {
	config: ReturnType<typeof getConfigSnapshot>;
	environment: Record<string, string | undefined>;
};

export function configDebug(): void {
	const resolvedConfig = getConfigSnapshot();
	const environment = SUPPORTED_ENV_VARS.reduce<DebugOutput["environment"]>(
		(acc, varName) => {
			acc[varName] = getEnv(varName);
			return acc;
		},
		{},
	);

	const payload: DebugOutput = {
		config: resolvedConfig,
		environment,
	};

	emitOutput(JSON.stringify(payload, null, 2));
}
