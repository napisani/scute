import { describe, expect, it } from "bun:test";
import { buildManPageContext, type ManPage } from "../../src/core/manpage";
import type { ParsedToken } from "../../src/core/shells/common";

describe("buildManPageContext", () => {
	it("prioritizes relevant sections within budget", () => {
		const fullText = `NAME
foo - sample command

SYNOPSIS
foo [options] <file>

DESCRIPTION
foo processes files and writes output to stdout.

OPTIONS
     -a, --annotate   add annotations to the output
     -b, --batch      process files in batch mode

EXAMPLES
     foo -a input.txt

BUGS
there are known issues in very old environments.
`;
		const manPage: ManPage = {
			command: "foo",
			name: "foo - sample command",
			synopsis: "foo [options] <file>",
			description: "foo processes files and writes output to stdout.",
			parsedOptions: undefined,
			fullText,
		};
		const tokens: ParsedToken[] = [
			{ value: "foo", type: "command" },
			{ value: "-a", type: "option" },
			{ value: "input.txt", type: "argument" },
		];

		const context = buildManPageContext(manPage, tokens, {
			maxChars: 400,
			maxSnippets: 4,
		});

		expect(context.length).toBeLessThanOrEqual(400);
		expect(context).toContain("SYNOPSIS");
		expect(context).toContain("-a, --annotate");
		expect(context).not.toContain("BUGS");
	});
});
