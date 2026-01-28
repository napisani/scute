import { spawnSync } from "node:child_process";

export type ManPageSections = {
	name?: string;
	synopsis?: string;
	options?: string;
};

export function getManPage(command: string): string | null {
	const result = spawnSync("man", [command], { encoding: "utf8" });
	if (result.status !== 0 || !result.stdout) {
		return null;
	}
	return result.stdout;
}

export function extractManSections(text: string): ManPageSections {
	const sections: ManPageSections = {};
	const lines = text.split("\n");
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
		if (trimmed === "OPTIONS") {
			currentSection = "options";
			sections.options = "";
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

	return sections;
}
