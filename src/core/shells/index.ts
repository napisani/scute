import { getEnv } from "../environment";
import { bashShellHelper } from "./bash";
import {
	type ParsedToken,
	parseCommand,
	type ShellHelper,
	type ShellName,
	supportedShells,
} from "./common";
import { shShellHelper } from "./sh";
import { zshShellHelper } from "./zsh";

let identifiedShell: ShellName | null | undefined;
function resetShellCache() {
	identifiedShell = undefined;
}
function identifyShell(): ShellName | null {
	if (identifiedShell !== undefined) {
		return identifiedShell;
	}
	const shell = getEnv("BRASH_SHELL") || getEnv("SHELL") || "";
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

function parseTokens(tokens: string[]): ParsedToken[] {
	const shellHelper = getShellHelper();
	return shellHelper.parseCommand
		? shellHelper.parseCommand(tokens)
		: parseCommand(tokens);
}
function getReadlineLine(): string | null {
	const shellHelper = getShellHelper();
	return shellHelper.getReadlineLine();
}
function hasReadlineLine(): boolean {
	const line = getReadlineLine();
	return !!line && typeof line === "string" && line.length > 0;
}

export {
	identifyShell,
	resetShellCache,
	parseTokens,
	tokenizeInput,
	getReadlineLine,
	hasReadlineLine,
};
