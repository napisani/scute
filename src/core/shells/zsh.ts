import { type ShellHelper, tokenizeWithShellQuote } from "./common";

export const zshShellHelper: ShellHelper = {
	tokenizeInput: tokenizeWithShellQuote,
	getReadlineLine: () => {
		return process.env.READLINE_LINE ?? null;
	},
};
