import { getEnv } from "../environment";
import { type ShellHelper, tokenizeWithShellQuote } from "./common";

export const zshShellHelper: ShellHelper = {
	shell: "zsh",
	tokenizeInput: tokenizeWithShellQuote,
	getReadlineLine: () => {
		return getEnv("READLINE_LINE") ?? null;
	},
};
