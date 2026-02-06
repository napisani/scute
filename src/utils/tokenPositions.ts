import type { ParsedToken } from "../core/shells/common";

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
		const start = currentPos;
		const end = start + token.value.length;
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
