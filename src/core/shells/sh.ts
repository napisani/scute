import { type ShellHelper, tokenizeWithShellQuote } from "./common";

export const shShellHelper: ShellHelper = {
  shell: "sh",
	tokenizeInput: tokenizeWithShellQuote,
	getReadlineLine: () => {
		return process.env.READLINE_LINE ?? null;
	},
};
