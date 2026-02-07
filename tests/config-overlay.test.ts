import { describe, expect, it } from "bun:test";
import {
	getConfigSnapshot,
	getProviderApiKey,
	getProviderBaseUrl,
	getProviderConfig,
	getProviders,
	loadConfigFromPath,
	resetConfigOverride,
	resetEnvGetter,
	setConfigOverride,
	setEnvGetter,
} from "../src/config";
import { type Config, ConfigSchema } from "../src/config/schema";

describe("config overlay logic", () => {
	// Helper to create a mock environment
	function withMockedEnv(
		env: Record<string, string | undefined>,
		config: Config = ConfigSchema.parse({}),
	) {
		setEnvGetter((name) => env[name]);
		setConfigOverride(config);
	}

	// Reset after each test
	function cleanup() {
		resetConfigOverride();
		resetEnvGetter();
	}

	describe("environment variable overrides", () => {
		it("should add OpenAI provider from OPENAI_API_KEY", () => {
			withMockedEnv({
				OPENAI_API_KEY: "sk-test-key",
			});

			const snapshot = getConfigSnapshot();
			const openaiProvider = snapshot.providers.find(
				(p) => p.name === "openai",
			);

			expect(openaiProvider).toBeDefined();
			expect(openaiProvider?.apiKey).toBe("sk-test-key");
			expect(openaiProvider?.baseUrl).toBeUndefined();

			cleanup();
		});

		it("should add Anthropic provider from ANTHROPIC_API_KEY", () => {
			withMockedEnv({
				ANTHROPIC_API_KEY: "sk-ant-test-key",
			});

			const snapshot = getConfigSnapshot();
			const anthropicProvider = snapshot.providers.find(
				(p) => p.name === "anthropic",
			);

			expect(anthropicProvider).toBeDefined();
			expect(anthropicProvider?.apiKey).toBe("sk-ant-test-key");
			expect(anthropicProvider?.baseUrl).toBeUndefined();

			cleanup();
		});

		it("should add Gemini provider from GEMINI_API_KEY", () => {
			withMockedEnv({
				GEMINI_API_KEY: "gemini-test-key",
			});

			const snapshot = getConfigSnapshot();
			const geminiProvider = snapshot.providers.find(
				(p) => p.name === "gemini",
			);

			expect(geminiProvider).toBeDefined();
			expect(geminiProvider?.apiKey).toBe("gemini-test-key");
			expect(geminiProvider?.baseUrl).toBeUndefined();

			cleanup();
		});

		it("should add Ollama provider from OLLAMA_BASE_URL with baseUrl (not apiKey)", () => {
			withMockedEnv({
				OLLAMA_BASE_URL: "http://localhost:11434",
			});

			const snapshot = getConfigSnapshot();
			const ollamaProvider = snapshot.providers.find(
				(p) => p.name === "ollama",
			);

			expect(ollamaProvider).toBeDefined();
			expect(ollamaProvider?.baseUrl).toBe("http://localhost:11434");
			expect(ollamaProvider?.apiKey).toBeUndefined();

			cleanup();
		});

		it("should override existing provider config with environment values", () => {
			const baseConfig: Config = {
				viewMode: "horizontal",
				providers: [
					{
						name: "openai",
						apiKey: "config-file-key",
						baseUrl: "https://custom.openai.com",
					},
				],
				keybindings: {
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
				},
				shellKeybindings: {
					explain: "Ctrl+E",
					build: "Ctrl+G",
					suggest: "Alt+G",
				},
				theme: {
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
				},
				prompts: {
					explain: {
						provider: "openai",
						model: "gpt-4",
						temperature: 0.7,
						maxTokens: 128000,
					},
					suggest: {
						provider: "openai",
						model: "gpt-4",
						temperature: 0.7,
						maxTokens: 128000,
					},
					generate: {
						provider: "openai",
						model: "gpt-4",
						temperature: 0.7,
						maxTokens: 128000,
					},
					describeTokens: {
						provider: "openai",
						model: "gpt-4",
						temperature: 0.7,
						maxTokens: 128000,
					},
				},
			};

			withMockedEnv(
				{
					OPENAI_API_KEY: "env-override-key",
				},
				baseConfig,
			);

			const snapshot = getConfigSnapshot();
			const openaiProvider = snapshot.providers.find(
				(p) => p.name === "openai",
			);

			// Environment should override the apiKey but preserve baseUrl
			expect(openaiProvider?.apiKey).toBe("env-override-key");
			expect(openaiProvider?.baseUrl).toBe("https://custom.openai.com");

			cleanup();
		});

		it("should handle multiple provider environment variables", () => {
			withMockedEnv({
				OPENAI_API_KEY: "openai-key",
				ANTHROPIC_API_KEY: "anthropic-key",
				OLLAMA_BASE_URL: "http://localhost:11434",
			});

			const snapshot = getConfigSnapshot();

			expect(snapshot.providers).toHaveLength(3);
			expect(snapshot.providers.map((p) => p.name).sort()).toEqual([
				"anthropic",
				"ollama",
				"openai",
			]);

			cleanup();
		});

		it("should not add provider when environment variable is missing", () => {
			withMockedEnv({
				OPENAI_API_KEY: "openai-key",
				// ANTHROPIC_API_KEY is missing
			});

			const snapshot = getConfigSnapshot();
			const anthropicProvider = snapshot.providers.find(
				(p) => p.name === "anthropic",
			);

			expect(anthropicProvider).toBeUndefined();

			cleanup();
		});
	});

	describe("config file loading", () => {
		it("should load config from file path", () => {
			const config = loadConfigFromPath("configs/ollama-config.yml");

			expect(config.providers).toHaveLength(1);
			const ollamaProvider = config.providers[0];
			expect(ollamaProvider!.name).toBe("ollama");
			expect(ollamaProvider!.baseUrl).toBe("http://localhost:11434");
		});

		it("should throw error for non-existent config file", () => {
			expect(() => loadConfigFromPath("non-existent-config.yml")).toThrow(
				"Config file not found",
			);
		});

		it("should merge config file with environment overrides", () => {
			const baseConfig = loadConfigFromPath("configs/ollama-config.yml");

			withMockedEnv(
				{
					OPENAI_API_KEY: "additional-openai-key",
				},
				baseConfig,
			);

			const snapshot = getConfigSnapshot();

			// Should have both Ollama from config and OpenAI from env
			expect(snapshot.providers).toHaveLength(2);
			expect(snapshot.providers.map((p) => p.name).sort()).toEqual([
				"ollama",
				"openai",
			]);

			cleanup();
		});
	});

	describe("provider accessor functions", () => {
		it("getProviderConfig should return cloned provider config", () => {
			const baseConfig: Config = {
				viewMode: "horizontal",
				providers: [
					{
						name: "openai",
						apiKey: "test-key",
						baseUrl: "https://api.openai.com",
					},
				],
				keybindings: {
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
				},
				shellKeybindings: {
					explain: "Ctrl+E",
					build: "Ctrl+G",
					suggest: "Alt+G",
				},
				theme: {
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
				},
				prompts: {
					explain: {
						provider: "openai",
						model: "gpt-4",
						temperature: 0.7,
						maxTokens: 128000,
					},
					suggest: {
						provider: "openai",
						model: "gpt-4",
						temperature: 0.7,
						maxTokens: 128000,
					},
					generate: {
						provider: "openai",
						model: "gpt-4",
						temperature: 0.7,
						maxTokens: 128000,
					},
					describeTokens: {
						provider: "openai",
						model: "gpt-4",
						temperature: 0.7,
						maxTokens: 128000,
					},
				},
			};

			withMockedEnv({}, baseConfig);

			const provider = getProviderConfig("openai");
			expect(provider).toBeDefined();
			expect(provider?.apiKey).toBe("test-key");
			expect(provider?.baseUrl).toBe("https://api.openai.com");

			// Verify it's a clone by modifying and checking original is unchanged
			if (provider) {
				provider.apiKey = "modified-key";
				const providerAgain = getProviderConfig("openai");
				expect(providerAgain?.apiKey).toBe("test-key");
			}

			cleanup();
		});

		it("getProviderApiKey should return API key for cloud providers", () => {
			withMockedEnv({
				OPENAI_API_KEY: "sk-test-key",
			});

			expect(getProviderApiKey("openai")).toBe("sk-test-key");

			cleanup();
		});

		it("getProviderBaseUrl should return baseUrl for Ollama", () => {
			withMockedEnv({
				OLLAMA_BASE_URL: "http://custom-ollama:11434",
			});

			expect(getProviderBaseUrl("ollama")).toBe("http://custom-ollama:11434");

			cleanup();
		});

		it("getProviders should return cloned array", () => {
			withMockedEnv({
				OPENAI_API_KEY: "test-key",
			});

			const providers1 = getProviders();
			const providers2 = getProviders();

			// Should be equal in content
			expect(providers1).toEqual(providers2);
			// But different references
			expect(providers1).not.toBe(providers2);

			cleanup();
		});

		it("should return undefined for non-existent provider", () => {
			withMockedEnv({});

			expect(getProviderConfig("nonexistent")).toBeUndefined();
			expect(getProviderApiKey("nonexistent")).toBeUndefined();
			expect(getProviderBaseUrl("nonexistent")).toBeUndefined();

			cleanup();
		});
	});

	describe("edge cases", () => {
		it("should handle empty config gracefully", () => {
			withMockedEnv({});

			const snapshot = getConfigSnapshot();

			expect(snapshot.providers).toEqual([]);
			expect(snapshot.keybindings).toBeDefined();
			expect(snapshot.theme).toBeDefined();
			expect(snapshot.prompts).toBeDefined();

			cleanup();
		});

		it("should preserve other config fields when applying env overrides", () => {
			const baseConfig: Config = {
				viewMode: "horizontal",
				providers: [],
				keybindings: {
					up: ["k"],
					down: ["j"],
					left: ["h"],
					right: ["l"],
					wordForward: ["w"],
					wordBackward: ["b"],
					lineStart: ["0"],
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
				},
				shellKeybindings: {
					explain: "Ctrl+E",
					build: "Ctrl+G",
					suggest: "Alt+G",
				},
				theme: {
					tokenColors: {
						command: "#FF0000",
						option: "#00FF00",
						argument: "#0000FF",
						assignment: "#FFFFFF",
						pipe: "#FFFF00",
						controlOperator: "#FF00FF",
						redirect: "#00FFFF",
						unknown: "#808080",
					},
					tokenDescription: "#CCCCCC",
					markerColor: "#AAAAAA",
				},
				prompts: {
					explain: {
						provider: "openai",
						model: "gpt-4",
						temperature: 0.5,
						maxTokens: 500,
					},
					suggest: {
						provider: "openai",
						model: "gpt-4",
						temperature: 0.5,
						maxTokens: 500,
					},
					generate: {
						provider: "openai",
						model: "gpt-4",
						temperature: 0.5,
						maxTokens: 500,
					},
					describeTokens: {
						provider: "openai",
						model: "gpt-4",
						temperature: 0.5,
						maxTokens: 500,
					},
				},
			};

			withMockedEnv(
				{
					OPENAI_API_KEY: "test-key",
				},
				baseConfig,
			);

			const snapshot = getConfigSnapshot();

			// Keybindings should be preserved
			const keybindings = snapshot.keybindings;
			expect(keybindings.up).toEqual(["k"]);
			expect(keybindings.down).toEqual(["j"]);

			// Theme should be preserved
			const theme = snapshot.theme;
			expect(theme.tokenColors.command).toBe("#FF0000");

			// Prompts should be preserved
			expect(snapshot.prompts.explain.temperature).toBe(0.5);
			expect(snapshot.prompts.explain.maxTokens).toBe(500);

			cleanup();
		});

		it("should handle Ollama provider without baseUrl gracefully", () => {
			const baseConfig: Config = {
				viewMode: "horizontal",
				providers: [
					{
						name: "ollama",
						// No baseUrl provided
					},
				],
				keybindings: {
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
				},
				shellKeybindings: {
					explain: "Ctrl+E",
					build: "Ctrl+G",
					suggest: "Alt+G",
				},
				theme: {
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
				},
				prompts: {
					explain: {
						provider: "ollama",
						model: "qwen3:1.7b",
						temperature: 0.7,
						maxTokens: 128000,
					},
					suggest: {
						provider: "ollama",
						model: "qwen3:1.7b",
						temperature: 0.7,
						maxTokens: 128000,
					},
					generate: {
						provider: "ollama",
						model: "qwen3:1.7b",
						temperature: 0.7,
						maxTokens: 128000,
					},
					describeTokens: {
						provider: "ollama",
						model: "qwen3:1.7b",
						temperature: 0.7,
						maxTokens: 128000,
					},
				},
			};

			withMockedEnv(
				{
					OLLAMA_BASE_URL: "http://localhost:11434",
				},
				baseConfig,
			);

			const snapshot = getConfigSnapshot();
			const ollamaProvider = snapshot.providers.find(
				(p) => p.name === "ollama",
			);

			expect(ollamaProvider?.baseUrl).toBe("http://localhost:11434");
			expect(ollamaProvider?.apiKey).toBeUndefined();

			cleanup();
		});

		it("should update existing provider when env var is set", () => {
			const baseConfig: Config = {
				viewMode: "horizontal",
				providers: [
					{
						name: "ollama",
						baseUrl: "http://old-url:11434",
					},
				],
				keybindings: {
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
				},
				shellKeybindings: {
					explain: "Ctrl+E",
					build: "Ctrl+G",
					suggest: "Alt+G",
				},
				theme: {
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
				},
				prompts: {
					explain: {
						provider: "ollama",
						model: "qwen3:1.7b",
						temperature: 0.7,
						maxTokens: 128000,
					},
					suggest: {
						provider: "ollama",
						model: "qwen3:1.7b",
						temperature: 0.7,
						maxTokens: 128000,
					},
					generate: {
						provider: "ollama",
						model: "qwen3:1.7b",
						temperature: 0.7,
						maxTokens: 128000,
					},
					describeTokens: {
						provider: "ollama",
						model: "qwen3:1.7b",
						temperature: 0.7,
						maxTokens: 128000,
					},
				},
			};

			withMockedEnv(
				{
					OLLAMA_BASE_URL: "http://new-url:11434",
				},
				baseConfig,
			);

			const snapshot = getConfigSnapshot();
			const ollamaProvider = snapshot.providers.find(
				(p) => p.name === "ollama",
			);

			expect(ollamaProvider?.baseUrl).toBe("http://new-url:11434");

			cleanup();
		});
	});
});
