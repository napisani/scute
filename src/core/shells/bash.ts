import { getEnv } from "../environment";
import { type ShellHelper, tokenizeWithShellQuote } from "./common";

export const bashShellHelper: ShellHelper = {
	shell: "bash",
	tokenizeInput: tokenizeWithShellQuote,
	getReadlineLine: () => {
		return getEnv("READLINE_LINE") ?? null;
	},
};
