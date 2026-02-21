import { getShellName } from "../../config";
import { bashShellHelper } from "./bash";
import {
	joinTokensCommon,
	type ParsedCommand,
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
	const shell = getShellName() || "";
	// get the last part of the shell path
	// If SHELL is /bin/bash, we want bash
	identifiedShell = shell as ShellName;
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

function getShellHelperByName(shell: ShellName): ShellHelper {
	return shellRegistry[shell];
}

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

function buildParsedCommand(command: string): ParsedCommand {
	const tokens = tokenizeInput(command);
	return {
		tokens,
		originalCommand: command,
	};
}

function parseTokens(tokens: string[]): ParsedToken[] {
	const shellHelper = getShellHelper();
	return shellHelper.parseCommand
		? shellHelper.parseCommand(tokens)
		: parseCommand(tokens);
}

function joinTokens(tokens: string[]): string {
	const shellHelper = getShellHelper();
	return shellHelper.joinTokens
		? shellHelper.joinTokens(tokens)
		: joinTokensCommon(tokens);
}

function rebuildParsedCommandFromTokens(tokens: string[]): ParsedCommand {
	const originalCommand = joinTokens(tokens);
	return buildParsedCommand(originalCommand);
}
function getReadlineLine(): string | null {
	const shellHelper = getShellHelper();
	return shellHelper.getReadlineLine();
}
function hasReadlineLine(): boolean {
	const line = getReadlineLine();
	return !!line && typeof line === "string" && line.length > 0;
}

function getShellHistoryFilePath(): string | null {
	const shell = identifyShell();
	if (shell && shell in shellRegistry) {
		return shellRegistry[shell].getHistoryFilePath();
	}
	return null;
}

export {
	identifyShell,
	resetShellCache,
	parseTokens,
	buildParsedCommand,
	rebuildParsedCommandFromTokens,
	joinTokens,
	tokenizeInput,
	getReadlineLine,
	hasReadlineLine,
	getShellHistoryFilePath,
	getShellHelperByName,
	supportedShells,
};
