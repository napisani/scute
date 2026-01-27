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

export const CommandConfigSchema = z.object({
	provider: z.string().default(DEFAULT_PROVIDER),
	model: z.string().default(DEFAULT_MODEL),
	temperature: z.number().default(DEFAULT_TEMPERATURE),
	maxTokens: z.number().default(DEFAULT_MAX_TOKENS),
	userPrompt: z.string().optional(),
	systemPromptOverride: z.string().optional(),
});

export type CommandConfig = z.infer<typeof CommandConfigSchema>;

export const ConfigSchema = z.object({
	providers: z.array(ProviderSchema).default([]),
	prompts: z
		.object({
			explain: CommandConfigSchema.default({
				provider: DEFAULT_PROVIDER,
				model: DEFAULT_MODEL,
				temperature: DEFAULT_TEMPERATURE,
				maxTokens: DEFAULT_MAX_TOKENS,
			}),
			suggest: CommandConfigSchema.default({
				provider: DEFAULT_PROVIDER,
				model: DEFAULT_MODEL,
				temperature: DEFAULT_TEMPERATURE,
				maxTokens: DEFAULT_MAX_TOKENS,
			}),
			generate: CommandConfigSchema.default({
				provider: DEFAULT_PROVIDER,
				model: DEFAULT_MODEL,
				temperature: DEFAULT_TEMPERATURE,
				maxTokens: DEFAULT_MAX_TOKENS,
			}),
		})
		.default({
			explain: {
				provider: DEFAULT_PROVIDER,
				model: DEFAULT_MODEL,
				temperature: DEFAULT_TEMPERATURE,
				maxTokens: DEFAULT_MAX_TOKENS,
			},
			suggest: {
				provider: DEFAULT_PROVIDER,
				model: DEFAULT_MODEL,
				temperature: DEFAULT_TEMPERATURE,
				maxTokens: DEFAULT_MAX_TOKENS,
			},
			generate: {
				provider: DEFAULT_PROVIDER,
				model: DEFAULT_MODEL,
				temperature: DEFAULT_TEMPERATURE,
				maxTokens: DEFAULT_MAX_TOKENS,
			},
		}),
});

export type Config = z.infer<typeof ConfigSchema>;
