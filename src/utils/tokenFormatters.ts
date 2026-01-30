import type { ParsedToken } from "../core/shells/common";

export function formatToken(token: ParsedToken): string {
	return token.value;
}

export function formatTokenType(token: ParsedToken): string {
	return token.type;
}

export function mapDescriptions(rawDescriptions: string[]): string[] {
	return rawDescriptions;
}
