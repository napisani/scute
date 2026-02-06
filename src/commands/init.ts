// src/commands/init.ts

import { getShellKeybindings } from "../config";
import { emitOutput, type OutputChannel } from "../core/output";
import { getShellHelperByName, supportedShells } from "../core/shells";
import type { ShellName } from "../core/shells/common";

export interface InitOptions {
	output: OutputChannel;
}

export function init(shell: string, { output }: InitOptions) {
	if (!supportedShells.includes(shell as ShellName)) {
		console.error(
			`Error: Unsupported shell '${shell}'. Supported shells: ${supportedShells.join(
				", ",
			)}.`,
		);
		process.exit(1);
	}

	const shellHelper = getShellHelperByName(shell as ShellName);
	const initScript = shellHelper.getInitScript(getShellKeybindings());

	emitOutput({
		channel: output,
		text: initScript,
	});
}
