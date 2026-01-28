import { getEnv } from "../environment";
import {
	parseCommand,
	type ShellHelper,
	tokenizeWithShellQuote,
} from "./common";

export const bashShellHelper: ShellHelper = {
	shell: "bash",
	tokenizeInput: tokenizeWithShellQuote,
	parseCommand,
	getReadlineLine: () => {
		return getEnv("READLINE_LINE") ?? null;
	},
};
