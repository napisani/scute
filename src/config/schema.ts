import { z } from "zod";
import {
	DEFAULT_MAX_TOKENS,
	DEFAULT_MODEL,
	DEFAULT_PROVIDER,
	DEFAULT_TEMPERATURE,
	SUPPORTED_PROVIDERS,
} from "../core/constants";
import { getEnv } from "../core/environment";

function isSupportedProviderName(
	value: string,
): value is (typeof SUPPORTED_PROVIDERS)[number] {
	return (SUPPORTED_PROVIDERS as readonly string[]).includes(value);
}

function resolveDefaultProvider(): (typeof SUPPORTED_PROVIDERS)[number] {
	const envDefaultProvider = getEnv("SCUTE_DEFAULT_PROVIDER");
	if (envDefaultProvider && isSupportedProviderName(envDefaultProvider)) {
		return envDefaultProvider;
	}
	return DEFAULT_PROVIDER;
}

function resolveDefaultModel(): string {
	const envDefaultModel = getEnv("SCUTE_DEFAULT_MODEL");
	return envDefaultModel ?? DEFAULT_MODEL;
}

const resolvedDefaultProvider = resolveDefaultProvider();
const resolvedDefaultModel = resolveDefaultModel();

export const ProviderSchema = z.object({
	name: z.enum(SUPPORTED_PROVIDERS),
	apiKey: z.string().optional(),
	baseUrl: z.string().optional(),
});

export type ProviderConfig = z.infer<typeof ProviderSchema>;

export const PromptConfigSchema = z.object({
	provider: z.string().default(resolvedDefaultProvider),
	model: z.string().default(resolvedDefaultModel),
	temperature: z.number().default(DEFAULT_TEMPERATURE),
	maxTokens: z.number().default(DEFAULT_MAX_TOKENS),
	userPrompt: z.string().optional(),
	systemPromptOverride: z.string().optional(),
});

export type PromptConfig = z.infer<typeof PromptConfigSchema>;

export const KeybindingsSchema = z
	.object({
		up: z.array(z.string()).default(["up"]),
		down: z.array(z.string()).default(["down"]),
		left: z.array(z.string()).default(["left", "h"]),
		right: z.array(z.string()).default(["right", "l"]),
		wordForward: z.array(z.string()).default(["w"]),
		wordBackward: z.array(z.string()).default(["b"]),
		lineStart: z.array(z.string()).default(["0", "^"]),
		lineEnd: z.array(z.string()).default(["$"]),
		firstToken: z.array(z.string()).default(["g"]),
		lastToken: z.array(z.string()).default(["G"]),
		appendLine: z.array(z.string()).default(["A"]),
		explain: z.array(z.string()).default(["e"]),
		toggleView: z.array(z.string()).default(["m"]),
		insert: z.array(z.string()).default(["i"]),
		append: z.array(z.string()).default(["a"]),
		change: z.array(z.string()).default(["c"]),
		exitInsert: z.array(z.string()).default(["escape"]),
		save: z.array(z.string()).default(["return"]),
	})
	.default({
		up: ["up"],
		down: ["down"],
		left: ["left", "h"],
		right: ["right", "l"],
		wordForward: ["w"],
		wordBackward: ["b"],
		lineStart: ["0", "^"],
		lineEnd: ["$"],
		firstToken: ["g"],
		lastToken: ["G"],
		appendLine: ["A"],
		explain: ["e"],
		toggleView: ["m"],
		insert: ["i"],
		append: ["a"],
		change: ["c"],
		exitInsert: ["escape"],
		save: ["return"],
	});

export const TokenColorsSchema = z
	.object({
		command: z.string().default("#A6E3A1"),
		option: z.string().default("#FAB387"),
		argument: z.string().default("#89B4FA"),
		assignment: z.string().default("#CBA6F7"),
		pipe: z.string().default("#94E2D5"),
		controlOperator: z.string().default("#F38BA8"),
		redirect: z.string().default("#CDD6F4"),
		unknown: z.string().default("#6C7086"),
	})
	.default({
		command: "#A6E3A1",
		option: "#FAB387",
		argument: "#89B4FA",
		assignment: "#CBA6F7",
		pipe: "#94E2D5",
		controlOperator: "#F38BA8",
		redirect: "#CDD6F4",
		unknown: "#6C7086",
	});

export type TokenColorsConfig = z.infer<typeof TokenColorsSchema>;

export const ThemeSchema = z
	.object({
		tokenColors: TokenColorsSchema,
		tokenDescription: z.string().default("#CDD6F4"),
		markerColor: z.string().default("#CDD6F4"),
	})
	.default({
		tokenColors: {
			command: "#A6E3A1",
			option: "#FAB387",
			argument: "#89B4FA",
			assignment: "#CBA6F7",
			pipe: "#94E2D5",
			controlOperator: "#F38BA8",
			redirect: "#CDD6F4",
			unknown: "#6C7086",
		},
		tokenDescription: "#CDD6F4",
		markerColor: "#CDD6F4",
	});

export type ThemeConfig = z.infer<typeof ThemeSchema>;

export type KeybindingsConfig = z.infer<typeof KeybindingsSchema>;

export const ShellKeybindingActions = [
	"explain",
	"build",
	"suggest",
	"generate",
] as const;
export type ShellKeybindingAction = (typeof ShellKeybindingActions)[number];

function buildDefaultPromptConfig() {
	return {
		provider: resolvedDefaultProvider,
		model: resolvedDefaultModel,
		temperature: DEFAULT_TEMPERATURE,
		maxTokens: DEFAULT_MAX_TOKENS,
	};
}

export const ConfigSchema = z.object({
	viewMode: z.enum(["horizontal", "vertical"]).default("horizontal"),
	clipboardCommand: z.string().optional(),
	providers: z.array(ProviderSchema).default([]),
	keybindings: KeybindingsSchema,
	theme: ThemeSchema,
	shellKeybindings: z
		.object({
			explain: z
				.union([z.string().min(1), z.array(z.string().min(1))])
				.optional(),
			build: z
				.union([z.string().min(1), z.array(z.string().min(1))])
				.optional(),
			suggest: z
				.union([z.string().min(1), z.array(z.string().min(1))])
				.optional(),
			generate: z
				.union([z.string().min(1), z.array(z.string().min(1))])
				.optional(),
		})
		.default({
			explain: "Ctrl+E",
			build: "Ctrl+G",
			suggest: "Ctrl+Shift+E",
		}),
	prompts: z
		.object({
			explain: PromptConfigSchema.default(buildDefaultPromptConfig()),
			suggest: PromptConfigSchema.default(buildDefaultPromptConfig()),
			generate: PromptConfigSchema.default(buildDefaultPromptConfig()),
			describeTokens: PromptConfigSchema.default(buildDefaultPromptConfig()),
		})
		.default({
			explain: buildDefaultPromptConfig(),
			suggest: buildDefaultPromptConfig(),
			generate: buildDefaultPromptConfig(),
			describeTokens: buildDefaultPromptConfig(),
		}),
});
export type PromptName = keyof z.infer<typeof ConfigSchema>["prompts"];

export type Config = z.infer<typeof ConfigSchema>;
