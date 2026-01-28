export type TokenType =
	| "command"
	| "option"
	| "argument"
	| "assignment"
	| "pipe"
	| "controlOperator"
	| "redirect"
	| "unknown";

export type ParsedToken = {
	value: string;
	type: TokenType;
	optionValue?: string;
};

export type ParsedCommand = {
	tokens: string[];
	originalCommand: string;
};

type RawTokenKind = "word" | "op" | "unknown";

type RawToken = {
	raw: string;
	kind: RawTokenKind;
};

const PIPE_OPERATORS = new Set(["|"]);
const CONTROL_OPERATORS = new Set(["&&", "||", ";", "&"]);
const REDIRECT_OPERATORS = new Set(["<", ">", ">>", "2>", "2>>", "&>", "<<"]);

function parseRawTokens(tokens: string[]): RawToken[] {
	return tokens.map((token) => {
		if (PIPE_OPERATORS.has(token)) {
			return { raw: token, kind: "op" };
		}
		if (CONTROL_OPERATORS.has(token)) {
			return { raw: token, kind: "op" };
		}
		if (REDIRECT_OPERATORS.has(token)) {
			return { raw: token, kind: "op" };
		}
		return { raw: token, kind: "word" };
	});
}

function refineTokens(rawTokens: RawToken[]): ParsedToken[] {
	const parsed: ParsedToken[] = [];
	let expectingCommand = true;
	let commandSeen = false;

	for (let i = 0; i < rawTokens.length; i++) {
		const token = rawTokens[i];
		if (!token) {
			continue;
		}
		if (!token.raw) {
			continue;
		}

		if (token.kind === "op") {
			if (PIPE_OPERATORS.has(token.raw)) {
				parsed.push({ value: token.raw, type: "pipe" });
				expectingCommand = true;
				continue;
			}
			if (CONTROL_OPERATORS.has(token.raw)) {
				parsed.push({ value: token.raw, type: "controlOperator" });
				expectingCommand = true;
				continue;
			}
			if (REDIRECT_OPERATORS.has(token.raw)) {
				parsed.push({ value: token.raw, type: "redirect" });
				continue;
			}
			parsed.push({ value: token.raw, type: "unknown" });
			continue;
		}

		if (token.kind === "unknown") {
			parsed.push({ value: token.raw, type: "unknown" });
			continue;
		}

		if (
			!commandSeen &&
			token.raw.includes("=") &&
			isAssignmentToken(token.raw)
		) {
			parsed.push({ value: token.raw, type: "assignment" });
			continue;
		}

		if (expectingCommand) {
			parsed.push({ value: token.raw, type: "command" });
			expectingCommand = false;
			commandSeen = true;
			continue;
		}

		if (token.raw.startsWith("-")) {
			const nextToken = rawTokens[i + 1];
			if (
				nextToken &&
				nextToken.kind === "word" &&
				!nextToken.raw.startsWith("-")
			) {
				parsed.push({
					value: token.raw,
					type: "option",
					optionValue: nextToken.raw,
				});
				i++;
				continue;
			}
			parsed.push({ value: token.raw, type: "option" });
			continue;
		}

		parsed.push({ value: token.raw, type: "argument" });
	}

	return parsed;
}

function isAssignmentToken(token: string): boolean {
	return /^[A-Za-z_][A-Za-z0-9_]*=/.test(token);
}

export function parseCommandTokens(tokens: string[]): ParsedToken[] {
	const rawTokens = parseRawTokens(tokens);
	return refineTokens(rawTokens);
}
