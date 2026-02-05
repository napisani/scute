// src/commands/init.ts

import { emitOutput, type OutputChannel } from "../core/output";
import { BASH_SCRIPT } from "../shells/bash";

export interface InitOptions {
	output: OutputChannel;
}

export function init(shell: string, { output }: InitOptions) {
	if (shell !== "bash") {
		console.error(
			`Error: Unsupported shell '${shell}'. Only 'bash' is currently supported.`,
		);
		process.exit(1);
	}

	emitOutput({
		channel: output,
		text: BASH_SCRIPT,
	});
}
