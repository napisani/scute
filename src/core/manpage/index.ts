import { spawnSync } from "node:child_process";
import type { ParsedToken } from "../shells/common";
import {
	type ManPageSections,
	type ParsedManPageOption,
	parseManOptions,
	splitIntoSections,
	stripFormatting,
} from "./parser";
import { buildContextWithBm25 } from "./retrieval-bm25";

export type ManPage = ManPageSections & {
	command: string;
	parsedOptions?: ParsedManPageOption[];
	fullText: string;
};

export function getManPage(command: string): string | null {
	const result = spawnSync("man", ["-P", "cat", command], {
		encoding: "utf8",
	});
	if (result.status !== 0 || !result.stdout) {
		return null;
	}
	return result.stdout;
}

export function extractManSections(command: string, fullText: string): ManPage {
	const cleaned = stripFormatting(fullText);
	const sections = splitIntoSections(cleaned);
	let parsedOptions: ParsedManPageOption[] = [];
	if (sections.description) {
		parsedOptions = parseManOptions(sections.description);
	}
	if (!parsedOptions.length) {
		parsedOptions = parseManOptions(cleaned);
	}
	return {
		command,
		fullText,
		parsedOptions: parsedOptions.length > 0 ? parsedOptions : undefined,
		...sections,
	};
}

export type { ParsedManPageOption } from "./parser";
export { parseManOptions, stripFormatting } from "./parser";

export function buildManPageContext(
	man: ManPage,
	parsedTokens: ParsedToken[],
	options?: { maxChars?: number; maxSnippets?: number },
): string {
	return buildContextWithBm25(man, parsedTokens, options);
}

export function manPageToContextString(man: ManPage): string {
	let context = "Man page information for `" + man.command + "`:\n";
	context += stripFormatting(man.fullText);
	return context;
}
