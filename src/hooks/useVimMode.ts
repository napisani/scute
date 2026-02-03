import { useKeyboard as useOpenTuiKeyboard } from "@opentui/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getKeybindings } from "../config";
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
export type KeyboardHandler = (key: {
	name: string;
	sequence?: string;
}) => void;

// Hook interface that accepts optional keyboard hook for testing
export function useVimMode(
	parsedTokens: ParsedToken[],
	loadDescriptions: () => void,
	onTokenEdit?: (tokenIndex: number, newValue: string) => void,
	useKeyboard: (handler: KeyboardHandler) => void = useOpenTuiKeyboard,
): VimModeState & VimModeActions {
	const [mode, setMode] = useState<VimMode>("normal");
	const modeRef = useRef(mode);
	modeRef.current = mode;
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [viewMode, setViewMode] = useState<ViewMode>("list");
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
		setMode("normal");
		setSelectedIndex(0);
		setViewMode("list");
		setEditingTokenIndex(null);
		setEditorState({ value: "", cursor: 0 });
		setGPressed(false);
		skipNextInsertCharRef.current = false;
		insertTriggerRef.current = null;
	}, [parsedTokensKey]);

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
			setEditingTokenIndex(tokenIndex);
			setEditorState({
				value: initialValue,
				cursor: Math.min(cursorPos, initialValue.length),
			});
			setMode("insert");
		},
		[parsedTokens],
	);

	const exitInsertMode = useCallback(
		(save: boolean) => {
			if (editingTokenIndex !== null) {
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
		[editingTokenIndex, editorState.value, onTokenEdit],
	);

	const updateEditingValue = useCallback((value: string) => {
		setEditorState((prev) => ({ ...prev, value }));
	}, []);

	const moveCursor = useCallback((position: number) => {
		setEditorState((prev) => ({ ...prev, cursor: position }));
	}, []);

	// Keyboard handler for normal mode
	useKeyboard((key) => {
		if (modeRef.current !== "normal") return;

		// View toggle (m key)
		if (toggleViewKeys.includes(key.name)) {
			setViewMode((m) => (m === "list" ? "annotated" : "list"));
			return;
		}

		// Explain
		if (explainKeys.includes(key.name)) {
			loadDescriptions();
			return;
		}

		// Edit commands
		if (
			viewMode === "annotated" &&
			(appendLineKeys.includes(key.name) ||
				(key.sequence && appendLineKeys.includes(key.sequence)))
		) {
			const lastIndex = parsedTokens.length - 1;
			if (lastIndex < 0) {
				return;
			}
			setSelectedIndex(lastIndex);
			const tokenValue = parsedTokens[lastIndex]?.value ?? "";
			enterInsertMode(lastIndex, tokenValue.length, false);
			return;
		}
		if (insertKeys.includes(key.name)) {
			skipNextInsertCharRef.current = true;
			insertTriggerRef.current = key.sequence ?? key.name;
			enterInsertMode(selectedIndex, 0, false);
			return;
		}
		if (appendKeys.includes(key.name)) {
			skipNextInsertCharRef.current = true;
			insertTriggerRef.current = key.sequence ?? key.name;
			enterInsertMode(selectedIndex, 1, false);
			return;
		}
		if (changeKeys.includes(key.name)) {
			skipNextInsertCharRef.current = true;
			insertTriggerRef.current = key.sequence ?? key.name;
			enterInsertMode(selectedIndex, 0, true);
			return;
		}

		// View-specific navigation
		if (viewMode === "annotated") {
			// Horizontal mode: h/l move left/right, j/k unbound
			// w/b move by word, $/0 move to line end/start

			if (leftKeys.includes(key.name)) {
				setSelectedIndex((index) => Math.max(0, index - 1));
				return;
			}
			if (rightKeys.includes(key.name)) {
				setSelectedIndex((index) =>
					Math.min(parsedTokens.length - 1, index + 1),
				);
				return;
			}

			if (wordBackwardKeys.includes(key.name)) {
				setSelectedIndex((index) => Math.max(0, index - 1));
				return;
			}
			if (wordForwardKeys.includes(key.name)) {
				setSelectedIndex((index) =>
					Math.min(parsedTokens.length - 1, index + 1),
				);
				return;
			}

			if (lineStartKeys.includes(key.name)) {
				setSelectedIndex(0);
				return;
			}
			if (lineEndKeys.includes(key.name)) {
				setSelectedIndex(parsedTokens.length - 1);
				return;
			}
		} else {
			// Vertical (list) mode: j/k move up/down, h/l unbound
			// w/b unbound, gg/G move to first/last token

			if (upKeys.includes(key.name) || key.name === "k") {
				setSelectedIndex((index) => Math.max(0, index - 1));
				return;
			}
			if (downKeys.includes(key.name) || key.name === "j") {
				setSelectedIndex((index) =>
					Math.min(parsedTokens.length - 1, index + 1),
				);
				return;
			}

			// Handle "gg" command
			if (key.name === "g") {
				if (gPressed) {
					// Second 'g' - go to first token
					setSelectedIndex(0);
					setGPressed(false);
				} else {
					// First 'g' - set flag and reset after timeout
					setGPressed(true);
					setTimeout(() => setGPressed(false), 500);
				}
				return;
			}

			if (lastTokenKeys.includes(key.name)) {
				setSelectedIndex(parsedTokens.length - 1);
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
				return;
			}
		}

		// Exit without saving (Esc)
		if (exitInsertKeys.includes(key.name)) {
			exitInsertMode(false);
			return;
		}

		// Save and exit (Enter)
		if (saveKeys.includes(key.name)) {
			exitInsertMode(true);
			return;
		}

		// Cursor movement with arrow keys
		if (key.name === "left") {
			setEditorState((prev) => ({
				...prev,
				cursor: Math.max(0, prev.cursor - 1),
			}));
			return;
		}
		if (key.name === "right") {
			setEditorState((prev) => ({
				...prev,
				cursor: Math.min(prev.value.length, prev.cursor + 1),
			}));
			return;
		}
		if (key.name === "home") {
			setEditorState((prev) => ({ ...prev, cursor: 0 }));
			return;
		}
		if (key.name === "end") {
			setEditorState((prev) => ({ ...prev, cursor: prev.value.length }));
			return;
		}

		// Handle text input
		if (key.sequence && key.sequence.length === 1) {
			const char = key.sequence;
			// Only accept printable characters
			if (char >= " " && char <= "~") {
				setEditorState((prev) => {
					const newValue =
						prev.value.slice(0, prev.cursor) +
						char +
						prev.value.slice(prev.cursor);
					return {
						value: newValue,
						cursor: prev.cursor + 1,
					};
				});
			}
			return;
		}

		// Backspace
		if (key.name === "backspace") {
			setEditorState((prev) => {
				if (prev.cursor > 0) {
					const newValue =
						prev.value.slice(0, prev.cursor - 1) +
						prev.value.slice(prev.cursor);
					return {
						value: newValue,
						cursor: prev.cursor - 1,
					};
				}
				return prev;
			});
			return;
		}

		// Delete
		if (key.name === "delete") {
			setEditorState((prev) => {
				if (prev.cursor < prev.value.length) {
					const newValue =
						prev.value.slice(0, prev.cursor) +
						prev.value.slice(prev.cursor + 1);
					return {
						...prev,
						value: newValue,
					};
				}
				return prev;
			});
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
