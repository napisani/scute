import { useMemo } from "react";
import type { ParsedToken } from "../core/shells/common";

function formatTokenType(token: ParsedToken): string {
	return token.type;
}

function formatToken(token: ParsedToken): string {
	return token.value;
}

export interface TokenWidths {
	typeWidth: number;
	tokenWidth: number;
}

export interface UseTokenWidthOptions {
	parsedTokens: ParsedToken[];
}

export function useTokenWidth({
	parsedTokens,
}: UseTokenWidthOptions): TokenWidths {
	return useMemo(() => {
		if (!parsedTokens.length) {
			return { typeWidth: 8, tokenWidth: 12 };
		}
		const typeLabelWidths = parsedTokens.map(
			(token: ParsedToken) => formatTokenType(token).length,
		);
		const tokenLabelWidths = parsedTokens.map(
			(token: ParsedToken) => formatToken(token).length,
		);
		return {
			typeWidth: Math.max(8, ...typeLabelWidths),
			tokenWidth: Math.max(12, ...tokenLabelWidths),
		};
	}, [parsedTokens]);
}
