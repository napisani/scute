import { type ShellHelper, tokenizeWithShellQuote } from "./common";

export const bashShellHelper: ShellHelper = {
  shell: "bash",
	tokenizeInput: tokenizeWithShellQuote,
	getReadlineLine: () => {
		return process.env.READLINE_LINE ?? null;
	},
};
