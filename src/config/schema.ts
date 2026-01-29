import { z } from "zod";
import {
	DEFAULT_MAX_TOKENS,
	DEFAULT_MODEL,
	DEFAULT_PROVIDER,
	DEFAULT_TEMPERATURE,
	SUPPORTED_PROVIDERS,
} from "../core/constants";

export const ProviderSchema = z.object({
	name: z.enum(SUPPORTED_PROVIDERS),
	apiKey: z.string().optional(),
	baseUrl: z.string().optional(),
});

export type ProviderConfig = z.infer<typeof ProviderSchema>;

export const PromptConfigSchema = z.object({
	provider: z.string().default(DEFAULT_PROVIDER),
	model: z.string().default(DEFAULT_MODEL),
	temperature: z.number().default(DEFAULT_TEMPERATURE),
	maxTokens: z.number().default(DEFAULT_MAX_TOKENS),
	userPrompt: z.string().optional(),
	systemPromptOverride: z.string().optional(),
});

export type PromptConfig = z.infer<typeof PromptConfigSchema>;

export const KeybindingsSchema = z
	.object({
		up: z.array(z.string()).default(["up", "k"]),
		down: z.array(z.string()).default(["down", "j"]),
		explain: z.array(z.string()).default(["e"]),
	})
	.default({
		up: ["up", "k"],
		down: ["down", "j"],
		explain: ["e"],
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

export type KeybindingsConfig = z.infer<typeof KeybindingsSchema>;

function buildDefaultPromptConfig() {
	return {
		provider: DEFAULT_PROVIDER,
		model: DEFAULT_MODEL,
		temperature: DEFAULT_TEMPERATURE,
		maxTokens: DEFAULT_MAX_TOKENS,
	};
}

export const ConfigSchema = z.object({
	providers: z.array(ProviderSchema).default([]),
	keybindings: KeybindingsSchema,
	tokenColors: TokenColorsSchema,
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
