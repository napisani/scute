import { getEnv } from "../environment";
import { type ShellHelper, tokenizeWithShellQuote } from "./common";

export const shShellHelper: ShellHelper = {
	shell: "sh",
	tokenizeInput: tokenizeWithShellQuote,
	getReadlineLine: () => {
		return getEnv("READLINE_LINE") ?? null;
	},
};
