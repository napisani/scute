import { parse } from "shell-quote";

type Tokenizer = (input: string | null | undefined) => string[];
type ReadlineLineGetter = () => string | null;
export type ShellHelper = {
	shell: ShellName;
	tokenizeInput: Tokenizer;
	getReadlineLine: ReadlineLineGetter;
};

export const supportedShells = ["bash", "zsh", "sh"] as const;
export type ShellName = (typeof supportedShells)[number];
export function tokenizeWithShellQuote(
	input: string | null | undefined,
): string[] {
	if (!input) {
		return [];
	}
	const tokens: string[] = [];
	for (const token of parse(input)) {
		if (typeof token === "string") {
			tokens.push(token);
			continue;
		}
		if ("op" in token) {
			tokens.push(String(token.op));
			continue;
		}
		if ("pattern" in token) {
			tokens.push(String(token.pattern));
		}
	}
	return tokens;
}
