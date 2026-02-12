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
				normalKeybindings: {
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
					insert: ["i"],
					append: ["a"],
					change: ["c"],
					exitInsert: ["escape"],
					save: ["return"],
				},
				leaderKeybindings: {
					explain: ["e"],
					toggleView: ["m"],
					quit: ["q"],
					submit: ["return"],
				},
				leaderKey: ["space"],
				shellKeybindings: {
					explain: [],
					build: [],
					suggest: [],
					generate: [],
					choose: ["Ctrl+E"],
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
				},
				promptDefaults: {
					provider: "openai",
					model: "gpt-4",
					temperature: 0.5,
					maxTokens: 500,
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
					OPENAI_API_KEY: "additional-openai-key",
				},
				baseConfig,
			);

			const snapshot = getConfigSnapshot();

			// Keybindings should be preserved
			const normalKeybindings = snapshot.normalKeybindings;
			expect(normalKeybindings.up).toEqual(["k"]);
			expect(normalKeybindings.down).toEqual(["j"]);

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
				normalKeybindings: {
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
				},
				leaderKeybindings: {
					explain: ["e"],
					toggleView: ["m"],
					quit: ["q"],
					submit: ["return"],
				},
				leaderKey: ["space"],
				shellKeybindings: {
					explain: [],
					build: [],
					suggest: [],
					generate: [],
					choose: ["Ctrl+E"],
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
				},
				promptDefaults: {
					provider: "ollama",
					model: "qwen3:1.7b",
					temperature: 0.7,
					maxTokens: 128000,
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
				normalKeybindings: {
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
				},
				leaderKeybindings: {
					explain: ["e"],
					toggleView: ["m"],
					quit: ["q"],
					submit: ["return"],
				},
				leaderKey: ["space"],
				shellKeybindings: {
					explain: [],
					build: [],
					suggest: [],
					generate: [],
					choose: ["Ctrl+E"],
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
				},
				promptDefaults: {
					provider: "ollama",
					model: "qwen3:1.7b",
					temperature: 0.7,
					maxTokens: 128000,
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
