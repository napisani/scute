type Tokenizer = (input: string | null | undefined) => string[];
type ReadlineLineGetter = () => string | null;
type TokenParser = (tokens: string[]) => ParsedToken[];

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
};

export type ParsedCommand = {
	tokens: string[];
	originalCommand: string;
};

export type ShellHelper = {
	shell: ShellName;
	tokenizeInput: Tokenizer;
	parseCommand: TokenParser;
	joinTokens: (tokens: string[]) => string;
	getReadlineLine: ReadlineLineGetter;
	getInitScript: () => string;
};

export const supportedShells = ["bash", "zsh", "sh"] as const;
export type ShellName = (typeof supportedShells)[number];
export function tokenizeWithShellQuote(
	input: string | null | undefined,
): string[] {
	if (!input) {
		return [];
	}
	return splitShellTokens(input);
}

export function joinTokensCommon(tokens: string[]): string {
	return tokens.join(" ");
}

const PIPE_OPERATORS = new Set(["|", "|&"]);
const CONTROL_OPERATORS = new Set(["&&", "||", ";", "&"]);
const REDIRECT_OPERATORS = new Set([
	"<",
	">",
	">>",
	"2>",
	"2>>",
	"&>",
	"<<",
	">|",
	"<<<",
]);
const REDIRECT_REGEX = /^(\d+)?(>>|>|<|<<|<<<|&>|<>&|>&)$/;

const OPERATOR_TOKENS = [
	"<<<",
	"<>&",
	"|&",
	"&&",
	"||",
	"<<",
	">>",
	"&>",
	">|",
	">&",
	"|",
	";",
	"&",
	"<",
	">",
];

function isPipeOperator(token: string): boolean {
	return PIPE_OPERATORS.has(token);
}

function isControlOperator(token: string): boolean {
	return CONTROL_OPERATORS.has(token);
}

function isRedirectOperator(token: string): boolean {
	return REDIRECT_OPERATORS.has(token) || REDIRECT_REGEX.test(token);
}

function splitShellTokens(input: string): string[] {
	const tokens: string[] = [];
	let current = "";
	let inSingleQuote = false;
	let inDoubleQuote = false;
	let i = 0;

	while (i < input.length) {
		const char = input[i];
		if (!char) {
			break;
		}

		if (!inSingleQuote && !inDoubleQuote) {
			if (/\s/.test(char)) {
				if (current) {
					tokens.push(current);
					current = "";
				}
				i += 1;
				continue;
			}

			const operator = readOperatorToken(input, i);
			if (operator) {
				if (current) {
					tokens.push(current);
					current = "";
				}
				tokens.push(operator.value);
				i += operator.length;
				continue;
			}
		}

		if (char === "'" && !inDoubleQuote) {
			inSingleQuote = !inSingleQuote;
			current += char;
			i += 1;
			continue;
		}

		if (char === '"' && !inSingleQuote) {
			inDoubleQuote = !inDoubleQuote;
			current += char;
			i += 1;
			continue;
		}

		if (char === "\\" && !inSingleQuote) {
			current += char;
			if (i + 1 < input.length) {
				current += input[i + 1];
				i += 2;
				continue;
			}
			i += 1;
			continue;
		}

		current += char;
		i += 1;
	}

	if (current) {
		tokens.push(current);
	}

	return tokens;
}

function readOperatorToken(
	input: string,
	index: number,
): { value: string; length: number } | null {
	const remaining = input.slice(index);
	if (/^\d/.test(remaining)) {
		const match = remaining.match(/^(\d+)(>>|>|<|<<|<<<|&>|<>&|>&)/);
		if (match && match[0]) {
			return { value: match[0], length: match[0].length };
		}
	}

	for (const op of OPERATOR_TOKENS) {
		if (remaining.startsWith(op)) {
			return { value: op, length: op.length };
		}
	}

	return null;
}

type RawTokenKind = "word" | "op" | "unknown";

type RawToken = {
	raw: string;
	kind: RawTokenKind;
};

function parseRawTokens(tokens: string[]): RawToken[] {
	return tokens.map((token) => {
		if (isPipeOperator(token)) {
			return { raw: token, kind: "op" };
		}
		if (isControlOperator(token)) {
			return { raw: token, kind: "op" };
		}
		if (isRedirectOperator(token)) {
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
			if (isPipeOperator(token.raw)) {
				parsed.push({ value: token.raw, type: "pipe" });
				expectingCommand = true;
				commandSeen = false;
				continue;
			}
			if (isControlOperator(token.raw)) {
				parsed.push({ value: token.raw, type: "controlOperator" });
				expectingCommand = true;
				commandSeen = false;
				continue;
			}
			if (isRedirectOperator(token.raw)) {
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

		if (!commandSeen && isAssignmentToken(token.raw)) {
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

export function parseCommand(tokens: string[]): ParsedToken[] {
	const rawTokens = parseRawTokens(tokens);
	return refineTokens(rawTokens);
}
