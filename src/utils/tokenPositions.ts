import type { ParsedToken } from "../core/shells/common";
import { formatToken } from "./tokenFormatters";

export interface TokenPosition {
	token: ParsedToken;
	index: number;
	start: number;
	end: number;
	description: string;
}

export function calculateTokenPositions(
	parsedTokens: ParsedToken[],
	descriptions: string[],
): TokenPosition[] {
	let currentPos = 0;
	return parsedTokens.map((token, index) => {
		const value = formatToken(token);
		const start = currentPos;
		const end = start + value.length;
		currentPos = end + 1; // +1 for space between tokens
		return {
			token,
			index,
			start,
			end,
			description: descriptions[index] ?? "",
		};
	});
}
