import { useMemo } from "react";
import { getTokenColor } from "../config";
import type { ParsedToken } from "../core/shells/common";

export interface ColoredToken {
	token: ParsedToken;
	index: number;
	color: string;
	isSelected: boolean;
}

export interface UseColoredTokensOptions {
	parsedTokens: ParsedToken[];
	selectedIndex: number;
}

export function useColoredTokens({
	parsedTokens,
	selectedIndex,
}: UseColoredTokensOptions): ColoredToken[] {
	return useMemo(() => {
		return parsedTokens.map((token, index) => {
			const isSelected = index === selectedIndex;
			const tokenColor = getTokenColor(token.type);
			const color = isSelected ? "cyan" : tokenColor;

			return {
				token,
				index,
				color,
				isSelected,
			};
		});
	}, [parsedTokens, selectedIndex]);
}
