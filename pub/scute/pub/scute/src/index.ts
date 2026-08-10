// src/index.ts

import path from "node:path";
import { Command } from "commander";

import { build } from "./commands/build";
import { configDebug } from "./commands/config-debug";
import { init } from "./commands/init";
import { loadConfigFromPath, setConfigOverride } from "./config";
import { SCUTE_VERSION } from "./version";

const program = new Command();

program
	.name("scute")
	.description("AI-powered shell assistant")
	.version(SCUTE_VERSION, "--version", "Output the current version")
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
	.action((shell) => {
		init(shell);
	});

program
	.command("build")
	.argument("[input...]", "Input to tokenize")
	.action((input) => {
		void build(input, {});
	});

program
	.command("config-debug")
	.description(
		"Print the resolved configuration and related environment values",
	)
	.action(() => {
		configDebug();
	});

program.parse(process.argv);
