import { getEnv } from "../environment";
import {
	parseCommand,
	type ShellHelper,
	tokenizeWithShellQuote,
} from "./common";

export const zshShellHelper: ShellHelper = {
	shell: "zsh",
	tokenizeInput: tokenizeWithShellQuote,
	parseCommand,
	getReadlineLine: () => {
		return getEnv("READLINE_LINE") ?? null;
	},
};
