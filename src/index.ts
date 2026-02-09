// src/index.ts

import path from "node:path";
import { Command } from "commander";

import { build } from "./commands/build";
import { configDebug } from "./commands/config-debug";
import { explain } from "./commands/explain";
import { generate } from "./commands/generate";
import { init } from "./commands/init";
import { suggest } from "./commands/suggest";
import {
	getPromptOutput,
	loadConfigFromPath,
	setConfigOverride,
} from "./config";
import type { OutputChannel } from "./core/output";
import { SCUTE_VERSION } from "./version";

const program = new Command();

program
	.name("scute")
	.description("AI-powered shell assistant")
	.version(SCUTE_VERSION, "--version", "Output the current version")
	.option("-c, --config [file]", "Path to config YAML file")
	.option(
		"-o, --output <channel>",
		"Output channel (clipboard|stdout|prompt|readline)",
	);

const VALID_OUTPUT_CHANNELS: OutputChannel[] = [
	"clipboard",
	"stdout",
	"prompt",
	"readline",
];

function resolveOutputChannel(
	commandName: string,
	requested?: string,
): OutputChannel {
	if (requested) {
		if (!VALID_OUTPUT_CHANNELS.includes(requested as OutputChannel)) {
			console.error(
				`Invalid output channel: "${requested}". Valid options: ${VALID_OUTPUT_CHANNELS.join(", ")}`,
			);
			process.exit(1);
		}
		return requested as OutputChannel;
	}
	if (
		commandName === "suggest" ||
		commandName === "explain" ||
		commandName === "generate"
	) {
		const promptOutput = getPromptOutput(
			commandName as "suggest" | "explain" | "generate",
		);
		if (promptOutput) {
			return promptOutput;
		}
	}
	if (commandName === "suggest") return "readline";
	if (commandName === "explain") return "prompt";
	if (commandName === "build") return "readline";
	return "stdout";
}

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
	.action((shell, _options, command) => {
		const { output } = command.optsWithGlobals() as { output?: string };
		init(shell, { output: resolveOutputChannel("init", output) });
	});

program
	.command("build")
	.argument("[input...]", "Input to tokenize")
	.action((input, _options, command) => {
		void build(input, {});
	});

program
	.command("config-debug")
	.description(
		"Print the resolved configuration and related environment values",
	)
	.action((_options, command) => {
		const { output } = command.optsWithGlobals() as { output?: string };
		configDebug({ output: resolveOutputChannel("config-debug", output) });
	});

program
	.command("suggest")
	.argument("<line>", "The current readline buffer")
	.action((line, _options, command) => {
		const { output } = command.optsWithGlobals() as { output?: string };
		void suggest(line, { output: resolveOutputChannel("suggest", output) });
	});

program
	.command("explain")
	.argument("<line>", "The current readline buffer")
	.argument("<point>", "The current readline cursor position")
	.action((line, point, _options, command) => {
		const { output } = command.optsWithGlobals() as { output?: string };
		void explain(line, point, {
			output: resolveOutputChannel("explain", output),
		});
	});

program
	.command("generate")
	.description("Generate a command from a prompt")
	.argument("[prompt...]", "Natural language request")
	.action((promptParts, _options, command) => {
		const { output } = command.optsWithGlobals() as { output?: string };
		void generate(promptParts, {
			output: resolveOutputChannel("generate", output),
		});
	});

program.parse(process.argv);
