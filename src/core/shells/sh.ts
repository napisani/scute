import { getReadlineLine } from "../../config";
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
		return getReadlineLine() ?? null;
	},
};
