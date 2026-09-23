// src/commands/init.ts

import { getShellKeybindings } from "../config";
import { getShellHelperByName, supportedShells } from "../core/shells";
import type { ShellName } from "../core/shells/common";

function isSupportedShell(value: string): value is ShellName {
	return supportedShells.some((candidate) => candidate === value);
}

export function init(shell: string) {
	if (!isSupportedShell(shell)) {
		console.error(
			`Error: Unsupported shell '${shell}'. Supported shells: ${supportedShells.join(
				", ",
			)}.`,
		);
		process.exit(1);
	}

	const shellHelper = getShellHelperByName(shell);
	const initScript = shellHelper.getInitScript(getShellKeybindings());

	// Write directly to stdout — init output is eval'd by the shell,
	// so it must never include clipboard messages or other side-channel text.
	const output = initScript.endsWith("\n") ? initScript : `${initScript}\n`;
	process.stdout.write(output);
}
