import { useKeyboard as useOpenTuiKeyboard } from "@opentui/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getInitialViewMode } from "../config";
import { logTrace } from "../core/logger";
import type { ParsedToken } from "../core/shells/common";
import type { KeyboardHandler, KeyboardKey } from "../utils/keyboard";
import { useInsertMode } from "./useInsertMode";
import { useNormalMode } from "./useNormalMode";

export type ViewMode = "list" | "annotated";

export type VimMode = "normal" | "insert";

export type { KeyboardHandler, KeyboardKey };

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

export interface UseVimModeOptions {
	parsedTokens: ParsedToken[];
	loadDescriptions: () => void;
	onTokenEdit?: (tokenIndex: number, newValue: string) => void;
	onSubmit?: () => void;
	useKeyboard?: (handler: KeyboardHandler) => void;
}

// Hook interface that accepts optional keyboard hook for testing
export function useVimMode({
	parsedTokens,
	loadDescriptions,
	onTokenEdit,
	onSubmit,
	useKeyboard = useOpenTuiKeyboard,
}: UseVimModeOptions): VimModeState & VimModeActions {
	// Shared state
	const [mode, setMode] = useState<VimMode>("normal");
	const modeRef = useRef(mode);
	modeRef.current = mode;
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [viewMode, setViewMode] = useState<ViewMode>(getInitialViewMode);
	const [editingTokenIndex, setEditingTokenIndex] = useState<number | null>(
		null,
	);
	const [editorState, setEditorState] = useState<EditorState>({
		value: "",
		cursor: 0,
	});
	const skipNextInsertCharRef = useRef(false);
	const insertTriggerRef = useRef<string | null>(null);

	// Reset state when tokens change
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
		skipNextInsertCharRef.current = false;
		insertTriggerRef.current = null;
	}, [parsedTokensKey, parsedTokens.length]);

	// Shared actions
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
				if (save && editorState.value.length > 0) {
					onTokenEdit?.(editingTokenIndex, editorState.value);
				}
				setEditingTokenIndex(null);
				setEditorState({ value: "", cursor: 0 });
			}
			setMode("normal");
		},
		[editingTokenIndex, editorState.value, onTokenEdit],
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

	// Compose sub-hooks (each calls useKeyboard once)
	useNormalMode({
		modeRef,
		parsedTokens,
		selectedIndex,
		setSelectedIndex,
		viewMode,
		setViewMode,
		enterInsertMode,
		loadDescriptions,
		onSubmit,
		skipNextInsertCharRef,
		insertTriggerRef,
		useKeyboard,
	});

	useInsertMode({
		modeRef,
		editorState,
		setEditorState,
		editingTokenIndex,
		exitInsertMode,
		skipNextInsertCharRef,
		insertTriggerRef,
		useKeyboard,
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
