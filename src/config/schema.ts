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

export const PromptDefaultsSchema = z.object({
	provider: z.enum(SUPPORTED_PROVIDERS).default(resolvedDefaultProvider),
	model: z.string().default(resolvedDefaultModel),
	temperature: z.number().default(DEFAULT_TEMPERATURE),
	maxTokens: z.number().default(DEFAULT_MAX_TOKENS),
	userPrompt: z.string().optional(),
	systemPromptOverride: z.string().optional(),
});

export const PromptOverridesSchema = z
	.object({
		provider: z.enum(SUPPORTED_PROVIDERS).optional(),
		model: z.string().optional(),
		temperature: z.number().optional(),
		maxTokens: z.number().optional(),
		userPrompt: z.string().optional(),
		systemPromptOverride: z.string().optional(),
	})
	.default({});

export type PromptDefaultsConfig = z.infer<typeof PromptDefaultsSchema>;
export type PromptOverridesConfig = z.infer<typeof PromptOverridesSchema>;
export type PromptConfig = PromptDefaultsConfig;

export const NormalKeybindingsSchema = z
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
		insert: ["i"],
		append: ["a"],
		change: ["c"],
		exitInsert: ["escape"],
		save: ["return"],
	});

export const LeaderKeybindingsSchema = z
	.object({
		explain: z.array(z.string()).default(["e"]),
		toggleView: z.array(z.string()).default(["m"]),
		quit: z.array(z.string()).default(["q"]),
		submit: z.array(z.string()).default(["return"]),
		suggest: z.array(z.string()).default(["s"]),
		generate: z.array(z.string()).default(["g"]),
	})
	.default({
		explain: ["e"],
		toggleView: ["m"],
		quit: ["q"],
		submit: ["return"],
		suggest: ["s"],
		generate: ["g"],
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

export const ChooseMenuColorsSchema = z
	.object({
		border: z.string().default("#585B70"),
		title: z.string().default("#CBA6F7"),
		text: z.string().default("#CDD6F4"),
		description: z.string().default("#6C7086"),
		shortcutKey: z.string().default("#CBA6F7"),
		pointer: z.string().default("#A6E3A1"),
		highlightBg: z.string().default("#45475A"),
	})
	.default({
		border: "#585B70",
		title: "#CBA6F7",
		text: "#CDD6F4",
		description: "#6C7086",
		shortcutKey: "#CBA6F7",
		pointer: "#A6E3A1",
		highlightBg: "#45475A",
	});

export type ChooseMenuColorsConfig = z.infer<typeof ChooseMenuColorsSchema>;

export const ThemeSchema = z
	.object({
		tokenColors: TokenColorsSchema,
		tokenDescription: z.string().default("#CDD6F4"),
		markerColor: z.string().default("#CDD6F4"),
		modeInsertColor: z.string().default("#A6E3A1"),
		modeNormalColor: z.string().default("#6C7086"),
		errorColor: z.string().default("#F38BA8"),
		hintLabelColor: z.string().default("#6C7086"),
		cursorColor: z.string().default("#F5E0DC"),
		chooseMenu: ChooseMenuColorsSchema,
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
		modeInsertColor: "#A6E3A1",
		modeNormalColor: "#6C7086",
		errorColor: "#F38BA8",
		hintLabelColor: "#6C7086",
		cursorColor: "#F5E0DC",
		chooseMenu: {
			border: "#585B70",
			title: "#CBA6F7",
			text: "#CDD6F4",
			description: "#6C7086",
			shortcutKey: "#CBA6F7",
			pointer: "#A6E3A1",
			highlightBg: "#45475A",
		},
	});

export type ThemeConfig = z.infer<typeof ThemeSchema>;

export type NormalKeybindingsConfig = z.infer<typeof NormalKeybindingsSchema>;
export type LeaderKeybindingsConfig = z.infer<typeof LeaderKeybindingsSchema>;

export const ShellKeybindingActions = [
	"explain",
	"build",
	"suggest",
	"generate",
	"choose",
] as const;
export type ShellKeybindingAction = (typeof ShellKeybindingActions)[number];

function buildDefaultPromptDefaults() {
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
	chooserCommand: z.string().optional(),
	providers: z.array(ProviderSchema).default([]),
	normalKeybindings: NormalKeybindingsSchema,
	leaderKeybindings: LeaderKeybindingsSchema,
	leaderKey: z.array(z.string()).default(["space"]),
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
			choose: z
				.union([z.string().min(1), z.array(z.string().min(1))])
				.optional(),
		})
		.default({
			explain: [],
			build: [],
			suggest: [],
			generate: [],
			choose: ["Ctrl+E"],
		}),
	promptDefaults: PromptDefaultsSchema.default(buildDefaultPromptDefaults()),
	prompts: z
		.object({
			explain: PromptOverridesSchema.default({}),
			suggest: PromptOverridesSchema.default({}),
			generate: PromptOverridesSchema.default({}),
			describeTokens: PromptOverridesSchema.default({}),
		})
		.default({
			explain: {},
			suggest: {},
			generate: {},
			describeTokens: {},
		}),
});
export type PromptName = keyof z.infer<typeof ConfigSchema>["prompts"];

export type Config = z.infer<typeof ConfigSchema>;
