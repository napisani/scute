import { bashShellHelper } from "./bash";
import { type ShellHelper, type ShellName, supportedShells } from "./common";
import { shShellHelper } from "./sh";
import { zshShellHelper } from "./zsh";

let identifiedShell: ShellName | null | undefined;
function identifyShell(): ShellName | null {
	if (identifiedShell !== undefined) {
		return identifiedShell;
	}
	const shell = process.env.BRASH_SHELL || process.env.SHELL || "";
	// get the last part of the shell path
	// If SHELL is /bin/bash, we want bash
	identifiedShell = (shell.split("/").pop() || "") as ShellName;
	if (!supportedShells.includes(identifiedShell)) {
		return null;
	}
	return identifiedShell;
}

const shellRegistry: Record<ShellName, ShellHelper> = {
	zsh: zshShellHelper,
	bash: bashShellHelper,
	sh: shShellHelper,
};

function getShellHelper() {
	const shell = identifyShell();
	if (shell && shell in shellRegistry) {
		return shellRegistry[shell];
	}
	throw new Error("Unsupported shell");
}

function tokenizeInput(input: string | null | undefined): string[] {
	const shellHelper = getShellHelper();
	return shellHelper.tokenizeInput(input);
}
function getReadlineLine(): string | null {
	const shellHelper = getShellHelper();
	return shellHelper.getReadlineLine();
}
function hasReadlineLine(): boolean {
	const line = getReadlineLine();
	return !!line && typeof line === "string" && line.length > 0;
}

export { identifyShell, tokenizeInput, getReadlineLine, hasReadlineLine };
