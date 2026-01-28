import { getEnv } from "../environment";
import {
	parseCommand,
	type ShellHelper,
	tokenizeWithShellQuote,
} from "./common";

export const shShellHelper: ShellHelper = {
	shell: "sh",
	tokenizeInput: tokenizeWithShellQuote,
	parseCommand,
	getReadlineLine: () => {
		return getEnv("READLINE_LINE") ?? null;
	},
};
