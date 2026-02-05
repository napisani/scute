import { useKeyboard as useOpenTuiKeyboard } from "@opentui/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getConfigSnapshot, getKeybindings } from "../config";
import { logTrace } from "../core/logger";
import type { ParsedToken } from "../core/shells/common";
import type { ViewMode } from "./useViewMode";

export type VimMode = "normal" | "insert";

export interface VimModeState {
	mode: VimMode;
	selectedIndex: number;
	viewMode: ViewMode;
	editingTokenIndex: number | null;
	editingValue: string;
	cursorPosition: number;
}

export interface VimModeActions {
	enterInsertMode: (
		tokenIndex: number,
		cursorPos: number,
		clearToken?: boolean,
	) => void;
	exitInsertMode: (save: boolean) => void;
	updateEditingValue: (value: string) => void;
	moveCursor: (position: number) => void;
	setSelectedIndex: (index: number) => void;
	setViewMode: (mode: ViewMode) => void;
	loadDescriptions: () => void;
}

interface EditorState {
	value: string;
	cursor: number;
}

// Type for keyboard handler
export interface KeyboardKey {
	name: string;
	sequence?: string;
	ctrl?: boolean;
	meta?: boolean;
	shift?: boolean;
	option?: boolean;
	alt?: boolean;
}

export type KeyboardHandler = (key: KeyboardKey) => void;

export interface UseVimModeOptions {
	parsedTokens: ParsedToken[];
	loadDescriptions: () => void;
	onTokenEdit?: (tokenIndex: number, newValue: string) => void;
	onSubmit?: (payload: { tokenIndex: number; value: string }) => void;
	useKeyboard?: (handler: KeyboardHandler) => void;
}

function hasModifierKey(key: KeyboardKey): boolean {
	return Boolean(key.ctrl || key.meta || key.option || key.alt);
}

// Hook interface that accepts optional keyboard hook for testing
export function useVimMode({
	parsedTokens,
	loadDescriptions,
	onTokenEdit,
	onSubmit,
	useKeyboard = useOpenTuiKeyboard,
}: UseVimModeOptions): VimModeState & VimModeActions {
	const [mode, setMode] = useState<VimMode>("normal");
	const modeRef = useRef(mode);
	modeRef.current = mode;
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [viewMode, setViewMode] = useState<ViewMode>(() =>
		getConfigSnapshot().viewMode === "horizontal" ? "annotated" : "list",
	);
	const [editingTokenIndex, setEditingTokenIndex] = useState<number | null>(
		null,
	);
	const [editorState, setEditorState] = useState<EditorState>({
		value: "",
		cursor: 0,
	});
	const skipNextInsertCharRef = useRef(false);
	const insertTriggerRef = useRef<string | null>(null);
	const parsedTokensKey = useMemo(
		() => JSON.stringify(parsedTokens.map((token) => token.value)),
		[parsedTokens],
	);

	useEffect(() => {
		void parsedTokensKey;
		logTrace("vim:resetTokens", {
			tokenCount: parsedTokens.length,
		});
		setMode("normal");
		setSelectedIndex(0);
		setEditingTokenIndex(null);
		setEditorState({ value: "", cursor: 0 });
		setGPressed(false);
		skipNextInsertCharRef.current = false;
		insertTriggerRef.current = null;
	}, [parsedTokensKey, parsedTokens.length]);

	// Keybindings
	const upKeys = useMemo(() => getKeybindings("up"), []);
	const downKeys = useMemo(() => getKeybindings("down"), []);
	const leftKeys = useMemo(() => getKeybindings("left"), []);
	const rightKeys = useMemo(() => getKeybindings("right"), []);
	const wordForwardKeys = useMemo(() => getKeybindings("wordForward"), []);
	const wordBackwardKeys = useMemo(() => getKeybindings("wordBackward"), []);
	const lineStartKeys = useMemo(() => getKeybindings("lineStart"), []);
	const lineEndKeys = useMemo(() => getKeybindings("lineEnd"), []);
	const firstTokenKeys = useMemo(() => getKeybindings("firstToken"), []);
	const lastTokenKeys = useMemo(() => getKeybindings("lastToken"), []);
	const appendLineKeys = useMemo(() => getKeybindings("appendLine"), []);
	const toggleViewKeys = useMemo(() => getKeybindings("toggleView"), []);
	const explainKeys = useMemo(() => getKeybindings("explain"), []);
	const insertKeys = useMemo(() => getKeybindings("insert"), []);
	const appendKeys = useMemo(() => getKeybindings("append"), []);
	const changeKeys = useMemo(() => getKeybindings("change"), []);
	const exitInsertKeys = useMemo(() => getKeybindings("exitInsert"), []);
	const saveKeys = useMemo(() => getKeybindings("save"), []);

	// Track 'g' key for "gg" command
	const [gPressed, setGPressed] = useState(false);

	const enterInsertMode = useCallback(
		(tokenIndex: number, cursorPos: number, clearToken = false) => {
			const initialValue = clearToken
				? ""
				: (parsedTokens[tokenIndex]?.value ?? "");
			const nextCursor = Math.min(cursorPos, initialValue.length);
			logTrace("vim:enterInsert", {
				tokenIndex,
				cursorPos,
				clearToken,
				initialValueLength: initialValue.length,
			});
			setEditingTokenIndex(tokenIndex);
			setEditorState({
				value: initialValue,
				cursor: nextCursor,
			});
			setMode("insert");
		},
		[parsedTokens],
	);

	const exitInsertMode = useCallback(
		(save: boolean) => {
			logTrace("vim:exitInsert", {
				save,
				editingTokenIndex,
				valueLength: editorState.value.length,
			});
			if (editingTokenIndex !== null) {
				if (save) {
					onSubmit?.({
						tokenIndex: editingTokenIndex,
						value: editorState.value,
					});
				}
				if (save && editorState.value.length > 0) {
					// Notify parent component about the edit
					onTokenEdit?.(editingTokenIndex, editorState.value);
				}
				// Reset editing state
				setEditingTokenIndex(null);
				setEditorState({ value: "", cursor: 0 });
			}
			setMode("normal");
		},
		[editingTokenIndex, editorState.value, onSubmit, onTokenEdit],
	);

	const updateEditingValue = useCallback(
		(value: string) => {
			const preview = value.length > 32 ? `${value.slice(0, 32)}…` : value;
			logTrace("vim:updateEditingValue", {
				tokenIndex: editingTokenIndex,
				valueLength: value.length,
				preview,
			});
			setEditorState((prev) => ({ ...prev, value }));
		},
		[editingTokenIndex],
	);

	const moveCursor = useCallback(
		(position: number) => {
			logTrace("vim:moveCursor", {
				tokenIndex: editingTokenIndex,
				position,
			});
			setEditorState((prev) => ({ ...prev, cursor: position }));
		},
		[editingTokenIndex],
	);

	// Keyboard handler for normal mode
	useKeyboard((key) => {
		if (modeRef.current !== "normal") return;

		if (hasModifierKey(key)) {
			logTrace("vim:normal:ignoredModifier", {
				key: key.name,
			});
			return;
		}

		const keyId =
			key.sequence ??
			(key.shift && key.name.length === 1 ? key.name.toUpperCase() : key.name);
		const currentViewMode = viewMode;
		const currentSelectedIndex = selectedIndex;

		if (toggleViewKeys.includes(keyId)) {
			const nextMode = currentViewMode === "list" ? "annotated" : "list";
			logTrace("vim:toggleView", {
				key: key.name,
				from: currentViewMode,
				to: nextMode,
			});
			setViewMode(nextMode);
			return;
		}

		if (explainKeys.includes(keyId)) {
			logTrace("vim:loadDescriptions", {
				key: key.name,
				selectedIndex: currentSelectedIndex,
			});
			loadDescriptions();
			return;
		}

		if (currentViewMode === "annotated" && appendLineKeys.includes(keyId)) {
			const lastIndex = parsedTokens.length - 1;
			if (lastIndex < 0) {
				logTrace("vim:appendLineSkipped", { reason: "noTokens" });
				return;
			}
			logTrace("vim:appendLine", {
				key: key.name,
				targetIndex: lastIndex,
				tokenValueLength: parsedTokens[lastIndex]?.value.length ?? 0,
			});
			setSelectedIndex(lastIndex);
			const tokenValue = parsedTokens[lastIndex]?.value ?? "";
			enterInsertMode(lastIndex, tokenValue.length, false);
			return;
		}

		if (insertKeys.includes(keyId)) {
			logTrace("vim:commandInsert", {
				key: key.name,
				targetIndex: currentSelectedIndex,
			});
			skipNextInsertCharRef.current = true;
			insertTriggerRef.current = key.sequence ?? key.name;
			enterInsertMode(currentSelectedIndex, 0, false);
			return;
		}

		if (appendKeys.includes(keyId)) {
			logTrace("vim:commandAppend", {
				key: key.name,
				targetIndex: currentSelectedIndex,
			});
			skipNextInsertCharRef.current = true;
			insertTriggerRef.current = key.sequence ?? key.name;
			enterInsertMode(currentSelectedIndex, 1, false);
			return;
		}

		if (changeKeys.includes(keyId)) {
			logTrace("vim:commandChange", {
				key: key.name,
				targetIndex: currentSelectedIndex,
			});
			skipNextInsertCharRef.current = true;
			insertTriggerRef.current = key.sequence ?? key.name;
			enterInsertMode(currentSelectedIndex, 0, true);
			return;
		}

		if (currentViewMode === "annotated") {
			const moveSelection = (direction: string, nextIndex: number) => {
				if (parsedTokens.length === 0) {
					logTrace("vim:moveSelectionSkipped", {
						direction,
						reason: "noTokens",
					});
					return;
				}
				const boundedIndex = Math.max(
					0,
					Math.min(parsedTokens.length - 1, nextIndex),
				);
				if (boundedIndex === currentSelectedIndex) {
					return;
				}
				logTrace("vim:moveSelection", {
					direction,
					from: currentSelectedIndex,
					to: boundedIndex,
				});
				setSelectedIndex(boundedIndex);
			};

			if (leftKeys.includes(keyId)) {
				moveSelection("left", currentSelectedIndex - 1);
				return;
			}

			if (rightKeys.includes(keyId)) {
				moveSelection("right", currentSelectedIndex + 1);
				return;
			}

			if (wordBackwardKeys.includes(keyId)) {
				moveSelection("wordBackward", currentSelectedIndex - 1);
				return;
			}

			if (wordForwardKeys.includes(keyId)) {
				moveSelection("wordForward", currentSelectedIndex + 1);
				return;
			}

			if (lineStartKeys.includes(keyId)) {
				moveSelection("lineStart", 0);
				return;
			}

			if (lineEndKeys.includes(keyId)) {
				if (parsedTokens.length === 0) {
					logTrace("vim:moveSelectionSkipped", {
						direction: "lineEnd",
						reason: "noTokens",
					});
					return;
				}
				moveSelection("lineEnd", parsedTokens.length - 1);
				return;
			}

			if (lastTokenKeys.includes(keyId)) {
				const lastIndex = parsedTokens.length - 1;
				if (lastIndex < 0) {
					logTrace("vim:gotoLastSkipped", { reason: "noTokens" });
					return;
				}
				moveSelection("lastToken", lastIndex);
				return;
			}
		} else {
			const moveSelection = (direction: string, nextIndex: number) => {
				if (parsedTokens.length === 0) {
					logTrace("vim:moveSelectionSkipped", {
						direction,
						reason: "noTokens",
					});
					return;
				}
				const boundedIndex = Math.max(
					0,
					Math.min(parsedTokens.length - 1, nextIndex),
				);
				if (boundedIndex === currentSelectedIndex) {
					return;
				}
				logTrace("vim:moveSelection", {
					direction,
					from: currentSelectedIndex,
					to: boundedIndex,
				});
				setSelectedIndex(boundedIndex);
			};

			if (upKeys.includes(keyId) || keyId === "k") {
				moveSelection("up", currentSelectedIndex - 1);
				return;
			}

			if (downKeys.includes(keyId) || keyId === "j") {
				moveSelection("down", currentSelectedIndex + 1);
				return;
			}

			if (keyId === "g") {
				if (gPressed) {
					logTrace("vim:gotoFirst", { via: "gg" });
					setSelectedIndex(0);
					setGPressed(false);
				} else {
					logTrace("vim:awaitSecondG", {});
					setGPressed(true);
					setTimeout(() => setGPressed(false), 500);
				}
				return;
			}

			if (lastTokenKeys.includes(keyId)) {
				const lastIndex = parsedTokens.length - 1;
				if (lastIndex < 0) {
					logTrace("vim:gotoLastSkipped", { reason: "noTokens" });
					return;
				}
				moveSelection("lastToken", lastIndex);
				return;
			}
		}
	});

	// Keyboard handler for insert mode
	useKeyboard((key) => {
		if (modeRef.current !== "insert") return;
		if (skipNextInsertCharRef.current) {
			skipNextInsertCharRef.current = false;
			const trigger = insertTriggerRef.current;
			insertTriggerRef.current = null;
			if (trigger && (key.sequence === trigger || key.name === trigger)) {
				logTrace("vim:insert:skipTrigger", {
					key: key.name,
					trigger,
				});
				return;
			}
			logTrace("vim:insert:clearTrigger", {
				key: key.name,
				trigger,
			});
		}
		if (hasModifierKey(key)) {
			logTrace("vim:insert:ignoredModifier", {
				key: key.name,
			});
			return;
		}

		// Exit without saving (Esc)
		if (exitInsertKeys.includes(key.name)) {
			logTrace("vim:insert:exitWithoutSave", {
				key: key.name,
				tokenIndex: editingTokenIndex,
			});
			exitInsertMode(false);
			return;
		}

		// Save and exit (Enter)
		if (saveKeys.includes(key.name)) {
			logTrace("vim:insert:exitWithSave", {
				key: key.name,
				tokenIndex: editingTokenIndex,
			});
			exitInsertMode(true);
			return;
		}

		// Cursor movement with arrow keys
		if (key.name === "left") {
			setEditorState((prev) => {
				const nextCursor = Math.max(0, prev.cursor - 1);
				if (nextCursor !== prev.cursor) {
					logTrace("vim:insert:cursorMove", {
						direction: "left",
						from: prev.cursor,
						to: nextCursor,
						tokenIndex: editingTokenIndex,
					});
				}
				return {
					...prev,
					cursor: nextCursor,
				};
			});
			return;
		}
		if (key.name === "right") {
			setEditorState((prev) => {
				const nextCursor = Math.min(prev.value.length, prev.cursor + 1);
				if (nextCursor !== prev.cursor) {
					logTrace("vim:insert:cursorMove", {
						direction: "right",
						from: prev.cursor,
						to: nextCursor,
						tokenIndex: editingTokenIndex,
					});
				}
				return {
					...prev,
					cursor: nextCursor,
				};
			});
			return;
		}
		if (key.name === "home") {
			setEditorState((prev) => {
				if (prev.cursor !== 0) {
					logTrace("vim:insert:cursorMove", {
						direction: "home",
						from: prev.cursor,
						to: 0,
						tokenIndex: editingTokenIndex,
					});
				}
				return { ...prev, cursor: 0 };
			});
			return;
		}
		if (key.name === "end") {
			setEditorState((prev) => {
				const endPosition = prev.value.length;
				if (prev.cursor !== endPosition) {
					logTrace("vim:insert:cursorMove", {
						direction: "end",
						from: prev.cursor,
						to: endPosition,
						tokenIndex: editingTokenIndex,
					});
				}
				return { ...prev, cursor: endPosition };
			});
			return;
		}

		const singleChar =
			key.sequence && key.sequence.length === 1 ? key.sequence : null;
		const isBackspaceChar = singleChar === "\u0008" || singleChar === "\u007f";

		// Backspace
		if (key.name === "backspace" || isBackspaceChar) {
			let handled = false;
			setEditorState((prev) => {
				if (prev.cursor > 0) {
					handled = true;
					const newValue =
						prev.value.slice(0, prev.cursor - 1) +
						prev.value.slice(prev.cursor);
					logTrace("vim:insert:backspace", {
						from: prev.cursor,
						to: prev.cursor - 1,
						newLength: newValue.length,
						tokenIndex: editingTokenIndex,
					});
					return {
						value: newValue,
						cursor: prev.cursor - 1,
					};
				}
				return prev;
			});
			if (!handled) {
				logTrace("vim:insert:backspaceSkipped", {
					reason: "cursorAtStart",
				});
			}
			return;
		}

		// Delete
		if (key.name === "delete") {
			let handled = false;
			setEditorState((prev) => {
				if (prev.cursor < prev.value.length) {
					handled = true;
					const newValue =
						prev.value.slice(0, prev.cursor) +
						prev.value.slice(prev.cursor + 1);
					logTrace("vim:insert:delete", {
						at: prev.cursor,
						newLength: newValue.length,
						tokenIndex: editingTokenIndex,
					});
					return {
						...prev,
						value: newValue,
					};
				}
				return prev;
			});
			if (!handled) {
				logTrace("vim:insert:deleteSkipped", {
					reason: "cursorAtEnd",
				});
			}
			return;
		}

		// Handle text input
		if (singleChar) {
			const char = singleChar;
			// Only accept printable characters
			if (char >= " " && char <= "~") {
				setEditorState((prev) => {
					const newValue =
						prev.value.slice(0, prev.cursor) +
						char +
						prev.value.slice(prev.cursor);
					const nextCursor = prev.cursor + 1;
					logTrace("vim:insert:char", {
						char,
						from: prev.cursor,
						to: nextCursor,
						newLength: newValue.length,
						tokenIndex: editingTokenIndex,
					});
					return {
						value: newValue,
						cursor: nextCursor,
					};
				});
			} else {
				logTrace("vim:insert:skippedChar", {
					char,
					reason: "nonPrintable",
				});
			}
			return;
		}
	});

	return {
		// State
		mode,
		selectedIndex,
		viewMode,
		editingTokenIndex,
		editingValue: editorState.value,
		cursorPosition: editorState.cursor,
		// Actions
		enterInsertMode,
		exitInsertMode,
		updateEditingValue,
		moveCursor,
		setSelectedIndex,
		setViewMode,
		loadDescriptions,
	};
}
