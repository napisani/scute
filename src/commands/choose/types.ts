export type ActionChoice = "explain" | "build" | "suggest" | "generate";

export interface Choice {
	key: string;
	label: string;
	description: string;
	action: ActionChoice;
}

export const CHOICES: Choice[] = [
	{
		key: "e",
		label: "Explain",
		description: "Explain the current command",
		action: "explain",
	},
	{
		key: "b",
		label: "Build",
		description: "Edit command in TUI builder",
		action: "build",
	},
	{
		key: "s",
		label: "Suggest",
		description: "AI completion for current command",
		action: "suggest",
	},
	{
		key: "g",
		label: "Generate",
		description: "Generate command from prompt",
		action: "generate",
	},
];

/** Exit code signaling the shell to re-invoke `scute build` directly. */
export const EXIT_BUILD = 10;
