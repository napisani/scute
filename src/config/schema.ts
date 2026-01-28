import { z } from "zod";
import {
	DEFAULT_MAX_TOKENS,
	DEFAULT_MODEL,
	DEFAULT_PROVIDER,
	DEFAULT_TEMPERATURE,
} from "../core/constants";

export const ProviderSchema = z.object({
	name: z.enum(["openai", "anthropic", "gemini", "ollama"]),
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
	})
	.default({
		up: ["up", "k"],
		down: ["down", "j"],
	});

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
