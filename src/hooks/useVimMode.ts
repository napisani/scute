import { useKeyboard } from "@opentui/react";
import { useCallback, useMemo, useState } from "react";
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
	tokenValues: string[];
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

export function useVimMode(
	parsedTokens: ParsedToken[],
	loadDescriptions: () => void,
	onTokenEdit?: (tokenIndex: number, newValue: string) => void,
): VimModeState & VimModeActions {
	const [mode, setMode] = useState<VimMode>("normal");
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [viewMode, setViewMode] = useState<ViewMode>("list");
	const [editingTokenIndex, setEditingTokenIndex] = useState<number | null>(
		null,
	);
	const [editingValue, setEditingValue] = useState("");
	const [cursorPosition, setCursorPosition] = useState(0);
	const [tokenValues, setTokenValues] = useState<string[]>(
		parsedTokens.map((t) => t.value),
	);

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
				: (tokenValues[tokenIndex] ?? parsedTokens[tokenIndex]?.value ?? "");
			setEditingTokenIndex(tokenIndex);
			setEditingValue(initialValue);
			setCursorPosition(Math.min(cursorPos, initialValue.length));
			setMode("insert");
		},
		[tokenValues, parsedTokens],
	);

	const exitInsertMode = useCallback(
		(save: boolean) => {
			if (editingTokenIndex !== null) {
				if (save && editingValue.length > 0) {
					// Save the edited value to internal state
					setTokenValues((values) => {
						const newValues = [...values];
						newValues[editingTokenIndex] = editingValue;
						return newValues;
					});
					// Notify parent component about the edit
					onTokenEdit?.(editingTokenIndex, editingValue);
				}
				// Reset editing state
				setEditingTokenIndex(null);
				setEditingValue("");
				setCursorPosition(0);
			}
			setMode("normal");
		},
		[editingTokenIndex, editingValue, onTokenEdit],
	);

	const updateEditingValue = useCallback((value: string) => {
		setEditingValue(value);
	}, []);

	const moveCursor = useCallback((position: number) => {
		setCursorPosition(position);
	}, []);

	// Keyboard handler for normal mode
	useKeyboard((key) => {
		if (mode !== "normal") return;

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
		if (insertKeys.includes(key.name)) {
			enterInsertMode(selectedIndex, 0, false);
			return;
		}
		if (appendKeys.includes(key.name)) {
			enterInsertMode(selectedIndex, 1, false);
			return;
		}
		if (changeKeys.includes(key.name)) {
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
		if (mode !== "insert") return;

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
			setCursorPosition((pos) => Math.max(0, pos - 1));
			return;
		}
		if (key.name === "right") {
			setCursorPosition((pos) => Math.min(editingValue.length, pos + 1));
			return;
		}

		// Handle text input
		if (key.sequence && key.sequence.length === 1) {
			const char = key.sequence;
			// Only accept printable characters
			if (char >= " " && char <= "~") {
				const newValue =
					editingValue.slice(0, cursorPosition) +
					char +
					editingValue.slice(cursorPosition);
				setEditingValue(newValue);
				setCursorPosition((pos) => pos + 1);
			}
			return;
		}

		// Backspace
		if (key.name === "backspace") {
			if (cursorPosition > 0) {
				const newValue =
					editingValue.slice(0, cursorPosition - 1) +
					editingValue.slice(cursorPosition);
				setEditingValue(newValue);
				setCursorPosition((pos) => pos - 1);
			}
			return;
		}

		// Delete
		if (key.name === "delete") {
			if (cursorPosition < editingValue.length) {
				const newValue =
					editingValue.slice(0, cursorPosition) +
					editingValue.slice(cursorPosition + 1);
				setEditingValue(newValue);
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
		editingValue,
		cursorPosition,
		tokenValues,
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
