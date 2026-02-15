import { beforeEach, describe, expect, it } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import { JSDOM } from "jsdom";
import type { ParsedToken } from "../../src/core/shells/common";
import type { KeyboardHandler, KeyboardKey } from "../../src/hooks/useVimMode";

// Set up JSDOM before importing React
const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
global.document = dom.window.document;
global.window = dom.window as unknown as Window & typeof globalThis;

// Track keyboard handlers - only keep the most recent ones
// The hook registers 2 handlers: insert/suggest interception + normal mode
let latestHandlers: KeyboardHandler[] = [];

const mockUseKeyboard = (handler: KeyboardHandler) => {
	latestHandlers.push(handler);
	// Only keep the last 2 handlers to avoid stale handlers from previous renders
	if (latestHandlers.length > 2) {
		latestHandlers = latestHandlers.slice(-2);
	}
};

const simulateKey = (
	name: string,
	sequence?: string,
	overrides: Partial<KeyboardKey> = {},
) => {
	const key: KeyboardKey = {
		name,
		sequence,
		preventDefault: () => {},
		...overrides,
	};
	// Call only the most recent handlers
	latestHandlers.forEach((handler) => {
		handler(key);
	});
};

const pressLeader = () => {
	simulateKey("space", " ");
};

const resetMockKeyboard = () => {
	latestHandlers = [];
};

// Import the hook - it will use our mock
const { useVimMode } = await import("../../src/hooks/useVimMode");

describe("useVimMode", () => {
	beforeEach(() => {
		resetMockKeyboard();
	});

	const mockTokens: ParsedToken[] = [
		{ value: "echo", type: "command" },
		{ value: "test", type: "argument" },
	];

	interface RenderVimModeOptions {
		tokens?: ParsedToken[];
		loadDescriptions?: () => void;
		onTokenEdit?: (tokenIndex: number, newValue: string) => void;
		onExit?: (submitted: boolean) => void;
		onSuggestSubmit?: (prompt: string) => void;
		onGenerateSubmit?: (prompt: string) => void;
		useKeyboard?: (handler: KeyboardHandler) => void;
	}

	function renderVimMode({
		tokens = mockTokens,
		loadDescriptions = () => {},
		onTokenEdit,
		onExit,
		onSuggestSubmit,
		onGenerateSubmit,
		useKeyboard = mockUseKeyboard,
	}: RenderVimModeOptions = {}) {
		return renderHook(() =>
			useVimMode({
				parsedTokens: tokens,
				loadDescriptions,
				onTokenEdit,
				onExit,
				onSuggestSubmit,
				onGenerateSubmit,
				useKeyboard,
			}),
		);
	}

	describe("basic navigation", () => {
		it("starts with first token selected", () => {
			const { result } = renderVimMode();

			expect(result.current.selectedIndex).toBe(0);
			expect(result.current.mode).toBe("normal");
		});

		it("moves selection with j and k keys", () => {
			const { result } = renderVimMode();

			act(() => {
				pressLeader();
			});
			act(() => {
				simulateKey("m", "m");
			});
			act(() => {
				simulateKey("j");
			});
			expect(result.current.selectedIndex).toBe(1);

			act(() => {
				simulateKey("k");
			});
			expect(result.current.selectedIndex).toBe(0);
		});

		it("stops at boundaries", () => {
			const { result } = renderVimMode();

			act(() => {
				pressLeader();
			});
			act(() => {
				simulateKey("m", "m");
			});
			act(() => {
				simulateKey("k");
			});
			expect(result.current.selectedIndex).toBe(0);

			act(() => {
				simulateKey("j");
			});
			expect(result.current.selectedIndex).toBe(1);

			act(() => {
				simulateKey("j");
			});
			expect(result.current.selectedIndex).toBe(1);
		});
	});

	describe("view mode toggle", () => {
		it("does not toggle view mode without leader", () => {
			const { result } = renderVimMode();

			expect(result.current.viewMode).toBe("annotated");

			act(() => {
				simulateKey("m", "m");
			});
			expect(result.current.viewMode).toBe("annotated");
		});

		it("toggles view mode with leader+m", () => {
			const { result } = renderVimMode();

			expect(result.current.viewMode).toBe("annotated");

			act(() => {
				pressLeader();
			});
			act(() => {
				simulateKey("m", "m");
			});
			expect(result.current.viewMode).toBe("list");
		});
	});

	describe("insert mode - change (c key)", () => {
		it("enters insert mode with cleared value", () => {
			const { result } = renderVimMode();

			act(() => {
				simulateKey("right");
			});

			act(() => {
				simulateKey("c");
			});

			expect(result.current.mode).toBe("insert");
			expect(result.current.editingTokenIndex).toBe(1);
			expect(result.current.editingValue).toBe("");
		});

		it("saves edit on Enter via updateEditingValue then Enter", () => {
			let capturedEdit: { index: number; value: string } | undefined;
			const onTokenEdit = (tokenIndex: number, newValue: string) => {
				capturedEdit = { index: tokenIndex, value: newValue };
			};

			const { result } = renderVimMode({ onTokenEdit });

			act(() => {
				simulateKey("right");
			});

			act(() => {
				simulateKey("c");
			});

			// Simulate <input> onChange by calling updateEditingValue
			act(() => {
				result.current.updateEditingValue("hello");
			});

			act(() => {
				simulateKey("return");
			});

			expect(result.current.mode).toBe("normal");
			expect(capturedEdit).toBeDefined();
			expect(capturedEdit?.index).toBe(1);
			expect(capturedEdit?.value).toBe("hello");
		});

		it("discards edit on Escape", () => {
			let capturedEdit: { index: number; value: string } | undefined;
			const onTokenEdit = (tokenIndex: number, newValue: string) => {
				capturedEdit = { index: tokenIndex, value: newValue };
			};

			const { result } = renderVimMode({ onTokenEdit });

			act(() => {
				simulateKey("right");
			});

			act(() => {
				simulateKey("c");
			});

			act(() => {
				result.current.updateEditingValue("hello");
			});

			act(() => {
				simulateKey("escape");
			});

			expect(result.current.mode).toBe("normal");
			expect(capturedEdit).toBeUndefined();
		});
	});

	describe("insert mode - insert (i key)", () => {
		it("enters insert mode with existing token value", () => {
			const { result } = renderVimMode();

			act(() => {
				simulateKey("i", "i");
			});

			expect(result.current.mode).toBe("insert");
			expect(result.current.editingTokenIndex).toBe(0);
			expect(result.current.editingValue).toBe("echo");
		});

		it("enters insert mode on second token", () => {
			const { result } = renderVimMode();

			act(() => {
				simulateKey("right");
			});

			act(() => {
				simulateKey("i");
			});

			expect(result.current.mode).toBe("insert");
			expect(result.current.editingTokenIndex).toBe(1);
			expect(result.current.editingValue).toBe("test");
		});

		it("saves edit via updateEditingValue then Enter", () => {
			let capturedEdit: { index: number; value: string } | undefined;
			const onTokenEdit = (tokenIndex: number, newValue: string) => {
				capturedEdit = { index: tokenIndex, value: newValue };
			};
			const { result } = renderVimMode({ onTokenEdit });

			act(() => {
				simulateKey("right");
			});

			act(() => {
				simulateKey("i");
			});

			act(() => {
				result.current.updateEditingValue("retest");
			});

			act(() => {
				simulateKey("return");
			});

			expect(capturedEdit).toBeDefined();
			expect(capturedEdit?.index).toBe(1);
			expect(capturedEdit?.value).toBe("retest");
		});
	});

	describe("insert mode - append (a key)", () => {
		it("enters insert mode with existing token value", () => {
			const { result } = renderVimMode();

			act(() => {
				simulateKey("right");
			});

			act(() => {
				simulateKey("a");
			});

			expect(result.current.mode).toBe("insert");
			expect(result.current.editingTokenIndex).toBe(1);
			expect(result.current.editingValue).toBe("test");
		});

		it("saves appended text correctly", () => {
			let capturedEdit: { index: number; value: string } | undefined;
			const onTokenEdit = (tokenIndex: number, newValue: string) => {
				capturedEdit = { index: tokenIndex, value: newValue };
			};
			const { result } = renderVimMode({ onTokenEdit });

			act(() => {
				simulateKey("right");
			});

			act(() => {
				simulateKey("a");
			});

			// Simulate <input> updating the value (append appends at cursor end)
			act(() => {
				result.current.updateEditingValue("testing");
			});

			act(() => {
				simulateKey("return");
			});

			expect(capturedEdit).toBeDefined();
			expect(capturedEdit?.index).toBe(1);
			expect(capturedEdit?.value).toBe("testing");
		});
	});

	describe("state reset", () => {
		it("resets editor state when tokens change", () => {
			const { result, rerender } = renderHook(
				({ tokens }) =>
					useVimMode({
						parsedTokens: tokens,
						loadDescriptions: () => {},
						useKeyboard: mockUseKeyboard,
					}),
				{
					initialProps: { tokens: mockTokens },
				},
			);

			act(() => {
				simulateKey("i");
			});

			act(() => {
				result.current.updateEditingValue("changed");
			});

			const nextTokens: ParsedToken[] = [
				{ value: "ls", type: "command" },
				{ value: "-la", type: "option" },
			];
			rerender({ tokens: nextTokens });

			expect(result.current.mode).toBe("normal");
			expect(result.current.editingTokenIndex).toBeNull();
			expect(result.current.editingValue).toBe("");
			expect(result.current.selectedIndex).toBe(0);
			expect(result.current.viewMode).toBe("annotated");
		});
	});

	describe("complex editing with pipes", () => {
		it("handles multi-token edits via updateEditingValue", () => {
			let capturedEdit: { index: number; value: string } | undefined;
			const onTokenEdit = (tokenIndex: number, newValue: string) => {
				capturedEdit = { index: tokenIndex, value: newValue };
			};

			const { result } = renderVimMode({ onTokenEdit });

			act(() => {
				simulateKey("right");
			});

			act(() => {
				simulateKey("i");
			});

			// Simulate <input> editing the value to include pipes
			act(() => {
				result.current.updateEditingValue("test | cat | grep test");
			});

			act(() => {
				simulateKey("return");
			});

			expect(capturedEdit).toBeDefined();
			expect(capturedEdit?.index).toBe(1);
			expect(capturedEdit?.value).toBe("test | cat | grep test");
		});
	});

	describe("appendLine keybinding (A key in annotated mode)", () => {
		it("selects last token and enters insert at end when in annotated mode", () => {
			const { result } = renderVimMode();

			expect(result.current.viewMode).toBe("annotated");

			act(() => {
				simulateKey("A", "A");
			});

			expect(result.current.mode).toBe("insert");
			expect(result.current.selectedIndex).toBe(1);
			expect(result.current.editingTokenIndex).toBe(1);
			expect(result.current.editingValue).toBe("test");
		});

		it("does not work in list mode", () => {
			const { result } = renderVimMode();

			expect(result.current.viewMode).toBe("annotated");

			act(() => {
				pressLeader();
			});
			act(() => {
				simulateKey("m", "m");
			});

			expect(result.current.viewMode).toBe("list");

			act(() => {
				simulateKey("A", "A");
			});

			expect(result.current.mode).toBe("normal");
			expect(result.current.editingTokenIndex).toBeNull();
		});
	});

	describe("lastToken keybinding (G in annotated mode)", () => {
		it("moves selection to last token", () => {
			const { result } = renderVimMode();

			expect(result.current.viewMode).toBe("annotated");

			act(() => {
				simulateKey("g", "G", { shift: true });
			});

			expect(result.current.selectedIndex).toBe(1);
		});
	});

	describe("explain command", () => {
		it("does not call loadDescriptions without leader", () => {
			let wasCalled = false;
			const loadDescriptions = () => {
				wasCalled = true;
			};

			renderVimMode({
				loadDescriptions,
			});

			act(() => {
				simulateKey("e", "e");
			});

			expect(wasCalled).toBe(false);
		});

		it("calls loadDescriptions when leader+e is pressed", () => {
			let wasCalled = false;
			const loadDescriptions = () => {
				wasCalled = true;
			};

			renderVimMode({
				loadDescriptions,
			});

			act(() => {
				pressLeader();
			});
			act(() => {
				simulateKey("e", "e");
			});

			expect(wasCalled).toBe(true);
		});
	});

	describe("leader mode", () => {
		it("cancels on escape", () => {
			const { result } = renderVimMode();

			act(() => {
				pressLeader();
			});
			act(() => {
				simulateKey("escape");
			});

			expect(result.current.leaderActive).toBe(false);
		});

		it("cancels on unrelated key", () => {
			const { result } = renderVimMode();

			act(() => {
				pressLeader();
			});
			act(() => {
				simulateKey("x", "x");
			});

			expect(result.current.leaderActive).toBe(false);
		});

		it("does not trigger in insert mode", () => {
			const { result } = renderVimMode();

			act(() => {
				simulateKey("i", "i");
			});
			act(() => {
				pressLeader();
			});

			// Space in insert mode does NOT activate leader (it goes to <input>)
			expect(result.current.mode).toBe("insert");
		});
	});

	describe("leader submit/quit", () => {
		it("does not emit output without leader", () => {
			let selected: boolean | undefined;
			renderVimMode({
				onExit: (submitted) => {
					selected = submitted;
				},
			});

			act(() => {
				simulateKey("enter", "\r");
			});

			expect(selected).toBeUndefined();
		});

		it("emits submit when leader+enter is pressed", () => {
			let selected: boolean | undefined;
			renderVimMode({
				onExit: (submitted) => {
					selected = submitted;
				},
			});

			act(() => {
				pressLeader();
			});
			act(() => {
				simulateKey("enter", "\r");
			});

			expect(selected).toBe(true);
		});

		it("emits quit when leader+q is pressed", () => {
			let selected: boolean | undefined;
			renderVimMode({
				onExit: (submitted) => {
					selected = submitted;
				},
			});

			act(() => {
				pressLeader();
			});
			act(() => {
				simulateKey("q", "q");
			});

			expect(selected).toBe(false);
		});

		it("does not emit output for unbound leader+y", () => {
			let selected: boolean | undefined;
			renderVimMode({
				onExit: (submitted) => {
					selected = submitted;
				},
			});

			act(() => {
				pressLeader();
			});
			act(() => {
				simulateKey("y", "y");
			});

			// "y" is no longer bound (outputClipboard removed)
			expect(selected).toBeUndefined();
		});

		it("does not emit output for unbound leader+r", () => {
			let selected: boolean | undefined;
			renderVimMode({
				onExit: (submitted) => {
					selected = submitted;
				},
			});

			act(() => {
				pressLeader();
			});
			act(() => {
				simulateKey("r", "r");
			});

			expect(selected).toBeUndefined();
		});

		it("does not emit output for unbound leader+p", () => {
			let selected: boolean | undefined;
			renderVimMode({
				onExit: (submitted) => {
					selected = submitted;
				},
			});

			act(() => {
				pressLeader();
			});
			act(() => {
				simulateKey("p", "p");
			});

			expect(selected).toBeUndefined();
		});
	});

	describe("modifier keys", () => {
		it("ignores ctrl-modified key presses in normal mode", () => {
			const { result } = renderVimMode();

			act(() => {
				simulateKey("c", "\u0003", { ctrl: true });
			});

			expect(result.current.mode).toBe("normal");
			expect(result.current.editingTokenIndex).toBeNull();
			expect(result.current.editingValue).toBe("");
		});
	});

	describe("suggest mode", () => {
		it("enters suggest mode via leader+s", () => {
			const { result } = renderVimMode();

			act(() => {
				pressLeader();
			});
			act(() => {
				simulateKey("s", "s");
			});

			expect(result.current.mode).toBe("suggest");
			expect(result.current.suggestValue).toBe("");
		});

		it("updates suggest value via updateSuggestValue", () => {
			const { result } = renderVimMode();

			act(() => {
				pressLeader();
			});
			act(() => {
				simulateKey("s", "s");
			});
			act(() => {
				result.current.updateSuggestValue("sort by size");
			});

			expect(result.current.mode).toBe("suggest");
			expect(result.current.suggestValue).toBe("sort by size");
		});

		it("cancels suggest mode on Escape", () => {
			const { result } = renderVimMode();

			act(() => {
				pressLeader();
			});
			act(() => {
				simulateKey("s", "s");
			});
			act(() => {
				result.current.updateSuggestValue("test");
			});
			act(() => {
				simulateKey("escape", "\u001b");
			});

			expect(result.current.mode).toBe("normal");
			expect(result.current.suggestValue).toBe("");
		});

		it("calls onSuggestSubmit on Enter with non-empty prompt", () => {
			let capturedPrompt: string | undefined;
			const { result } = renderVimMode({
				onSuggestSubmit: (prompt) => {
					capturedPrompt = prompt;
				},
			});

			act(() => {
				pressLeader();
			});
			act(() => {
				simulateKey("s", "s");
			});
			act(() => {
				result.current.updateSuggestValue("sort desc");
			});
			act(() => {
				simulateKey("return", "\r");
			});

			expect(result.current.mode).toBe("normal");
			expect(capturedPrompt).toBe("sort desc");
		});

		it("does not call onSuggestSubmit on Enter with empty prompt", () => {
			let wasCalled = false;
			const { result } = renderVimMode({
				onSuggestSubmit: () => {
					wasCalled = true;
				},
			});

			act(() => {
				pressLeader();
			});
			act(() => {
				simulateKey("s", "s");
			});
			act(() => {
				simulateKey("return", "\r");
			});

			expect(result.current.mode).toBe("normal");
			expect(wasCalled).toBe(false);
		});

		it("resets suggest state when tokens change", () => {
			const initialTokens = mockTokens;
			const { result, rerender } = renderHook(
				({ tokens }: { tokens: ParsedToken[] }) =>
					useVimMode({
						parsedTokens: tokens,
						loadDescriptions: () => {},
						useKeyboard: mockUseKeyboard,
					}),
				{ initialProps: { tokens: initialTokens } },
			);

			// Enter suggest mode and update value
			act(() => {
				pressLeader();
			});
			act(() => {
				simulateKey("s", "s");
			});
			act(() => {
				result.current.updateSuggestValue("test");
			});
			expect(result.current.mode).toBe("suggest");

			// Change tokens
			const updatedTokens: ParsedToken[] = [
				{ value: "printf", type: "command" },
			];
			rerender({ tokens: updatedTokens });

			expect(result.current.mode).toBe("normal");
			expect(result.current.suggestValue).toBe("");
		});

		it("does not activate suggest from insert mode", () => {
			const { result } = renderVimMode();

			// Enter insert mode
			act(() => {
				simulateKey("i");
			});
			expect(result.current.mode).toBe("insert");

			// Try leader+s — leader should not activate in insert mode
			act(() => {
				pressLeader();
			});
			act(() => {
				simulateKey("s", "s");
			});

			// Should still be in insert mode (leader not processed)
			expect(result.current.mode).toBe("insert");
		});
	});

	describe("generate mode", () => {
		it("enters generate mode via leader+g", () => {
			const { result } = renderVimMode();

			act(() => {
				pressLeader();
			});
			act(() => {
				simulateKey("g", "g");
			});

			expect(result.current.mode).toBe("generate");
			expect(result.current.generateValue).toBe("");
		});

		it("updates generate value via updateGenerateValue", () => {
			const { result } = renderVimMode();

			act(() => {
				pressLeader();
			});
			act(() => {
				simulateKey("g", "g");
			});
			act(() => {
				result.current.updateGenerateValue("list files recursively");
			});

			expect(result.current.mode).toBe("generate");
			expect(result.current.generateValue).toBe("list files recursively");
		});

		it("cancels generate mode on Escape", () => {
			const { result } = renderVimMode();

			act(() => {
				pressLeader();
			});
			act(() => {
				simulateKey("g", "g");
			});
			act(() => {
				result.current.updateGenerateValue("test");
			});
			act(() => {
				simulateKey("escape", "\u001b");
			});

			expect(result.current.mode).toBe("normal");
			expect(result.current.generateValue).toBe("");
		});

		it("calls onGenerateSubmit on Enter with non-empty prompt", () => {
			let capturedPrompt: string | undefined;
			const { result } = renderVimMode({
				onGenerateSubmit: (prompt) => {
					capturedPrompt = prompt;
				},
			});

			act(() => {
				pressLeader();
			});
			act(() => {
				simulateKey("g", "g");
			});
			act(() => {
				result.current.updateGenerateValue("find large files");
			});
			act(() => {
				simulateKey("return", "\r");
			});

			expect(result.current.mode).toBe("normal");
			expect(capturedPrompt).toBe("find large files");
		});

		it("does not call onGenerateSubmit on Enter with empty prompt", () => {
			let wasCalled = false;
			const { result } = renderVimMode({
				onGenerateSubmit: () => {
					wasCalled = true;
				},
			});

			act(() => {
				pressLeader();
			});
			act(() => {
				simulateKey("g", "g");
			});
			act(() => {
				simulateKey("return", "\r");
			});

			expect(result.current.mode).toBe("normal");
			expect(wasCalled).toBe(false);
		});

		it("resets generate state when tokens change", () => {
			const initialTokens = mockTokens;
			const { result, rerender } = renderHook(
				({ tokens }: { tokens: ParsedToken[] }) =>
					useVimMode({
						parsedTokens: tokens,
						loadDescriptions: () => {},
						useKeyboard: mockUseKeyboard,
					}),
				{ initialProps: { tokens: initialTokens } },
			);

			// Enter generate mode and update value
			act(() => {
				pressLeader();
			});
			act(() => {
				simulateKey("g", "g");
			});
			act(() => {
				result.current.updateGenerateValue("test");
			});
			expect(result.current.mode).toBe("generate");

			// Change tokens
			const updatedTokens: ParsedToken[] = [
				{ value: "printf", type: "command" },
			];
			rerender({ tokens: updatedTokens });

			expect(result.current.mode).toBe("normal");
			expect(result.current.generateValue).toBe("");
		});
	});

	it("retains current view mode when tokens change", () => {
		const initialTokens = mockTokens;
		const { result, rerender } = renderHook(
			({ tokens }: { tokens: ParsedToken[] }) =>
				useVimMode({
					parsedTokens: tokens,
					loadDescriptions: () => {},
					useKeyboard: mockUseKeyboard,
				}),
			{ initialProps: { tokens: initialTokens } },
		);

		act(() => {
			result.current.setViewMode("annotated");
		});
		expect(result.current.viewMode).toBe("annotated");

		const updatedTokens: ParsedToken[] = [
			{ value: "printf", type: "command" },
			...mockTokens.slice(1),
		];

		rerender({ tokens: updatedTokens });

		expect(result.current.viewMode).toBe("annotated");
	});
});
