// src/index.ts

import path from "node:path";
import { Command } from "commander";
import { build } from "./commands/build";
import { configDebug } from "./commands/config-debug";
import { explain } from "./commands/explain";
import { init } from "./commands/init";
import { suggest } from "./commands/suggest";
import { loadConfigFromPath, setConfigOverride } from "./config";

const program = new Command();

program
	.name("scute")
	.description("AI-powered shell assistant")
	.option("-c, --config [file]", "Path to config YAML file");

program.hook("preAction", (thisCommand) => {
	const { config } = thisCommand.optsWithGlobals() as {
		config?: boolean | string;
	};
	if (!config) {
		return;
	}
	if (config === true) {
		setConfigOverride();
		return;
	}
	const resolvedPath = path.resolve(process.cwd(), config);
	try {
		const override = loadConfigFromPath(resolvedPath);
		setConfigOverride(override);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error(message);
		process.exit(1);
	}
});

program
	.command("init <shell>")
	.description('Prints the shell integration script (e.g., "bash")')
	.action(init);

program
	.command("build")
	.argument("[input...]", "Input to tokenize")
	.action(build);

program
	.command("config-debug")
	.description(
		"Print the resolved configuration and related environment values",
	)
	.action(configDebug);

program
	.command("suggest")
	.argument("<line>", "The current readline buffer")
	.action(suggest);

program
	.command("explain")
	.argument("<line>", "The current readline buffer")
	.argument("<point>", "The current readline cursor position")
	.action(explain);

program.parse(process.argv);
