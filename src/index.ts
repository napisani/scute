// src/index.ts
import { Command } from "commander";
import { explain } from "./commands/explain";
import { init } from "./commands/init";
import { suggest } from "./commands/suggest";
import { suggestPrompt } from "./commands/suggest-prompt";

const program = new Command();

program.name("brash").description("AI-powered shell assistant");

program
	.command("init <shell>")
	.description('Prints the shell integration script (e.g., "bash")')
	.action(init);

program
	.command("suggest")
	.argument("<line>", "The current readline buffer")
	.action(suggest);

program
	.command("suggest-prompt")
	.argument("<line>", "The current readline buffer")
	.action(suggestPrompt);

program
	.command("explain")
	.argument("<line>", "The current readline buffer")
	.argument("<point>", "The current readline cursor position")
	.action(explain);

program.parse(process.argv);
