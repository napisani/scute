import { describe, expect, it } from "bun:test";
import { extractManSections, getManPage } from "../src/core/manpage";

const commands = ["ls", "cat", "grep"];

describe("man page parsing", () => {
	for (const command of commands) {
		it(`parses options for ${command}`, () => {
			const page = getManPage(command);
			expect(page).not.toBeNull();
			if (page === null) {
				throw new Error(`expected getManPage("${command}") to return a page`);
			}
			const sections = extractManSections(command, page);
			expect(sections.parsedOptions).toBeDefined();
			expect(sections.parsedOptions?.length ?? 0).toBeGreaterThan(0);
		});
	}
});
