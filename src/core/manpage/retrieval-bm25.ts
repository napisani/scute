import type { ParsedToken } from "../shells/common";
import type { ManPage } from "./index";
import { stripFormatting } from "./parser";

const BM25_K1 = 1.5;
const BM25_B = 0.75;
const DEFAULT_CONTEXT_CHARS = 2_000;
const DEFAULT_MAX_SNIPPETS = 6;

type ParagraphScore = {
	text: string;
	score: number;
};

export function buildContextWithBm25(
	man: ManPage,
	parsedTokens: ParsedToken[],
	options?: { maxChars?: number; maxSnippets?: number },
): string {
	const cleaned = stripFormatting(man.fullText);
	const paragraphs = splitIntoParagraphs(cleaned);
	const queryTerms = extractQueryTerms(parsedTokens, man.command);
	const scored = scoreParagraphs(paragraphs, queryTerms);
	const maxChars = options?.maxChars ?? DEFAULT_CONTEXT_CHARS;
	const maxSnippets = options?.maxSnippets ?? DEFAULT_MAX_SNIPPETS;

	const header = `Man page context for \`${man.command}\`:`;
	const pieces: string[] = [header];
	let remainingChars = Math.max(maxChars - header.length, 0);

	const mandatorySnippets: string[] = [];
	if (man.name?.trim()) {
		mandatorySnippets.push(`NAME\n${normalizeSnippet(man.name)}`);
	}
	if (man.synopsis?.trim()) {
		mandatorySnippets.push(`SYNOPSIS\n${normalizeSnippet(man.synopsis)}`);
	}

	const seen = new Set<string>();
	const appendSnippet = (snippet: string) => {
		const trimmed = normalizeSnippet(snippet);
		if (!trimmed) {
			return;
		}
		const key = trimmed.toLowerCase();
		if (seen.has(key)) {
			return;
		}
		const separatorCost = pieces.length >= 1 ? 2 : 0;
		const snippetLength = trimmed.length + separatorCost;
		if (remainingChars > 0 && snippetLength > remainingChars) {
			if (remainingChars <= 1) {
				return;
			}
			const allowed = Math.max(remainingChars - separatorCost - 1, 0);
			const truncated = `${trimmed.slice(0, allowed).trimEnd()}…`;
			pieces.push(truncated);
			remainingChars = 0;
			seen.add(key);
			return;
		}
		pieces.push(trimmed);
		remainingChars = Math.max(remainingChars - snippetLength, 0);
		seen.add(key);
	};

	for (const snippet of mandatorySnippets) {
		appendSnippet(snippet);
	}

	const positive = scored.filter((entry) => entry.score > 0);
	const ordered = (positive.length > 0 ? positive : scored)
		.slice(0, maxSnippets)
		.sort((a, b) => b.score - a.score);

	for (const entry of ordered.slice(0, maxSnippets)) {
		appendSnippet(entry.text);
		if (remainingChars <= 0) {
			break;
		}
	}

	let context = pieces.join("\n\n");
	if (context.length > maxChars) {
		context = `${context.slice(0, maxChars - 1).trimEnd()}…`;
	}
	return context;
}

function splitIntoParagraphs(text: string): string[] {
	const paragraphs: string[] = [];
	const lines = text.split("\n");
	let buffer: string[] = [];
	let pendingHeading: string | null = null;

	const flush = () => {
		if (buffer.length === 0) {
			return;
		}
		let snippet = buffer.join("\n");
		buffer = [];
		snippet = normalizeSnippet(snippet);
		if (!snippet) {
			return;
		}
		if (pendingHeading) {
			snippet = `${pendingHeading}\n${snippet}`;
			pendingHeading = null;
		}
		paragraphs.push(snippet);
	};

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed) {
			flush();
			continue;
		}
		if (isHeadingLine(trimmed)) {
			flush();
			pendingHeading = trimmed;
			continue;
		}
		buffer.push(line);
	}

	flush();
	return paragraphs;
}

function isHeadingLine(line: string): boolean {
	return /^[A-Z][A-Z0-9\s-]{1,}$/.test(line) && line.length <= 40;
}

function extractQueryTerms(
	parsedTokens: ParsedToken[],
	command: string,
): string[] {
	const terms = new Set<string>();
	const addTerms = (value: string | undefined) => {
		if (!value) {
			return;
		}
		for (const term of tokenizeForScoring(value)) {
			if (term.length > 0) {
				terms.add(term);
			}
		}
	};

	addTerms(command);

	for (const token of parsedTokens) {
		addTerms(token.value);
		if (token.type === "option") {
			const stripped = token.value.replace(/^--?/, "");
			addTerms(stripped);
			const eqIndex = token.value.indexOf("=");
			if (eqIndex !== -1) {
				addTerms(token.value.slice(eqIndex + 1));
			}
		}
		if (token.type === "assignment") {
			const [name, value] = token.value.split("=", 2);
			addTerms(name);
			addTerms(value);
		}
		if (token.type === "argument") {
			const segments = token.value.split(/[\\/]/);
			for (const segment of segments) {
				addTerms(segment);
			}
			const lastSegment = segments[segments.length - 1];
			if (lastSegment && lastSegment.includes(".")) {
				const dotParts = lastSegment.split(".");
				for (const part of dotParts) {
					addTerms(part);
				}
			}
		}
	}

	return Array.from(terms);
}

function scoreParagraphs(
	paragraphs: string[],
	queryTerms: string[],
): ParagraphScore[] {
	if (paragraphs.length === 0) {
		return [];
	}
	const lowercaseQuery = queryTerms.map((term) => term.toLowerCase());
	const tokenizedParagraphs = paragraphs.map((text) => {
		const tokens = tokenizeForScoring(text);
		const freq = new Map<string, number>();
		for (const token of tokens) {
			freq.set(token, (freq.get(token) ?? 0) + 1);
		}
		return { text, tokens, freq };
	});

	const avgDocLength =
		tokenizedParagraphs.reduce((sum, doc) => sum + doc.tokens.length, 0) /
		Math.max(tokenizedParagraphs.length, 1);

	const docFreq = new Map<string, number>();
	for (const term of lowercaseQuery) {
		let df = 0;
		for (const doc of tokenizedParagraphs) {
			if (doc.freq.has(term)) {
				df += 1;
			}
		}
		docFreq.set(term, df);
	}

	const N = tokenizedParagraphs.length;
	const scores: ParagraphScore[] = [];

	for (const doc of tokenizedParagraphs) {
		let score = 0;
		for (const term of lowercaseQuery) {
			const tf = doc.freq.get(term);
			if (!tf) {
				continue;
			}
			const df = docFreq.get(term) ?? 0;
			if (df === 0) {
				continue;
			}
			const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
			const numerator = tf * (BM25_K1 + 1);
			const denominator =
				tf +
				BM25_K1 *
					(1 -
						BM25_B +
						(BM25_B * doc.tokens.length) / Math.max(avgDocLength, 1));
			score += idf * (numerator / denominator);
		}
		scores.push({ text: doc.text, score });
	}

	return scores.sort((a, b) => b.score - a.score);
}

function tokenizeForScoring(value: string): string[] {
	return value.toLowerCase().match(/[a-z0-9][a-z0-9_-]*/g) ?? [];
}

function normalizeSnippet(snippet: string): string {
	return snippet
		.split("\n")
		.map((line) => line.trimEnd())
		.join("\n")
		.trim();
}
