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
// The hook registers 2 handlers: normal mode and insert mode
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
	const key: KeyboardKey = { name, sequence, ...overrides };
	// Call only the most recent handlers
	latestHandlers.forEach((handler) => {
		handler(key);
	});
};

const simulateType = (text: string) => {
	for (const char of text) {
		simulateKey(char, char);
	}
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
		useKeyboard?: (handler: KeyboardHandler) => void;
	}

	function renderVimMode({
		tokens = mockTokens,
		loadDescriptions = () => {},
		onTokenEdit,
		useKeyboard = mockUseKeyboard,
	}: RenderVimModeOptions = {}) {
		return renderHook(() =>
			useVimMode({
				parsedTokens: tokens,
				loadDescriptions,
				onTokenEdit,
				useKeyboard,
			}),
		);
	}

	describe("basic navigation", () => {
		it("starts with first token selected", () => {
			const mockLoadDescriptions = () => {};
			const { result } = renderVimMode({
				loadDescriptions: mockLoadDescriptions,
			});

			expect(result.current.selectedIndex).toBe(0);
			expect(result.current.mode).toBe("normal");
		});

		it("moves selection with j and k keys", () => {
			const mockLoadDescriptions = () => {};
			const { result } = renderVimMode({
				loadDescriptions: mockLoadDescriptions,
			});

			act(() => {
				simulateKey("m");
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
			const mockLoadDescriptions = () => {};
			const { result } = renderVimMode({
				loadDescriptions: mockLoadDescriptions,
			});

			act(() => {
				simulateKey("m");
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
		it("toggles view mode with m key", () => {
			const mockLoadDescriptions = () => {};
			const { result } = renderVimMode({
				loadDescriptions: mockLoadDescriptions,
			});

			expect(result.current.viewMode).toBe("annotated");

			act(() => {
				simulateKey("m");
			});
			expect(result.current.viewMode).toBe("list");
		});
	});

	describe("insert mode - change (c key)", () => {
		it("enters insert mode with cleared value", () => {
			const mockLoadDescriptions = () => {};
			const { result } = renderVimMode({
				loadDescriptions: mockLoadDescriptions,
			});

			act(() => {
				simulateKey("right");
			});

			act(() => {
				simulateKey("c");
			});

			expect(result.current.mode).toBe("insert");
			expect(result.current.editingTokenIndex).toBe(1);
			expect(result.current.editingValue).toBe("");
			expect(result.current.cursorPosition).toBe(0);
		});

		it("types text correctly in insert mode", () => {
			const mockLoadDescriptions = () => {};
			const { result } = renderVimMode({
				loadDescriptions: mockLoadDescriptions,
			});

			act(() => {
				simulateKey("right");
			});

			act(() => {
				simulateKey("c");
			});

			act(() => {
				simulateType("hello");
			});

			expect(result.current.editingValue).toBe("hello");
			expect(result.current.cursorPosition).toBe(5);
		});

		it("handles backspace in insert mode", () => {
			const mockLoadDescriptions = () => {};
			const { result } = renderVimMode({
				loadDescriptions: mockLoadDescriptions,
			});

			act(() => {
				simulateKey("right");
			});

			act(() => {
				simulateKey("c");
			});

			act(() => {
				simulateType("hello");
				simulateKey("backspace");
			});

			expect(result.current.editingValue).toBe("hell");
			expect(result.current.cursorPosition).toBe(4);
		});

		it("saves edit on Enter", () => {
			const mockLoadDescriptions = () => {};
			let capturedEdit: { index: number; value: string } | undefined;
			const onTokenEdit = (tokenIndex: number, newValue: string) => {
				capturedEdit = { index: tokenIndex, value: newValue };
			};

			const { result } = renderVimMode({
				loadDescriptions: mockLoadDescriptions,
				onTokenEdit,
			});

			act(() => {
				simulateKey("right");
			});

			act(() => {
				simulateKey("c");
			});

			act(() => {
				simulateType("hello");
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
			const mockLoadDescriptions = () => {};
			let capturedEdit: { index: number; value: string } | undefined;
			const onTokenEdit = (tokenIndex: number, newValue: string) => {
				capturedEdit = { index: tokenIndex, value: newValue };
			};

			const { result } = renderVimMode({
				loadDescriptions: mockLoadDescriptions,
				onTokenEdit,
			});

			act(() => {
				simulateKey("right");
			});

			act(() => {
				simulateKey("c");
			});

			act(() => {
				simulateType("hello");
			});

			act(() => {
				simulateKey("escape");
			});

			expect(result.current.mode).toBe("normal");
			expect(capturedEdit).toBeUndefined();
		});
	});

	describe("insert mode - insert (i key)", () => {
		it("does not insert the triggering i into the buffer", () => {
			const mockLoadDescriptions = () => {};
			const { result } = renderVimMode({
				loadDescriptions: mockLoadDescriptions,
			});

			act(() => {
				simulateKey("i", "i");
			});

			act(() => {
				simulateType("| grep -i test |");
			});

			expect(result.current.mode).toBe("insert");
			expect(result.current.editingValue).toBe("| grep -i test |echo");
			expect(result.current.editingValue.startsWith("i")).toBe(false);
		});
	});

	describe("insert mode - append (a key)", () => {
		it("enters insert mode at position 1", () => {
			const mockLoadDescriptions = () => {};
			const { result } = renderVimMode({
				loadDescriptions: mockLoadDescriptions,
			});

			act(() => {
				simulateKey("right");
			});

			act(() => {
				simulateKey("a");
			});

			expect(result.current.mode).toBe("insert");
			expect(result.current.editingTokenIndex).toBe(1);
			expect(result.current.editingValue).toBe("test");
			expect(result.current.cursorPosition).toBe(1);
		});

		it("appends text correctly", () => {
			const mockLoadDescriptions = () => {};
			let capturedEdit: { index: number; value: string } | undefined;
			const onTokenEdit = (tokenIndex: number, newValue: string) => {
				capturedEdit = { index: tokenIndex, value: newValue };
			};
			const { result } = renderVimMode({
				loadDescriptions: mockLoadDescriptions,
				onTokenEdit,
			});

			act(() => {
				simulateKey("right");
			});

			act(() => {
				simulateKey("a");
			});

			act(() => {
				simulateType("ing");
			});

			act(() => {
				simulateKey("return");
			});

			// 'a' puts cursor at position 1, so typing "ing" inserts there
			// "test" with "ing" inserted at position 1 = "tingest"
			expect(capturedEdit).toBeDefined();
			expect(capturedEdit?.index).toBe(1);
			expect(capturedEdit?.value).toBe("tingest");
		});
	});

	describe("insert mode - insert (i key)", () => {
		it("enters insert mode at position 0", () => {
			const mockLoadDescriptions = () => {};
			const { result } = renderVimMode({
				loadDescriptions: mockLoadDescriptions,
			});

			act(() => {
				simulateKey("right");
			});

			act(() => {
				simulateKey("i");
			});

			expect(result.current.mode).toBe("insert");
			expect(result.current.editingTokenIndex).toBe(1);
			expect(result.current.editingValue).toBe("test");
			expect(result.current.cursorPosition).toBe(0);
		});

		it("inserts text at beginning", () => {
			const mockLoadDescriptions = () => {};
			let capturedEdit: { index: number; value: string } | undefined;
			const onTokenEdit = (tokenIndex: number, newValue: string) => {
				capturedEdit = { index: tokenIndex, value: newValue };
			};
			const { result } = renderVimMode({
				loadDescriptions: mockLoadDescriptions,
				onTokenEdit,
			});

			act(() => {
				simulateKey("right");
			});

			act(() => {
				simulateKey("i");
			});

			act(() => {
				simulateType("re");
			});

			act(() => {
				simulateKey("return");
			});

			expect(capturedEdit).toBeDefined();
			expect(capturedEdit?.index).toBe(1);
			expect(capturedEdit?.value).toBe("retest");
		});
	});

	describe("state reset", () => {
		it("resets editor state when tokens change", () => {
			const mockLoadDescriptions = () => {};
			const { result, rerender } = renderHook(
				({ tokens }) =>
					useVimMode({
						parsedTokens: tokens,
						loadDescriptions: mockLoadDescriptions,
						useKeyboard: mockUseKeyboard,
					}),
				{
					initialProps: { tokens: mockTokens },
				},
			);

			act(() => {
				simulateKey("i");
				simulateType("changed");
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
		it("handles adding pipes to token", () => {
			const mockLoadDescriptions = () => {};
			let capturedEdit: { index: number; value: string } | undefined;
			const onTokenEdit = (tokenIndex: number, newValue: string) => {
				capturedEdit = { index: tokenIndex, value: newValue };
			};

			const { result } = renderVimMode({
				loadDescriptions: mockLoadDescriptions,
				onTokenEdit,
			});

			act(() => {
				simulateKey("right");
			});

			// Use 'i' to enter insert mode at position 0, then move to end
			act(() => {
				simulateKey("i");
			});

			act(() => {
				simulateKey("end");
			});

			act(() => {
				simulateType(" | cat | grep test");
			});

			act(() => {
				simulateKey("return");
			});

			expect(capturedEdit).toBeDefined();
			expect(capturedEdit?.index).toBe(1);
			expect(capturedEdit?.value).toBe("test | cat | grep test");
		});
	});

	describe("cursor movement", () => {
		it("moves cursor with arrow keys", () => {
			const mockLoadDescriptions = () => {};
			const { result } = renderVimMode({
				loadDescriptions: mockLoadDescriptions,
			});

			act(() => {
				simulateKey("right");
			});

			act(() => {
				simulateKey("a");
			});

			act(() => {
				simulateKey("right");
				simulateKey("right");
			});

			expect(result.current.cursorPosition).toBe(3);

			act(() => {
				simulateKey("left");
			});

			expect(result.current.cursorPosition).toBe(2);
		});

		it("moves to start with home key", () => {
			const mockLoadDescriptions = () => {};
			const { result } = renderVimMode({
				loadDescriptions: mockLoadDescriptions,
			});

			act(() => {
				simulateKey("right");
			});

			act(() => {
				simulateKey("a");
			});

			act(() => {
				simulateKey("end");
			});

			expect(result.current.cursorPosition).toBe(4);

			act(() => {
				simulateKey("home");
			});

			expect(result.current.cursorPosition).toBe(0);
		});
	});

	describe("appendLine keybinding (A key in annotated mode)", () => {
		it("selects last token and enters insert at end when in annotated mode", () => {
			const mockLoadDescriptions = () => {};
			const { result } = renderVimMode({
				loadDescriptions: mockLoadDescriptions,
			});

			expect(result.current.viewMode).toBe("annotated");

			act(() => {
				simulateKey("A", "A");
			});

			expect(result.current.mode).toBe("insert");
			expect(result.current.selectedIndex).toBe(1);
			expect(result.current.editingTokenIndex).toBe(1);
			expect(result.current.editingValue).toBe("test");
			expect(result.current.cursorPosition).toBe(4);
		});

		it("does not work in list mode", () => {
			const mockLoadDescriptions = () => {};
			const { result } = renderVimMode({
				loadDescriptions: mockLoadDescriptions,
			});

			expect(result.current.viewMode).toBe("annotated");

			act(() => {
				simulateKey("m");
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
			const mockLoadDescriptions = () => {};
			const { result } = renderVimMode({
				loadDescriptions: mockLoadDescriptions,
			});

			expect(result.current.viewMode).toBe("annotated");

			act(() => {
				simulateKey("g", "G", { shift: true });
			});

			expect(result.current.selectedIndex).toBe(1);
		});
	});

	describe("explain command", () => {
		it("calls loadDescriptions when e key is pressed", () => {
			let wasCalled = false;
			const loadDescriptions = () => {
				wasCalled = true;
			};

			renderVimMode({
				loadDescriptions,
			});

			act(() => {
				simulateKey("e");
			});

			expect(wasCalled).toBe(true);
		});
	});

	describe("modifier keys", () => {
		it("ignores ctrl-modified key presses in normal mode", () => {
			const loadDescriptions = () => {};
			const { result } = renderVimMode({
				loadDescriptions,
			});

			act(() => {
				simulateKey("c", "\u0003", { ctrl: true });
			});

			expect(result.current.mode).toBe("normal");
			expect(result.current.editingTokenIndex).toBeNull();
			expect(result.current.editingValue).toBe("");
		});

		it("does not mutate insert buffer for ctrl-modified keys", () => {
			const loadDescriptions = () => {};
			const { result } = renderVimMode({
				loadDescriptions,
			});

			act(() => {
				simulateKey("i", "i");
			});

			act(() => {
				simulateType("abc");
			});

			expect(result.current.mode).toBe("insert");
			const beforeModifier = result.current.editingValue;

			act(() => {
				simulateKey("c", "\u0003", { ctrl: true });
			});

			expect(result.current.mode).toBe("insert");
			expect(result.current.editingValue).toBe(beforeModifier);
		});
	});

	it("retains current view mode when tokens change", () => {
		const mockLoadDescriptions = () => {};
		const initialTokens = mockTokens;
		const { result, rerender } = renderHook(
			({ tokens }: { tokens: ParsedToken[] }) =>
				useVimMode({
					parsedTokens: tokens,
					loadDescriptions: mockLoadDescriptions,
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
