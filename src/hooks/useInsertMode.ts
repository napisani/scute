import { useKeyboard } from "@opentui/react";
import { useCallback, useMemo, useState } from "react";
import { getKeybindings } from "../config";

export interface InsertModeState {
	editingValue: string;
	cursorPosition: number;
	originalValue: string;
}

export interface InsertModeActions {
	updateValue: (value: string) => void;
	moveCursor: (position: number) => void;
	exitInsertMode: (save: boolean) => void;
}

export function useInsertMode(
	initialValue: string,
	initialCursorPos: number,
	actions: InsertModeActions,
) {
	const [editingValue, setEditingValue] = useState(initialValue);
	const [cursorPosition, setCursorPosition] = useState(initialCursorPos);
	// biome-ignore lint/correctness/useExhaustiveDependencies: initialValue is only used for initialization
	const originalValue = useMemo(() => initialValue, []);

	const exitInsertKeys = useMemo(
		() => getKeybindings("exitInsert") ?? ["escape"],
		[],
	);
	const saveKeys = useMemo(() => getKeybindings("save") ?? ["return"], []);

	useKeyboard((key) => {
		// Exit without saving (Esc)
		if (exitInsertKeys.includes(key.name)) {
			actions.exitInsertMode(false);
			return;
		}

		// Save and exit (Enter)
		if (saveKeys.includes(key.name)) {
			actions.exitInsertMode(true);
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
				actions.updateValue(newValue);
			}
		}

		// Backspace
		if (key.name === "backspace") {
			if (cursorPosition > 0) {
				const newValue =
					editingValue.slice(0, cursorPosition - 1) +
					editingValue.slice(cursorPosition);
				setEditingValue(newValue);
				setCursorPosition((pos) => pos - 1);
				actions.updateValue(newValue);
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
				actions.updateValue(newValue);
			}
			return;
		}
	});

	return {
		editingValue,
		cursorPosition,
		originalValue,
	};
}
