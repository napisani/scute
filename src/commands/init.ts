// src/commands/init.ts
import { BASH_SCRIPT } from "../shells/bash";

export const init = (shell: string) => {
	if (shell !== "bash") {
		console.error(
			`Error: Unsupported shell '${shell}'. Only 'bash' is currently supported.`,
		);
		process.exit(1);
	}

	// Print the bash script to stdout
	console.log(BASH_SCRIPT);
};
