import { spawnSync } from "node:child_process";

export type ParsedManPageOption = {
	short?: string;
	long?: string;
	description: string;
};

export type ManPageSections = {
	name?: string;
	synopsis?: string;
	description?: string;
	parsedOptions?: ParsedManPageOption[];
};

export function getManPage(command: string): string | null {
	const result = spawnSync("man", ["-P", "cat", command], { encoding: "utf8" });
	if (result.status !== 0 || !result.stdout) {
		return null;
	}
	return result.stdout;
}

export function extractManSections(text: string): ManPageSections {
	const sections: ManPageSections = {};
	const cleaned = stripFormatting(text);
	const lines = cleaned.split("\n");
	let currentSection: keyof ManPageSections | null = null;

	for (const line of lines) {
		const trimmed = line.trim();
		if (trimmed === "NAME") {
			currentSection = "name";
			sections.name = "";
			continue;
		}
		if (trimmed === "SYNOPSIS") {
			currentSection = "synopsis";
			sections.synopsis = "";
			continue;
		}
		if (trimmed === "DESCRIPTION") {
			currentSection = "description";
			sections.description = "";
			continue;
		}
		if (trimmed.match(/^[A-Z][A-Z\s]+$/)) {
			currentSection = null;
			continue;
		}

		if (!currentSection) {
			continue;
		}
		sections[currentSection] += `${line}\n`;
	}

	if (sections.description) {
		const parsed = parseManOptions(sections.description);
		sections.parsedOptions =
			parsed.length > 0 ? parsed : parseManOptions(cleaned);
	} else {
		sections.parsedOptions = parseManOptions(cleaned);
	}

	return sections;
}

function stripFormatting(text: string): string {
	const esc = String.fromCharCode(27);
	const ansiRegex = new RegExp(`${esc}\\[[0-9;]*m`, "g");
	const noAnsi = text.replace(ansiRegex, "");
	let result = "";
	for (const char of noAnsi) {
		if (char === "\u0008") {
			result = result.slice(0, -1);
			continue;
		}
		result += char;
	}
	return result;
}

export function parseManOptions(text: string): ParsedManPageOption[] {
	const options: ParsedManPageOption[] = [];
	const lines = text.split("\n");
	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed.startsWith("-")) {
			continue;
		}
		const parts = trimmed.split(/\s{2,}/);
		const optionPart = parts[0] ?? "";
		const description = parts.slice(1).join(" ").trim();
		const optionPieces = optionPart
			.split(",")
			.map((piece) => piece.trim())
			.filter(Boolean);
		let shortOption: string | undefined;
		let longOption: string | undefined;
		for (const piece of optionPieces) {
			if (piece.startsWith("--")) {
				longOption = piece.split(" ")[0];
				continue;
			}
			if (piece.startsWith("-")) {
				shortOption = piece.split(" ")[0];
			}
		}
		options.push({
			short: shortOption,
			long: longOption,
			description: description || optionPart,
		});
	}
	return options;
}
