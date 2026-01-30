import { getReadlineLine } from "../../config";
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
		return getReadlineLine() ?? null;
	},
};
