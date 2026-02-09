import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { useMemo } from "react";
import { getNormalKeybindings } from "../config";
import { logTrace } from "../core/logger";
import {
	hasModifierKey,
	type KeyboardHandler,
	type KeyboardKey,
	normalizeKeyId,
} from "../utils/keyboard";
import type { VimMode } from "./useVimMode";

interface EditorState {
	value: string;
	cursor: number;
}

export interface UseInsertModeOptions {
	modeRef: MutableRefObject<VimMode>;
	editorState: EditorState;
	setEditorState: Dispatch<SetStateAction<EditorState>>;
	editingTokenIndex: number | null;
	exitInsertMode: (save: boolean) => void;
	skipNextInsertCharRef: MutableRefObject<boolean>;
	insertTriggerRef: MutableRefObject<string | null>;
	useKeyboard: (handler: KeyboardHandler) => void;
}

export function useInsertMode({
	modeRef,
	setEditorState,
	editingTokenIndex,
	exitInsertMode,
	skipNextInsertCharRef,
	insertTriggerRef,
	useKeyboard,
}: UseInsertModeOptions): void {
	const exitInsertKeys = useMemo(() => getNormalKeybindings("exitInsert"), []);
	const saveKeys = useMemo(() => getNormalKeybindings("save"), []);

	useKeyboard((key: KeyboardKey) => {
		if (modeRef.current !== "insert") return;
		const keyId = normalizeKeyId(key);
		if (skipNextInsertCharRef.current) {
			skipNextInsertCharRef.current = false;
			const trigger = insertTriggerRef.current;
			insertTriggerRef.current = null;
			if (trigger && (key.sequence === trigger || key.name === trigger)) {
				return;
			}
		}
		if (hasModifierKey(key)) return;

		// Exit without saving (Esc)
		if (exitInsertKeys.includes(keyId)) {
			logTrace("vim:insert:exit", {
				save: false,
				tokenIndex: editingTokenIndex,
			});
			exitInsertMode(false);
			return;
		}

		// Save and exit (Enter)
		if (saveKeys.includes(keyId)) {
			logTrace("vim:insert:exit", {
				save: true,
				tokenIndex: editingTokenIndex,
			});
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

		const singleChar =
			key.sequence && key.sequence.length === 1 ? key.sequence : null;
		const isBackspaceChar = singleChar === "\u0008" || singleChar === "\u007f";

		// Backspace
		if (key.name === "backspace" || isBackspaceChar) {
			setEditorState((prev) => {
				if (prev.cursor <= 0) return prev;
				return {
					value:
						prev.value.slice(0, prev.cursor - 1) +
						prev.value.slice(prev.cursor),
					cursor: prev.cursor - 1,
				};
			});
			return;
		}

		// Delete
		if (key.name === "delete") {
			setEditorState((prev) => {
				if (prev.cursor >= prev.value.length) return prev;
				return {
					...prev,
					value:
						prev.value.slice(0, prev.cursor) +
						prev.value.slice(prev.cursor + 1),
				};
			});
			return;
		}

		// Handle text input — only accept printable characters
		if (singleChar && singleChar >= " " && singleChar <= "~") {
			const char = singleChar;
			setEditorState((prev) => ({
				value:
					prev.value.slice(0, prev.cursor) +
					char +
					prev.value.slice(prev.cursor),
				cursor: prev.cursor + 1,
			}));
		}
	});
}
