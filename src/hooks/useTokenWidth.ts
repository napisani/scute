import { useMemo } from "react";
import type { ParsedToken } from "../core/shells/common";

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
			(token: ParsedToken) => token.type.length,
		);
		const tokenLabelWidths = parsedTokens.map(
			(token: ParsedToken) => token.value.length,
		);
		return {
			typeWidth: Math.max(8, ...typeLabelWidths),
			tokenWidth: Math.max(12, ...tokenLabelWidths),
		};
	}, [parsedTokens]);
}
